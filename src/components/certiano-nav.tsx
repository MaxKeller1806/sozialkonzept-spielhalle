import {
  IconAccount,
  IconBuilding,
  IconCertificates,
  IconCompliance,
  IconCourseTopics,
  IconDashboard,
  IconExport,
  IconIndustries,
  IconResponsibilities,
  IconSeminars,
  IconSettings,
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
      icon: <IconIndustries />,
      match: (p) => p.startsWith("/certiano/industries"),
    },
    {
      href: "/certiano/verantwortlichkeiten",
      label: "Verantwortlichkeiten",
      icon: <IconResponsibilities />,
      match: (p) => p.startsWith("/certiano/verantwortlichkeiten"),
    },
    {
      href: "/certiano/hauptthemen",
      label: "Hauptthemen",
      icon: <IconCourseTopics />,
      match: (p) => p.startsWith("/certiano/hauptthemen"),
    },
    {
      href: "/certiano/master-courses",
      label: "Seminarverwaltung",
      icon: <IconSeminars />,
      match: (p) => p.startsWith("/certiano/master-courses"),
    },
    {
      href: "/certiano/zertifikate",
      label: "Zertifikate & Nachweise",
      icon: <IconCertificates />,
      match: (p) => p.startsWith("/certiano/zertifikate"),
    },
    {
      href: "/certiano/exportprotokolle",
      label: "Exportprotokolle",
      icon: <IconExport />,
      match: (p) => p.startsWith("/certiano/exportprotokolle"),
    },
    {
      href: "/certiano/compliance-nachweise",
      label: "Compliance & Nachweise",
      icon: <IconCompliance />,
      match: (p) => p.startsWith("/certiano/compliance-nachweise"),
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
      icon: <IconAccount />,
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
