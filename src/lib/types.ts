import type { ValidityType, ValidityIntervalUnit } from "./course-validity";

export type UserRole = "superuser" | "admin" | "employee";

export type AdminScope = "company" | "location";

export type CompanyStatus = "pending" | "active" | "disabled" | "expired";
export type LicenseStatus = "unlicensed" | "active" | "expired" | "disabled";

export interface CompanyBranding {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  textSecondaryColor: string;
  menuTextColor: string;
  buttonTextColor: string;
  logoUrl: string | null;
  loginBackgroundUrl: string | null;
}

/** Signaturangaben für ausgestellte Zertifikate/Nachweise – je Firma. */
export interface CompanyDocumentSignature {
  responsiblePerson: string | null;
  position: string | null;
  customText: string | null;
}

export interface CompanyLocation {
  id: number;
  companyId: number;
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
}

export interface Company {
  id: number;
  slug: string;
  companyCode: string;
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
  documentSignature: CompanyDocumentSignature;
  status: CompanyStatus;
  licenseStatus: LicenseStatus;
  licenseExpiresAt: string | null;
  licenseActivatedAt: string | null;
  industryId: number | null;
  businessTypeId: number | null;
  industryName?: string | null;
  businessTypeName?: string | null;
  allowAdminValidityOverride: boolean;
  allowAdminPassingScoreOverride: boolean;
  /** Ansprechpartner (Name). */
  contactPerson: string | null;
  /** Vorbereitet für spätere Nutzung. */
  contactPersonEmail: string | null;
  /** Vorbereitet für spätere Nutzung. */
  contactPersonPhone: string | null;
  createdAt: string;
}

export interface Industry {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  businessTypeCount: number;
  companyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessType {
  id: number;
  industryId: number;
  industryName: string | null;
  industrySlug: string | null;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  companyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResponsibilityType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyResponsibilityAssignment {
  id: number | null;
  companyId: number;
  responsibilityTypeId: number;
  responsibilityTypeName: string;
  responsibilityTypeSlug: string;
  responsibilityTypeDescription: string | null;
  sortOrder: number;
  userId: number | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
  assignedAt: string | null;
}

export interface EmployeeResponsibility {
  courseId: string;
  name: string;
  instructionCode: string | null;
  assignedAt: string;
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
  industryId?: number | null;
  businessTypeId?: number | null;
  industryName?: string | null;
  businessTypeName?: string | null;
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
  /** Freitext-Standort (Legacy) */
  location: string | null;
  locationId: number | null;
  adminScope: AdminScope;
  adminLocationId: number | null;
  active: number;
  mustChangePassword: number;
  employeeCategoryId: number | null;
  joinedCompanyAt: string | null;
  leftCompanyAt: string | null;
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
  explanation?: string;
  sourceType?: QuestionSourceType;
  poolQuestionType?: PoolQuestionType;
  difficulty?: string;
  active?: boolean;
  sortOrder?: number;
  createdAt?: string;
}

export type QuestionSourceType = "master" | "company";

export type PoolQuestionType = "single" | "multiple" | "boolean" | "situation";

export interface QuestionPoolItem {
  id: number;
  courseId: string;
  companyId: number | null;
  sourceType: QuestionSourceType;
  question: string;
  questionType: PoolQuestionType;
  answerA: string | null;
  answerB: string | null;
  answerC: string | null;
  answerD: string | null;
  correctAnswer: string;
  explanation: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  moduleId: number | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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
  /** Gesamtgröße des Prüfungs-Fragenpools (aktive Fragen). */
  examPoolSize?: number;
  modules: CourseModule[];
  exam: ExamQuestion[];
}

export type CourseTopicRef = {
  id: number;
  name: string;
  sortOrder: number;
};

export interface CourseMeta {
  id: string;
  companyId: number;
  slug: string;
  /** Vollständiger Anzeigetitel (z. B. „N7 Verhalten bei einem Überfall“). */
  title: string;
  description: string | null;
  version: string;
  passingScore: number;
  validityMonths: number;
  validityType: ValidityType;
  validityIntervalValue: number | null;
  validityIntervalUnit: ValidityIntervalUnit | null;
  active: boolean;
  masterCourseId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Ebene 1 – Hauptkategorie, z. B. „Sicherheitskonzept“. */
  mainCategory: string | null;
  /** Ebene 2 – Seminar, z. B. „Überfallprävention“. */
  seminar: string | null;
  /** Persistierter BAV-Code (Ebene 3), z. B. „N7“. */
  instructionCode: string | null;
  /** Kurztitel ohne Code. */
  instructionTitle: string | null;
  sortOrder: number;
  requiresCertificate: boolean;
  requiresProof: boolean;
  /** Geschätzte Bearbeitungsdauer in Minuten. */
  estimatedDurationMinutes: number | null;
  /** @deprecated Erstes Hauptthema – nutze topicIds/topics. */
  topicId: number | null;
  topicName?: string | null;
  topicSortOrder?: number;
  topicIds: number[];
  topics: CourseTopicRef[];
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
  validityType: ValidityType;
  validityIntervalValue: number | null;
  validityIntervalUnit: ValidityIntervalUnit | null;
  status: MasterCourseStatus;
  createdAt: string;
  updatedAt: string;
  mainCategory: string | null;
  seminar: string | null;
  instructionCode: string | null;
  instructionTitle: string | null;
  sortOrder: number;
  requiresCertificate: boolean;
  requiresProof: boolean;
  estimatedDurationMinutes: number | null;
  topicId: number | null;
  topicName?: string | null;
  topicSortOrder?: number;
  topicIds: number[];
  topics: CourseTopicRef[];
}

export interface EmployeeCategory {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  active: boolean;
  /** Reserviert für spätere Superuser-Standardvorlagen. */
  masterTemplateId: number | null;
  courseCount: number;
  totalDurationMinutes: number;
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
  validUntil: string | null;
  score: number;
  verificationToken: string;
  revoked: number;
  templateRevisionId: number | null;
}

export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: number | null;
  mustChangePassword: boolean;
  adminScope?: AdminScope;
  adminLocationId?: number | null;
  locationId?: number | null;
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
