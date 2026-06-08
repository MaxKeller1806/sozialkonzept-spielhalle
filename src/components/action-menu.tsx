"use client";

import { useEffect, useId, useRef, useState } from "react";

export type ActionMenuItem = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function ActionMenu({
  items,
  ariaLabel = "Aktionen",
}: {
  items: ActionMenuItem[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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

  if (items.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={rootRef}>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`block w-full px-4 py-2 text-left text-sm disabled:opacity-50 ${
                item.destructive
                  ? "text-red-700 hover:bg-red-50"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
