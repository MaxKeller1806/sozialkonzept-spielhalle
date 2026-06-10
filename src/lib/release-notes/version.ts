export function parseVersion(version: string): [number, number, number] {
  const match = version.replace(/^V/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (va[i] !== vb[i]) return va[i] - vb[i];
  }
  return 0;
}

export function sortReleasesNewestFirst<T extends { version: string }>(
  releases: readonly T[]
): T[] {
  return [...releases].sort((a, b) => compareVersions(b.version, a.version));
}
