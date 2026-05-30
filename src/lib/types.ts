export type UserRole = "admin" | "employee";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string | null;
  role: UserRole;
  location: string | null;
  active: number;
  createdAt: string;
}

export type ContentBlockType =
  | "text"
  | "info"
  | "merksatz"
  | "hinweis"
  | "praxis"
  | "dialog"
  | "summary"
  | "quiz"
  | "fehler";

export interface DialogLine {
  speaker: string;
  text: string;
}

export interface ContentBlock {
  type: ContentBlockType;
  title?: string;
  body?: string;
  items?: string[];
  lines?: DialogLine[];
  solution?: string;
  question?: string;
  answers?: string[];
  correct?: number;
  explanation?: string;
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  blocks?: ContentBlock[];
}

export interface CourseModule {
  id: number;
  title: string;
  duration: number;
  lessons: Lesson[];
}

export interface ExamQuestion {
  id: number;
  moduleId: number;
  question: string;
  type: "single" | "multiple" | "boolean";
  answers?: string[];
  correct: number | number[] | boolean;
}

export interface CourseData {
  courseId: string;
  courseName: string;
  version: string;
  durationMinutes: number;
  maxDurationMinutes: number;
  recommendedMinutes: string;
  passingScore: number;
  minCorrectAnswers: number;
  totalQuestions: number;
  certificateValidityMonths: number;
  certificateTitle: string;
  examQuestionsPerTest?: number;
  modules: CourseModule[];
  exam: ExamQuestion[];
}

export type TrainingStatus = "green" | "yellow" | "red";

export interface Certificate {
  id: number;
  certificateNumber: string;
  userId: number;
  courseId: string;
  issuedAt: string;
  validUntil: string;
  score: number;
  verificationToken: string;
  revoked: number;
}

export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export type FeedbackCategory = "frage" | "anregung";

export interface FeedbackEntry {
  id: number;
  userId: number;
  category: FeedbackCategory;
  message: string;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  location?: string | null;
}

export interface TrainingAttempt {
  id: number;
  userId: number;
  courseId: string;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  passed: number | null;
  answersJson: string | null;
  moduleProgressJson: string;
  lessonProgressJson: string | null;
  examQuestionIdsJson: string | null;
}
