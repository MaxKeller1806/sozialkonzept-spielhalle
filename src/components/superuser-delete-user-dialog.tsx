"use client";

import { Button } from "@/components/ui";

export interface UserDeleteCertificatePreview {
  id: number;
  certificateNumber: string;
  courseTitle: string;
  issuedAt: string;
  validUntil: string | null;
  pdfUrl: string;
}

export interface UserDeletePreview {
  userId: number;
  hasEvidenceData: boolean;
  counts: {
    startedTrainings: number;
    examResults: number;
    certificates: number;
    privacyAcceptances: number;
    feedback: number;
  };
  certificates: UserDeleteCertificatePreview[];
  warningMessage: string | null;
}

interface SuperuserDeleteUserDialogProps {
  open: boolean;
  userName: string;
  userActive: boolean;
  preview: UserDeletePreview | null;
  loading: boolean;
  error: string;
  deleting: boolean;
  archiving: boolean;
  onClose: () => void;
  onArchive: () => void;
  onConfirmDelete: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Unbegrenzt gültig";
  return new Date(iso).toLocaleDateString("de-DE");
}

export function SuperuserDeleteUserDialog({
  open,
  userName,
  userActive,
  preview,
  loading,
  error,
  deleting,
  archiving,
  onClose,
  onArchive,
  onConfirmDelete,
}: SuperuserDeleteUserDialogProps) {
  if (!open) return null;

  const busy = loading || deleting || archiving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-user-dialog-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 id="delete-user-dialog-title" className="text-lg font-bold text-slate-900">
          Benutzer endgültig löschen
        </h3>
        <p className="mt-1 text-sm text-slate-600">{userName}</p>

        {loading && (
          <p className="mt-4 text-sm text-slate-600">Prüfe Nachweisdaten…</p>
        )}

        {error && !loading && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && preview && (
          <div className="mt-4 space-y-4">
            {preview.hasEvidenceData ? (
              <>
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {preview.warningMessage}
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-slate-500">Begonnene Schulungen</dt>
                    <dd className="font-semibold text-slate-900">
                      {preview.counts.startedTrainings}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Prüfungsergebnisse</dt>
                    <dd className="font-semibold text-slate-900">
                      {preview.counts.examResults}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Zertifikate</dt>
                    <dd className="font-semibold text-slate-900">
                      {preview.counts.certificates}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Datenschutzbestätigungen</dt>
                    <dd className="font-semibold text-slate-900">
                      {preview.counts.privacyAcceptances}
                    </dd>
                  </div>
                </dl>
                {preview.certificates.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-800">
                      Zertifikate herunterladen
                    </h4>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="border-b bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-3">Zertifikatsnummer</th>
                            <th className="p-3">Kurs</th>
                            <th className="p-3">Ausgestellt</th>
                            <th className="p-3">Gültig bis</th>
                            <th className="p-3">PDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.certificates.map((cert) => (
                            <tr key={cert.id} className="border-b last:border-0">
                              <td className="p-3">{cert.certificateNumber}</td>
                              <td className="p-3">{cert.courseTitle}</td>
                              <td className="p-3">{formatDate(cert.issuedAt)}</td>
                              <td className="p-3">{formatDate(cert.validUntil)}</td>
                              <td className="p-3">
                                <a
                                  href={cert.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-brand hover:underline"
                                >
                                  Herunterladen
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-700">
                Für diesen Benutzer liegen keine Schulungs- oder Zertifikatsdaten vor. Der
                Benutzer kann endgültig gelöscht werden.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Abbrechen
          </Button>
          {userActive && (
            <Button type="button" variant="secondary" disabled={busy} onClick={onArchive}>
              {archiving ? "Archiviere…" : "Nur archivieren"}
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            disabled={busy || loading || !!error || !preview}
            onClick={onConfirmDelete}
          >
            {deleting ? "Lösche…" : "Trotzdem endgültig löschen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
