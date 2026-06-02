"use client";

import type { ValidityIntervalUnit, ValidityType } from "@/lib/course-validity";
import { VALIDITY_TYPE_LABELS } from "@/lib/course-validity";

export interface ValidityRuleFormValue {
  validityType: ValidityType;
  validityIntervalValue: string;
  validityIntervalUnit: ValidityIntervalUnit;
}

interface ValidityRuleFormProps {
  value: ValidityRuleFormValue;
  onChange: (value: ValidityRuleFormValue) => void;
  disabled?: boolean;
}

export function ValidityRuleForm({ value, onChange, disabled }: ValidityRuleFormProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-sm font-medium text-slate-700">Wiederholung / Gültigkeit</span>
        <select
          value={value.validityType}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              validityType: e.target.value as ValidityType,
            })
          }
          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          {(Object.keys(VALIDITY_TYPE_LABELS) as ValidityType[]).map((key) => (
            <option key={key} value={key}>
              {VALIDITY_TYPE_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
      {value.validityType === "custom" && (
        <>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Anzahl</span>
            <input
              type="number"
              min={1}
              disabled={disabled}
              value={value.validityIntervalValue}
              onChange={(e) =>
                onChange({ ...value, validityIntervalValue: e.target.value })
              }
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Einheit</span>
            <select
              value={value.validityIntervalUnit}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...value,
                  validityIntervalUnit: e.target.value as ValidityIntervalUnit,
                })
              }
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="days">Tage</option>
              <option value="months">Monate</option>
              <option value="years">Jahre</option>
            </select>
          </label>
        </>
      )}
    </div>
  );
}
