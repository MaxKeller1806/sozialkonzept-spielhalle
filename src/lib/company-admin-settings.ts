import { getCompanyById } from "./tenant";

export type CompanyAdminSettings = {
  allowAdminValidityOverride: boolean;
  allowAdminPassingScoreOverride: boolean;
};

export async function getCompanyAdminSettings(
  companyId: number
): Promise<CompanyAdminSettings> {
  const company = await getCompanyById(companyId);
  return {
    allowAdminValidityOverride: company?.allowAdminValidityOverride === true,
    allowAdminPassingScoreOverride:
      company?.allowAdminPassingScoreOverride === true,
  };
}
