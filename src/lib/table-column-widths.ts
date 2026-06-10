export const TABLE_WIDTH_STORAGE_PREFIX = "certiano.tableWidths";

export type TableColumnLayout = {
  key: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  /** Default true; actions columns often false. */
  resizable?: boolean;
  sticky?: "right";
  /** Vorbereitet für spätere Spalten-Sichtbarkeit. */
  visible?: boolean;
};

export function tableWidthStorageKey(path: string): string {
  return `${TABLE_WIDTH_STORAGE_PREFIX}.${path}`;
}

const DEFAULT_MIN = 56;
const DEFAULT_MAX = 640;

function clampWidth(
  value: number,
  col: TableColumnLayout
): number {
  const min = col.minWidth ?? DEFAULT_MIN;
  const max = col.maxWidth ?? DEFAULT_MAX;
  if (!Number.isFinite(value)) return col.defaultWidth;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function mergeStoredColumnWidths(
  storageKey: string | undefined,
  columns: TableColumnLayout[]
): Record<string, number> {
  const visible = columns.filter((c) => c.visible !== false);
  const merged: Record<string, number> = {};
  for (const col of visible) {
    merged[col.key] = col.defaultWidth;
  }

  if (!storageKey || typeof window === "undefined") {
    return merged;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return merged;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return merged;

    for (const col of visible) {
      const stored = (parsed as Record<string, unknown>)[col.key];
      if (typeof stored === "number") {
        merged[col.key] = clampWidth(stored, col);
      }
    }
  } catch {
    /* ignore corrupt storage */
  }

  return merged;
}

export function saveStoredColumnWidths(
  storageKey: string,
  widths: Record<string, number>,
  columns: TableColumnLayout[]
): void {
  if (typeof window === "undefined") return;
  const visible = columns.filter((c) => c.visible !== false);
  const payload: Record<string, number> = {};
  for (const col of visible) {
    const value = widths[col.key] ?? col.defaultWidth;
    payload[col.key] = clampWidth(value, col);
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function sumColumnWidths(
  columns: TableColumnLayout[],
  widths: Record<string, number>
): number {
  return columns
    .filter((c) => c.visible !== false)
    .reduce((sum, col) => sum + (widths[col.key] ?? col.defaultWidth), 0);
}

export function stickyHeaderClass(sticky?: "right"): string {
  if (sticky !== "right") return "";
  return "sticky right-0 z-20 bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)]";
}

export function stickyCellClass(sticky?: "right"): string {
  if (sticky !== "right") return "";
  return "sticky right-0 z-10 bg-white shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.06)] [tr:hover_&]:bg-slate-50";
}
