"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Button, Card } from "@/components/ui";

type OverviewStats = {
  employees: number | null;
  privacyOpen: number | null;
  privacyAccepted: number | null;
  trainingExpired: number | null;
  trainingDueSoon: number | null;
  trainingNotStarted: number | null;
  companyName: string;
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats>({
    employees: null,
    privacyOpen: null,
    privacyAccepted: null,
    trainingExpired: null,
    trainingDueSoon: null,
    trainingNotStarted: null,
    companyName: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/dashboard-summary", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.summary) return;
        const { summary } = data;
        setStats({
          companyName: summary.companyName ?? "",
          employees: summary.activeEmployees ?? null,
          privacyOpen: summary.privacy?.open ?? null,
          privacyAccepted: summary.privacy?.accepted ?? null,
          trainingExpired: summary.training?.expired ?? null,
          trainingDueSoon: summary.training?.dueSoon ?? null,
          trainingNotStarted: summary.training?.notStarted ?? null,
        });
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const title = stats.companyName
    ? `Dashboard – ${stats.companyName}`
    : "Dashboard";

  return (
    <>
      <PageHeader
        title={title}
        description="Überblick über Mitarbeiter, Schulungsstatus und Datenschutzbestätigungen."
        actions={
          <Link href="/dashboard">
            <Button className="!w-auto">+ Mitarbeiter anlegen</Button>
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-600">Kennzahlen werden geladen…</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Mitarbeiter aktiv"
              value={stats.employees ?? "—"}
            />
            <KpiCard
              label="Schulungen abgelaufen"
              value={stats.trainingExpired ?? "—"}
              accent="red"
            />
            <KpiCard
              label="Bald fällig"
              value={stats.trainingDueSoon ?? "—"}
              accent="orange"
            />
            <KpiCard
              label="Datenschutz offen"
              value={stats.privacyOpen ?? "—"}
              accent={stats.privacyOpen ? "orange" : "green"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-base font-bold text-slate-900">Schulungen</h2>
              <p className="mt-1 text-sm text-slate-600">
                {stats.trainingNotStarted ?? "—"} Mitarbeiter mit offenen
                Schulungen (nicht begonnen).
              </p>
              <div className="mt-4">
                <Link href="/dashboard/schulungsstatus">
                  <Button variant="secondary" className="!w-auto">
                    Schulungsstatus öffnen
                  </Button>
                </Link>
              </div>
            </Card>
            <Card>
              <h2 className="text-base font-bold text-slate-900">Datenschutz</h2>
              <p className="mt-1 text-sm text-slate-600">
                {stats.privacyAccepted ?? "—"} Bestätigungen für die aktuelle
                Version.
              </p>
              <div className="mt-4">
                <Link href="/dashboard/datenschutz">
                  <Button variant="secondary" className="!w-auto">
                    Datenschutzstatus öffnen
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          <Card className="mt-4">
            <h2 className="text-base font-bold text-slate-900">Schnellzugriff</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/dashboard">
                <Button variant="secondary" className="!w-auto">
                  Mitarbeiter verwalten
                </Button>
              </Link>
              <Link href="/dashboard/seminare">
                <Button variant="secondary" className="!w-auto">
                  Seminare
                </Button>
              </Link>
              <Link href="/dashboard/firma">
                <Button variant="secondary" className="!w-auto">
                  Firmendaten
                </Button>
              </Link>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
