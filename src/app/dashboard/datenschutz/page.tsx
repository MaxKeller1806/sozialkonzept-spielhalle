"use client";

import { PageHeader } from "@/components/page-header";
import { PrivacyStatusTable } from "@/components/privacy-status-table";

export default function AdminDatenschutzPage() {
  return (
    <>
      <PageHeader
        title="Datenschutzstatus"
        description="Übersicht, welche Mitarbeiter die Datenschutzerklärung bestätigt haben, wann die Bestätigung erfolgte und wer noch offen ist."
      />
      <div className="mb-6 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
          Bestätigt
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
          Offen
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
          Ausgeschieden
        </span>
      </div>
      <PrivacyStatusTable />
    </>
  );
}
