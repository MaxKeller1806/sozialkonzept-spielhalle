"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { ResizableTableShell, ResizableTh, tableBodyCellClass } from "@/components/resizable-table-parts";
import { Button, Card } from "@/components/ui";
import { useSuperuserDeleteUser } from "@/hooks/use-superuser-delete-user";
import { useTableColumnWidths } from "@/hooks/use-table-column-widths";
import {
  tableWidthStorageKey,
  type TableColumnLayout,
} from "@/lib/table-column-widths";

type UserFilter = "active" | "archived" | "all";
type RoleFilter = "all" | "admin" | "employee";

interface UserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  active: boolean;
  companyId: number | null;
  companyName: string | null;
  lastLoginAt: string | null;
}

interface TrainingRow {
  courseId: string;
  courseTitle: string;
  status: string;
  certificateId: number | null;
  certificateNumber: string | null;
  validUntil: string | null;
  pdfUrl: string | null;
}

interface UserDetailsState {
  loading: boolean;
  error: string;
  trainings: TrainingRow[] | null;
}

interface CompanyOption {
  id: number;
  name: string;
}

const SUPERUSER_USERS_COLUMNS: TableColumnLayout[] = [
  { key: "name", defaultWidth: 180, minWidth: 120 },
  { key: "email", defaultWidth: 220, minWidth: 160 },
  { key: "role", defaultWidth: 110, minWidth: 90 },
  { key: "company", defaultWidth: 200, minWidth: 140 },
  { key: "status", defaultWidth: 110, minWidth: 90 },
  { key: "lastLogin", defaultWidth: 160, minWidth: 120 },
  {
    key: "details",
    defaultWidth: 140,
    minWidth: 120,
    resizable: false,
    sticky: "right",
  },
];

export default function CertianoUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [detailsByUser, setDetailsByUser] = useState<Record<number, UserDetailsState>>({});
  const detailsRef = useRef(detailsByUser);
  detailsRef.current = detailsByUser;
  const [reloadNonce, setReloadNonce] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const { openDeleteDialog, deleteDialog } = useSuperuserDeleteUser({
    getPreviewUrl: (userId) => `/api/superuser/users/${userId}/delete-preview`,
    getDeleteUrl: (userId) => `/api/superuser/users/${userId}`,
    getArchiveUrl: (userId) => `/api/superuser/users/${userId}`,
    onDeleted: (msg) => {
      setMessage(msg);
      setExpandedUserId(null);
      setReloadNonce((n) => n + 1);
    },
    onArchived: (msg) => {
      setMessage(msg);
      setReloadNonce((n) => n + 1);
    },
    onError: (msg) => setError(msg),
  });

  const hasActiveFilters =
    filter !== "all" ||
    roleFilter !== "all" ||
    companyFilter !== "all" ||
    search.trim() !== "";

  function resetFilters() {
    setFilter("all");
    setRoleFilter("all");
    setCompanyFilter("all");
    setSearch("");
  }

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("filter", filter);
    if (roleFilter !== "all") p.set("role", roleFilter);
    if (companyFilter !== "all") p.set("companyId", companyFilter);
    if (search.trim()) p.set("q", search.trim());
    return p.toString();
  }, [filter, roleFilter, companyFilter, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setExpandedUserId(null);
    setDetailsByUser({});

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    fetch(`/api/superuser/users?${queryString}`, { signal: controller.signal })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 401 || r.status === 403) {
          throw new Error(d.error ?? "Bitte als Certiano-Superuser anmelden.");
        }
        if (!r.ok) {
          throw new Error(d.error ?? `Laden fehlgeschlagen (${r.status}).`);
        }
        if (cancelled) return;
        setUsers(d.users ?? []);
        setCompanies(d.companies ?? []);
        setTotal(d.total ?? (d.users ?? []).length);
        setTruncated(Boolean(d.truncated));
      })
      .catch((e) => {
        if (cancelled) return;
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" || e.message.toLowerCase().includes("aborted"));
        setUsers([]);
        setError(
          isAbort
            ? "Zeitüberschreitung beim Laden. Bitte erneut versuchen."
            : e instanceof Error
              ? e.message
              : "Laden fehlgeschlagen."
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [queryString, reloadNonce]);

  const loadUserDetails = useCallback(async (userId: number, force = false) => {
    const existing = detailsRef.current[userId];
    if (
      !force &&
      existing &&
      (existing.loading || existing.trainings !== null || existing.error)
    ) {
      return;
    }

    setDetailsByUser((prev) => ({
      ...prev,
      [userId]: { loading: true, error: "", trainings: existing?.trainings ?? null },
    }));

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`/api/superuser/users/${userId}/certificates`, {
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error(data.error ?? "Bitte als Certiano-Superuser anmelden.");
      }
      if (!res.ok) {
        throw new Error(data.error ?? `Details konnten nicht geladen werden (${res.status}).`);
      }
      setDetailsByUser((prev) => ({
        ...prev,
        [userId]: {
          loading: false,
          error: "",
          trainings: data.trainings ?? [],
        },
      }));
    } catch (e) {
      const isAbort =
        e instanceof Error &&
        (e.name === "AbortError" || e.message.toLowerCase().includes("aborted"));
      setDetailsByUser((prev) => ({
        ...prev,
        [userId]: {
          loading: false,
          error: isAbort
            ? "Zeitüberschreitung beim Laden der Details."
            : e instanceof Error
              ? e.message
              : "Details konnten nicht geladen werden.",
          trainings: null,
        },
      }));
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  function toggleDetails(user: UserRow) {
    if (expandedUserId === user.id) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(user.id);
    void loadUserDetails(user.id);
  }

  function triggerReload() {
    setReloadNonce((n) => n + 1);
  }

  async function reactivateUser(user: UserRow) {
    setMessage("");
    setError("");
    const res = await fetch(`/api/superuser/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(`${user.firstName} ${user.lastName} wurde reaktiviert.`);
      triggerReload();
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
    const res = await fetch(`/api/superuser/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(d.message ?? "Benutzer wurde archiviert.");
      triggerReload();
    } else {
      setError(d.error ?? "Archivierung fehlgeschlagen.");
    }
  }

  function roleLabel(role: string): string {
    if (role === "admin") return "Admin";
    if (role === "employee") return "Mitarbeiter";
    return role;
  }

  const { visibleColumns, widths, startResize } = useTableColumnWidths(
    tableWidthStorageKey("superuser.users"),
    SUPERUSER_USERS_COLUMNS
  );

  function renderUserDetails(user: UserRow) {
    const details = detailsByUser[user.id];

    if (!details || details.loading) {
      return <p className="text-sm text-slate-600">Lädt Schulungen und Zertifikate…</p>;
    }

    if (details.error) {
      return (
        <div className="text-sm text-red-700">
          <p>{details.error}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-2 !w-auto"
            onClick={() => void loadUserDetails(user.id, true)}
          >
            Erneut laden
          </Button>
        </div>
      );
    }

    const trainings = details.trainings ?? [];

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {user.active ? (
            <Button type="button" variant="secondary" onClick={() => archiveUser(user)}>
              Archivieren
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => reactivateUser(user)}>
              Reaktivieren
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            className="!w-auto"
            onClick={() => void openDeleteDialog(user)}
          >
            Endgültig löschen
          </Button>
        </div>

        {trainings.length === 0 ? (
          <p className="text-sm text-slate-600">Keine Schulungen oder Zertifikate vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b text-slate-600">
                <tr>
                  <th className="py-2 pr-4">Schulung / Einweisung</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Zertifikatsnummer</th>
                  <th className="py-2 pr-4">Gültig bis</th>
                  <th className="py-2 pr-4">PDF</th>
                </tr>
              </thead>
              <tbody>
                {trainings.map((t) => (
                  <tr key={t.courseId} className="border-b last:border-0">
                    <td className="py-2 pr-4">{t.courseTitle}</td>
                    <td className="py-2 pr-4">{t.status}</td>
                    <td className="py-2 pr-4">{t.certificateNumber ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {t.validUntil
                        ? new Date(t.validUntil).toLocaleDateString("de-DE")
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {t.pdfUrl ? (
                        <a
                          href={t.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand hover:underline"
                        >
                          PDF
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <CertianoShell>
      <h2 className="mb-2 text-xl font-bold text-slate-900">Benutzerübersicht</h2>
      <p className="mb-4 text-sm text-slate-600">
        Datensparsame Übersicht aller Firmen.
        {total > 0 && (
          <>
            {" "}
            {truncated
              ? `${users.length} von ${total} Treffern angezeigt (Limit ${100}). Bitte Filter oder Suche verwenden.`
              : `${total} Benutzer.`}
          </>
        )}
        {" "}
        Schulungsdetails werden erst beim Aufklappen geladen.
      </p>

      <SearchFilterBar
        className="mb-4"
        search={search}
        searchPlaceholder="z. B. Müller oder @firma.de"
        onSearchChange={setSearch}
        filters={[
          {
            key: "companyId",
            label: "Firma",
            value: companyFilter,
            options: [
              { value: "all", label: "Alle Firmen" },
              ...companies.map((c) => ({ value: String(c.id), label: c.name })),
            ],
            onChange: setCompanyFilter,
          },
          {
            key: "role",
            label: "Rolle",
            value: roleFilter,
            options: [
              { value: "all", label: "Alle Rollen" },
              { value: "admin", label: "Admin" },
              { value: "employee", label: "Mitarbeiter" },
            ],
            onChange: (value) => setRoleFilter(value as RoleFilter),
          },
          {
            key: "status",
            label: "Status",
            value: filter,
            options: [
              { value: "all", label: "Alle" },
              { value: "active", label: "Aktiv" },
              { value: "archived", label: "Archiviert" },
            ],
            onChange: (value) => setFilter(value as UserFilter),
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          <p>{error}</p>
          {error.includes("Superuser") && (
            <a href="/certiano/login" className="mt-2 inline-block text-brand underline">
              Zum Superuser-Login
            </a>
          )}
          <Button type="button" variant="secondary" onClick={triggerReload} className="mt-3 !w-auto">
            Erneut laden
          </Button>
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
            {search.trim() || roleFilter !== "all" || companyFilter !== "all"
              ? "Keine Treffer für die aktuelle Suche oder Filter."
              : filter === "archived"
                ? "Keine archivierten Benutzer."
                : filter === "active"
                  ? "Keine aktiven Benutzer."
                  : "Keine Benutzer gefunden."}
          </p>
        </Card>
      ) : (
        <Card className="min-w-0 overflow-hidden p-0">
          <ResizableTableShell
            columns={visibleColumns}
            widths={widths}
            tableClassName="text-left text-sm"
          >
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <ResizableTh col={visibleColumns[0]} onResizeStart={startResize}>
                  Name
                </ResizableTh>
                <ResizableTh col={visibleColumns[1]} onResizeStart={startResize}>
                  E-Mail
                </ResizableTh>
                <ResizableTh col={visibleColumns[2]} onResizeStart={startResize}>
                  Rolle
                </ResizableTh>
                <ResizableTh col={visibleColumns[3]} onResizeStart={startResize}>
                  Firma
                </ResizableTh>
                <ResizableTh col={visibleColumns[4]} onResizeStart={startResize}>
                  Status
                </ResizableTh>
                <ResizableTh col={visibleColumns[5]} onResizeStart={startResize}>
                  Letzter Login
                </ResizableTh>
                <ResizableTh col={visibleColumns[6]} onResizeStart={startResize}>
                  Details
                </ResizableTh>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isExpanded = expandedUserId === u.id;
                const fullName = `${u.firstName} ${u.lastName}`;
                return (
                  <Fragment key={u.id}>
                    <tr className="border-b hover:bg-slate-50">
                      <td
                        className={`${tableBodyCellClass(undefined, "p-4 font-medium")}`}
                        title={fullName}
                      >
                        {fullName}
                      </td>
                      <td className={tableBodyCellClass(undefined, "p-4")} title={u.email}>
                        {u.email}
                      </td>
                      <td className={tableBodyCellClass(undefined, "p-4")}>
                        {roleLabel(u.role)}
                      </td>
                      <td
                        className={tableBodyCellClass(undefined, "p-4")}
                        title={u.companyName ?? undefined}
                      >
                        {u.companyId && u.companyName ? (
                          <Link
                            href={`/certiano/companies/${u.companyId}/users`}
                            className="truncate text-brand hover:underline"
                            title={u.companyName}
                          >
                            {u.companyName}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={tableBodyCellClass(undefined, "p-4")}>
                        {u.active ? "Aktiv" : "Archiviert"}
                      </td>
                      <td className={tableBodyCellClass(undefined, "p-4")}>
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString("de-DE")
                          : "—"}
                      </td>
                      <td className={`${tableBodyCellClass("right", "p-4")} !overflow-visible`}>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!w-auto whitespace-nowrap"
                          onClick={() => toggleDetails(u)}
                        >
                          {isExpanded ? "Details ausblenden" : "Details anzeigen"}
                        </Button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b bg-slate-50">
                        <td colSpan={7} className="p-4">
                          {renderUserDetails(u)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </ResizableTableShell>
        </Card>
      )}
      {deleteDialog}
    </CertianoShell>
  );
}
