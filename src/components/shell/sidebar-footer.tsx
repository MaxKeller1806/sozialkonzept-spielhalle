"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { clearSessionUserCache } from "@/components/account-menu";
import type { SessionUser } from "@/lib/types";

function userInitials(user: SessionUser): string {
  const first = user.firstName?.trim().charAt(0) ?? "";
  const last = user.lastName?.trim().charAt(0) ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return user.email.charAt(0).toUpperCase();
}

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

function IconLogout() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`shrink-0 transition ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export type SidebarQuickLink = { href: string; label: string };

export function SidebarFooter({
  collapsed,
  onToggleCollapse,
  quickLinks = [],
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  quickLinks?: SidebarQuickLink[];
}) {
  const menuId = useId();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!userMenuRef.current?.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);

  const logout = useCallback(async () => {
    if (!user) return;
    clearSessionUserCache();
    await fetch("/api/auth/logout", { method: "POST" });
    const redirect =
      user.role === "superuser" ? "/certiano/login" : "/login";
    window.location.replace(redirect);
  }, [user]);

  const iconButtonClass =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700";

  const textButtonClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

  return (
    <div
      className={`shrink-0 border-t border-slate-100 ${
        collapsed ? "flex flex-col items-center gap-1 px-2 py-3" : "space-y-1 p-3"
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

      {user && (
        <button
          type="button"
          onClick={logout}
          className={collapsed ? iconButtonClass : textButtonClass}
          title="Abmelden"
        >
          <IconLogout />
          {!collapsed && <span>Abmelden</span>}
        </button>
      )}

      {user && (
        <div
          ref={userMenuRef}
          className={`relative ${collapsed ? "mt-1" : "pt-1"}`}
        >
          <button
            type="button"
            id={`${menuId}-trigger`}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-controls={`${menuId}-menu`}
            onClick={() => setUserMenuOpen((v) => !v)}
            className={
              collapsed
                ? iconButtonClass
                : "flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-left transition-colors hover:bg-slate-100"
            }
            title={`${user.firstName} ${user.lastName}`}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {userInitials(user)}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {user.email}
                  </span>
                </span>
                <IconChevronDown open={userMenuOpen} />
              </>
            )}
          </button>

          {userMenuOpen && (
            <div
              id={`${menuId}-menu`}
              role="menu"
              aria-labelledby={`${menuId}-trigger`}
              className={`absolute z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${
                collapsed
                  ? "bottom-full left-1/2 mb-2 w-48 -translate-x-1/2"
                  : "bottom-full left-0 right-0 mb-2"
              }`}
            >
              <ul className="py-1">
                {quickLinks.map((link) => (
                  <li key={link.href} role="none">
                    <Link
                      href={link.href}
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
