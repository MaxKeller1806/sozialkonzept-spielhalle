import Link from "next/link";

export function AdminNav({
  active,
}: {
  active:
    | "firma"
    | "mitarbeiter"
    | "seminare"
    | "inhalte"
    | "feedback"
    | "datenschutz"
    | "konto";
}) {
  const linkClass = (key: typeof active) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition min-h-[44px] inline-flex items-center ${
      active === key
        ? "bg-brand text-white"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`;

  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Administration">
      <Link href="/dashboard/firma" className={linkClass("firma")} aria-current={active === "firma" ? "page" : undefined}>
        Meine Firma
      </Link>
      <Link href="/dashboard" className={linkClass("mitarbeiter")} aria-current={active === "mitarbeiter" ? "page" : undefined}>
        Mitarbeiter
      </Link>
      <Link href="/dashboard/seminare" className={linkClass("seminare")} aria-current={active === "seminare" ? "page" : undefined}>
        Seminare
      </Link>
      <Link href="/dashboard/inhalte" className={linkClass("inhalte")} aria-current={active === "inhalte" ? "page" : undefined}>
        Inhalte
      </Link>
      <Link href="/dashboard/feedback" className={linkClass("feedback")} aria-current={active === "feedback" ? "page" : undefined}>
        Rückmeldungen
      </Link>
      <Link href="/dashboard/datenschutz" className={linkClass("datenschutz")} aria-current={active === "datenschutz" ? "page" : undefined}>
        Datenschutz
      </Link>
      <Link href="/dashboard/konto" className={linkClass("konto")} aria-current={active === "konto" ? "page" : undefined}>
        Mein Konto
      </Link>
    </nav>
  );
}
