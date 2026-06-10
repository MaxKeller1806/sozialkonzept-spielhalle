import {
  IconBuilding,
  IconDashboard,
  IconExport,
  IconFeedback,
  IconPrivacy,
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

const MITARBEITER_PATHS =
  (p: string) =>
    p === "/dashboard" ||
    p.startsWith("/dashboard/mitarbeiterkategorien") ||
    p.startsWith("/dashboard/verantwortlichkeiten");

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
    match: MITARBEITER_PATHS,
    children: [
      {
        href: "/dashboard",
        label: "Mitarbeiter",
        match: (p) => p === "/dashboard",
      },
      {
        href: "/dashboard/mitarbeiterkategorien",
        label: "Mitarbeiterkategorien",
        match: (p) => p.startsWith("/dashboard/mitarbeiterkategorien"),
      },
      {
        href: "/dashboard/verantwortlichkeiten",
        label: "Verantwortlichkeiten",
        match: (p) => p.startsWith("/dashboard/verantwortlichkeiten"),
      },
    ],
  },
  {
    href: "/dashboard/schulungsstatus",
    label: "Schulungsstatus",
    icon: <IconTrainingStatus />,
    match: (p) => p.startsWith("/dashboard/schulungsstatus"),
  },
  {
    href: "/dashboard/seminare",
    label: "Seminare",
    icon: <IconSeminars />,
    match: (p) =>
      p.startsWith("/dashboard/seminare") || p.startsWith("/dashboard/inhalte"),
  },
  {
    href: "/dashboard/firma",
    label: "Meine Firma",
    icon: <IconBuilding />,
    match: (p) =>
      p.startsWith("/dashboard/firma") || p.startsWith("/dashboard/lizenz"),
  },
  {
    href: "/dashboard/standorte",
    label: "Standorte",
    icon: <IconBuilding />,
    match: (p) => p.startsWith("/dashboard/standorte"),
  },
  {
    href: "/dashboard/audit-export",
    label: "Audit-Export",
    icon: <IconExport />,
    match: (p) => p.startsWith("/dashboard/audit-export"),
  },
  {
    href: "/dashboard/datenschutz",
    label: "Datenschutz",
    icon: <IconPrivacy />,
    match: (p) => p.startsWith("/dashboard/datenschutz"),
  },
  {
    href: "/dashboard/feedback",
    label: "Rückmeldungen",
    icon: <IconFeedback />,
    match: (p) => p.startsWith("/dashboard/feedback"),
  },
];

/** @deprecated Layout nutzt Sidebar – nur noch für schrittweise Migration */
export function AdminNav({ active: _active }: { active: AdminNavKey }) {
  return null;
}
