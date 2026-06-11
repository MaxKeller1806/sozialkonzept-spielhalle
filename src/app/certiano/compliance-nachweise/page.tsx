import { CertianoShell } from "@/components/certiano-shell";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";

const PLANNED_FEATURES = [
  "Nachweisverwaltung",
  "Dokumentenarchiv",
  "Prüffristenverwaltung",
  "Wartungsintervalle",
  "Erinnerungen",
  "Auditunterlagen",
  "Verantwortlichkeiten",
  "Compliance-Dashboard",
] as const;

export default function ComplianceNachweisePage() {
  return (
    <CertianoShell>
      <PageHeader title="Compliance & Nachweise" />
      <Card className="max-w-2xl">
        <p className="text-sm text-slate-600">Dieser Bereich befindet sich aktuell in Planung.</p>
        <h2 className="mt-6 text-sm font-semibold text-slate-900">
          Geplante zukünftige Funktionen:
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-600">
          {PLANNED_FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </Card>
    </CertianoShell>
  );
}
