import type { UserRole } from "@/lib/types";

export type ReleaseNoteVisibility = UserRole | readonly UserRole[];

export type ReleaseNoteCategory =
  | "features"
  | "training"
  | "certificates"
  | "proof"
  | "company"
  | "ui"
  | "bugfixes"
  | "technical"
  | "migrations"
  | "infrastructure";

export type ReleaseNoteItem = {
  text: string;
  visibility: ReleaseNoteVisibility;
};

export type ReleaseNoteSection = {
  title: string;
  category: ReleaseNoteCategory;
  visibility: ReleaseNoteVisibility;
  items: ReleaseNoteItem[];
};

export type ReleaseNote = {
  version: string;
  date: string;
  commit?: string;
  summary?: string;
  sections: ReleaseNoteSection[];
};

export type FilteredReleaseNote = {
  version: string;
  date: string;
  commit?: string;
  summary?: string;
  sections: ReleaseNoteSection[];
};
