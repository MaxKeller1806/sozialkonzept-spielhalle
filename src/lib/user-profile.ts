/** Ort und legacy Wohnort synchron halten */
export function syncCityFields(city: string | null | undefined): {
  city: string | null;
  placeOfResidence: string | null;
} {
  const normalized = city?.trim() || null;
  return { city: normalized, placeOfResidence: normalized };
}

export function formatUserAddress(user: {
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  placeOfResidence?: string | null;
}): string {
  const streetLine = [user.street, user.houseNumber].filter(Boolean).join(" ").trim();
  const city = user.city || user.placeOfResidence;
  const cityLine = [user.postalCode, city].filter(Boolean).join(" ").trim();
  return [streetLine, cityLine].filter(Boolean).join(", ") || "—";
}
