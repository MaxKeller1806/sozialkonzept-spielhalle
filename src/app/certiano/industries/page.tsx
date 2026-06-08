"use client";

import { Suspense, useState } from "react";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { AdminModal } from "@/components/admin-modal";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Input } from "@/components/ui";
import { useAdminList } from "@/hooks/use-admin-list";
import type { BusinessType, Industry } from "@/lib/types";

function IndustriesPageContent() {
  const [message, setMessage] = useState("");
  const [industryError, setIndustryError] = useState("");
  const [businessTypeError, setBusinessTypeError] = useState("");
  const [industrySaving, setIndustrySaving] = useState(false);
  const [businessTypeSaving, setBusinessTypeSaving] = useState(false);
  const [showIndustryForm, setShowIndustryForm] = useState(false);
  const [editIndustryId, setEditIndustryId] = useState<number | null>(null);
  const [industryForm, setIndustryForm] = useState({
    name: "",
    slug: "",
    description: "",
    sortOrder: "0",
  });
  const [businessTypeForm, setBusinessTypeForm] = useState<{
    industryId: number | null;
    editId: number | null;
    name: string;
    slug: string;
    description: string;
    sortOrder: string;
  }>({
    industryId: null,
    editId: null,
    name: "",
    slug: "",
    description: "",
    sortOrder: "0",
  });

  const industriesList = useAdminList<Industry>({
    apiPath: "/api/superuser/industries",
    dataKey: "industries",
    defaultSortBy: "sortOrder",
    defaultSortDirection: "asc",
    onUnauthorized: () => window.location.replace("/certiano/login"),
  });

  const businessTypesList = useAdminList<BusinessType>({
    apiPath: "/api/superuser/business-types",
    dataKey: "businessTypes",
    defaultSortBy: "sortOrder",
    defaultSortDirection: "asc",
    prefix: "bt",
    onUnauthorized: () => window.location.replace("/certiano/login"),
  });

  function resetIndustryForm() {
    setIndustryForm({ name: "", slug: "", description: "", sortOrder: "0" });
    setEditIndustryId(null);
    setShowIndustryForm(false);
    setIndustryError("");
    setIndustrySaving(false);
  }

  function resetBusinessTypeForm() {
    setBusinessTypeForm({
      industryId: null,
      editId: null,
      name: "",
      slug: "",
      description: "",
      sortOrder: "0",
    });
    setBusinessTypeError("");
    setBusinessTypeSaving(false);
  }

  async function saveIndustry(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIndustryError("");
    setIndustrySaving(true);
    const payload = {
      name: industryForm.name,
      slug: industryForm.slug || undefined,
      description: industryForm.description || null,
      sortOrder: Number(industryForm.sortOrder) || 0,
    };
    try {
      const res = await fetch(
        editIndustryId
          ? `/api/superuser/industries/${editIndustryId}`
          : "/api/superuser/industries",
        {
          method: editIndustryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setIndustryError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      resetIndustryForm();
      industriesList.reload();
      businessTypesList.reload();
      setMessage("Branche gespeichert.");
    } finally {
      setIndustrySaving(false);
    }
  }

  async function saveBusinessType(e: React.FormEvent) {
    e.preventDefault();
    if (!businessTypeForm.industryId) return;
    setMessage("");
    setBusinessTypeError("");
    setBusinessTypeSaving(true);
    const payload = {
      industryId: businessTypeForm.industryId,
      name: businessTypeForm.name,
      slug: businessTypeForm.slug || undefined,
      description: businessTypeForm.description || null,
      sortOrder: Number(businessTypeForm.sortOrder) || 0,
    };
    try {
      const res = await fetch(
        businessTypeForm.editId
          ? `/api/superuser/business-types/${businessTypeForm.editId}`
          : "/api/superuser/business-types",
        {
          method: businessTypeForm.editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setBusinessTypeError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      resetBusinessTypeForm();
      industriesList.reload();
      businessTypesList.reload();
      setMessage("Betriebstyp gespeichert.");
    } finally {
      setBusinessTypeSaving(false);
    }
  }

  async function toggleIndustry(industry: Industry) {
    await fetch(`/api/superuser/industries/${industry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !industry.active }),
    });
    industriesList.reload();
  }

  async function toggleBusinessType(bt: BusinessType) {
    await fetch(`/api/superuser/business-types/${bt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !bt.active }),
    });
    businessTypesList.reload();
  }

  const industryColumns: AdminTableColumn<Industry>[] = [
    {
      key: "name",
      header: "Branche",
      sortable: true,
      render: (i) => (
        <>
          <span className="font-medium">{i.name}</span>
          {!i.active && (
            <span className="ml-2 text-xs text-red-600">(inaktiv)</span>
          )}
        </>
      ),
    },
    { key: "slug", header: "Slug", sortable: true, render: (i) => i.slug },
    {
      key: "businessTypeCount",
      header: "Betriebstypen",
      sortable: true,
      render: (i) => i.businessTypeCount ?? 0,
    },
    {
      key: "companyCount",
      header: "Firmen",
      sortable: true,
      render: (i) => i.companyCount ?? 0,
    },
    {
      key: "sortOrder",
      header: "Sortierung",
      sortable: true,
      render: (i) => i.sortOrder,
    },
    {
      key: "createdAt",
      header: "Erstellt",
      sortable: true,
      render: (i) => new Date(i.createdAt).toLocaleDateString("de-DE"),
    },
    {
      key: "actions",
      header: "Aktionen",
      render: (i) => (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="text-left text-brand hover:underline"
            onClick={() => {
              setEditIndustryId(i.id);
              setIndustryForm({
                name: i.name,
                slug: i.slug,
                description: i.description ?? "",
                sortOrder: String(i.sortOrder),
              });
              setIndustryError("");
              setShowIndustryForm(true);
            }}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            className="text-left text-slate-600 hover:underline"
            onClick={() => toggleIndustry(i)}
          >
            {i.active ? "Deaktivieren" : "Aktivieren"}
          </button>
          <button
            type="button"
            className="text-left text-brand hover:underline"
            onClick={() => {
              setBusinessTypeError("");
              setBusinessTypeForm({
                industryId: i.id,
                editId: null,
                name: "",
                slug: "",
                description: "",
                sortOrder: "0",
              });
            }}
          >
            Betriebstyp anlegen
          </button>
        </div>
      ),
    },
  ];

  const businessTypeColumns: AdminTableColumn<BusinessType>[] = [
    {
      key: "name",
      header: "Betriebstyp",
      sortable: true,
      render: (bt) => (
        <>
          <span className="font-medium">{bt.name}</span>
          {!bt.active && (
            <span className="ml-2 text-xs text-red-600">(inaktiv)</span>
          )}
        </>
      ),
    },
    {
      key: "industryName",
      header: "Branche",
      sortable: true,
      render: (bt) => bt.industryName ?? "—",
    },
    { key: "slug", header: "Slug", sortable: true, render: (bt) => bt.slug },
    {
      key: "companyCount",
      header: "Firmen",
      sortable: true,
      render: (bt) => bt.companyCount ?? 0,
    },
    {
      key: "sortOrder",
      header: "Sortierung",
      sortable: true,
      render: (bt) => bt.sortOrder,
    },
    {
      key: "createdAt",
      header: "Erstellt",
      sortable: true,
      render: (bt) => new Date(bt.createdAt).toLocaleDateString("de-DE"),
    },
    {
      key: "actions",
      header: "Aktionen",
      render: (bt) => (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="text-left text-brand hover:underline"
            onClick={() => {
              setBusinessTypeError("");
              setBusinessTypeForm({
                industryId: bt.industryId,
                editId: bt.id,
                name: bt.name,
                slug: bt.slug,
                description: bt.description ?? "",
                sortOrder: String(bt.sortOrder),
              });
            }}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            className="text-left text-slate-600 hover:underline"
            onClick={() => toggleBusinessType(bt)}
          >
            {bt.active ? "Deaktivieren" : "Aktivieren"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <CertianoShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Branchen & Betriebstypen</h2>
          <p className="text-sm text-slate-600">
            Übergeordnete Struktur für Firmen – später Grundlage für
            Seminar-Empfehlungen.
          </p>
        </div>
        <Button
          onClick={() => {
            resetIndustryForm();
            setShowIndustryForm(true);
          }}
        >
          Branche anlegen
        </Button>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      <AdminModal
        open={showIndustryForm}
        onClose={resetIndustryForm}
        title={editIndustryId ? "Branche bearbeiten" : "Neue Branche"}
        error={industryError}
        saving={industrySaving}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="industry-form" disabled={industrySaving}>
              {industrySaving ? "Speichern…" : "Speichern"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetIndustryForm}
              disabled={industrySaving}
            >
              Abbrechen
            </Button>
          </div>
        }
      >
        <form id="industry-form" onSubmit={saveIndustry} className="grid gap-4">
          <Input
            label="Name"
            required
            value={industryForm.name}
            onChange={(e) =>
              setIndustryForm({ ...industryForm, name: e.target.value })
            }
          />
          <Input
            label="Slug (optional)"
            value={industryForm.slug}
            onChange={(e) =>
              setIndustryForm({ ...industryForm, slug: e.target.value })
            }
          />
          <Input
            label="Beschreibung"
            value={industryForm.description}
            onChange={(e) =>
              setIndustryForm({ ...industryForm, description: e.target.value })
            }
          />
          <Input
            label="Sortierung"
            type="number"
            value={industryForm.sortOrder}
            onChange={(e) =>
              setIndustryForm({ ...industryForm, sortOrder: e.target.value })
            }
          />
        </form>
      </AdminModal>

      <AdminModal
        open={businessTypeForm.industryId != null}
        onClose={resetBusinessTypeForm}
        title={
          businessTypeForm.editId ? "Betriebstyp bearbeiten" : "Neuer Betriebstyp"
        }
        error={businessTypeError}
        saving={businessTypeSaving}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="business-type-form" disabled={businessTypeSaving}>
              {businessTypeSaving ? "Speichern…" : "Speichern"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetBusinessTypeForm}
              disabled={businessTypeSaving}
            >
              Abbrechen
            </Button>
          </div>
        }
      >
        <form id="business-type-form" onSubmit={saveBusinessType} className="grid gap-4">
          <Input
            label="Name"
            required
            value={businessTypeForm.name}
            onChange={(e) =>
              setBusinessTypeForm({ ...businessTypeForm, name: e.target.value })
            }
          />
          <Input
            label="Slug (optional)"
            value={businessTypeForm.slug}
            onChange={(e) =>
              setBusinessTypeForm({ ...businessTypeForm, slug: e.target.value })
            }
          />
          <Input
            label="Beschreibung"
            value={businessTypeForm.description}
            onChange={(e) =>
              setBusinessTypeForm({
                ...businessTypeForm,
                description: e.target.value,
              })
            }
          />
          <Input
            label="Sortierung"
            type="number"
            value={businessTypeForm.sortOrder}
            onChange={(e) =>
              setBusinessTypeForm({
                ...businessTypeForm,
                sortOrder: e.target.value,
              })
            }
          />
        </form>
      </AdminModal>

      <section className="mb-10">
        <h3 className="mb-4 text-base font-bold">Branchen</h3>
        <AdminDataTable
          columns={industryColumns}
          rows={industriesList.rows}
          rowKey={(i) => i.id}
          loading={industriesList.loading}
          error={industriesList.error}
          onRetry={industriesList.reload}
          search={industriesList.state.search}
          searchPlaceholder="Branche suchen…"
          onSearchChange={industriesList.setSearch}
          statusFilter={industriesList.state.status}
          onStatusChange={industriesList.setStatus}
          page={industriesList.meta?.page ?? industriesList.state.page}
          pageSize={industriesList.meta?.pageSize ?? industriesList.state.pageSize}
          totalCount={industriesList.meta?.total}
          onPageChange={industriesList.setPage}
          onPageSizeChange={industriesList.setPageSize}
          onSort={industriesList.toggleSort}
          getSortState={industriesList.getSortState}
          hasActiveFilters={industriesList.hasActiveFilters}
          onResetFilters={industriesList.resetFilters}
        />
      </section>

      <section>
        <h3 className="mb-4 text-base font-bold">Betriebstypen</h3>
        <AdminDataTable
          columns={businessTypeColumns}
          rows={businessTypesList.rows}
          rowKey={(bt) => bt.id}
          loading={businessTypesList.loading}
          error={businessTypesList.error}
          onRetry={businessTypesList.reload}
          search={businessTypesList.state.search}
          searchPlaceholder="Betriebstyp oder Branche suchen…"
          onSearchChange={businessTypesList.setSearch}
          statusFilter={businessTypesList.state.status}
          onStatusChange={businessTypesList.setStatus}
          filters={[
            {
              key: "industryId",
              label: "Branche",
              value: businessTypesList.state.industryId
                ? String(businessTypesList.state.industryId)
                : "",
              options: [
                { value: "", label: "Alle Branchen" },
                ...industriesList.rows.map((i) => ({
                  value: String(i.id),
                  label: i.name,
                })),
              ],
              onChange: (value) =>
                businessTypesList.updateParams(
                  { industryId: value || null },
                  { resetPage: true }
                ),
            },
          ]}
          page={businessTypesList.meta?.page ?? businessTypesList.state.page}
          pageSize={
            businessTypesList.meta?.pageSize ?? businessTypesList.state.pageSize
          }
          totalCount={businessTypesList.meta?.total}
          onPageChange={businessTypesList.setPage}
          onPageSizeChange={businessTypesList.setPageSize}
          onSort={businessTypesList.toggleSort}
          getSortState={businessTypesList.getSortState}
          hasActiveFilters={businessTypesList.hasActiveFilters}
          onResetFilters={businessTypesList.resetFilters}
        />
      </section>
    </CertianoShell>
  );
}

export default function IndustriesPage() {
  return (
    <Suspense
      fallback={
        <CertianoShell>
          <p className="text-sm text-slate-600">Lädt Branchen…</p>
        </CertianoShell>
      }
    >
      <IndustriesPageContent />
    </Suspense>
  );
}
