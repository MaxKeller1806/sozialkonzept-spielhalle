import {
  IconBadge,
  IconBook,
  IconBuilding,
  IconCertificate,
  IconChart,
  IconDashboard,
  IconMessage,
  IconShield,
  IconTag,
  IconUser,
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
  | "zertifikate"
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
    icon: <IconTag />,
    match: (p) => p.startsWith("/dashboard/mitarbeiterkategorien"),
  },
  {
    href: "/dashboard/verantwortlichkeiten",
    label: "Verantwortlichkeiten",
    icon: <IconBadge />,
    match: (p) => p.startsWith("/dashboard/verantwortlichkeiten"),
  },
  {
    href: "/dashboard/seminare",
    label: "Seminare",
    icon: <IconBook />,
    match: (p) =>
      p.startsWith("/dashboard/seminare") || p.startsWith("/dashboard/inhalte"),
  },
  {
    href: "/dashboard/schulungsstatus",
    label: "Schulungsstatus",
    icon: <IconChart />,
    match: (p) => p.startsWith("/dashboard/schulungsstatus"),
  },
  {
    href: "/dashboard/feedback",
    label: "Rückmeldungen",
    icon: <IconMessage />,
    match: (p) => p.startsWith("/dashboard/feedback"),
  },
  {
    href: "/dashboard/datenschutz",
    label: "Datenschutz",
    icon: <IconShield />,
    match: (p) => p.startsWith("/dashboard/datenschutz"),
  },
  {
    href: "/dashboard/zertifikate",
    label: "Zertifikate & Nachweise",
    icon: <IconCertificate />,
    match: (p) => p.startsWith("/dashboard/zertifikate"),
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
    icon: <IconUser />,
    match: (p) => p.startsWith("/dashboard/konto"),
  },
];

/** @deprecated Layout nutzt Sidebar – nur noch für schrittweise Migration */
export function AdminNav({ active: _active }: { active: AdminNavKey }) {
  return null;
}
