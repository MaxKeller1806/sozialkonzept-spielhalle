import { headers } from "next/headers";
import { APP_NAME } from "@/lib/branding";
import { DEFAULT_BRANDING } from "@/lib/branding-theme";
import { postgresErrorFields } from "@/lib/db";
import { fetchOperatorBranding } from "@/lib/operator-branding";
import { resolveTenant } from "@/lib/tenant-resolve";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ firma?: string; slug?: string; portal?: string }>;
}) {
  const params = await searchParams;
  const companyCode = params.firma ?? params.slug ?? "";
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? null;

  const [tenantResult, brandingResult] = await Promise.allSettled([
    resolveTenant({
      host,
      companyCode: companyCode || null,
    }),
    fetchOperatorBranding(),
  ]);

  if (tenantResult.status === "rejected") {
    console.error(
      "[login] resolveTenant fehlgeschlagen:",
      postgresErrorFields(tenantResult.reason)
    );
  }
  if (brandingResult.status === "rejected") {
    console.error(
      "[login] fetchOperatorBranding fehlgeschlagen:",
      postgresErrorFields(brandingResult.reason)
    );
  }

  const tenant = tenantResult.status === "fulfilled" ? tenantResult.value : null;
  const operatorBranding =
    brandingResult.status === "fulfilled"
      ? brandingResult.value
      : { name: APP_NAME, branding: DEFAULT_BRANDING };

  return (
    <LoginForm
      initialTenant={tenant}
      initialCompanyCode={companyCode}
      operatorLogoUrl={operatorBranding.branding.logoUrl}
      portal={params.portal ?? null}
    />
  );
}
