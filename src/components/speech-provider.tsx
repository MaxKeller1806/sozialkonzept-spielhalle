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

interface SpeechContextValue {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  rate: SpeechRate;
  hasLesson: boolean;
  setRate: (rate: SpeechRate) => void;
  speak: (text: string) => void;
  speakLesson: () => void;
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
  const [lessonKey, setLessonKey] = useState<string | null>(null);
  const [lessonText, setLessonText] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
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

  useEffect(() => {
    stop();
    setLessonKey(null);
    setLessonText(null);
    prevLessonKeyRef.current = null;
  }, [pathname, stop]);

  const registerLesson = useCallback(
    (key: string, text: string) => {
      if (prevLessonKeyRef.current !== null && prevLessonKeyRef.current !== key) {
        stop();
      }
      prevLessonKeyRef.current = key;
      setLessonKey(key);
      setLessonText(text);
    },
    [stop]
  );

  const clearLesson = useCallback(() => {
    prevLessonKeyRef.current = null;
    setLessonKey(null);
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

  const speakLesson = useCallback(() => {
    if (lessonText) speak(lessonText);
  }, [lessonText, speak]);

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

  return (
    <SpeechContext.Provider
      value={{
        supported,
        speaking,
        paused,
        rate,
        hasLesson: Boolean(lessonText?.trim()),
        setRate,
        speak,
        speakLesson,
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
