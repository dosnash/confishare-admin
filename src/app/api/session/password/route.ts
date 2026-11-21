import { NextRequest, NextResponse } from "next/server";
import { adminApi, clearSession, extractToken, setSessionCookie, token, upstreamMessage } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const bearer = await token();
  if (!bearer) return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });
  let body: { currentPassword?: unknown; newPassword?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your current and new password." }, { status: 400 }); }
  if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string" || !body.currentPassword || !body.newPassword) {
    return NextResponse.json({ error: "Enter your current and new password." }, { status: 400 });
  }
  try {
    const upstream = await fetch(adminApi("auth/change-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({ currentPassword: body.currentPassword, newPassword: body.newPassword }),
      cache: "no-store",
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      // A wrong current password must not end the session; only a rejected token does.
      const message = upstreamMessage(result, upstream.status === 429 ? "Too many attempts. Try again later." : "Your password could not be changed.");
      if (upstream.status === 401 && /auth|token|session|sign/i.test(message) && !/current|password/i.test(message)) {
        await clearSession();
        return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });
      }
      return NextResponse.json({ error: message, field: (result as { field?: string }).field }, { status: upstream.status === 401 ? 400 : upstream.status });
    }
    // The API rotates the token on password change (other sessions are signed out).
    const fresh = extractToken(result);
    const response = NextResponse.json({ ok: true, message: upstreamMessage(result, "Password updated"), reauthenticate: !fresh });
    if (fresh) setSessionCookie(response, fresh);
    else response.cookies.delete("confishare_admin_session");
    return response;
  } catch {
    return NextResponse.json({ error: "The server could not be reached. Try again." }, { status: 502 });
  }
}
