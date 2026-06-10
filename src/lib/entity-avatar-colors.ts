const AVATAR_PALETTES = [
  { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200/80" },
  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200/80" },
  { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-200/80" },
  { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200/80" },
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200/80" },
  { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-200/80" },
] as const;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function avatarPaletteForSeed(seed: string) {
  return AVATAR_PALETTES[hashSeed(seed) % AVATAR_PALETTES.length];
}
