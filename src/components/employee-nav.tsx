import {
  IconAccount,
  IconCertificates,
  IconDashboard,
  IconSeminars,
} from "@/components/shell/nav-icons";
import type { SidebarNavItem } from "@/components/shell/sidebar-nav";

export const EMPLOYEE_SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    href: "/schulung/uebersicht",
    label: "Dashboard",
    icon: <IconDashboard />,
    match: (p) => p === "/schulung/uebersicht",
  },
  {
    href: "/schulung",
    label: "Meine Schulungen",
    icon: <IconSeminars />,
    match: (p) =>
      p === "/schulung" ||
      p.startsWith("/schulung/modul") ||
      p.startsWith("/schulung/pruefung") ||
      p.startsWith("/schulung/ergebnis") ||
      p.startsWith("/schulung/feedback"),
  },
  {
    href: "/schulung/nachweise",
    label: "Meine Nachweise",
    icon: <IconCertificates />,
    match: (p) => p.startsWith("/schulung/nachweise"),
  },
  {
    href: "/konto",
    label: "Mein Konto",
    icon: <IconAccount />,
    match: (p) => p.startsWith("/konto"),
  },
];
