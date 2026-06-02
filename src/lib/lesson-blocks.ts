import type { ContentBlock, ContentBlockType, Lesson } from "./types";
import { lessonToPlainText } from "./lesson-text";

/** Admin-Auswahl – mappt auf ContentBlock-Typen in der DB */
export type EditorBlockKind =
  | "heading"
  | "text"
  | "lernziele"
  | "hinweis"
  | "rechtlich"
  | "merksatz"
  | "praxis"
  | "list"
  | "fehler"
  | "dialog"
  | "quiz"
  | "summary";

export interface EditorBlockRow {
  key: string;
  kind: EditorBlockKind;
  title: string;
  body: string;
  itemsText: string;
  solution: string;
}

export const EDITOR_BLOCK_OPTIONS: { kind: EditorBlockKind; label: string }[] = [
  { kind: "heading", label: "Überschrift" },
  { kind: "text", label: "Absatz" },
  { kind: "lernziele", label: "Lernziele-Box" },
  { kind: "hinweis", label: "Hinweisbox" },
  { kind: "rechtlich", label: "Rechtlicher Rahmen" },
  { kind: "merksatz", label: "Merksatz" },
  { kind: "praxis", label: "Praxisbeispiel" },
  { kind: "list", label: "Aufzählung" },
];

const LEGACY_KIND_LABELS: Record<string, string> = {
  fehler: "Typischer Fehler",
  dialog: "Dialog",
  quiz: "Wissensfrage",
  summary: "Zusammenfassung",
};

export function editorKindLabel(kind: EditorBlockKind): string {
  return (
    EDITOR_BLOCK_OPTIONS.find((o) => o.kind === kind)?.label ??
    LEGACY_KIND_LABELS[kind] ??
    kind
  );
}

export function kindUsesTitle(kind: EditorBlockKind): boolean {
  return ["heading", "lernziele", "hinweis", "rechtlich", "praxis", "fehler", "dialog", "list", "summary"].includes(
    kind
  );
}

export function kindUsesBody(kind: EditorBlockKind): boolean {
  return kind !== "list";
}

export function kindUsesItems(kind: EditorBlockKind): boolean {
  return kind === "list" || kind === "summary";
}

export function kindUsesSolution(kind: EditorBlockKind): boolean {
  return kind === "praxis";
}

function parseItems(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function itemsToText(items?: string[]): string {
  return (items ?? []).join("\n");
}

export function contentBlockToEditorRow(
  block: ContentBlock,
  index: number
): EditorBlockRow {
  const key = `block-${index}`;
  switch (block.type) {
    case "heading":
      return {
        key,
        kind: "heading",
        title: block.title ?? "",
        body: block.body ?? "",
        itemsText: "",
        solution: "",
      };
    case "text":
      return { key, kind: "text", title: "", body: block.body ?? "", itemsText: "", solution: "" };
    case "info": {
      const t = (block.title ?? "").toLowerCase();
      const kind: EditorBlockKind =
        t.includes("rechtlich") ? "rechtlich" : "lernziele";
      return {
        key,
        kind,
        title: block.title ?? (kind === "rechtlich" ? "Rechtlicher Rahmen" : "Lernziele"),
        body: block.body ?? "",
        itemsText: "",
        solution: "",
      };
    }
    case "hinweis":
      return {
        key,
        kind: "hinweis",
        title: block.title ?? "Hinweis",
        body: block.body ?? "",
        itemsText: "",
        solution: "",
      };
    case "merksatz":
      return { key, kind: "merksatz", title: "", body: block.body ?? "", itemsText: "", solution: "" };
    case "praxis":
      return {
        key,
        kind: "praxis",
        title: block.title ?? "Praxisfall",
        body: block.body ?? "",
        itemsText: "",
        solution: block.solution ?? "",
      };
    case "summary":
      return {
        key,
        kind: "list",
        title: block.title ?? "",
        body: "",
        itemsText: itemsToText(block.items),
        solution: "",
      };
    case "fehler":
      return {
        key,
        kind: "fehler",
        title: block.title ?? "Typischer Fehler",
        body: block.body ?? "",
        itemsText: "",
        solution: "",
      };
    case "dialog":
      return {
        key,
        kind: "dialog",
        title: block.title ?? "",
        body: (block.lines ?? []).map((l) => `${l.speaker}: ${l.text}`).join("\n"),
        itemsText: "",
        solution: "",
      };
    case "quiz":
      return {
        key,
        kind: "quiz",
        title: block.question ?? "",
        body: (block.answers ?? []).join("\n"),
        itemsText: String(block.correct ?? 0),
        solution: block.explanation ?? "",
      };
    default:
      return { key, kind: "text", title: "", body: "", itemsText: "", solution: "" };
  }
}

export function editorRowToContentBlock(row: EditorBlockRow): ContentBlock {
  switch (row.kind) {
    case "heading":
      return {
        type: "heading",
        title: row.title.trim() || undefined,
        body: row.body.trim(),
      };
    case "text":
      return { type: "text", body: row.body.trim() };
    case "lernziele":
      return {
        type: "info",
        title: row.title.trim() || "Lernziele",
        body: row.body.trim(),
      };
    case "hinweis":
      return {
        type: "hinweis",
        title: row.title.trim() || "Hinweis",
        body: row.body.trim(),
      };
    case "rechtlich":
      return {
        type: "info",
        title: row.title.trim() || "Rechtlicher Rahmen",
        body: row.body.trim(),
      };
    case "merksatz":
      return { type: "merksatz", body: row.body.trim() };
    case "praxis":
      return {
        type: "praxis",
        title: row.title.trim() || "Praxisfall",
        body: row.body.trim(),
        solution: row.solution.trim() || undefined,
      };
    case "list":
      return {
        type: "summary",
        title: row.title.trim() || undefined,
        items: parseItems(row.itemsText),
      };
    case "fehler":
      return {
        type: "fehler",
        title: row.title.trim() || "Typischer Fehler",
        body: row.body.trim(),
      };
    case "dialog": {
      const lines = row.body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const idx = line.indexOf(":");
          if (idx <= 0) return { speaker: "Person", text: line };
          return {
            speaker: line.slice(0, idx).trim(),
            text: line.slice(idx + 1).trim().replace(/^["„]|["”]$/g, ""),
          };
        });
      return {
        type: "dialog",
        title: row.title.trim() || undefined,
        lines,
      };
    }
    case "quiz": {
      const answers = parseItems(row.body);
      return {
        type: "quiz",
        question: row.title.trim(),
        answers,
        correct: Number(row.itemsText) || 0,
        explanation: row.solution.trim() || undefined,
      };
    }
    case "summary":
      return {
        type: "summary",
        title: row.title.trim() || undefined,
        items: parseItems(row.itemsText),
      };
    default:
      return { type: "text", body: row.body.trim() };
  }
}

export function lessonToEditorRows(lesson: Lesson): EditorBlockRow[] {
  if (lesson.blocks?.length) {
    return lesson.blocks.map((b, i) => contentBlockToEditorRow(b, i));
  }
  if (lesson.content?.trim()) {
    return [
      {
        key: "block-0",
        kind: "text",
        title: "",
        body: lesson.content.trim(),
        itemsText: "",
        solution: "",
      },
    ];
  }
  return [];
}

export function editorRowsToLessonBlocks(rows: EditorBlockRow[]): ContentBlock[] {
  return rows
    .map(editorRowToContentBlock)
    .filter((b) => blockHasContent(b));
}

function blockHasContent(block: ContentBlock): boolean {
  switch (block.type) {
    case "text":
    case "merksatz":
    case "heading":
      return !!block.body?.trim();
    case "summary":
      return (block.items?.length ?? 0) > 0 || !!block.title?.trim();
    case "quiz":
      return !!block.question?.trim();
    case "dialog":
      return (block.lines?.length ?? 0) > 0;
    default:
      return !!block.body?.trim() || !!block.title?.trim();
  }
}

export function normalizeLessonForSave(
  partial: Pick<Lesson, "id" | "title"> & {
    content?: string;
    blocks?: ContentBlock[];
  },
  editorRows?: EditorBlockRow[]
): Lesson {
  const blocks =
    editorRows != null
      ? editorRowsToLessonBlocks(editorRows)
      : (partial.blocks ?? []).filter(blockHasContent);

  const lesson: Lesson = {
    id: partial.id,
    title: partial.title.trim(),
    blocks: blocks.length > 0 ? blocks : undefined,
    content: "",
  };

  lesson.content = lessonToPlainText(lesson).slice(0, 2000) || partial.content?.trim() || partial.title.trim();

  return lesson;
}

export function blockTypeLabel(type: ContentBlockType): string {
  const map: Partial<Record<ContentBlockType, string>> = {
    heading: "Überschrift",
    text: "Absatz",
    info: "Info-Box",
    hinweis: "Hinweisbox",
    merksatz: "Merksatz",
    praxis: "Praxisbeispiel",
    summary: "Aufzählung",
    fehler: "Typischer Fehler",
    dialog: "Dialog",
    quiz: "Wissensfrage",
  };
  return map[type] ?? type;
}
