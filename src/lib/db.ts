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

export function isDbConnectionError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toUpperCase();
  return (
    msg.includes("CONNECTION_ENDED") ||
    msg.includes("CONNECTION TERMINATED") ||
    msg.includes("CONNECTION CLOSED") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("CONNECT TIMEOUT") ||
    msg.includes("SOCKET CLOSED") ||
    msg.includes("CANNOT USE A POOL AFTER CALLING END")
  );
}

function createSql(): postgres.Sql {
  return postgres(getDatabaseUrl(), {
    ssl: process.env.NODE_ENV === "production" ? "require" : "prefer",
    prepare: false,
    fetch_types: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    max_lifetime: 60 * 2,
    onclose: () => {
      sql = null;
    },
  });
}

export function getSql(): postgres.Sql {
  if (!sql) {
    sql = createSql();
  }
  return sql;
}

export async function resetSql(): Promise<void> {
  if (sql) {
    try {
      await sql.end({ timeout: 2 });
    } catch {
      /* ignore */
    }
    sql = null;
  }
}

/** Einmaliger Retry nach CONNECTION_ENDED (Supabase Transaction Pooler). */
export async function withDbRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (!isDbConnectionError(err)) throw err;
    console.error("[db] Verbindung unterbrochen, neuer Versuch:", err);
    await resetSql();
    return await operation();
  }
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
