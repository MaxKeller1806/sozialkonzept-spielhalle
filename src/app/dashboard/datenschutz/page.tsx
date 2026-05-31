import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyPrivacyStats } from "@/lib/privacy";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminDatenschutzPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || !user.companyId) {
    redirect("/login");
  }

  const stats = await getCompanyPrivacyStats(user.companyId);

  return (
    <div className="min-h-screen pb-16">
      <AppHeader title="Datenschutzstatus" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <AdminNav active="datenschutz" />
        <Card>
          <h2 className="text-lg font-bold">Bestätigungsstatus Mitarbeiter</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Aktuelle Version</dt>
              <dd className="font-semibold">{stats.currentVersion ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Mitarbeiter gesamt (aktiv)</dt>
              <dd className="font-semibold">{stats.totalEmployees}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Aktuelle Version bestätigt</dt>
              <dd className="font-semibold">
                {stats.acceptedCurrent} von {stats.totalEmployees}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs text-slate-500">
            Einzelne Bestätigungsdetails mit IP/User-Agent sind in der
            Mitarbeiterliste als Status sichtbar.
          </p>
        </Card>
      </div>
    </div>
  );
}
