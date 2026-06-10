import type { CompanyStatus, LicenseStatus } from "./types";

export function companyStatusLabel(status: string): string {
  switch (status as CompanyStatus) {
    case "pending":
      return "In Prüfung";
    case "active":
      return "Aktiv";
    case "disabled":
      return "Inaktiv";
    case "expired":
      return "Archiviert";
    default:
      return status;
  }
}

export function companyStatusDotClass(status: string): string {
  switch (status as CompanyStatus) {
    case "pending":
      return "bg-amber-400";
    case "active":
      return "bg-emerald-500";
    case "disabled":
      return "bg-slate-400";
    case "expired":
      return "bg-red-500";
    default:
      return "bg-slate-400";
  }
}

export function licenseStatusDotClass(status: string): string {
  switch (status as LicenseStatus) {
    case "active":
      return "bg-emerald-500";
    case "expired":
      return "bg-red-500";
    case "unlicensed":
    case "disabled":
    default:
      return "bg-slate-400";
  }
}

export function companyStatusBadgeClass(status: string): string {
  switch (status as CompanyStatus) {
    case "pending":
      return "bg-amber-100 text-amber-900 ring-amber-200/60";
    case "active":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200/60";
    case "disabled":
      return "bg-slate-100 text-slate-700 ring-slate-200/60";
    case "expired":
      return "bg-red-100 text-red-800 ring-red-200/60";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200/60";
  }
}

export function licenseStatusLabel(status: string): string {
  switch (status as LicenseStatus) {
    case "unlicensed":
      return "Nicht lizenziert";
    case "active":
      return "Lizenziert";
    case "expired":
      return "Abgelaufen";
    case "disabled":
      return "Deaktiviert";
    default:
      return status;
  }
}

export function licenseStatusBadgeClass(status: string): string {
  switch (status as LicenseStatus) {
    case "active":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200/60";
    case "expired":
      return "bg-red-100 text-red-800 ring-red-200/60";
    case "unlicensed":
    case "disabled":
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200/60";
  }
}
