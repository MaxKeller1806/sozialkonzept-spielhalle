"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  title: string;
  count: number;
  countLabel: (count: number) => string;
  /** Standard: zugeklappt; bei Suche oft true */
  defaultOpen?: boolean;
  children: ReactNode;
  titleClassName?: string;
};

export function CollapsibleTopicSection({
  title,
  count,
  countLabel,
  defaultOpen = false,
  children,
  titleClassName = "font-medium text-slate-900",
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  if (count === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={titleClassName}>
          {open ? "▾" : "▸"} {title}
        </span>
        <span className="text-sm text-slate-500">{countLabel(count)}</span>
      </button>
      {open ? children : null}
    </section>
  );
}
