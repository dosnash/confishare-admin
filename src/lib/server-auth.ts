import { cookies } from "next/headers";

export const sessionCookie = "confishare_admin_session";

export function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || "https://server.confishare.io/api/v1").replace(/\/+$/, "");
}

export function adminClaim(user: unknown) {
  const path = process.env.ADMIN_CLAIM_PATH?.trim();
  if (!path || !user || typeof user !== "object") return false;
  if (path === "role" || path === "accountType" || path === "isOwner") return false;
  return path.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, user) === true;
}

export async function token() {
  return (await cookies()).get(sessionCookie)?.value;
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(sessionCookie);
}
