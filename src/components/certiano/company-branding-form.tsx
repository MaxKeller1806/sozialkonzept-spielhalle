"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import {
  BrandingLivePreview,
  type BrandingPreviewMode,
} from "@/components/certiano/branding-live-preview";
import {
  brandingFromForm,
  ColorField,
  formFromBranding,
  LogoUploadField,
  textColorsMatchAuto,
  type BrandingFormState,
  type EditorPersistState,
} from "@/components/certiano/branding-editor-shared";
import { invalidateTenantBrandingCache } from "@/components/tenant-branding-loader";
import { Button, Input } from "@/components/ui";
import { PORTAL_NAME_ADMIN } from "@/lib/branding";
import {
  BRANDING_COLOR_PRESETS,
  defaultBrandingFormState,
  matchBrandingPreset,
  presetToFormColors,
  type BrandingColorPresetId,
} from "@/lib/branding-presets";
import { resolveBrandingTextColors } from "@/lib/branding-text-colors";
import type { CompanyBranding } from "@/lib/types";

type CompanyBrandingFormProps = {
  companyId: number;
};

export function CompanyBrandingForm({ companyId }: CompanyBrandingFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<BrandingFormState>(() => defaultBrandingFormState(""));
  const [contactPerson, setContactPerson] = useState("");
  const [savedState, setSavedState] = useState<EditorPersistState>(() => ({
    form: defaultBrandingFormState(""),
    autoTextColors: true,
  }));
  const [savedContactPerson, setSavedContactPerson] = useState("");
  const [autoTextColors, setAutoTextColors] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<BrandingColorPresetId | "custom">("custom");
  const [customColorsOpen, setCustomColorsOpen] = useState(false);
  const [advancedTextColorsOpen, setAdvancedTextColorsOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<BrandingPreviewMode>("desktop");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const effectiveTextColors = useMemo(
    () =>
      resolveBrandingTextColors(
        {
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          backgroundColor: form.backgroundColor,
          accentColor: form.accentColor,
        },
        form,
        autoTextColors
      ),
    [autoTextColors, form]
  );

  const previewBranding = useMemo(
    (): CompanyBranding => ({
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      backgroundColor: form.backgroundColor,
      accentColor: form.accentColor,
      ...effectiveTextColors,
      logoUrl: form.logoUrl || null,
      loginBackgroundUrl: null,
    }),
    [effectiveTextColors, form]
  );

  const applyEditorState = useCallback((next: EditorPersistState) => {
    setForm(next.form);
    setAutoTextColors(next.autoTextColors);
    const preset = matchBrandingPreset(next.form);
    setSelectedPreset(preset ?? "custom");
    if (!preset) setCustomColorsOpen(true);
  }, []);

  const load = useCallback(() => {
    fetch(`/api/superuser/companies/${companyId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.company) return;
        const nextForm = formFromBranding(d.company.name, d.company.branding as CompanyBranding);
        const nextState: EditorPersistState = {
          form: nextForm,
          autoTextColors: textColorsMatchAuto(nextForm),
        };
        applyEditorState(nextState);
        setSavedState(nextState);
        const cp = d.company.contactPerson ?? "";
        setContactPerson(cp);
        setSavedContactPerson(cp);
      })
      .catch(() => setError("Firmenbranding konnte nicht geladen werden."));
  }, [applyEditorState, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateForm(patch: Partial<BrandingFormState>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      const preset = matchBrandingPreset(next);
      setSelectedPreset(preset ?? "custom");
      return next;
    });
  }

  function applyPreset(presetId: BrandingColorPresetId) {
    const preset = BRANDING_COLOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setForm((prev) => ({
      ...prev,
      ...presetToFormColors(preset),
    }));
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("companyId", String(companyId));

      const res = await fetch("/api/superuser/branding/logo", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Logo konnte nicht hochgeladen werden.");
        return;
      }
      if (data.logoUrl) {
        updateForm({ logoUrl: data.logoUrl });
        setMessage("Logo hochgeladen und gespeichert.");
      }
    } catch {
      setError("Logo konnte nicht hochgeladen werden. Bitte erneut versuchen.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    const payload = brandingFromForm(form, autoTextColors);

    try {
      const res = await fetch(`/api/superuser/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactPerson: contactPerson || null,
          ...payload,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      if (d.company) {
        const nextState: EditorPersistState = {
          form: formFromBranding(d.company.name, d.company.branding as CompanyBranding),
          autoTextColors,
        };
        applyEditorState(nextState);
        setSavedState(nextState);
        const cp = d.company.contactPerson ?? "";
        setContactPerson(cp);
        setSavedContactPerson(cp);
      }
      invalidateTenantBrandingCache();
      setMessage("Firmenbranding gespeichert.");
    } finally {
      setSaving(false);
    }
  }

  const hasUnsavedChanges =
    JSON.stringify({ form, autoTextColors, contactPerson }) !==
    JSON.stringify({ form: savedState.form, autoTextColors: savedState.autoTextColors, contactPerson: savedContactPerson });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,35fr)_minmax(0,65fr)] xl:items-start">
      <form onSubmit={save} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Firmenbranding: {form.name || "…"}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Logo, Farben und Ansprechpartner für Login, Dashboard und Schulung dieser Firma.
          </p>
        </div>

        {message ? (
          <p className="rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">{message}</p>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Firma &amp; Logo
          </h3>
          <Input
            label="Anzeigename"
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
          />
          <Input
            label="Ansprechpartner"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="z. B. Max Mustermann"
          />
          <LogoUploadField
            label="Firmenlogo"
            logoUrl={form.logoUrl}
            uploading={uploadingLogo}
            onUpload={handleLogoUpload}
            onRemove={() => updateForm({ logoUrl: "" })}
            fileInputRef={fileInputRef}
            deferred
            deferredMessage="Die Unterstützung für individuelle Firmenlogos wird in einer zukünftigen Version verfügbar sein."
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Firmenfarben
          </h3>
          <div className="space-y-2">
            {BRANDING_COLOR_PRESETS.map((preset) => (
              <label
                key={preset.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                  selectedPreset === preset.id
                    ? "border-brand bg-brand-light/40"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="colorPreset"
                  className="text-brand focus:ring-brand"
                  checked={selectedPreset === preset.id}
                  onChange={() => applyPreset(preset.id)}
                />
                <span className="flex-1 text-sm font-medium text-slate-800">{preset.label}</span>
                <span className="flex gap-1" aria-hidden>
                  {[
                    preset.primaryColor,
                    preset.secondaryColor,
                    preset.accentColor,
                    preset.backgroundColor,
                    preset.textColor,
                  ].map((color) => (
                    <span
                      key={`${preset.id}-${color}`}
                      className="h-4 w-4 rounded-full border border-slate-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-800"
            onClick={() => setCustomColorsOpen((open) => !open)}
            aria-expanded={customColorsOpen}
          >
            Farben individuell anpassen
            <span className="text-slate-400">{customColorsOpen ? "▲" : "▼"}</span>
          </button>
          {customColorsOpen ? (
            <div className="grid gap-3 border-t border-slate-200 px-4 py-4 sm:grid-cols-2">
              <ColorField
                label="Primärfarbe"
                value={form.primaryColor}
                onChange={(primaryColor) => updateForm({ primaryColor })}
              />
              <ColorField
                label="Sekundärfarbe"
                value={form.secondaryColor}
                onChange={(secondaryColor) => updateForm({ secondaryColor })}
              />
              <ColorField
                label="Akzentfarbe"
                value={form.accentColor}
                onChange={(accentColor) => updateForm({ accentColor })}
              />
              <ColorField
                label="Hintergrundfarbe"
                value={form.backgroundColor}
                onChange={(backgroundColor) => updateForm({ backgroundColor })}
              />
            </div>
          ) : null}
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 rounded border-slate-300 text-brand focus:ring-brand"
              checked={autoTextColors}
              onChange={(e) => setAutoTextColors(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">
                Schriftfarben automatisch berechnen
              </span>
            </span>
          </label>

          {autoTextColors ? (
            <div className="grid gap-2 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600 sm:grid-cols-2">
              <p>Haupttext: {effectiveTextColors.textColor}</p>
              <p>Sekundärtext: {effectiveTextColors.textSecondaryColor}</p>
              <p>Menütext: {effectiveTextColors.menuTextColor}</p>
              <p>Buttontext: {effectiveTextColors.buttonTextColor}</p>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-brand focus:ring-brand"
              checked={advancedTextColorsOpen}
              onChange={(e) => setAdvancedTextColorsOpen(e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-800">Erweiterte Farben anzeigen</span>
          </label>

          {advancedTextColorsOpen ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField
                label="Haupttextfarbe"
                value={autoTextColors ? effectiveTextColors.textColor : form.textColor}
                disabled={autoTextColors}
                onChange={(textColor) => updateForm({ textColor })}
              />
              <ColorField
                label="Sekundärtextfarbe"
                value={
                  autoTextColors ? effectiveTextColors.textSecondaryColor : form.textSecondaryColor
                }
                disabled={autoTextColors}
                onChange={(textSecondaryColor) => updateForm({ textSecondaryColor })}
              />
              <ColorField
                label="Menütextfarbe"
                value={autoTextColors ? effectiveTextColors.menuTextColor : form.menuTextColor}
                disabled={autoTextColors}
                onChange={(menuTextColor) => updateForm({ menuTextColor })}
              />
              <ColorField
                label="Buttontextfarbe"
                value={
                  autoTextColors ? effectiveTextColors.buttonTextColor : form.buttonTextColor
                }
                disabled={autoTextColors}
                onChange={(buttonTextColor) => updateForm({ buttonTextColor })}
              />
            </div>
          ) : null}
        </section>

        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </Button>
          <Link
            href={`/certiano/companies/${companyId}`}
            className="inline-flex min-h-[44px] items-center text-sm text-brand underline"
          >
            ← Firmendaten
          </Link>
        </div>
        {hasUnsavedChanges ? (
          <p className="text-xs text-slate-500">Es gibt ungespeicherte Änderungen.</p>
        ) : null}
      </form>

      <aside className="sticky top-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {form.logoUrl ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Logo-Vorschau</h3>
            <BrandLogo src={form.logoUrl} variant="preview-box" />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Live-Vorschau</h3>
            <p className="text-xs text-slate-500">Login, Dashboard und Schulung der Firma.</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
            {(
              [
                ["desktop", "Desktop"],
                ["tablet", "Tablet"],
                ["mobile", "Mobile"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  previewMode === mode
                    ? "bg-white text-brand shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setPreviewMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <BrandingLivePreview
          name={form.name}
          branding={previewBranding}
          mode={previewMode}
          areaLabel="Schulungsbereich"
          portalName={PORTAL_NAME_ADMIN}
          previewDescription="So wirkt das Firmenbranding im Kundenbereich."
        />
      </aside>
    </div>
  );
}
