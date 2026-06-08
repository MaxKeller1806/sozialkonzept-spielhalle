import { Card } from "@/components/ui";

export function KpiCard({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "green" | "orange" | "red" | "muted";
}) {
  const valueClass =
    accent === "green"
      ? "text-emerald-700"
      : accent === "orange"
        ? "text-orange-700"
        : accent === "red"
          ? "text-red-700"
          : accent === "muted"
            ? "text-slate-600"
            : "text-slate-900";

  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueClass}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}
