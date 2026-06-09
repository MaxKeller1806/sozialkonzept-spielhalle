"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
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
import { IndustryBusinessTypeSelect } from "@/components/industry-business-type-select";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button, Card, Input } from "@/components/ui";
import { useAdminList } from "@/hooks/use-admin-list";
import type { CompanySummaryRow } from "@/lib/tenant";

interface IndustryOption {
  id: number;
  name: string;
  businessTypes: Array<{ id: number; name: string }>;
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

  async function regenerateLicense(companyId: number) {
    const res = await fetch(`/api/superuser/companies/${companyId}/license`, {
      method: "POST",
    });
    const data = await res.json();
    if (res.ok) {
      setNewLicense(data.licenseKey);
      setMessage("Neuer Lizenzschlüssel erstellt (nur einmal sichtbar).");
    }
  }

  async function toggleStatus(company: CompanySummaryRow) {
    const newStatus = company.status === "active" ? "disabled" : "active";
    await fetch(`/api/superuser/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    reload();
  }

  function openEditCompany(company: CompanySummaryRow) {
    setEditCompanyName(company.name);
    setEditCompanyId(company.id);
  }

  const closeEditCompany = useCallback(() => {
    setEditCompanyId(null);
    setEditCompanyName("");
  }, []);

  const columns: AdminTableColumn<CompanySummaryRow>[] = [
    {
      key: "name",
      header: "Firma",
      sortable: true,
      render: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      key: "industryName",
      header: "Branche",
      sortable: true,
      render: (c) => c.industryName ?? "—",
    },
    {
      key: "businessTypeName",
      header: "Betriebstyp",
      sortable: true,
      render: (c) => c.businessTypeName ?? "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (c) => c.status,
    },
    {
      key: "licenseStatus",
      header: "Lizenz",
      sortable: true,
      render: (c) => c.licenseStatus,
    },
    {
      key: "adminCount",
      header: "Admins",
      sortable: true,
      render: (c) => c.adminCount,
    },
    {
      key: "employeeCount",
      header: "Mitarbeiter",
      sortable: true,
      render: (c) => c.employeeCount,
    },
    {
      key: "adminContacts",
      header: "Admin-Kontakte",
      render: (c) =>
        c.adminContacts.length === 0 ? (
          "—"
        ) : (
          <ul className="space-y-1">
            {c.adminContacts.map((a) => (
              <li key={a.email}>
                <span className="font-medium">{a.name}</span>
                <br />
                <span className="text-slate-500">{a.email}</span>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: "createdAt",
      header: "Erstellt",
      sortable: true,
      render: (c) => new Date(c.createdAt).toLocaleDateString("de-DE"),
    },
    {
      key: "actions",
      header: "Aktionen",
      render: (c) => (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="text-left text-brand hover:underline"
            onClick={() => openEditCompany(c)}
          >
            Bearbeiten
          </button>
          <Link
            href={`/certiano/companies/${c.id}/users`}
            className="text-brand hover:underline"
          >
            Benutzer
          </Link>
          <Link
            href={`/certiano/companies/${c.id}/courses`}
            className="text-brand hover:underline"
          >
            Kurse
          </Link>
          <button
            type="button"
            className="text-left text-brand hover:underline"
            onClick={() => regenerateLicense(c.id)}
          >
            Lizenz neu
          </button>
          <button
            type="button"
            className="text-left text-slate-600 hover:underline"
            onClick={() => toggleStatus(c)}
          >
            {c.status === "active" ? "Deaktivieren" : "Aktivieren"}
          </button>
          <Link
            href={`/certiano/branding?companyId=${c.id}`}
            className="text-brand hover:underline"
          >
            Branding
          </Link>
        </div>
      ),
    },
  ];

  return (
    <CertianoShell>
      <PageHeader
        title="Firmen"
        description="Aggregierte Übersicht aller Kundenfirmen."
        actions={<Button onClick={openCreateModal}>Neue Firma</Button>}
      />

      {!loading && meta && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Firmen gesamt" value={meta.total} />
          <KpiCard
            label="Aktive Firmen"
            value={companies.filter((c) => c.status === "active").length}
            accent="green"
          />
        </div>
      )}

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
            label="Kurzname (URL)"
            required
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
            label="Admin-E-Mail (optional)"
            type="email"
            placeholder="Leer = admin@kurzname.local"
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
          />
          <p className="text-xs text-slate-500">
            Wenn leer, wird automatisch eine Login-E-Mail erzeugt (z. B. admin@kurzname.local).
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
        columns={columns}
        rows={companies}
        rowKey={(c) => c.id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage="Keine Firmen gefunden."
        search={state.search}
        searchPlaceholder="Firma, Branche oder Betriebstyp…"
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
        minWidth="900px"
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
