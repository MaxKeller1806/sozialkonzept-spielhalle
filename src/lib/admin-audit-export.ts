import {
  buildAdminTrainingStatusEmployees,
  listAdminTrainingStatus,
  parseTrainingStatusListQuery,
  type AdminTrainingStatusEmployee,
} from "./admin-training-status-list";
import { getSql } from "./db";
import { mapCertificate, mapUser } from "./db/row-mappers";
import { getCourseForContext } from "./course";
import { getCourseMeta } from "./course-db";
import { filterCourseForCompany } from "./content-provisions";
import { getDocumentTemplateRevisionById } from "./document-template";
import { generateCertificatePdf } from "./pdf";
import {
  generateExamDocumentationPdf,
  generateLearningContentPdf,
} from "./pdf-export";
import { getCompanyById } from "./tenant";
import type { Certificate } from "./types";
import type { ListMeta } from "./list-query";
import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";

export type AuditExportEmployeeRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  locationLabel: string | null;
  employeeCategoryName: string | null;
  joinedCompanyAt: string | null;
  leftCompanyAt: string | null;
  active: boolean;
  certificateCount: number;
  lastCompletedAt: string | null;
  statusLabel: string;
};

export type AuditExportOptions = {
  includeCertificates: boolean;
  includeLearningContent: boolean;
  includeExams: boolean;
  showExamCorrectAnswers: boolean;
};

export const MAX_AUDIT_EXPORT_USERS = 100;

function mapAuditRow(employee: AdminTrainingStatusEmployee): AuditExportEmployeeRow {
  const withCert = employee.courses.filter((c) => c.certificateId != null);
  const lastCompleted = withCert
    .map((c) => c.completedAt)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  let statusLabel = "Keine Zuweisungen";
  if (employee.summary.courseCount > 0) {
    if (employee.summary.expiredCount > 0) {
      statusLabel = `${employee.summary.expiredCount} abgelaufen`;
    } else if (employee.summary.dueSoonCount > 0) {
      statusLabel = `${employee.summary.dueSoonCount} fällig bald`;
    } else {
      statusLabel = "Aktuell";
    }
  }

  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    locationLabel: employee.locationLabel,
    employeeCategoryName: employee.employeeCategoryName,
    joinedCompanyAt: employee.joinedCompanyAt,
    leftCompanyAt: employee.leftCompanyAt ?? null,
    active: employee.active,
    certificateCount: withCert.length,
    lastCompletedAt: lastCompleted,
    statusLabel,
  };
}

export async function listAuditExportEmployees(
  companyId: number,
  query: ReturnType<typeof parseTrainingStatusListQuery>,
  effectiveLocationId: number | null
): Promise<{ employees: AuditExportEmployeeRow[]; meta: ListMeta }> {
  const result = await listAdminTrainingStatus(
    companyId,
    query,
    effectiveLocationId
  );

  const employees = result.employees.map(mapAuditRow);
  return { employees, meta: result.meta };
}

function slugifyName(firstName: string, lastName: string): string {
  return `${firstName}_${lastName}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80) || "Mitarbeiter";
}

function slugifyCourse(title: string, instructionCode: string | null): string {
  const base = instructionCode?.trim() || title;
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60) || "Seminar";
}

function csvEscape(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function yn(flag: boolean): string {
  return flag ? "ja" : "nein";
}

async function loadCourseTopicNames(
  courseIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (courseIds.length === 0) return map;

  const sql = getSql();
  try {
    const rows = (await sql`
      SELECT cta.course_id, string_agg(ct.name, ', ' ORDER BY ct.sort_order, ct.name) AS topic_names
      FROM course_topic_assignments cta
      JOIN course_topics ct ON ct.id = cta.topic_id
      WHERE cta.course_id IN ${sql(courseIds)}
      GROUP BY cta.course_id
    `) as Record<string, unknown>[];
    for (const row of rows) {
      map.set(String(row.course_id), String(row.topic_names ?? ""));
    }
  } catch {
    const rows = (await sql`
      SELECT c.id AS course_id, ct.name AS topic_names
      FROM courses c
      LEFT JOIN course_topics ct ON ct.id = c.topic_id
      WHERE c.id IN ${sql(courseIds)} AND c.topic_id IS NOT NULL
    `) as Record<string, unknown>[];
    for (const row of rows) {
      if (row.topic_names) {
        map.set(String(row.course_id), String(row.topic_names));
      }
    }
  }
  return map;
}

function buildAuditCsv(
  employees: AdminTrainingStatusEmployee[],
  topicNames: Map<string, string>,
  assignedCourseIds: Set<string>,
  options: AuditExportOptions
): string {
  const header = [
    "Mitarbeitername",
    "E-Mail",
    "Standort",
    "Mitarbeiterkategorie",
    "Kursname",
    "Hauptthema",
    "Abgeschlossen am",
    "Gültig bis",
    "Status",
    "Zertifikatsnummer",
    "Zertifikat exportiert",
    "Lerninhalt exportiert",
    "Abschlusstest exportiert",
  ];

  const lines = [header.join(";")];

  for (const emp of employees) {
    const name = `${emp.lastName}, ${emp.firstName}`;
    for (const course of emp.courses) {
      if (!assignedCourseIds.has(course.courseId)) continue;
      const hasCert = course.certificateId != null;
      lines.push(
        [
          csvEscape(name),
          csvEscape(emp.email),
          csvEscape(emp.locationLabel ?? ""),
          csvEscape(emp.employeeCategoryName ?? ""),
          csvEscape(course.courseTitle),
          csvEscape(topicNames.get(course.courseId) ?? ""),
          csvEscape(course.completedAt?.slice(0, 10) ?? ""),
          csvEscape(course.validUntilLabel ?? ""),
          csvEscape(course.statusLabel),
          csvEscape(hasCert ? (course.certificateNumber ?? "") : ""),
          yn(options.includeCertificates && hasCert),
          yn(options.includeLearningContent),
          yn(options.includeExams),
        ].join(";")
      );
    }
  }

  return `\uFEFF${lines.join("\n")}\n`;
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

  return generateCertificatePdf(user, cert, course, {
    companyName: company?.name,
    branding: company?.branding,
    documentSignature: company?.documentSignature,
    instructionCode: courseMeta?.instructionCode ?? null,
    instructionTitle: courseMeta?.instructionTitle ?? null,
    templateConfig,
  });
}

export async function buildAuditExportZip(
  companyId: number,
  userIds: number[],
  effectiveLocationId: number | null,
  options: AuditExportOptions
): Promise<{ buffer: Buffer; filename: string }> {
  if (userIds.length === 0) {
    throw new Error("NO_USERS_SELECTED");
  }
  if (userIds.length > MAX_AUDIT_EXPORT_USERS) {
    throw new Error("TOO_MANY_USERS");
  }
  if (
    !options.includeCertificates &&
    !options.includeLearningContent &&
    !options.includeExams
  ) {
    throw new Error("NO_EXPORT_CONTENT");
  }

  const query = parseTrainingStatusListQuery(new URLSearchParams());
  query.status = "all";
  query.employmentFilter = "all";
  query.pageSize = 5000;
  query.page = 1;

  let employees = await buildAdminTrainingStatusEmployees(
    companyId,
    query,
    effectiveLocationId
  );
  const idSet = new Set(userIds);
  employees = employees.filter((e) => idSet.has(e.id));

  if (employees.length === 0) {
    throw new Error("NO_ACCESSIBLE_USERS");
  }

  if (employees.length !== userIds.length) {
    throw new Error("USER_SCOPE_VIOLATION");
  }

  const assignedCourseIds = new Set<string>();
  for (const emp of employees) {
    for (const course of emp.courses) {
      assignedCourseIds.add(course.courseId);
    }
  }

  const courseIds = [...assignedCourseIds];
  const topicNames = await loadCourseTopicNames(courseIds);
  const csv = buildAuditCsv(employees, topicNames, assignedCourseIds, options);
  const date = new Date().toISOString().slice(0, 10);
  const rootFolder = `Audit-Export_${date}`;
  const company = await getCompanyById(companyId);

  const sql = getSql();
  const certIds = options.includeCertificates
    ? [
        ...new Set(
          employees.flatMap((e) =>
            e.courses
              .map((c) => c.certificateId)
              .filter((id): id is number => id != null)
          )
        ),
      ]
    : [];

  const certRows =
    certIds.length > 0
      ? ((await sql`
          SELECT * FROM certificates
          WHERE id IN ${sql(certIds)}
            AND company_id = ${companyId}
            AND revoked = FALSE
        `) as Record<string, unknown>[])
      : [];

  const certsById = new Map<number, Certificate>();
  for (const row of certRows) {
    const cert = mapCertificate(row);
    certsById.set(cert.id, cert);
  }

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
  archive.append(csv, { name: `${rootFolder}/audit-uebersicht.csv` });

  const courseMetaCache = new Map<
    string,
    Awaited<ReturnType<typeof getCourseMeta>>
  >();
  const learningPdfCache = new Map<string, Buffer>();
  const examPdfCache = new Map<string, Buffer>();

  async function courseSlugFor(courseId: string): Promise<string> {
    let meta = courseMetaCache.get(courseId);
    if (meta === undefined) {
      meta = await getCourseMeta(companyId, courseId);
      courseMetaCache.set(courseId, meta);
    }
    return slugifyCourse(meta?.title ?? courseId, meta?.instructionCode ?? null);
  }

  async function getLearningPdf(courseId: string): Promise<Buffer | null> {
    const cached = learningPdfCache.get(courseId);
    if (cached) return cached;
    try {
      const raw = await getCourseForContext(companyId, courseId, {
        filterContent: false,
      });
      const filtered = await filterCourseForCompany(companyId, raw);
      const pdf = await generateLearningContentPdf(filtered, {
        companyName: company?.name,
        branding: company?.branding,
      });
      learningPdfCache.set(courseId, pdf);
      return pdf;
    } catch (err) {
      console.error(`[audit-export] learning PDF failed ${courseId}:`, err);
      return null;
    }
  }

  async function getExamPdf(courseId: string): Promise<Buffer | null> {
    const cached = examPdfCache.get(courseId);
    if (cached) return cached;
    try {
      const raw = await getCourseForContext(companyId, courseId, {
        filterContent: false,
      });
      const filtered = await filterCourseForCompany(companyId, raw);
      const pdf = await generateExamDocumentationPdf(filtered, {
        companyName: company?.name,
        branding: company?.branding,
        showCorrectAnswers: options.showExamCorrectAnswers,
      });
      examPdfCache.set(courseId, pdf);
      return pdf;
    } catch (err) {
      console.error(`[audit-export] exam PDF failed ${courseId}:`, err);
      return null;
    }
  }

  for (const emp of employees) {
    const empSlug = slugifyName(emp.firstName, emp.lastName);
    const empCourses = emp.courses.filter((c) => assignedCourseIds.has(c.courseId));

    if (options.includeCertificates) {
      for (const course of empCourses) {
        if (!course.certificateId) continue;
        const cert = certsById.get(course.certificateId);
        if (!cert) continue;
        try {
          const pdf = await renderCertificatePdfBuffer(cert);
          const baseName = slugifyCourse(
            course.courseTitle,
            course.instructionCode
          );
          archive.append(pdf, {
            name: `${rootFolder}/${empSlug}/Zertifikate/${baseName}.pdf`,
          });
        } catch (err) {
          console.error(
            `[audit-export] cert PDF failed cert=${course.certificateId}:`,
            err
          );
        }
      }
    }

    if (options.includeLearningContent) {
      for (const course of empCourses) {
        const pdf = await getLearningPdf(course.courseId);
        if (!pdf) continue;
        const slug = await courseSlugFor(course.courseId);
        archive.append(pdf, {
          name: `${rootFolder}/${empSlug}/Lerninhalte/${slug}.pdf`,
        });
      }
    }

    if (options.includeExams) {
      for (const course of empCourses) {
        const pdf = await getExamPdf(course.courseId);
        if (!pdf) continue;
        const slug = await courseSlugFor(course.courseId);
        archive.append(pdf, {
          name: `${rootFolder}/${empSlug}/Abschlusstests/${slug}.pdf`,
        });
      }
    }
  }

  await archive.finalize();
  const buffer = await done;

  return {
    buffer,
    filename: `${rootFolder}.zip`,
  };
}

export { parseTrainingStatusListQuery };
