import type { UserRole } from "@/lib/types";
import { getReleaseNotesForRole } from "./filter";
import { LATEST_RELEASE_VERSION } from "./data";
import { compareVersions } from "./version";

const STORAGE_PREFIX = "certiano_release_notes_seen_";

function storageKey(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

/**
 * MVP: last-seen release version per user in localStorage.
 * TODO: Persist last_seen_release_version on user record in DB for cross-device sync.
 */
export function getLastSeenReleaseVersion(userId: number): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function setLastSeenReleaseVersion(
  userId: number,
  version: string = LATEST_RELEASE_VERSION
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), version);
  } catch {
    // ignore quota / private mode
  }
}

export function countUnseenReleases(
  userId: number,
  role: UserRole
): number {
  const lastSeen = getLastSeenReleaseVersion(userId);
  const releases = getReleaseNotesForRole(role);

  if (!lastSeen) {
    return releases.length;
  }

  return releases.filter(
    (release) => compareVersions(release.version, lastSeen) > 0
  ).length;
}

export function hasUnseenReleases(
  userId: number,
  role: UserRole
): boolean {
  return countUnseenReleases(userId, role) > 0;
}
