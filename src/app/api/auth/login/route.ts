import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  checkCredentials,
  clearLoginAttempts,
  createSessionToken,
  loginBlockedFor,
  recordFailedLogin,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";

  const blockedFor = loginBlockedFor(ip);
  if (blockedFor > 0)
    return NextResponse.json(
      {
        error: `Too many attempts. Please try again in ${Math.ceil(blockedFor / 60)} minute(s).`,
      },
      { status: 429 },
    );

  let username = "";
  let password = "";
  try {
    const body = await request.json();
    username = String(body.username ?? "");
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!username || !password)
    return NextResponse.json(
      { error: "Please enter both username and password." },
      { status: 400 },
    );

  if (!(await checkCredentials(username, password))) {
    recordFailedLogin(ip);
    // "Just show an error message on the same login page."
    return NextResponse.json(
      { error: "Wrong username or password. Please try again." },
      { status: 401 },
    );
  }

  clearLoginAttempts(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken(username.trim().toLowerCase()),
    sessionCookieOptions,
  );
  return response;
}
