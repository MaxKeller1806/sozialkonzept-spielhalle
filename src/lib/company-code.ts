import type postgres from "postgres";

/** Nächste Firmen-ID aus Sequenz (F0001, F0002, …). Nie wiederverwendet. */
export async function allocateCompanyCode(
  sql: postgres.Sql
): Promise<string> {
  const rows = await sql`
    SELECT 'F' || LPAD(nextval('company_code_seq')::text, 4, '0') AS code
  `;
  return String(rows[0]?.code ?? "");
}
