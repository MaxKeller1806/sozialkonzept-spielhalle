import type { UserRole } from "@/lib/types";
import { RELEASE_NOTES } from "./data";
import type {
  FilteredReleaseNote,
  ReleaseNoteItem,
  ReleaseNoteSection,
} from "./types";
import { isVisibleToRole } from "./visibility";
import { sortReleasesNewestFirst } from "./version";

function filterItems(
  items: ReleaseNoteItem[],
  role: UserRole
): ReleaseNoteItem[] {
  return items.filter((item) => isVisibleToRole(item.visibility, role));
}

function filterSections(
  sections: ReleaseNoteSection[],
  role: UserRole
): ReleaseNoteSection[] {
  return sections
    .filter((section) => isVisibleToRole(section.visibility, role))
    .map((section) => ({
      ...section,
      items: filterItems(section.items, role),
    }))
    .filter((section) => section.items.length > 0);
}

function filterRelease(
  release: (typeof RELEASE_NOTES)[number],
  role: UserRole
): FilteredReleaseNote | null {
  const sections = filterSections(release.sections, role);
  if (sections.length === 0) return null;

  return {
    version: release.version,
    date: release.date,
    commit: release.commit,
    summary: release.summary,
    sections,
  };
}

export function getReleaseNotesForRole(role: UserRole): FilteredReleaseNote[] {
  return sortReleasesNewestFirst(
    RELEASE_NOTES.map((release) => filterRelease(release, role)).filter(
      (release): release is FilteredReleaseNote => release !== null
    )
  );
}

export function countVisibleItemsForRole(role: UserRole): number {
  return getReleaseNotesForRole(role).reduce(
    (total, release) =>
      total +
      release.sections.reduce(
        (sectionTotal, section) => sectionTotal + section.items.length,
        0
      ),
    0
  );
}
