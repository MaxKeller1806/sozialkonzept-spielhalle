"use client";

import type { ReactNode } from "react";
import {
  stickyCellClass,
  stickyHeaderClass,
  sumColumnWidths,
  type TableColumnLayout,
} from "@/lib/table-column-widths";

/** Scroll-Container: hält die Tabelle innerhalb des Eltern-Elements (z. B. Card). */
export const RESIZABLE_TABLE_SHELL_CLASS =
  "w-full min-w-0 max-w-full overflow-x-auto";

/** Tabelle füllt den Container; Spaltenbreiten kommen aus colgroup (Prozent). */
export const RESIZABLE_TABLE_CLASS =
  "w-full max-w-full table-fixed border-collapse";

export function ResizableTableShell({
  columns,
  widths,
  children,
  shellClassName = "",
  tableClassName = "text-left text-sm",
}: {
  columns: TableColumnLayout[];
  widths: Record<string, number>;
  children: ReactNode;
  shellClassName?: string;
  tableClassName?: string;
}) {
  return (
    <div
      className={`${RESIZABLE_TABLE_SHELL_CLASS} ${shellClassName}`.trim()}
    >
      <table
        className={`${RESIZABLE_TABLE_CLASS} ${tableClassName}`.trim()}
      >
        <ResizableColGroup columns={columns} widths={widths} />
        {children}
      </table>
    </div>
  );
}

export function ResizableColGroup({
  columns,
  widths,
}: {
  columns: TableColumnLayout[];
  widths: Record<string, number>;
}) {
  const visible = columns.filter((c) => c.visible !== false);
  const total = sumColumnWidths(visible, widths);

  return (
    <colgroup>
      {visible.map((col) => {
        const px = widths[col.key] ?? col.defaultWidth;
        return (
          <col
            key={col.key}
            style={{
              width: total > 0 ? `${(px / total) * 100}%` : undefined,
            }}
          />
        );
      })}
    </colgroup>
  );
}

export function ColumnResizeHandle({
  onResizeStart,
}: {
  onResizeStart: (clientX: number) => void;
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label="Spaltenbreite anpassen"
      className="absolute right-0 top-0 z-30 h-full w-2 cursor-col-resize touch-none select-none"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(e.clientX);
      }}
    />
  );
}

export function ResizableTh({
  col,
  onResizeStart,
  children,
  className = "",
}: {
  col: TableColumnLayout;
  onResizeStart: (key: string, clientX: number) => void;
  children: ReactNode;
  className?: string;
}) {
  const resizable = col.resizable !== false;
  return (
    <th
      className={`relative overflow-hidden p-3 ${stickyHeaderClass(col.sticky)} ${className}`.trim()}
    >
      <div className="truncate pr-2">{children}</div>
      {resizable ? (
        <ColumnResizeHandle
          onResizeStart={(clientX) => onResizeStart(col.key, clientX)}
        />
      ) : null}
    </th>
  );
}

export function ResizableTd({
  col,
  children,
  className = "",
  title,
}: {
  col: Pick<TableColumnLayout, "sticky">;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td
      className={`overflow-hidden p-3 align-top ${stickyCellClass(col.sticky)} ${className}`.trim()}
      title={title}
    >
      <div className="truncate">{children}</div>
    </td>
  );
}

/** Hilfsklasse für Zellen mit table-layout: fixed + Ellipsis. */
export function tableBodyCellClass(
  sticky?: "right",
  extra = ""
): string {
  return `overflow-hidden p-3 align-top ${stickyCellClass(sticky)} ${extra}`.trim();
}
