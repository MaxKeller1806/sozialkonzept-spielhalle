import { CertianoShell } from "@/components/certiano-shell";
import Link from "next/link";

export default function VerantwortlichkeitenInfoPage() {
  return (
    <CertianoShell>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900">Verantwortlichkeiten</h1>
        <p className="mt-3 text-sm text-slate-600">
          Verantwortliche Personen werden nicht mehr als globale Stammdaten im
          Superuser-Bereich gepflegt. Jedes Seminar in einer Firma ist die
          fachliche Verantwortlichkeit — Firmen-Admins legen pro Seminar eine
          oder mehrere verantwortliche Mitarbeiter fest.
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Beispiel</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Hauptthema Sicherheitskonzept → Seminar „N7 Verhalten bei einem Überfall“</li>
            <li>Verantwortliche: Max Mustermann, Maria Musterfrau</li>
          </ul>
        </div>
        <p className="mt-6 text-sm text-slate-600">
          Die Pflege erfolgt im Admin-Bereich der jeweiligen Firma unter{" "}
          <Link href="/dashboard/verantwortlichkeiten" className="text-brand hover:underline">
            Verantwortlichkeiten
          </Link>
          .
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Bestehende globale Verantwortungstypen bleiben in der Datenbank erhalten,
          werden aber nicht mehr aktiv verwendet. Zuordnungen wurden — wo möglich —
          auf passende Seminare übertragen.
        </p>
      </div>
    </CertianoShell>
  );
}
