import { formatCourseCodeTitle } from "@/lib/course-display";

type CourseTitleDisplayProps = {
  code?: string | null;
  title: string;
  className?: string;
  badgeClassName?: string;
  titleClassName?: string;
};

export function CourseTitleDisplay({
  code,
  title,
  className = "",
  badgeClassName = "rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700",
  titleClassName = "",
}: CourseTitleDisplayProps) {
  const { code: badge, displayTitle } = formatCourseCodeTitle(code, title);

  if (!badge) {
    return <span className={className}>{displayTitle}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <span className={badgeClassName}>{badge}</span>
      <span className={titleClassName}>{displayTitle}</span>
    </span>
  );
}
