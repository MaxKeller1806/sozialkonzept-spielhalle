export type UserRole = "superuser" | "admin" | "employee";

export type CompanyStatus = "pending" | "active" | "disabled" | "expired";
export type LicenseStatus = "unlicensed" | "active" | "expired" | "disabled";

export interface CompanyBranding {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
  logoUrl: string | null;
  loginBackgroundUrl: string | null;
}

export interface Company {
  id: number;
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
  branding: CompanyBranding;
  status: CompanyStatus;
  licenseStatus: LicenseStatus;
  licenseExpiresAt: string | null;
  licenseActivatedAt: string | null;
  createdAt: string;
}

export interface CompanySummary {
  id: number;
  name: string;
  status: CompanyStatus;
  licenseStatus: LicenseStatus;
  licenseExpiresAt: string | null;
  createdAt: string;
  employeeCount: number;
  adminCount: number;
  adminName: string | null;
}

export interface User {
  id: number;
  companyId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string | null;
  birthPlace: string | null;
  /** @deprecated Sync mit city – nur noch für Abwärtskompatibilität */
  placeOfResidence: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  role: UserRole;
  location: string | null;
  active: number;
  mustChangePassword: number;
  createdAt: string;
}

export type ContentBlockType =
  | "heading"
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

export interface CourseMeta {
  id: string;
  companyId: number;
  slug: string;
  title: string;
  description: string | null;
  version: string;
  passingScore: number;
  validityMonths: number;
  active: boolean;
  masterCourseId: string | null;
  createdAt: string;
}

export type MasterCourseStatus = "draft" | "published" | "disabled";
export type CourseProvisionStatus = "active" | "locked" | "disabled";

export interface MasterCourseMeta {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  version: string;
  passingScore: number;
  validityMonths: number;
  status: MasterCourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseProvision {
  id: number;
  companyId: number;
  courseId: string;
  masterCourseId: string | null;
  masterTitle: string | null;
  status: CourseProvisionStatus;
  canEditContent: boolean;
  canEditTests: boolean;
  canAddModules: boolean;
  canDeactivate: boolean;
  disabledBySuperuser: boolean;
  assignedAt: string;
  courseTitle: string;
  courseSlug: string;
  courseActive: boolean;
  source: "native" | "master";
}

export interface CompanyUserSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export type TrainingStatus = "green" | "yellow" | "red";

export interface Certificate {
  id: number;
  certificateNumber: string;
  userId: number;
  companyId: number | null;
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
  companyId: number | null;
  mustChangePassword: boolean;
}

export type FeedbackCategory = "frage" | "anregung";

export interface FeedbackEntry {
  id: number;
  userId: number;
  companyId: number | null;
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
  companyId: number | null;
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

export interface PrivacyPolicyVersion {
  id: number;
  version: string;
  title: string;
  content: string;
  effectiveFrom: string;
  active: boolean;
  createdAt: string;
}

export interface PrivacyAcceptance {
  id: number;
  userId: number;
  companyId: number;
  versionId: number;
  acceptedAt: string;
}

export interface AuthState {
  mustChangePassword: boolean;
  privacyAccepted: boolean;
  companyActive: boolean;
  licenseActive: boolean;
  redirect?: string;
}
