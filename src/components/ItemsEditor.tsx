"use client";

import { useId } from "react";

import { FURNITURE_TYPES, type EnquiryItem } from "@/lib/domain";
import { MAX_ITEMS } from "@/lib/validation";

export type ItemDraft = Omit<EnquiryItem, "id"> & { key: number };

let nextKey = 1000;

export function toDraft(item: EnquiryItem): ItemDraft {
  return { ...item, key: nextKey++ };
}

export function blankDraft(): ItemDraft {
  return {
    key: nextKey++,
    furnitureType: "",
    otherDescription: null,
    measurements: "",
    quantity: 1,
    woodFinish: null,
    specialRequirements: null,
  };
}

/** Admin-side item editing — "sometimes the customer calls and changes the size". */
export default function ItemsEditor({
  items,
  onChange,
}: {
  items: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
}) {
  const uid = useId();
  const patch = (key: number, changes: Partial<ItemDraft>) =>
    onChange(items.map((i) => (i.key === key ? { ...i, ...changes } : i)));

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <fieldset
          key={item.key}
          className="rounded-xl border border-bark-200 bg-bark-50/60 p-3"
        >
          <legend className="flex w-full items-center justify-between gap-3 px-1">
            <span className="text-xs font-bold text-bark-600">
              Item {index + 1}
            </span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i.key !== item.key))}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </legend>

          <div className="mt-2 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label htmlFor={`${uid}-${index}-furniture-type`} className="label text-xs">Furniture type</label>
                <select
                  id={`${uid}-${index}-furniture-type`}
                  value={item.furnitureType}
                  onChange={(e) =>
                    patch(item.key, { furnitureType: e.target.value })
                  }
                  className="field py-2.5 text-sm"
                >
                  <option value="">Choose…</option>
                  {FURNITURE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-${index}-qty`} className="label text-xs">Qty</label>
                <input
                  id={`${uid}-${index}-qty`}
                  type="number"
                  min={1}
                  max={99}
                  inputMode="numeric"
                  value={item.quantity}
                  onChange={(e) =>
                    patch(item.key, { quantity: Number(e.target.value) })
                  }
                  className="field py-2.5 text-sm"
                />
              </div>
            </div>

            {item.furnitureType === "Other" && (
              <div>
                <label htmlFor={`${uid}-${index}-describe-the-piece`} className="label text-xs">Describe the piece</label>
                <input
                  id={`${uid}-${index}-describe-the-piece`}
                  type="text"
                  value={item.otherDescription ?? ""}
                  onChange={(e) =>
                    patch(item.key, { otherDescription: e.target.value })
                  }
                  className="field py-2.5 text-sm"
                />
              </div>
            )}

            <div>
              <label htmlFor={`${uid}-${index}-measurements`} className="label text-xs">Measurements</label>
              <textarea
                id={`${uid}-${index}-measurements`}
                rows={2}
                value={item.measurements}
                onChange={(e) =>
                  patch(item.key, { measurements: e.target.value })
                }
                className="field resize-y py-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor={`${uid}-${index}-wood-finish`} className="label text-xs">Wood / finish</label>
              <input
                id={`${uid}-${index}-wood-finish`}
                type="text"
                value={item.woodFinish ?? ""}
                onChange={(e) => patch(item.key, { woodFinish: e.target.value })}
                className="field py-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor={`${uid}-${index}-special-requirements`} className="label text-xs">Special requirements</label>
              <textarea
                id={`${uid}-${index}-special-requirements`}
                rows={2}
                value={item.specialRequirements ?? ""}
                onChange={(e) =>
                  patch(item.key, { specialRequirements: e.target.value })
                }
                className="field resize-y py-2.5 text-sm"
              />
            </div>
          </div>
        </fieldset>
      ))}

      {items.length < MAX_ITEMS && (
        <button
          type="button"
          onClick={() => onChange([...items, blankDraft()])}
          className="btn-secondary btn-sm w-full border-dashed"
        >
          + Add another item
        </button>
      )}
    </div>
  );
}
