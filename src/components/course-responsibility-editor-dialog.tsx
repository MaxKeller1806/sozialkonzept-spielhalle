"use client";

import { AdminModal } from "@/components/admin-modal";
import { IconSearch, IconUsers } from "@/components/table-action-icons";
import { SEARCH_FILTER_FIELD_CLASS } from "@/components/search-filter-bar";
import type { AssignableEmployee } from "@/lib/course-responsible-users";
import { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  subjectLabel: string;
  subjectName: string;
  employees: AssignableEmployee[];
  selectedUserIds: number[];
  saving: boolean;
  error: string;
  hint?: string;
  showResetToTopic?: boolean;
  onClose: () => void;
  onSave: (userIds: number[]) => void;
  onResetToTopic?: () => void;
};

const compactSecondaryBtn =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const compactPrimaryBtn =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const textLinkBtn =
  "inline-flex items-center gap-1.5 text-sm font-medium text-brand transition hover:underline disabled:cursor-not-allowed disabled:opacity-50";

function formatEmployeeName(employee: AssignableEmployee): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

export function CourseResponsibilityEditorDialog({
  open,
  subjectLabel,
  subjectName,
  employees,
  selectedUserIds,
  saving,
  error,
  hint,
  showResetToTopic = false,
  onClose,
  onSave,
  onResetToTopic,
}: Props) {
  const [draftIds, setDraftIds] = useState<number[]>(selectedUserIds);
  const [employeeSearch, setEmployeeSearch] = useState("");

  useEffect(() => {
    if (open) {
      setDraftIds(selectedUserIds);
      setEmployeeSearch("");
    }
  }, [open, selectedUserIds]);

  const visibleEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const name = formatEmployeeName(e).toLowerCase();
      return name.includes(q) || e.email.toLowerCase().includes(q);
    });
  }, [employees, employeeSearch]);

  const toggleUser = (userId: number) => {
    setDraftIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Verantwortliche festlegen"
      error={error}
      saving={saving}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {showResetToTopic && onResetToTopic ? (
              <button
                type="button"
                className={textLinkBtn}
                onClick={onResetToTopic}
                disabled={saving}
              >
                <IconUsers className="shrink-0 text-brand" />
                Vom Hauptthema übernehmen
              </button>
            ) : (
              <span className="hidden sm:block" aria-hidden="true" />
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              className={compactSecondaryBtn}
              onClick={onClose}
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className={compactPrimaryBtn}
              onClick={() => onSave(draftIds)}
              disabled={saving}
            >
              {saving ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </div>
      }
    >
      <p className="text-sm text-slate-600">
        {subjectLabel}: <span className="font-semibold text-slate-900">{subjectName}</span>
      </p>
      {hint ? <p className="mt-1.5 text-sm text-slate-500">{hint}</p> : null}

      <div className="relative mt-4">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          className={`${SEARCH_FILTER_FIELD_CLASS} pl-10`}
          placeholder="Mitarbeiter suchen …"
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
        />
      </div>

      <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
        {visibleEmployees.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            Keine aktiven Mitarbeiter gefunden.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibleEmployees.map((employee) => {
              const selected = draftIds.includes(employee.id);
              return (
                <li key={employee.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition ${
                      selected ? "bg-brand-light/50" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand focus:ring-brand"
                      checked={selected}
                      onChange={() => toggleUser(employee.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {formatEmployeeName(employee)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {employee.email}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Mehrfachauswahl möglich. Ausgeschiedene Mitarbeiter werden nicht angezeigt.
      </p>
    </AdminModal>
  );
}
