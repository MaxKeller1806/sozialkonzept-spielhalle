import Link from "next/link";
import { CertianoShell } from "@/components/certiano-shell";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";

export default function CertianoSettingsPage() {
  return (
    <CertianoShell>
      <PageHeader
        title="Plattform-Einstellungen"
        description="Zentrale Einstellungen für den Certiano-Betreiberbereich."
      />
      <Card>
        <p className="text-sm text-slate-600">
          Weitere Plattform-Einstellungen werden hier gebündelt. Branding und
          Operator-Konfiguration sind bereits unter Branding erreichbar.
        </p>
        <p className="mt-4">
          <Link href="/certiano/branding" className="text-sm font-medium text-brand hover:underline">
            Zum Branding
          </Link>
        </p>
      </Card>
    </CertianoShell>
  );
}
