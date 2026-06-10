"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import {
  mergeStoredColumnWidths,
  saveStoredColumnWidths,
  sumColumnWidths,
  type TableColumnLayout,
} from "@/lib/table-column-widths";

export function useTableColumnWidths(
  storageKey: string | undefined,
  columns: TableColumnLayout[]
) {
  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible !== false),
    [columns]
  );

  const columnSignature = visibleColumns
    .map((c) => `${c.key}:${c.defaultWidth}:${c.minWidth ?? ""}:${c.maxWidth ?? ""}`)
    .join("|");

  const [widths, setWidths] = useState<Record<string, number>>(() =>
    mergeStoredColumnWidths(storageKey, visibleColumns)
  );

  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  useEffect(() => {
    setWidths(mergeStoredColumnWidths(storageKey, visibleColumns));
  }, [storageKey, columnSignature]);

  const totalWidth = useMemo(
    () => sumColumnWidths(visibleColumns, widths),
    [visibleColumns, widths]
  );

  const startResize = useCallback(
    (key: string, clientX: number) => {
      const col = visibleColumns.find((c) => c.key === key);
      if (!col || col.resizable === false) return;

      const startWidth = widthsRef.current[key] ?? col.defaultWidth;
      const min = col.minWidth ?? 56;
      const max = col.maxWidth ?? 640;

      const onMove = (ev: MouseEvent) => {
        const next = Math.min(
          max,
          Math.max(min, startWidth + ev.clientX - clientX)
        );
        setWidths((prev) => {
          if (prev[key] === next) return prev;
          return { ...prev, [key]: next };
        });
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (storageKey) {
          saveStoredColumnWidths(
            storageKey,
            widthsRef.current,
            visibleColumns
          );
        }
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [storageKey, visibleColumns]
  );

  return {
    visibleColumns,
    widths,
    totalWidth,
    startResize,
  };
}
