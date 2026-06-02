"use client";

import { useCallback, useState } from "react";
import {
  SuperuserDeleteUserDialog,
  type UserDeletePreview,
} from "@/components/superuser-delete-user-dialog";

interface DeleteUserTarget {
  id: number;
  firstName: string;
  lastName: string;
  active: boolean;
}

interface UseSuperuserDeleteUserOptions {
  getPreviewUrl: (userId: number) => string;
  getDeleteUrl: (userId: number) => string;
  getArchiveUrl: (userId: number) => string;
  onDeleted: (message: string) => void;
  onArchived: (message: string) => void;
  onError: (message: string) => void;
}

export function useSuperuserDeleteUser({
  getPreviewUrl,
  getDeleteUrl,
  getArchiveUrl,
  onDeleted,
  onArchived,
  onError,
}: UseSuperuserDeleteUserOptions) {
  const [target, setTarget] = useState<DeleteUserTarget | null>(null);
  const [preview, setPreview] = useState<UserDeletePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const closeDialog = useCallback(() => {
    if (deleting || archiving) return;
    setTarget(null);
    setPreview(null);
    setLoading(false);
    setError("");
  }, [deleting, archiving]);

  const openDeleteDialog = useCallback(
    async (user: DeleteUserTarget) => {
      setTarget(user);
      setPreview(null);
      setError("");
      setLoading(true);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(getPreviewUrl(user.id), { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? "Vorschau konnte nicht geladen werden.");
        }
        setPreview(data.preview ?? null);
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
    [getPreviewUrl]
  );

  const confirmDelete = useCallback(async () => {
    if (!target) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(getDeleteUrl(target.id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmDelete: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Löschen fehlgeschlagen.");
      }
      closeDialog();
      onDeleted(data.message ?? "Benutzer wurde endgültig gelöscht.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    } finally {
      setDeleting(false);
    }
  }, [target, getDeleteUrl, closeDialog, onDeleted, onError]);

  const archiveFromDialog = useCallback(async () => {
    if (!target) return;
    setArchiving(true);
    setError("");
    try {
      const res = await fetch(getArchiveUrl(target.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Archivierung fehlgeschlagen.");
      }
      closeDialog();
      onArchived(data.message ?? "Benutzer wurde archiviert.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Archivierung fehlgeschlagen.");
    } finally {
      setArchiving(false);
    }
  }, [target, getArchiveUrl, closeDialog, onArchived, onError]);

  const dialog = (
    <SuperuserDeleteUserDialog
      open={target !== null}
      userName={target ? `${target.firstName} ${target.lastName}` : ""}
      userActive={target?.active ?? false}
      preview={preview}
      loading={loading}
      error={error}
      deleting={deleting}
      archiving={archiving}
      onClose={closeDialog}
      onArchive={() => void archiveFromDialog()}
      onConfirmDelete={() => void confirmDelete()}
    />
  );

  return { openDeleteDialog, deleteDialog: dialog };
}
