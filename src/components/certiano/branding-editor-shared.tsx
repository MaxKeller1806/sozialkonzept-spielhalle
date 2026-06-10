"use client";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui";
import {
  computeAutoTextColors,
  resolveBrandingTextColors,
} from "@/lib/branding-text-colors";
import type { CompanyBranding } from "@/lib/types";

export interface BrandingFormState {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  textSecondaryColor: string;
  menuTextColor: string;
  buttonTextColor: string;
  logoUrl: string;
}

export type EditorPersistState = {
  form: BrandingFormState;
  autoTextColors: boolean;
};

function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

export function textColorsMatchAuto(form: BrandingFormState): boolean {
  const auto = computeAutoTextColors(form);
  return (
    normalizeHex(form.textColor) === normalizeHex(auto.textColor) &&
    normalizeHex(form.textSecondaryColor) === normalizeHex(auto.textSecondaryColor) &&
    normalizeHex(form.menuTextColor) === normalizeHex(auto.menuTextColor) &&
    normalizeHex(form.buttonTextColor) === normalizeHex(auto.buttonTextColor)
  );
}

export function brandingFromForm(
  form: BrandingFormState,
  autoTextColors: boolean
): CompanyBranding {
  const surface = {
    primaryColor: form.primaryColor,
    secondaryColor: form.secondaryColor,
    backgroundColor: form.backgroundColor,
    accentColor: form.accentColor,
  };
  const text = resolveBrandingTextColors(surface, form, autoTextColors);
  return {
    ...surface,
    ...text,
    logoUrl: form.logoUrl || null,
    loginBackgroundUrl: null,
  };
}

export function formFromBranding(name: string, branding: CompanyBranding): BrandingFormState {
  return {
    name,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    backgroundColor: branding.backgroundColor,
    accentColor: branding.accentColor,
    textColor: branding.textColor,
    textSecondaryColor: branding.textSecondaryColor,
    menuTextColor: branding.menuTextColor,
    buttonTextColor: branding.buttonTextColor,
    logoUrl: branding.logoUrl ?? "",
  };
}

export function ColorField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-60" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5 disabled:cursor-not-allowed"
          aria-label={label}
        />
        <span className="font-mono text-xs uppercase text-slate-500">{value}</span>
      </div>
    </label>
  );
}

export function LogoUploadField({
  label,
  logoUrl,
  uploading,
  onUpload,
  onRemove,
  fileInputRef,
  deferred = false,
  deferredMessage = "Diese Funktion befindet sich derzeit in Vorbereitung.",
}: {
  label: string;
  logoUrl: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  deferred?: boolean;
  deferredMessage?: string;
}) {
  if (deferred) {
    return (
      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">{deferredMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        {logoUrl ? (
          <div className="mb-3 flex items-start gap-3">
            <BrandLogo src={logoUrl} variant="preview-box" />
            <button
              type="button"
              className="shrink-0 text-sm text-slate-600 underline hover:text-slate-900"
              onClick={onRemove}
            >
              Entfernen
            </button>
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="!w-auto"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Wird hochgeladen…" : "Logo hochladen"}
        </Button>
        <p className="mt-2 text-xs text-slate-500">PNG, JPG oder SVG · max. 2 MB</p>
      </div>
    </div>
  );
}
