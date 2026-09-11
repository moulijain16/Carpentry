"use client";

import { useId, useRef, useState } from "react";
import { FURNITURE_TYPES } from "@/lib/domain";
import { MAX_ITEMS, MAX_PHOTO_BYTES, type FieldErrors } from "@/lib/validation";

type ItemDraft = {
  key: number;
  furnitureType: string;
  otherDescription: string;
  measurements: string;
  quantity: string;
  woodFinish: string;
  specialRequirements: string;
};

let nextKey = 1;
const blankItem = (): ItemDraft => ({
  key: nextKey++,
  furnitureType: "",
  otherDescription: "",
  measurements: "",
  quantity: "1",
  woodFinish: "",
  specialRequirements: "",
});

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="error-text" role="alert">
      <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5a1 1 0 012 0v5a1 1 0 11-2 0V5zm1 10a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 15z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </p>
  );
}

export default function EnquiryForm() {
  const [items, setItems] = useState<ItemDraft[]>([blankItem()]);
  const [deliveryMode, setDeliveryMode] = useState("");
  const [installation, setInstallation] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Stable across server render and hydration, unlike the list keys.
  const uid = useId();

  function patchItem(key: number, patch: Partial<ItemDraft>) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});

    const form = new FormData(event.currentTarget);
    form.set("itemCount", String(items.length));

    try {
      const res = await fetch("/api/enquiries", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmittedId(data.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (res.status === 422 && data.errors) {
        setErrors(data.errors);
        const first = document.querySelector<HTMLElement>("[data-invalid='true']");
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        first?.focus?.();
      } else {
        setErrors({
          form: data.error ?? "Something went wrong. Please try again.",
        });
      }
    } catch {
      setErrors({
        form: "Could not reach the workshop. Please check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setSubmittedId(null);
    setItems([blankItem()]);
    setDeliveryMode("");
    setInstallation("");
    setPhotoName(null);
    setErrors({});
    formRef.current?.reset();
  }

  // "Just a simple message saying we received your enquiry and will get back to you."
  if (submittedId !== null) {
    return (
      <div className="card p-6 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-emerald-600">
            <path
              d="m5 13 4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mt-5 text-2xl font-bold text-bark-900">
          Enquiry received
        </h2>
        <p className="mx-auto mt-2 max-w-md text-bark-600">
          Thank you — we have your enquiry and will contact you soon to discuss
          the details.
        </p>
        <p className="mt-5 inline-block rounded-xl bg-bark-100 px-4 py-2 text-sm text-bark-700">
          Your enquiry number is{" "}
          <span className="font-bold text-bark-900">#{submittedId}</span> — keep
          it handy when you call.
        </p>
        <div className="mt-6">
          <button type="button" onClick={startOver} className="btn-secondary">
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.form && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errors.form}
        </div>
      )}

      {/* -------------------------------------------------------- contact */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-bark-900">Your details</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="customerName" className="label">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              id="customerName"
              name="customerName"
              type="text"
              autoComplete="name"
              data-invalid={Boolean(errors.customerName)}
              className={`field ${errors.customerName ? "field-error" : ""}`}
              placeholder="e.g. Harpreet Singh"
            />
            <FieldError message={errors.customerName} />
          </div>

          <div>
            <label htmlFor="phone" className="label">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              data-invalid={Boolean(errors.phone)}
              className={`field ${errors.phone ? "field-error" : ""}`}
              placeholder="e.g. 98765 43210"
            />
            <FieldError message={errors.phone} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- items */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-bark-900">
          What would you like made?
        </h2>
        <p className="mt-1 text-sm text-bark-500">
          Add as many pieces as you need — each one can have its own size and
          requirements.
        </p>

        <div className="mt-4 space-y-4">
          {items.map((item, index) => (
            <fieldset
              key={item.key}
              className="rounded-xl border border-bark-200 bg-bark-50/60 p-4"
            >
              <legend className="flex w-full items-center justify-between gap-3 px-1">
                <span className="text-sm font-bold text-bark-700">
                  Item {index + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((i) => i.key !== item.key))
                    }
                    className="text-sm font-semibold text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </legend>

              <div className="mt-3 space-y-4">
                <div>
                  <label htmlFor={`type-${uid}-${index}`} className="label">
                    Furniture type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={`type-${uid}-${index}`}
                    name={`items.${index}.furnitureType`}
                    value={item.furnitureType}
                    onChange={(e) =>
                      patchItem(item.key, { furnitureType: e.target.value })
                    }
                    data-invalid={Boolean(errors[`items.${index}.furnitureType`])}
                    className={`field ${errors[`items.${index}.furnitureType`] ? "field-error" : ""}`}
                  >
                    <option value="">Choose…</option>
                    {FURNITURE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors[`items.${index}.furnitureType`]} />
                </div>

                {/* "If they select Other let them type what they want." */}
                {item.furnitureType === "Other" && (
                  <div>
                    <label htmlFor={`other-${uid}-${index}`} className="label">
                      Tell us what you need{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`other-${uid}-${index}`}
                      name={`items.${index}.otherDescription`}
                      type="text"
                      value={item.otherDescription}
                      onChange={(e) =>
                        patchItem(item.key, { otherDescription: e.target.value })
                      }
                      data-invalid={Boolean(
                        errors[`items.${index}.otherDescription`],
                      )}
                      className={`field ${errors[`items.${index}.otherDescription`] ? "field-error" : ""}`}
                      placeholder="e.g. TV unit, temple cabinet, shoe rack"
                    />
                    <FieldError
                      message={errors[`items.${index}.otherDescription`]}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor={`size-${uid}-${index}`} className="label">
                    Rough measurements <span className="text-red-500">*</span>
                    <span className="hint">
                      Exact numbers are not needed — write what you know.
                    </span>
                  </label>
                  <textarea
                    id={`size-${uid}-${index}`}
                    name={`items.${index}.measurements`}
                    rows={2}
                    value={item.measurements}
                    onChange={(e) =>
                      patchItem(item.key, { measurements: e.target.value })
                    }
                    data-invalid={Boolean(errors[`items.${index}.measurements`])}
                    className={`field resize-y ${errors[`items.${index}.measurements`] ? "field-error" : ""}`}
                    placeholder='e.g. "6 feet wide, 8 feet tall"'
                  />
                  <FieldError message={errors[`items.${index}.measurements`]} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`qty-${uid}-${index}`} className="label">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`qty-${uid}-${index}`}
                      name={`items.${index}.quantity`}
                      type="number"
                      min={1}
                      max={99}
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) =>
                        patchItem(item.key, { quantity: e.target.value })
                      }
                      data-invalid={Boolean(errors[`items.${index}.quantity`])}
                      className={`field ${errors[`items.${index}.quantity`] ? "field-error" : ""}`}
                    />
                    <FieldError message={errors[`items.${index}.quantity`]} />
                  </div>

                  <div>
                    <label htmlFor={`wood-${uid}-${index}`} className="label">
                      Wood or finish{" "}
                      <span className="font-normal text-bark-400">
                        (optional)
                      </span>
                    </label>
                    <input
                      id={`wood-${uid}-${index}`}
                      name={`items.${index}.woodFinish`}
                      type="text"
                      value={item.woodFinish}
                      onChange={(e) =>
                        patchItem(item.key, { woodFinish: e.target.value })
                      }
                      className="field"
                      placeholder="e.g. Sheesham, matte polish"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={`extra-${uid}-${index}`} className="label">
                    Special requirements{" "}
                    <span className="font-normal text-bark-400">(optional)</span>
                    <span className="hint">
                      Colours, extra shelves, drawers, anything else.
                    </span>
                  </label>
                  <textarea
                    id={`extra-${uid}-${index}`}
                    name={`items.${index}.specialRequirements`}
                    rows={2}
                    value={item.specialRequirements}
                    onChange={(e) =>
                      patchItem(item.key, {
                        specialRequirements: e.target.value,
                      })
                    }
                    className="field resize-y"
                    placeholder="e.g. two extra shelves, dark walnut colour"
                  />
                </div>
              </div>
            </fieldset>
          ))}
        </div>

        {items.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, blankItem()])}
            className="btn-secondary mt-4 w-full border-dashed"
          >
            <span className="text-xl leading-none">+</span> Add another item
          </button>
        )}
      </section>

      {/* ------------------------------------------------------- delivery */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-bark-900">Delivery</h2>

        <div className="mt-4 space-y-4">
          <div>
            <span className="label">
              How would you like to receive it?{" "}
              <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "Delivery", label: "Home delivery", icon: "🚚" },
                { value: "Pickup", label: "I'll pick it up", icon: "🏬" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-3 py-4 text-center transition ${
                    deliveryMode === option.value
                      ? "border-bark-600 bg-bark-100 ring-2 ring-bark-500/20"
                      : "border-bark-200 bg-white hover:border-bark-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryMode"
                    value={option.value}
                    checked={deliveryMode === option.value}
                    onChange={(e) => setDeliveryMode(e.target.value)}
                    className="sr-only"
                  />
                  <span aria-hidden className="text-2xl">
                    {option.icon}
                  </span>
                  <span className="text-sm font-semibold text-bark-800">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            <FieldError message={errors.deliveryMode} />
          </div>

          {/* Address is only asked for when it is actually needed. */}
          {deliveryMode === "Delivery" && (
            <div>
              <label htmlFor="address" className="label">
                Delivery address <span className="text-red-500">*</span>
                <span className="hint">
                  Also used if a measurement visit is needed.
                </span>
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                autoComplete="street-address"
                data-invalid={Boolean(errors.address)}
                className={`field resize-y ${errors.address ? "field-error" : ""}`}
                placeholder="House / street, area, city, pin code"
              />
              <FieldError message={errors.address} />
            </div>
          )}

          <div>
            <span className="label">
              Do you need it fitted at your place?{" "}
              <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "yes", label: "Yes, install it" },
                { value: "no", label: "No, thanks" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border-2 px-3 py-3.5 text-center transition ${
                    installation === option.value
                      ? "border-bark-600 bg-bark-100 ring-2 ring-bark-500/20"
                      : "border-bark-200 bg-white hover:border-bark-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="installation"
                    value={option.value}
                    checked={installation === option.value}
                    onChange={(e) => setInstallation(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold text-bark-800">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            <FieldError message={errors.installation} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- photo */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-bark-900">
          Reference photo{" "}
          <span className="text-base font-normal text-bark-400">(optional)</span>
        </h2>
        <p className="mt-1 text-sm text-bark-500">
          Seen something you like? Add one photo — it helps a lot.
        </p>

        <label
          htmlFor="photo"
          className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-bark-300 bg-bark-50 px-4 py-4 hover:border-bark-400"
        >
          <span aria-hidden className="text-2xl">
            📷
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-bark-800">
              {photoName ?? "Choose a photo"}
            </span>
            <span className="block text-xs text-bark-500">
              JPG, PNG or WEBP, up to {Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB
            </span>
          </span>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
            className="sr-only"
          />
        </label>
        <FieldError message={errors.photo} />
      </section>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Sending…" : "Send enquiry"}
      </button>
      <p className="pb-2 text-center text-xs text-bark-500">
        We will call you back on the number you provide.
      </p>
    </form>
  );
}
