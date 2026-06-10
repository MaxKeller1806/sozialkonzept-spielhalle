"use client";

import Link from "next/link";

type CompanySectionNavProps = {
  companyId: number;
  active: "data" | "branding";
};

const linkClass = (isActive: boolean) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand-light text-brand"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export function CompanySectionNav({ companyId, active }: CompanySectionNavProps) {
  const base = `/certiano/companies/${companyId}`;

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4"
      aria-label="Firma-Bereiche"
    >
      <Link href={base} className={linkClass(active === "data")}>
        Firmendaten
      </Link>
      <Link href={`${base}/branding`} className={linkClass(active === "branding")}>
        Firmenbranding
      </Link>
      <Link href={`${base}/users`} className={linkClass(false)}>
        Benutzer
      </Link>
      <Link href={`${base}/courses`} className={linkClass(false)}>
        Kursfreigaben
      </Link>
    </nav>
  );
}
