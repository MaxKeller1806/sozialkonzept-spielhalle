"use client";

import { useEffect, useState } from "react";
import { ReleaseNotesPage } from "@/components/release-notes-page";
import type { SessionUser } from "@/lib/types";

export default function DashboardReleaseNotesPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.user || d.user.role !== "admin") {
          window.location.replace(d?.authState?.redirect ?? "/login");
          return;
        }
        setUser(d.user);
      })
      .catch(() => {
        window.location.replace("/login");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !user) {
    return <p className="text-sm text-slate-600">Lädt Release Notes…</p>;
  }

  return <ReleaseNotesPage role="admin" userId={user.id} />;
}
