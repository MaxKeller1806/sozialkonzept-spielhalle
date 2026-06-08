export function parseInstructionMetaFromRow(row: Record<string, unknown>) {
  const mainCategoryRaw =
    row.main_category != null
      ? row.main_category
      : row.category != null
        ? row.category
        : null;

  return {
    mainCategory: mainCategoryRaw != null ? String(mainCategoryRaw) : null,
    seminar: row.seminar != null ? String(row.seminar) : null,
    instructionCode:
      row.instruction_code != null ? String(row.instruction_code) : null,
    instructionTitle:
      row.instruction_title != null ? String(row.instruction_title) : null,
    sortOrder: Number(row.sort_order ?? 0),
    requiresCertificate:
      row.requires_certificate !== false && row.requires_certificate !== 0,
    requiresProof: row.requires_proof !== false && row.requires_proof !== 0,
  };
}
