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

export const statuses = ["TRIAL", "ACTIVE", "PAST_DUE", "EXPIRED", "CANCELLED"] as const;
export type StatusFilter = "ALL" | (typeof statuses)[number];
export const statusLabel: Record<string, string> = {
  TRIAL: "Trial", ACTIVE: "Active", PAST_DUE: "Past due", EXPIRED: "Expired", CANCELLED: "Cancelled",
};

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
  const headers = ["Name", "Email", "Account type", "Role", "Company", "Plan", "Subscription status", "Email verified", "Documents shared", "Storage used (MB)", "Registered at", "Trial ends", "Subscription expires"];
  const safeCell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = users.map((u) => [
    displayName(u), u.email, u.accountType || "-", u.role === "TEAM_MEMBER" ? "Team member" : "Owner",
    companyFor(u, allUsers), u.subscription?.subscriptionPlan || "No paid plan", statusLabel[u.subscription?.status || "TRIAL"] || u.subscription?.status || "Trial",
    u.isVerified ? "Yes" : "No", u.usage?.shareCount || 0, ((u.usage?.storageBytes || 0) / 1048576).toFixed(2),
    validDate(u.createdAt)?.toISOString() || "", validDate(u.subscription?.trialEndDate)?.toISOString() || "", validDate(u.subscription?.subscriptionExpiresAt)?.toISOString() || "",
  ]);
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(safeCell).join(",")).join("\r\n");
}

export function normalizeUsers(payload: unknown): AdminUser[] {
  if (!payload || typeof payload !== "object") throw new Error("The users response was not valid.");
  const body = payload as Record<string, unknown>;
  const data = body.data && typeof body.data === "object" ? body.data as Record<string, unknown> : null;
  const raw = body.users ?? (Array.isArray(body.data) ? body.data : data?.users);
  if (!Array.isArray(raw)) throw new Error("The API returned an unexpected users format.");
  return raw.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`User ${index + 1} was invalid.`);
    const user = item as AdminUser;
    const id = user._id || user.id;
    if (!id || typeof user.email !== "string") throw new Error(`User ${index + 1} was missing an ID or email.`);
    return { ...user, _id: String(id) };
  });
}
