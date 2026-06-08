/**
 * Benchmark für getAdminDashboardSummary und Teilfunktionen.
 * Usage: npx tsx scripts/benchmark-dashboard-summary.ts [companyId]
 */
import { performance } from "node:perf_hooks";
import { getSql, resetSql } from "../src/lib/db";
import { getAdminDashboardSummary } from "../src/lib/admin-dashboard-summary";
import { getAdminPrivacyStatusStats } from "../src/lib/admin-privacy-status-list";
import { getAdminTrainingDashboardCounts } from "../src/lib/admin-training-status-list";
import { getCompanyById } from "../src/lib/tenant";
import { getSql as getSqlForCount } from "../src/lib/db";

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  console.log(`  ${label}: ${(performance.now() - start).toFixed(1)}ms`);
  return result;
}

async function resolveCompanyId(arg: string | undefined): Promise<number> {
  if (arg) return Number(arg);
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM companies ORDER BY id LIMIT 1
  `;
  if (rows.length === 0) throw new Error("No company found");
  return Number(rows[0].id);
}

async function main() {
  const companyId = await resolveCompanyId(process.argv[2]);
  console.log(`companyId=${companyId}\n`);

  console.log("Individual sub-calls:");
  await time("getCompanyById", () => getCompanyById(companyId));
  await time("countActiveEmployees", async () => {
    const sql = getSqlForCount();
    const rows = await sql`
      SELECT COUNT(*)::int AS total
      FROM users u
      WHERE u.company_id = ${companyId}
        AND u.role = 'employee'
        AND u.active = TRUE
    `;
    return Number(rows[0]?.total ?? 0);
  });
  await time("getAdminPrivacyStatusStats", () =>
    getAdminPrivacyStatusStats(companyId)
  );
  await time("getAdminTrainingDashboardCounts", () =>
    getAdminTrainingDashboardCounts(companyId)
  );

  console.log("\nFull getAdminDashboardSummary (3 runs):");
  const timings: number[] = [];
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    const summary = await getAdminDashboardSummary(companyId);
    timings.push(performance.now() - start);
    if (i === 0) {
      console.log("  result:", JSON.stringify(summary));
    }
  }

  await resetSql();

  timings.sort((a, b) => a - b);
  const avg = timings.reduce((s, t) => s + t, 0) / timings.length;
  console.log(`  min: ${timings[0].toFixed(1)}ms`);
  console.log(`  avg: ${avg.toFixed(1)}ms`);
  console.log(`  max: ${timings[timings.length - 1].toFixed(1)}ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
