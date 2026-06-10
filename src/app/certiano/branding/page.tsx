import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CertianoBrandingRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const companyId = params.companyId;

  if (typeof companyId === "string" && companyId) {
    redirect(`/certiano/companies/${companyId}/branding`);
  }

  redirect("/certiano/einstellungen/branding");
}
