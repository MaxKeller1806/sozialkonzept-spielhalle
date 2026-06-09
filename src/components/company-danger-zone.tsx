"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin-modal";
import { Button, Card } from "@/components/ui";

type CompanyOption = { id: number; name: string };

type CompanyDangerZoneProps = {
  companyId: number;
  companyName: string;
  /** Nach erfolgreicher Löschung (z. B. Drawer schließen statt Redirect). */
  onDeleted?: () => void;
};

export function CompanyDangerZone({
  companyId,
  companyName,
  onDeleted,
}: CompanyDangerZoneProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const loadCompanies = useCallback(() => {
    setLoadingCompanies(true);
    fetch("/api/superuser/companies/delete-options")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCompanies(d.companies ?? []))
      .catch(() => setCompanies([]))
      .finally(() => setLoadingCompanies(false));
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      setSelectedId("");
      setError("");
      loadCompanies();
    }
  }, [dialogOpen, loadCompanies]);

  function openDialog() {
    setDialogOpen(true);
  }

  function closeDialog() {
    if (deleting) return;
    setDialogOpen(false);
    setSelectedId("");
    setError("");
  }

  async function confirmDelete() {
    if (selectedId !== companyId) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/superuser/companies/${companyId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCompanyId: companyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Löschen fehlgeschlagen.");
        return;
      }
      setDialogOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.replace("/certiano?companyDeleted=1");
      }
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = selectedId === companyId;

  return (
    <>
      <Card className="mt-6 border-red-200 bg-red-50/40">
        <h2 className="text-lg font-bold text-red-900">Gefahrenbereich</h2>
        <p className="mt-2 text-sm text-red-800">
          Diese Aktion löscht die Firma und alle zugehörigen Daten dauerhaft.
        </p>
        <Button
          type="button"
          variant="danger"
          className="mt-4 !w-auto"
          onClick={openDialog}
        >
          Firma löschen
        </Button>
      </Card>

      <AdminModal
        open={dialogOpen}
        onClose={closeDialog}
        title="Firma löschen"
        error={error}
        saving={deleting}
        maxWidthClass="max-w-md"
        footer={
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="danger"
              disabled={!canDelete || deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Löschen…" : "Firma endgültig löschen"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={deleting}
              onClick={closeDialog}
            >
              Abbrechen
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700">
          Diese Aktion löscht die Firma und alle zugehörigen Daten dauerhaft.
        </p>
        <p className="mt-3 text-sm text-slate-700">
          Bitte wählen Sie die zu löschende Firma zur Bestätigung erneut aus.
        </p>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">Firma</span>
          <select
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"
            value={selectedId === "" ? "" : String(selectedId)}
            disabled={loadingCompanies || deleting}
            onChange={(e) =>
              setSelectedId(e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="">
              {loadingCompanies ? "Lädt Firmen…" : "Bitte Firma wählen"}
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {companyName && (
          <p className="mt-2 text-xs text-slate-500">
            Aktuell geöffnet: <strong>{companyName}</strong>
          </p>
        )}
      </AdminModal>
    </>
  );
}
