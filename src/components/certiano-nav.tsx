import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/certiano", label: "Firmen", match: (p: string) => p === "/certiano" },
  {
    href: "/certiano/master-courses",
    label: "Seminarverwaltung",
    match: (p: string) => p.startsWith("/certiano/master-courses"),
  },
  {
    href: "/certiano/branding",
    label: "Branding",
    match: (p: string) => p.startsWith("/certiano/branding"),
  },
];

export function CertianoNav({ companyId }: { companyId?: number }) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2" aria-label="Certiano">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            l.match(pathname)
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          }`}
        >
          {l.label}
        </Link>
      ))}
      {companyId != null && (
        <>
          <Link
            href={`/certiano/companies/${companyId}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              pathname === `/certiano/companies/${companyId}`
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            Firma bearbeiten
          </Link>
          <Link
            href={`/certiano/companies/${companyId}/users`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              pathname.endsWith("/users")
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            Benutzer
          </Link>
          <Link
            href={`/certiano/companies/${companyId}/courses`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              pathname.endsWith("/courses")
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            Kursfreigaben
          </Link>
        </>
      )}
    </nav>
  );
}
