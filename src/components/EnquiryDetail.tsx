"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import StageStepper from "@/components/StageStepper";
import StatusBadge from "@/components/StatusBadge";
import ItemsEditor, {
  blankDraft,
  toDraft,
  type ItemDraft,
} from "@/components/ItemsEditor";
import {
  balanceDue,
  deliveryUrgency,
  today,
  type Enquiry,
  type Status,
} from "@/lib/domain";
import { formatDate, formatDateTime, formatMoney, relativeDays } from "@/lib/format";

type History = { from: string | null; to: string; at: string }[];

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <dt className="text-xs font-semibold text-bark-500">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-wrap text-bark-900">
        {children}
      </dd>
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold tracking-wide text-bark-800 uppercase">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default function EnquiryDetail({
  initialEnquiry,
  initialHistory,
  startInEdit,
}: {
  initialEnquiry: Enquiry;
  initialHistory: History;
  startInEdit: boolean;
}) {
  const router = useRouter();
  const [enquiry, setEnquiry] = useState(initialEnquiry);
  const [history, setHistory] = useState(initialHistory);
  const [editing, setEditing] = useState(startInEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const urgency = deliveryUrgency(enquiry);
  const balance = balanceDue(enquiry);

  async function send(
    body: Record<string, unknown>,
    successMessage: string,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/enquiries/${enquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Includes the "no jumping around" message from the status rules.
        setError(data.error ?? "Could not save. Please try again.");
        return false;
      }
      setEnquiry(data.enquiry);
      setHistory(data.history);
      setNotice(successMessage);
      router.refresh();
      return true;
    } catch {
      setError("Could not save. Please check your connection.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete enquiry #${enquiry.id} from ${enquiry.customerName} permanently? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/enquiries/${enquiry.id}`, { method: "DELETE" });
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      setError("Could not delete this enquiry.");
      setBusy(false);
    }
  }

  const canCancel =
    enquiry.status !== "Cancelled" &&
    enquiry.status !== "Rejected" &&
    enquiry.status !== "Delivered";
  const canReject = enquiry.status === "New" || enquiry.status === "Accepted";
  const canReopen =
    enquiry.status === "Cancelled" || enquiry.status === "Rejected";

  return (
    <div className="space-y-4">
      <Link
        href="/admin"
        className="inline-block text-sm font-semibold text-bark-600 hover:underline"
      >
        ← All enquiries
      </Link>

      {/* ------------------------------------------------------- summary */}
      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-bark-500">
              Order #{enquiry.id}
            </p>
            <h1 className="truncate text-xl font-bold text-bark-900">
              {enquiry.customerName}
            </h1>
            <a
              href={`tel:${enquiry.phone.replace(/\s/g, "")}`}
              className="text-sm font-semibold text-bark-600 hover:underline"
            >
              {enquiry.phone}
            </a>
          </div>
          <StatusBadge status={enquiry.status} />
        </div>

        <div className="mt-4">
          <StageStepper status={enquiry.status} />
        </div>

        {(enquiry.status === "Cancelled" || enquiry.status === "Rejected") && (
          <p className="mt-4 rounded-xl bg-bark-100 px-3 py-2 text-sm text-bark-700">
            {enquiry.status === "Cancelled"
              ? "The customer backed out of this one."
              : "You turned this work down."}{" "}
            Reopen it to put it back at the start.
          </p>
        )}

        {urgency && (
          <p
            className={`mt-4 rounded-xl px-3 py-2 text-sm font-semibold ${
              urgency.level === "overdue"
                ? "bg-red-100 text-red-800"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            Promised {formatDate(enquiry.promisedDeliveryDate)} —{" "}
            {relativeDays(urgency.days)}.
          </p>
        )}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800">
          {notice}
        </p>
      )}

      {editing ? (
        <EditDetails
          enquiry={enquiry}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={async (patch, items) => {
            const ok = await send(
              { ...patch, items },
              "Enquiry details updated.",
            );
            if (ok) setEditing(false);
          }}
        />
      ) : (
        <>
          <Card
            title="Enquiry details"
            action={
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-secondary btn-sm"
              >
                Edit
              </button>
            }
          >
            <dl className="divide-y divide-bark-100">
              <Detail label="Received">
                {formatDateTime(enquiry.createdAt)}
              </Detail>
              <Detail label="Delivery or pickup">
                {enquiry.deliveryMode}
                {enquiry.installation ? " · Installation needed" : ""}
              </Detail>
              {enquiry.address && (
                <Detail label="Address">{enquiry.address}</Detail>
              )}
            </dl>
          </Card>

          <Card title={`Items (${enquiry.items.length})`}>
            <ul className="divide-y divide-bark-100">
              {enquiry.items.map((item, index) => (
                <li key={item.id ?? index} className="py-3 first:pt-1">
                  <p className="font-bold text-bark-900">
                    {item.furnitureType === "Other" && item.otherDescription
                      ? item.otherDescription
                      : item.furnitureType}
                    <span className="ml-2 rounded-md bg-bark-100 px-1.5 py-0.5 text-xs font-bold text-bark-700">
                      ×{item.quantity}
                    </span>
                  </p>
                  <dl className="mt-1 space-y-1 text-sm text-bark-700">
                    <div>
                      <span className="text-bark-500">Size: </span>
                      <span className="whitespace-pre-wrap">
                        {item.measurements}
                      </span>
                    </div>
                    {item.woodFinish && (
                      <div>
                        <span className="text-bark-500">Wood / finish: </span>
                        {item.woodFinish}
                      </div>
                    )}
                    {item.specialRequirements && (
                      <div>
                        <span className="text-bark-500">Special: </span>
                        <span className="whitespace-pre-wrap">
                          {item.specialRequirements}
                        </span>
                      </div>
                    )}
                  </dl>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {enquiry.hasPhoto && (
        <Card title="Reference photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/enquiries/${enquiry.id}/photo`}
            alt={`Reference photo sent by ${enquiry.customerName}`}
            className="w-full rounded-xl border border-bark-200"
          />
        </Card>
      )}

      {/* --------------------------------------------------- stage panels */}
      {enquiry.status === "New" && (
        <AcceptPanel enquiry={enquiry} busy={busy} send={send} />
      )}

      {["Accepted", "In Progress", "Delivered"].includes(enquiry.status) && (
        <OrderTerms enquiry={enquiry} busy={busy} send={send} />
      )}

      {enquiry.status === "Accepted" && (
        <StartWorkPanel busy={busy} send={send} />
      )}

      {["In Progress", "Delivered"].includes(enquiry.status) && (
        <WorkshopPanel enquiry={enquiry} busy={busy} send={send} />
      )}

      {enquiry.status === "In Progress" && (
        <DeliverPanel enquiry={enquiry} busy={busy} send={send} />
      )}

      {enquiry.status === "Delivered" && (
        <DeliveredPanel enquiry={enquiry} busy={busy} send={send} />
      )}

      {balance !== null && enquiry.status !== "New" && (
        <Card title="Payment">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-bark-600">Estimated price</dt>
              <dd className="font-semibold">
                {formatMoney(enquiry.estimatedPrice)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-bark-600">Advance received</dt>
              <dd className="font-semibold">
                {formatMoney(enquiry.advanceAmount ?? 0)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-bark-100 pt-2">
              <dt className="font-bold text-bark-800">
                Balance {enquiry.balancePaid ? "(paid)" : "due"}
              </dt>
              <dd
                className={`font-bold ${
                  enquiry.balancePaid || balance === 0
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {formatMoney(balance)}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {/* -------------------------------------------------------- actions */}
      <section className="card p-4">
        <h2 className="text-sm font-bold tracking-wide text-bark-800 uppercase">
          Other actions
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Mark this enquiry as cancelled? It stays in the list, greyed out.",
                  )
                )
                  send({ status: "Cancelled" }, "Marked as cancelled.");
              }}
              className="btn-secondary btn-sm"
            >
              Cancel enquiry
            </button>
          )}
          {canReject && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Reject this enquiry? You can reopen it later."))
                  send({ status: "Rejected" }, "Marked as rejected.");
              }}
              className="btn-secondary btn-sm"
            >
              Reject enquiry
            </button>
          )}
          {canReopen && (
            <button
              type="button"
              disabled={busy}
              onClick={() => send({ status: "New" }, "Reopened as a new enquiry.")}
              className="btn-secondary btn-sm"
            >
              Reopen as new
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="btn-danger btn-sm ml-auto"
          >
            Delete permanently
          </button>
        </div>
      </section>

      <Card title="History">
        <ol className="space-y-2 text-sm">
          {history.map((entry, index) => (
            <li key={index} className="flex items-baseline gap-2">
              <StatusBadge status={entry.to as Status} />
              <span className="text-xs text-bark-500">
                {formatDateTime(entry.at)}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------ edit mode */

function EditDetails({
  enquiry,
  busy,
  onCancel,
  onSave,
}: {
  enquiry: Enquiry;
  busy: boolean;
  onCancel: () => void;
  onSave: (
    patch: Record<string, unknown>,
    items: Omit<ItemDraft, "key">[],
  ) => void;
}) {
  const uid = useId();
  const [customerName, setCustomerName] = useState(enquiry.customerName);
  const [phone, setPhone] = useState(enquiry.phone);
  const [deliveryMode, setDeliveryMode] = useState(enquiry.deliveryMode);
  const [address, setAddress] = useState(enquiry.address ?? "");
  const [installation, setInstallation] = useState(enquiry.installation);
  const [items, setItems] = useState<ItemDraft[]>(
    enquiry.items.length ? enquiry.items.map(toDraft) : [blankDraft()],
  );
  const [problem, setProblem] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      setProblem("Customer name and phone number cannot be empty.");
      return;
    }
    if (items.some((i) => !i.furnitureType || !i.measurements.trim())) {
      setProblem("Every item needs a furniture type and measurements.");
      return;
    }
    setProblem(null);
    onSave(
      {
        customerName: customerName.trim(),
        phone: phone.trim(),
        deliveryMode,
        address: address.trim() || null,
        installation,
      },
      items.map((item) => ({
        furnitureType: item.furnitureType,
        otherDescription:
          item.furnitureType === "Other" ? item.otherDescription : null,
        measurements: item.measurements,
        quantity: Math.min(Math.max(Number(item.quantity) || 1, 1), 99),
        woodFinish: item.woodFinish,
        specialRequirements: item.specialRequirements,
      })),
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-4">
      <h2 className="text-sm font-bold tracking-wide text-bark-800 uppercase">
        Edit enquiry
      </h2>

      {problem && (
        <p role="alert" className="error-text">
          {problem}
        </p>
      )}

      <div>
        <label htmlFor={`${uid}-customer-name`} className="label">Customer name</label>
        <input
          id={`${uid}-customer-name`}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${uid}-phone`} className="label">Phone</label>
        <input
          id={`${uid}-phone`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${uid}-delivery-or-pickup`} className="label">Delivery or pickup</label>
        <select
          id={`${uid}-delivery-or-pickup`}
          value={deliveryMode}
          onChange={(e) =>
            setDeliveryMode(e.target.value as Enquiry["deliveryMode"])
          }
          className="field"
        >
          <option value="Delivery">Home delivery</option>
          <option value="Pickup">Customer pickup</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-address`} className="label">Address</label>
        <textarea
          id={`${uid}-address`}
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="field resize-y"
        />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-bark-200 px-3.5 py-3">
        <input
          type="checkbox"
          checked={installation}
          onChange={(e) => setInstallation(e.target.checked)}
          className="h-5 w-5 accent-bark-700"
        />
        <span className="text-sm font-semibold text-bark-800">
          Installation needed at customer&apos;s place
        </span>
      </label>

      <div>
        <p className="label">Items</p>
        <ItemsEditor items={items} onChange={setItems} />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary flex-1">
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* --------------------------------------------------------- stage panels */

type Send = (
  body: Record<string, unknown>,
  successMessage: string,
) => Promise<boolean>;

/** New → Accepted: "estimated price also I should put in when I accept. And delivery date." */
function AcceptPanel({
  enquiry,
  busy,
  send,
}: {
  enquiry: Enquiry;
  busy: boolean;
  send: Send;
}) {
  const uid = useId();
  const [price, setPrice] = useState(enquiry.estimatedPrice?.toString() ?? "");
  const [advance, setAdvance] = useState(
    enquiry.advanceAmount?.toString() ?? "",
  );
  const [date, setDate] = useState(enquiry.promisedDeliveryDate ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  function accept(event: React.FormEvent) {
    event.preventDefault();
    if (!price.trim() || Number(price) <= 0) {
      setProblem("Enter the estimated price before accepting.");
      return;
    }
    if (!date) {
      setProblem("Enter the delivery date you promised the customer.");
      return;
    }
    if (advance && Number(advance) > Number(price)) {
      setProblem("Advance cannot be more than the estimated price.");
      return;
    }
    setProblem(null);
    send(
      {
        status: "Accepted",
        estimatedPrice: Number(price),
        advanceAmount: advance ? Number(advance) : null,
        promisedDeliveryDate: date,
      },
      "Enquiry accepted.",
    );
  }

  return (
    <form onSubmit={accept} className="card space-y-3 p-4">
      <h2 className="text-sm font-bold tracking-wide text-bark-800 uppercase">
        Accept this enquiry
      </h2>
      {problem && (
        <p role="alert" className="error-text">
          {problem}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-estimated-price`} className="label">Estimated price (₹)</label>
          <input
            id={`${uid}-estimated-price`}
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-advance`} className="label">
            Advance received (₹)
            <span className="hint">Leave blank if not taken yet</span>
          </label>
          <input
            id={`${uid}-advance`}
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            value={advance}
            onChange={(e) => setAdvance(e.target.value)}
            className="field"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${uid}-promised-delivery-date`} className="label">Promised delivery date</label>
        <input
          id={`${uid}-promised-delivery-date`}
          type="date"
          min={today()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field"
        />
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Saving…" : "Accept enquiry"}
      </button>
    </form>
  );
}

/** Accepted-stage fields stay editable afterwards. */
function OrderTerms({
  enquiry,
  busy,
  send,
}: {
  enquiry: Enquiry;
  busy: boolean;
  send: Send;
}) {
  const uid = useId();
  const [price, setPrice] = useState(enquiry.estimatedPrice?.toString() ?? "");
  const [advance, setAdvance] = useState(
    enquiry.advanceAmount?.toString() ?? "",
  );
  const [date, setDate] = useState(enquiry.promisedDeliveryDate ?? "");

  const dirty =
    price !== (enquiry.estimatedPrice?.toString() ?? "") ||
    advance !== (enquiry.advanceAmount?.toString() ?? "") ||
    date !== (enquiry.promisedDeliveryDate ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(
          {
            estimatedPrice: price ? Number(price) : null,
            advanceAmount: advance ? Number(advance) : null,
            promisedDeliveryDate: date || null,
          },
          "Order terms updated.",
        );
      }}
      className="card space-y-3 p-4"
    >
      <h2 className="text-sm font-bold tracking-wide text-bark-800 uppercase">
        Order terms
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-estimated-price`} className="label">Estimated price (₹)</label>
          <input
            id={`${uid}-estimated-price`}
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-advance-received`} className="label">Advance received (₹)</label>
          <input
            id={`${uid}-advance-received`}
            type="number"
            min={0}
            value={advance}
            onChange={(e) => setAdvance(e.target.value)}
            className="field"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${uid}-promised-delivery-date`} className="label">Promised delivery date</label>
        <input
          id={`${uid}-promised-delivery-date`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field"
        />
      </div>
      {dirty && (
        <button type="submit" disabled={busy} className="btn-secondary w-full">
          {busy ? "Saving…" : "Save order terms"}
        </button>
      )}
    </form>
  );
}

/** Accepted → In Progress. The start date is recorded automatically. */
function StartWorkPanel({ busy, send }: { busy: boolean; send: Send }) {
  const uid = useId();
  const [notes, setNotes] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(
          { status: "In Progress", workshopNotes: notes.trim() || null },
          "Work started — the date has been recorded.",
        );
      }}
      className="card space-y-3 p-4"
    >
      <h2 className="text-sm font-bold tracking-wide text-bark-800 uppercase">
        Start the work
      </h2>
      <div>
        <label htmlFor={`${uid}-workshop-notes`} className="label">
          Workshop notes
          <span className="hint">Optional — anything the boys should know</span>
        </label>
        <textarea
          id={`${uid}-workshop-notes`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="field resize-y"
        />
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Saving…" : `Move to In Progress (starts ${formatDate(today())})`}
      </button>
    </form>
  );
}

function WorkshopPanel({
  enquiry,
  busy,
  send,
}: {
  enquiry: Enquiry;
  busy: boolean;
  send: Send;
}) {
  const uid = useId();
  const [notes, setNotes] = useState(enquiry.workshopNotes ?? "");
  const dirty = notes !== (enquiry.workshopNotes ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send({ workshopNotes: notes.trim() || null }, "Workshop notes saved.");
      }}
      className="card space-y-3 p-4"
    >
      <h2 className="text-sm font-bold tracking-wide text-bark-800 uppercase">
        In the workshop
      </h2>
      <p className="text-sm text-bark-600">
        Work started:{" "}
        <span className="font-semibold text-bark-900">
          {formatDate(enquiry.workStartedDate)}
        </span>
      </p>
      <div>
        <label htmlFor={`${uid}-workshop-notes`} className="label">Workshop notes</label>
        <textarea
          id={`${uid}-workshop-notes`}
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Problems, special things to remember about this order…"
          className="field resize-y"
        />
      </div>
      {dirty && (
        <button type="submit" disabled={busy} className="btn-secondary w-full">
          {busy ? "Saving…" : "Save notes"}
        </button>
      )}
    </form>
  );
}

/** In Progress → Delivered, with the balance settled on delivery. */
function DeliverPanel({
  enquiry,
  busy,
  send,
}: {
  enquiry: Enquiry;
  busy: boolean;
  send: Send;
}) {
  const uid = useId();
  const [date, setDate] = useState(today());
  const [balancePaid, setBalancePaid] = useState(false);
  const [notes, setNotes] = useState("");
  const balance = balanceDue(enquiry);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(
          {
            status: "Delivered",
            actualDeliveryDate: date,
            balancePaid,
            deliveryNotes: notes.trim() || null,
          },
          "Marked as delivered.",
        );
      }}
      className="card space-y-3 p-4"
    >
      <h2 className="text-sm font-bold tracking-wide text-bark-800 uppercase">
        Mark as delivered
      </h2>
      <div>
        <label htmlFor={`${uid}-delivery-date`} className="label">Delivery date</label>
        <input
          id={`${uid}-delivery-date`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field"
        />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-bark-200 px-3.5 py-3">
        <input
          type="checkbox"
          checked={balancePaid}
          onChange={(e) => setBalancePaid(e.target.checked)}
          className="h-5 w-5 accent-bark-700"
        />
        <span className="text-sm font-semibold text-bark-800">
          Balance of {formatMoney(balance)} received
        </span>
      </label>
      <div>
        <label htmlFor={`${uid}-delivery-notes`} className="label">
          Delivery notes
          <span className="hint">
            e.g. customer not home, installation pending
          </span>
        </label>
        <textarea
          id={`${uid}-delivery-notes`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="field resize-y"
        />
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Saving…" : "Mark as delivered"}
      </button>
    </form>
  );
}

function DeliveredPanel({
  enquiry,
  busy,
  send,
}: {
  enquiry: Enquiry;
  busy: boolean;
  send: Send;
}) {
  const uid = useId();
  const [balancePaid, setBalancePaid] = useState(enquiry.balancePaid);
  const [notes, setNotes] = useState(enquiry.deliveryNotes ?? "");
  const balance = balanceDue(enquiry);
  const dirty =
    balancePaid !== enquiry.balancePaid ||
    notes !== (enquiry.deliveryNotes ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(
          { balancePaid, deliveryNotes: notes.trim() || null },
          "Delivery details updated.",
        );
      }}
      className="card space-y-3 p-4"
    >
      <h2 className="text-sm font-bold tracking-wide text-bark-800 uppercase">
        Delivery
      </h2>
      <p className="text-sm text-bark-600">
        Delivered on{" "}
        <span className="font-semibold text-bark-900">
          {formatDate(enquiry.actualDeliveryDate)}
        </span>
      </p>
      <label className="flex items-center gap-3 rounded-xl border border-bark-200 px-3.5 py-3">
        <input
          type="checkbox"
          checked={balancePaid}
          onChange={(e) => setBalancePaid(e.target.checked)}
          className="h-5 w-5 accent-bark-700"
        />
        <span className="text-sm font-semibold text-bark-800">
          Balance of {formatMoney(balance)} received
        </span>
      </label>
      <div>
        <label htmlFor={`${uid}-delivery-notes`} className="label">Delivery notes</label>
        <textarea
          id={`${uid}-delivery-notes`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="field resize-y"
        />
      </div>
      {dirty && (
        <button type="submit" disabled={busy} className="btn-secondary w-full">
          {busy ? "Saving…" : "Save delivery details"}
        </button>
      )}
    </form>
  );
}
