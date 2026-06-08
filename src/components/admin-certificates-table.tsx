"use client";

import { useEffect, useState } from "react";
import { Card, StatusDot } from "@/components/ui";

type AdminCertificateRow = {
  id: number;
  employeeName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  validUntil: string | null;
  status: "green" | "yellow" | "red";
  statusLabel: string;
  pdfUrl: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "Unbegrenzt gültig";
  return new Date(iso).toLocaleDateString("de-DE");
}

export function AdminCertificatesTable() {
  const [certificates, setCertificates] = useState<AdminCertificateRow[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/certificates")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          window.location.replace("/login");
          return null;
        }
        if (!r.ok) {
          return r.json().then((d) => {
            throw new Error(d.error ?? "Laden fehlgeschlagen.");
          });
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setCertificates(
          Array.isArray(data.certificates) ? data.certificates : []
        );
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        setCertificates([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-600">Nachweise werden geladen…</p>;
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      </Card>
    );
  }

  if (!certificates || certificates.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          Für Ihre Firma liegen derzeit keine Zertifikate oder Nachweise vor.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Mitarbeiter</th>
              <th className="px-4 py-3 font-medium">Dokumententitel</th>
              <th className="px-4 py-3 font-medium">Zertifikatsnummer</th>
              <th className="px-4 py-3 font-medium">Ausstellungsdatum</th>
              <th className="px-4 py-3 font-medium">Gültig bis</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {certificates.map((cert) => (
              <tr key={cert.id} className="text-slate-800">
                <td className="px-4 py-3 font-medium">{cert.employeeName}</td>
                <td className="px-4 py-3">{cert.courseTitle}</td>
                <td className="px-4 py-3">{cert.certificateNumber}</td>
                <td className="px-4 py-3">{formatDate(cert.issuedAt)}</td>
                <td className="px-4 py-3">{formatDate(cert.validUntil)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <StatusDot status={cert.status} />
                    {cert.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={cert.pdfUrl}
                    className="font-medium text-brand hover:underline"
                  >
                    PDF herunterladen
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
