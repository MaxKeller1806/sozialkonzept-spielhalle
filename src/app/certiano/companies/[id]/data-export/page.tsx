"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CompanySectionNav } from "@/components/certiano/company-section-nav";
import { CertianoShell } from "@/components/certiano-shell";
import {
  Button,
  Card,
  ErrorMessage,
} from "@/components/ui";
import {
  COMPANY_DATA_EXPORT_REASONS,
  CUSTOM_REASON_MAX_LENGTH,
  CUSTOM_REASON_MIN_LENGTH,
  type CompanyDataExportReasonKey,
} from "@/lib/company-data-export-reasons";
import type { CompanyDataExportLogRow } from "@/lib/company-data-export";

type ExportMeta = {
  company: { id: number; name: string; companyCode: string };
  exports: CompanyDataExportLogRow[];
};

export default function CompanyDataExportPage() {
  const params = useParams();
  const companyId = Number(params.id);
  const [meta, setMeta] = useState<ExportMeta | null>(null);
  const [exportReason, setExportReason] = useState<CompanyDataExportReasonKey>(
    "DSGVO_AUSKUNFT"
  );
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadMeta = useCallback(async () => {
    if (!Number.isFinite(companyId) || companyId <= 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/superuser/companies/${companyId}/data-export`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Daten konnten nicht geladen werden.");
        setMeta(null);
        return;
      }
      setMeta(data as ExportMeta);
    } catch {
      setError("Netzwerkfehler beim Laden.");
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const showCustomReason = exportReason === "SONSTIGES";
  const customReasonValid =
    !showCustomReason ||
    (customReason.trim().length >= CUSTOM_REASON_MIN_LENGTH &&
      customReason.trim().length <= CUSTOM_REASON_MAX_LENGTH);

  async function handleExport() {
    setError("");
    setMessage("");

    if (!customReasonValid) {
      setError(
        `Bitte eine Begründung mit mindestens ${CUSTOM_REASON_MIN_LENGTH} Zeichen angeben.`
      );
      return;
    }

    setExporting(true);
    try {
      const res = await fetch(`/api/superuser/companies/${companyId}/data-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportReason,
          customReason: showCustomReason ? customReason.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Export fehlgeschlagen.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `firma_export_${new Date().toISOString().slice(0, 10)}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setMessage(
        "Datenexport wurde erstellt, protokolliert und heruntergeladen (inkl. export_protokoll.pdf im ZIP)."
      );
      setCustomReason("");
      await loadMeta();
    } catch {
      setError("Netzwerkfehler beim Export.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <CertianoShell companyId={companyId}>
      <Link
        href="/certiano"
        className="mb-4 inline-block text-sm text-brand underline"
      >
        ← Firmenübersicht
      </Link>

      <CompanySectionNav companyId={companyId} active="data-export" />

      <Card>
        <h2 className="mb-2 text-lg font-bold">Firmen-Datenexport</h2>
        <p className="mb-6 text-sm text-slate-600">
          Vollständiges, strukturiertes Datenpaket für DSGVO-Auskünfte, Vertragsende,
          Datenmigration oder interne Archivierung. Jeder Export wird revisionssicher
          protokolliert unter{" "}
          <Link href="/certiano/exportprotokolle" className="text-brand underline">
            Certiano → Exportprotokolle
          </Link>
          . Dieser Export ist vom <strong>Audit-Export</strong> getrennt.
        </p>

        {loading ? (
          <p className="text-sm text-slate-600">Lädt…</p>
        ) : (
          <>
            {meta && (
              <p className="mb-4 text-sm text-slate-700">
                Firma:{" "}
                <span className="font-medium">
                  {meta.company.name}
                  {meta.company.companyCode ? ` (${meta.company.companyCode})` : ""}
                </span>
              </p>
            )}

            <div className="mb-6 space-y-4">
              <div>
                <label
                  htmlFor="export-reason"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Exportgrund <span className="text-red-600">*</span>
                </label>
                <select
                  id="export-reason"
                  required
                  value={exportReason}
                  onChange={(e) =>
                    setExportReason(e.target.value as CompanyDataExportReasonKey)
                  }
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {Object.entries(COMPANY_DATA_EXPORT_REASONS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {showCustomReason && (
                <div>
                  <label
                    htmlFor="custom-reason"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Begründung <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="custom-reason"
                    required
                    rows={4}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    maxLength={CUSTOM_REASON_MAX_LENGTH}
                    placeholder="z. B. Kunde benötigt Daten zur Migration in ein anderes LMS-System."
                    className="w-full max-w-xl rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Mindestens {CUSTOM_REASON_MIN_LENGTH}, maximal {CUSTOM_REASON_MAX_LENGTH}{" "}
                    Zeichen ({customReason.trim().length}/{CUSTOM_REASON_MAX_LENGTH})
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="mb-2 font-medium">ZIP-Paket enthält:</p>
                <ul className="list-inside list-disc space-y-1 text-slate-600">
                  <li>export_protokoll.pdf</li>
                  <li>01_firma.pdf – Firmenstammdaten und Branding</li>
                  <li>02_mitarbeiter.xlsx</li>
                  <li>03_schulungen.xlsx</li>
                  <li>04_standorte.xlsx</li>
                  <li>05_zertifikate/ – Zertifikats-PDFs</li>
                  <li>06_nachweise/ – Schulungsnachweise</li>
                  <li>07_datenschutz.pdf</li>
                  <li>raw_data/ – maschinenlesbare JSON-Rohdaten (DSGVO / Datenportabilität)</li>
                </ul>
                <p className="mt-2 text-xs text-slate-500">
                  raw_data/: company.json, employees.json, locations.json, trainings.json,
                  certificates.json, privacy_acceptances.json, branding.json
                </p>
              </div>
            </div>

            <ErrorMessage message={error} />
            {message && (
              <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
                {message}
              </p>
            )}

            <Button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting || !customReasonValid}
              aria-busy={exporting}
              className="!w-auto"
            >
              {exporting ? "Export wird erstellt…" : "ZIP-Export erstellen"}
            </Button>
          </>
        )}
      </Card>

      {meta && meta.exports.length > 0 && (
        <Card className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-base font-bold">Letzte Exporte dieser Firma</h3>
            <Link href="/certiano/exportprotokolle" className="text-sm text-brand underline">
              Alle Exportprotokolle
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2 font-medium">Datum</th>
                  <th className="px-2 py-2 font-medium">Grund</th>
                  <th className="px-2 py-2 font-medium">Export-ID</th>
                  <th className="px-2 py-2 font-medium">Protokoll</th>
                  <th className="px-2 py-2 font-medium">ZIP</th>
                </tr>
              </thead>
              <tbody>
                {meta.exports.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Link
                        href={`/certiano/exportprotokolle/${row.id}`}
                        className="text-brand hover:underline"
                      >
                        {row.createdAt.replace("T", " ").slice(0, 16)}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{row.exportReasonLabel}</td>
                    <td className="px-2 py-2 font-mono text-xs">{row.id}</td>
                    <td className="px-2 py-2">
                      <a
                        href={`/api/superuser/data-exports/${row.id}/protocol`}
                        className="text-brand underline"
                      >
                        PDF
                      </a>
                    </td>
                    <td className="px-2 py-2">
                      {row.fileUrl ? (
                        <a
                          href={`/api/superuser/data-exports/${row.id}/download`}
                          className="text-brand underline"
                        >
                          ZIP
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </CertianoShell>
  );
}
