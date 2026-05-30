import postgres from "postgres";
import { seedDatabase } from "./db/seed";

let sql: postgres.Sql | null = null;
let seedPromise: Promise<void> | null = null;

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
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}

/** Ensures demo users and course metadata exist (idempotent). */
export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedDatabase(getSql()).catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  await seedPromise;
}

/** @deprecated Use getSql() – kept for gradual migration references */
export async function getDb(): Promise<postgres.Sql> {
  await ensureSeeded();
  return getSql();
}
