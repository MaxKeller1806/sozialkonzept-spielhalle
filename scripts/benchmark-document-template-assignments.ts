/**
 * Benchmark für document-template-assignments (direkt lib, ohne HTTP).
 * Usage: npx tsx scripts/benchmark-document-template-assignments.ts
 */
import { performance } from "node:perf_hooks";
import { resetSql } from "../src/lib/db";
import { listDocumentTemplateAssignmentsPreview } from "../src/lib/document-template-assignments";

async function main() {
  const runs = 3;
  const timings: number[] = [];

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const result = await listDocumentTemplateAssignmentsPreview();
    timings.push(performance.now() - start);
    if (i === 0) {
      console.log(
        `items=${result.items.length}, templates=${Object.keys(result.templates).length}`
      );
    }
  }

  await resetSql();

  timings.sort((a, b) => a - b);
  const avg = timings.reduce((s, t) => s + t, 0) / timings.length;

  console.log(`Runs: ${runs}`);
  console.log(`Min: ${timings[0].toFixed(1)}ms`);
  console.log(`Avg: ${avg.toFixed(1)}ms`);
  console.log(`Max: ${timings[timings.length - 1].toFixed(1)}ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
