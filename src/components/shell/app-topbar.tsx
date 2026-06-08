"use client";

import { AccountMenu } from "@/components/account-menu";

export type AppTopbarProps = {
  breadcrumb?: string;
  onOpenMobileNav: () => void;
  showSearch?: boolean;
  showNotifications?: boolean;
  searchPlaceholder?: string;
  accountMenuVariant?: "light" | "dark";
};

export function AppTopbar({
  breadcrumb,
  onOpenMobileNav,
  showSearch = false,
  showNotifications = false,
  searchPlaceholder = "Suchen…",
  accountMenuVariant = "light",
}: AppTopbarProps) {
  return (
    <header className="app-topbar sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:h-[4.25rem] sm:px-8">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Navigation öffnen"
        onClick={onOpenMobileNav}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {breadcrumb ? (
        <p className="min-w-0 truncate text-sm font-medium text-slate-600 lg:text-base">
          {breadcrumb}
        </p>
      ) : (
        <div className="hidden flex-1 lg:block" />
      )}

      <div className="ml-auto flex items-center gap-3">
        {showSearch && (
          <label className="relative hidden sm:block">
            <span className="sr-only">Suchen</span>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder={searchPlaceholder}
              className="focus-brand w-48 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 lg:w-56"
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
            />
          </label>
        )}

        {showNotifications && (
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Benachrichtigungen"
            title="Benachrichtigungen"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        )}

        <AccountMenu variant={accountMenuVariant} />
      </div>
    </header>
  );
}

/** @deprecated Nutze AppTopbar */
export function AdminTopbar(props: AppTopbarProps) {
  return (
    <AppTopbar
      showSearch
      showNotifications
      searchPlaceholder="Suchen…"
      {...props}
    />
  );
}
