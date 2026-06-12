"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CourseEditorLayout } from "@/components/course-editor-layout";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { courseInhalteHubHref } from "@/lib/course-inhalte-url";
import { isMasterCourseId } from "@/lib/course-editor-id";
import {
  buildPoolQuestionNumberMap,
  formatInternalQuestionIdHint,
  formatPoolQuestionDisplayNumber,
} from "@/lib/exam-pool-display";

type QuestionType = "single" | "multiple" | "boolean" | "situation";

interface ModuleOption {
  id: number;
  title: string;
}

export default function FrageForm() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = String(params.id);
  const isNew = idParam === "neu";
  const courseId = searchParams.get("courseId");
  const courseQuery = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";

  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [courseName, setCourseName] = useState("Seminar");
  const [moduleId, setModuleId] = useState(1);
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<QuestionType>("single");
  const [answers, setAnswers] = useState<string[]>(["", ""]);
  const [correctSingle, setCorrectSingle] = useState(0);
  const [correctMultiple, setCorrectMultiple] = useState<number[]>([]);
  const [correctBoolean, setCorrectBoolean] = useState(true);
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [active, setActive] = useState(true);
  const [sourceType, setSourceType] = useState<string | null>(null);
  const isMaster = isMasterCourseId(courseId ?? "");
  const [poolNumberMap, setPoolNumberMap] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/admin/course${courseQuery}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.course?.modules) return;
        if (d.course.courseName) setCourseName(d.course.courseName);
        setModules(d.course.modules);
        if (d.course.exam) {
          setPoolNumberMap(buildPoolQuestionNumberMap(d.course.exam));
        }
        const fromUrl = Number(searchParams.get("module"));
        if (fromUrl && d.course.modules.some((m: ModuleOption) => m.id === fromUrl)) {
          setModuleId(fromUrl);
        } else if (d.course.modules[0]) {
          setModuleId(d.course.modules[0].id);
        }
      });
  }, [searchParams, courseQuery]);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/course/exam/${idParam}${courseQuery}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        const q = d.question;
        setModuleId(q.moduleId);
        setQuestion(q.question);
        setType(q.poolQuestionType ?? q.type);
        setExplanation(q.explanation ?? "");
        setDifficulty(q.difficulty ?? "");
        setActive(q.active !== false);
        setSourceType(q.sourceType ?? null);
        setReadOnly(q.sourceType === "master" && !isMasterCourseId(courseId ?? ""));
        if (q.type === "boolean") {
          setCorrectBoolean(q.correct);
        } else {
          setAnswers(q.answers ?? ["", ""]);
          if (q.type === "single") setCorrectSingle(q.correct);
          if (q.type === "multiple") setCorrectMultiple(q.correct);
        }
        setLoading(false);
      })
      .catch(() =>
        router.push(courseInhalteHubHref(courseId ?? "", { bereich: "fragen" }))
      );
  }, [idParam, isNew, router, courseQuery]);

  function setAnswerText(index: number, value: string) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)));
  }

  function addAnswer() {
    setAnswers((prev) => [...prev, ""]);
  }

  function removeAnswer(index: number) {
    if (answers.length <= 2) return;
    setAnswers((prev) => prev.filter((_, i) => i !== index));
    setCorrectSingle((c) => (c >= index && c > 0 ? c - 1 : c));
    setCorrectMultiple((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    );
  }

  function toggleMultiple(index: number) {
    setCorrectMultiple((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  function buildPayload() {
    const base = {
      moduleId,
      question,
      type,
      explanation: explanation.trim() || null,
      difficulty: difficulty || null,
      active,
    };
    if (type === "boolean") {
      return { ...base, correct: correctBoolean };
    }
    const trimmed = answers.map((a) => a.trim()).filter(Boolean);
    if (type === "single" || type === "situation") {
      return { ...base, answers: trimmed, correct: correctSingle };
    }
    return { ...base, answers: trimmed, correct: correctMultiple };
  }

  async function toggleActive() {
    if (isNew) return;
    const res = await fetch(`/api/admin/course/exam/${idParam}${courseQuery}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) {
      setActive(!active);
      setMessage(active ? "Frage deaktiviert." : "Frage reaktiviert.");
    } else {
      const data = await res.json();
      setError(data.error ?? "Statusänderung fehlgeschlagen.");
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    const url = isNew
      ? `/api/admin/course/exam${courseQuery}`
      : `/api/admin/course/exam/${idParam}${courseQuery}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    setMessage("Gespeichert.");
    if (isNew) {
      router.push(`/dashboard/inhalte/frage/${data.question.id}${courseQuery}`);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!confirm("Frage wirklich löschen?")) return;

    const res = await fetch(`/api/admin/course/exam/${idParam}${courseQuery}`, {
      method: "DELETE",
    });
    if (res.ok) router.push(courseInhalteHubHref(courseId ?? "", { bereich: "fragen" }));
    else setError("Löschen fehlgeschlagen.");
  }

  function onTypeChange(newType: QuestionType) {
    setType(newType);
    if (newType === "boolean") return;
    if (answers.length < 2) setAnswers(["", ""]);
    if (newType === "single" || newType === "situation") {
      setCorrectSingle(0);
      setCorrectMultiple([]);
    } else {
      setCorrectMultiple([]);
    }
  }

  if (loading && !isNew) {
    return <p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>;
  }

  if (!courseId) {
    return (
      <p className="px-4 py-8 text-sm text-red-700">
        Kein Seminar ausgewählt. Bitte über die Seminarverwaltung öffnen.
      </p>
    );
  }

  const poolDisplayNumber = !isNew
    ? formatPoolQuestionDisplayNumber(poolNumberMap, Number(idParam), `Frage ${idParam}`)
    : null;
  const formTitle = isNew
    ? "Neue Frage"
    : `${poolDisplayNumber ?? "Frage"} bearbeiten`;
  const canManageLifecycle = !readOnly && (isMaster || sourceType !== "master");
  const internalIdHint =
    !isNew && isMaster ? formatInternalQuestionIdHint(Number(idParam), true) : null;

  return (
    <CourseEditorLayout
      courseId={courseId}
      courseName={courseName}
      bereich="fragen"
      title={formTitle}
    >
      {internalIdHint && (
        <p className="mb-2 text-xs text-slate-400">{internalIdHint}</p>
      )}
      {readOnly && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            Diese Master-Frage kann nur durch Certiano bearbeitet werden.
          </p>
        </Card>
      )}
      {!active && (
        <Card className="mb-4 border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-700">Diese Frage ist deaktiviert.</p>
        </Card>
      )}

        <Card>
          <div className="space-y-4">
            <Select
              label="Zugehöriges Modul (optional)"
              value={moduleId}
              onChange={(e) => setModuleId(Number(e.target.value))}
              disabled={readOnly}
            >
              <option value={0}>Kein Modul</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  Modul {m.id}: {m.title}
                </option>
              ))}
            </Select>
            <Textarea
              label="Frage"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              disabled={readOnly}
            />
            <Select
              label="Fragetyp"
              value={type}
              onChange={(e) => onTypeChange(e.target.value as QuestionType)}
              disabled={readOnly}
            >
              <option value="single">Single Choice (eine Antwort)</option>
              <option value="multiple">Multiple Choice (mehrere Antworten)</option>
              <option value="boolean">Wahr / Falsch</option>
              <option value="situation">Situationsfrage (Praxisbezogen)</option>
            </Select>
            <Textarea
              label="Erklärung (optional)"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              disabled={readOnly}
            />
            <Select
              label="Schwierigkeit (optional)"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={readOnly}
            >
              <option value="">—</option>
              <option value="easy">Leicht</option>
              <option value="medium">Mittel</option>
              <option value="hard">Schwer</option>
            </Select>

            {type === "boolean" && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Richtige Antwort
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={correctBoolean === true}
                      onChange={() => setCorrectBoolean(true)}
                    />
                    Richtig (wahr)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={correctBoolean === false}
                      onChange={() => setCorrectBoolean(false)}
                    />
                    Falsch
                  </label>
                </div>
              </div>
            )}

            {(type === "single" || type === "multiple" || type === "situation") && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Antwortmöglichkeiten
                  {type === "multiple" && (
                    <span className="font-normal text-slate-500">
                      {" "}
                      – alle richtigen ankreuzen
                    </span>
                  )}
                </p>
                <ul className="space-y-3">
                  {answers.map((ans, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {type === "single" || type === "situation" ? (
                        <input
                          type="radio"
                          name="correctSingle"
                          className="mt-4"
                          checked={correctSingle === i}
                          onChange={() => setCorrectSingle(i)}
                          title="Richtige Antwort"
                          disabled={readOnly}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          className="mt-4"
                          checked={correctMultiple.includes(i)}
                          onChange={() => toggleMultiple(i)}
                          title="Richtige Antwort"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          label={`Antwort ${i + 1}`}
                          value={ans}
                          onChange={(e) => setAnswerText(i, e.target.value)}
                        />
                      </div>
                      {answers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAnswer(i)}
                          className="mt-8 text-sm text-red-600 hover:underline"
                        >
                          Entfernen
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={addAnswer}
                  className="mt-2 text-sm font-medium text-brand hover:underline"
                >
                  + Antwort hinzufügen
                </button>
                {type === "single" && (
                  <p className="mt-2 text-xs text-slate-500">
                    Kreis links = diese Antwort ist richtig
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {!readOnly && (
              <Button onClick={save} disabled={saving} className="flex-1">
                {saving ? "Speichern…" : "Speichern"}
              </Button>
            )}
            {!isNew && canManageLifecycle && (
              <Button variant="secondary" onClick={toggleActive} className="flex-1">
                {active ? "Deaktivieren" : "Reaktivieren"}
              </Button>
            )}
            {!isNew && canManageLifecycle && (
              <Button variant="danger" onClick={remove} className="flex-1">
                Löschen
              </Button>
            )}
          </div>
        </Card>
    </CourseEditorLayout>
  );
}
