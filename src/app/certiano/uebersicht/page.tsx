"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import type { CompanySummaryRow } from "@/lib/tenant";

type DashboardStats = {
  companiesTotal: number | null;
  companiesActive: number | null;
  usersTotal: number | null;
  seminarsTotal: number | null;
  openLicenses: number | null;
  recentCompanies: CompanySummaryRow[];
};

function CertianoOverviewContent() {
  const [stats, setStats] = useState<DashboardStats>({
    companiesTotal: null,
    companiesActive: null,
    usersTotal: null,
    seminarsTotal: null,
    openLicenses: null,
    recentCompanies: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(
        "/api/superuser/companies?pageSize=200&sortBy=createdAt&sortDirection=desc"
      ).then((r) => {
        if (r.status === 401) {
          window.location.replace("/certiano/login");
          return null;
        }
        return r.ok ? r.json() : null;
      }),
      fetch("/api/superuser/users?pageSize=1").then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/superuser/master-courses").then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([allCompanies, users, masters]) => {
        const companyRows: CompanySummaryRow[] = allCompanies?.companies ?? [];
        const openLicenses = companyRows.filter(
          (c) => c.licenseStatus !== "active"
        ).length;
        const activeCompanies = companyRows.filter(
          (c) => c.status === "active"
        ).length;

        setStats({
          companiesTotal: allCompanies?.meta?.total ?? companyRows.length,
          companiesActive: activeCompanies,
          usersTotal: users?.total ?? null,
          seminarsTotal: Array.isArray(masters?.courses)
            ? masters.courses.length
            : null,
          openLicenses,
          recentCompanies: companyRows.slice(0, 5),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Plattformüberblick für den Certiano-Betreiberbereich."
      />

      {loading ? (
        <p className="text-sm text-slate-600">Kennzahlen werden geladen…</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Firmen gesamt" value={stats.companiesTotal ?? "—"} />
            <KpiCard
              label="Aktive Firmen"
              value={stats.companiesActive ?? "—"}
              accent="green"
            />
            <KpiCard label="Benutzer gesamt" value={stats.usersTotal ?? "—"} />
            <KpiCard label="Seminare gesamt" value={stats.seminarsTotal ?? "—"} />
            <KpiCard
              label="Offene Lizenzen"
              value={stats.openLicenses ?? "—"}
              accent={stats.openLicenses ? "orange" : "green"}
            />
          </div>

          <Card>
            <h2 className="text-base font-bold text-slate-900">Letzte Firmen</h2>
            {stats.recentCompanies.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">Keine Firmen vorhanden.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {stats.recentCompanies.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c.status === "active" ? "Aktiv" : "Inaktiv"} ·{" "}
                        {c.licenseStatus === "active"
                          ? "Lizenz aktiv"
                          : "Lizenz offen"}
                      </p>
                    </div>
                    <Link
                      href={`/certiano/companies/${c.id}`}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      Öffnen
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Link
                href="/certiano"
                className="text-sm font-medium text-brand hover:underline"
              >
                Alle Firmen anzeigen
              </Link>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

export default function CertianoOverviewPage() {
  return (
    <CertianoShell>
      <CertianoOverviewContent />
    </CertianoShell>
  );
}
