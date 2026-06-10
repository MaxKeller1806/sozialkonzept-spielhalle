"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import {
  getReleaseNotesForRole,
  LATEST_RELEASE_VERSION,
  setLastSeenReleaseVersion,
} from "@/lib/release-notes";
import type { UserRole } from "@/lib/types";

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  superuser:
    "Vollständige Versionshistorie inklusive technischer Änderungen, Migrationen und Infrastruktur.",
  admin:
    "Neue Funktionen, Schulungs- und Zertifikatsänderungen sowie relevante Verbesserungen für Betreiber.",
  employee:
    "Neuerungen zu Schulungen, Zertifikaten, Nachweisen und der Benutzeroberfläche.",
};

export function ReleaseNotesPage({
  role,
  userId,
}: {
  role: UserRole;
  userId: number;
}) {
  const releases = getReleaseNotesForRole(role);

  useEffect(() => {
    setLastSeenReleaseVersion(userId, LATEST_RELEASE_VERSION);
  }, [userId]);

  return (
    <div>
      <PageHeader
        title="Release Notes"
        description={ROLE_DESCRIPTION[role]}
      />

      {releases.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            Aktuell sind keine Release Notes für Ihre Rolle verfügbar.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {releases.map((release) => (
            <Card key={release.version}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {release.version}
                </h2>
                <p className="text-sm text-slate-500">{release.date}</p>
              </div>

              {release.commit ? (
                <p className="mt-1 font-mono text-xs text-slate-400">
                  Commit: {release.commit}
                </p>
              ) : null}

              {release.summary ? (
                <p className="mt-3 text-sm text-slate-600">{release.summary}</p>
              ) : null}

              <div className="mt-5 space-y-5">
                {release.sections.map((section) => (
                  <div key={`${release.version}-${section.title}`}>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {section.title}
                    </h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                      {section.items.map((item) => (
                        <li key={item.text}>{item.text}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
