#!/usr/bin/env node
/**
 * Wendet nur noch nicht ausgeführte SQL-Migrationen an (schema_migrations).
 * Usage: npm run db:migrate
 *
 * Bestehende Prod-DB ohne History: zuerst npm run db:migrate:baseline -- --yes
 */
import {
  ensureMigrationTable,
  getAppliedMigrationSet,
  getDatabaseUrl,
  isLegacyDatabaseWithoutHistory,
  listMigrationFiles,
  readMigrationBody,
  splitPending,
  warnIfPoolerUrl,
  createMigrationSql,
} from "./lib/migrations.mjs";

const force = process.argv.includes("--force");

async function main() {
  const url = getDatabaseUrl();
  warnIfPoolerUrl(url);
  const { sql } = createMigrationSql(url);

  try {
    await ensureMigrationTable(sql);
    await sql`SET statement_timeout = '300000'`;

    if (!force && (await isLegacyDatabaseWithoutHistory(sql))) {
      console.error(`
Bestehende Datenbank erkannt, aber schema_migrations ist leer.
Die initiale Migration würde erneut laufen (Timeout-Risiko).

Sicheres Vorgehen:
  1. npm run db:migrate:status
  2. npm run db:migrate:baseline -- --yes
     (optional nur bis zu einer Datei: -- --through 20260612120000_company_cert_signature.sql)
  3. npm run db:migrate

Nur neue/leere DB: npm run db:migrate -- --force
`);
      process.exit(1);
    }

    const files = listMigrationFiles();
    if (files.length === 0) {
      console.log("Keine Migrationen gefunden.");
      return;
    }

    const appliedSet = await getAppliedMigrationSet(sql);
    const { pending, skipped } = splitPending(files, appliedSet);

    for (const file of skipped) {
      console.log(`⏭  ${file} (bereits angewendet)`);
    }

    if (pending.length === 0) {
      console.log("Alle Migrationen sind bereits angewendet.");
      return;
    }

    for (const file of pending) {
      const body = readMigrationBody(file);
      console.log(`→ ${file}`);
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`
          INSERT INTO schema_migrations (filename)
          VALUES (${file})
          ON CONFLICT (filename) DO NOTHING
        `;
      });
    }

    console.log(`Migrationen erfolgreich angewendet (${pending.length} neu).`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
