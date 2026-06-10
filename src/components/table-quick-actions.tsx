"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ActionMenu, type ActionMenuSection } from "@/components/action-menu";

export type TableQuickAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
};

type TableQuickActionsProps = {
  actions: TableQuickAction[];
  menuSections: ActionMenuSection[];
  menuAriaLabel?: string;
  /** Icon über Label (Mockup-Layout). */
  layout?: "inline" | "stacked";
};

function QuickActionButton({
  label,
  href,
  onClick,
  icon,
  layout,
}: TableQuickAction & { layout: "inline" | "stacked" }) {
  const stackedClassName =
    "inline-flex min-w-[3.5rem] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";
  const inlineClassName =
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap";

  const className = layout === "stacked" ? stackedClassName : inlineClassName;

  const content =
    layout === "stacked" ? (
      <>
        {icon ? (
          <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </>
    ) : (
      <>
        {icon ? (
          <span className="text-base leading-none" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </>
    );

  if (href) {
    return (
      <Link href={href} className={className} data-row-action onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-row-action
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export function TableQuickActions({
  actions,
  menuSections,
  menuAriaLabel = "Weitere Aktionen",
  layout = "inline",
}: TableQuickActionsProps) {
  return (
    <div
      className={`flex items-center ${layout === "stacked" ? "justify-end gap-0.5" : "justify-end gap-1"}`}
      data-row-action
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {actions.map((action) => (
        <QuickActionButton key={action.label} {...action} layout={layout} />
      ))}
      <ActionMenu
        ariaLabel={menuAriaLabel}
        sections={menuSections}
        triggerLabel="Mehr"
        triggerVariant={layout === "stacked" ? "stacked" : "compact"}
      />
    </div>
  );
}
