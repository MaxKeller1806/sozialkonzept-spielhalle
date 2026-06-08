"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card } from "@/components/ui";

type CertificateRow = {
  id: number;
  certificateNumber: string;
  courseTitle: string;
  issuedAt: string;
  validUntil: string | null;
  pdfUrl: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "Unbegrenzt gültig";
  return new Date(iso).toLocaleDateString("de-DE");
}

export default function EmployeeCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateRow[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/training/certificates")
      .then((r) => {
        if (r.status === 401) {
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
        setCertificates(Array.isArray(data.certificates) ? data.certificates : []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        setCertificates([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Meine Nachweise"
        description="Ihre ausgestellten Zertifikate und Schulungsnachweise."
      />

      {loading ? (
        <p className="text-sm text-slate-600">Nachweise werden geladen…</p>
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        </Card>
      ) : certificates && certificates.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            Sie besitzen derzeit noch keine Zertifikate oder Nachweise.
          </p>
          <div className="mt-4">
            <Link href="/schulung">
              <Button variant="secondary" className="!w-auto">
                Zu meinen Schulungen
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Titel</th>
                  <th className="px-4 py-3 font-medium">Zertifikatsnummer</th>
                  <th className="px-4 py-3 font-medium">Ausstellungsdatum</th>
                  <th className="px-4 py-3 font-medium">Gültig bis</th>
                  <th className="px-4 py-3 font-medium">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificates?.map((cert) => (
                  <tr key={cert.id} className="text-slate-800">
                    <td className="px-4 py-3 font-medium">{cert.courseTitle}</td>
                    <td className="px-4 py-3">{cert.certificateNumber}</td>
                    <td className="px-4 py-3">{formatDate(cert.issuedAt)}</td>
                    <td className="px-4 py-3">{formatDate(cert.validUntil)}</td>
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
      )}
    </>
  );
}
