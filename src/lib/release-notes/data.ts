import type { ReleaseNote } from "./types";

/**
 * Structured release notes – single source of truth.
 * Filtered per role at render time via getReleaseNotesForRole().
 */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "V2.5.0",
    date: "10.06.2026",
    commit: "df78400",
    summary:
      "Verantwortlichkeiten in Zertifikaten, zweizeiliger Header, einheitliches Certiano-Logo.",
    sections: [
      {
        title: "Verantwortlichkeiten & Zertifikate",
        category: "features",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Firmenweite „Verantwortliche Person“ in „Meine Firma“ entfernt – Verantwortlichkeiten pro Thema unter „Verantwortlichkeiten“ bleiben zentral.",
            visibility: ["superuser", "admin"],
          },
          {
            text: "Neue Platzhalter in Zertifikats- und Nachweisvorlagen: {{responsible_person}}, {{responsibility_name}}, {{responsible_email}} – aufgelöst aus Verantwortlichkeiten zum Kurs-Hauptthema.",
            visibility: ["superuser", "admin", "employee"],
          },
        ],
      },
      {
        title: "Header & Navigation",
        category: "ui",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Topbar mit zwei Zeilen: Kontextname (Firma bzw. Certiano Campus) und Portalname darunter.",
            visibility: ["superuser", "admin", "employee"],
          },
          {
            text: "Globale Suchleiste im Betreiberportal entfernt.",
            visibility: ["superuser", "admin"],
          },
        ],
      },
      {
        title: "Branding & Logo",
        category: "ui",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Sidebar in Betreiber- und Mitarbeiterportal zeigt das Certiano-Logo (Operator-Branding).",
            visibility: ["superuser", "admin", "employee"],
          },
          {
            text: "Firmenlogo-Upload vorübergehend deaktiviert – Hinweis auf zukünftige Version.",
            visibility: ["superuser", "admin"],
          },
        ],
      },
    ],
  },
  {
    version: "V2.4.0",
    date: "10.06.2026",
    summary:
      "Rollenbasierte Release Notes im Benutzermenü für alle Portale.",
    sections: [
      {
        title: "Release Notes (neu)",
        category: "features",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Neuer Menüpunkt „Release Notes“ im Benutzermenü (oben rechts) zwischen „Mein Konto“ und „Abmelden“.",
            visibility: ["superuser", "admin", "employee"],
          },
          {
            text: "Entwicklerportal: vollständige technische Versionshistorie inkl. Migrationen und Infrastruktur.",
            visibility: ["superuser"],
          },
          {
            text: "Betreiberportal: gefilterte Hinweise zu neuen Funktionen, Schulungen, Zertifikaten und Verbesserungen.",
            visibility: ["admin"],
          },
          {
            text: "Mitarbeiterportal: nur relevante Neuerungen zu Schulungen, Zertifikaten, Nachweisen und Oberfläche.",
            visibility: ["employee"],
          },
          {
            text: "Benachrichtigungs-Badge bei neuen Versionen seit dem letzten Besuch (lokal pro Benutzer, localStorage-MVP).",
            visibility: ["superuser", "admin", "employee"],
          },
        ],
      },
      {
        title: "Technische Umsetzung",
        category: "technical",
        visibility: ["superuser"],
        items: [
          {
            text: "Strukturierte Daten in src/lib/release-notes/ mit Sichtbarkeits-Tags pro Eintrag.",
            visibility: ["superuser"],
          },
          {
            text: "Routen: /certiano/release-notes, /dashboard/release-notes, /konto/release-notes.",
            visibility: ["superuser"],
          },
          {
            text: "Gemeinsame ReleaseNotesPage-Komponente mit PageHeader und Card-Layout.",
            visibility: ["superuser"],
          },
          {
            text: "Icon: ScrollText in nav-icons.tsx (IconReleaseNotes).",
            visibility: ["superuser"],
          },
        ],
      },
    ],
  },
  {
    version: "V2.3.1",
    date: "10.06.2026",
    commit: "8dba4e1",
    summary: "UI-Bereinigung, einheitliche Navigations-Icons und klare Header-Struktur.",
    sections: [
      {
        title: "UI-Bereinigung",
        category: "ui",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Drei-Punkte-Menü in der Firmenübersicht entfernt – Funktionen weiterhin über die Aktionsleiste.",
            visibility: ["superuser"],
          },
          {
            text: "Globale Suchleiste im Certiano-Bereich entfernt; Firmensuche in der Übersicht bleibt.",
            visibility: ["superuser"],
          },
          {
            text: "Menüpunkt „Abmelden“ aus der Sidebar entfernt – Abmelden weiterhin im Benutzermenü oben rechts.",
            visibility: ["superuser", "admin", "employee"],
          },
          {
            text: "Superuser-Karte unten in der Sidebar entfernt – Zugang über Benutzermenü oben rechts.",
            visibility: ["superuser"],
          },
        ],
      },
      {
        title: "Einheitliche Navigations-Icons",
        category: "ui",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Zentrale Lucide-Icon-Zuordnung für Certiano, Admin und Mitarbeiter (Sidebar, Mobile, Aktionsleisten).",
            visibility: ["superuser", "admin", "employee"],
          },
          {
            text: "Neue Abhängigkeit: lucide-react.",
            visibility: ["superuser"],
          },
        ],
      },
      {
        title: "Sidebar-Branding",
        category: "ui",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Unter dem Logo einheitlich drei Zeilen: Certiano Campus, Slogan und Produktbeschreibung (alle Rollen).",
            visibility: ["superuser", "admin", "employee"],
          },
          {
            text: "Texte zentral in src/lib/branding.ts; Tenant-Logo unverändert über logoUrl.",
            visibility: ["superuser"],
          },
        ],
      },
      {
        title: "Header-Struktur",
        category: "ui",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Oberer Header zeigt Portalebene (Entwickler-, Betreiber- oder Mitarbeiterportal) – keine doppelten Seitentitel.",
            visibility: ["superuser", "admin", "employee"],
          },
          {
            text: "Seitenüberschrift bleibt im Inhaltsbereich (PageHeader); Slogan nur in der Sidebar.",
            visibility: ["superuser", "admin", "employee"],
          },
        ],
      },
      {
        title: "Geänderte Dateien",
        category: "technical",
        visibility: ["superuser"],
        items: [
          {
            text: "src/lib/branding.ts, src/components/shell/nav-icons.tsx, sidebar-brand.tsx, app-shell.tsx.",
            visibility: ["superuser"],
          },
          {
            text: "certiano-shell.tsx, admin-shell.tsx, employee-shell.tsx und zugehörige Nav-Komponenten.",
            visibility: ["superuser"],
          },
        ],
      },
    ],
  },
  {
    version: "V2.3.0",
    date: "10.06.2026",
    commit: "0d067bb",
    summary: "Firmen-Datenexport mit Exportprotokoll und DSGVO-Rohdaten.",
    sections: [
      {
        title: "Firmen-Datenexport",
        category: "features",
        visibility: ["superuser"],
        items: [
          {
            text: "Neuer Datenexport getrennt vom Audit-Export – für DSGVO-Auskunft, Vertragsende, Migration und Archivierung.",
            visibility: ["superuser"],
          },
          {
            text: "Navigation: Firmen → Mehr/Datenexport, Tab Datenexport, Exportprotokolle.",
            visibility: ["superuser"],
          },
          {
            text: "ZIP-Paket mit PDF-Protokoll, XLSX-Tabellen, Zertifikaten, Nachweisen und Rohdaten (JSON).",
            visibility: ["superuser"],
          },
          {
            text: "Exportgrund Pflichtfeld (DSGVO-AUSKUNFT, VERTRAGSENDE, DATENUEBERNAHME, INTERNE_PRUEFUNG, SONSTIGES).",
            visibility: ["superuser"],
          },
        ],
      },
      {
        title: "Exportprotokoll & Revisionssicherheit",
        category: "features",
        visibility: ["superuser"],
        items: [
          {
            text: "Neue Tabelle company_data_exports mit Snapshot, archiviertem ZIP und Protokoll-PDF.",
            visibility: ["superuser"],
          },
          {
            text: "Historie unter /certiano/exportprotokolle mit Detailansicht und Downloads.",
            visibility: ["superuser"],
          },
        ],
      },
      {
        title: "Rohdatenexport (DSGVO)",
        category: "features",
        visibility: ["superuser"],
        items: [
          {
            text: "Maschinenlesbare JSON-Dateien (company, employees, trainings, certificates u. a.) im Ordner raw_data/.",
            visibility: ["superuser"],
          },
          {
            text: "Mandantensicherheit: validateCompanyRawExportData() vor ZIP-Erstellung – nur Daten der exportierten Firma.",
            visibility: ["superuser"],
          },
        ],
      },
      {
        title: "Neue Abhängigkeit",
        category: "technical",
        visibility: ["superuser"],
        items: [
          {
            text: "xlsx (SheetJS) für Excel-Export von Mitarbeitern, Schulungen und Standorten.",
            visibility: ["superuser"],
          },
        ],
      },
      {
        title: "Migrationen",
        category: "migrations",
        visibility: ["superuser"],
        items: [
          {
            text: "20260622120000_company_data_exports.sql",
            visibility: ["superuser"],
          },
          {
            text: "20260622130000_company_data_export_audit.sql (custom_reason, export_snapshot_json, protocol_file_url).",
            visibility: ["superuser"],
          },
        ],
      },
    ],
  },
  {
    version: "V2.2.1",
    date: "10.06.2026",
    commit: "f4377bf",
    summary: "Login mit Firmenkennung und behobener Branding-Flicker.",
    sections: [
      {
        title: "Login – Firmenkennung",
        category: "company",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Login akzeptiert die feste Firmenkennung (z. B. F0004) statt Slug/Firmenname.",
            visibility: ["admin", "employee"],
          },
          {
            text: "Einheitliches Login-Formular: Firmenkennung + E-Mail + Passwort auf /login.",
            visibility: ["admin", "employee"],
          },
          {
            text: "Bei firmenspezifischer Login-Adresse nur E-Mail + Passwort sichtbar.",
            visibility: ["admin", "employee"],
          },
          {
            text: "Superuser-Login unter /certiano/login unverändert (E-Mail + Passwort).",
            visibility: ["superuser", "admin", "employee"],
          },
          {
            text: "API und Tenant-Auflösung auf company_code umgestellt (tenant.ts, tenant-resolve.ts, login/route.ts).",
            visibility: ["superuser"],
          },
        ],
      },
      {
        title: "Login – Branding ohne Flicker",
        category: "ui",
        visibility: ["superuser", "admin", "employee"],
        items: [
          {
            text: "Branding wird serverseitig vor dem Rendern geladen – korrekte Farben ab dem ersten Paint.",
            visibility: ["admin", "employee"],
          },
          {
            text: "Kein Lade-Spinner und kein Client-Fetch für Branding beim initialen Login-Render.",
            visibility: ["admin", "employee"],
          },
          {
            text: "Login-Seiten mit dynamic = \"force-dynamic\"; BrandingProvider setzt CSS-Variablen inline.",
            visibility: ["superuser"],
          },
        ],
      },
    ],
  },
];

export const LATEST_RELEASE_VERSION = "V2.4.0";
