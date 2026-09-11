#!/usr/bin/env node
/**
 * Generates a PBKDF2 hash for the shared workshop password.
 *   npm run hash-password -- "my new password"
 * Copy the output into ADMIN_PASSWORD_HASH in .env.local.
 */
const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- "your password"');
  process.exit(1);
}

const b64url = (bytes) =>
  Buffer.from(bytes).toString("base64url");

const iterations = 210_000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password),
  "PBKDF2",
  false,
  ["deriveBits"],
);
const bits = await crypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
  key,
  256,
);

console.log(`pbkdf2$${iterations}$${b64url(salt)}$${b64url(new Uint8Array(bits))}`);
