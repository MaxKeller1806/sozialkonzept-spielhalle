"use client";

import {
  CourseAssignmentPicker,
  type AssignableCourse,
} from "@/components/course-assignment-picker";
import { Button, Input } from "@/components/ui";

export type EmployeeFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  birthPlace: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  location: string;
  joinedCompanyAt: string;
  leftCompanyAt: string;
};

export type EmployeeCategoryOption = {
  id: number;
  name: string;
  courseCount: number;
  totalDurationMinutes: number;
};

type EmployeeEditFormProps = {
  editId: number | null;
  form: EmployeeFormState;
  onFormChange: (form: EmployeeFormState) => void;
  employeeCategories: EmployeeCategoryOption[];
  employeeCategoryId: number | "";
  onCategoryChange: (value: string) => void;
  categoryPrompt: string[] | null;
  onAcceptCategoryPrompt: () => void;
  onDismissCategoryPrompt: () => void;
  formLoading: boolean;
  assignableCourses: AssignableCourse[];
  selectedCourseIds: string[];
  onSelectedCourseIdsChange: (ids: string[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  formId?: string;
  hideActions?: boolean;
  error?: string;
};

export function EmployeeEditForm({
  editId,
  form,
  onFormChange,
  employeeCategories,
  employeeCategoryId,
  onCategoryChange,
  categoryPrompt,
  onAcceptCategoryPrompt,
  onDismissCategoryPrompt,
  formLoading,
  assignableCourses,
  selectedCourseIds,
  onSelectedCourseIdsChange,
  onSubmit,
  formId = "employee-edit-form",
  hideActions = false,
  error,
}: EmployeeEditFormProps) {
  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      <form id={formId} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Vorname"
          required
          value={form.firstName}
          onChange={(e) => onFormChange({ ...form, firstName: e.target.value })}
        />
        <Input
          label="Nachname"
          required
          value={form.lastName}
          onChange={(e) => onFormChange({ ...form, lastName: e.target.value })}
        />
        <Input
          label="E-Mail"
          type="email"
          required
          value={form.email}
          onChange={(e) => onFormChange({ ...form, email: e.target.value })}
        />
        <Input
          label={editId ? "Neues Passwort (optional)" : "Passwort"}
          type="password"
          required={!editId}
          value={form.password}
          onChange={(e) => onFormChange({ ...form, password: e.target.value })}
        />
        <Input
          label="Geburtsdatum"
          type="date"
          value={form.birthDate}
          onChange={(e) => onFormChange({ ...form, birthDate: e.target.value })}
        />
        <Input
          label="Geburtsort"
          value={form.birthPlace}
          onChange={(e) => onFormChange({ ...form, birthPlace: e.target.value })}
        />
        <Input
          label="Straße"
          value={form.street}
          onChange={(e) => onFormChange({ ...form, street: e.target.value })}
        />
        <Input
          label="Hausnummer"
          value={form.houseNumber}
          onChange={(e) => onFormChange({ ...form, houseNumber: e.target.value })}
        />
        <Input
          label="Postleitzahl"
          value={form.postalCode}
          onChange={(e) => onFormChange({ ...form, postalCode: e.target.value })}
        />
        <Input
          label="Ort"
          value={form.city}
          onChange={(e) => onFormChange({ ...form, city: e.target.value })}
        />
        <Input
          label="Spielhalle"
          value={form.location}
          onChange={(e) => onFormChange({ ...form, location: e.target.value })}
        />
        <Input
          label="Eintrittsdatum (optional)"
          type="date"
          value={form.joinedCompanyAt}
          onChange={(e) =>
            onFormChange({ ...form, joinedCompanyAt: e.target.value })
          }
        />
        <Input
          label="Austrittsdatum (optional)"
          type="date"
          value={form.leftCompanyAt}
          onChange={(e) =>
            onFormChange({ ...form, leftCompanyAt: e.target.value })
          }
        />
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-slate-700">
            Mitarbeiterkategorie
          </span>
          <select
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            value={employeeCategoryId === "" ? "" : String(employeeCategoryId)}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">Keine Kategorie</option>
            {employeeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
                {cat.courseCount > 0 ? ` · ${cat.courseCount} Schulungen` : ""}
              </option>
            ))}
          </select>
        </label>
        {categoryPrompt && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
            <p className="mb-3">
              Standard-Schulungen der neuen Kategorie übernehmen?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onAcceptCategoryPrompt}>
                Übernehmen
              </Button>
              <Button type="button" variant="secondary" onClick={onDismissCategoryPrompt}>
                Aktuelle Auswahl behalten
              </Button>
            </div>
          </div>
        )}
        {formLoading ? (
          <p className="text-sm text-slate-600 sm:col-span-2">
            Kurszuweisungen werden geladen…
          </p>
        ) : (
          <CourseAssignmentPicker
            courses={assignableCourses}
            selectedIds={selectedCourseIds}
            onChange={onSelectedCourseIdsChange}
          />
        )}
        {!hideActions && (
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit">Speichern</Button>
          </div>
        )}
      </form>
    </>
  );
}
