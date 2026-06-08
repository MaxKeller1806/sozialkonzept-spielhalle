"use client";

import { AdminModal } from "@/components/admin-modal";
import { Button, Input } from "@/components/ui";
import {
  COURSE_PERMANENT_DELETE_WARNING,
  MASTER_COURSE_PERMANENT_DELETE_WARNING,
  type CourseDeletePreviewData,
} from "@/lib/course-delete-shared";

type Props = {
  open: boolean;
  preview: CourseDeletePreviewData | null;
  loading: boolean;
  error: string;
  step: "choose" | "permanent";
  confirmTitle: string;
  archiving: boolean;
  deleting: boolean;
  onClose: () => void;
  onConfirmTitleChange: (value: string) => void;
  onChooseArchive: () => void;
  onChoosePermanent: () => void;
  onBack: () => void;
  onConfirmPermanentDelete: () => void;
};

function DependencyCounts({ preview }: { preview: CourseDeletePreviewData }) {
  if (preview.kind === "course") {
    if (!preview.hasDependencies) {
      return (
        <p className="text-sm text-slate-700">
          Für dieses Seminar liegen keine Zuweisungen, Prüfungsversuche oder Zertifikate vor.
        </p>
      );
    }
    return (
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Zuweisungen</dt>
          <dd className="font-semibold text-slate-900">{preview.counts.assignments}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Prüfungsversuche</dt>
          <dd className="font-semibold text-slate-900">
            {preview.counts.trainingAttempts}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Zertifikate</dt>
          <dd className="font-semibold text-slate-900">{preview.counts.certificates}</dd>
        </div>
      </dl>
    );
  }

  if (!preview.hasDependencies) {
    return (
      <p className="text-sm text-slate-700">
        Für diesen Masterkurs liegen keine Bereitstellungen oder verknüpften Nachweise vor.
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-slate-500">Bereitstellungen</dt>
        <dd className="font-semibold text-slate-900">{preview.counts.provisions}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Firmenkurse</dt>
        <dd className="font-semibold text-slate-900">{preview.counts.companyCourses}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Zuweisungen</dt>
        <dd className="font-semibold text-slate-900">{preview.counts.assignments}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Prüfungsversuche</dt>
        <dd className="font-semibold text-slate-900">{preview.counts.trainingAttempts}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Zertifikate</dt>
        <dd className="font-semibold text-slate-900">{preview.counts.certificates}</dd>
      </div>
    </dl>
  );
}

export function CourseDeleteDialog({
  open,
  preview,
  loading,
  error,
  step,
  confirmTitle,
  archiving,
  deleting,
  onClose,
  onConfirmTitleChange,
  onChooseArchive,
  onChoosePermanent,
  onBack,
  onConfirmPermanentDelete,
}: Props) {
  const busy = loading || archiving || deleting;
  const entityLabel = preview?.kind === "master" ? "Masterkurs" : "Seminar";
  const titleMatches =
    preview != null && confirmTitle.trim() === preview.title.trim();
  const canArchiveInDialog =
    preview != null &&
    (preview.kind === "master"
      ? preview.status !== "disabled"
      : preview.active);

  const permanentWarning =
    preview?.kind === "master"
      ? MASTER_COURSE_PERMANENT_DELETE_WARNING
      : COURSE_PERMANENT_DELETE_WARNING;

  const chooseFooter = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
        Abbrechen
      </Button>
      {canArchiveInDialog ? (
        <Button type="button" variant="secondary" disabled={busy || !preview} onClick={onChooseArchive}>
          {archiving ? "Archiviere…" : "Archivieren (empfohlen)"}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="danger"
        disabled={busy || !preview}
        onClick={onChoosePermanent}
      >
        Endgültig löschen
      </Button>
    </div>
  );

  const permanentFooter = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <Button type="button" variant="secondary" disabled={busy} onClick={onBack}>
        Zurück
      </Button>
      <Button
        type="button"
        variant="danger"
        disabled={busy || !preview || !titleMatches}
        onClick={onConfirmPermanentDelete}
      >
        {deleting ? "Lösche…" : "Endgültig löschen"}
      </Button>
    </div>
  );

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={
        step === "choose"
          ? `${entityLabel} entfernen`
          : `${entityLabel} endgültig löschen`
      }
      error={error}
      saving={archiving || deleting}
      closeLabel="Dialog schließen"
      maxWidthClass="max-w-xl"
      footer={step === "choose" ? chooseFooter : permanentFooter}
    >
      {loading && <p className="text-sm text-slate-600">Prüfe Abhängigkeiten…</p>}

      {!loading && preview && step === "choose" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">{preview.title}</span>
          </p>
          <p className="text-sm text-slate-600">
            Wählen Sie, ob das {entityLabel.toLowerCase()} archiviert oder endgültig gelöscht
            werden soll.
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Abhängigkeiten
            </h3>
            <DependencyCounts preview={preview} />
          </div>
          <div className="rounded-lg border border-brand/20 bg-brand-light px-4 py-3 text-sm text-slate-800">
            <strong>Archivieren (empfohlen):</strong> Das {entityLabel.toLowerCase()} wird
            deaktiviert, verschwindet aus aktiven Listen und bleibt historisch erhalten.
          </div>
        </div>
      )}

      {!loading && preview && step === "permanent" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {permanentWarning}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Betroffene Datensätze
            </h3>
            <DependencyCounts preview={preview} />
          </div>
          <Input
            label={`Geben Sie „${preview.title}“ zur Bestätigung ein`}
            value={confirmTitle}
            onChange={(e) => onConfirmTitleChange(e.target.value)}
            autoComplete="off"
            disabled={busy}
          />
        </div>
      )}
    </AdminModal>
  );
}
