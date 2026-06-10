"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  loadSpeechRate,
  saveSpeechRate,
  SPEECH_RATE_MAP,
  type SpeechRate,
} from "@/lib/a11y-storage";
import { extractReadablePageText } from "@/lib/readable-page-text";

interface SpeechContextValue {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  rate: SpeechRate;
  hasLesson: boolean;
  hasReadableContent: boolean;
  setRate: (rate: SpeechRate) => void;
  speak: (text: string) => void;
  speakCurrent: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  registerLesson: (key: string, text: string) => void;
  clearLesson: () => void;
}

const SpeechContext = createContext<SpeechContextValue | null>(null);

function pickGermanVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.startsWith("de") && v.localService) ??
    voices.find((v) => v.lang.startsWith("de")) ??
    null
  );
}

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRateState] = useState<SpeechRate>("normal");
  const [lessonText, setLessonText] = useState<string | null>(null);
  const [hasPageContent, setHasPageContent] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lessonTextRef = useRef<string | null>(null);
  const prevLessonKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    setRateState(loadSpeechRate());

    const loadVoices = () => pickGermanVoice();
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
  }, []);

  // Stop speech on route change only. Lesson text is registered/cleared by
  // LessonSpeechRegister (child useEffect runs before this parent effect; clearing
  // here would wipe registration and leave hasLesson false on lesson pages).
  useEffect(() => {
    stop();
  }, [pathname, stop]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const text = extractReadablePageText();
      setHasPageContent(Boolean(text.trim()));
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, lessonText]);

  const registerLesson = useCallback(
    (key: string, text: string) => {
      if (prevLessonKeyRef.current !== null && prevLessonKeyRef.current !== key) {
        stop();
      }
      prevLessonKeyRef.current = key;
      lessonTextRef.current = text;
      setLessonText(text);
    },
    [stop]
  );

  const clearLesson = useCallback(() => {
    prevLessonKeyRef.current = null;
    lessonTextRef.current = null;
    setLessonText(null);
  }, []);

  const setRate = useCallback((next: SpeechRate) => {
    setRateState(next);
    saveSpeechRate(next);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-DE";
      utterance.rate = SPEECH_RATE_MAP[rate];
      const voice = pickGermanVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        setSpeaking(false);
        setPaused(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setSpeaking(false);
        setPaused(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
      setSpeaking(true);
      setPaused(false);
    },
    [supported, rate, stop]
  );

  const speakCurrent = useCallback(() => {
    const lesson = lessonTextRef.current?.trim();
    if (lesson) {
      speak(lesson);
      return;
    }
    const pageText = extractReadablePageText();
    if (pageText) speak(pageText);
  }, [speak]);

  const pause = useCallback(() => {
    if (!speaking || paused) return;
    speechSynthesis.pause();
    setPaused(true);
  }, [speaking, paused]);

  const resume = useCallback(() => {
    if (!speaking || !paused) return;
    speechSynthesis.resume();
    setPaused(false);
  }, [speaking, paused]);

  const hasLesson = Boolean(lessonText?.trim());
  const hasReadableContent = hasLesson || hasPageContent;

  return (
    <SpeechContext.Provider
      value={{
        supported,
        speaking,
        paused,
        rate,
        hasLesson,
        hasReadableContent,
        setRate,
        speak,
        speakCurrent,
        pause,
        resume,
        stop,
        registerLesson,
        clearLesson,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech(): SpeechContextValue {
  const ctx = useContext(SpeechContext);
  if (!ctx) {
    throw new Error("useSpeech must be used within SpeechProvider");
  }
  return ctx;
}
