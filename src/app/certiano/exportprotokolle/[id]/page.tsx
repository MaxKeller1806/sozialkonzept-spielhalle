"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card, ErrorMessage } from "@/components/ui";
import type { CompanyDataExportLogRow } from "@/lib/company-data-export";

export default function ExportProtokollDetailPage() {
  const params = useParams();
  const exportId = Number(params.id);
  const [row, setRow] = useState<CompanyDataExportLogRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(exportId) || exportId <= 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/superuser/data-exports/${exportId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.replace("/certiano/login");
          return;
        }
        setError(data.error ?? "Export konnte nicht geladen werden.");
        return;
      }
      setRow(data.export as CompanyDataExportLogRow);
    } catch {
      setError("Netzwerkfehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, [exportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const snapshot = row?.exportSnapshot;

  return (
    <CertianoShell>
      <Link
        href="/certiano/exportprotokolle"
        className="mb-4 inline-block text-sm text-brand underline"
      >
        ← Exportprotokolle
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Exportdetails</h1>

      <ErrorMessage message={error} />

      {loading ? (
        <p className="text-sm text-slate-600">Lädt…</p>
      ) : row ? (
        <>
          <Card className="mb-6">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Firmenname</dt>
                <dd className="font-medium">{row.companyName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Firmenkennung</dt>
                <dd className="font-mono">{row.companyCode || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Export-ID</dt>
                <dd className="font-mono">{row.id}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Datum</dt>
                <dd>{row.createdAt.replace("T", " ").slice(0, 16)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Benutzer</dt>
                <dd>{row.exportedByName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Exportgrund</dt>
                <dd>{row.exportReasonLabel}</dd>
              </div>
              {row.customReason && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Freitextbegründung</dt>
                  <dd className="mt-1 rounded-lg bg-slate-50 px-3 py-2">{row.customReason}</dd>
                </div>
              )}
            </dl>
          </Card>

          {snapshot && (
            <Card className="mb-6">
              <h2 className="mb-3 text-base font-bold">Snapshot-Daten</h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Mitarbeiter</dt>
                  <dd>{snapshot.employees}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Standorte</dt>
                  <dd>{snapshot.locations}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Schulungen</dt>
                  <dd>{snapshot.trainings}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Zertifikate</dt>
                  <dd>{snapshot.certificates}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Datenschutzbestätigungen</dt>
                  <dd>{snapshot.privacy_acceptances}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Erstellt am</dt>
                  <dd>{snapshot.generated_at.replace("T", " ").slice(0, 16)}</dd>
                </div>
              </dl>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <a href={`/api/superuser/data-exports/${row.id}/download`}>
              <Button type="button" className="!w-auto">
                ZIP herunterladen
              </Button>
            </a>
            <a href={`/api/superuser/data-exports/${row.id}/protocol`}>
              <Button type="button" variant="secondary" className="!w-auto">
                Protokoll (PDF)
              </Button>
            </a>
            <Link href={`/certiano/companies/${row.companyId}/data-export`}>
              <Button type="button" variant="secondary" className="!w-auto">
                Neue Export für Firma
              </Button>
            </Link>
          </div>

          {!row.fileUrl && (
            <p className="mt-4 text-sm text-slate-500">
              Keine archivierte ZIP-Datei vorhanden. Snapshot und Protokoll bleiben dennoch
              gespeichert.
            </p>
          )}
        </>
      ) : null}
    </CertianoShell>
  );
}
