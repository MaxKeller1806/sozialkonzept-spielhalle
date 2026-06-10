import type { ReactNode } from "react";

type UiBadgeProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

export function UiBadge({ children, className = "", title }: UiBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`.trim()}
      title={title}
    >
      {children}
    </span>
  );
}
