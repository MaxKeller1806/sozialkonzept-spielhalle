import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const migrationsDir = path.join(__dirname, "../../supabase/migrations");

export const MIGRATION_TABLE = "schema_migrations";

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL fehlt. Siehe .env.example");
  }
  return url;
}

export function createMigrationSql(url) {
  const isPooler =
    url.includes(":6543/") ||
    url.includes("pooler.supabase.com") ||
    url.includes("pgbouncer=true");
  return {
    sql: postgres(url, {
      ssl: process.env.NODE_ENV === "production" ? "require" : "prefer",
      prepare: false,
      max: 1,
      connect_timeout: 30,
    }),
    isPooler,
  };
}

export function listMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export function readMigrationBody(filename) {
  return fs.readFileSync(path.join(migrationsDir, filename), "utf-8");
}

export async function ensureMigrationTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function getAppliedMigrations(sql) {
  await ensureMigrationTable(sql);
  const rows = await sql`
    SELECT filename, applied_at
    FROM schema_migrations
    ORDER BY filename
  `;
  return rows.map((row) => ({
    filename: String(row.filename),
    appliedAt: new Date(String(row.applied_at)).toISOString(),
  }));
}

export async function getAppliedMigrationSet(sql) {
  const applied = await getAppliedMigrations(sql);
  return new Set(applied.map((row) => row.filename));
}

export async function hasPublicUsersTable(sql) {
  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'users'
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

export async function isLegacyDatabaseWithoutHistory(sql) {
  const applied = await getAppliedMigrationSet(sql);
  if (applied.size > 0) return false;
  return hasPublicUsersTable(sql);
}

export function warnIfPoolerUrl(url) {
  const isPooler =
    url.includes(":6543/") ||
    url.includes("pooler.supabase.com") ||
    url.includes("pgbouncer=true");
  if (isPooler) {
    console.warn(
      "⚠ DATABASE_URL nutzt den Connection Pooler (6543). Für Migrationen Direct Connection (5432) verwenden."
    );
  }
  return isPooler;
}

export function splitPending(files, appliedSet) {
  const pending = [];
  const skipped = [];
  for (const file of files) {
    if (appliedSet.has(file)) skipped.push(file);
    else pending.push(file);
  }
  return { pending, skipped };
}
