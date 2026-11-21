export const adminRoles = ["SUPER_ADMIN", "ADMIN"] as const;
export type AdminRole = (typeof adminRoles)[number];
export const roleLabel: Record<string, string> = { SUPER_ADMIN: "Super admin", ADMIN: "Admin" };

export type Admin = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string | null;
  profilePic?: string | null;
  role: AdminRole | string;
  isActive?: boolean;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuditLog = {
  _id: string;
  action: string;
  outcome: string;
  reason?: string | null;
  actor?: { adminId?: string | null; name?: string | null; email?: string | null; role?: string | null } | null;
  target?: { type?: string | null; id?: string | null; label?: string | null } | null;
  context?: { ip?: string | null; userAgent?: string | null } | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

export type DocumentAuditLog = {
  _id: string;
  ownerId?: string | null;
  action: string;
  outcome: string;
  reason?: string | null;
  actor?: { userId?: string | null; name?: string | null; email?: string | null } | null;
  resource?: { type?: string | null; id?: string | null; name?: string | null } | null;
  context?: { ip?: string | null; userAgent?: string | null; deviceId?: string | null } | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

export type Page<T> = { items: T[]; total: number; page: number; limit: number };

const record = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

function looksLikeAdmin(value: unknown): value is Record<string, unknown> {
  const item = record(value);
  return !!item && typeof item.email === "string" && (typeof item._id === "string" || typeof item.id === "string");
}

function toAdmin(value: Record<string, unknown>): Admin {
  return { ...(value as unknown as Admin), _id: String(value._id ?? value.id), role: typeof value.role === "string" ? value.role : "ADMIN" };
}

/** Finds the admin record in `{ data: admin }`, `{ data: { admin } }`, `{ admin }` or a bare admin. */
export function normalizeAdmin(payload: unknown): Admin | null {
  const body = record(payload);
  if (!body) return null;
  const data = record(body.data);
  const candidates = [data?.admin, data?.user, body.admin, body.user, body.data, body];
  const found = candidates.find(looksLikeAdmin);
  return found ? toAdmin(found) : null;
}

/** Normalizes list responses: `{ data: { items, total, page, limit } }`, `{ data: [...] }`, `{ data: { admins } }`, etc. */
export function normalizePage<T extends { _id: string }>(payload: unknown, keys: string[] = []): Page<T> {
  const body = record(payload);
  if (!body) throw new Error("The response was not valid.");
  const data = record(body.data);
  const source = data ?? body;
  let items: unknown = Array.isArray(body.data) ? body.data : undefined;
  for (const key of ["items", ...keys, "results", "docs"]) {
    if (items !== undefined) break;
    if (Array.isArray(source[key])) items = source[key];
    else if (Array.isArray(body[key])) items = body[key];
  }
  if (!Array.isArray(items)) throw new Error("The API returned an unexpected list format.");
  const list = items.map((item, index) => {
    const row = record(item);
    const id = row?._id ?? row?.id;
    if (!row || id === undefined || id === null) throw new Error(`Row ${index + 1} was missing an ID.`);
    return { ...row, _id: String(id) } as unknown as T;
  });
  const meta = record(source.pagination) ?? record(source.meta) ?? source;
  const num = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return {
    items: list,
    total: num(meta.total ?? meta.totalCount ?? meta.count, list.length),
    page: num(meta.page ?? meta.currentPage, 1),
    limit: num(meta.limit ?? meta.pageSize ?? meta.perPage, list.length || 20),
  };
}

export function adminName(admin: Pick<Admin, "firstName" | "lastName" | "email">) {
  return [admin.firstName, admin.lastName].filter(Boolean).join(" ").trim() || admin.email;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "A";
}

/** `admin.login` → `Admin login`, `document.activated` → `Document activated`. */
export function actionLabel(action: string) {
  const text = action.replace(/[._-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().toLowerCase();
  return text ? text[0].toUpperCase() + text.slice(1) : action;
}

export function reasonLabel(reason?: string | null) {
  if (!reason) return "";
  const text = reason.replace(/_/g, " ").toLowerCase();
  return text[0].toUpperCase() + text.slice(1);
}

export function relativeTime(value?: string | null, now = Date.now()) {
  if (!value) return "Never";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "-";
  const seconds = Math.round((now - time) / 1000);
  if (seconds < 45) return "Just now";
  const units: [number, Intl.RelativeTimeFormatUnit][] = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.345, "week"], [12, "month"], [Infinity, "year"]];
  let amount = seconds;
  for (const [step, unit] of units) {
    if (Math.abs(amount) < step) return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-Math.round(amount), unit);
    amount /= step;
  }
  return "-";
}

/** Password policy for new admins and password changes. Mirrors common backend rules; the API is authoritative. */
export function passwordIssues(password: string) {
  const issues: string[] = [];
  if (password.length < 8) issues.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) issues.push("An uppercase letter");
  if (!/[a-z]/.test(password)) issues.push("A lowercase letter");
  if (!/\d/.test(password)) issues.push("A number");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("A symbol");
  return issues;
}
