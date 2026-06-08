"use client";

import { PageHeader } from "@/components/page-header";
import { TrainingStatusTable } from "@/components/training-status-table";
import { StatusDot } from "@/components/ui";

export default function SchulungsstatusPage() {
  return (
    <>
      <PageHeader
        title="Schulungsstatus"
        description="Übersicht aller zugewiesenen Seminare und Unterweisungen je Mitarbeiter inklusive Status, Gültigkeit und anstehender Wiederholungen."
      />
      <div className="mb-6 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
          Nicht begonnen
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
          In Bearbeitung
        </span>
        <span className="flex items-center gap-1">
          <StatusDot status="green" /> Gültig
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Unbegrenzt gültig
        </span>
        <span className="flex items-center gap-1">
          <StatusDot status="yellow" /> Bald fällig (30 Tage)
        </span>
        <span className="flex items-center gap-1">
          <StatusDot status="red" /> Abgelaufen
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-800" />
          Nicht bestanden
        </span>
      </div>
      <TrainingStatusTable />
    </>
  );
}
