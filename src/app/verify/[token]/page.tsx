import { getCertificateByToken, getUserForCertificate } from "@/lib/certificate";
import { getCourseForContext } from "@/lib/course";
import { getCompanyById } from "@/lib/tenant";
import { verificationStatus } from "@/lib/status";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const statusColors = {
  gültig: "bg-emerald-100 text-emerald-800",
  abgelaufen: "bg-amber-100 text-amber-800",
  ungültig: "bg-red-100 text-red-800",
};

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cert = await getCertificateByToken(token);

  if (!cert) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center px-4"
        tabIndex={-1}
      >
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-700">Ungültig</h1>
          <p className="readable-text mt-2 text-base text-slate-600">
            Dieses Zertifikat konnte nicht gefunden werden.
          </p>
        </div>
      </main>
    );
  }

  const user = await getUserForCertificate(cert);
  const status = verificationStatus(cert);
  const company = cert.companyId ? await getCompanyById(cert.companyId) : undefined;
  let courseName = "Schulung";
  if (cert.companyId) {
    try {
      const course = await getCourseForContext(cert.companyId, cert.courseId);
      courseName = course.courseName;
    } catch {
      /* ignore */
    }
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center px-4 py-12"
      tabIndex={-1}
    >
      <article className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        {company && (
          <p className="text-center text-xs text-slate-500">{company.name}</p>
        )}
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand">
          Zertifikatsprüfung
        </p>
        <h1 className="mt-2 text-center text-xl font-bold">{courseName}</h1>

        <p
          className={`mt-6 rounded-xl px-4 py-3 text-center text-lg font-bold ${statusColors[status]}`}
          role="status"
        >
          Status: {status}
        </p>

        <dl className="mt-8 space-y-4 text-sm">
          <div>
            <dt className="text-slate-500">Zertifikatsnummer</dt>
            <dd className="font-semibold">{cert.certificateNumber}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd className="font-semibold">
              {user ? `${user.firstName} ${user.lastName}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Kursname</dt>
            <dd className="font-semibold">{courseName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Abschlussdatum</dt>
            <dd className="font-semibold">{formatDate(cert.issuedAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Gültig bis</dt>
            <dd className="font-semibold">
              {cert.validUntil ? formatDate(cert.validUntil) : "Unbegrenzt gültig"}
            </dd>
          </div>
        </dl>

        <p className="mt-8 text-center text-xs text-slate-400">
          Öffentliche Verifikation · Nur begrenzte Daten sichtbar
        </p>
      </article>
    </main>
  );
}
