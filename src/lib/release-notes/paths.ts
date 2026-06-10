import type { UserRole } from "@/lib/types";

export function releaseNotesPath(role: UserRole): string {
  switch (role) {
    case "superuser":
      return "/certiano/release-notes";
    case "admin":
      return "/dashboard/release-notes";
    case "employee":
      return "/konto/release-notes";
  }
}
