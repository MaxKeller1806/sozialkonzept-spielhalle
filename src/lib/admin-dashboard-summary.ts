import { getAdminPrivacyDashboardCounts } from "./admin-privacy-status-list";
import {
  getAdminTrainingDashboardCounts,
  type AdminTrainingDashboardCounts,
} from "./admin-training-status-list";
import { countActiveEmployees } from "./admin-users-list";
import { getCompanyById } from "./tenant";

export type AdminDashboardSummary = {
  companyId: number;
  companyName: string;
  activeEmployees: number;
  privacy: {
    open: number;
    accepted: number;
  };
  training: AdminTrainingDashboardCounts;
};

export async function getAdminDashboardSummary(
  companyId: number
): Promise<AdminDashboardSummary> {
  const [company, activeEmployees, privacyCounts, trainingCounts] =
    await Promise.all([
      getCompanyById(companyId),
      countActiveEmployees(companyId),
      getAdminPrivacyDashboardCounts(companyId),
      getAdminTrainingDashboardCounts(companyId),
    ]);

  return {
    companyId,
    companyName: company?.name ?? "",
    activeEmployees,
    privacy: {
      open: privacyCounts.open,
      accepted: privacyCounts.accepted,
    },
    training: trainingCounts,
  };
}
