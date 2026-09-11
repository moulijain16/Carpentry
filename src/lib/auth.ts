/**
 * Single shared workshop login. "One login is enough for now. Me and my boys
 * will share it" — plus "the login should be secure, I don't want random
 * people opening my order list."
 *
 * Session = HMAC-SHA256 signed cookie, verified with Web Crypto so the same
 * code runs in middleware and in route handlers.
 */
import fs from "node:fs";
import path from "node:path";

export const SESSION_COOKIE = "workshop_session";
const SESSION_HOURS = 12;

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(text: string): Uint8Array<ArrayBuffer> {
  const pad = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function sessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production")
    throw new Error("SESSION_SECRET must be set in production.");
  // Dev convenience: a stable random secret so logins survive a restart.
  const file = path.join(process.cwd(), "data", ".session-secret");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

async function signingKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(username: string): Promise<string> {
  const payload = b64url(
    encoder.encode(
      JSON.stringify({
        u: username,
        exp: Date.now() + SESSION_HOURS * 3600_000,
      }),
    ),
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    encoder.encode(payload),
  );
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<{ username: string } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      fromB64url(sig),
      encoder.encode(payload),
    );
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { username: String(data.u) };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_HOURS * 3600,
};

/* ---------------------------------------------------------------- password */

async function pbkdf2(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const iterations = 210_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${b64url(salt)}$${b64url(hash)}`;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function checkCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME ?? "gurpreet";
  const stored = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD ?? "workshop123";

  let passwordOk: boolean;
  if (stored?.startsWith("pbkdf2$")) {
    const [, iterations, salt, hash] = stored.split("$");
    const derived = await pbkdf2(
      password,
      fromB64url(salt),
      Number(iterations),
    );
    passwordOk = timingSafeEqual(derived, fromB64url(hash));
  } else {
    passwordOk = timingSafeEqual(
      encoder.encode(password),
      encoder.encode(plain),
    );
  }
  // Compare both so a wrong username costs the same time as a wrong password.
  const userOk = timingSafeEqual(
    encoder.encode(username.trim().toLowerCase()),
    encoder.encode(expectedUser.toLowerCase()),
  );
  return userOk && passwordOk;
}

/* ------------------------------------------------------------ rate limiting */

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 5 * 60_000;

export function loginBlockedFor(ip: string): number {
  const entry = attempts.get(ip);
  if (!entry || entry.until < Date.now()) return 0;
  if (entry.count < MAX_ATTEMPTS) return 0;
  return Math.ceil((entry.until - Date.now()) / 1000);
}

export function recordFailedLogin(ip: string): void {
  const entry = attempts.get(ip);
  if (!entry || entry.until < Date.now())
    attempts.set(ip, { count: 1, until: Date.now() + LOCKOUT_MS });
  else attempts.set(ip, { count: entry.count + 1, until: entry.until });
}

export function clearLoginAttempts(ip: string): void {
  attempts.delete(ip);
}
