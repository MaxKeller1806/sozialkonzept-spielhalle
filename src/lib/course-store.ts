import fs from "fs";
import path from "path";
import { migrateCourse } from "./course-migrate";
import type { CourseData, CourseModule, ExamQuestion, Lesson } from "./types";

const COURSE_PATH = path.join(process.cwd(), "data/course.json");

let cache: CourseData | null = null;

function readFile(): CourseData {
  const raw = fs.readFileSync(COURSE_PATH, "utf-8");
  return migrateCourse(JSON.parse(raw) as CourseData & { modules: (CourseModule & { content?: string })[] });
}

function normalize(course: CourseData): CourseData {
  const migrated = migrateCourse(course as CourseData & { modules: (CourseModule & { content?: string })[] });
  const durationMinutes = migrated.modules.reduce((s, m) => s + (m.duration || 0), 0);
  const examPerTest = migrated.examQuestionsPerTest ?? 15;
  const poolSize = migrated.exam.length;
  const minCorrectAnswers = Math.ceil(
    (examPerTest * (migrated.passingScore ?? 80)) / 100
  );

  return {
    ...migrated,
    durationMinutes,
    totalQuestions: examPerTest,
    examQuestionsPerTest: examPerTest,
    minCorrectAnswers,
    examPoolSize: poolSize,
  } as CourseData & { examPoolSize?: number };
}

function writeFile(course: CourseData) {
  const normalized = normalize(course);
  fs.writeFileSync(COURSE_PATH, JSON.stringify(normalized, null, 2) + "\n", "utf-8");
  cache = normalized;
  return normalized;
}

export function getCourseData(): CourseData {
  if (!cache) {
    cache = normalize(readFile());
  }
  return cache;
}

export function saveCourseData(course: CourseData): CourseData {
  return writeFile(course);
}

export function updateCourseSettings(settings: {
  passingScore?: number;
}): CourseData {
  const course = getCourseData();
  if (settings.passingScore !== undefined) {
    const score = Math.min(100, Math.max(50, Math.round(settings.passingScore)));
    course.passingScore = score;
  }
  return saveCourseData(course);
}

export function getModule(id: number): CourseModule | undefined {
  return getCourseData().modules.find((m) => m.id === id);
}

export function saveModule(module: CourseModule): CourseModule {
  const course = getCourseData();
  const idx = course.modules.findIndex((m) => m.id === module.id);
  if (idx >= 0) {
    course.modules[idx] = module;
  } else {
    course.modules.push(module);
    course.modules.sort((a, b) => a.id - b.id);
  }
  saveCourseData(course);
  return module;
}

export function deleteModule(id: number): boolean {
  const course = getCourseData();
  const before = course.modules.length;
  course.modules = course.modules.filter((m) => m.id !== id);
  if (course.modules.length === before) return false;
  saveCourseData(course);
  return true;
}

export function nextModuleId(): number {
  const ids = getCourseData().modules.map((m) => m.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export function getLesson(
  moduleId: number,
  lessonId: number
): Lesson | undefined {
  const mod = getModule(moduleId);
  return mod?.lessons.find((l) => l.id === lessonId);
}

export function nextLessonId(moduleId: number): number {
  const mod = getModule(moduleId);
  if (!mod?.lessons.length) return 1;
  return Math.max(...mod.lessons.map((l) => l.id)) + 1;
}

export function saveLesson(moduleId: number, lesson: Lesson): Lesson {
  const course = getCourseData();
  const modIdx = course.modules.findIndex((m) => m.id === moduleId);
  if (modIdx < 0) throw new Error("MODULE_NOT_FOUND");

  const mod = course.modules[modIdx];
  const lessonIdx = mod.lessons.findIndex((l) => l.id === lesson.id);
  if (lessonIdx >= 0) {
    mod.lessons[lessonIdx] = lesson;
  } else {
    mod.lessons.push(lesson);
    mod.lessons.sort((a, b) => a.id - b.id);
  }

  saveCourseData(course);
  return lesson;
}

export function deleteLesson(moduleId: number, lessonId: number): boolean {
  const course = getCourseData();
  const mod = course.modules.find((m) => m.id === moduleId);
  if (!mod) return false;

  const before = mod.lessons.length;
  mod.lessons = mod.lessons.filter((l) => l.id !== lessonId);
  if (mod.lessons.length === before) return false;

  saveCourseData(course);
  return true;
}

export function getExamQuestion(id: number): ExamQuestion | undefined {
  return getCourseData().exam.find((q) => q.id === id);
}

export function saveExamQuestion(question: ExamQuestion): ExamQuestion {
  const course = getCourseData();
  const idx = course.exam.findIndex((q) => q.id === question.id);
  if (idx >= 0) {
    course.exam[idx] = question;
  } else {
    course.exam.push(question);
    course.exam.sort((a, b) => a.id - b.id);
  }
  saveCourseData(course);
  return question;
}

export function deleteExamQuestion(id: number): boolean {
  const course = getCourseData();
  const before = course.exam.length;
  course.exam = course.exam.filter((q) => q.id !== id);
  if (course.exam.length === before) return false;
  saveCourseData(course);
  return true;
}

export function nextExamId(): number {
  const ids = getCourseData().exam.map((q) => q.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export function invalidateCourseCache() {
  cache = null;
}

export function reloadCourseFromDisk(): CourseData {
  cache = null;
  return getCourseData();
}
