"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { deliveryUrgency, itemSummary, type Enquiry } from "@/lib/domain";
import { rowTone } from "@/lib/statusStyles";
import { formatDate, relativeDays } from "@/lib/format";

export default function EnquiryCard({ enquiry }: { enquiry: Enquiry }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urgency = deliveryUrgency(enquiry);
  const canCancel = enquiry.status !== "Cancelled" && enquiry.status !== "Delivered"
    && enquiry.status !== "Rejected";
  const canReject = enquiry.status === "New" || enquiry.status === "Accepted";
  const canReopen = enquiry.status === "Cancelled" || enquiry.status === "Rejected";

  async function act(
    label: string,
    request: () => Promise<Response>,
    confirmMessage?: string,
  ) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Could not ${label}.`);
        return;
      }
      router.refresh();
    } catch {
      setError(`Could not ${label}. Please check your connection.`);
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (status: string, confirmMessage?: string) =>
    act(
      `mark this ${status.toLowerCase()}`,
      () =>
        fetch(`/api/enquiries/${enquiry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      confirmMessage,
    );

  return (
    <li
      className={`card overflow-hidden ${rowTone(enquiry.status)} ${
        urgency
          ? urgency.level === "overdue"
            ? "border-l-4 border-l-red-500"
            : "border-l-4 border-l-amber-500"
          : ""
      }`}
    >
      <Link href={`/admin/${enquiry.id}`} className="block p-4 active:bg-bark-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold text-bark-500">
              #{enquiry.id}
              {enquiry.hasPhoto && <span title="Reference photo attached">📷</span>}
            </p>
            <p
              className={`truncate text-base font-bold ${
                enquiry.status === "Cancelled"
                  ? "text-slate-600 line-through decoration-slate-400"
                  : "text-bark-900"
              }`}
            >
              {enquiry.customerName}
            </p>
            <p className="truncate text-sm text-bark-600">{enquiry.phone}</p>
          </div>
          <StatusBadge status={enquiry.status} />
        </div>

        <p className="mt-2.5 truncate text-sm font-medium text-bark-700">
          {itemSummary(enquiry.items)}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bark-500">
          <span>
            Delivery:{" "}
            <span className="font-semibold text-bark-700">
              {formatDate(enquiry.promisedDeliveryDate)}
            </span>
          </span>
          {urgency && (
            <span
              className={`rounded-full px-2 py-0.5 font-bold ${
                urgency.level === "overdue"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {relativeDays(urgency.days)}
            </span>
          )}
        </div>
      </Link>

      {error && (
        <p
          role="alert"
          className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {error}
        </p>
      )}

      {/* "Edit, cancel and delete — three buttons in the row itself." */}
      <div className="flex flex-wrap gap-2 border-t border-bark-100 bg-bark-50/60 px-3 py-2.5">
        <Link href={`/admin/${enquiry.id}?edit=1`} className="btn-secondary btn-sm">
          Edit
        </Link>
        {canCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setStatus(
                "Cancelled",
                `Mark enquiry #${enquiry.id} as cancelled? It stays in the list, greyed out.`,
              )
            }
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
        )}
        {canReject && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setStatus(
                "Rejected",
                `Reject enquiry #${enquiry.id}? You can reopen it later if the customer comes back.`,
              )
            }
            className="btn-secondary btn-sm"
          >
            Reject
          </button>
        )}
        {canReopen && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setStatus("New", `Reopen enquiry #${enquiry.id} as a new enquiry?`)
            }
            className="btn-secondary btn-sm"
          >
            Reopen
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            act(
              "delete this enquiry",
              () => fetch(`/api/enquiries/${enquiry.id}`, { method: "DELETE" }),
              `Delete enquiry #${enquiry.id} from ${enquiry.customerName} permanently? This cannot be undone.`,
            )
          }
          className="btn-danger btn-sm ml-auto"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
