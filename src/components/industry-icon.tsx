type IndustryIconProps = {
  industryName?: string | null;
  className?: string;
};

function normalizeIndustry(name: string): string {
  return name.trim().toLowerCase();
}

function IconUtensils({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function IconCar({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H10.3a2 2 0 0 0-1.6.9L6 9.5 4.5 10.1C3.7 10.3 3 11.1 3 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconStore({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function IconGraduation({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" />
      <path d="M9 9v0M9 12v0M9 15v0M9 18v0" />
    </svg>
  );
}

const INDUSTRY_ICON_RULES: Array<{
  match: (name: string) => boolean;
  Icon: typeof IconBuilding;
  colorClass: string;
}> = [
  {
    match: (n) => n.includes("gastronom") || n.includes("restaurant") || n.includes("hotel"),
    Icon: IconUtensils,
    colorClass: "text-amber-600",
  },
  {
    match: (n) => n.includes("dienstleist") || n.includes("service") || n.includes("transport"),
    Icon: IconCar,
    colorClass: "text-sky-600",
  },
  {
    match: (n) => n.includes("handel") || n.includes("einzel") || n.includes("retail"),
    Icon: IconStore,
    colorClass: "text-emerald-600",
  },
  {
    match: (n) => n.includes("bildung") || n.includes("schule") || n.includes("campus"),
    Icon: IconGraduation,
    colorClass: "text-violet-600",
  },
];

export function IndustryIcon({ industryName, className = "" }: IndustryIconProps) {
  const normalized = industryName ? normalizeIndustry(industryName) : "";
  const rule =
    INDUSTRY_ICON_RULES.find((entry) => entry.match(normalized)) ?? null;
  const Icon = rule?.Icon ?? IconBuilding;
  const colorClass = rule?.colorClass ?? "text-slate-500";

  return <Icon className={`shrink-0 ${colorClass} ${className}`.trim()} />;
}

export function IndustryLabel({
  industryName,
}: {
  industryName?: string | null;
}) {
  if (!industryName) return <span className="text-slate-400">—</span>;

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <IndustryIcon industryName={industryName} />
      <span className="truncate" title={industryName}>
        {industryName}
      </span>
    </span>
  );
}
