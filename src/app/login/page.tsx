import { headers } from "next/headers";
import { resolveTenant } from "@/lib/tenant-resolve";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ firma?: string; slug?: string }>;
}) {
  const params = await searchParams;
  const companyCode = params.firma ?? params.slug ?? "";
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? null;

  const tenant = await resolveTenant({
    host,
    companyCode: companyCode || null,
  });

  return (
    <LoginForm initialTenant={tenant} initialCompanyCode={companyCode} />
  );
}
