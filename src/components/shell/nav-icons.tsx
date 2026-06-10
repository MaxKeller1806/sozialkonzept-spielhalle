/**
 * Zentrale Navigation-Icons (Lucide) – einheitlich für Certiano, Admin und Mitarbeiter.
 */

import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BadgeCheck,
  BarChart3,
  Building2,
  Factory,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Palette,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Tags,
  UserCircle,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

type NavIconProps = {
  className?: string;
  size?: number;
};

function createNavIcon(Icon: LucideIcon, defaultSize = 18) {
  return function NavIcon({ className, size }: NavIconProps = {}) {
    return <Icon size={size ?? defaultSize} className={className} aria-hidden />;
  };
}

/** Dashboard */
export const IconDashboard = createNavIcon(LayoutDashboard);

/** Firmen / Standorte / Meine Firma */
export const IconBuilding = createNavIcon(Building2);

/** Benutzer / Mitarbeiter */
export const IconUsers = createNavIcon(Users);

/** Branchen */
export const IconIndustries = createNavIcon(Factory);

/** Verantwortlichkeiten */
export const IconResponsibilities = createNavIcon(ShieldCheck);

/** Hauptthemen */
export const IconCourseTopics = createNavIcon(FolderTree);

/** Seminarverwaltung / Seminare / Schulungen */
export const IconSeminars = createNavIcon(GraduationCap);

/** Zertifikate & Nachweise */
export const IconCertificates = createNavIcon(BadgeCheck);

/** Exportprotokolle / Datenexport / Audit-Export */
export const IconExport = createNavIcon(Archive);

/** Plattform-Einstellungen / Einstellungen */
export const IconSettings = createNavIcon(Settings);

/** Mein Konto / Profil */
export const IconAccount = createNavIcon(UserCircle);

/** Release Notes / Versionshinweise */
export const IconReleaseNotes = createNavIcon(ScrollText);

/** Admin: Mitarbeiterkategorien */
export const IconEmployeeCategories = createNavIcon(Tags);

/** Admin: Schulungsstatus */
export const IconTrainingStatus = createNavIcon(BarChart3);

/** Admin: Rückmeldungen */
export const IconFeedback = createNavIcon(MessageSquare);

/** Admin: Datenschutz */
export const IconPrivacy = createNavIcon(Shield);

/** Firmenbranding */
export const IconBranding = createNavIcon(Palette);

/** @deprecated Nutze IconSeminars */
export const IconBook = IconSeminars;

/** @deprecated Nutze IconCertificates */
export const IconCertificate = IconCertificates;

/** @deprecated Nutze IconExport */
export const IconDownload = IconExport;

/** @deprecated Nutze IconAccount */
export const IconUser = IconAccount;

/** @deprecated Nutze IconResponsibilities */
export const IconBadge = IconResponsibilities;

/** @deprecated Nutze IconTrainingStatus */
export const IconChart = IconTrainingStatus;

/** @deprecated Nutze IconFeedback */
export const IconMessage = IconFeedback;

/** @deprecated Nutze IconPrivacy */
export const IconShield = IconPrivacy;

/** @deprecated Nutze IconEmployeeCategories */
export const IconTag = IconEmployeeCategories;

/** @deprecated Nutze IconBranding */
export const IconPalette = IconBranding;

/** @deprecated Nutze IconSeminars */
export const IconGraduation = IconSeminars;

/** Schlüssel → Lucide-Icon für Navigation */
export const NAV_ICON_MAP = {
  dashboard: LayoutDashboard,
  companies: Building2,
  users: Users,
  industries: Factory,
  responsibilities: ShieldCheck,
  courseTopics: FolderTree,
  seminars: GraduationCap,
  certificates: BadgeCheck,
  export: Archive,
  settings: Settings,
  account: UserCircle,
  releaseNotes: ScrollText,
} as const;

export type NavIconArea = keyof typeof NAV_ICON_MAP;

/** Icon-Komponente anhand des Nav-Bereichs rendern */
export function NavIconByArea({
  area,
  className,
  size = 18,
}: {
  area: NavIconArea;
  className?: string;
  size?: number;
}): ReactNode {
  const Icon = NAV_ICON_MAP[area];
  return <Icon size={size} className={className} aria-hidden />;
}
