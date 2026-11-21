import { NextRequest, NextResponse } from "next/server";
import { adminApi, clearSession, extractToken, setSessionCookie, token, upstreamMessage } from "@/lib/server-auth";
import { normalizeAdmin } from "@/lib/admins";

function clientHeaders(request: NextRequest) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;
  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers["User-Agent"] = userAgent;
  return headers;
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your email and password." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  try {
    const upstream = await fetch(adminApi("auth/login"), { method: "POST", headers: clientHeaders(request), body: JSON.stringify({ email, password }), cache: "no-store" });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const fallback = upstream.status === 401 ? "The email or password was not recognized."
        : upstream.status === 403 ? "This admin account is deactivated. Contact a super admin."
        : upstream.status === 429 ? "Too many sign-in attempts. Wait a few minutes and try again."
        : "Sign in failed. Try again.";
      const message = upstream.status === 429 ? fallback : upstreamMessage(result, fallback);
      return NextResponse.json({ error: message }, { status: upstream.status });
    }
    const authToken = extractToken(result);
    const admin = normalizeAdmin(result);
    if (!authToken) return NextResponse.json({ error: "The sign-in response was incomplete. Try again." }, { status: 502 });
    const response = NextResponse.json({ admin });
    setSessionCookie(response, authToken);
    return response;
  } catch {
    return NextResponse.json({ error: "The server could not be reached. Try again." }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const bearer = await token();
  if (bearer) {
    // Best effort: revoke the token upstream, but always clear the local session.
    await fetch(adminApi("auth/logout"), { method: "POST", headers: { ...clientHeaders(request), Authorization: `Bearer ${bearer}` }, cache: "no-store" }).catch(() => undefined);
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
