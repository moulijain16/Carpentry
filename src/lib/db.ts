import { createClient, type Client } from "@libsql/client";

const SCHEMA_STATEMENTS = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS enquiries (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name          TEXT    NOT NULL,
  phone                  TEXT    NOT NULL,
  delivery_mode          TEXT    NOT NULL,
  address                TEXT,
  installation           INTEGER NOT NULL DEFAULT 0,
  photo                  BLOB,
  photo_type             TEXT,
  status                 TEXT    NOT NULL DEFAULT 'New',
  created_at             TEXT    NOT NULL,
  updated_at             TEXT    NOT NULL,
  estimated_price        REAL,
  advance_amount         REAL,
  promised_delivery_date TEXT,
  work_started_date      TEXT,
  workshop_notes         TEXT,
  actual_delivery_date   TEXT,
  balance_paid           INTEGER NOT NULL DEFAULT 0,
  delivery_notes         TEXT
);

CREATE TABLE IF NOT EXISTS enquiry_items (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_id           INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  position             INTEGER NOT NULL DEFAULT 0,
  furniture_type       TEXT    NOT NULL,
  other_description    TEXT,
  measurements         TEXT    NOT NULL,
  quantity             INTEGER NOT NULL DEFAULT 1,
  wood_finish          TEXT,
  special_requirements TEXT
);

CREATE TABLE IF NOT EXISTS status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_id  INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_id INTEGER,
  channel    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL,
  detail     TEXT,
  at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enquiries_status  ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_enquiry     ON enquiry_items(enquiry_id);
`;

async function open(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Add it to .env.local (see .env.example)."
    );
  }

  const client = createClient({ url, authToken });

  // Multiple statements separated by ';' in one call.
  await client.executeMultiple(SCHEMA_STATEMENTS);

  // "Like order number 101 or something simple like that."
  // Read first so an already-seeded database is never written to on open —
  // otherwise every process start contends for the write lock.
  const seeded = await client.execute(
    `SELECT 1 FROM sqlite_sequence WHERE name = 'enquiries'`
  );
  if (seeded.rows.length === 0) {
    await client.execute(
      `INSERT INTO sqlite_sequence(name, seq) VALUES ('enquiries', 100)`
    );
  }

  return client;
}

// Next.js reloads modules in dev; keep one connection per process. Opening is
// deferred to the first query so that builds and type checks never touch the
// database.
const globalForDb = globalThis as unknown as {
  __workshopDb?: Client;
  __workshopDbInit?: Promise<Client>;
};

async function connection(): Promise<Client> {
  if (globalForDb.__workshopDb) return globalForDb.__workshopDb;
  if (!globalForDb.__workshopDbInit) globalForDb.__workshopDbInit = open();
  globalForDb.__workshopDb = await globalForDb.__workshopDbInit;
  return globalForDb.__workshopDb;
}

/** Run a SELECT and get the first row, or null. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = []
): Promise<T | null> {
  const db = await connection();
  const result = await db.execute({ sql, args: args as never });
  return (result.rows[0] as T) ?? null;
}

/** Run a SELECT and get all rows. */
export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = []
): Promise<T[]> {
  const db = await connection();
  const result = await db.execute({ sql, args: args as never });
  return result.rows as T[];
}

/** Run an INSERT/UPDATE/DELETE. Returns last insert id and rows affected. */
export async function run(
  sql: string,
  args: unknown[] = []
): Promise<{ lastInsertRowid: bigint | number | undefined; changes: number }> {
  const db = await connection();
  const result = await db.execute({ sql, args: args as never });
  return {
    lastInsertRowid: result.lastInsertRowid,
    changes: result.rowsAffected,
  };
}

/** Run several statements as one atomic transaction. */
export async function transaction(
  statements: { sql: string; args?: unknown[] }[]
): Promise<void> {
  const db = await connection();
  await db.batch(
    statements.map((s) => ({ sql: s.sql, args: (s.args ?? []) as never })),
    "write"
  );
}
export async function getClient(): Promise<Client> {
  return connection();
}