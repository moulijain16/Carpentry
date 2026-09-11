import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

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

function open(): DatabaseSync {
  const file =
    process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "workshop.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);

  // "Like order number 101 or something simple like that."
  // Read first so an already-seeded database is never written to on open —
  // otherwise every process start contends for the write lock.
  const seeded = db
    .prepare(`SELECT 1 FROM sqlite_sequence WHERE name = 'enquiries'`)
    .get();
  if (!seeded)
    db.prepare(`INSERT INTO sqlite_sequence(name, seq) VALUES ('enquiries', 100)`).run();

  return db;
}

// Next.js reloads modules in dev; keep one connection per process. Opening is
// deferred to the first query so that builds and type checks never touch the
// database file.
const globalForDb = globalThis as unknown as { __workshopDb?: DatabaseSync };

function connection(): DatabaseSync {
  if (!globalForDb.__workshopDb) globalForDb.__workshopDb = open();
  return globalForDb.__workshopDb;
}

export const db = new Proxy({} as DatabaseSync, {
  get(_target, property) {
    const conn = connection();
    const value = Reflect.get(conn, property);
    return typeof value === "function" ? value.bind(conn) : value;
  },
});
