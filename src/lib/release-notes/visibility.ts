import type { UserRole } from "@/lib/types";
import type { ReleaseNoteVisibility } from "./types";

export function isVisibleToRole(
  visibility: ReleaseNoteVisibility,
  role: UserRole
): boolean {
  const roles = Array.isArray(visibility) ? visibility : [visibility];
  return roles.includes(role);
}
