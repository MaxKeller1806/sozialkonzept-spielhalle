import { getAdminPrivacyStatusStats } from "./admin-privacy-status-list";
import {
  getAdminTrainingDashboardCounts,
  type AdminTrainingDashboardCounts,
} from "./admin-training-status-list";
import {
  listAdminEmployees,
  parseAdminEmployeeListQuery,
} from "./admin-users-list";
import { getCompanyById } from "./tenant";

export type AdminDashboardSummary = {
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
  const employeeQuery = parseAdminEmployeeListQuery(
    new URLSearchParams({ pageSize: "1", status: "active" })
  );

  const [company, employeeResult, privacyStats, trainingCounts] =
    await Promise.all([
      getCompanyById(companyId),
      listAdminEmployees(companyId, employeeQuery),
      getAdminPrivacyStatusStats(companyId),
      getAdminTrainingDashboardCounts(companyId),
    ]);

  return {
    companyName: company?.name ?? "",
    activeEmployees: employeeResult.meta.total,
    privacy: {
      open: privacyStats.open,
      accepted: privacyStats.accepted,
    },
    training: trainingCounts,
  };
}
