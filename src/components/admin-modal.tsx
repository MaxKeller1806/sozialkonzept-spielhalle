"use client";

import { useAdminPanel } from "@/hooks/use-admin-panel";

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  error?: string;
  saving?: boolean;
  closeLabel?: string;
  /** Tailwind max-width class, default max-w-lg */
  maxWidthClass?: string;
};

export function AdminModal({
  open,
  onClose,
  title,
  children,
  footer,
  error,
  saving = false,
  closeLabel = "Schließen",
  maxWidthClass = "max-w-lg",
}: AdminModalProps) {
  const panelRef = useAdminPanel(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={`relative flex max-h-full w-full flex-col bg-white shadow-2xl max-sm:h-full max-sm:rounded-none sm:max-h-[90vh] sm:rounded-2xl ${maxWidthClass}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 id="admin-modal-title" className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={closeLabel}
            onClick={onClose}
            disabled={saving}
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div
              className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-slate-200 px-5 py-4">
            {footer}
          </footer>
        )}

        {saving && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 max-sm:rounded-none"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow">
              Speichern…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
