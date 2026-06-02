"use client";

import { APP_NAME, OPERATOR_NAME } from "@/lib/branding";
import { AccountMenu } from "@/components/account-menu";
import { CertianoNav } from "@/components/certiano-nav";

export function CertianoShell({
  children,
  companyId,
}: {
  children: React.ReactNode;
  companyId?: number;
}) {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {OPERATOR_NAME}
            </p>
            <h1 className="text-xl font-bold">{APP_NAME}</h1>
            <p className="text-sm text-slate-400">Betreiberbereich</p>
          </div>
          <AccountMenu variant="dark" />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <CertianoNav companyId={companyId} />
        {children}
      </div>
    </div>
  );
}
