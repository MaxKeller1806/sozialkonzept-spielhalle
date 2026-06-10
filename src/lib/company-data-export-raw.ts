import { getSql } from "./db";
import { mapCertificate, mapTrainingAttempt, mapUser } from "./db/row-mappers";
import type { Company, CompanyBranding, CompanyDocumentSignature } from "./types";

export class CompanyDataExportTenantError extends Error {
  readonly violations: string[];

  constructor(violations: string[]) {
    super("TENANT_ISOLATION_VIOLATION");
    this.name = "CompanyDataExportTenantError";
    this.violations = violations;
  }
}

export type RawExportEmployee = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  active: boolean;
  birthDate: string | null;
  birthPlace: string | null;
  placeOfResidence: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  employeeCategoryId: number | null;
  employeeCategoryName: string | null;
  joinedCompanyAt: string | null;
  leftCompanyAt: string | null;
  locationId: number | null;
  locationAssignments: Array<{
    locationId: number;
    isPrimary: boolean;
    locationName: string;
    city: string | null;
  }>;
  responsibilities: Array<{
    responsibilityTypeId: number;
    name: string;
    slug: string;
    assignedAt: string;
  }>;
  createdAt: string;
  lastLoginAt: string | null;
};

export type RawExportLocation = {
  id: number;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RawExportTrainingAssignment = {
  userId: number;
  courseId: string;
  courseTitle: string | null;
  assignedAt: string;
};

export type RawExportTrainingAttempt = {
  id: number;
  userId: number;
  courseId: string;
  courseTitle: string | null;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  passed: boolean | null;
  moduleProgress: unknown;
  lessonProgress: unknown;
  examQuestionIds: unknown;
  answers: unknown;
};

export type RawExportCertificate = {
  id: number;
  certificateNumber: string;
  userId: number;
  courseId: string;
  issuedAt: string;
  validUntil: string | null;
  score: number;
  revoked: boolean;
  templateRevisionId: number | null;
};

export type RawExportPrivacyAcceptance = {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  policyVersion: string;
  policyTitle: string;
  acceptedAt: string;
};

export type RawExportBranding = {
  companyId: number;
  companyCode: string;
  companyName: string;
  contactPerson: string | null;
  contactPersonEmail: string | null;
  contactPersonPhone: string | null;
  branding: CompanyBranding;
  documentSignature: CompanyDocumentSignature;
};

export type RawExportCompany = {
  id: number;
  companyCode: string;
  slug: string;
  name: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  loginDomain: string | null;
  status: string;
  licenseStatus: string;
  licenseExpiresAt: string | null;
  licenseActivatedAt: string | null;
  industryId: number | null;
  industryName: string | null;
  businessTypeId: number | null;
  businessTypeName: string | null;
  contactPerson: string | null;
  contactPersonEmail: string | null;
  contactPersonPhone: string | null;
  allowAdminValidityOverride: boolean;
  allowAdminPassingScoreOverride: boolean;
  createdAt: string;
};

export type CompanyRawExportData = {
  companyId: number;
  company: RawExportCompany;
  branding: RawExportBranding;
  employees: RawExportEmployee[];
  locations: RawExportLocation[];
  trainings: {
    assignments: RawExportTrainingAssignment[];
    attempts: RawExportTrainingAttempt[];
  };
  certificates: RawExportCertificate[];
  privacyAcceptances: RawExportPrivacyAcceptance[];
};

function parseJsonField(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function companyToRaw(company: Company): RawExportCompany {
  return {
    id: company.id,
    companyCode: company.companyCode,
    slug: company.slug,
    name: company.name,
    street: company.street,
    postalCode: company.postalCode,
    city: company.city,
    country: company.country,
    email: company.email,
    phone: company.phone,
    website: company.website,
    loginDomain: company.loginDomain,
    status: company.status,
    licenseStatus: company.licenseStatus,
    licenseExpiresAt: company.licenseExpiresAt,
    licenseActivatedAt: company.licenseActivatedAt,
    industryId: company.industryId,
    industryName: company.industryName ?? null,
    businessTypeId: company.businessTypeId,
    businessTypeName: company.businessTypeName ?? null,
    contactPerson: company.contactPerson,
    contactPersonEmail: company.contactPersonEmail,
    contactPersonPhone: company.contactPersonPhone,
    allowAdminValidityOverride: company.allowAdminValidityOverride,
    allowAdminPassingScoreOverride: company.allowAdminPassingScoreOverride,
    createdAt: company.createdAt,
  };
}

function certificateToRaw(cert: ReturnType<typeof mapCertificate>): RawExportCertificate {
  return {
    id: cert.id,
    certificateNumber: cert.certificateNumber,
    userId: cert.userId,
    courseId: cert.courseId,
    issuedAt: cert.issuedAt,
    validUntil: cert.validUntil,
    score: cert.score,
    revoked: cert.revoked === 1,
    templateRevisionId: cert.templateRevisionId,
  };
}

export async function loadCompanyRawExportData(
  company: Company
): Promise<CompanyRawExportData> {
  const companyId = company.id;
  const sql = getSql();

  const locationRows = (await sql`
    SELECT *
    FROM company_locations
    WHERE company_id = ${companyId}
    ORDER BY sort_order ASC, name ASC
  `) as Record<string, unknown>[];

  let userRows: Record<string, unknown>[];
  try {
    userRows = (await sql`
      SELECT
        u.*,
        ec.name AS employee_category_name
      FROM users u
      LEFT JOIN employee_categories ec ON ec.id = u.employee_category_id
      WHERE u.company_id = ${companyId}
        AND u.role IN ('admin', 'employee')
      ORDER BY u.last_name ASC, u.first_name ASC
    `) as Record<string, unknown>[];
  } catch {
    userRows = (await sql`
      SELECT u.*, NULL AS employee_category_name
      FROM users u
      WHERE u.company_id = ${companyId}
        AND u.role IN ('admin', 'employee')
      ORDER BY u.last_name ASC, u.first_name ASC
    `) as Record<string, unknown>[];
  }

  const userIds = userRows.map((r) => Number(r.id));

  const locationAssignmentRows =
    userIds.length > 0
      ? ((await sql`
          SELECT
            ul.user_id,
            ul.location_id,
            ul.is_primary,
            cl.name AS location_name,
            cl.city
          FROM user_locations ul
          JOIN company_locations cl ON cl.id = ul.location_id
          WHERE ul.user_id IN ${sql(userIds)}
            AND cl.company_id = ${companyId}
        `) as Record<string, unknown>[])
      : [];

  const responsibilityRows =
    userIds.length > 0
      ? ((await sql`
          SELECT
            cr.user_id,
            cr.responsibility_type_id,
            cr.assigned_at,
            rt.name,
            rt.slug
          FROM company_responsibilities cr
          JOIN responsibility_types rt ON rt.id = cr.responsibility_type_id
          WHERE cr.company_id = ${companyId}
            AND cr.user_id IN ${sql(userIds)}
        `) as Record<string, unknown>[])
      : [];

  const assignmentRows =
    userIds.length > 0
      ? ((await sql`
          SELECT
            uca.user_id,
            uca.course_id,
            uca.assigned_at,
            c.title AS course_title
          FROM user_course_assignments uca
          JOIN users u ON u.id = uca.user_id
          LEFT JOIN courses c ON c.id = uca.course_id
          WHERE u.company_id = ${companyId}
            AND uca.user_id IN ${sql(userIds)}
        `) as Record<string, unknown>[])
      : [];

  const attemptRows =
    userIds.length > 0
      ? ((await sql`
          SELECT
            ta.*,
            c.title AS course_title
          FROM training_attempts ta
          JOIN users u ON u.id = ta.user_id
          LEFT JOIN courses c ON c.id = ta.course_id
          WHERE u.company_id = ${companyId}
            AND ta.user_id IN ${sql(userIds)}
        `) as Record<string, unknown>[])
      : [];

  const certRows = (await sql`
    SELECT *
    FROM certificates
    WHERE company_id = ${companyId}
    ORDER BY issued_at DESC
  `) as Record<string, unknown>[];

  const privacyRows = (await sql`
    SELECT
      pa.user_id,
      pa.accepted_at,
      u.first_name,
      u.last_name,
      u.email,
      ppv.version,
      ppv.title
    FROM privacy_policy_acceptances pa
    JOIN users u ON u.id = pa.user_id
    JOIN privacy_policy_versions ppv ON ppv.id = pa.version_id
    WHERE pa.company_id = ${companyId}
    ORDER BY pa.accepted_at DESC
  `) as Record<string, unknown>[];

  const assignmentsByUser = new Map<number, RawExportEmployee["locationAssignments"]>();
  for (const row of locationAssignmentRows) {
    const userId = Number(row.user_id);
    const list = assignmentsByUser.get(userId) ?? [];
    list.push({
      locationId: Number(row.location_id),
      isPrimary: Boolean(row.is_primary),
      locationName: String(row.location_name),
      city: row.city != null ? String(row.city) : null,
    });
    assignmentsByUser.set(userId, list);
  }

  const responsibilitiesByUser = new Map<number, RawExportEmployee["responsibilities"]>();
  for (const row of responsibilityRows) {
    const userId = Number(row.user_id);
    const list = responsibilitiesByUser.get(userId) ?? [];
    list.push({
      responsibilityTypeId: Number(row.responsibility_type_id),
      name: String(row.name),
      slug: String(row.slug),
      assignedAt: new Date(String(row.assigned_at)).toISOString(),
    });
    responsibilitiesByUser.set(userId, list);
  }

  const employees: RawExportEmployee[] = userRows.map((row) => {
    const user = mapUser(row);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      active: user.active === 1,
      birthDate: user.birthDate,
      birthPlace: user.birthPlace,
      placeOfResidence: user.placeOfResidence,
      street: user.street,
      houseNumber: user.houseNumber,
      postalCode: user.postalCode,
      city: user.city,
      employeeCategoryId: user.employeeCategoryId,
      employeeCategoryName:
        row.employee_category_name != null ? String(row.employee_category_name) : null,
      joinedCompanyAt: user.joinedCompanyAt,
      leftCompanyAt: user.leftCompanyAt,
      locationId: user.locationId,
      locationAssignments: assignmentsByUser.get(user.id) ?? [],
      responsibilities: responsibilitiesByUser.get(user.id) ?? [],
      createdAt: user.createdAt,
      lastLoginAt:
        row.last_login_at != null
          ? new Date(String(row.last_login_at)).toISOString()
          : null,
    };
  });

  const locations: RawExportLocation[] = locationRows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    addressLine1: row.address_line1 != null ? String(row.address_line1) : null,
    addressLine2: row.address_line2 != null ? String(row.address_line2) : null,
    postalCode: row.postal_code != null ? String(row.postal_code) : null,
    city: row.city != null ? String(row.city) : null,
    country: row.country != null ? String(row.country) : "DE",
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }));

  const assignments: RawExportTrainingAssignment[] = assignmentRows.map((row) => ({
    userId: Number(row.user_id),
    courseId: String(row.course_id),
    courseTitle: row.course_title != null ? String(row.course_title) : null,
    assignedAt: new Date(String(row.assigned_at)).toISOString(),
  }));

  const attempts: RawExportTrainingAttempt[] = attemptRows.map((row) => {
    const attempt = mapTrainingAttempt(row);
    return {
      id: attempt.id,
      userId: attempt.userId,
      courseId: attempt.courseId,
      courseTitle: row.course_title != null ? String(row.course_title) : null,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      score: attempt.score,
      passed: attempt.passed == null ? null : attempt.passed === 1,
      moduleProgress: parseJsonField(attempt.moduleProgressJson),
      lessonProgress: parseJsonField(attempt.lessonProgressJson),
      examQuestionIds: parseJsonField(attempt.examQuestionIdsJson),
      answers: parseJsonField(attempt.answersJson),
    };
  });

  const certificates = certRows.map((row) => certificateToRaw(mapCertificate(row)));

  const privacyAcceptances: RawExportPrivacyAcceptance[] = privacyRows.map((row) => ({
    userId: Number(row.user_id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    email: String(row.email),
    policyVersion: String(row.version),
    policyTitle: String(row.title),
    acceptedAt: new Date(String(row.accepted_at)).toISOString(),
  }));

  const branding: RawExportBranding = {
    companyId: company.id,
    companyCode: company.companyCode,
    companyName: company.name,
    contactPerson: company.contactPerson,
    contactPersonEmail: company.contactPersonEmail,
    contactPersonPhone: company.contactPersonPhone,
    branding: company.branding,
    documentSignature: company.documentSignature,
  };

  return {
    companyId,
    company: companyToRaw(company),
    branding,
    employees,
    locations,
    trainings: { assignments, attempts },
    certificates,
    privacyAcceptances,
  };
}

export async function validateCompanyRawExportData(
  data: CompanyRawExportData
): Promise<void> {
  const companyId = data.companyId;
  const violations: string[] = [];

  if (data.company.id !== companyId) {
    violations.push(`company: id ${data.company.id} != ${companyId}`);
  }

  for (const emp of data.employees) {
    if (emp.role === "superuser") {
      violations.push(`employee ${emp.id}: Superuser-Daten dürfen nicht exportiert werden`);
    }
  }

  for (const pa of data.privacyAcceptances) {
    if (!data.employees.some((e) => e.id === pa.userId)) {
      violations.push(
        `privacy_acceptance user ${pa.userId}: Benutzer gehört nicht zur exportierten Firma`
      );
    }
  }

  for (const assignment of data.trainings.assignments) {
    if (!data.employees.some((e) => e.id === assignment.userId)) {
      violations.push(
        `training_assignment user ${assignment.userId}: Benutzer gehört nicht zur exportierten Firma`
      );
    }
  }

  for (const attempt of data.trainings.attempts) {
    if (!data.employees.some((e) => e.id === attempt.userId)) {
      violations.push(
        `training_attempt ${attempt.id}: Benutzer gehört nicht zur exportierten Firma`
      );
    }
  }

  const sql = getSql();
  const employeeIds = data.employees.map((e) => e.id);
  const locationIds = data.locations.map((l) => l.id);
  const certificateIds = data.certificates.map((c) => c.id);

  if (employeeIds.length > 0) {
    const foreignUsers = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM users
      WHERE id IN ${sql(employeeIds)}
        AND (company_id IS DISTINCT FROM ${companyId} OR role = 'superuser')
    `;
    if (Number(foreignUsers[0]?.cnt ?? 0) > 0) {
      violations.push("users: Datensätze anderer Firmen oder Superuser gefunden");
    }
  }

  if (locationIds.length > 0) {
    const foreignLocations = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM company_locations
      WHERE id IN ${sql(locationIds)}
        AND company_id IS DISTINCT FROM ${companyId}
    `;
    if (Number(foreignLocations[0]?.cnt ?? 0) > 0) {
      violations.push("locations: Datensätze anderer Firmen gefunden");
    }
  }

  if (certificateIds.length > 0) {
    const foreignCerts = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM certificates
      WHERE id IN ${sql(certificateIds)}
        AND company_id IS DISTINCT FROM ${companyId}
    `;
    if (Number(foreignCerts[0]?.cnt ?? 0) > 0) {
      violations.push("certificates: Datensätze anderer Firmen gefunden");
    }
  }

  const foreignPrivacy = await sql`
    SELECT COUNT(*)::int AS cnt
    FROM privacy_policy_acceptances
    WHERE company_id = ${companyId}
      AND user_id NOT IN (
        SELECT id FROM users WHERE company_id = ${companyId} AND role IN ('admin', 'employee')
      )
  `;
  if (Number(foreignPrivacy[0]?.cnt ?? 0) > 0) {
    violations.push("privacy_acceptances: inkonsistente Mandantenzuordnung");
  }

  if (employeeIds.length > 0) {
    const locationAssignmentsCheck = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM user_locations ul
      JOIN company_locations cl ON cl.id = ul.location_id
      WHERE ul.user_id IN ${sql(employeeIds)}
        AND cl.company_id IS DISTINCT FROM ${companyId}
    `;
    if (Number(locationAssignmentsCheck[0]?.cnt ?? 0) > 0) {
      violations.push("user_locations: Standort anderer Firma zugeordnet");
    }
  }

  if (violations.length > 0) {
    console.error("[company-data-export] Mandantentrennung verletzt:", violations);
    throw new CompanyDataExportTenantError(violations);
  }
}

export function buildRawDataJsonFiles(
  data: CompanyRawExportData
): Record<string, Buffer> {
  const meta = {
    exported_company_id: data.companyId,
    exported_company_code: data.company.companyCode,
    format_version: 1,
    generated_at: new Date().toISOString(),
  };

  return {
    "raw_data/company.json": Buffer.from(
      JSON.stringify({ ...meta, company: data.company }, null, 2),
      "utf8"
    ),
    "raw_data/employees.json": Buffer.from(
      JSON.stringify({ ...meta, employees: data.employees }, null, 2),
      "utf8"
    ),
    "raw_data/locations.json": Buffer.from(
      JSON.stringify({ ...meta, locations: data.locations }, null, 2),
      "utf8"
    ),
    "raw_data/trainings.json": Buffer.from(
      JSON.stringify({ ...meta, trainings: data.trainings }, null, 2),
      "utf8"
    ),
    "raw_data/certificates.json": Buffer.from(
      JSON.stringify({ ...meta, certificates: data.certificates }, null, 2),
      "utf8"
    ),
    "raw_data/privacy_acceptances.json": Buffer.from(
      JSON.stringify({ ...meta, privacy_acceptances: data.privacyAcceptances }, null, 2),
      "utf8"
    ),
    "raw_data/branding.json": Buffer.from(
      JSON.stringify({ ...meta, branding: data.branding }, null, 2),
      "utf8"
    ),
  };
}
