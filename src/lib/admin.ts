export type AdminUser = {
  _id: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  accountType?: string;
  role?: string;
  companyId?: string | null;
  isVerified?: boolean;
  emailVerifiedAt?: string | null;
  createdAt?: string;
  subscription?: {
    status?: string;
    subscriptionPlan?: string | null;
    trialEndDate?: string | null;
    subscriptionExpiresAt?: string | null;
  } | null;
  usage?: { shareCount?: number; storageBytes?: number } | null;
};

/**
 * Effective subscription states shown in the admin. TRIAL_ENDED and NONE are not
 * backend values: a lapsed trial keeps status TRIAL on the server, so it is derived
 * from `trialEndDate`, and NONE marks users without any status.
 */
export const statuses = ["TRIAL", "TRIAL_ENDED", "ACTIVE", "PAST_DUE", "EXPIRED", "CANCELLED", "NONE"] as const;
export type EffectiveStatus = (typeof statuses)[number] | "OTHER";
export type StatusFilter = "ALL" | (typeof statuses)[number];
export const statusLabel: Record<string, string> = {
  TRIAL: "Trial", TRIAL_ENDED: "Trial ended", ACTIVE: "Active", PAST_DUE: "Past due", EXPIRED: "Expired", CANCELLED: "Cancelled", NONE: "No status",
};

const backendStatuses = new Set(["TRIAL", "ACTIVE", "PAST_DUE", "EXPIRED", "CANCELLED"]);

/** The raw status the backend stored, uppercased, or "" when absent. */
export function rawStatus(user: AdminUser) {
  const value = user.subscription?.status;
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

/**
 * What the subscription really is right now, mirroring the customer app's rules:
 * a TRIAL whose `trialEndDate` has passed has ended (uploads are blocked), and every
 * other backend status is authoritative as stored.
 */
export function effectiveStatus(user: AdminUser, now: number = Date.now()): EffectiveStatus {
  const status = rawStatus(user);
  if (!status) return "NONE";
  if (!backendStatuses.has(status)) return "OTHER";
  if (status === "TRIAL") {
    const end = validDate(user.subscription?.trialEndDate);
    if (end && end.getTime() <= now) return "TRIAL_ENDED";
  }
  return status as EffectiveStatus;
}

/** ACTIVE past its period end: renewals run nightly, so access continues until the renewal attempt. */
export function renewalDue(user: AdminUser, now: number = Date.now()) {
  if (rawStatus(user) !== "ACTIVE") return false;
  const expiry = validDate(user.subscription?.subscriptionExpiresAt);
  return !!expiry && expiry.getTime() <= now;
}

export function effectiveStatusLabel(user: AdminUser, now: number = Date.now()) {
  const status = effectiveStatus(user, now);
  if (status === "OTHER") return rawStatus(user);
  return statusLabel[status] + (renewalDue(user, now) ? " (renewal due)" : "");
}

export function displayName(user: AdminUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.companyName || "-";
}

export function validDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value?: string | null) {
  const date = validDate(value);
  return date ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date) : "-";
}

export function formatStorage(bytes?: number | null) {
  const mb = Math.max(0, Number(bytes) || 0) / 1048576;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

export function companyFor(user: AdminUser, users: AdminUser[]) {
  return users.find((candidate) => candidate._id === user.companyId && candidate.accountType === "company")?.companyName || "-";
}

export function csvFor(users: AdminUser[], allUsers: AdminUser[]) {
  const headers = ["Name", "Email", "Account type", "Role", "Company", "Plan", "Subscription status", "Stored status", "Email verified", "Documents shared", "Storage used (MB)", "Registered at", "Trial ends", "Subscription expires"];
  const safeCell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = users.map((u) => [
    displayName(u), u.email, u.accountType || "-", u.role === "TEAM_MEMBER" ? "Team member" : "Owner",
    companyFor(u, allUsers), u.subscription?.subscriptionPlan || "No paid plan", effectiveStatusLabel(u), rawStatus(u) || "-",
    u.isVerified ? "Yes" : "No", u.usage?.shareCount || 0, ((u.usage?.storageBytes || 0) / 1048576).toFixed(2),
    validDate(u.createdAt)?.toISOString() || "", validDate(u.subscription?.trialEndDate)?.toISOString() || "", validDate(u.subscription?.subscriptionExpiresAt)?.toISOString() || "",
  ]);
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(safeCell).join(",")).join("\r\n");
}

export function normalizeUsers(payload: unknown): AdminUser[] {
  if (!payload || typeof payload !== "object") throw new Error("The users response was not valid.");
  const body = payload as Record<string, unknown>;
  const data = body.data && typeof body.data === "object" ? body.data as Record<string, unknown> : null;
  const raw = body.users ?? (Array.isArray(body.data) ? body.data : data?.users ?? data?.items);
  if (!Array.isArray(raw)) throw new Error("The API returned an unexpected users format.");
  return raw.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`User ${index + 1} was invalid.`);
    const user = item as AdminUser;
    const id = user._id || user.id;
    if (!id || typeof user.email !== "string") throw new Error(`User ${index + 1} was missing an ID or email.`);
    return { ...user, _id: String(id) };
  });
}
