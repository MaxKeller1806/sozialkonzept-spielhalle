"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Button, Card } from "@/components/ui";

type OverviewStats = {
  employees: number;
  privacyOpen: number;
  privacyAccepted: number;
  trainingExpired: number;
  trainingDueSoon: number;
  trainingNotStarted: number;
  companyName: string;
};

type LoadState = "loading" | "ok" | "error";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/admin/dashboard-summary", {
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Kennzahlen konnten nicht geladen werden."
          );
        }
        if (!data.summary) {
          throw new Error("Kennzahlen konnten nicht geladen werden.");
        }
        const { summary } = data;
        setStats({
          companyName: summary.companyName ?? "",
          employees: Number(summary.activeEmployees ?? 0),
          privacyOpen: Number(summary.privacy?.open ?? 0),
          privacyAccepted: Number(summary.privacy?.accepted ?? 0),
          trainingExpired: Number(summary.training?.expired ?? 0),
          trainingDueSoon: Number(summary.training?.dueSoon ?? 0),
          trainingNotStarted: Number(summary.training?.notStarted ?? 0),
        });
        setErrorMessage("");
        setLoadState("ok");
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setStats(null);
        setLoadState("error");
        setErrorMessage(
          e instanceof Error
            ? e.message
            : "Kennzahlen konnten nicht geladen werden."
        );
      }
    })();

    return () => controller.abort();
  }, []);

  const title = stats?.companyName
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

      {loadState === "loading" && (
        <p className="text-sm text-slate-600">Kennzahlen werden geladen…</p>
      )}

      {loadState === "error" && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage || "Kennzahlen konnten nicht geladen werden."}
        </div>
      )}

      {loadState === "ok" && stats && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Mitarbeiter aktiv" value={stats.employees} />
            <KpiCard
              label="Schulungen abgelaufen"
              value={stats.trainingExpired}
              accent="red"
            />
            <KpiCard
              label="Bald fällig"
              value={stats.trainingDueSoon}
              accent="orange"
            />
            <KpiCard
              label="Datenschutz offen"
              value={stats.privacyOpen}
              accent={stats.privacyOpen > 0 ? "orange" : "green"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-base font-bold text-slate-900">Schulungen</h2>
              <p className="mt-1 text-sm text-slate-600">
                {stats.trainingNotStarted} Mitarbeiter mit offenen Schulungen
                (nicht begonnen).
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
                {stats.privacyAccepted} Bestätigungen für die aktuelle Version.
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
