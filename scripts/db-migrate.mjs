#!/usr/bin/env node
/**
 * Applies SQL migrations from supabase/migrations/ to DATABASE_URL.
 * Usage: npm run db:migrate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../supabase/migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL fehlt. Siehe .env.example");
  process.exit(1);
}

const sql = postgres(url, { ssl: "prefer", prepare: false, max: 1 });

async function main() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("Keine Migrationen gefunden.");
    process.exit(0);
  }

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const body = fs.readFileSync(fullPath, "utf-8");
    console.log(`→ ${file}`);
    await sql.unsafe(body);
  }

  console.log("Migrationen erfolgreich angewendet.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
