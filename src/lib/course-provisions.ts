import { getSql } from "./db";
import {
  getCourseData,
  saveCourseData,
} from "./course-db";
import {
  getMasterCourseData,
  getMasterCourseMeta,
  masterContentAsCourseData,
} from "./master-course-db";
import type { CourseProvision, CourseProvisionStatus } from "./types";

function normalizeStatus(status: string): CourseProvisionStatus {
  if (status === "locked") return "disabled";
  return status as CourseProvisionStatus;
}

function mapProvision(row: Record<string, unknown>): CourseProvision {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    courseId: String(row.course_id),
    masterCourseId: row.master_course_id != null ? String(row.master_course_id) : null,
    masterTitle: row.master_title != null ? String(row.master_title) : null,
    status: normalizeStatus(String(row.status ?? "active")),
    canEditContent: Boolean(row.can_edit_content ?? true),
    canEditTests: Boolean(row.can_edit_tests ?? true),
    canAddModules: Boolean(row.can_add_modules ?? true),
    canDeactivate: Boolean(row.can_deactivate ?? true),
    disabledBySuperuser: Boolean(row.disabled_by_superuser ?? false),
    assignedAt: new Date(String(row.assigned_at ?? row.created_at ?? Date.now())).toISOString(),
    courseTitle: String(row.course_title),
    courseSlug: String(row.course_slug),
    courseActive: Boolean(row.course_active),
    source: row.master_course_id != null ? "master" : "native",
  };
}

export async function ensureProvisionForCourse(
  companyId: number,
  courseId: string,
  opts?: { masterCourseId?: string | null; assignedBy?: number | null }
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO company_course_provisions (
      company_id, course_id, master_course_id, status,
      can_edit_content, can_edit_tests, can_add_modules, can_deactivate,
      assigned_by
    )
    VALUES (
      ${companyId}, ${courseId}, ${opts?.masterCourseId ?? null}, 'active',
      TRUE, TRUE, TRUE, TRUE, ${opts?.assignedBy ?? null}
    )
    ON CONFLICT (company_id, course_id) DO NOTHING
  `;
}

export async function getCourseProvision(
  companyId: number,
  courseId: string
): Promise<CourseProvision | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      p.*,
      c.title AS course_title,
      c.slug AS course_slug,
      c.active AS course_active,
      m.title AS master_title
    FROM company_course_provisions p
    JOIN courses c ON c.id = p.course_id
    LEFT JOIN master_courses m ON m.id = p.master_course_id
    WHERE p.company_id = ${companyId} AND p.course_id = ${courseId}
    LIMIT 1
  `;
  return rows[0] ? mapProvision(rows[0] as Record<string, unknown>) : undefined;
}

function coursesOnlyFallback(
  companyId: number,
  rows: Record<string, unknown>[]
): CourseProvision[] {
  return rows.map((r) => ({
    id: 0,
    companyId,
    courseId: String(r.id),
    masterCourseId: r.master_course_id != null ? String(r.master_course_id) : null,
    masterTitle: null,
    status: (r.active ? "active" : "disabled") as CourseProvisionStatus,
    canEditContent: true,
    canEditTests: true,
    canAddModules: true,
    canDeactivate: true,
    disabledBySuperuser: false,
    assignedAt: new Date(String(r.created_at ?? Date.now())).toISOString(),
    courseTitle: String(r.title),
    courseSlug: String(r.slug ?? ""),
    courseActive: Boolean(r.active),
    source: r.master_course_id != null ? ("master" as const) : ("native" as const),
  }));
}

function isMissingRelation(err: unknown, name: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("does not exist") && msg.includes(name);
}

function isMissingColumn(err: unknown, name: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("does not exist") && msg.includes(name);
}

async function loadCoursesOnlyRows(
  companyId: number
): Promise<Record<string, unknown>[]> {
  const sql = getSql();
  try {
    return (await sql`
      SELECT id, slug, title, active, created_at, master_course_id
      FROM courses
      WHERE company_id = ${companyId}
      ORDER BY title ASC
    `) as Record<string, unknown>[];
  } catch (colErr) {
    if (isMissingColumn(colErr, "master_course_id")) {
      return (await sql`
        SELECT id, slug, title, active, created_at
        FROM courses
        WHERE company_id = ${companyId}
        ORDER BY title ASC
      `) as Record<string, unknown>[];
    }
    throw colErr;
  }
}

export type CompanyProvisionsOverview = {
  provisions: CourseProvision[];
  migrationRequired?: boolean;
};

/** Schnelle Übersicht ohne Kursinhalte, ohne Master-Join. */
export async function loadCompanyProvisionsOverview(
  companyId: number
): Promise<CompanyProvisionsOverview> {
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return { provisions: [] };
  }
  const sql = getSql();

  try {
    const countRows = await sql`
      SELECT COUNT(*)::int AS n
      FROM company_course_provisions
      WHERE company_id = ${companyId}
    `;
    const provisionCount = Number(countRows[0]?.n ?? 0);

    if (provisionCount === 0) {
      const courseCountRows = await sql`
        SELECT COUNT(*)::int AS n FROM courses WHERE company_id = ${companyId}
      `;
      if (Number(courseCountRows[0]?.n ?? 0) === 0) {
        return { provisions: [] };
      }
      const rows = await loadCoursesOnlyRows(companyId);
      return { provisions: coursesOnlyFallback(companyId, rows) };
    }

    const rows = (await sql`
      SELECT
        p.id,
        p.company_id,
        p.course_id,
        p.master_course_id,
        p.status,
        p.can_edit_content,
        p.can_edit_tests,
        p.can_add_modules,
        p.can_deactivate,
        p.disabled_by_superuser,
        p.assigned_at,
        c.title AS course_title,
        c.slug AS course_slug,
        c.active AS course_active
      FROM company_course_provisions p
      INNER JOIN courses c ON c.id = p.course_id AND c.company_id = p.company_id
      WHERE p.company_id = ${companyId}
      ORDER BY c.title ASC
    `) as Record<string, unknown>[];
    return { provisions: rows.map((r) => mapProvision(r)) };
  } catch (err) {
    if (isMissingRelation(err, "company_course_provisions")) {
      try {
        const courseCountRows = await sql`
          SELECT COUNT(*)::int AS n FROM courses WHERE company_id = ${companyId}
        `;
        if (Number(courseCountRows[0]?.n ?? 0) === 0) {
          return { provisions: [], migrationRequired: true };
        }
        const rows = await loadCoursesOnlyRows(companyId);
        return {
          provisions: coursesOnlyFallback(companyId, rows),
          migrationRequired: true,
        };
      } catch (fallbackErr) {
        console.error("[course-provisions] courses-only fallback:", fallbackErr);
        return { provisions: [], migrationRequired: true };
      }
    }
    console.error("[course-provisions] loadCompanyProvisionsOverview:", err);
    throw err;
  }
}

export async function listCompanyProvisions(companyId: number): Promise<CourseProvision[]> {
  const { provisions } = await loadCompanyProvisionsOverview(companyId);
  return provisions;
}

export type CourseEditPermission =
  | "content"
  | "tests"
  | "add_modules"
  | "deactivate";

export async function assertCourseEditable(
  companyId: number,
  courseId: string,
  permission: CourseEditPermission
): Promise<CourseProvision> {
  const provision = await getCourseProvision(companyId, courseId);
  if (!provision) {
    return {
      id: 0,
      companyId,
      courseId,
      masterCourseId: null,
      masterTitle: null,
      status: "active",
      canEditContent: true,
      canEditTests: true,
      canAddModules: true,
      canDeactivate: true,
      disabledBySuperuser: false,
      assignedAt: new Date().toISOString(),
      courseTitle: "",
      courseSlug: "",
      courseActive: true,
      source: "native",
    };
  }
  if (provision.status === "disabled") {
    throw new Error("COURSE_LOCKED");
  }
  const map: Record<CourseEditPermission, boolean> = {
    content: provision.canEditContent,
    tests: provision.canEditTests,
    add_modules: provision.canAddModules,
    deactivate: provision.canDeactivate,
  };
  if (!map[permission]) {
    throw new Error("COURSE_READ_ONLY");
  }
  return provision;
}

/** Gültigkeit/Bestehensgrenze – auch bei deaktivierten Seminaren, außer Certiano-read-only. */
export async function assertCourseSettingsEditable(
  companyId: number,
  courseId: string
): Promise<void> {
  const sql = getSql();
  const courseRows = await sql`
    SELECT id FROM courses WHERE id = ${courseId} AND company_id = ${companyId} LIMIT 1
  `;
  if (courseRows.length === 0) throw new Error("COURSE_NOT_FOUND");

  const provision = await getCourseProvision(companyId, courseId);
  if (!provision) return;
  if (provision.source === "master" && !provision.canEditContent) {
    throw new Error("COURSE_READ_ONLY");
  }
}

export async function updateProvision(
  companyId: number,
  courseId: string,
  patch: Partial<{
    status: CourseProvisionStatus;
    canEditContent: boolean;
    canEditTests: boolean;
    canAddModules: boolean;
    canDeactivate: boolean;
  }>
): Promise<CourseProvision | undefined> {
  const sql = getSql();
  let existing = await getCourseProvision(companyId, courseId);
  if (!existing) {
    const courseRows = await sql`
      SELECT id FROM courses WHERE id = ${courseId} AND company_id = ${companyId} LIMIT 1
    `;
    if (courseRows.length === 0) return undefined;
    try {
      await ensureProvisionForCourse(companyId, courseId);
      existing = await getCourseProvision(companyId, courseId);
    } catch {
      return undefined;
    }
    if (!existing) return undefined;
  }

  const rawStatus = patch.status ?? existing.status;
  const status = normalizeStatus(String(rawStatus));
  const canEditContent = patch.canEditContent ?? existing.canEditContent;
  const canEditTests = patch.canEditTests ?? existing.canEditTests;
  const canAddModules = patch.canAddModules ?? existing.canAddModules;
  let canDeactivate = patch.canDeactivate ?? existing.canDeactivate;
  const disabledBySuperuser =
    patch.status !== undefined
      ? status === "disabled"
      : existing.disabledBySuperuser;

  if (status === "active" && existing.masterCourseId == null) {
    canDeactivate = true;
  }

  await sql`
    UPDATE company_course_provisions SET
      status = ${status},
      can_edit_content = ${canEditContent},
      can_edit_tests = ${canEditTests},
      can_add_modules = ${canAddModules},
      can_deactivate = ${canDeactivate},
      disabled_by_superuser = ${disabledBySuperuser}
    WHERE company_id = ${companyId} AND course_id = ${courseId}
  `;

  if (patch.status !== undefined) {
    const active = patch.status === "active";
    await sql`
      UPDATE courses SET active = ${active}
      WHERE id = ${courseId} AND company_id = ${companyId}
    `;
  }

  return getCourseProvision(companyId, courseId);
}

export async function assignMasterToCompany(
  masterCourseId: string,
  companyId: number,
  assignedBy: number | null,
  permissions?: Partial<{
    canEditContent: boolean;
    canEditTests: boolean;
    canAddModules: boolean;
    canDeactivate: boolean;
  }>
): Promise<CourseProvision> {
  const master = await getMasterCourseData(masterCourseId);
  if (!master) throw new Error("MASTER_NOT_FOUND");
  const masterMeta = await getMasterCourseMeta(masterCourseId);

  const sql = getSql();
  const metaRows = await sql`
    SELECT slug FROM master_courses WHERE id = ${masterCourseId} LIMIT 1
  `;
  const slug = String(metaRows[0]?.slug ?? masterCourseId.replace(/^master-/, ""));
  const courseId = `${companyId}-${slug}`;
  const cloned = masterContentAsCourseData(master, companyId, slug);

  await sql`
    INSERT INTO courses (
      id, company_id, slug, title, description, version,
      passing_score, validity_months, validity_type, validity_interval_value,
      validity_interval_unit, content_json, active, master_course_id,
      main_category, seminar, instruction_code, instruction_title,
      sort_order, requires_certificate, requires_proof,
      estimated_duration_minutes
    )
    VALUES (
      ${courseId}, ${companyId}, ${slug}, ${cloned.courseName}, NULL,
      ${cloned.version}, ${cloned.passingScore}, ${masterMeta?.validityMonths ?? cloned.certificateValidityMonths},
      ${masterMeta?.validityType ?? "yearly"}, ${masterMeta?.validityIntervalValue ?? null},
      ${masterMeta?.validityIntervalUnit ?? null},
      ${JSON.stringify(cloned)}::jsonb, TRUE, ${masterCourseId},
      ${masterMeta?.mainCategory ?? null}, ${masterMeta?.seminar ?? null},
      ${masterMeta?.instructionCode ?? null}, ${masterMeta?.instructionTitle ?? null},
      ${masterMeta?.sortOrder ?? 0}, ${masterMeta?.requiresCertificate ?? true},
      ${masterMeta?.requiresProof ?? true},
      ${masterMeta?.estimatedDurationMinutes ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      version = EXCLUDED.version,
      passing_score = EXCLUDED.passing_score,
      validity_months = EXCLUDED.validity_months,
      validity_type = EXCLUDED.validity_type,
      validity_interval_value = EXCLUDED.validity_interval_value,
      validity_interval_unit = EXCLUDED.validity_interval_unit,
      content_json = EXCLUDED.content_json,
      master_course_id = EXCLUDED.master_course_id,
      main_category = EXCLUDED.main_category,
      seminar = EXCLUDED.seminar,
      instruction_code = EXCLUDED.instruction_code,
      instruction_title = EXCLUDED.instruction_title,
      sort_order = EXCLUDED.sort_order,
      requires_certificate = EXCLUDED.requires_certificate,
      requires_proof = EXCLUDED.requires_proof,
      estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
      updated_at = NOW(),
      active = TRUE
  `;

  const canEditContent = permissions?.canEditContent ?? false;
  const canEditTests = permissions?.canEditTests ?? false;
  const canAddModules = permissions?.canAddModules ?? false;
  const canDeactivate = permissions?.canDeactivate ?? false;

  await sql`
    INSERT INTO company_course_provisions (
      company_id, course_id, master_course_id, status,
      can_edit_content, can_edit_tests, can_add_modules, can_deactivate,
      assigned_by
    )
    VALUES (
      ${companyId}, ${courseId}, ${masterCourseId}, 'active',
      ${canEditContent}, ${canEditTests}, ${canAddModules}, ${canDeactivate},
      ${assignedBy}
    )
    ON CONFLICT (company_id, course_id) DO UPDATE SET
      master_course_id = EXCLUDED.master_course_id,
      status = 'active',
      can_edit_content = EXCLUDED.can_edit_content,
      can_edit_tests = EXCLUDED.can_edit_tests,
      can_add_modules = EXCLUDED.can_add_modules,
      can_deactivate = EXCLUDED.can_deactivate,
      assigned_by = EXCLUDED.assigned_by
  `;

  const provision = await getCourseProvision(companyId, courseId);
  if (!provision) throw new Error("PROVISION_FAILED");
  return provision;
}

export async function syncMasterToCompanyCourse(
  masterCourseId: string,
  companyId: number,
  courseId: string
): Promise<void> {
  const master = await getMasterCourseData(masterCourseId);
  if (!master) throw new Error("MASTER_NOT_FOUND");
  const existing = await getCourseData(companyId, courseId);
  if (!existing) throw new Error("COURSE_NOT_FOUND");
  const slug = courseId.replace(`${companyId}-`, "");
  const cloned = masterContentAsCourseData(master, companyId, slug);
  await saveCourseData(companyId, cloned);
}

export async function assignMasterToAllCompanies(
  masterCourseId: string,
  assignedBy: number | null,
  permissions?: Parameters<typeof assignMasterToCompany>[3]
): Promise<number> {
  const sql = getSql();
  const companies = await sql`SELECT id FROM companies ORDER BY id`;
  let count = 0;
  for (const row of companies) {
    await assignMasterToCompany(masterCourseId, Number(row.id), assignedBy, permissions);
    count++;
  }
  return count;
}

export async function isCourseAccessibleForEmployee(
  companyId: number,
  courseId: string
): Promise<boolean> {
  const provision = await getCourseProvision(companyId, courseId);
  if (!provision) return true;
  return provision.status === "active" && provision.courseActive;
}

export function provisionPermissions(provision?: CourseProvision) {
  if (!provision) {
    return {
      canEditContent: true,
      canEditTests: true,
      canAddModules: true,
      canDeactivate: true,
      canArchive: true,
      canReactivate: false,
      readOnly: false,
      fromMaster: false,
      disabledBySuperuser: false,
      status: "active" as CourseProvisionStatus,
    };
  }
  const active = provision.status === "active";
  const isNative = provision.source === "native";
  return {
    canEditContent: active && provision.canEditContent,
    canEditTests: active && provision.canEditTests,
    canAddModules: active && provision.canAddModules,
    canDeactivate:
      active && provision.canDeactivate && !provision.disabledBySuperuser,
    canArchive:
      active &&
      !provision.disabledBySuperuser &&
      (isNative || provision.canDeactivate),
    canReactivate: !active && !provision.disabledBySuperuser,
    readOnly: !provision.canEditContent || provision.source === "master",
    fromMaster: provision.source === "master",
    disabledBySuperuser: provision.disabledBySuperuser,
    status: provision.status,
  };
}
