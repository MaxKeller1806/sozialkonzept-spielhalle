export {
  getUserEvidenceSummary,
  getUsersPermanentDeleteAllowed,
  type UserDeletePreview,
  type UserDeleteCertificatePreview,
  DELETE_EVIDENCE_WARNING,
} from "./user-delete";

/** @deprecated Use ConfirmDeleteRequiredError from user-delete */
export async function assertUserCanBePermanentlyDeleted(_userId: number): Promise<void> {
  // Legacy no-op: permanent delete now requires explicit confirmation instead of blocking.
}
