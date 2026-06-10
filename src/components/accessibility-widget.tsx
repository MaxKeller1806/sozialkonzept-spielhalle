"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAccessibility } from "./accessibility-provider";
import { useSpeech } from "./speech-provider";
import type { FontSizeSetting, SpeechRate } from "@/lib/a11y-storage";

const RATE_OPTIONS: { value: SpeechRate; label: string }[] = [
  { value: "slow", label: "Langsam" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Schnell" },
];

const FONT_OPTIONS: { value: FontSizeSetting; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Groß" },
  { value: "xlarge", label: "Sehr groß" },
];

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      width={24}
      height={24}
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width={20} height={20}>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

function WidgetSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="a11y-widget-section">
      <h3 className="a11y-widget-section-title">{title}</h3>
      {children}
    </section>
  );
}

function SegmentGroup<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const groupId = useId();

  return (
    <fieldset className="a11y-widget-fieldset">
      <legend className="a11y-widget-legend" id={groupId}>
        {label}
      </legend>
      <div className="a11y-widget-segment" role="radiogroup" aria-labelledby={groupId}>
        {options.map((opt) => (
          <label key={opt.value} className="a11y-widget-segment-option">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const { highContrast, fontSize, setHighContrast, setFontSize } = useAccessibility();
  const {
    supported,
    speaking,
    paused,
    rate,
    hasLesson,
    hasReadableContent,
    setRate,
    speakCurrent,
    pause,
    resume,
    stop,
  } = useSpeech();

  const closePanel = useCallback(() => {
    setOpen(false);
    fabRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        fabRef.current &&
        !fabRef.current.contains(target)
      ) {
        closePanel();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, closePanel]);

  const statusMessage =
    speaking && !paused
      ? "Vorlesen läuft."
      : speaking && paused
        ? "Vorlesen pausiert."
        : "";

  return (
    <div className="a11y-widget-root">
      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>

      {open && (
        <div
          id="a11y-widget-panel"
          ref={panelRef}
          className="a11y-widget-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="a11y-widget-title"
        >
          <div className="a11y-widget-panel-header">
            <h2 id="a11y-widget-title" className="a11y-widget-title">
              Barrierefreiheit
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="a11y-widget-close"
              onClick={closePanel}
              aria-label="Panel schließen"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="a11y-widget-panel-body">
            <WidgetSection title="Vorlesen">
              {!supported ? (
                <p className="a11y-widget-hint" role="note">
                  Die Vorlesefunktion wird von diesem Browser nicht unterstützt.
                </p>
              ) : (
                <>
                  <p className="a11y-widget-hint">
                    {hasLesson
                      ? "Lektionstext kann vorgelesen werden."
                      : hasReadableContent
                        ? "Seiteninhalt kann vorgelesen werden."
                        : "Auf dieser Seite ist kein vorlesbarer Inhalt verfügbar."}
                  </p>

                  <SegmentGroup
                    name="speech-rate"
                    label="Geschwindigkeit"
                    options={RATE_OPTIONS}
                    value={rate}
                    onChange={setRate}
                  />

                  <div className="a11y-widget-actions" role="group" aria-label="Vorlesen steuern">
                    {!speaking && (
                      <button
                        type="button"
                        className="a11y-widget-btn a11y-widget-btn-primary"
                        onClick={speakCurrent}
                        disabled={!hasReadableContent}
                      >
                        Vorlesen starten
                      </button>
                    )}
                    {speaking && !paused && (
                      <button
                        type="button"
                        className="a11y-widget-btn a11y-widget-btn-secondary"
                        onClick={pause}
                      >
                        Pause
                      </button>
                    )}
                    {speaking && paused && (
                      <button
                        type="button"
                        className="a11y-widget-btn a11y-widget-btn-primary"
                        onClick={resume}
                      >
                        Fortsetzen
                      </button>
                    )}
                    {speaking && (
                      <button
                        type="button"
                        className="a11y-widget-btn a11y-widget-btn-secondary"
                        onClick={stop}
                      >
                        Stoppen
                      </button>
                    )}
                  </div>
                </>
              )}
            </WidgetSection>

            <WidgetSection title="Anzeige">
              <SegmentGroup
                name="font-size"
                label="Schriftgröße"
                options={FONT_OPTIONS}
                value={fontSize}
                onChange={setFontSize}
              />

              <label className="a11y-widget-toggle">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                />
                <span className="a11y-widget-toggle-track" aria-hidden="true">
                  <span className="a11y-widget-toggle-thumb" />
                </span>
                <span>Hoher Kontrast</span>
              </label>
            </WidgetSection>
          </div>
        </div>
      )}

      <button
        ref={fabRef}
        type="button"
        className={`a11y-widget-fab${open ? " a11y-widget-fab-active" : ""}${speaking ? " a11y-widget-fab-speaking" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-widget-panel"
        aria-label={
          open
            ? "Barrierefreiheits-Panel schließen"
            : "Barrierefreiheit und Vorlesen öffnen"
        }
      >
        <SpeakerIcon />
      </button>
    </div>
  );
}
