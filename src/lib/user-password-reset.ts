import { hashPassword, resolveInitialPassword } from "./auth";
import { getSql } from "./db";

export async function resetCompanyAdminPassword(
  userId: number,
  companyId: number,
  plainPassword?: string | null
): Promise<{ email: string; initialPassword: string }> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, email, role FROM users
    WHERE id = ${userId} AND company_id = ${companyId} AND role = 'admin'
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw new Error("NOT_FOUND");
  }

  const { password: initialPassword, error } = resolveInitialPassword(plainPassword);
  if (error) {
    throw new Error("PASSWORD_INVALID");
  }

  const passwordHash = hashPassword(initialPassword);
  await sql`
    UPDATE users SET
      password_hash = ${passwordHash},
      must_change_password = TRUE
    WHERE id = ${userId}
  `;

  return { email: String(rows[0].email), initialPassword };
}
