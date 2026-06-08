import { MAIN_CATEGORIES } from "./course-hierarchy";
import type { ValidityType } from "./course-validity";

export type SafetyInstructionSeed = {
  code: string;
  title: string;
  seminar: string;
  validityType: ValidityType;
  sortOrder: number;
};

export function formatInstructionFullTitle(code: string, title: string): string {
  const c = code.trim();
  const t = title.trim();
  if (!c) return t;
  if (!t) return c;
  if (t.toUpperCase().startsWith(c.toUpperCase())) return t;
  return `${c} ${t}`;
}

export function safetyInstructionSlug(code: string): string {
  return `bav-${code.trim().toLowerCase()}`;
}

export function safetyMasterCourseId(code: string): string {
  return `master-${safetyInstructionSlug(code)}`;
}

function emptyContentJson(masterId: string, fullTitle: string, validityMonths: number) {
  return {
    courseId: masterId,
    courseName: fullTitle,
    version: "1.0",
    durationMinutes: 0,
    maxDurationMinutes: 60,
    recommendedMinutes: "—",
    passingScore: 80,
    minCorrectAnswers: 12,
    totalQuestions: 15,
    certificateValidityMonths: validityMonths,
    certificateTitle: `Nachweis ${fullTitle}`,
    examQuestionsPerTest: 15,
    modules: [],
    exam: [],
  };
}

export function safetyInstructionContentTemplate(seed: SafetyInstructionSeed) {
  const masterId = safetyMasterCourseId(seed.code);
  const fullTitle = formatInstructionFullTitle(seed.code, seed.title);
  const validityMonths = seed.validityType === "half_yearly" ? 6 : 12;
  return emptyContentJson(masterId, fullTitle, validityMonths);
}

/** BAV-Unterweisungen Sicherheitskonzept – gruppiert nach Seminar (Ebene 2). */
export const SAFETY_INSTRUCTION_CATALOG: SafetyInstructionSeed[] = [
  {
    code: "N7",
    title: "Verhalten bei einem Überfall",
    seminar: "Überfallprävention",
    validityType: "half_yearly",
    sortOrder: 110,
  },
  {
    code: "N8",
    title: "Fahndungsblatt Raubüberfall",
    seminar: "Überfallprävention",
    validityType: "yearly",
    sortOrder: 120,
  },
  {
    code: "N11",
    title: "Videoüberwachung",
    seminar: "Überfallprävention",
    validityType: "yearly",
    sortOrder: 130,
  },
  {
    code: "N9",
    title: "Umgang mit Bargeldbeständen",
    seminar: "Bargeldsicherheit",
    validityType: "half_yearly",
    sortOrder: 210,
  },
  {
    code: "N10",
    title: "Geldtransporte",
    seminar: "Bargeldsicherheit",
    validityType: "yearly",
    sortOrder: 220,
  },
  {
    code: "N19",
    title: "Verhalten im Brandfall und Notfall",
    seminar: "Brandschutz & Notfallmanagement",
    validityType: "yearly",
    sortOrder: 310,
  },
  {
    code: "N21",
    title: "Brandbekämpfung",
    seminar: "Brandschutz & Notfallmanagement",
    validityType: "yearly",
    sortOrder: 320,
  },
  {
    code: "N22",
    title: "Feuerlöscher",
    seminar: "Brandschutz & Notfallmanagement",
    validityType: "yearly",
    sortOrder: 330,
  },
  {
    code: "N24",
    title: "Erste Hilfe",
    seminar: "Erste Hilfe",
    validityType: "yearly",
    sortOrder: 410,
  },
  {
    code: "N29",
    title: "Stehleitern",
    seminar: "Arbeitsschutz",
    validityType: "yearly",
    sortOrder: 510,
  },
  {
    code: "N38",
    title: "Hautschutz, Hautreinigung und Hautpflege",
    seminar: "Arbeitsschutz",
    validityType: "yearly",
    sortOrder: 520,
  },
  {
    code: "N39",
    title: "Ätzende und reizende Reinigungsmittel",
    seminar: "Arbeitsschutz",
    validityType: "yearly",
    sortOrder: 530,
  },
  {
    code: "N30",
    title: "Drogenproblematik",
    seminar: "Sucht- und Drogenprävention",
    validityType: "yearly",
    sortOrder: 610,
  },
  {
    code: "N37",
    title: "Allergeninformation",
    seminar: "Hygiene & Lebensmittel",
    validityType: "yearly",
    sortOrder: 710,
  },
];

export const SAFETY_MAIN_CATEGORY = MAIN_CATEGORIES.SAFETY;
