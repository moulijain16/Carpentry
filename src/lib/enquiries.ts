import { db } from "@/lib/db";
import {
  canTransition,
  today,
  transitionError,
  type Enquiry,
  type EnquiryItem,
  type Status,
} from "@/lib/domain";

type Row = Record<string, unknown>;

const s = (v: unknown) => (v == null ? null : String(v));
const n = (v: unknown) => (v == null ? null : Number(v));

function mapItem(r: Row): EnquiryItem {
  return {
    id: Number(r.id),
    furnitureType: String(r.furniture_type),
    otherDescription: s(r.other_description),
    measurements: String(r.measurements),
    quantity: Number(r.quantity),
    woodFinish: s(r.wood_finish),
    specialRequirements: s(r.special_requirements),
  };
}

function mapEnquiry(r: Row, items: EnquiryItem[]): Enquiry {
  return {
    id: Number(r.id),
    customerName: String(r.customer_name),
    phone: String(r.phone),
    deliveryMode: r.delivery_mode === "Pickup" ? "Pickup" : "Delivery",
    address: s(r.address),
    installation: Number(r.installation) === 1,
    hasPhoto: Number(r.has_photo ?? 0) === 1,
    status: String(r.status) as Status,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    estimatedPrice: n(r.estimated_price),
    advanceAmount: n(r.advance_amount),
    promisedDeliveryDate: s(r.promised_delivery_date),
    workStartedDate: s(r.work_started_date),
    workshopNotes: s(r.workshop_notes),
    actualDeliveryDate: s(r.actual_delivery_date),
    balancePaid: Number(r.balance_paid) === 1,
    deliveryNotes: s(r.delivery_notes),
    items,
  };
}

const COLUMNS = `id, customer_name, phone, delivery_mode, address, installation,
  (photo IS NOT NULL) AS has_photo, status, created_at, updated_at,
  estimated_price, advance_amount, promised_delivery_date,
  work_started_date, workshop_notes,
  actual_delivery_date, balance_paid, delivery_notes`;

export type NewEnquiry = {
  customerName: string;
  phone: string;
  deliveryMode: "Delivery" | "Pickup";
  address: string | null;
  installation: boolean;
  photo: { data: Uint8Array; type: string } | null;
  items: Omit<EnquiryItem, "id">[];
};

export function createEnquiry(input: NewEnquiry): Enquiry {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO enquiries
       (customer_name, phone, delivery_mode, address, installation, photo, photo_type,
        status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'New', ?, ?)`,
  );
  const itemStmt = db.prepare(
    `INSERT INTO enquiry_items
       (enquiry_id, position, furniture_type, other_description, measurements,
        quantity, wood_finish, special_requirements)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  db.exec("BEGIN");
  try {
    const res = insert.run(
      input.customerName,
      input.phone,
      input.deliveryMode,
      input.address,
      input.installation ? 1 : 0,
      input.photo ? input.photo.data : null,
      input.photo ? input.photo.type : null,
      now,
      now,
    );
    const id = Number(res.lastInsertRowid);
    input.items.forEach((item, i) => {
      itemStmt.run(
        id,
        i,
        item.furnitureType,
        item.otherDescription,
        item.measurements,
        item.quantity,
        item.woodFinish,
        item.specialRequirements,
      );
    });
    db.prepare(
      `INSERT INTO status_history (enquiry_id, from_status, to_status, at)
       VALUES (?, NULL, 'New', ?)`,
    ).run(id, now);
    db.exec("COMMIT");
    return getEnquiry(id)!;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function getEnquiry(id: number): Enquiry | null {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM enquiries WHERE id = ?`)
    .get(id) as Row | undefined;
  if (!row) return null;
  const items = db
    .prepare(
      `SELECT * FROM enquiry_items WHERE enquiry_id = ? ORDER BY position, id`,
    )
    .all(id) as Row[];
  return mapEnquiry(row, items.map(mapItem));
}

export function getPhoto(
  id: number,
): { data: Uint8Array; type: string } | null {
  const row = db
    .prepare(`SELECT photo, photo_type FROM enquiries WHERE id = ?`)
    .get(id) as Row | undefined;
  if (!row?.photo) return null;
  return {
    data: new Uint8Array(row.photo as ArrayBuffer),
    type: String(row.photo_type ?? "application/octet-stream"),
  };
}

/** Newest first — "I want to see what just came in at the top." */
export function listEnquiries(opts: { status?: string; q?: string } = {}) {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (opts.status && opts.status !== "All") {
    where.push("status = ?");
    params.push(opts.status);
  }
  // "Search by name and order number both."
  const q = opts.q?.trim();
  if (q) {
    where.push("(LOWER(customer_name) LIKE ? OR CAST(id AS TEXT) = ?)");
    params.push(`%${q.toLowerCase()}%`, q.replace(/^#/, ""));
  }

  const rows = db
    .prepare(
      `SELECT ${COLUMNS} FROM enquiries
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY created_at DESC, id DESC`,
    )
    .all(...params) as Row[];

  if (!rows.length) return [];
  const ids = rows.map((r) => Number(r.id));
  const items = db
    .prepare(
      `SELECT * FROM enquiry_items
       WHERE enquiry_id IN (${ids.map(() => "?").join(",")})
       ORDER BY position, id`,
    )
    .all(...ids) as Row[];

  const byEnquiry = new Map<number, EnquiryItem[]>();
  for (const it of items) {
    const key = Number(it.enquiry_id);
    if (!byEnquiry.has(key)) byEnquiry.set(key, []);
    byEnquiry.get(key)!.push(mapItem(it));
  }
  return rows.map((r) => mapEnquiry(r, byEnquiry.get(Number(r.id)) ?? []));
}

export function statusCounts(): Record<string, number> {
  const rows = db
    .prepare(`SELECT status, COUNT(*) AS c FROM enquiries GROUP BY status`)
    .all() as Row[];
  const counts: Record<string, number> = { All: 0 };
  for (const r of rows) {
    counts[String(r.status)] = Number(r.c);
    counts.All += Number(r.c);
  }
  return counts;
}

const STAGE_FIELDS = {
  estimatedPrice: "estimated_price",
  advanceAmount: "advance_amount",
  promisedDeliveryDate: "promised_delivery_date",
  workStartedDate: "work_started_date",
  workshopNotes: "workshop_notes",
  actualDeliveryDate: "actual_delivery_date",
  balancePaid: "balance_paid",
  deliveryNotes: "delivery_notes",
  customerName: "customer_name",
  phone: "phone",
  address: "address",
  deliveryMode: "delivery_mode",
  installation: "installation",
} as const;

export type UpdatableField = keyof typeof STAGE_FIELDS;

export class RuleError extends Error {}

/** Partial update of enquiry fields (admin edit + per-stage detail fields). */
export function updateEnquiry(
  id: number,
  patch: Partial<Record<UpdatableField, unknown>>,
  items?: Omit<EnquiryItem, "id">[],
): Enquiry {
  const existing = getEnquiry(id);
  if (!existing) throw new RuleError("Enquiry not found.");

  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const [key, column] of Object.entries(STAGE_FIELDS)) {
    if (!(key in patch)) continue;
    let value = patch[key as UpdatableField];
    if (key === "balancePaid" || key === "installation")
      value = value ? 1 : 0;
    if (value === "") value = null;
    sets.push(`${column} = ?`);
    params.push(value as string | number | null);
  }

  db.exec("BEGIN");
  try {
    if (sets.length) {
      sets.push("updated_at = ?");
      params.push(new Date().toISOString());
      db.prepare(`UPDATE enquiries SET ${sets.join(", ")} WHERE id = ?`).run(
        ...params,
        id,
      );
    }
    if (items) {
      if (!items.length) throw new RuleError("An enquiry needs at least one item.");
      db.prepare(`DELETE FROM enquiry_items WHERE enquiry_id = ?`).run(id);
      const stmt = db.prepare(
        `INSERT INTO enquiry_items
           (enquiry_id, position, furniture_type, other_description, measurements,
            quantity, wood_finish, special_requirements)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      items.forEach((item, i) =>
        stmt.run(
          id,
          i,
          item.furnitureType,
          item.otherDescription,
          item.measurements,
          item.quantity,
          item.woodFinish,
          item.specialRequirements,
        ),
      );
      db.prepare(`UPDATE enquiries SET updated_at = ? WHERE id = ?`).run(
        new Date().toISOString(),
        id,
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return getEnquiry(id)!;
}

/** Status changes are guarded by the agreed order. */
export function changeStatus(
  id: number,
  to: Status,
  extra: Partial<Record<UpdatableField, unknown>> = {},
): Enquiry {
  const existing = getEnquiry(id);
  if (!existing) throw new RuleError("Enquiry not found.");
  if (!canTransition(existing.status, to))
    throw new RuleError(transitionError(existing.status, to));

  const now = new Date().toISOString();
  const patch: Partial<Record<UpdatableField, unknown>> = { ...extra };

  // "The date gets recorded automatically when I move it to In Progress."
  // The workshop's local date, not UTC — an evening entry must not jump a day.
  if (to === "In Progress" && !existing.workStartedDate && !patch.workStartedDate)
    patch.workStartedDate = today();
  if (to === "Delivered" && !existing.actualDeliveryDate && !patch.actualDeliveryDate)
    patch.actualDeliveryDate = today();
  // Reopening a cancelled/rejected enquiry sends it back to the start.
  if (to === "New") {
    patch.workStartedDate = null;
    patch.actualDeliveryDate = null;
  }

  db.exec("BEGIN");
  try {
    db.prepare(`UPDATE enquiries SET status = ?, updated_at = ? WHERE id = ?`).run(
      to,
      now,
      id,
    );
    db.prepare(
      `INSERT INTO status_history (enquiry_id, from_status, to_status, at)
       VALUES (?, ?, ?, ?)`,
    ).run(id, existing.status, to, now);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return updateEnquiry(id, patch);
}

/** "Delete means it's gone completely." */
export function deleteEnquiry(id: number): boolean {
  const res = db.prepare(`DELETE FROM enquiries WHERE id = ?`).run(id);
  return Number(res.changes) > 0;
}

export function statusHistory(id: number) {
  return (
    db
      .prepare(
        `SELECT from_status, to_status, at FROM status_history
         WHERE enquiry_id = ? ORDER BY id`,
      )
      .all(id) as Row[]
  ).map((r) => ({
    from: s(r.from_status),
    to: String(r.to_status),
    at: String(r.at),
  }));
}
