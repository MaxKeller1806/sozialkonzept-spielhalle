"use client";

import { useCallback, useState } from "react";
import {
  CourseDeleteDialog,
} from "@/components/course-delete-dialog";
import type { CourseDeletePreviewData } from "@/lib/course-delete-shared";

interface DeleteTarget {
  id: string;
  title: string;
}

interface UseCourseDeleteDialogOptions {
  kind: "course" | "master";
  getPreviewUrl: (id: string) => string;
  getDeleteUrl: (id: string) => string;
  onArchived: (message: string) => void;
  onDeleted: (message: string) => void;
  onError: (message: string) => void;
}

export function useCourseDeleteDialog({
  kind,
  getPreviewUrl,
  getDeleteUrl,
  onArchived,
  onDeleted,
  onError,
}: UseCourseDeleteDialogOptions) {
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const [preview, setPreview] = useState<CourseDeletePreviewData | null>(null);
  const [step, setStep] = useState<"choose" | "permanent">("choose");
  const [confirmTitle, setConfirmTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const closeDialog = useCallback(() => {
    if (archiving || deleting) return;
    setTarget(null);
    setPreview(null);
    setStep("choose");
    setConfirmTitle("");
    setLoading(false);
    setError("");
  }, [archiving, deleting]);

  const openDeleteDialog = useCallback(
    async (item: DeleteTarget) => {
      setTarget(item);
      setPreview(null);
      setStep("choose");
      setConfirmTitle("");
      setError("");
      setLoading(true);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(getPreviewUrl(item.id), { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? "Vorschau konnte nicht geladen werden.");
        }
        const raw = data.preview;
        if (!raw) {
          throw new Error("Vorschau konnte nicht geladen werden.");
        }
        setPreview({ kind, ...raw });
      } catch (e) {
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" || e.message.toLowerCase().includes("aborted"));
        setError(
          isAbort
            ? "Zeitüberschreitung beim Laden der Lösch-Vorschau."
            : e instanceof Error
              ? e.message
              : "Vorschau konnte nicht geladen werden."
        );
      } finally {
        window.clearTimeout(timeout);
        setLoading(false);
      }
    },
    [getPreviewUrl, kind]
  );

  const archive = useCallback(async () => {
    if (!target) return;
    setArchiving(true);
    setError("");
    try {
      const res = await fetch(getDeleteUrl(target.id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "archive" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Archivieren fehlgeschlagen.");
      }
      closeDialog();
      onArchived(data.message ?? "Erfolgreich archiviert.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archivieren fehlgeschlagen.");
    } finally {
      setArchiving(false);
    }
  }, [target, getDeleteUrl, closeDialog, onArchived]);

  const confirmPermanentDelete = useCallback(async () => {
    if (!target || !preview) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(getDeleteUrl(target.id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "permanent", confirmTitle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Löschen fehlgeschlagen.");
      }
      closeDialog();
      onDeleted(data.message ?? "Erfolgreich gelöscht.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    } finally {
      setDeleting(false);
    }
  }, [target, preview, getDeleteUrl, confirmTitle, closeDialog, onDeleted]);

  const dialog = (
    <CourseDeleteDialog
      open={target !== null}
      preview={preview}
      loading={loading}
      error={error}
      step={step}
      confirmTitle={confirmTitle}
      archiving={archiving}
      deleting={deleting}
      onClose={closeDialog}
      onConfirmTitleChange={setConfirmTitle}
      onChooseArchive={() => void archive()}
      onChoosePermanent={() => {
        setError("");
        setConfirmTitle("");
        setStep("permanent");
      }}
      onBack={() => {
        setError("");
        setConfirmTitle("");
        setStep("choose");
      }}
      onConfirmPermanentDelete={() => void confirmPermanentDelete()}
    />
  );

  return { openDeleteDialog, deleteDialog: dialog };
}
