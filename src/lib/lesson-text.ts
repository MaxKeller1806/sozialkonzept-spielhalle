import type { ContentBlock, Lesson } from "./types";

function blockToText(block: ContentBlock): string {
  switch (block.type) {
    case "text":
      return block.body ?? "";
    case "info":
      return [block.title, block.body].filter(Boolean).join(". ");
    case "merksatz":
      return `Merksatz. ${block.body ?? ""}`;
    case "hinweis":
      return `${block.title ?? "Hinweis"}. ${block.body ?? ""}`;
    case "fehler":
      return `${block.title ?? "Typischer Fehler"}. ${block.body ?? ""}`;
    case "praxis":
      return [
        block.title ?? "Praxisfall",
        block.body,
        block.solution ? `Empfohlene Reaktion: ${block.solution}` : "",
      ]
        .filter(Boolean)
        .join(". ");
    case "dialog":
      return [
        block.title,
        ...(block.lines?.map((l) => `${l.speaker}: ${l.text}`) ?? []),
      ]
        .filter(Boolean)
        .join(". ");
    case "summary":
      return [
        block.title ?? "Zusammenfassung",
        ...(block.items ?? []),
      ].join(". ");
    case "quiz":
      return [
        "Wissensfrage",
        block.question,
        ...(block.answers?.map((a, i) => `Antwort ${i + 1}: ${a}`) ?? []),
      ]
        .filter(Boolean)
        .join(". ");
    default:
      return "";
  }
}

export function lessonToPlainText(lesson: Lesson): string {
  const parts: string[] = [lesson.title];

  if (lesson.blocks?.length) {
    for (const block of lesson.blocks) {
      const text = blockToText(block);
      if (text) parts.push(text);
    }
  } else if (lesson.content) {
    parts.push(lesson.content);
  }

  return parts.join(". ");
}
