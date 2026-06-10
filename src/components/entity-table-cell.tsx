"use client";

import { avatarPaletteForSeed } from "@/lib/entity-avatar-colors";

type EntityTableCellProps = {
  name: string;
  subtitle?: string | null;
  logoUrl?: string | null;
  /** Anzeige z. B. F0007 – wird vor dem Namen gezeigt. */
  companyCode?: string | null;
  /** Seed für konsistente Avatar-Farbe (z. B. Firmen-ID). */
  colorSeed?: string | number;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function EntityTableCell({
  name,
  subtitle,
  logoUrl,
  companyCode,
  colorSeed,
}: EntityTableCellProps) {
  const initials = initialsFromName(name);
  const palette = avatarPaletteForSeed(String(colorSeed ?? name));

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-bold ring-1 ${palette.bg} ${palette.text} ${palette.ring}`}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-snug text-slate-900" title={name}>
          {name}
        </div>
        {subtitle ? (
          <div className="truncate text-xs text-slate-500" title={subtitle}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
