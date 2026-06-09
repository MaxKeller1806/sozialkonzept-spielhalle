import { PageHeader } from "@/components/page-header";
import { AuditExportTable } from "@/components/audit-export-table";

export default function AuditExportPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Audit-Export" />
      <p className="mb-6 text-sm text-slate-600">
        Wählen Sie Mitarbeiter aus und laden Sie ein Audit-Paket mit
        Zertifikats-PDFs und einer CSV-Übersicht herunter.
      </p>
      <AuditExportTable />
    </div>
  );
}
