"use client";

import { AccountMenu } from "@/components/account-menu";

export type AppTopbarProps = {
  contextName?: string;
  portalName?: string;
  onOpenMobileNav: () => void;
  showNotifications?: boolean;
  accountMenuVariant?: "light" | "dark";
};

export function AppTopbar({
  contextName,
  portalName,
  onOpenMobileNav,
  showNotifications = false,
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

      {contextName || portalName ? (
        <div className="min-w-0">
          {contextName ? (
            <p className="truncate text-base font-semibold text-slate-900 sm:text-lg">
              {contextName}
            </p>
          ) : null}
          {portalName ? (
            <p className="truncate text-xs text-slate-500 sm:text-sm">{portalName}</p>
          ) : null}
        </div>
      ) : (
        <div className="hidden flex-1 lg:block" />
      )}

      <div className="ml-auto flex items-center gap-3">
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
  return <AppTopbar showNotifications {...props} />;
}
