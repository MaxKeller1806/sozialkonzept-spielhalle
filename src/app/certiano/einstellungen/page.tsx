import Link from "next/link";
import { CertianoShell } from "@/components/certiano-shell";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";

type SettingsSection = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

const SECTIONS: SettingsSection[] = [
  {
    title: "Certiano-Branding",
    description:
      "Certiano-Logo, Farben, Login-Optik, Sidebar und Plattform-Layout.",
    href: "/certiano/einstellungen/branding",
  },
  {
    title: "Login-Einstellungen",
    description: "Hintergrundbild und Erscheinungsbild der Anmeldeseiten.",
    comingSoon: true,
  },
  {
    title: "Zertifikatsdesigner",
    description: "Designer für Zertifikate und Nachweise auf Plattformebene.",
    comingSoon: true,
  },
];

export default function CertianoSettingsPage() {
  return (
    <CertianoShell>
      <PageHeader
        title="Plattform-Einstellungen"
        description="Zentrale Einstellungen für die Certiano-Plattform."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                {section.comingSoon ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Demnächst
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-600">{section.description}</p>
              {!section.comingSoon && section.href ? (
                <span className="mt-4 inline-block text-sm font-medium text-brand">
                  Öffnen →
                </span>
              ) : null}
            </>
          );

          if (section.comingSoon || !section.href) {
            return (
              <Card key={section.title} className="opacity-80">
                {content}
              </Card>
            );
          }

          return (
            <Link key={section.title} href={section.href} className="group block">
              <Card className="h-full transition hover:border-brand/30 hover:shadow-md">
                {content}
              </Card>
            </Link>
          );
        })}
      </div>
    </CertianoShell>
  );
}
