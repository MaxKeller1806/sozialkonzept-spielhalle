"use client";

import { useCallback } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import {
  EDITOR_BLOCK_OPTIONS,
  editorKindLabel,
  kindUsesBody,
  kindUsesItems,
  kindUsesSolution,
  kindUsesTitle,
  type EditorBlockKind,
  type EditorBlockRow,
} from "@/lib/lesson-blocks";

function newBlockKey(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyEditorBlock(kind: EditorBlockKind = "text"): EditorBlockRow {
  return {
    key: newBlockKey(),
    kind,
    title:
      kind === "lernziele"
        ? "Lernziele"
        : kind === "rechtlich"
          ? "Rechtlicher Rahmen"
          : kind === "hinweis"
            ? "Hinweis"
            : kind === "praxis"
              ? "Praxisfall"
              : "",
    body: "",
    itemsText: "",
    solution: "",
  };
}

export function LessonBlockEditor({
  blocks,
  onChange,
  readOnly = false,
}: {
  blocks: EditorBlockRow[];
  onChange: (blocks: EditorBlockRow[]) => void;
  readOnly?: boolean;
}) {
  const updateBlock = useCallback(
    (key: string, patch: Partial<EditorBlockRow>) => {
      onChange(blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
    },
    [blocks, onChange]
  );

  const moveBlock = useCallback(
    (index: number, direction: -1 | 1) => {
      const next = [...blocks];
      const target = index + direction;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      onChange(next);
    },
    [blocks, onChange]
  );

  const removeBlock = useCallback(
    (key: string) => {
      onChange(blocks.filter((b) => b.key !== key));
    },
    [blocks, onChange]
  );

  const addBlock = useCallback(
    (kind: EditorBlockKind) => {
      onChange([...blocks, createEmptyEditorBlock(kind)]);
    },
    [blocks, onChange]
  );

  if (blocks.length === 0 && readOnly) {
    return <p className="text-sm text-slate-500 italic">Keine Inhaltsblöcke.</p>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const isLegacy = !EDITOR_BLOCK_OPTIONS.some((o) => o.kind === block.kind);
        return (
          <div
            key={block.key}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Block {index + 1} · {editorKindLabel(block.kind)}
              </span>
              {!readOnly && (
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-white disabled:opacity-40"
                    aria-label="Block nach oben"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                    className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-white disabled:opacity-40"
                    aria-label="Block nach unten"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(block.key)}
                    className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-white"
                  >
                    Entfernen
                  </button>
                </div>
              )}
            </div>

            {!readOnly && (
              <label className="mb-3 block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Blocktyp</span>
                <select
                  value={block.kind}
                  onChange={(e) => {
                    const kind = e.target.value as EditorBlockKind;
                    updateBlock(block.key, {
                      kind,
                      title:
                        kind === "lernziele"
                          ? "Lernziele"
                          : kind === "rechtlich"
                            ? "Rechtlicher Rahmen"
                            : kind === "hinweis"
                              ? "Hinweis"
                              : block.title,
                    });
                  }}
                  className="focus-brand w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {EDITOR_BLOCK_OPTIONS.map((o) => (
                    <option key={o.kind} value={o.kind}>
                      {o.label}
                    </option>
                  ))}
                  {isLegacy && (
                    <option value={block.kind}>{editorKindLabel(block.kind)}</option>
                  )}
                </select>
              </label>
            )}

            {kindUsesTitle(block.kind) && (
              <Input
                label="Titel (optional)"
                value={block.title}
                onChange={(e) => updateBlock(block.key, { title: e.target.value })}
                readOnly={readOnly}
              />
            )}

            {kindUsesBody(block.kind) && (
              <Textarea
                label={block.kind === "quiz" ? "Antworten (eine pro Zeile)" : "Inhalt / Text"}
                value={block.body}
                onChange={(e) => updateBlock(block.key, { body: e.target.value })}
                rows={block.kind === "text" ? 6 : 4}
                readOnly={readOnly}
              />
            )}

            {kindUsesItems(block.kind) && (
              <Textarea
                label="Aufzählungspunkte (eine Zeile pro Punkt)"
                value={block.itemsText}
                onChange={(e) => updateBlock(block.key, { itemsText: e.target.value })}
                rows={5}
                readOnly={readOnly}
              />
            )}

            {kindUsesSolution(block.kind) && (
              <Textarea
                label="Empfohlene Reaktion (optional)"
                value={block.solution}
                onChange={(e) => updateBlock(block.key, { solution: e.target.value })}
                rows={3}
                readOnly={readOnly}
              />
            )}

            {block.kind === "quiz" && !readOnly && (
              <Input
                label="Index der richtigen Antwort (0 = erste Zeile)"
                type="number"
                min={0}
                value={block.itemsText}
                onChange={(e) => updateBlock(block.key, { itemsText: e.target.value })}
              />
            )}
          </div>
        );
      })}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {EDITOR_BLOCK_OPTIONS.map((o) => (
            <Button
              key={o.kind}
              type="button"
              variant="secondary"
              onClick={() => addBlock(o.kind)}
              className="!w-auto text-sm"
            >
              + {o.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
