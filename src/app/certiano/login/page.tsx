import { fetchOperatorBranding } from "@/lib/operator-branding";
import { CertianoLoginForm } from "./certiano-login-form";

export const dynamic = "force-dynamic";

export default async function CertianoLoginPage() {
  const { name, branding } = await fetchOperatorBranding();

  return <CertianoLoginForm branding={branding} displayName={name} />;
}
