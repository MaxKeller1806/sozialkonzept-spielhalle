#!/usr/bin/env node
/**
 * Markiert Migrationen als angewendet OHNE SQL auszuführen.
 * Für bestehende Prod-DBs, die schema vorher manuell/poolweise aufgebaut haben.
 *
 * Usage:
 *   npm run db:migrate:baseline -- --yes
 *   npm run db:migrate:baseline -- --yes --through 20260612120000_company_cert_signature.sql
 */
import {
  ensureMigrationTable,
  getAppliedMigrationSet,
  getDatabaseUrl,
  hasPublicUsersTable,
  listMigrationFiles,
  warnIfPoolerUrl,
  createMigrationSql,
} from "./lib/migrations.mjs";

function parseThroughArg() {
  const idx = process.argv.indexOf("--through");
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value) {
    console.error("--through benötigt einen Dateinamen.");
    process.exit(1);
  }
  return value;
}

async function main() {
  const confirmed = process.argv.includes("--yes");
  const through = parseThroughArg();
  const url = getDatabaseUrl();
  warnIfPoolerUrl(url);
  const { sql } = createMigrationSql(url);

  try {
    await ensureMigrationTable(sql);
    const files = listMigrationFiles();
    const appliedSet = await getAppliedMigrationSet(sql);
    const hasUsers = await hasPublicUsersTable(sql);

    let toMark = files.filter((file) => !appliedSet.has(file));
    if (through) {
      const throughIdx = files.indexOf(through);
      if (throughIdx === -1) {
        console.error(`Migration nicht gefunden: ${through}`);
        process.exit(1);
      }
      toMark = toMark.filter((file) => files.indexOf(file) <= throughIdx);
    }

    if (toMark.length === 0) {
      console.log("Keine Migrationen zum Baseline-Markieren.");
      return;
    }

    console.log("Folgende Migrationen werden NUR als angewendet markiert (SQL wird nicht ausgeführt):");
    for (const file of toMark) {
      console.log(`  • ${file}`);
    }
    console.log("");

    if (!hasUsers && !confirmed) {
      console.error(
        "Keine users-Tabelle gefunden – wirkt wie leere DB. Für frische DB stattdessen: npm run db:migrate"
      );
      process.exit(1);
    }

    if (!confirmed) {
      console.error("Abbruch. Bestätigen mit: npm run db:migrate:baseline -- --yes");
      process.exit(1);
    }

    for (const file of toMark) {
      await sql`
        INSERT INTO schema_migrations (filename)
        VALUES (${file})
        ON CONFLICT (filename) DO NOTHING
      `;
    }

    console.log(`Baseline gesetzt (${toMark.length} Migrationen markiert).`);
    console.log("Als Nächstes: npm run db:migrate:status && npm run db:migrate");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
