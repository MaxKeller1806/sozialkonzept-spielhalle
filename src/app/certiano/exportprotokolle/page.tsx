"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Card, ErrorMessage } from "@/components/ui";
import type { CompanyDataExportLogRow } from "@/lib/company-data-export";

export default function ExportProtokollePage() {
  const [rows, setRows] = useState<CompanyDataExportLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/superuser/data-exports");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.replace("/certiano/login");
          return;
        }
        setError(data.error ?? "Exportprotokolle konnten nicht geladen werden.");
        return;
      }
      setRows(data.exports ?? []);
    } catch {
      setError("Netzwerkfehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <CertianoShell>
      <h1 className="mb-2 text-2xl font-bold">Exportprotokolle</h1>
      <p className="mb-6 text-sm text-slate-600">
        Revisionssichere Historie aller Firmen-Datenexporte im Superuser-Bereich.
      </p>

      <ErrorMessage message={error} />

      <Card>
        {loading ? (
          <p className="text-sm text-slate-600">Lädt…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-600">Noch keine Datenexporte protokolliert.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2 font-medium">Datum</th>
                  <th className="px-2 py-2 font-medium">Firma</th>
                  <th className="px-2 py-2 font-medium">Firmenkennung</th>
                  <th className="px-2 py-2 font-medium">Exportiert von</th>
                  <th className="px-2 py-2 font-medium">Exportgrund</th>
                  <th className="px-2 py-2 font-medium">Export-ID</th>
                  <th className="px-2 py-2 font-medium">Protokoll</th>
                  <th className="px-2 py-2 font-medium">Exportdatei</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Link
                        href={`/certiano/exportprotokolle/${row.id}`}
                        className="text-brand hover:underline"
                      >
                        {row.createdAt.replace("T", " ").slice(0, 16)}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{row.companyName}</td>
                    <td className="px-2 py-2 font-mono text-xs">{row.companyCode || "—"}</td>
                    <td className="px-2 py-2">{row.exportedByName ?? "—"}</td>
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
        )}
      </Card>
    </CertianoShell>
  );
}
