"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui";
import { useAdminList } from "@/hooks/use-admin-list";
import type { AssignableEmployee } from "@/lib/company-responsibilities";
import type { CompanyResponsibilityAssignment } from "@/lib/types";

function formatEmployeeName(employee: AssignableEmployee): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function CompanyResponsibilitiesPageInner() {
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [draftUsers, setDraftUsers] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const list = useAdminList<CompanyResponsibilityAssignment>({
    apiPath: "/api/admin/responsibilities",
    dataKey: "assignments",
    defaultSortBy: "sortOrder",
    defaultSortDirection: "asc",
    defaultStatus: "all",
    onUnauthorized: () => window.location.replace("/login"),
  });

  const loadEmployees = useCallback(async () => {
    const res = await fetch("/api/admin/responsibilities");
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.employees)) {
      setEmployees(data.employees);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const row of list.rows) {
      next[row.responsibilityTypeId] =
        row.userId != null ? String(row.userId) : "";
    }
    setDraftUsers(next);
  }, [list.rows]);

  const hasChanges = useMemo(() => {
    return list.rows.some((row) => {
      const draft = draftUsers[row.responsibilityTypeId] ?? "";
      const current = row.userId != null ? String(row.userId) : "";
      return draft !== current;
    });
  }, [list.rows, draftUsers]);

  async function saveAll() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const assignments = list.rows.map((row) => ({
        responsibilityTypeId: row.responsibilityTypeId,
        userId: draftUsers[row.responsibilityTypeId]
          ? Number(draftUsers[row.responsibilityTypeId])
          : null,
      }));
      const res = await fetch("/api/admin/responsibilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Speichern fehlgeschlagen.");
      }
      setMessage(data.message ?? "Verantwortlichkeiten gespeichert.");
      list.reload();
      void loadEmployees();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  const columns: AdminTableColumn<CompanyResponsibilityAssignment>[] = [
    {
      key: "responsibilityTypeName",
      header: "Verantwortungstyp",
      sortable: true,
      render: (row) => (
        <>
          <span className="font-medium">{row.responsibilityTypeName}</span>
          {row.responsibilityTypeDescription ? (
            <p className="text-xs text-slate-500">{row.responsibilityTypeDescription}</p>
          ) : null}
        </>
      ),
    },
    {
      key: "userName",
      header: "Verantwortliche Person",
      sortable: true,
      render: (row) => (
        <select
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={draftUsers[row.responsibilityTypeId] ?? ""}
          onChange={(e) =>
            setDraftUsers((prev) => ({
              ...prev,
              [row.responsibilityTypeId]: e.target.value,
            }))
          }
        >
          <option value="">— nicht zugewiesen —</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {formatEmployeeName(employee)}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "assignedAt",
      header: "Zugeordnet am",
      sortable: true,
      render: (row) =>
        row.assignedAt
          ? new Date(row.assignedAt).toLocaleDateString("de-DE")
          : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Verantwortlichkeiten"
        description="Legen Sie fest, welche Person in Ihrer Firma für welches Thema verantwortlich ist. Dies ist getrennt von Rollen und Mitarbeiterkategorien."
        actions={
          <Button onClick={() => void saveAll()} disabled={saving || !hasChanges}>
            {saving ? "Speichern…" : "Änderungen speichern"}
          </Button>
        }
      />

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <AdminDataTable
        columns={columns}
        rows={list.rows}
        rowKey={(row) => row.responsibilityTypeId}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyMessage="Keine aktiven Verantwortungstypen vorhanden."
        search={list.state.search}
        searchPlaceholder="Typ oder Person…"
        onSearchChange={list.setSearch}
        statusFilter={list.state.status}
        onStatusChange={list.setStatus}
        page={list.meta?.page ?? list.state.page}
        pageSize={list.meta?.pageSize ?? list.state.pageSize}
        totalCount={list.meta?.total}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSort={list.toggleSort}
        getSortState={list.getSortState}
        hasActiveFilters={list.hasActiveFilters}
        onResetFilters={list.resetFilters}
      />
    </div>
  );
}

export default function VerantwortlichkeitenPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt…</p>}>
      <CompanyResponsibilitiesPageInner />
    </Suspense>
  );
}
