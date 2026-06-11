"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminCredentialsDialog,
  type AdminAccessCredentials,
} from "@/components/admin-credentials-dialog";
import { PageHeader } from "@/components/page-header";
import { Button, Card } from "@/components/ui";
import { notifyPasswordResetRequestsChanged } from "@/lib/password-reset-requests-events";

interface ResetRequestItem {
  id: number;
  email: string;
  companyCode: string;
  requestedAt: string;
  firstName: string | null;
  lastName: string | null;
}

export default function PasswordResetRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ResetRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<AdminAccessCredentials | null>(
    null
  );
  const [credentialsOpen, setCredentialsOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/password-reset-requests")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.requests) setItems(d.requests);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate(id: number) {
    setActionId(id);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/password-reset-requests/${id}/generate-password`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Passwort konnte nicht erzeugt werden.");
        return;
      }
      if (data.credentials) {
        setCredentials(data.credentials);
        setCredentialsOpen(true);
      }
      load();
      notifyPasswordResetRequestsChanged();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDismiss(id: number) {
    setActionId(id);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/password-reset-requests/${id}/dismiss`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Anfrage konnte nicht verworfen werden.");
        return;
      }
      load();
      notifyPasswordResetRequestsChanged();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setActionId(null);
    }
  }

  function closeCredentials() {
    setCredentialsOpen(false);
    setCredentials(null);
  }

  if (loading) {
    return <p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="Passwort-Zurücksetzen-Anfragen" />

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <p className="text-center text-slate-600">
            Keine offenen Passwort-Zurücksetzen-Anfragen.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const name =
              item.firstName || item.lastName
                ? `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim()
                : null;
            const busy = actionId === item.id;

            return (
              <li key={item.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      {name ? (
                        <p className="font-semibold text-slate-900">{name}</p>
                      ) : null}
                      <p className="text-sm text-slate-700">{item.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Firmenkennung: {item.companyCode}
                      </p>
                      <time className="mt-2 block text-xs text-slate-400">
                        Angefragt:{" "}
                        {new Date(item.requestedAt).toLocaleString("de-DE")}
                      </time>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => handleGenerate(item.id)}
                      >
                        {busy ? "Wird verarbeitet…" : "Passwort erzeugen"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => handleDismiss(item.id)}
                      >
                        Verwerfen
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <AdminCredentialsDialog
        open={credentialsOpen}
        credentials={credentials}
        onClose={closeCredentials}
        successMessage="Passwort wurde erzeugt. Bitte geben Sie es dem Mitarbeiter sicher weiter."
      />
    </div>
  );
}
