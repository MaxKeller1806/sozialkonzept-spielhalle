import postgres from "postgres";

const SQL_GLOBAL_KEY = "__certianoPostgresSql";

type SqlGlobal = typeof globalThis & {
  [SQL_GLOBAL_KEY]?: postgres.Sql | null;
};

function readGlobalSql(): postgres.Sql | null {
  return (globalThis as SqlGlobal)[SQL_GLOBAL_KEY] ?? null;
}

function writeGlobalSql(client: postgres.Sql | null): void {
  (globalThis as SqlGlobal)[SQL_GLOBAL_KEY] = client;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Siehe .env.example und DEPLOYMENT.md."
    );
  }
  return url;
}

function connectionErrorCode(err: unknown): string {
  if (!err || typeof err !== "object" || !("code" in err)) return "";
  return String((err as { code: unknown }).code).toUpperCase();
}

export function isDbConnectionError(err: unknown): boolean {
  if (isQueryTimeoutError(err)) return false;

  const code = connectionErrorCode(err);
  if (
    code === "CONNECTION_DESTROYED" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "EPIPE" ||
    code === "ETIMEDOUT" ||
    code === "57P01" ||
    code === "08006" ||
    code === "08003" ||
    code === "08000" ||
    code === "XX000"
  ) {
    return true;
  }

  const msg = (err instanceof Error ? err.message : String(err)).toUpperCase();
  return (
    msg.includes("CONNECTION_DESTROYED") ||
    msg.includes("CONNECTION_ENDED") ||
    msg.includes("CONNECTION TERMINATED") ||
    msg.includes("CONNECTION CLOSED") ||
    msg.includes("CONNECTION DOES NOT EXIST") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("CONNECT TIMEOUT") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("EPIPE") ||
    msg.includes("SOCKET CLOSED") ||
    msg.includes("CANNOT USE A POOL AFTER CALLING END") ||
    msg.includes("CLIENT HAS ENCOUNTERED A CONNECTION ERROR")
  );
}

export class QueryTimeoutError extends Error {
  constructor() {
    super("QUERY_TIMEOUT");
    this.name = "QueryTimeoutError";
  }
}

export function isQueryTimeoutError(err: unknown): boolean {
  return (
    err instanceof QueryTimeoutError ||
    (err instanceof Error && err.message === "QUERY_TIMEOUT")
  );
}

export function isMissingDbObject(err: unknown, name: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("does not exist") && msg.includes(name);
}

export function postgresErrorFields(err: unknown): {
  message: string;
  code?: string;
  detail?: string;
  stack?: string;
} {
  const message = err instanceof Error ? err.message : String(err);
  const rec = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
  return {
    message,
    code: rec.code != null ? String(rec.code) : undefined,
    detail: rec.detail != null ? String(rec.detail) : undefined,
    stack: err instanceof Error ? err.stack : undefined,
  };
}

function poolMaxConnections(): number {
  const url = process.env.DATABASE_URL ?? "";
  /** Supabase Transaction Pooler (6543): eine Verbindung pro Serverless-Instanz. */
  if (url.includes(":6543")) return 1;
  /** Lokal / Direct Connection: wenige parallele Requests (Editor, Shell). */
  return process.env.NODE_ENV === "production" ? 2 : 4;
}

function createSql(): postgres.Sql {
  return postgres(getDatabaseUrl(), {
    ssl: process.env.NODE_ENV === "production" ? "require" : "prefer",
    prepare: false,
    fetch_types: false,
    max: poolMaxConnections(),
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 5,
    onclose: () => {
      writeGlobalSql(null);
    },
  });
}

export function getSql(): postgres.Sql {
  let client = readGlobalSql();
  if (!client) {
    client = createSql();
    writeGlobalSql(client);
  }
  return client;
}

export async function resetSql(): Promise<void> {
  const client = readGlobalSql();
  if (client) {
    try {
      await client.end({ timeout: 2 });
    } catch {
      /* ignore */
    }
    writeGlobalSql(null);
  }
}

/** Pool nur bei Verbindungs-/Timeout-Fehlern zurücksetzen (nicht bei 404/Validierung). */
export async function resetSqlOnFailure(err: unknown): Promise<void> {
  if (isQueryTimeoutError(err) || isDbConnectionError(err)) {
    await resetSql();
  }
}

/** Bricht nach ms ab, setzt DB-Client bei Timeout/Verbindungsfehler zurück. */
export async function withQueryTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs = 5000
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new QueryTimeoutError()), timeoutMs);
      }),
    ]);
  } catch (err) {
    await resetSqlOnFailure(err);
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Einmaliger Retry nach Pooler-/Verbindungsabbruch (z. B. CONNECTION_DESTROYED). */
export async function withDbRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (isQueryTimeoutError(err)) throw err;
    if (!isDbConnectionError(err)) throw err;
    console.error("[db] Verbindung unterbrochen, neuer Versuch:", err);
    await resetSql();
    return await operation();
  }
}

/** Query mit Timeout; ein Retry nur bei Verbindungsfehler. */
export async function withDbQuery<T>(
  operation: () => Promise<T>,
  timeoutMs = 5000
): Promise<T> {
  return withDbRetry(() => withQueryTimeout(operation, timeoutMs));
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
