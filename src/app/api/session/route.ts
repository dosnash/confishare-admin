import { NextRequest, NextResponse } from "next/server";
import { adminClaim, apiBase, clearSession, sessionCookie } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your email and password." }, { status: 400 }); }
  if (!body.email || !body.password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  try {
    const upstream = await fetch(`${apiBase()}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: body.email, password: body.password }), cache: "no-store" });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return NextResponse.json({ error: upstream.status === 401 ? "The email or password was not recognized." : result.message || "Sign in failed. Try again." }, { status: upstream.status });
    const rawToken = result.token;
    const authToken = typeof rawToken === "string" ? rawToken : rawToken?.token || rawToken?.accessToken || rawToken?.access_token;
    if (!authToken || !result.user) return NextResponse.json({ error: "The sign-in response was incomplete." }, { status: 502 });
    if (!adminClaim(result.user)) return NextResponse.json({ error: "This account does not have admin access. Confirm the backend admin claim configuration." }, { status: 403 });
    const response = NextResponse.json({ user: { id: result.user.id || result.user._id, email: result.user.email, firstName: result.user.firstName, lastName: result.user.lastName } });
    const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 };
    response.cookies.set(sessionCookie, authToken, options);
    return response;
  } catch { return NextResponse.json({ error: "The server could not be reached. Try again." }, { status: 502 }); }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
