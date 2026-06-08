"use client";

import { useEffect, useMemo, useState } from "react";

interface IndustryRow {
  id: number;
  name: string;
  active: boolean;
  businessTypes: Array<{
    id: number;
    name: string;
    industryId: number;
    active: boolean;
  }>;
}

type Props = {
  industryId: number | "";
  businessTypeId: number | "";
  onIndustryChange: (industryId: number | "") => void;
  onBusinessTypeChange: (businessTypeId: number | "") => void;
  disabled?: boolean;
};

export function IndustryBusinessTypeSelect({
  industryId,
  businessTypeId,
  onIndustryChange,
  onBusinessTypeChange,
  disabled = false,
}: Props) {
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superuser/industries?filter=all")
      .then((r) => (r.ok ? r.json() : { industries: [] }))
      .then((d) => setIndustries(d.industries ?? []))
      .finally(() => setLoading(false));
  }, []);

  const industryOptions = useMemo(
    () =>
      industries.filter(
        (i) => i.active || (industryId !== "" && i.id === industryId)
      ),
    [industries, industryId]
  );

  const businessTypes = useMemo(() => {
    if (industryId === "") return [];
    const industry = industries.find((i) => i.id === industryId);
    return (industry?.businessTypes ?? []).filter(
      (bt) => bt.active || (businessTypeId !== "" && bt.id === businessTypeId)
    );
  }, [industries, industryId, businessTypeId]);

  function handleIndustryChange(value: string) {
    const next = value === "" ? "" : Number(value);
    onIndustryChange(next);
    onBusinessTypeChange("");
  }

  if (loading) {
    return (
      <p className="sm:col-span-2 text-sm text-slate-600">
        Branchen werden geladen…
      </p>
    );
  }

  return (
    <>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Branche (optional)</span>
        <select
          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"
          value={industryId === "" ? "" : String(industryId)}
          disabled={disabled}
          onChange={(e) => handleIndustryChange(e.target.value)}
        >
          <option value="">Keine Branche</option>
          {industryOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
              {!i.active ? " (inaktiv)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Betriebstyp (optional)</span>
        <select
          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"
          value={businessTypeId === "" ? "" : String(businessTypeId)}
          disabled={disabled || industryId === ""}
          onChange={(e) =>
            onBusinessTypeChange(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
        >
          <option value="">
            {industryId === "" ? "Zuerst Branche wählen" : "Kein Betriebstyp"}
          </option>
          {businessTypes.map((bt) => (
            <option key={bt.id} value={bt.id}>
              {bt.name}
              {!bt.active ? " (inaktiv)" : ""}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
