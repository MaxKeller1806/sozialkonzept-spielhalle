import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CertianoBrandingForm } from "@/components/certiano/branding-form";
import { CertianoShell } from "@/components/certiano-shell";
import { PageHeader } from "@/components/page-header";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function redirectIfCompanyBranding(params: Record<string, string | string[] | undefined>) {
  const companyId = params.companyId;
  if (typeof companyId === "string" && companyId) {
    redirect(`/certiano/companies/${companyId}/branding`);
  }
}

export default async function CertianoSettingsBrandingPage({ searchParams }: Props) {
  const params = await searchParams;
  await redirectIfCompanyBranding(params);

  return (
    <CertianoShell
      contentClassName="app-content mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-8"
    >
      <Link
        href="/certiano/einstellungen"
        className="mb-4 inline-block text-sm text-brand underline"
      >
        ← Plattform-Einstellungen
      </Link>
      <PageHeader
        title="Certiano-Branding"
        description="Certiano-Logo, Farben, Login-Optik und Sidebar für die Plattform."
      />
      <Suspense fallback={<p className="text-sm text-slate-600">Lädt…</p>}>
        <CertianoBrandingForm />
      </Suspense>
    </CertianoShell>
  );
}
