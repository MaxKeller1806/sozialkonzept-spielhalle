import {
  IconAccount,
  IconBuilding,
  IconDashboard,
  IconEmployeeCategories,
  IconExport,
  IconFeedback,
  IconPrivacy,
  IconResponsibilities,
  IconSeminars,
  IconTrainingStatus,
  IconUsers,
} from "@/components/shell/nav-icons";
import type { SidebarNavItem } from "@/components/shell/sidebar-nav";

export type AdminNavKey =
  | "dashboard"
  | "firma"
  | "mitarbeiter"
  | "kategorien"
  | "verantwortlichkeiten"
  | "seminare"
  | "schulungsstatus"
  | "feedback"
  | "datenschutz"
  | "audit-export"
  | "konto";

export const ADMIN_SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    href: "/dashboard/uebersicht",
    label: "Dashboard",
    icon: <IconDashboard />,
    match: (p) => p === "/dashboard/uebersicht",
  },
  {
    href: "/dashboard",
    label: "Mitarbeiter",
    icon: <IconUsers />,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/dashboard/mitarbeiterkategorien",
    label: "Mitarbeiterkategorien",
    icon: <IconEmployeeCategories />,
    match: (p) => p.startsWith("/dashboard/mitarbeiterkategorien"),
  },
  {
    href: "/dashboard/verantwortlichkeiten",
    label: "Verantwortlichkeiten",
    icon: <IconResponsibilities />,
    match: (p) => p.startsWith("/dashboard/verantwortlichkeiten"),
  },
  {
    href: "/dashboard/seminare",
    label: "Seminare",
    icon: <IconSeminars />,
    match: (p) =>
      p.startsWith("/dashboard/seminare") || p.startsWith("/dashboard/inhalte"),
  },
  {
    href: "/dashboard/schulungsstatus",
    label: "Schulungsstatus",
    icon: <IconTrainingStatus />,
    match: (p) => p.startsWith("/dashboard/schulungsstatus"),
  },
  {
    href: "/dashboard/feedback",
    label: "Rückmeldungen",
    icon: <IconFeedback />,
    match: (p) => p.startsWith("/dashboard/feedback"),
  },
  {
    href: "/dashboard/datenschutz",
    label: "Datenschutz",
    icon: <IconPrivacy />,
    match: (p) => p.startsWith("/dashboard/datenschutz"),
  },
  {
    href: "/dashboard/audit-export",
    label: "Audit-Export",
    icon: <IconExport />,
    match: (p) => p.startsWith("/dashboard/audit-export"),
  },
  {
    href: "/dashboard/standorte",
    label: "Standorte",
    icon: <IconBuilding />,
    match: (p) => p.startsWith("/dashboard/standorte"),
  },
  {
    href: "/dashboard/firma",
    label: "Meine Firma",
    icon: <IconBuilding />,
    match: (p) =>
      p.startsWith("/dashboard/firma") || p.startsWith("/dashboard/lizenz"),
  },
  {
    href: "/dashboard/konto",
    label: "Mein Konto",
    icon: <IconAccount />,
    match: (p) => p.startsWith("/dashboard/konto"),
  },
];

/** @deprecated Layout nutzt Sidebar – nur noch für schrittweise Migration */
export function AdminNav({ active: _active }: { active: AdminNavKey }) {
  return null;
}
