import Link from "next/link";

export type CourseBreadcrumbItem = {
  label: string;
  href?: string;
};

export function CourseBreadcrumb({ items }: { items: CourseBreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
            {index > 0 && (
              <span className="text-slate-400 select-none" aria-hidden="true">
                /
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="text-brand hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-800" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
