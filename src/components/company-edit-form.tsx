"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { IndustryBusinessTypeSelect } from "@/components/industry-business-type-select";
import { Button, Input } from "@/components/ui";

export type CompanyFormState = {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  status: string;
  licenseStatus: string;
  licenseExpiresAt: string;
  allowAdminValidityOverride: boolean;
  allowAdminPassingScoreOverride: boolean;
};

const EMPTY_FORM: CompanyFormState = {
  name: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  email: "",
  phone: "",
  website: "",
  status: "active",
  licenseStatus: "unlicensed",
  licenseExpiresAt: "",
  allowAdminValidityOverride: false,
  allowAdminPassingScoreOverride: false,
};

type CompanyEditFormProps = {
  companyId: number;
  onSaved?: () => void;
  onCancel?: () => void;
  /** Show links to users/courses (detail page) */
  showNavLinks?: boolean;
  /** Called when save fails so parent can show toast */
  onSaveError?: (message: string) => void;
  /** Hide internal footer buttons when parent provides drawer footer */
  hideActions?: boolean;
  formId?: string;
  onSavingChange?: (saving: boolean) => void;
};

export function CompanyEditForm({
  companyId,
  onSaved,
  onCancel,
  showNavLinks = false,
  onSaveError,
  hideActions = false,
  formId = "company-edit-form",
  onSavingChange,
}: CompanyEditFormProps) {
  const [form, setForm] = useState<CompanyFormState>(EMPTY_FORM);
  const [industryId, setIndustryId] = useState<number | "">("");
  const [businessTypeId, setBusinessTypeId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [companyCode, setCompanyCode] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    fetch(`/api/superuser/companies/${companyId}`, { signal: controller.signal })
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          window.location.replace("/certiano/login");
          return null;
        }
        if (!r.ok) {
          return r.json().then((d) => {
            throw new Error(d.error ?? "Laden fehlgeschlagen.");
          });
        }
        return r.json();
      })
      .then((d) => {
        if (d?.company) {
          const c = d.company;
          setCompanyCode(c.companyCode ?? "");
          setForm({
            name: c.name,
            street: c.street ?? "",
            postalCode: c.postalCode ?? "",
            city: c.city ?? "",
            country: c.country ?? "Deutschland",
            email: c.email ?? "",
            phone: c.phone ?? "",
            website: c.website ?? "",
            status: c.status,
            licenseStatus: c.licenseStatus,
            licenseExpiresAt: c.licenseExpiresAt
              ? c.licenseExpiresAt.slice(0, 10)
              : "",
            allowAdminValidityOverride: c.allowAdminValidityOverride === true,
            allowAdminPassingScoreOverride:
              c.allowAdminPassingScoreOverride === true,
          });
          setIndustryId(c.industryId ?? "");
          setBusinessTypeId(c.businessTypeId ?? "");
        }
      })
      .catch((e) => {
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" || e.message.toLowerCase().includes("aborted"));
        setLoadError(
          isAbort
            ? "Zeitüberschreitung beim Laden. Bitte erneut versuchen."
            : e instanceof Error
              ? e.message
              : "Laden fehlgeschlagen."
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/superuser/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          licenseExpiresAt: form.licenseExpiresAt || null,
          industryId: industryId === "" ? null : industryId,
          businessTypeId: businessTypeId === "" ? null : businessTypeId,
          allowAdminValidityOverride: form.allowAdminValidityOverride,
          allowAdminPassingScoreOverride: form.allowAdminPassingScoreOverride,
        }),
      });
      if (res.ok) {
        onSaved?.();
      } else {
        const d = await res.json();
        const msg = d.error ?? "Speichern fehlgeschlagen.";
        setSaveError(msg);
        onSaveError?.(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Lädt Firmendaten…</p>;
  }

  if (loadError) {
    return (
      <div>
        <p className="text-sm text-red-700">{loadError}</p>
        <Button type="button" variant="secondary" onClick={load} className="mt-3 !w-auto">
          Erneut laden
        </Button>
      </div>
    );
  }

  return (
    <>
      {saveError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {saveError}
        </div>
      )}
      <form id={formId} onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Firmenkürzel</span>
          <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
            {companyCode || "—"}
          </div>
        </label>
        <Input
          label="Firmenname"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="E-Mail"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Telefon"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Website"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
        <Input
          label="Straße"
          value={form.street}
          onChange={(e) => setForm({ ...form, street: e.target.value })}
        />
        <Input
          label="PLZ"
          value={form.postalCode}
          onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
        />
        <Input
          label="Ort"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <Input
          label="Land"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
        <IndustryBusinessTypeSelect
          industryId={industryId}
          businessTypeId={businessTypeId}
          onIndustryChange={setIndustryId}
          onBusinessTypeChange={setBusinessTypeId}
        />
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Firmenstatus</span>
          <select
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">Aktiv</option>
            <option value="disabled">Deaktiviert</option>
            <option value="pending">Ausstehend</option>
            <option value="expired">Abgelaufen</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Lizenzstatus</span>
          <select
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"
            value={form.licenseStatus}
            onChange={(e) => setForm({ ...form, licenseStatus: e.target.value })}
          >
            <option value="unlicensed">Unlizenziert</option>
            <option value="active">Aktiv</option>
            <option value="disabled">Gesperrt</option>
            <option value="expired">Abgelaufen</option>
          </select>
        </label>
        <Input
          label="Lizenz gültig bis"
          type="date"
          value={form.licenseExpiresAt}
          onChange={(e) => setForm({ ...form, licenseExpiresAt: e.target.value })}
        />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800">Admin-Berechtigungen</h3>
          <p className="mt-1 text-sm text-slate-600">
            Diese Einstellung gilt für die gesamte Firma.
          </p>
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowAdminValidityOverride}
                onChange={(e) =>
                  setForm({ ...form, allowAdminValidityOverride: e.target.checked })
                }
                className="rounded border-slate-300"
              />
              Admin darf Gültigkeiten ändern
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.allowAdminPassingScoreOverride}
                onChange={(e) =>
                  setForm({
                    ...form,
                    allowAdminPassingScoreOverride: e.target.checked,
                  })
                }
                className="rounded border-slate-300"
              />
              Admin darf Bestehensgrenzen ändern
            </label>
          </div>
        </div>
        {!hideActions && (
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
            {onCancel && (
              <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
                Abbrechen
              </Button>
            )}
            {showNavLinks && (
              <>
                <Link href={`/certiano/companies/${companyId}/branding`}>
                  <Button type="button" variant="secondary">
                    Firmenbranding
                  </Button>
                </Link>
                <Link href={`/certiano/companies/${companyId}/users`}>
                  <Button type="button" variant="secondary">
                    Benutzer
                  </Button>
                </Link>
                <Link href={`/certiano/companies/${companyId}/courses`}>
                  <Button type="button" variant="secondary">
                    Kursfreigaben
                  </Button>
                </Link>
                <Link href={`/certiano/companies/${companyId}/data-export`}>
                  <Button type="button" variant="secondary">
                    Datenexport
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </form>
    </>
  );
}
