#!/usr/bin/env node
/**
 * Accessibility checks: Lighthouse (accessibility category) + axe-core.
 * Requires a running app at BASE_URL (default http://localhost:3000).
 *
 * Usage: npm run a11y:check
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AXE_SOURCE = fs.readFileSync(
  path.join(__dirname, "../node_modules/axe-core/axe.min.js"),
  "utf-8"
);

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const MIN_SCORE = Number(process.env.A11Y_MIN_SCORE ?? 90);

const PAGES = ["/login"];

async function waitForServer(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      onlyCategories: ["accessibility"],
      output: "json",
      logLevel: "error",
    });

    const score = (result?.lhr?.categories?.accessibility?.score ?? 0) * 100;
    const audits = result?.lhr?.audits ?? {};
    const failed = Object.values(audits).filter(
      (a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== "informative"
    );

    return { score, failed: failed.slice(0, 10) };
  } finally {
    await chrome.kill();
  }
}

async function runAxe(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  try {
    const browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${chrome.port}`,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluate(AXE_SOURCE);
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe injected above
      return await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
    });
    await browser.disconnect();

    return {
      ok: results.violations.length === 0,
      violations: results.violations,
    };
  } finally {
    await chrome.kill();
  }
}

async function main() {
  console.log(`\n🔍 Barrierefreiheits-Prüfung – ${BASE_URL}\n`);

  const ready = await waitForServer(`${BASE_URL}/login`);
  if (!ready) {
    console.error(
      `❌ Server nicht erreichbar unter ${BASE_URL}. Bitte zuerst "npm run dev" starten.`
    );
    process.exit(1);
  }

  let allPassed = true;

  for (const pagePath of PAGES) {
    const url = `${BASE_URL}${pagePath}`;
    console.log(`\n── ${url} ──`);

    console.log("Lighthouse Accessibility …");
    try {
      const { score, failed } = await runLighthouse(url);
      const ok = score >= MIN_SCORE;
      console.log(
        `${ok ? "✅" : "❌"} Lighthouse Accessibility: ${score.toFixed(0)} / 100 (Ziel: ≥ ${MIN_SCORE})`
      );
      if (!ok) allPassed = false;
      if (failed.length > 0) {
        console.log("  Auffällige Prüfpunkte:");
        for (const audit of failed) {
          console.log(`  - ${audit.title}`);
        }
      }
    } catch (err) {
      console.error("❌ Lighthouse fehlgeschlagen:", err.message ?? err);
      allPassed = false;
    }

    console.log("axe-core …");
    try {
      const axe = await runAxe(url);
      if (axe.ok) {
        console.log("✅ axe-core: keine WCAG-Verstöße");
      } else {
        console.log(`❌ axe-core: ${axe.violations.length} Verstoß/Verstöße`);
        for (const v of axe.violations.slice(0, 5)) {
          console.log(`  - [${v.impact}] ${v.id}: ${v.help}`);
          console.log(`    ${v.nodes[0]?.html ?? ""}`);
        }
        allPassed = false;
      }
    } catch (err) {
      console.error("❌ axe-core fehlgeschlagen:", err.message ?? err);
      allPassed = false;
    }
  }

  console.log(
    allPassed
      ? "\n✅ Alle Barrierefreiheits-Checks bestanden.\n"
      : "\n❌ Einige Checks sind fehlgeschlagen.\n"
  );
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
