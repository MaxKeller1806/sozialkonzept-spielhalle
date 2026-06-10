"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { fetchAuthMe } from "@/lib/auth-client";
import { countUnseenReleases, releaseNotesPath } from "@/lib/release-notes";
import type { SessionUser, UserRole } from "@/lib/types";

type MenuItem =
  | { type: "link"; href: string; label: string; badge?: number }
  | { type: "logout"; label: string };

function menuItems(role: UserRole, userId: number): MenuItem[] {
  const unseenCount = countUnseenReleases(userId, role);
  const releaseNotes: MenuItem = {
    type: "link",
    href: releaseNotesPath(role),
    label: "Release Notes",
    badge: unseenCount > 0 ? unseenCount : undefined,
  };

  switch (role) {
    case "superuser":
      return [
        { type: "link", href: "/certiano/konto", label: "Mein Konto" },
        releaseNotes,
        { type: "link", href: "/certiano", label: "Certiano-Bereich" },
        { type: "logout", label: "Abmelden" },
      ];
    case "admin":
      return [
        { type: "link", href: "/dashboard/konto", label: "Mein Konto" },
        releaseNotes,
        { type: "link", href: "/dashboard/firma", label: "Meine Firma" },
        { type: "link", href: "/dashboard/uebersicht", label: "Dashboard" },
        { type: "logout", label: "Abmelden" },
      ];
    case "employee":
      return [
        { type: "link", href: "/konto", label: "Mein Konto" },
        releaseNotes,
        { type: "link", href: "/schulung", label: "Meine Schulungen" },
        { type: "logout", label: "Abmelden" },
      ];
  }
}

function logoutRedirect(role: UserRole): string {
  return role === "superuser" ? "/certiano/login" : "/login";
}

let sessionUserCache: SessionUser | null | undefined;
let sessionUserFetch: Promise<SessionUser | null> | null = null;

export function clearSessionUserCache(): void {
  sessionUserCache = undefined;
  sessionUserFetch = null;
}

function loadSessionUser(force = false): Promise<SessionUser | null> {
  if (!force && sessionUserCache !== undefined) {
    return Promise.resolve(sessionUserCache);
  }
  if (!force && sessionUserFetch) {
    return sessionUserFetch;
  }
  sessionUserFetch = fetchAuthMe()
    .then((result) => {
      if (result.status === "ok") {
        sessionUserCache = result.user;
        return result.user;
      }
      if (result.status === "unavailable") {
        sessionUserCache = undefined;
        throw new Error(result.message);
      }
      sessionUserCache = result.status === "unauthorized" ? null : undefined;
      return null;
    })
    .catch((err) => {
      if (sessionUserCache === undefined) {
        throw err;
      }
      sessionUserCache = null;
      return null;
    })
    .finally(() => {
      sessionUserFetch = null;
    });
  return sessionUserFetch;
}

function userInitials(user: SessionUser): string {
  const first = user.firstName?.trim().charAt(0) ?? "";
  const last = user.lastName?.trim().charAt(0) ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return user.email.charAt(0).toUpperCase();
}

export function AccountMenu({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const refreshSession = useCallback((force = false) => {
    setServiceError(null);
    loadSessionUser(force)
      .then((u) => {
        if (u) {
          setUser(u);
          setUnseenCount(countUnseenReleases(u.id, u.role));
        }
      })
      .catch((err: Error) => {
        setServiceError(err.message || "Verbindung vorübergehend nicht verfügbar.");
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSessionUser()
      .then((u) => {
        if (!cancelled && u) {
          setUser(u);
          setUnseenCount(countUnseenReleases(u.id, u.role));
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setServiceError(
            err.message || "Verbindung vorübergehend nicht verfügbar."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (open && user) {
      setUnseenCount(countUnseenReleases(user.id, user.role));
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const logout = useCallback(async () => {
    if (!user) return;
    setOpen(false);
    clearSessionUserCache();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace(logoutRedirect(user.role));
  }, [user]);

  if (serviceError) {
    const isDark = variant === "dark";
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span
          className={`text-xs ${isDark ? "text-amber-300" : "text-amber-700"}`}
          title={serviceError}
        >
          Verbindung unterbrochen
        </span>
        <button
          type="button"
          onClick={() => refreshSession(true)}
          className={`rounded-lg border px-2 py-1 text-xs font-medium ${
            isDark
              ? "border-slate-600 text-slate-200 hover:bg-slate-700"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Erneut
        </button>
      </div>
    );
  }

  if (!user) return null;

  const items = menuItems(user.role, user.id);
  const isDark = variant === "dark";

  const buttonClass = isDark
    ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";

  const panelClass = isDark
    ? "border-slate-600 bg-slate-800 text-slate-100 shadow-lg"
    : "border-slate-200 bg-white text-slate-800 shadow-lg";

  const itemClass = isDark
    ? "text-slate-100 hover:bg-slate-700"
    : "text-slate-800 hover:bg-slate-50";

  const dividerClass = isDark ? "border-slate-600" : "border-slate-100";

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        id={`${menuId}-trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${menuId}-menu`}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${buttonClass}`}
      >
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isDark ? "bg-slate-700 text-white" : "bg-brand text-white"
          }`}
          aria-hidden="true"
        >
          {userInitials(user)}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">
          {user.firstName || user.email.split("@")[0]}
        </span>
        {unseenCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white"
            title={`${unseenCount} neue Release${unseenCount === 1 ? "" : "s"}`}
            aria-label={`${unseenCount} neue Releases verfügbar`}
          >
            {unseenCount}
          </span>
        ) : null}
        <svg
          className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          id={`${menuId}-menu`}
          role="menu"
          aria-labelledby={`${menuId}-trigger`}
          className={`absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border ${panelClass}`}
        >
          <div className={`border-b px-4 py-3 ${dividerClass}`}>
            <p className="truncate text-sm font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs opacity-70">{user.email}</p>
          </div>
          <ul className="py-1">
            {items.map((item) => (
              <li key={item.label} role="none">
                {item.type === "link" ? (
                  <Link
                    href={item.href}
                    role="menuitem"
                    className={`flex items-center justify-between gap-2 px-4 py-3 text-sm ${itemClass}`}
                    onClick={() => {
                      setOpen(false);
                      if (item.label === "Release Notes") {
                        setUnseenCount(0);
                      }
                    }}
                  >
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {item.badge} neu
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={`block w-full px-4 py-3 text-left text-sm ${itemClass}`}
                    onClick={logout}
                  >
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
