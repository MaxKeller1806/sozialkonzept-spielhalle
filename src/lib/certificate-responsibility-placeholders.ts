import {
  getCompanyResponsibilityPlaceholderValues,
  getCourseResponsibilityContext,
} from "./company-responsibilities";
import type { GenericResponsibilityContext } from "./responsibility-placeholders";
import type { ResponsibilityPlaceholderMap } from "./responsibility-placeholders";

export type CertificateResponsibilityPlaceholders = {
  responsibilityPlaceholders: ResponsibilityPlaceholderMap;
  genericResponsibility: GenericResponsibilityContext | null;
};

export async function getCertificateResponsibilityPlaceholders(
  companyId: number,
  courseId: string
): Promise<CertificateResponsibilityPlaceholders> {
  const [responsibilityPlaceholders, genericResponsibility] = await Promise.all([
    getCompanyResponsibilityPlaceholderValues(companyId),
    getCourseResponsibilityContext(companyId, courseId),
  ]);

  return { responsibilityPlaceholders, genericResponsibility };
}
