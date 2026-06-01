import { ensureSeeded, getSql } from "./db";
import { mapFeedback } from "./db/row-mappers";
import type { FeedbackCategory, FeedbackEntry } from "./types";

export type { FeedbackCategory, FeedbackEntry };

export async function createFeedback(
  userId: number,
  category: FeedbackCategory,
  message: string
): Promise<FeedbackEntry> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO feedback (user_id, category, message)
    VALUES (${userId}, ${category}, ${message.trim()})
    RETURNING *
  `;
  return mapFeedback(rows[0] as Record<string, unknown>);
}

export async function listFeedbackForCompany(companyId: number): Promise<FeedbackEntry[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT f.id, f.user_id, f.category, f.message, f.created_at,
           u.first_name, u.last_name, u.email, u.location
    FROM feedback f
    JOIN users u ON u.id = f.user_id
    WHERE u.company_id = ${companyId}
    ORDER BY f.created_at DESC
  `;
  return rows.map((row) => mapFeedback(row as Record<string, unknown>));
}
