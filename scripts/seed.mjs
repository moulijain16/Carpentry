#!/usr/bin/env node
/**
 * Fills the dashboard with realistic sample enquiries by driving the real API.
 * Start the app first, then:  npm run seed
 */
import { deflateSync } from "node:zlib";

const BASE = process.env.SEED_BASE_URL ?? "http://localhost:3100";
const USER = process.env.ADMIN_USERNAME ?? "gurpreet";
const PASS = process.env.SEED_PASSWORD ?? "workshop123";

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  // Local date, not UTC — otherwise the offsets slip by a day.
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const SAMPLES = [
  {
    customerName: "Harpreet Kaur",
    phone: "98765 43210",
    withPhoto: true,
    deliveryMode: "Delivery",
    address: "House 45, Model Town, Ludhiana 141002",
    installation: "yes",
    items: [
      {
        furnitureType: "Wardrobe",
        measurements: "6 feet wide, 8 feet tall",
        quantity: 2,
        woodFinish: "Sheesham, matte polish",
        specialRequirements: "Two extra shelves in each, mirror on one door",
      },
    ],
  },
  {
    customerName: "Rajinder Singh",
    phone: "99887 76655",
    deliveryMode: "Pickup",
    installation: "no",
    items: [
      {
        furnitureType: "Dining Table",
        measurements: "6 seater, about 5 feet long",
        quantity: 1,
        woodFinish: "Teak",
        specialRequirements: "",
      },
      {
        furnitureType: "Chair Set",
        measurements: "Standard height",
        quantity: 6,
        woodFinish: "Teak to match the table",
        specialRequirements: "Cushioned seats, dark brown",
      },
    ],
  },
  {
    customerName: "Simran Gill",
    phone: "90123 45678",
    deliveryMode: "Delivery",
    address: "Flat 302, Green Enclave, Jalandhar 144001",
    installation: "yes",
    items: [
      {
        furnitureType: "Kitchen Unit",
        measurements: "10 feet run along one wall, 3 feet high",
        quantity: 1,
        woodFinish: "Plywood with white laminate",
        specialRequirements: "Three deep drawers for utensils",
      },
    ],
  },
  {
    customerName: "Manjit Sandhu",
    phone: "98111 22334",
    deliveryMode: "Delivery",
    address: "Village Bhattian, near Gurudwara, Moga",
    installation: "no",
    items: [
      {
        furnitureType: "Bed",
        measurements: "King size, 6.5 x 6 feet with storage",
        quantity: 1,
        woodFinish: "Mango wood",
        specialRequirements: "Hydraulic storage below",
      },
    ],
  },
  {
    customerName: "Amrit Pal",
    phone: "97555 33221",
    deliveryMode: "Pickup",
    installation: "no",
    items: [
      {
        furnitureType: "Other",
        otherDescription: "Temple cabinet for the living room",
        measurements: "3 feet wide, 4 feet tall",
        quantity: 1,
        woodFinish: "Sheesham with carving",
        specialRequirements: "Small drawer at the bottom",
      },
    ],
  },
  {
    customerName: "Baljit Kaur",
    phone: "96000 11223",
    deliveryMode: "Delivery",
    address: "22 Civil Lines, Patiala 147001",
    installation: "yes",
    items: [
      {
        furnitureType: "TV Unit",
        measurements: "7 feet wide, wall mounted",
        quantity: 1,
        woodFinish: "Walnut finish",
        specialRequirements: "Cable holes at the back",
      },
    ],
  },
];

/** A plain wood-tone PNG standing in for a customer's reference photo. */
function placeholderPhoto(width = 480, height = 320) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const band = Math.sin(y / 9) * 12 + Math.sin(x / 60) * 6;
      raw[o++] = Math.max(0, Math.min(255, 161 + band));
      raw[o++] = Math.max(0, Math.min(255, 120 + band));
      raw[o++] = Math.max(0, Math.min(255, 63 + band));
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

async function post(sample) {
  const form = new FormData();
  form.set("customerName", sample.customerName);
  form.set("phone", sample.phone);
  form.set("deliveryMode", sample.deliveryMode);
  form.set("address", sample.address ?? "");
  form.set("installation", sample.installation);
  form.set("itemCount", String(sample.items.length));
  sample.items.forEach((item, i) => {
    form.set(`items.${i}.furnitureType`, item.furnitureType);
    form.set(`items.${i}.otherDescription`, item.otherDescription ?? "");
    form.set(`items.${i}.measurements`, item.measurements);
    form.set(`items.${i}.quantity`, String(item.quantity));
    form.set(`items.${i}.woodFinish`, item.woodFinish ?? "");
    form.set(`items.${i}.specialRequirements`, item.specialRequirements ?? "");
  });

  if (sample.withPhoto)
    form.set(
      "photo",
      new Blob([placeholderPhoto()], { type: "image/png" }),
      "reference.png",
    );

  const res = await fetch(`${BASE}/api/enquiries`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`);
  const { id } = await res.json();
  console.log(`  created #${id}  ${sample.customerName}`);
  return id;
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function patch(cookie, id, body, label) {
  const res = await fetch(`${BASE}/api/enquiries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${label} failed: ${res.status} ${await res.text()}`);
  console.log(`  #${id} → ${label}`);
}

console.log(`Seeding ${BASE} …`);
const ids = [];
for (const sample of SAMPLES) ids.push(await post(sample));

const cookie = await login();
const [harpreet, rajinder, simran, manjit, , baljit] = ids;

// Accepted, delivery promised in two days — shows up in the morning highlight.
await patch(cookie, harpreet, {
  status: "Accepted",
  estimatedPrice: 48000,
  advanceAmount: 15000,
  promisedDeliveryDate: day(2),
}, "Accepted");

// In progress and already overdue.
await patch(cookie, rajinder, {
  status: "Accepted",
  estimatedPrice: 62000,
  advanceAmount: 20000,
  promisedDeliveryDate: day(-1),
}, "Accepted");
await patch(cookie, rajinder, {
  status: "In Progress",
  workshopNotes: "Teak stock is short — Preet to check with the mill on Monday.",
}, "In Progress");

// Delivered and fully paid.
await patch(cookie, simran, {
  status: "Accepted",
  estimatedPrice: 85000,
  advanceAmount: 30000,
  promisedDeliveryDate: day(-12),
}, "Accepted");
await patch(cookie, simran, { status: "In Progress" }, "In Progress");
await patch(cookie, simran, {
  status: "Delivered",
  actualDeliveryDate: day(-10),
  balancePaid: true,
  deliveryNotes: "Fitted the same day. Customer happy.",
}, "Delivered");

// One rejected, one cancelled — both stay in the list.
await patch(cookie, manjit, { status: "Rejected" }, "Rejected");
await patch(cookie, baljit, { status: "Cancelled" }, "Cancelled");

console.log("\nDone. Sign in at /login as", USER);
