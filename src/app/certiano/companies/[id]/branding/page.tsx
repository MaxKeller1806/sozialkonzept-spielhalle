"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CompanyBrandingForm } from "@/components/certiano/company-branding-form";
import { CompanySectionNav } from "@/components/certiano/company-section-nav";
import { CertianoShell } from "@/components/certiano-shell";

export default function CompanyBrandingPage() {
  const params = useParams();
  const companyId = Number(params.id);

  if (!Number.isFinite(companyId) || companyId <= 0) {
    return (
      <CertianoShell>
        <p className="text-sm text-red-600">Ungültige Firmen-ID.</p>
      </CertianoShell>
    );
  }

  return (
    <CertianoShell companyId={companyId}>
      <Link
        href="/certiano"
        className="mb-4 inline-block text-sm text-brand underline"
      >
        ← Firmenübersicht
      </Link>
      <CompanySectionNav companyId={companyId} active="branding" />
      <CompanyBrandingForm companyId={companyId} />
    </CertianoShell>
  );
}
