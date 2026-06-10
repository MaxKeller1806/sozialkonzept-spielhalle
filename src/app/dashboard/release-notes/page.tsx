"use client";

import { useCallback, useEffect, useState } from "react";
import { ReleaseNotesPage } from "@/components/release-notes-page";
import { fetchAuthMe } from "@/lib/auth-client";
import { Button } from "@/components/ui";
import type { SessionUser } from "@/lib/types";

export default function DashboardReleaseNotesPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const loadAuth = useCallback(() => {
    setLoading(true);
    setServiceError(null);
    fetchAuthMe()
      .then((result) => {
        if (result.status === "unavailable") {
          setServiceError(result.message);
          return;
        }
        if (result.status !== "ok" || result.user.role !== "admin") {
          window.location.replace(
            result.status === "ok"
              ? (result.authState?.redirect ?? "/login")
              : "/login"
          );
          return;
        }
        setUser(result.user);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  if (serviceError) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-slate-600">{serviceError}</p>
        <Button type="button" onClick={loadAuth}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (loading || !user) {
    return <p className="text-sm text-slate-600">Lädt Release Notes…</p>;
  }

  return <ReleaseNotesPage role="admin" userId={user.id} />;
}
