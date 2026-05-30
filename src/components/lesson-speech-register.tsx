"use client";

import { useEffect } from "react";
import { useSpeech } from "./speech-provider";
import { lessonToPlainText } from "@/lib/lesson-text";
import type { Lesson } from "@/lib/types";

/** Registers lesson text for the floating a11y widget (no visible UI). */
export function LessonSpeechRegister({
  lesson,
  lessonKey,
}: {
  lesson: Lesson;
  lessonKey: string;
}) {
  const { registerLesson, clearLesson } = useSpeech();
  const text = lessonToPlainText(lesson);

  useEffect(() => {
    registerLesson(lessonKey, text);
    return () => clearLesson();
  }, [lessonKey, text, registerLesson, clearLesson]);

  return null;
}
