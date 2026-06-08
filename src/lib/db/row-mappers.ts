import type { Certificate, FeedbackEntry, TrainingAttempt, User } from "../types";

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    companyId: row.company_id != null ? Number(row.company_id) : null,
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    email: String(row.email),
    birthDate: row.birth_date
      ? new Date(String(row.birth_date)).toISOString().slice(0, 10)
      : null,
    birthPlace: row.birth_place != null ? String(row.birth_place) : null,
    placeOfResidence:
      row.place_of_residence != null ? String(row.place_of_residence) : null,
    street: row.street != null ? String(row.street) : null,
    houseNumber: row.house_number != null ? String(row.house_number) : null,
    postalCode: row.postal_code != null ? String(row.postal_code) : null,
    city: row.city != null ? String(row.city) : null,
    role: row.role as User["role"],
    location: row.location != null ? String(row.location) : null,
    employeeCategoryId:
      row.employee_category_id != null ? Number(row.employee_category_id) : null,
    joinedCompanyAt: row.joined_company_at
      ? new Date(String(row.joined_company_at)).toISOString().slice(0, 10)
      : null,
    leftCompanyAt: row.left_company_at
      ? new Date(String(row.left_company_at)).toISOString().slice(0, 10)
      : null,
    active: row.active ? 1 : 0,
    mustChangePassword: row.must_change_password ? 1 : 0,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export function mapUserWithPassword(
  row: Record<string, unknown>
): User & { passwordHash: string } {
  return {
    ...mapUser(row),
    passwordHash: String(row.password_hash),
  };
}

export function mapCertificate(row: Record<string, unknown>): Certificate {
  return {
    id: Number(row.id),
    certificateNumber: String(row.certificate_number),
    userId: Number(row.user_id),
    companyId: row.company_id != null ? Number(row.company_id) : null,
    courseId: String(row.course_id),
    issuedAt: new Date(String(row.issued_at)).toISOString(),
    validUntil: row.valid_until
      ? new Date(String(row.valid_until)).toISOString()
      : null,
    score: Number(row.score),
    verificationToken: String(row.verification_token),
    revoked: row.revoked ? 1 : 0,
    templateRevisionId:
      row.template_revision_id != null ? Number(row.template_revision_id) : null,
  };
}

function jsonCol(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function mapTrainingAttempt(row: Record<string, unknown>): TrainingAttempt {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    companyId: row.company_id != null ? Number(row.company_id) : null,
    courseId: String(row.course_id),
    startedAt: new Date(String(row.started_at)).toISOString(),
    completedAt: row.completed_at
      ? new Date(String(row.completed_at)).toISOString()
      : null,
    score: row.score != null ? Number(row.score) : null,
    passed: row.passed == null ? null : row.passed ? 1 : 0,
    answersJson: jsonCol(row.answers_json),
    moduleProgressJson: jsonCol(row.module_progress_json) ?? "[]",
    lessonProgressJson: jsonCol(row.lesson_progress_json),
    examQuestionIdsJson: jsonCol(row.exam_question_ids_json),
  };
}

export function mapFeedback(row: Record<string, unknown>): FeedbackEntry {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    companyId: row.company_id != null ? Number(row.company_id) : null,
    category: row.category as FeedbackEntry["category"],
    message: String(row.message),
    createdAt: new Date(String(row.created_at)).toISOString(),
    firstName: row.first_name != null ? String(row.first_name) : undefined,
    lastName: row.last_name != null ? String(row.last_name) : undefined,
    email: row.email != null ? String(row.email) : undefined,
    location: row.location != null ? String(row.location) : undefined,
  };
}
