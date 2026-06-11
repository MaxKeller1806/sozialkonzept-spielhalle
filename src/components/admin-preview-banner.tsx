import { Card } from "@/components/ui";

export function AdminPreviewBanner({ fromMaster }: { fromMaster?: boolean }) {
  return (
    <Card className="mb-6 border-sky-200 bg-sky-50">
      <p className="text-sm text-sky-900">
        <strong>Admin-Vorschau</strong> – Mitarbeiteransicht ohne Fortschritt,
        Zertifikate oder Datenschutz-Flows. Es werden keine Schulungsdaten
        gespeichert.
        {fromMaster ? " Certiano-bereitgestellter Kurs." : null}
      </p>
    </Card>
  );
}
