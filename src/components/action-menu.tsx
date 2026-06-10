"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  registerActionMenuOpen,
  unregisterActionMenuOpen,
} from "@/lib/action-menu-registry";

export type ActionMenuItem = {
  label: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
};

export type ActionMenuSection = {
  items: ActionMenuItem[];
  /** Danger Zone – optisch getrennt. */
  danger?: boolean;
};

type ActionMenuProps = {
  items?: ActionMenuItem[];
  sections?: ActionMenuSection[];
  ariaLabel?: string;
  triggerLabel?: string;
  triggerVariant?: "icon" | "compact" | "stacked";
  /** Trigger auch ohne Menüeinträge anzeigen (Layout). */
  forceShowTrigger?: boolean;
  /** Zusätzliches Element im Trigger (z. B. Chevron). */
  triggerSuffix?: ReactNode;
};

function flattenSections(sections: ActionMenuSection[]): ActionMenuItem[] {
  return sections.flatMap((section) => section.items);
}

function MenuItemButton({
  item,
  onSelect,
}: {
  item: ActionMenuItem;
  onSelect: () => void;
}) {
  const className = `block w-full px-4 py-2 text-left text-sm disabled:opacity-50 ${
    item.destructive
      ? "text-red-700 hover:bg-red-50"
      : "text-slate-700 hover:bg-slate-50"
  }`;

  if (item.href && !item.disabled) {
    return (
      <Link
        href={item.href}
        role="menuitem"
        className={className}
        onClick={onSelect}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      className={className}
      onClick={() => {
        onSelect();
        item.onClick?.();
      }}
    >
      {item.label}
    </button>
  );
}

export function ActionMenu({
  items = [],
  sections = [],
  ariaLabel = "Aktionen",
  triggerLabel = "Mehr",
  triggerVariant = "icon",
  forceShowTrigger = false,
  triggerSuffix,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const resolvedSections =
    sections.length > 0
      ? sections
      : items.length > 0
        ? [{ items }]
        : [];

  const allItems = flattenSections(resolvedSections);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    registerActionMenuOpen(closeMenu);
    return () => unregisterActionMenuOpen(closeMenu);
  }, [open, closeMenu]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    function updateMenuPosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right,
      });
    }

    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (allItems.length === 0 && !forceShowTrigger) return null;

  const triggerClassName =
    triggerVariant === "stacked"
      ? "inline-flex min-w-[3.5rem] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      : triggerVariant === "compact"
        ? "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-white hover:text-slate-900"
        : "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700";

  return (
    <div className="relative inline-block text-left" ref={rootRef} data-row-action>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          if (allItems.length === 0) return;
          setOpen((v) => !v);
        }}
      >
        {triggerVariant === "stacked" ? (
          <>
            <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </span>
            <span>{triggerLabel}</span>
          </>
        ) : triggerVariant === "compact" ? (
          <>
            <span className="text-base leading-none text-slate-400" aria-hidden>
              ⋯
            </span>
            <span>{triggerLabel}</span>
            {triggerSuffix}
          </>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        )}
      </button>
      {open &&
        menuPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            className="fixed z-[100] min-w-[12rem] -translate-x-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
            {resolvedSections.map((section, index) => (
              <div key={`${section.danger ? "danger" : "section"}-${index}`}>
                {index > 0 ? (
                  <div
                    className={`my-1 border-t ${section.danger ? "border-red-100" : "border-slate-100"}`}
                    role="separator"
                  />
                ) : null}
                {section.items.map((item) => (
                  <MenuItemButton
                    key={item.label}
                    item={item}
                    onSelect={() => setOpen(false)}
                  />
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
