"use client";

function IconChevronLeft({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function SidebarFooter({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const iconButtonClass =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700";

  const textButtonClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

  return (
    <div
      className={`shrink-0 border-t border-slate-100 ${
        collapsed ? "flex flex-col items-center px-2 py-3" : "p-3"
      }`}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className={`hidden lg:inline-flex ${
          collapsed ? iconButtonClass : textButtonClass
        }`}
        aria-label={collapsed ? "Menü ausklappen" : "Menü einklappen"}
        title={collapsed ? "Menü ausklappen" : "Menü einklappen"}
      >
        <IconChevronLeft className={collapsed ? "rotate-180" : ""} />
        {!collapsed && <span>Menü einklappen</span>}
      </button>
    </div>
  );
}
