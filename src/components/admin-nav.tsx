import Link from "next/link";

export function AdminNav({
  active,
}: {
  active: "mitarbeiter" | "inhalte" | "feedback";
}) {
  const linkClass = (key: typeof active) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition min-h-[44px] inline-flex items-center ${
      active === key
        ? "bg-brand text-white"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`;

  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Administration">
      <Link
        href="/dashboard"
        className={linkClass("mitarbeiter")}
        aria-current={active === "mitarbeiter" ? "page" : undefined}
      >
        Mitarbeiter
      </Link>
      <Link
        href="/dashboard/inhalte"
        className={linkClass("inhalte")}
        aria-current={active === "inhalte" ? "page" : undefined}
      >
        Kursinhalte
      </Link>
      <Link
        href="/dashboard/feedback"
        className={linkClass("feedback")}
        aria-current={active === "feedback" ? "page" : undefined}
      >
        Rückmeldungen
      </Link>
    </nav>
  );
}
