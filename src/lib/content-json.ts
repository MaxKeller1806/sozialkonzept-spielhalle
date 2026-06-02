import type { CourseData } from "./types";

/** Parst content_json – auch doppelt kodierte JSON-Strings in jsonb. */
export function parseContentJson(raw: unknown): CourseData | null {
  if (raw == null) return null;

  let value: unknown = raw;

  for (let depth = 0; depth < 3; depth++) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
      continue;
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if (Array.isArray(obj.modules) || Array.isArray(obj.exam)) {
        break;
      }
      const keys = Object.keys(obj);
      if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
        const reconstructed = keys
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => String(obj[k]))
          .join("");
        try {
          value = JSON.parse(reconstructed);
          continue;
        } catch {
          return null;
        }
      }
    }
    break;
  }

  if (typeof value !== "object" || value === null) return null;
  return value as CourseData;
}

export function isEmptyCourseContent(content: CourseData | null | undefined): boolean {
  if (!content) return true;
  const modules = Array.isArray(content.modules) ? content.modules : [];
  const lessons = modules.reduce(
    (sum, mod) => sum + (Array.isArray(mod.lessons) ? mod.lessons.length : 0),
    0
  );
  const exam = Array.isArray(content.exam) ? content.exam.length : 0;
  return lessons === 0 && exam === 0;
}

export function courseContentScore(content: CourseData | null | undefined): number {
  if (!content) return 0;
  const modules = Array.isArray(content.modules) ? content.modules : [];
  const lessons = modules.reduce(
    (sum, mod) => sum + (Array.isArray(mod.lessons) ? mod.lessons.length : 0),
    0
  );
  const exam = Array.isArray(content.exam) ? content.exam.length : 0;
  return modules.length * 10000 + lessons * 100 + exam;
}
