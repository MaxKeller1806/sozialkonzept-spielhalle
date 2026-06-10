"use client";

import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  /** Volltext für title-Attribut (bei Ellipsis). */
  title?: string;
  className?: string;
};

export function TableCellText({ children, title, className = "" }: Props) {
  const titleText =
    title ??
    (typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined);

  return (
    <div
      className={`truncate ${className}`.trim()}
      title={titleText}
    >
      {children}
    </div>
  );
}
