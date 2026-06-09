import {
  assignMasterToCompany,
  loadCompanyProvisionsOverview,
  mapProvision,
  updateProvision,
} from "./course-provisions";
import { getSql, isMissingDbObject, withDbQuery } from "./db";
import type { CourseProvision } from "./types";

export type CourseAssignmentOption = {
  id: string;
  title: string;
  code: string | null;
  active: boolean;
  provisioned: boolean;
  provisionActive: boolean;
};

export type CourseAssignmentTopicGroup = {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
  courses: CourseAssignmentOption[];
};

export type CourseAssignmentOptions = {
  topics: CourseAssignmentTopicGroup[];
  ungroupedCourses: CourseAssignmentOption[];
  selectedMasterCourseIds: string[];
};

export type SlimCompanyProvision = {
  courseId: string;
  courseTitle: string;
  status: string;
  source: "native" | "master";
  masterCourseId: string | null;
  canEditContent: boolean;
  canEditTests: boolean;
  canAddModules: boolean;
};

export type CompanyCoursesPageData = {
  company: { id: number; name: string };
  topics: CourseAssignmentTopicGroup[];
  ungroupedCourses: CourseAssignmentOption[];
  selectedMasterCourseIds: string[];
  provisions: SlimCompanyProvision[];
  migrationRequired?: boolean;
  migrationHint?: string;
};

type MasterRow = {
  id: string;
  title: string;
  active: boolean;
  code: string | null;
  topicIds: number[];
};

function sortCourses(a: CourseAssignmentOption, b: CourseAssignmentOption): number {
  const codeA = a.code ?? "";
  const codeB = b.code ?? "";
  if (codeA && codeB) {
    const byCode = codeA.localeCompare(codeB, "de");
    if (byCode !== 0) return byCode;
  } else if (codeA) return -1;
  else if (codeB) return 1;
  return a.title.localeCompare(b.title, "de");
}

function toSlimProvision(p: CourseProvision): SlimCompanyProvision {
  return {
    courseId: p.courseId,
    courseTitle: p.courseTitle,
    status: p.status,
    source: p.source,
    masterCourseId: p.masterCourseId,
    canEditContent: p.canEditContent,
    canEditTests: p.canEditTests,
    canAddModules: p.canAddModules,
  };
}

function buildAssignmentOptions(
  masters: MasterRow[],
  provisionByMaster: Map<string, { provisioned: boolean; provisionActive: boolean }>,
  topics: Array<{ id: number; name: string; active: boolean; sortOrder: number }>
): CourseAssignmentOptions {
  const masterOptions = new Map<string, CourseAssignmentOption>();
  for (const master of masters) {
    const prov = provisionByMaster.get(master.id);
    masterOptions.set(master.id, {
      id: master.id,
      title: master.title,
      code: master.code,
      active: master.active,
      provisioned: prov?.provisioned ?? false,
      provisionActive: prov?.provisionActive ?? false,
    });
  }

  const assignedToTopic = new Set<string>();
  const topicGroups: CourseAssignmentTopicGroup[] = [];

  for (const topic of topics) {
    const courses: CourseAssignmentOption[] = [];
    for (const master of masters) {
      if (!master.topicIds.includes(topic.id)) continue;
      const opt = masterOptions.get(master.id);
      if (opt) {
        courses.push(opt);
        assignedToTopic.add(master.id);
      }
    }
    if (courses.length === 0) continue;
    courses.sort(sortCourses);
    topicGroups.push({
      id: topic.id,
      name: topic.name,
      active: topic.active,
      sortOrder: topic.sortOrder,
      courses,
    });
  }

  topicGroups.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "de")
  );

  const ungroupedCourses: CourseAssignmentOption[] = [];
  for (const master of masters) {
    if (assignedToTopic.has(master.id)) continue;
    const opt = masterOptions.get(master.id);
    if (opt) ungroupedCourses.push(opt);
  }
  ungroupedCourses.sort(sortCourses);

  const selectedMasterCourseIds = [...provisionByMaster.entries()]
    .filter(([, v]) => v.provisionActive)
    .map(([id]) => id);

  return { topics: topicGroups, ungroupedCourses, selectedMasterCourseIds };
}

async function loadProvisionsForCompany(
  companyId: number
): Promise<{ provisions: CourseProvision[]; migrationRequired: boolean }> {
  const sql = getSql();
  try {
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
        c.active AS course_active,
        c.master_course_id AS course_master_course_id
      FROM company_course_provisions p
      INNER JOIN courses c ON c.id = p.course_id AND c.company_id = p.company_id
      WHERE p.company_id = ${companyId}
      ORDER BY c.title ASC
    `) as Record<string, unknown>[];
    return { provisions: rows.map((r) => mapProvision(r)), migrationRequired: false };
  } catch (err) {
    if (!isMissingDbObject(err, "company_course_provisions")) throw err;
    const courseRows = (await sql`
      SELECT id, slug, title, active, created_at, master_course_id
      FROM courses
      WHERE company_id = ${companyId}
      ORDER BY title ASC
    `) as Record<string, unknown>[];
    const provisions = courseRows.map((r) =>
      mapProvision({
        id: 0,
        company_id: companyId,
        course_id: r.id,
        master_course_id: r.master_course_id,
        status: r.active ? "active" : "disabled",
        can_edit_content: true,
        can_edit_tests: true,
        can_add_modules: true,
        can_deactivate: true,
        disabled_by_superuser: false,
        assigned_at: r.created_at,
        course_title: r.title,
        course_slug: r.slug,
        course_active: r.active,
        course_master_course_id: r.master_course_id,
      })
    );
    return { provisions, migrationRequired: true };
  }
}

async function loadMasterRowsWithTopics(): Promise<MasterRow[]> {
  const sql = getSql();
  const masterRows = (await sql`
    SELECT id, title, status, instruction_code, topic_id, sort_order
    FROM master_courses
    ORDER BY sort_order ASC, title ASC
  `) as Record<string, unknown>[];

  const topicIdsByMaster = new Map<string, Set<number>>();

  for (const row of masterRows) {
    const id = String(row.id);
    const legacy =
      row.topic_id != null ? Number(row.topic_id) : null;
    const set = new Set<number>();
    if (legacy != null && Number.isFinite(legacy) && legacy > 0) {
      set.add(legacy);
    }
    topicIdsByMaster.set(id, set);
  }

  try {
    const assignmentRows = (await sql`
      SELECT master_course_id, topic_id
      FROM master_course_topics
    `) as Record<string, unknown>[];
    for (const row of assignmentRows) {
      const masterId = String(row.master_course_id);
      const topicId = Number(row.topic_id);
      if (!topicIdsByMaster.has(masterId)) {
        topicIdsByMaster.set(masterId, new Set());
      }
      if (Number.isFinite(topicId) && topicId > 0) {
        topicIdsByMaster.get(masterId)!.add(topicId);
      }
    }
  } catch (err) {
    if (!isMissingDbObject(err, "master_course_topics")) throw err;
  }

  return masterRows.map((row) => {
    const id = String(row.id);
    return {
      id,
      title: String(row.title),
      active: String(row.status ?? "active") !== "disabled",
      code: row.instruction_code != null ? String(row.instruction_code) : null,
      topicIds: [...(topicIdsByMaster.get(id) ?? [])],
    };
  });
}

/** Ein DB-Durchlauf: Firma, Zuweisungsoptionen und schlanke Provisionsliste. */
export async function loadCompanyCoursesPageData(
  companyId: number
): Promise<CompanyCoursesPageData> {
  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error("INVALID_COMPANY_ID");
  }

  return withDbQuery(async () => {
    const sql = getSql();

    const companyRows = await sql`
      SELECT id, name FROM companies WHERE id = ${companyId} LIMIT 1
    `;
    if (companyRows.length === 0) {
      throw new Error("NOT_FOUND");
    }

    const { provisions, migrationRequired } =
      await loadProvisionsForCompany(companyId);

    const provisionByMaster = new Map<
      string,
      { provisioned: boolean; provisionActive: boolean }
    >();
    for (const p of provisions) {
      if (!p.masterCourseId) continue;
      provisionByMaster.set(p.masterCourseId, {
        provisioned: true,
        provisionActive: p.status === "active",
      });
    }

    const masters = await loadMasterRowsWithTopics();
    const topicRows = (await sql`
      SELECT id, name, active, sort_order
      FROM course_topics
      WHERE company_id IS NULL
      ORDER BY sort_order ASC, name ASC
    `) as Record<string, unknown>[];

    const topics = topicRows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      active: Boolean(row.active),
      sortOrder: Number(row.sort_order ?? 0),
    }));

    const assignment = buildAssignmentOptions(masters, provisionByMaster, topics);

    return {
      company: {
        id: Number(companyRows[0].id),
        name: String(companyRows[0].name),
      },
      ...assignment,
      provisions: provisions.map(toSlimProvision),
      ...(migrationRequired
        ? {
            migrationRequired: true,
            migrationHint: "Migration fehlt: npm run db:migrate",
          }
        : {}),
    };
  }, 12000);
}

/** Nur Zuweisungsoptionen – nutzt dieselbe schlanke Logik. */
export async function loadCourseAssignmentOptions(
  companyId: number
): Promise<CourseAssignmentOptions> {
  const data = await loadCompanyCoursesPageData(companyId);
  return {
    topics: data.topics,
    ungroupedCourses: data.ungroupedCourses,
    selectedMasterCourseIds: data.selectedMasterCourseIds,
  };
}

export type SyncMasterProvisionsResult = {
  assigned: number;
  reactivated: number;
  deactivated: number;
};

/** Eindeutige Master-IDs provisionieren; entfernte aktive Kurse deaktivieren. */
export async function syncCompanyMasterCourseProvisions(
  companyId: number,
  masterCourseIds: string[],
  assignedBy: number | null
): Promise<SyncMasterProvisionsResult> {
  const targetSet = new Set(
    masterCourseIds.map(String).filter((id) => id.length > 0)
  );

  const { provisions } = await loadCompanyProvisionsOverview(companyId);
  const currentByMaster = new Map<
    string,
    { courseId: string; status: string }
  >();
  for (const p of provisions) {
    if (p.masterCourseId) {
      currentByMaster.set(p.masterCourseId, {
        courseId: p.courseId,
        status: p.status,
      });
    }
  }

  let assigned = 0;
  let reactivated = 0;
  let deactivated = 0;

  for (const masterId of targetSet) {
    const existing = currentByMaster.get(masterId);
    if (!existing) {
      await assignMasterToCompany(masterId, companyId, assignedBy);
      assigned++;
    } else if (existing.status !== "active") {
      await updateProvision(companyId, existing.courseId, { status: "active" });
      reactivated++;
    }
  }

  for (const [masterId, existing] of currentByMaster) {
    if (!targetSet.has(masterId) && existing.status === "active") {
      await updateProvision(companyId, existing.courseId, { status: "disabled" });
      deactivated++;
    }
  }

  return { assigned, reactivated, deactivated };
}
