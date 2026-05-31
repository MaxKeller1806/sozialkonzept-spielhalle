import postgres from "postgres";

let sql: postgres.Sql | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Siehe .env.example und DEPLOYMENT.md."
    );
  }
  return url;
}

export function getSql(): postgres.Sql {
  if (!sql) {
    sql = postgres(getDatabaseUrl(), {
      ssl: process.env.NODE_ENV === "production" ? "require" : "prefer",
      prepare: false,
      max: process.env.NODE_ENV === "production" ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

/** @deprecated Daten per `npm run db:seed` laden – kein Auto-Seed zur Laufzeit. */
export async function ensureSeeded(): Promise<void> {
  return;
}

/** @deprecated Use getSql() – kept for gradual migration references */
export async function getDb(): Promise<postgres.Sql> {
  await ensureSeeded();
  return getSql();
}
