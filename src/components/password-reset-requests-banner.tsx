"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PASSWORD_RESET_REQUESTS_CHANGED } from "@/lib/password-reset-requests-events";

export function PasswordResetRequestsBanner() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const refreshCount = useCallback(() => {
    fetch("/api/admin/password-reset-requests/count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.count === "number") {
          setCount(d.count);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount, pathname]);

  useEffect(() => {
    const onChanged = () => refreshCount();
    window.addEventListener(PASSWORD_RESET_REQUESTS_CHANGED, onChanged);
    return () =>
      window.removeEventListener(PASSWORD_RESET_REQUESTS_CHANGED, onChanged);
  }, [refreshCount]);

  if (!loaded || count === 0) return null;

  const label =
    count === 1
      ? "Es liegt 1 Passwort-Zurücksetzen-Anfrage vor"
      : `Es liegen ${count} Passwort-Zurücksetzen-Anfragen vor`;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 sm:px-8">
      <Link
        href="/dashboard/passwort-anfragen"
        className="flex items-center justify-center gap-2 text-sm font-medium text-amber-900 transition hover:text-amber-950 hover:underline"
      >
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white"
          aria-hidden="true"
        >
          {count}
        </span>
        {label}
      </Link>
    </div>
  );
}
