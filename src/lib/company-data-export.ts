import PDFDocument from "pdfkit";
import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";
import {
  buildAdminTrainingStatusEmployees,
  parseTrainingStatusListQuery,
  type AdminTrainingStatusEmployee,
} from "./admin-training-status-list";
import {
  companyStatusLabel,
  licenseStatusLabel,
} from "./company-status-labels";
import {
  exportReasonLabel,
  type CompanyDataExportReasonKey,
} from "./company-data-export-reasons";
import { getSql } from "./db";
import { mapCertificate, mapUser } from "./db/row-mappers";
import { getCourseForContext } from "./course";
import { getCourseMeta } from "./course-db";
import { getCertificateResponsibilityPlaceholders } from "./certificate-responsibility-placeholders";
import { generateCertificatePdf } from "./pdf";
import { getDocumentTemplateRevisionById } from "./document-template";
import { rowsToXlsxBuffer } from "./spreadsheet-export";
import {
  getStorageBucketName,
  getSupabaseStorageClient,
  isSupabaseStorageConfigured,
} from "./supabase-storage";
import { getCompanyById } from "./tenant";
import { getUserLocationAssignments } from "./user-locations";
import type { Certificate, Company } from "./types";
import {
  buildRawDataJsonFiles,
  loadCompanyRawExportData,
  validateCompanyRawExportData,
} from "./company-data-export-raw";

export type ExportSnapshot = {
  employees: number;
  locations: number;
  trainings: number;
  certificates: number;
  privacy_acceptances: number;
  generated_at: string;
};

export type CompanyDataExportLogRow = {
  id: number;
  companyId: number;
  companyName: string;
  companyCode: string;
  exportedByUserId: number;
  exportReason: string;
  exportReasonLabel: string;
  customReason: string | null;
  exportSnapshot: ExportSnapshot;
  fileUrl: string | null;
  protocolFileUrl: string | null;
  createdAt: string;
  exportedByName: string | null;
};

function parseExportSnapshot(raw: unknown): ExportSnapshot {
  const fallback: ExportSnapshot = {
    employees: 0,
    locations: 0,
    trainings: 0,
    certificates: 0,
    privacy_acceptances: 0,
    generated_at: new Date().toISOString(),
  };
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  return {
    employees: Number(o.employees ?? 0),
    locations: Number(o.locations ?? 0),
    trainings: Number(o.trainings ?? 0),
    certificates: Number(o.certificates ?? 0),
    privacy_acceptances: Number(o.privacy_acceptances ?? 0),
    generated_at: o.generated_at != null ? String(o.generated_at) : fallback.generated_at,
  };
}

function mapExportLogRow(r: Record<string, unknown>): CompanyDataExportLogRow {
  return {
    id: Number(r.id),
    companyId: Number(r.company_id),
    companyName: String(r.company_name ?? ""),
    companyCode: String(r.company_code ?? ""),
    exportedByUserId: Number(r.exported_by_user_id),
    exportReason: String(r.export_reason),
    exportReasonLabel: exportReasonLabel(String(r.export_reason)),
    customReason: r.custom_reason != null ? String(r.custom_reason) : null,
    exportSnapshot: parseExportSnapshot(r.export_snapshot_json),
    fileUrl: r.file_url != null ? String(r.file_url) : null,
    protocolFileUrl: r.protocol_file_url != null ? String(r.protocol_file_url) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    exportedByName:
      r.first_name != null
        ? `${String(r.first_name)} ${String(r.last_name ?? "")}`.trim()
        : null,
  };
}

function buildExportProtocolPdf(params: {
  exportId: number;
  company: Company;
  exportedByName: string;
  exportReason: CompanyDataExportReasonKey;
  customReason: string | null;
  createdAt: string;
  snapshot: ExportSnapshot;
}): Promise<Buffer> {
  const reasonLabel = exportReasonLabel(params.exportReason);

  return createPdfBuffer((doc) => {
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#000080").text("Exportprotokoll");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(
      "Firmen-Datenexport · Certiano Campus"
    );
    doc.moveDown(1);

    writeSection(doc, "Export", [
      `Export-ID: ${params.exportId}`,
      `Datum und Uhrzeit: ${formatDateTime(params.createdAt)}`,
      `Ausführender Benutzer: ${params.exportedByName}`,
      `Exportgrund: ${reasonLabel}`,
      ...(params.exportReason === "SONSTIGES" && params.customReason
        ? [`Freitextbegründung: ${params.customReason}`]
        : []),
    ]);

    writeSection(doc, "Firma", [
      `Firmenname: ${params.company.name}`,
      `Firmenkennung: ${params.company.companyCode || "—"}`,
    ]);

    writeSection(doc, "Enthaltene Datensätze", [
      `Mitarbeiter: ${params.snapshot.employees}`,
      `Standorte: ${params.snapshot.locations}`,
      `Schulungen: ${params.snapshot.trainings}`,
      `Zertifikate: ${params.snapshot.certificates}`,
      `Datenschutzbestätigungen: ${params.snapshot.privacy_acceptances}`,
      `Erstellt am: ${formatDateTime(params.snapshot.generated_at)}`,
    ]);

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#000080").text("Enthaltene Exportbestandteile");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10).fillColor("#334155");
    const components = [
      "☑ Firmenstammdaten",
      "☑ Mitarbeiter",
      "☑ Standorte",
      "☑ Schulungen",
      "☑ Zertifikate",
      "☑ Datenschutzdaten",
      "☑ Rohdaten (JSON)",
    ];
    for (const line of components) {
      doc.text(line, { lineGap: 2 });
    }

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(9).fillColor("#94a3b8").text(
      "Dieses Protokoll wurde automatisch erstellt und dient der revisionssicheren Dokumentation " +
        "des Firmen-Datenexports. Der Snapshot in der Datenbank bleibt auch bei gelöschten " +
        "Exportdateien erhalten.",
      { align: "left" }
    );
  });
}

type PrivacyAcceptanceRow = {
  firstName: string;
  lastName: string;
  email: string;
  version: string;
  title: string;
  acceptedAt: string;
};

type ExamAttemptRow = {
  firstName: string;
  lastName: string;
  email: string;
  courseTitle: string;
  completedAt: string;
  score: number | null;
  passed: boolean | null;
};

type LocationExportRow = {
  name: string;
  addressLabel: string;
  employeeNames: string;
  active: boolean;
};

type EmployeeMeta = {
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.replace("T", " ").slice(0, 16);
}

function roleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "employee":
      return "Mitarbeiter";
    default:
      return role;
  }
}

function statusLabel(active: boolean): string {
  return active ? "Aktiv" : "Inaktiv";
}

function createPdfBuffer(
  build: (doc: InstanceType<typeof PDFDocument>) => void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

function writeSection(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  lines: string[]
) {
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#000080").text(title);
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10).fillColor("#334155");
  for (const line of lines) {
    doc.text(line, { lineGap: 2 });
  }
}

function certFilename(cert: Certificate, employees: AdminTrainingStatusEmployee[]): string {
  const emp = employees.find((e) => e.id === cert.userId);
  const name = emp
    ? `${emp.lastName}_${emp.firstName}`.replace(/[^a-zA-Z0-9_-]+/g, "_")
    : `user_${cert.userId}`;
  return `${name}_${cert.certificateNumber.replace(/[^a-zA-Z0-9_-]+/g, "_")}.pdf`;
}

async function loadPrivacyAcceptances(companyId: number): Promise<PrivacyAcceptanceRow[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      u.first_name,
      u.last_name,
      u.email,
      ppv.version,
      ppv.title,
      pa.accepted_at
    FROM privacy_policy_acceptances pa
    JOIN users u ON u.id = pa.user_id
    JOIN privacy_policy_versions ppv ON ppv.id = pa.version_id
    WHERE u.company_id = ${companyId}
    ORDER BY pa.accepted_at DESC, u.last_name ASC, u.first_name ASC
  `) as Record<string, unknown>[];

  return rows.map((r) => ({
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    email: String(r.email),
    version: String(r.version),
    title: String(r.title),
    acceptedAt: new Date(String(r.accepted_at)).toISOString(),
  }));
}

async function loadExamAttempts(companyId: number): Promise<ExamAttemptRow[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      u.first_name,
      u.last_name,
      u.email,
      c.title AS course_title,
      ta.completed_at,
      ta.score,
      ta.passed
    FROM training_attempts ta
    JOIN users u ON u.id = ta.user_id
    JOIN courses c ON c.id = ta.course_id
    WHERE u.company_id = ${companyId}
      AND ta.completed_at IS NOT NULL
    ORDER BY ta.completed_at DESC
  `) as Record<string, unknown>[];

  return rows.map((r) => ({
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    email: String(r.email),
    courseTitle: String(r.course_title),
    completedAt: new Date(String(r.completed_at)).toISOString(),
    score: r.score != null ? Number(r.score) : null,
    passed: r.passed != null ? Boolean(r.passed) : null,
  }));
}

async function loadLocationRows(companyId: number): Promise<LocationExportRow[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      cl.name,
      cl.address_line1,
      cl.postal_code,
      cl.city,
      cl.active,
      (
        SELECT string_agg(
          u.first_name || ' ' || u.last_name,
          ', ' ORDER BY u.last_name, u.first_name
        )
        FROM user_locations ul
        JOIN users u ON u.id = ul.user_id
        WHERE ul.location_id = cl.id
      ) AS employee_names
    FROM company_locations cl
    WHERE cl.company_id = ${companyId}
    ORDER BY cl.sort_order ASC, cl.name ASC
  `) as Record<string, unknown>[];

  return rows.map((r) => {
    const parts = [
      r.address_line1 != null ? String(r.address_line1) : null,
      r.postal_code != null ? String(r.postal_code) : null,
      r.city != null ? String(r.city) : null,
    ].filter(Boolean);
    return {
      name: String(r.name),
      addressLabel: parts.join(", ") || "—",
      employeeNames: r.employee_names != null ? String(r.employee_names) : "—",
      active: Boolean(r.active),
    };
  });
}

async function loadEmployeeResponsibilities(
  companyId: number
): Promise<Map<number, string>> {
  const sql = getSql();
  const rows = (await sql`
    SELECT user_id, string_agg(course_title, ', ' ORDER BY course_title) AS names
    FROM (
      SELECT DISTINCT
        cru.user_id,
        c.title AS course_title
      FROM course_responsible_users cru
      JOIN course_responsibility_overrides cro
        ON cro.company_id = cru.company_id AND cro.course_id = cru.course_id
      JOIN courses c ON c.id = cru.course_id AND c.company_id = ${companyId}
      WHERE cru.company_id = ${companyId}

      UNION

      SELECT DISTINCT
        tru.user_id,
        c.title AS course_title
      FROM courses c
      JOIN course_topic_assignments cta ON cta.course_id = c.id
      JOIN topic_responsible_users tru
        ON tru.topic_id = cta.topic_id AND tru.company_id = ${companyId}
      LEFT JOIN course_responsibility_overrides cro
        ON cro.company_id = c.company_id AND cro.course_id = c.id
      WHERE c.company_id = ${companyId}
        AND c.active = TRUE
        AND cro.course_id IS NULL

      UNION

      SELECT DISTINCT
        tru.user_id,
        c.title AS course_title
      FROM courses c
      JOIN topic_responsible_users tru
        ON tru.topic_id = c.topic_id AND tru.company_id = ${companyId}
      LEFT JOIN course_responsibility_overrides cro
        ON cro.company_id = c.company_id AND cro.course_id = c.id
      WHERE c.company_id = ${companyId}
        AND c.active = TRUE
        AND c.topic_id IS NOT NULL
        AND cro.course_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM course_topic_assignments cta2 WHERE cta2.course_id = c.id
        )
    ) AS combined
    GROUP BY user_id
  `) as Record<string, unknown>[];

  if (rows.length > 0) {
    const map = new Map<number, string>();
    for (const row of rows) {
      map.set(Number(row.user_id), String(row.names ?? ""));
    }
    return map;
  }

  const legacyRows = (await sql`
    SELECT cr.user_id, string_agg(rt.name, ', ' ORDER BY rt.sort_order, rt.name) AS names
    FROM company_responsibilities cr
    JOIN responsibility_types rt ON rt.id = cr.responsibility_type_id
    WHERE cr.company_id = ${companyId}
    GROUP BY cr.user_id
  `) as Record<string, unknown>[];

  const map = new Map<number, string>();
  for (const row of legacyRows) {
    map.set(Number(row.user_id), String(row.names ?? ""));
  }
  return map;
}

async function loadEmployeeMeta(companyId: number): Promise<Map<number, EmployeeMeta>> {
  const sql = getSql();
  let rows: Record<string, unknown>[];
  try {
    rows = (await sql`
      SELECT id, role, created_at, last_login_at, active
      FROM users
      WHERE company_id = ${companyId}
        AND role IN ('admin', 'employee')
    `) as Record<string, unknown>[];
  } catch {
    rows = (await sql`
      SELECT id, role, created_at, active
      FROM users
      WHERE company_id = ${companyId}
        AND role IN ('admin', 'employee')
    `) as Record<string, unknown>[];
  }

  const map = new Map<number, EmployeeMeta>();
  for (const row of rows) {
    map.set(Number(row.id), {
      role: String(row.role),
      createdAt: new Date(String(row.created_at)).toISOString(),
      lastLoginAt: row.last_login_at
        ? new Date(String(row.last_login_at)).toISOString()
        : null,
    });
  }
  return map;
}

async function loadAllTrainingEmployees(
  companyId: number
): Promise<AdminTrainingStatusEmployee[]> {
  const query = parseTrainingStatusListQuery(new URLSearchParams());
  query.status = "all";
  query.employmentFilter = "all";
  query.pageSize = 10000;
  query.page = 1;
  return buildAdminTrainingStatusEmployees(companyId, query, null);
}

async function loadLocationLabelsForUsers(
  userIds: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  for (const userId of userIds) {
    const assignments = await getUserLocationAssignments(userId);
    map.set(
      userId,
      assignments.length > 0
        ? assignments.map((a) => a.label).join("; ")
        : "—"
    );
  }
  return map;
}

async function renderCertificatePdfBuffer(cert: Certificate): Promise<Buffer> {
  const sql = getSql();
  const userRows = await sql`SELECT * FROM users WHERE id = ${cert.userId} LIMIT 1`;
  const user = mapUser(userRows[0] as Record<string, unknown>);
  const course = await getCourseForContext(cert.companyId!, cert.courseId);
  const courseMeta = await getCourseMeta(cert.companyId!, cert.courseId);
  const company = await getCompanyById(cert.companyId!);

  let templateConfig;
  if (cert.templateRevisionId != null) {
    const revision = await getDocumentTemplateRevisionById(cert.templateRevisionId);
    templateConfig = revision?.config;
  }

  const { responsibilityPlaceholders, genericResponsibility } =
    await getCertificateResponsibilityPlaceholders(cert.companyId!, cert.courseId);

  return generateCertificatePdf(user, cert, course, {
    companyName: company?.name,
    branding: company?.branding,
    instructionCode: courseMeta?.instructionCode ?? null,
    instructionTitle: courseMeta?.instructionTitle ?? null,
    templateConfig,
    responsibilityPlaceholders,
    genericResponsibility,
  });
}

function buildCompanySummaryPdf(
  company: Company,
  employeeCount: number,
  locationCount: number,
  certificateCount: number,
  exportReason: CompanyDataExportReasonKey
): Promise<Buffer> {
  const branding = company.branding;
  const primary = branding.primaryColor || "#000080";

  return createPdfBuffer((doc) => {
    doc.font("Helvetica-Bold").fontSize(20).fillColor(primary).text("Firmen-Datenexport");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(
      `Erstellt am ${formatDateTime(new Date().toISOString())} · Grund: ${exportReasonLabel(exportReason)}`
    );
    doc.moveDown(1);

    writeSection(doc, "Firmenstammdaten", [
      `Firmenname: ${company.name}`,
      `Firmenkennung: ${company.companyCode || "—"}`,
      `Kurzname: ${company.slug}`,
      `Branche: ${company.industryName ?? "—"}`,
      `Betriebstyp: ${company.businessTypeName ?? "—"}`,
      `Ansprechpartner: ${company.contactPerson ?? "—"}`,
      `Status: ${companyStatusLabel(company.status)}`,
      `Lizenzstatus: ${licenseStatusLabel(company.licenseStatus)}`,
      `Lizenzablaufdatum: ${formatDate(company.licenseExpiresAt)}`,
      `Erstellungsdatum: ${formatDate(company.createdAt)}`,
    ]);

    writeSection(doc, "Übersicht", [
      `Standorte: ${locationCount}`,
      `Mitarbeiter und Administratoren: ${employeeCount}`,
      `Zertifikate: ${certificateCount}`,
    ]);

    writeSection(doc, "Branding", [
      `Primärfarbe: ${branding.primaryColor}`,
      `Sekundärfarbe: ${branding.secondaryColor}`,
      `Hintergrundfarbe: ${branding.backgroundColor}`,
      `Akzentfarbe: ${branding.accentColor}`,
      `Logo-URL: ${branding.logoUrl ?? "—"}`,
    ]);

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(9).fillColor("#94a3b8").text(
      "Dieses Paket enthält alle in Certiano Campus für diese Firma gespeicherten Daten " +
        "gemäß Firmen-Datenexport. Der Audit-Export für Behörden und Zertifizierungen " +
        "ist ein separates Verfahren im Admin-Dashboard der Firma.",
      { align: "left" }
    );
  });
}

function buildPrivacyPdf(rows: PrivacyAcceptanceRow[]): Promise<Buffer> {
  return createPdfBuffer((doc) => {
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#000080").text("Datenschutzbestätigungen");
    doc.moveDown(0.5);
    if (rows.length === 0) {
      doc.font("Helvetica").fontSize(11).fillColor("#334155").text("Keine Bestätigungen vorhanden.");
      return;
    }
    for (const row of rows) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text(
        `${row.lastName}, ${row.firstName} (${row.email})`
      );
      doc.font("Helvetica").fontSize(10).fillColor("#475569").text(
        `Version ${row.version}: ${row.title} · Zustimmung am ${formatDateTime(row.acceptedAt)}`
      );
      doc.moveDown(0.4);
    }
  });
}

function buildNachweisePdf(
  employees: AdminTrainingStatusEmployee[],
  examAttempts: ExamAttemptRow[]
): Promise<Buffer> {
  return createPdfBuffer((doc) => {
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#000080").text("Schulungsnachweise");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(
      "Übersicht abgeschlossener Schulungen und Prüfungsergebnisse."
    );
    doc.moveDown(0.8);

    let anyCourse = false;
    for (const emp of employees) {
      const completed = emp.courses.filter((c) => c.completedAt);
      if (completed.length === 0) continue;
      anyCourse = true;

      doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text(
        `${emp.lastName}, ${emp.firstName} (${emp.email})`
      );
      for (const course of completed) {
        doc.font("Helvetica").fontSize(10).fillColor("#475569").text(
          `· ${course.courseTitle} – ${course.statusLabel} · Abschluss ${formatDate(course.completedAt)} · Gültig bis ${course.validUntilLabel}${course.certificateNumber ? ` · Zertifikat ${course.certificateNumber}` : ""}`
        );
      }
      doc.moveDown(0.4);
    }

    if (!anyCourse) {
      doc.font("Helvetica").fontSize(11).fillColor("#334155").text("Keine abgeschlossenen Schulungen.");
    }

    if (examAttempts.length > 0) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(13).fillColor("#000080").text("Prüfungsergebnisse");
      doc.moveDown(0.3);
      for (const attempt of examAttempts.slice(0, 300)) {
        const passedLabel =
          attempt.passed === true
            ? "bestanden"
            : attempt.passed === false
              ? "nicht bestanden"
              : "—";
        doc.font("Helvetica").fontSize(10).fillColor("#475569").text(
          `${attempt.lastName}, ${attempt.firstName}: ${attempt.courseTitle} · ${formatDateTime(attempt.completedAt)} · ${attempt.score ?? "—"} Punkte · ${passedLabel}`
        );
      }
    }
  });
}

function buildMitarbeiterXlsx(
  employees: AdminTrainingStatusEmployee[],
  responsibilities: Map<number, string>,
  locationLabels: Map<number, string>,
  meta: Map<number, EmployeeMeta>
): Buffer {
  return rowsToXlsxBuffer(
    "Mitarbeiter",
    [
      "Vorname",
      "Nachname",
      "E-Mail",
      "Rolle",
      "Status",
      "Mitarbeiterkategorie",
      "Verantwortlichkeiten",
      "Standorte",
      "Erstellungsdatum",
      "Letzter Login",
    ],
    employees.map((emp) => {
      const m = meta.get(emp.id);
      return [
        emp.firstName,
        emp.lastName,
        emp.email,
        roleLabel(m?.role ?? "employee"),
        statusLabel(emp.active),
        emp.employeeCategoryName ?? "—",
        responsibilities.get(emp.id) ?? "—",
        locationLabels.get(emp.id) ?? emp.locationLabel ?? "—",
        formatDate(m?.createdAt ?? emp.joinedCompanyAt),
        formatDateTime(m?.lastLoginAt ?? null),
      ];
    })
  );
}

function buildSchulungenXlsx(employees: AdminTrainingStatusEmployee[]): Buffer {
  const rows: (string | number | null)[][] = [];
  for (const emp of employees) {
    for (const course of emp.courses) {
      let progress = "—";
      if (
        course.completedAt ||
        course.statusKey === "valid" ||
        course.statusKey === "unlimited_valid"
      ) {
        progress = "100%";
      } else if (course.statusKey === "in_progress") {
        progress = "In Bearbeitung";
      } else if (course.statusKey === "not_started") {
        progress = "0%";
      }

      let passed = "—";
      if (course.statusKey === "failed") passed = "Nicht bestanden";
      else if (
        course.completedAt ||
        course.statusKey === "valid" ||
        course.statusKey === "unlimited_valid"
      ) {
        passed = "Bestanden";
      }

      rows.push([
        `${emp.lastName}, ${emp.firstName}`,
        emp.email,
        course.courseTitle,
        course.statusLabel,
        progress,
        formatDate(course.completedAt),
        course.validUntilLabel,
        course.certificateNumber ?? "—",
        passed,
      ]);
    }
  }

  return rowsToXlsxBuffer(
    "Schulungen",
    [
      "Mitarbeiter",
      "E-Mail",
      "Seminar",
      "Schulungsstatus",
      "Fortschritt",
      "Abschlussdatum",
      "Gültigkeit",
      "Zertifikatsnummer",
      "Bestehensstatus",
    ],
    rows
  );
}

function buildStandorteXlsx(locations: LocationExportRow[]): Buffer {
  return rowsToXlsxBuffer(
    "Standorte",
    ["Standortname", "Adresse", "Zugeordnete Mitarbeiter", "Status"],
    locations.map((loc) => [
      loc.name,
      loc.addressLabel,
      loc.employeeNames,
      loc.active ? "Aktiv" : "Inaktiv",
    ])
  );
}

async function uploadExportFile(
  companyId: number,
  exportId: number,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!isSupabaseStorageConfigured()) return null;

  try {
    const client = getSupabaseStorageClient();
    const bucket = getStorageBucketName();
    const objectPath = `exports/company-${companyId}/export-${exportId}/${filename}`;
    const { error } = await client.storage.from(bucket).upload(objectPath, buffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.error("[company-data-export] storage upload failed:", error.message);
      return null;
    }
    const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
    return data.publicUrl ?? null;
  } catch (err) {
    console.error("[company-data-export] storage upload error:", err);
    return null;
  }
}

export async function listCompanyDataExports(
  companyId: number
): Promise<CompanyDataExportLogRow[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      e.*,
      c.name AS company_name,
      c.company_code,
      u.first_name,
      u.last_name
    FROM company_data_exports e
    JOIN companies c ON c.id = e.company_id
    LEFT JOIN users u ON u.id = e.exported_by_user_id
    WHERE e.company_id = ${companyId}
    ORDER BY e.created_at DESC
    LIMIT 50
  `) as Record<string, unknown>[];

  return rows.map(mapExportLogRow);
}

export async function listAllCompanyDataExports(): Promise<CompanyDataExportLogRow[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      e.*,
      c.name AS company_name,
      c.company_code,
      u.first_name,
      u.last_name
    FROM company_data_exports e
    JOIN companies c ON c.id = e.company_id
    LEFT JOIN users u ON u.id = e.exported_by_user_id
    ORDER BY e.created_at DESC
    LIMIT 200
  `) as Record<string, unknown>[];

  return rows.map(mapExportLogRow);
}

export async function getCompanyDataExportById(
  exportId: number
): Promise<CompanyDataExportLogRow | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      e.*,
      c.name AS company_name,
      c.company_code,
      u.first_name,
      u.last_name
    FROM company_data_exports e
    JOIN companies c ON c.id = e.company_id
    LEFT JOIN users u ON u.id = e.exported_by_user_id
    WHERE e.id = ${exportId}
    LIMIT 1
  `) as Record<string, unknown>[];

  return rows[0] ? mapExportLogRow(rows[0]) : null;
}

async function insertExportRecord(params: {
  companyId: number;
  exportedByUserId: number;
  exportReason: CompanyDataExportReasonKey;
  customReason: string | null;
  snapshot: ExportSnapshot;
}): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO company_data_exports (
      company_id,
      exported_by_user_id,
      export_reason,
      custom_reason,
      export_snapshot_json
    ) VALUES (
      ${params.companyId},
      ${params.exportedByUserId},
      ${params.exportReason},
      ${params.customReason},
      ${JSON.stringify(params.snapshot)}::jsonb
    )
    RETURNING id
  `;
  return Number(rows[0].id);
}

async function updateExportFileUrls(
  exportId: number,
  fileUrl: string | null,
  protocolFileUrl: string | null
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE company_data_exports
    SET file_url = ${fileUrl},
        protocol_file_url = ${protocolFileUrl}
    WHERE id = ${exportId}
  `;
}

export async function createCompanyDataExport(params: {
  companyId: number;
  exportReason: CompanyDataExportReasonKey;
  customReason: string | null;
  exportedByUserId: number;
  exportedByName: string;
}): Promise<{ buffer: Buffer; filename: string; exportId: number }> {
  const company = await getCompanyById(params.companyId);
  if (!company) throw new Error("COMPANY_NOT_FOUND");

  const rawData = await loadCompanyRawExportData(company);
  await validateCompanyRawExportData(rawData);
  const rawJsonFiles = buildRawDataJsonFiles(rawData);

  const [employees, locations, privacyRows, examAttempts, responsibilities, meta] =
    await Promise.all([
      loadAllTrainingEmployees(params.companyId),
      loadLocationRows(params.companyId),
      loadPrivacyAcceptances(params.companyId),
      loadExamAttempts(params.companyId),
      loadEmployeeResponsibilities(params.companyId),
      loadEmployeeMeta(params.companyId),
    ]);

  const locationLabels = await loadLocationLabelsForUsers(employees.map((e) => e.id));

  const sql = getSql();
  const certRows = (await sql`
    SELECT * FROM certificates
    WHERE company_id = ${params.companyId}
      AND revoked = FALSE
    ORDER BY issued_at DESC
  `) as Record<string, unknown>[];
  const certificates = certRows.map((row) => mapCertificate(row));

  const trainingCount = rawData.trainings.assignments.length;
  const createdAt = new Date().toISOString();
  const snapshot: ExportSnapshot = {
    employees: rawData.employees.length,
    locations: rawData.locations.length,
    trainings: trainingCount,
    certificates: rawData.certificates.filter((c) => !c.revoked).length,
    privacy_acceptances: rawData.privacyAcceptances.length,
    generated_at: createdAt,
  };

  const exportId = await insertExportRecord({
    companyId: params.companyId,
    exportedByUserId: params.exportedByUserId,
    exportReason: params.exportReason,
    customReason: params.customReason,
    snapshot,
  });

  const protocolPdf = await buildExportProtocolPdf({
    exportId,
    company,
    exportedByName: params.exportedByName,
    exportReason: params.exportReason,
    customReason: params.customReason,
    createdAt,
    snapshot,
  });

  const [
    firmaPdf,
    privacyPdf,
    nachweisePdf,
    mitarbeiterXlsx,
    schulungenXlsx,
    standorteXlsx,
  ] = await Promise.all([
    buildCompanySummaryPdf(
      company,
      employees.length,
      locations.length,
      certificates.length,
      params.exportReason
    ),
    buildPrivacyPdf(privacyRows),
    buildNachweisePdf(employees, examAttempts),
    Promise.resolve(
      buildMitarbeiterXlsx(employees, responsibilities, locationLabels, meta)
    ),
    Promise.resolve(buildSchulungenXlsx(employees)),
    Promise.resolve(buildStandorteXlsx(locations)),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  const code = company.companyCode || `company_${company.id}`;
  const filename = `firma_${code}_export_${date}.zip`;

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const passThrough = new PassThrough();
  const chunks: Buffer[] = [];
  passThrough.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    passThrough.on("end", () => resolve(Buffer.concat(chunks)));
    passThrough.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(passThrough);
  archive.append(protocolPdf, { name: "export_protokoll.pdf" });
  archive.append(firmaPdf, { name: "01_firma.pdf" });
  archive.append(mitarbeiterXlsx, { name: "02_mitarbeiter.xlsx" });
  archive.append(schulungenXlsx, { name: "03_schulungen.xlsx" });
  archive.append(standorteXlsx, { name: "04_standorte.xlsx" });
  archive.append(nachweisePdf, { name: "06_nachweise/nachweise-uebersicht.pdf" });
  archive.append(privacyPdf, { name: "07_datenschutz.pdf" });

  for (const [path, content] of Object.entries(rawJsonFiles)) {
    archive.append(content, { name: path });
  }

  if (company.branding.logoUrl) {
    try {
      const logoRes = await fetch(company.branding.logoUrl);
      if (logoRes.ok) {
        const logoBuf = Buffer.from(await logoRes.arrayBuffer());
        const ext = company.branding.logoUrl.split(".").pop()?.split("?")[0] ?? "png";
        archive.append(logoBuf, { name: `branding/logo.${ext}` });
      }
    } catch {
      /* optional logo */
    }
  }

  for (const cert of certificates) {
    try {
      const pdf = await renderCertificatePdfBuffer(cert);
      archive.append(pdf, { name: `05_zertifikate/${certFilename(cert, employees)}` });
    } catch (err) {
      console.error(`[company-data-export] certificate PDF failed id=${cert.id}:`, err);
    }
  }

  await archive.finalize();
  const buffer = await done;

  const [fileUrl, protocolFileUrl] = await Promise.all([
    uploadExportFile(params.companyId, exportId, filename, buffer, "application/zip"),
    uploadExportFile(
      params.companyId,
      exportId,
      "export_protokoll.pdf",
      protocolPdf,
      "application/pdf"
    ),
  ]);

  await updateExportFileUrls(exportId, fileUrl, protocolFileUrl);

  return { buffer, filename, exportId };
}
