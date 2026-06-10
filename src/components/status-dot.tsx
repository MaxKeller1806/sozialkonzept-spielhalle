import type { ReactNode } from "react";
import { Fragment } from "react";

type StatusDotProps = {
  className?: string;
  title: string;
};

export function StatusDot({ className = "bg-slate-400", title }: StatusDotProps) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
      role="img"
      aria-label={title}
      title={title}
    />
  );
}

export type LegendItem = {
  dotClass: string;
  label: string;
};

export type LegendGroup = {
  title: string;
  items: LegendItem[];
  /** Optionales Icon vor dem Gruppentitel (z. B. Schlüssel bei Lizenz). */
  titleIcon?: ReactNode;
};

export type LegendIconHint = {
  icon: ReactNode;
  label: string;
};

function LegendDivider() {
  return (
    <span
      className="mx-1 hidden h-3.5 w-px shrink-0 bg-slate-200 sm:inline-block"
      aria-hidden
    />
  );
}

export function TableLegendBar({
  groups,
  iconHints = [],
}: {
  groups: LegendGroup[];
  iconHints?: LegendIconHint[];
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs text-slate-600">
        {groups.map((group, groupIndex) => (
          <Fragment key={group.title}>
            {groupIndex > 0 ? <LegendDivider /> : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                {group.titleIcon ? (
                  <span className="text-slate-400" aria-hidden>
                    {group.titleIcon}
                  </span>
                ) : null}
                {group.title}:
              </span>
              {group.items.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <StatusDot className={item.dotClass} title={item.label} />
                  {item.label}
                </span>
              ))}
            </div>
          </Fragment>
        ))}
        {iconHints.length > 0 ? (
          <>
            <LegendDivider />
            {iconHints.map((hint) => (
              <span
                key={hint.label}
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-500"
              >
                <span className="text-slate-400" aria-hidden>
                  {hint.icon}
                </span>
                {hint.label}
              </span>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
