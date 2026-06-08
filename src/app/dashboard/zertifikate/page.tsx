"use client";

import { AdminCertificatesTable } from "@/components/admin-certificates-table";
import { PageHeader } from "@/components/page-header";

export default function AdminCertificatesPage() {
  return (
    <>
      <PageHeader
        title="Zertifikate & Nachweise"
        description="Ausgestellte Schulungsnachweise Ihrer Mitarbeiter – ohne Prüfungsdetails."
      />
      <div className="mb-6 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
          Gültig
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
          Läuft bald ab
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          Abgelaufen / ungültig
        </span>
      </div>
      <AdminCertificatesTable />
    </>
  );
}
