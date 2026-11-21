import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const sessionCookie = "confishare_admin_session";
const sessionMaxAge = 60 * 60 * 8;

export function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "https://server.confishare.io/api/v1").replace(/\/+$/, "");
}

/** Base URL for the dedicated admin API namespace (`/api/v1/admin`). */
export function adminApi(path = "") {
  return `${apiBase()}/admin${path ? `/${path.replace(/^\/+/, "")}` : ""}`;
}

export async function token() {
  return (await cookies()).get(sessionCookie)?.value;
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(sessionCookie);
}

export function setSessionCookie(response: NextResponse, value: string) {
  response.cookies.set(sessionCookie, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  });
}

/** Pulls a bearer token out of the shapes the API may use for login / change-password responses. */
export function extractToken(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const body = payload as Record<string, unknown>;
  const candidates = [body, body.data].filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  for (const source of candidates) {
    for (const key of ["token", "accessToken", "access_token", "adminToken"]) {
      const value = source[key];
      if (typeof value === "string" && value) return value;
      if (value && typeof value === "object") {
        const nested = value as Record<string, unknown>;
        const inner = nested.token ?? nested.accessToken ?? nested.access_token;
        if (typeof inner === "string" && inner) return inner;
      }
    }
  }
  return undefined;
}

/** Reads the upstream error message in the `{ success:false, message }` envelope. */
export function upstreamMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (typeof body.message === "string" && body.message) return body.message;
    if (typeof body.error === "string" && body.error) return body.error;
  }
  return fallback;
}
