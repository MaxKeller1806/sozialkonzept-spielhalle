import type postgres from "postgres";

export async function assertDocumentTemplateSchema(
  sql: postgres.Sql
): Promise<void> {
  const rows = await sql`
    SELECT
      to_regclass('public.document_templates') IS NOT NULL AS has_templates,
      to_regclass('public.document_template_revisions') IS NOT NULL AS has_revisions,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'certificates'
          AND column_name = 'template_revision_id'
      ) AS has_certificate_column
  `;
  const check = rows[0];
  if (
    !check?.has_templates ||
    !check?.has_revisions ||
    !check?.has_certificate_column
  ) {
    const missing: string[] = [];
    if (!check?.has_templates) missing.push("document_templates");
    if (!check?.has_revisions) missing.push("document_template_revisions");
    if (!check?.has_certificate_column) {
      missing.push("certificates.template_revision_id");
    }
    throw new Error(
      `Document-Template-Schema fehlt (${missing.join(", ")}). Bitte zuerst: npm run db:migrate`
    );
  }
}
