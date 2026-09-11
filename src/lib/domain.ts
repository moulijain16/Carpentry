// Business rules agreed with Gurpreet (see docs/REQUIREMENTS.md).

export const STATUSES = [
  "New",
  "Accepted",
  "In Progress",
  "Delivered",
  "Cancelled",
  "Rejected",
] as const;

export type Status = (typeof STATUSES)[number];

/**
 * "It should go in order only. New first, then Accepted, then In Progress,
 * then Delivered." Cancel/Reject leave the pipeline; a rejected or cancelled
 * enquiry can be reopened back to New.
 */
export const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  New: ["Accepted", "Rejected", "Cancelled"],
  Accepted: ["In Progress", "Rejected", "Cancelled"],
  "In Progress": ["Delivered", "Cancelled"],
  Delivered: [],
  Cancelled: ["New"],
  Rejected: ["New"],
};

export function canTransition(from: Status, to: Status): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionError(from: Status, to: Status): string {
  if (from === to) return `This enquiry is already marked ${from}.`;
  if (from === "Delivered")
    return "A delivered order is finished — its status cannot be changed.";
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.length) return `An enquiry marked ${from} cannot be changed.`;
  return `Cannot go from ${from} straight to ${to}. Work moves in order: New → Accepted → In Progress → Delivered. From ${from} you can only move to ${allowed.join(", ")}.`;
}

export const FURNITURE_TYPES = [
  "Wardrobe",
  "Bed",
  "Kitchen Unit",
  "Cupboard",
  "Dining Table",
  "Chair Set",
  "Sofa",
  "Study Table",
  "TV Unit",
  "Temple Cabinet",
  "Door / Window Frame",
  "Other",
] as const;

export type DeliveryMode = "Delivery" | "Pickup";

export type EnquiryItem = {
  id?: number;
  furnitureType: string;
  otherDescription: string | null;
  measurements: string;
  quantity: number;
  woodFinish: string | null;
  specialRequirements: string | null;
};

export type Enquiry = {
  id: number;
  customerName: string;
  phone: string;
  deliveryMode: DeliveryMode;
  address: string | null;
  installation: boolean;
  hasPhoto: boolean;
  status: Status;
  createdAt: string;
  updatedAt: string;
  // Accepted stage
  estimatedPrice: number | null;
  advanceAmount: number | null;
  promisedDeliveryDate: string | null;
  // In Progress stage
  workStartedDate: string | null;
  workshopNotes: string | null;
  // Delivered stage
  actualDeliveryDate: string | null;
  balancePaid: boolean;
  deliveryNotes: string | null;
  items: EnquiryItem[];
};

/** Balance is always total price minus advance received. */
export function balanceDue(e: {
  estimatedPrice: number | null;
  advanceAmount: number | null;
}): number | null {
  if (e.estimatedPrice == null) return null;
  return Math.max(0, e.estimatedPrice - (e.advanceAmount ?? 0));
}

export function itemSummary(items: EnquiryItem[]): string {
  if (!items.length) return "—";
  const label = (i: EnquiryItem) =>
    (i.furnitureType === "Other" && i.otherDescription
      ? i.otherDescription
      : i.furnitureType) + (i.quantity > 1 ? ` ×${i.quantity}` : "");
  const first = label(items[0]);
  return items.length === 1 ? first : `${first} +${items.length - 1} more`;
}

/** Local (workshop) date as YYYY-MM-DD. */
export function today(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/**
 * "If delivery is in the next 2 or 3 days highlight it so I see it immediately."
 * Returns days until the promised date (negative = overdue) for live orders only.
 */
export function deliveryUrgency(e: {
  status: Status;
  promisedDeliveryDate: string | null;
}): { days: number; level: "overdue" | "due-soon" } | null {
  if (!e.promisedDeliveryDate) return null;
  if (e.status !== "Accepted" && e.status !== "In Progress") return null;
  const ms =
    new Date(`${e.promisedDeliveryDate}T00:00:00`).getTime() -
    new Date(`${today()}T00:00:00`).getTime();
  const days = Math.round(ms / 86400000);
  if (days < 0) return { days, level: "overdue" };
  if (days <= 3) return { days, level: "due-soon" };
  return null;
}
