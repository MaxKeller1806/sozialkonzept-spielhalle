"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { CompanyDangerZone } from "@/components/company-danger-zone";
import { CompanyEditForm } from "@/components/company-edit-form";
import { Button, Card } from "@/components/ui";

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = Number(params.id);
  const [message, setMessage] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!Number.isFinite(companyId) || companyId <= 0) return;
    fetch(`/api/superuser/companies/${companyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.company?.name) setCompanyName(d.company.name);
      })
      .catch(() => {});
  }, [companyId]);

  return (
    <CertianoShell companyId={companyId}>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Firma bearbeiten</h2>
        {message && (
          <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
            {message}
          </p>
        )}
        <CompanyEditForm
          companyId={companyId}
          showNavLinks
          onSaved={() => setMessage("Firma erfolgreich gespeichert.")}
        />
        <div className="mt-6">
          <Button type="button" variant="secondary" className="!w-auto" onClick={() => history.back()}>
            Zurück zur Übersicht
          </Button>
        </div>
      </Card>

      {Number.isFinite(companyId) && companyId > 0 && (
        <CompanyDangerZone companyId={companyId} companyName={companyName} />
      )}
    </CertianoShell>
  );
}
