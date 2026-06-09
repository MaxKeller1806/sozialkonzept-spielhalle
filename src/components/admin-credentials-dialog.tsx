"use client";

import { useCallback, useState } from "react";
import { AdminModal } from "@/components/admin-modal";
import { Button } from "@/components/ui";

export type AdminAccessCredentials = {
  email: string;
  initialPassword: string;
};

type AdminCredentialsDialogProps = {
  open: boolean;
  credentials: AdminAccessCredentials | null;
  onClose: () => void;
  /** z. B. nach Firmenanlage */
  successMessage?: string;
};

export function AdminCredentialsDialog({
  open,
  credentials,
  onClose,
  successMessage,
}: AdminCredentialsDialogProps) {
  const [copyHint, setCopyHint] = useState("");

  const clearHint = useCallback(() => {
    window.setTimeout(() => setCopyHint(""), 2500);
  }, []);

  async function copyPassword() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(credentials.initialPassword);
      setCopyHint("Passwort kopiert.");
      clearHint();
    } catch {
      setCopyHint("Kopieren fehlgeschlagen.");
      clearHint();
    }
  }

  async function copyAll() {
    if (!credentials) return;
    const text = [
      "Admin-Zugang",
      `E-Mail: ${credentials.email}`,
      `Erstpasswort: ${credentials.initialPassword}`,
      "",
      "Hinweis: Passwort beim ersten Login ändern.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint("Zugangsdaten kopiert.");
      clearHint();
    } catch {
      setCopyHint("Kopieren fehlgeschlagen.");
      clearHint();
    }
  }

  if (!open || !credentials) return null;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Admin-Zugang erstellt"
      maxWidthClass="max-w-md"
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={copyPassword}>
            Passwort kopieren
          </Button>
          <Button type="button" variant="secondary" onClick={copyAll}>
            Zugangsdaten als Text kopieren
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Schließen
          </Button>
        </div>
      }
    >
      {successMessage && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {successMessage}
        </p>
      )}
      <p className="mb-4 text-sm text-slate-700">
        Admin-Zugang erstellt:
      </p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="font-medium text-slate-600">E-Mail</dt>
          <dd className="mt-1 break-all font-mono text-slate-900">{credentials.email}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-600">Erstpasswort</dt>
          <dd className="mt-1 break-all font-mono text-lg text-slate-900">
            {credentials.initialPassword}
          </dd>
        </div>
      </dl>
      <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Dieses Passwort wird nur einmal angezeigt. Bitte kopieren und sicher
        weitergeben. Der Admin muss es beim ersten Login ändern.
      </p>
      {copyHint && (
        <p className="mt-3 text-sm text-brand" role="status">
          {copyHint}
        </p>
      )}
    </AdminModal>
  );
}
