import { NextRequest, NextResponse } from "next/server";
import { adminApi, clearSession, token, upstreamMessage } from "@/lib/server-auth";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/**
 * Explicit allowlist of admin API endpoints the browser may reach through this proxy.
 * Sign-in, sign-out and change-password are handled by dedicated routes because they set or clear the session cookie.
 */
const rules: { method: Method; pattern: RegExp }[] = [
  { method: "GET", pattern: /^auth\/me$/ },
  { method: "PATCH", pattern: /^auth\/me$/ },
  { method: "GET", pattern: /^dashboard\/overview$/ },
  { method: "GET", pattern: /^users$/ },
  { method: "GET", pattern: /^users\/export$/ },
  { method: "GET", pattern: /^users\/[A-Za-z0-9_-]+$/ },
  { method: "GET", pattern: /^admins$/ },
  { method: "POST", pattern: /^admins$/ },
  { method: "PATCH", pattern: /^admins\/[A-Za-z0-9_-]+$/ },
  { method: "GET", pattern: /^audit-logs$/ },
  { method: "GET", pattern: /^document-audit-logs$/ },
];

/** Turns an upstream failure into a message that names the real cause instead of a generic one. */
function describe(status: number, detail: string) {
  if (status === 429) return "The server is receiving too many requests. Wait a minute, then refresh.";
  if (status === 502 || status === 503 || status === 504) return `The ConfiShare server is temporarily unavailable (${status}). Try again shortly.`;
  if (status >= 500) return `The ConfiShare server hit an error (${status})${detail ? `: ${detail}` : ""}. Try again shortly.`;
  return `The request failed (${status})${detail ? `: ${detail}` : ""}.`;
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }, method: Method) {
  const segments = (await context.params).path || [];
  if (segments.some(part => !part || part === "." || part === "..")) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const path = segments.join("/");
  if (!rules.some(rule => rule.method === method && rule.pattern.test(path))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const bearer = await token();
  if (!bearer) return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });

  const headers: Record<string, string> = { Authorization: `Bearer ${bearer}`, Accept: request.headers.get("accept") || "application/json" };
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;
  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers["User-Agent"] = userAgent;
  let body: string | undefined;
  if (method === "POST" || method === "PATCH") {
    body = await request.text();
    headers["Content-Type"] = "application/json";
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${adminApi(path)}${request.nextUrl.search}`, { method, headers, body, cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "The server could not be reached. Try again." }, { status: 502 });
  }

  if (upstream.status === 401) {
    await clearSession();
    return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });
  }

  const type = upstream.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    // Pass through file downloads (e.g. CSV export) untouched.
    if (upstream.ok) {
      const passthrough = new NextResponse(upstream.body, { status: upstream.status });
      for (const name of ["content-type", "content-disposition"]) {
        const value = upstream.headers.get(name);
        if (value) passthrough.headers.set(name, value);
      }
      return passthrough;
    }
    const text = (await upstream.text().catch(() => "")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
    return NextResponse.json({ error: describe(upstream.status, text) }, { status: upstream.status });
  }

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const fallback = upstream.status === 403 ? "You don't have permission to do that." : upstream.status === 404 ? "That record no longer exists." : describe(upstream.status, "");
    const message = upstream.status === 429 ? describe(429, "") : upstreamMessage(payload, fallback);
    return NextResponse.json({ error: message, field: (payload as { field?: string }).field }, { status: upstream.status });
  }
  return NextResponse.json(payload, { status: upstream.status });
}

type Context = { params: Promise<{ path: string[] }> };
export const GET = (request: NextRequest, context: Context) => forward(request, context, "GET");
export const POST = (request: NextRequest, context: Context) => forward(request, context, "POST");
export const PATCH = (request: NextRequest, context: Context) => forward(request, context, "PATCH");
export const DELETE = (request: NextRequest, context: Context) => forward(request, context, "DELETE");
