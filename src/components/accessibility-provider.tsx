"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  loadFontSize,
  loadHighContrast,
  saveFontSize,
  saveHighContrast,
  type FontSizeSetting,
} from "@/lib/a11y-storage";
import { AccessibilityWidget } from "./accessibility-widget";
import { SkipLink } from "./skip-link";
import { SpeechProvider } from "./speech-provider";

interface AccessibilityContextValue {
  highContrast: boolean;
  fontSize: FontSizeSetting;
  setHighContrast: (value: boolean) => void;
  setFontSize: (value: FontSizeSetting) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function applyDocumentSettings(highContrast: boolean, fontSize: FontSizeSetting) {
  document.documentElement.dataset.highContrast = highContrast ? "true" : "false";
  document.documentElement.dataset.fontSize = fontSize;
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrastState] = useState(false);
  const [fontSize, setFontSizeState] = useState<FontSizeSetting>("normal");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hc = loadHighContrast();
    const fs = loadFontSize();
    setHighContrastState(hc);
    setFontSizeState(fs);
    applyDocumentSettings(hc, fs);
    setReady(true);
  }, []);

  const setHighContrast = useCallback(
    (value: boolean) => {
      setHighContrastState(value);
      saveHighContrast(value);
      applyDocumentSettings(value, fontSize);
    },
    [fontSize]
  );

  const setFontSize = useCallback(
    (value: FontSizeSetting) => {
      setFontSizeState(value);
      saveFontSize(value);
      applyDocumentSettings(highContrast, value);
    },
    [highContrast]
  );

  useEffect(() => {
    if (ready) applyDocumentSettings(highContrast, fontSize);
  }, [ready, highContrast, fontSize]);

  return (
    <AccessibilityContext.Provider
      value={{ highContrast, fontSize, setHighContrast, setFontSize }}
    >
      <SpeechProvider>
        <SkipLink />
        <AccessibilityWidget />
        {children}
      </SpeechProvider>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return ctx;
}
