"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

type LocationOption = { id: number; label: string };

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [adminScope, setAdminScope] = useState<"company" | "location">("company");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState<number | "">("");

  const loadSummary = useCallback(async (signal?: AbortSignal) => {
    setLoadState("loading");
    try {
      const qs =
        locationId !== "" ? `?locationId=${encodeURIComponent(String(locationId))}` : "";
      const res = await fetch(`/api/admin/dashboard-summary${qs}`, { signal });
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
      if (data.adminScope) setAdminScope(data.adminScope);
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
  }, [locationId]);

  useEffect(() => {
    fetch("/api/admin/locations?filter=active")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.adminScope) setAdminScope(d.adminScope);
        setLocations(
          (d.locations ?? []).map((loc: { id: number; label: string }) => ({
            id: loc.id,
            label: loc.label,
          }))
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSummary(controller.signal);
    return () => controller.abort();
  }, [loadSummary]);

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

      {adminScope === "company" && locations.length > 0 && (
        <div className="mb-6 max-w-sm">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Standort</span>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={locationId === "" ? "" : String(locationId)}
              onChange={(e) =>
                setLocationId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Gesamte Firma</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

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
              <Link href="/dashboard/standorte">
                <Button variant="secondary" className="!w-auto">
                  Standorte
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
