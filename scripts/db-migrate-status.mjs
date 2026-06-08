#!/usr/bin/env node
/**
 * Zeigt angewendete vs. ausstehende Migrationen.
 * Usage: npm run db:migrate:status
 */
import {
  ensureMigrationTable,
  getAppliedMigrations,
  getAppliedMigrationSet,
  getDatabaseUrl,
  hasPublicUsersTable,
  listMigrationFiles,
  splitPending,
  warnIfPoolerUrl,
  createMigrationSql,
  MIGRATION_TABLE,
} from "./lib/migrations.mjs";

async function main() {
  const url = getDatabaseUrl();
  warnIfPoolerUrl(url);
  const { sql } = createMigrationSql(url);

  try {
    await ensureMigrationTable(sql);
    const files = listMigrationFiles();
    const applied = await getAppliedMigrations(sql);
    const appliedSet = new Set(applied.map((row) => row.filename));
    const { pending, skipped } = splitPending(files, appliedSet);
    const hasUsers = await hasPublicUsersTable(sql);

    console.log(`Tracking-Tabelle: public.${MIGRATION_TABLE}`);
    console.log(`Migrationen im Repo: ${files.length}`);
    console.log(`Angewendet: ${skipped.length}`);
    console.log(`Ausstehend: ${pending.length}`);
    console.log(`users-Tabelle vorhanden: ${hasUsers ? "ja" : "nein"}`);
    console.log("");

    if (applied.length === 0) {
      console.log("(noch keine Einträge in schema_migrations)");
    } else {
      console.log("Angewendet:");
      for (const row of applied) {
        console.log(`  ✓ ${row.filename}  (${row.appliedAt})`);
      }
    }

    if (pending.length > 0) {
      console.log("");
      console.log("Ausstehend:");
      for (const file of pending) {
        console.log(`  ○ ${file}`);
      }
    }

    if (hasUsers && applied.length === 0) {
      console.log(`
⚠ Legacy-DB ohne Migration-History.
  Baseline setzen: npm run db:migrate:baseline -- --yes
  Danach nur Fehlende: npm run db:migrate
`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
