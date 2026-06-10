"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { AdminCredentialsDialog, type AdminAccessCredentials } from "@/components/admin-credentials-dialog";
import { AdminDrawer } from "@/components/admin-drawer";
import { AdminModal } from "@/components/admin-modal";
import { CertianoShell } from "@/components/certiano-shell";
import { CompanyDangerZone } from "@/components/company-danger-zone";
import { CompanyEditForm } from "@/components/company-edit-form";
import { ActionMenu } from "@/components/action-menu";
import { EntityTableCell } from "@/components/entity-table-cell";
import { IndustryBusinessTypeSelect } from "@/components/industry-business-type-select";
import { PageHeader } from "@/components/page-header";
import { StatusDot, TableLegendBar } from "@/components/status-dot";
import {
  IconBookOpen,
  IconBuilding,
  IconDownload,
  IconKey,
  IconMapPin,
  IconPalette,
  IconUsers,
} from "@/components/table-action-icons";
import { TableActionBar, type TableActionBarItem } from "@/components/table-action-bar";
import type { ActionMenuSection } from "@/components/action-menu";
import { Button, Card, Input } from "@/components/ui";
import { useAdminList } from "@/hooks/use-admin-list";
import { formatContactPersonDisplay } from "@/lib/contact-person";
import {
  companyStatusDotClass,
  companyStatusLabel,
  licenseStatusDotClass,
  licenseStatusLabel,
} from "@/lib/company-status-labels";
import type { CompanySummaryRow } from "@/lib/tenant";

interface IndustryOption {
  id: number;
  name: string;
  businessTypes: Array<{ id: number; name: string }>;
}

function IconOnlyHeader({
  label,
  icon,
}: {
  label: string;
  icon: ReactNode;
}) {
  return (
    <span className="inline-flex items-center justify-center text-slate-400" title={label}>
      <span className="sr-only">{label}</span>
      {icon}
    </span>
  );
}

function CertianoCompaniesContent() {
  const searchParams = useSearchParams();
  const {
    rows: companies,
    meta,
    loading,
    error,
    reload,
    state,
    setSearch,
    setStatus,
    setPage,
    setPageSize,
    toggleSort,
    getSortState,
    updateParams,
    hasActiveFilters,
    resetFilters,
  } = useAdminList<CompanySummaryRow>({
    apiPath: "/api/superuser/companies",
    dataKey: "companies",
    defaultSortBy: "createdAt",
    defaultSortDirection: "desc",
    onUnauthorized: () => window.location.replace("/certiano/login"),
  });

  const [industryOptions, setIndustryOptions] = useState<IndustryOption[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCompanyId, setEditCompanyId] = useState<number | null>(null);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [companySaving, setCompanySaving] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newLicense, setNewLicense] = useState<string | null>(null);
  const [adminCredentials, setAdminCredentials] = useState<AdminAccessCredentials | null>(
    null
  );
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    contactPerson: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [industryId, setIndustryId] = useState<number | "">("");
  const [businessTypeId, setBusinessTypeId] = useState<number | "">("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/superuser/industries?filter=all")
      .then((r) => (r.ok ? r.json() : { industries: [] }))
      .then((d) => setIndustryOptions(d.industries ?? []));
  }, []);

  useEffect(() => {
    if (searchParams.get("companyDeleted") === "1") {
      setMessage("Firma wurde erfolgreich gelöscht.");
      window.history.replaceState(null, "", "/certiano");
    }
  }, [searchParams]);

  const businessTypeOptions =
    industryOptions.find((i) => i.id === state.industryId)?.businessTypes ?? [];

  const resetCreateForm = useCallback(() => {
    setForm({
      name: "",
      slug: "",
      email: "",
      contactPerson: "",
      adminEmail: "",
      adminPassword: "",
    });
    setIndustryId("");
    setBusinessTypeId("");
    setCreateError("");
    setShowCreateModal(false);
  }, []);

  const openCreateModal = useCallback(() => {
    setForm({
      name: "",
      slug: "",
      email: "",
      contactPerson: "",
      adminEmail: "",
      adminPassword: "",
    });
    setIndustryId("");
    setBusinessTypeId("");
    setCreateError("");
    setShowCreateModal(true);
  }, []);

  const closeAdminCredentials = useCallback(() => {
    setAdminCredentials(null);
  }, []);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateSaving(true);
    setNewLicense(null);
    try {
      const res = await fetch("/api/superuser/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          email: form.email || null,
          contactPerson: form.contactPerson || null,
          adminEmail: form.adminEmail || null,
          adminPassword: form.adminPassword || null,
          industryId: industryId === "" ? null : industryId,
          businessTypeId: businessTypeId === "" ? null : businessTypeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Anlegen fehlgeschlagen.");
        return;
      }
      setNewLicense(data.licenseKey);
      setMessage("Firma wurde angelegt.");
      if (data.adminAccess?.email && data.adminAccess?.initialPassword) {
        setAdminCredentials({
          email: data.adminAccess.email,
          initialPassword: data.adminAccess.initialPassword,
        });
      }
      resetCreateForm();
      reload();
    } finally {
      setCreateSaving(false);
    }
  }


  const openEditCompany = useCallback((company: CompanySummaryRow) => {
    setEditCompanyName(company.name);
    setEditCompanyId(company.id);
  }, []);

  const closeEditCompany = useCallback(() => {
    setEditCompanyId(null);
    setEditCompanyName("");
  }, []);

  function primaryAdminEmail(company: CompanySummaryRow): string | null {
    return company.adminContacts[0]?.email ?? null;
  }

  function buildCompanyMehrSections(
    company: CompanySummaryRow
  ): ActionMenuSection[] {
    return [
      {
        items: [
          {
            label: "Verantwortlichkeiten",
            href: "/certiano/verantwortlichkeiten",
          },
          {
            label: "Zugangsdaten anzeigen",
            href: `/certiano/companies/${company.id}/users`,
          },
          {
            label: "Passwort zurücksetzen",
            href: `/certiano/companies/${company.id}/users`,
          },
        ],
      },
      {
        danger: true,
        items: [
          {
            label: "Firma löschen",
            destructive: true,
            onClick: () => openEditCompany(company),
          },
        ],
      },
    ];
  }

  function buildTaskbarActions(company: CompanySummaryRow): TableActionBarItem[] {
    return [
      {
        key: "users",
        label: "Benutzer",
        icon: <IconUsers />,
        href: `/certiano/companies/${company.id}/users`,
      },
      {
        key: "courses",
        label: "Seminare",
        icon: <IconBookOpen />,
        href: `/certiano/companies/${company.id}/courses`,
      },
      {
        key: "branding",
        label: "Firmenbranding",
        icon: <IconPalette />,
        href: `/certiano/companies/${company.id}/branding`,
      },
      {
        key: "audit",
        label: "Audit-Export",
        icon: <IconDownload />,
        onClick: () =>
          setMessage(
            "Audit-Export ist im Admin-Dashboard der Firma unter „Audit-Export“ verfügbar."
          ),
      },
      {
        key: "licenses",
        label: "Lizenzen",
        icon: <IconKey />,
        onClick: () => openEditCompany(company),
      },
      {
        key: "locations",
        label: "Standorte",
        icon: <IconMapPin />,
        href: `/certiano/companies/${company.id}`,
      },
    ];
  }

  const columns: AdminTableColumn<CompanySummaryRow>[] = useMemo(
    () => [
      {
        key: "companyCode",
        header: "Kürzel",
        headerContent: <span className="font-bold normal-case text-brand">Kürzel</span>,
        sortable: true,
        defaultWidth: 56,
        minWidth: 52,
        maxWidth: 72,
        className: "px-2 font-mono text-[13px] font-bold text-brand",
        truncate: true,
        getCellTitle: (c) => c.companyCode || undefined,
        render: (c) => c.companyCode || "—",
      },
      {
        key: "name",
        header: "Firma",
        sortable: true,
        defaultWidth: 300,
        minWidth: 220,
        maxWidth: 420,
        render: (c) => (
          <EntityTableCell
            name={c.name}
            subtitle={primaryAdminEmail(c) ?? "Kein Admin hinterlegt"}
            colorSeed={c.id}
          />
        ),
      },
      {
        key: "industryName",
        header: "Branche",
        sortable: true,
        defaultWidth: 140,
        minWidth: 110,
        maxWidth: 200,
        truncate: true,
        getCellTitle: (c) => c.industryName ?? undefined,
        render: (c) => c.industryName ?? "—",
      },
      {
        key: "businessTypeName",
        header: "Betriebstyp",
        sortable: true,
        defaultWidth: 130,
        minWidth: 110,
        maxWidth: 180,
        truncate: true,
        getCellTitle: (c) => c.businessTypeName ?? undefined,
        render: (c) => c.businessTypeName ?? "—",
      },
      {
        key: "status",
        header: "Status",
        headerContent: (
          <IconOnlyHeader
            label="Status"
            icon={<span className="inline-block h-2 w-2 rounded-full bg-slate-300" aria-hidden />}
          />
        ),
        compactHeader: true,
        sortable: true,
        defaultWidth: 40,
        minWidth: 36,
        maxWidth: 48,
        resizable: false,
        className: "px-1 text-center",
        render: (c) => (
          <div className="flex justify-center">
            <StatusDot
              className={companyStatusDotClass(c.status)}
              title={companyStatusLabel(c.status)}
            />
          </div>
        ),
      },
      {
        key: "licenseStatus",
        header: "Lizenz",
        headerContent: (
          <IconOnlyHeader
            label="Lizenz"
            icon={<IconKey className="h-3.5 w-3.5" />}
          />
        ),
        compactHeader: true,
        sortable: true,
        defaultWidth: 40,
        minWidth: 36,
        maxWidth: 48,
        resizable: false,
        className: "px-1 text-center",
        render: (c) => (
          <div className="flex justify-center">
            <StatusDot
              className={licenseStatusDotClass(c.licenseStatus)}
              title={licenseStatusLabel(c.licenseStatus)}
            />
          </div>
        ),
      },
      {
        key: "locationCount",
        header: "Standorte",
        headerContent: (
          <IconOnlyHeader
            label="Standorte"
            icon={<IconMapPin className="h-3.5 w-3.5" />}
          />
        ),
        compactHeader: true,
        sortable: true,
        defaultWidth: 48,
        minWidth: 40,
        maxWidth: 56,
        resizable: false,
        stopRowClick: true,
        className: "px-1 text-center tabular-nums",
        render: (c) => (
          <Link
            href={`/certiano/companies/${c.id}`}
            className="text-brand hover:underline"
            title="Standortverwaltung öffnen"
          >
            {c.locationCount}
          </Link>
        ),
      },
      {
        key: "employeeCount",
        header: "Mitarbeiter",
        headerContent: (
          <IconOnlyHeader
            label="Mitarbeiter"
            icon={<IconUsers className="h-3.5 w-3.5" />}
          />
        ),
        compactHeader: true,
        sortable: true,
        defaultWidth: 48,
        minWidth: 40,
        maxWidth: 56,
        resizable: false,
        className: "px-1 text-center tabular-nums text-slate-800",
        render: (c) => c.employeeCount,
      },
      {
        key: "contactPerson",
        header: "Ansprechpartner",
        headerContent: <span>Ansprechpartner</span>,
        sortable: true,
        defaultWidth: 120,
        minWidth: 96,
        maxWidth: 180,
        truncate: true,
        getCellTitle: (c) => formatContactPersonDisplay(c.contactPerson),
        render: (c) => formatContactPersonDisplay(c.contactPerson),
      },
      {
        key: "createdAt",
        header: "Erstellt am",
        sortable: true,
        defaultWidth: 100,
        minWidth: 88,
        maxWidth: 120,
        render: (c) => new Date(c.createdAt).toLocaleDateString("de-DE"),
      },
      {
        key: "rowMenu",
        header: "",
        defaultWidth: 40,
        minWidth: 36,
        maxWidth: 48,
        resizable: false,
        sticky: "right",
        hideFromPicker: true,
        compactHeader: true,
        className: "px-1 text-right",
        render: (c) => (
          <ActionMenu
            ariaLabel={`Menü für ${c.name}`}
            triggerVariant="icon"
            sections={[
              {
                items: [
                  {
                    label: "Verantwortlichkeiten",
                    href: "/certiano/verantwortlichkeiten",
                  },
                  {
                    label: "Passwort zurücksetzen",
                    href: `/certiano/companies/${c.id}/users`,
                  },
                  {
                    label: "Zugangsdaten anzeigen",
                    href: `/certiano/companies/${c.id}/users`,
                  },
                ],
              },
              {
                danger: true,
                items: [
                  {
                    label: "Firma löschen",
                    destructive: true,
                    onClick: () => openEditCompany(c),
                  },
                ],
              },
            ]}
          />
        ),
      },
    ],
    [openEditCompany]
  );

  return (
    <CertianoShell contentClassName="app-content mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">
      <PageHeader
        title="Firmen"
        description="Verwalten Sie alle Firmen und deren Einstellungen."
      />

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}
      {newLicense && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold">Lizenzschlüssel (bitte kopieren):</p>
          <code className="mt-2 block break-all text-lg">{newLicense}</code>
        </Card>
      )}

      <AdminModal
        open={showCreateModal}
        onClose={resetCreateForm}
        title="Neue Kundenfirma anlegen"
        error={createError}
        saving={createSaving}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="company-create-form" disabled={createSaving}>
              {createSaving ? "Anlegen…" : "Anlegen"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetCreateForm}
              disabled={createSaving}
            >
              Abbrechen
            </Button>
          </div>
        }
      >
        <form id="company-create-form" onSubmit={createCompany} className="grid gap-4">
          <Input
            label="Firmenname"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Web-Kurzname"
            required
            placeholder="z. B. meine-firma"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <Input
            label="Firmen-E-Mail (optional)"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Ansprechpartner (optional)"
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            placeholder="z. B. Max Mustermann"
          />
          <Input
            label="Admin-E-Mail (optional)"
            type="email"
            placeholder="Leer = admin@[web-kurzname].local"
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
          />
          <p className="text-xs text-slate-500">
            Wenn leer, wird automatisch eine Login-E-Mail erzeugt (z. B. admin@meine-firma.local).
          </p>
          <Input
            label="Admin-Erstpasswort (optional)"
            type="password"
            autoComplete="new-password"
            placeholder="Leer = sicheres Passwort wird generiert"
            value={form.adminPassword}
            onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
          />
          <p className="text-xs text-slate-500">
            Mindestens 8 Zeichen. Wird nur einmal nach dem Anlegen angezeigt.
          </p>
          <IndustryBusinessTypeSelect
            industryId={industryId}
            businessTypeId={businessTypeId}
            onIndustryChange={setIndustryId}
            onBusinessTypeChange={setBusinessTypeId}
          />
        </form>
      </AdminModal>

      <AdminCredentialsDialog
        open={adminCredentials != null}
        credentials={adminCredentials}
        onClose={closeAdminCredentials}
        successMessage="Firma wurde angelegt."
      />

      <AdminDrawer
        open={editCompanyId != null}
        onClose={closeEditCompany}
        title={editCompanyName ? `Firma bearbeiten: ${editCompanyName}` : "Firma bearbeiten"}
        saving={companySaving}
        footer={
          editCompanyId != null ? (
            <div className="flex flex-wrap gap-3">
              <Button type="submit" form="company-edit-form" disabled={companySaving}>
                {companySaving ? "Speichern…" : "Speichern"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={closeEditCompany}
                disabled={companySaving}
              >
                Abbrechen
              </Button>
              <Link href={`/certiano/companies/${editCompanyId}/users`}>
                <Button type="button" variant="secondary">
                  Benutzer
                </Button>
              </Link>
              <Link href={`/certiano/companies/${editCompanyId}/courses`}>
                <Button type="button" variant="secondary">
                  Kursfreigaben
                </Button>
              </Link>
            </div>
          ) : null
        }
      >
        {editCompanyId != null && (
          <>
            <CompanyEditForm
              companyId={editCompanyId}
              hideActions
              onSavingChange={setCompanySaving}
              onSaved={() => {
                setMessage("Firma erfolgreich gespeichert.");
                closeEditCompany();
                reload();
              }}
              onCancel={closeEditCompany}
            />
            <CompanyDangerZone
              companyId={editCompanyId}
              companyName={editCompanyName}
              onDeleted={() => {
                setMessage("Firma wurde erfolgreich gelöscht.");
                closeEditCompany();
                reload();
              }}
            />
          </>
        )}
      </AdminDrawer>

      <AdminDataTable
        appearance="modern"
        storageKey="superuser.companies.v2"
        columns={columns}
        rows={companies}
        rowKey={(c) => c.id}
        onRowClick={openEditCompany}
        renderRowFooter={(c) => (
          <TableActionBar
            actions={buildTaskbarActions(c)}
            mehrSections={buildCompanyMehrSections(c)}
            ariaLabel={`Schnellaktionen für ${c.name}`}
          />
        )}
        legendBar={
          <TableLegendBar
            groups={[
              {
                title: "Status",
                items: [
                  { dotClass: companyStatusDotClass("active"), label: "Aktiv" },
                  {
                    dotClass: companyStatusDotClass("pending"),
                    label: "In Prüfung",
                  },
                  {
                    dotClass: companyStatusDotClass("disabled"),
                    label: "Inaktiv",
                  },
                  {
                    dotClass: companyStatusDotClass("expired"),
                    label: "Archiviert",
                  },
                ],
              },
              {
                title: "Lizenz",
                titleIcon: <IconKey className="h-3.5 w-3.5" />,
                items: [
                  {
                    dotClass: licenseStatusDotClass("active"),
                    label: "Lizenziert",
                  },
                  {
                    dotClass: licenseStatusDotClass("unlicensed"),
                    label: "Nicht lizenziert",
                  },
                  {
                    dotClass: licenseStatusDotClass("expired"),
                    label: "Abgelaufen",
                  },
                ],
              },
            ]}
            iconHints={[
              {
                icon: <IconMapPin className="h-3.5 w-3.5" />,
                label: "Standorte",
              },
              {
                icon: <IconUsers className="h-3.5 w-3.5" />,
                label: "Mitarbeiter",
              },
            ]}
          />
        }
        resultLeading={<IconBuilding className="h-4 w-4" />}
        resultLabel={(total) =>
          total === 1 ? "1 Firma gefunden" : `${total} Firmen gefunden`
        }
        primaryAction={
          <Button type="button" className="!w-auto" onClick={openCreateModal}>
            + Firma hinzufügen
          </Button>
        }
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage="Keine Firmen gefunden."
        search={state.search}
        searchPlaceholder="Firma, Kürzel oder Ansprechpartner suchen…"
        onSearchChange={setSearch}
        statusFilter={state.status}
        onStatusChange={setStatus}
        filters={[
          {
            key: "industryId",
            label: "Branche",
            value: state.industryId ? String(state.industryId) : "",
            options: [
              { value: "", label: "Alle Branchen" },
              ...industryOptions.map((i) => ({
                value: String(i.id),
                label: i.name,
              })),
            ],
            onChange: (value) =>
              updateParams(
                {
                  industryId: value || null,
                  businessTypeId: null,
                },
                { resetPage: true }
              ),
          },
          {
            key: "businessTypeId",
            label: "Betriebstyp",
            value: state.businessTypeId ? String(state.businessTypeId) : "",
            options: [
              { value: "", label: "Alle Betriebstypen" },
              ...businessTypeOptions.map((bt) => ({
                value: String(bt.id),
                label: bt.name,
              })),
            ],
            onChange: (value) =>
              updateParams({ businessTypeId: value || null }, { resetPage: true }),
          },
        ]}
        page={meta?.page ?? state.page}
        pageSize={meta?.pageSize ?? state.pageSize}
        totalCount={meta?.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSort={toggleSort}
        getSortState={getSortState}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
      />
    </CertianoShell>
  );
}

export default function CertianoDashboardPage() {
  return (
    <Suspense fallback={<CertianoShell><p className="text-sm text-slate-600">Lädt Firmen…</p></CertianoShell>}>
      <CertianoCompaniesContent />
    </Suspense>
  );
}
