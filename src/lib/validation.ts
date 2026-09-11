import { FURNITURE_TYPES } from "@/lib/domain";
import type { NewEnquiry } from "@/lib/enquiries";

export type FieldErrors = Record<string, string>;

export const MAX_ITEMS = 10;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const text = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";
const orNull = (v: string) => (v.length ? v : null);

/**
 * Parses the customer enquiry form. Returns field-level errors so the form can
 * "show the error right next to that field only".
 */
export async function parseEnquiryForm(
  form: FormData,
): Promise<{ data?: NewEnquiry; errors?: FieldErrors }> {
  const errors: FieldErrors = {};

  const customerName = text(form.get("customerName"));
  if (!customerName) errors.customerName = "Please enter your name.";
  else if (customerName.length > 100)
    errors.customerName = "Name is too long.";

  const phone = text(form.get("phone"));
  const digits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "Please enter your phone number.";
  else if (digits.length < 10 || digits.length > 15)
    errors.phone = "Please enter a valid phone number (at least 10 digits).";

  const deliveryModeRaw = text(form.get("deliveryMode"));
  const deliveryMode =
    deliveryModeRaw === "Delivery" || deliveryModeRaw === "Pickup"
      ? deliveryModeRaw
      : null;
  if (!deliveryMode)
    errors.deliveryMode = "Please choose delivery or pickup.";

  // "If they select delivery then ask for address, if they select pickup no need."
  const address = text(form.get("address"));
  if (deliveryMode === "Delivery" && !address)
    errors.address = "Please enter the delivery address.";

  const installationRaw = text(form.get("installation"));
  if (installationRaw !== "yes" && installationRaw !== "no")
    errors.installation = "Please tell us if you need installation.";

  // Items — "let them add multiple furniture items in one enquiry".
  const count = Math.min(Number(form.get("itemCount") ?? 1) || 1, MAX_ITEMS);
  const items: NewEnquiry["items"] = [];
  for (let i = 0; i < count; i++) {
    const furnitureType = text(form.get(`items.${i}.furnitureType`));
    const otherDescription = text(form.get(`items.${i}.otherDescription`));
    const measurements = text(form.get(`items.${i}.measurements`));
    const quantityRaw = text(form.get(`items.${i}.quantity`));
    const quantity = Number(quantityRaw || "1");

    if (!furnitureType)
      errors[`items.${i}.furnitureType`] = "Please choose a furniture type.";
    else if (!(FURNITURE_TYPES as readonly string[]).includes(furnitureType))
      errors[`items.${i}.furnitureType`] = "Please choose from the list.";

    if (furnitureType === "Other" && !otherDescription)
      errors[`items.${i}.otherDescription`] =
        "Please describe what you would like made.";

    if (!measurements)
      errors[`items.${i}.measurements`] =
        'Please give rough sizes, e.g. "6 feet wide, 8 feet tall".';

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
      errors[`items.${i}.quantity`] = "Quantity must be between 1 and 99.";

    items.push({
      furnitureType,
      otherDescription: furnitureType === "Other" ? orNull(otherDescription) : null,
      measurements,
      quantity: Number.isFinite(quantity) ? quantity : 1,
      woodFinish: orNull(text(form.get(`items.${i}.woodFinish`))),
      specialRequirements: orNull(
        text(form.get(`items.${i}.specialRequirements`)),
      ),
    });
  }
  if (!items.length) errors["items.0.furnitureType"] = "Please add one item.";

  // Optional single reference photo.
  let photo: NewEnquiry["photo"] = null;
  const file = form.get("photo");
  if (file && typeof file !== "string" && file.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type))
      errors.photo = "Please upload a JPG, PNG or WEBP image.";
    else if (file.size > MAX_PHOTO_BYTES)
      errors.photo = "Photo must be smaller than 5 MB.";
    else
      photo = {
        data: new Uint8Array(await file.arrayBuffer()),
        type: file.type,
      };
  }

  if (Object.keys(errors).length) return { errors };

  return {
    data: {
      customerName,
      phone,
      deliveryMode: deliveryMode!,
      address: deliveryMode === "Delivery" ? address : orNull(address),
      installation: installationRaw === "yes",
      photo,
      items,
    },
  };
}
