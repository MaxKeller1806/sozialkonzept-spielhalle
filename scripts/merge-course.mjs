#!/usr/bin/env node
/**
 * Merged data/content/modules.json + exam-pool.json into data/course.json
 * Run: node scripts/merge-course.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const coursePath = path.join(root, "data/course.json");
const modulesPath = path.join(root, "data/content/modules.json");
const examPath = path.join(root, "data/content/exam-pool.json");

const existing = JSON.parse(fs.readFileSync(coursePath, "utf-8"));
const modules = JSON.parse(fs.readFileSync(modulesPath, "utf-8"));
const exam = JSON.parse(fs.readFileSync(examPath, "utf-8"));

const durationMinutes = modules.reduce((s, m) => s + (m.duration || 0), 0);
const examQuestionsPerTest = 15;

const course = {
  ...existing,
  version: "2.0",
  durationMinutes,
  maxDurationMinutes: 45,
  recommendedMinutes: "35-40",
  passingScore: 80,
  examQuestionsPerTest,
  totalQuestions: examQuestionsPerTest,
  minCorrectAnswers: 12,
  modules,
  exam,
};

fs.writeFileSync(coursePath, JSON.stringify(course, null, 2) + "\n");
console.log(
  `Merged course.json: ${modules.length} modules, ${exam.length} exam questions, ${durationMinutes} min`
);
