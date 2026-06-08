"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card } from "@/components/ui";
import { useSuperuserDeleteUser } from "@/hooks/use-superuser-delete-user";

type UserFilter = "active" | "archived" | "all";

interface UserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
}

export default function CompanyUsersPage() {
  const params = useParams();
  const companyId = Number(params.id);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);

  const { openDeleteDialog, deleteDialog } = useSuperuserDeleteUser({
    getPreviewUrl: (userId) => `/api/superuser/users/${userId}/delete-preview`,
    getDeleteUrl: (userId) => `/api/superuser/companies/${companyId}/users/${userId}`,
    getArchiveUrl: (userId) => `/api/superuser/companies/${companyId}/users/${userId}`,
    onDeleted: (msg) => {
      setMessage(msg);
      setReloadNonce((n) => n + 1);
    },
    onArchived: (msg) => {
      setMessage(msg);
      setReloadNonce((n) => n + 1);
    },
    onError: (msg) => setError(msg),
  });

  const load = useCallback(() => {
    if (!Number.isFinite(companyId) || companyId <= 0) {
      setError("Ungültige Firmen-ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    fetch(`/api/superuser/companies/${companyId}/users?filter=${filter}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 401 || r.status === 403) {
          throw new Error(d.error ?? "Bitte als Certiano-Superuser anmelden.");
        }
        if (!r.ok) {
          throw new Error(d.error ?? `Laden fehlgeschlagen (${r.status}).`);
        }
        setUsers(d.users ?? []);
        setActiveCount(d.activeCount ?? 0);
        setArchivedCount(d.archivedCount ?? 0);
      })
      .catch((e) => {
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" || e.message.toLowerCase().includes("aborted"));
        if (isAbort) {
          setError("Benutzer konnten nicht geladen werden. Bitte erneut versuchen.");
        } else {
          setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });
  }, [companyId, filter]);

  useEffect(() => {
    load();
  }, [load, reloadNonce]);

  async function reactivateUser(user: UserRow) {
    setMessage("");
    setError("");
    const res = await fetch(
      `/api/superuser/companies/${companyId}/users/${user.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      }
    );
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(`${user.firstName} ${user.lastName} wurde reaktiviert.`);
      setReloadNonce((n) => n + 1);
    } else {
      setError(d.error ?? "Reaktivierung fehlgeschlagen.");
    }
  }

  async function archiveUser(user: UserRow) {
    if (
      !window.confirm(
        `${user.firstName} ${user.lastName} wirklich archivieren? Der Zugang wird gesperrt, Nachweisdaten bleiben erhalten.`
      )
    ) {
      return;
    }
    setMessage("");
    setError("");
    const res = await fetch(
      `/api/superuser/companies/${companyId}/users/${user.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      }
    );
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(d.message ?? "Benutzer wurde archiviert.");
      setReloadNonce((n) => n + 1);
    } else {
      setError(d.error ?? "Archivierung fehlgeschlagen.");
    }
  }

  return (
    <CertianoShell companyId={companyId}>
      <p className="mb-4 text-sm text-slate-600">
        Datensparsame Übersicht: {activeCount} aktiv, {archivedCount} archiviert.
        Keine Geburtsorte, Wohnorte oder Zertifikatsdetails.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={filter === "active" ? "primary" : "secondary"}
          onClick={() => setFilter("active")}
        >
          Aktive Benutzer
        </Button>
        <Button
          type="button"
          variant={filter === "archived" ? "primary" : "secondary"}
          onClick={() => setFilter("archived")}
        >
          Archivierte Benutzer
        </Button>
        <Button
          type="button"
          variant={filter === "all" ? "primary" : "secondary"}
          onClick={() => setFilter("all")}
        >
          Alle Benutzer
        </Button>
        {filter !== "all" && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFilter("all")}
          >
            Filter zurücksetzen
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          <p>{error}</p>
          {error.includes("Superuser") && (
            <a href="/certiano/login" className="mt-2 inline-block text-brand underline">
              Zum Superuser-Login
            </a>
          )}
        </div>
      )}
      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-slate-600">Lädt Benutzer…</p>
      ) : users.length === 0 && !error ? (
        <Card>
          <p className="text-sm text-slate-600">
            {filter !== "all"
              ? "Keine Treffer für die aktuelle Filterauswahl."
              : "Keine Benutzer für diese Firma gefunden."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">E-Mail</th>
                <th className="p-4">Rolle</th>
                <th className="p-4">Status</th>
                <th className="p-4">Letzter Login</th>
                <th className="p-4">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-4 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">{u.role === "admin" ? "Admin" : "Mitarbeiter"}</td>
                  <td className="p-4">{u.active ? "Aktiv" : "Archiviert"}</td>
                  <td className="p-4">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString("de-DE")
                      : "—"}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      {u.active ? (
                        <Button type="button" variant="secondary" onClick={() => archiveUser(u)}>
                          Archivieren
                        </Button>
                      ) : (
                        <Button type="button" variant="secondary" onClick={() => reactivateUser(u)}>
                          Reaktivieren
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="danger"
                        className="!w-auto"
                        onClick={() => void openDeleteDialog(u)}
                      >
                        Endgültig löschen
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {deleteDialog}
    </CertianoShell>
  );
}
