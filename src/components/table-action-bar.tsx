"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActionMenu,
  type ActionMenuItem,
  type ActionMenuSection,
} from "@/components/action-menu";
import { IconChevronDown } from "@/components/table-action-icons";

export type TableActionBarItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
};

const MEHR_BUTTON_WIDTH = 96;
const GAP = 6;

function ActionBarButton({ item }: { item: TableActionBarItem }) {
  const className =
    "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-slate-600 transition hover:bg-white/90 hover:text-slate-900 whitespace-nowrap";

  const content = (
    <>
      {item.icon ? (
        <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center text-slate-400" aria-hidden>
          {item.icon}
        </span>
      ) : null}
      <span>{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={className} data-row-action>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} data-row-action onClick={item.onClick}>
      {content}
    </button>
  );
}

function overflowToMenuItems(items: TableActionBarItem[]): ActionMenuItem[] {
  return items.map((item) => ({
    label: item.label,
    href: item.href,
    onClick: item.onClick,
  }));
}

function mergeMehrSections(
  overflow: TableActionBarItem[],
  base: ActionMenuSection[]
): ActionMenuSection[] {
  const baseLabels = new Set(base.flatMap((section) => section.items.map((i) => i.label)));
  const overflowItems = overflowToMenuItems(overflow).filter(
    (item) => !baseLabels.has(item.label)
  );
  if (overflowItems.length === 0) return base;
  return [{ items: overflowItems }, ...base];
}

/** Horizontale Taskbar – „Mehr“ rechts mit festen + Overflow-Einträgen. */
export function TableActionBar({
  actions,
  mehrSections,
  ariaLabel = "Schnellaktionen",
}: {
  actions: TableActionBarItem[];
  mehrSections: ActionMenuSection[];
  ariaLabel?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(actions.length);

  const measure = useCallback(() => {
    const actionsEl = actionsRef.current;
    const measureEl = measureRef.current;
    if (!actionsEl || !measureEl) return;

    const available = actionsEl.clientWidth;
    if (available <= 0) return;

    const buttons = measureEl.querySelectorAll<HTMLElement>("[data-measure-action]");
    if (buttons.length === 0) {
      setVisibleCount(actions.length);
      return;
    }

    let used = 0;
    let fit = 0;
    for (let i = 0; i < buttons.length; i++) {
      const w = buttons[i].offsetWidth + (i > 0 ? GAP : 0);
      if (used + w <= available) {
        used += w;
        fit = i + 1;
      } else {
        break;
      }
    }

    setVisibleCount(Math.max(0, fit));
  }, [actions.length]);

  useEffect(() => {
    measure();
    const row = rowRef.current;
    if (!row) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(row);
    return () => ro.disconnect();
  }, [measure, actions]);

  const visible = actions.slice(0, visibleCount);
  const overflow = actions.slice(visibleCount);
  const resolvedSections = mergeMehrSections(overflow, mehrSections);

  return (
    <div
      ref={rowRef}
      className="flex w-full min-w-0 items-center"
      data-row-action
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
    >
      <div ref={actionsRef} className="relative min-w-0 flex-1 overflow-hidden">
        <div
          ref={measureRef}
          className="pointer-events-none absolute left-0 top-0 flex gap-1.5 opacity-0"
          aria-hidden
        >
          {actions.map((item) => (
            <span
              key={`m-${item.key}`}
              data-measure-action
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium whitespace-nowrap"
            >
              {item.icon ? (
                <span className="inline-flex h-[18px] w-[18px] items-center justify-center">
                  {item.icon}
                </span>
              ) : null}
              {item.label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {visible.map((item) => (
            <ActionBarButton key={item.key} item={item} />
          ))}
        </div>
      </div>

      <div
        className="ml-auto shrink-0 pl-3"
        style={{ minWidth: MEHR_BUTTON_WIDTH }}
      >
        <ActionMenu
          ariaLabel="Weitere Aktionen"
          triggerVariant="compact"
          triggerLabel="Mehr"
          triggerSuffix={<IconChevronDown className="text-slate-400" />}
          sections={resolvedSections}
        />
      </div>
    </div>
  );
}
