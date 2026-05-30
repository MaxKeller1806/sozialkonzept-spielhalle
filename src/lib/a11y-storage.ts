export type FontSizeSetting = "normal" | "large" | "xlarge";
export type SpeechRate = "slow" | "normal" | "fast";

const HIGH_CONTRAST_KEY = "a11y-high-contrast";
const FONT_SIZE_KEY = "a11y-font-size";
const SPEECH_RATE_KEY = "a11y-speech-rate";

export function loadHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(HIGH_CONTRAST_KEY) === "true";
}

export function saveHighContrast(value: boolean): void {
  localStorage.setItem(HIGH_CONTRAST_KEY, value ? "true" : "false");
}

export function loadFontSize(): FontSizeSetting {
  if (typeof window === "undefined") return "normal";
  const v = localStorage.getItem(FONT_SIZE_KEY);
  if (v === "large" || v === "xlarge") return v;
  return "normal";
}

export function saveFontSize(value: FontSizeSetting): void {
  localStorage.setItem(FONT_SIZE_KEY, value);
}

export function loadSpeechRate(): SpeechRate {
  if (typeof window === "undefined") return "normal";
  const v = localStorage.getItem(SPEECH_RATE_KEY);
  if (v === "slow" || v === "fast") return v;
  return "normal";
}

export function saveSpeechRate(value: SpeechRate): void {
  localStorage.setItem(SPEECH_RATE_KEY, value);
}

export const SPEECH_RATE_MAP: Record<SpeechRate, number> = {
  slow: 0.75,
  normal: 1,
  fast: 1.25,
};
