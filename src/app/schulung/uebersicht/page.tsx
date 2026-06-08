"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Button, Card } from "@/components/ui";

type CourseSummary = {
  id: string;
  title: string;
  inProgress?: boolean;
  seminarStatus?: string;
  certificate?: {
    status: "green" | "yellow" | "red";
    validUntil: string | null;
  } | null;
};

export default function EmployeeOverviewPage() {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/training")
      .then((r) => {
        if (r.status === 401) {
          window.location.replace("/login");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        setCourses(Array.isArray(d?.courses) ? d.courses : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const list = courses ?? [];
    let open = 0;
    let completed = 0;
    let validCerts = 0;
    let nextDue: string | null = null;

    for (const c of list) {
      const cert = c.certificate;
      const isCompleted =
        cert != null ||
        c.seminarStatus === "completed" ||
        c.seminarStatus === "valid";
      if (isCompleted) {
        completed += 1;
        if (cert?.status === "green") validCerts += 1;
        if (cert?.validUntil) {
          if (!nextDue || cert.validUntil < nextDue) {
            nextDue = cert.validUntil;
          }
        }
      } else {
        open += 1;
      }
    }

    return { open, completed, validCerts, nextDue };
  }, [courses]);

  const openCourses = (courses ?? []).filter((c) => {
    const cert = c.certificate;
    return !(
      cert != null ||
      c.seminarStatus === "completed" ||
      c.seminarStatus === "valid"
    );
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Überblick über Ihre Schulungen und Nachweise."
      />

      {loading ? (
        <p className="text-sm text-slate-600">Kennzahlen werden geladen…</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Offene Schulungen" value={stats.open} accent="orange" />
            <KpiCard label="Abgeschlossen" value={stats.completed} accent="green" />
            <KpiCard label="Gültige Nachweise" value={stats.validCerts} accent="green" />
            <KpiCard
              label="Nächste Fälligkeit"
              value={
                stats.nextDue
                  ? new Date(stats.nextDue).toLocaleDateString("de-DE")
                  : "—"
              }
            />
          </div>

          <Card>
            <h2 className="text-base font-bold text-slate-900">
              Offene Schulungen
            </h2>
            {openCourses.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                Keine offenen Schulungen – alles erledigt.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {openCourses.slice(0, 5).map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 px-4 py-3"
                  >
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <Link href={`/schulung?courseId=${encodeURIComponent(c.id)}`}>
                      <Button className="!w-auto">
                        {c.inProgress ? "Fortsetzen" : "Starten"}
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/schulung">
                <Button variant="secondary" className="!w-auto">
                  Alle Schulungen
                </Button>
              </Link>
              <Link href="/schulung/nachweise">
                <Button variant="secondary" className="!w-auto">
                  Meine Nachweise
                </Button>
              </Link>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
