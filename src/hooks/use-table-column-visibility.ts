"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export const TABLE_COLUMN_VISIBILITY_PREFIX = "certiano.tableColumns";

export type ColumnVisibilityDef = {
  key: string;
  header: string;
  /** Spalte ist standardmäßig sichtbar (Default true). */
  defaultVisible?: boolean;
  /** Nicht im Spalten-Picker anzeigen (z. B. Aktionen). */
  hideFromPicker?: boolean;
};

function visibilityStorageKey(path: string): string {
  return `${TABLE_COLUMN_VISIBILITY_PREFIX}.${path}`;
}

function buildDefaultVisibility(columns: ColumnVisibilityDef[]): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const col of columns) {
    defaults[col.key] = col.defaultVisible !== false;
  }
  return defaults;
}

function mergeStoredVisibility(
  storageKey: string | undefined,
  columns: ColumnVisibilityDef[]
): Record<string, boolean> {
  const merged = buildDefaultVisibility(columns);
  if (!storageKey || typeof window === "undefined") return merged;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return merged;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return merged;

    for (const col of columns) {
      const stored = (parsed as Record<string, unknown>)[col.key];
      if (typeof stored === "boolean") {
        merged[col.key] = stored;
      }
    }
  } catch {
    /* ignore corrupt storage */
  }

  return merged;
}

export function useTableColumnVisibility(
  storageKey: string | undefined,
  columns: ColumnVisibilityDef[]
) {
  const resolvedStorageKey = storageKey
    ? visibilityStorageKey(storageKey)
    : undefined;

  const columnSignature = columns
    .map((c) => `${c.key}:${c.defaultVisible ?? true}:${c.hideFromPicker ?? false}`)
    .join("|");

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    mergeStoredVisibility(resolvedStorageKey, columns)
  );

  useEffect(() => {
    setVisibility(mergeStoredVisibility(resolvedStorageKey, columns));
  }, [resolvedStorageKey, columnSignature]);

  const pickerColumns = useMemo(
    () => columns.filter((c) => !c.hideFromPicker && c.header.trim().length > 0),
    [columns]
  );

  const isVisible = useCallback(
    (key: string) => visibility[key] !== false,
    [visibility]
  );

  const toggleColumn = useCallback(
    (key: string) => {
      setVisibility((prev) => {
        const next = { ...prev, [key]: prev[key] === false };
        if (resolvedStorageKey) {
          try {
            localStorage.setItem(resolvedStorageKey, JSON.stringify(next));
          } catch {
            /* quota / private mode */
          }
        }
        return next;
      });
    },
    [resolvedStorageKey]
  );

  return {
    pickerColumns,
    visibility,
    isVisible,
    toggleColumn,
  };
}
