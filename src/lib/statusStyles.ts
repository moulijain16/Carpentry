import type { Status } from "@/lib/domain";

/** "Colour badge is good — I can see at a glance... different colour for each status." */
export const STATUS_STYLES: Record<
  Status,
  { badge: string; dot: string; tab: string }
> = {
  New: {
    badge: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
    dot: "bg-blue-500",
    tab: "bg-blue-600 text-white",
  },
  Accepted: {
    badge: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
    dot: "bg-amber-500",
    tab: "bg-amber-600 text-white",
  },
  "In Progress": {
    badge: "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
    dot: "bg-violet-500",
    tab: "bg-violet-600 text-white",
  },
  Delivered: {
    badge: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    tab: "bg-emerald-600 text-white",
  },
  Cancelled: {
    badge: "bg-slate-200 text-slate-600 ring-1 ring-slate-300",
    dot: "bg-slate-400",
    tab: "bg-slate-500 text-white",
  },
  Rejected: {
    badge: "bg-red-100 text-red-800 ring-1 ring-red-200",
    dot: "bg-red-500",
    tab: "bg-red-600 text-white",
  },
};

/** Cancelled greys out, rejected reads red — "so I know at a glance". */
export function rowTone(status: Status): string {
  if (status === "Cancelled") return "bg-slate-50 opacity-70";
  if (status === "Rejected") return "bg-red-50/60";
  return "bg-white";
}
