import {
  IconBadge,
  IconBook,
  IconBuilding,
  IconCertificate,
  IconDashboard,
  IconSettings,
  IconUser,
  IconUsers,
} from "@/components/shell/nav-icons";
import type { SidebarNavItem } from "@/components/shell/sidebar-nav";

export function getCertianoSidebarItems(companyId?: number): SidebarNavItem[] {
  const items: SidebarNavItem[] = [
    {
      href: "/certiano/uebersicht",
      label: "Dashboard",
      icon: <IconDashboard />,
      match: (p) => p === "/certiano/uebersicht",
    },
    {
      href: "/certiano",
      label: "Firmen",
      icon: <IconBuilding />,
      match: (p) =>
        p === "/certiano" ||
        (p.startsWith("/certiano/companies") &&
          !p.includes("/courses") &&
          !p.endsWith("/users")),
    },
    {
      href: "/certiano/users",
      label: "Benutzer",
      icon: <IconUsers />,
      match: (p) => p === "/certiano/users",
    },
    {
      href: "/certiano/industries",
      label: "Branchen",
      icon: <IconBook />,
      match: (p) => p.startsWith("/certiano/industries"),
    },
    {
      href: "/certiano/verantwortlichkeiten",
      label: "Verantwortlichkeiten",
      icon: <IconBadge />,
      match: (p) => p.startsWith("/certiano/verantwortlichkeiten"),
    },
    {
      href: "/certiano/hauptthemen",
      label: "Hauptthemen",
      icon: <IconBook />,
      match: (p) => p.startsWith("/certiano/hauptthemen"),
    },
    {
      href: "/certiano/master-courses",
      label: "Seminarverwaltung",
      icon: <IconBook />,
      match: (p) => p.startsWith("/certiano/master-courses"),
    },
    {
      href: "/certiano/zertifikate",
      label: "Zertifikate & Nachweise",
      icon: <IconCertificate />,
      match: (p) => p.startsWith("/certiano/zertifikate"),
    },
    {
      href: "/certiano/einstellungen",
      label: "Plattform-Einstellungen",
      icon: <IconSettings />,
      match: (p) =>
        p.startsWith("/certiano/einstellungen") || p.startsWith("/certiano/branding"),
    },
    {
      href: "/certiano/konto",
      label: "Mein Konto",
      icon: <IconUser />,
      match: (p) => p === "/certiano/konto",
    },
  ];

  if (companyId != null) {
    items.splice(3, 0, {
      href: `/certiano/companies/${companyId}`,
      label: "Firma bearbeiten",
      icon: <IconBuilding />,
      match: (p) => p === `/certiano/companies/${companyId}`,
    });
    items.splice(4, 0, {
      href: `/certiano/companies/${companyId}/users`,
      label: "Benutzer (Firma)",
      icon: <IconUsers />,
      match: (p) =>
        p === `/certiano/companies/${companyId}/users` ||
        (p.endsWith("/users") &&
          p.includes(`/certiano/companies/${companyId}/`)),
    });
  }

  return items;
}

/** @deprecated Layout nutzt Sidebar */
export function CertianoNav({ companyId: _companyId }: { companyId?: number }) {
  return null;
}
