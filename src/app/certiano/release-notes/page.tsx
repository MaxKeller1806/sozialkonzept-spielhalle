"use client";

import { useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { ReleaseNotesPage } from "@/components/release-notes-page";
import type { SessionUser } from "@/lib/types";

export default function CertianoReleaseNotesPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.user || d.user.role !== "superuser") {
          window.location.replace(d?.authState?.redirect ?? "/certiano/login");
          return;
        }
        setUser(d.user);
      })
      .catch(() => {
        window.location.replace("/certiano/login");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !user) {
    return (
      <CertianoShell>
        <p className="text-sm text-slate-600">Lädt Release Notes…</p>
      </CertianoShell>
    );
  }

  return (
    <CertianoShell>
      <ReleaseNotesPage role="superuser" userId={user.id} />
    </CertianoShell>
  );
}
