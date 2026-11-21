"use client";

import { useEffect, useState } from "react";
import { Admin, AuditLog, actionLabel, adminName, initials, normalizePage, roleLabel } from "@/lib/admins";
import LogView, { Outcome, When } from "./log-view";
import { useAdminApi, useSession } from "./admin-shell";

const outcomes = [{ value: "SUCCESS", label: "Success" }, { value: "FAILED", label: "Failed" }, { value: "DENIED", label: "Denied" }];

export default function AuditLogs() {
  const { isSuper, me } = useSession();
  const api = useAdminApi();
  const [admins, setAdmins] = useState<Admin[]>([]);
  useEffect(() => {
    if (!isSuper) return;
    api("admins?page=1&limit=100").then(result => setAdmins(normalizePage<Admin>(result, ["admins"]).items)).catch(() => setAdmins([]));
  }, [api, isSuper]);

  if (!me) return <div className="log-skeleton" role="status" aria-label="Loading"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>;

  return <LogView<AuditLog>
    endpoint="audit-logs"
    title="Admin activity"
    description={isSuper ? "Sign-ins, profile and password changes, admin management, exports and customer views across every admin." : "Your sign-ins, profile and password changes, exports and customer views."}
    noun="events"
    filters={[
      ...(isSuper ? [{ key: "adminId", label: "Admin", type: "select" as const, placeholder: "All admins", options: admins.map(admin => ({ value: admin._id, label: `${adminName(admin)} · ${admin.email}` })) }] : []),
      { key: "outcome", label: "Outcome", type: "select", placeholder: "Any outcome", options: outcomes },
      { key: "action", label: "Action", type: "action", placeholder: "e.g. admin.login" },
    ]}
    headline={row => row.summary || actionLabel(row.action)}
    columns={[
      { label: "When", render: row => <When value={row.createdAt} /> },
      { label: "Admin", render: row => <span className="person-cell"><span className="table-avatar">{initials(row.actor?.name || row.actor?.email || "?")}</span><span><strong>{row.actor?.name || "Unknown admin"}</strong><small>{row.actor?.email || "-"}</small></span></span> },
      { label: "Action", render: row => <span className="action-cell">{actionLabel(row.action)}<code>{row.action}</code></span> },
      { label: "Summary", className: "summary-cell", render: row => row.summary || "-" },
      { label: "Outcome", render: row => <Outcome value={row.outcome} reason={row.reason} /> },
      { label: "IP address", className: "mono-cell", render: row => row.context?.ip || "-" },
    ]}
    details={row => [
      { label: "Admin", value: row.actor?.name || "-" },
      { label: "Admin email", value: row.actor?.email || "-" },
      { label: "Role", value: row.actor?.role ? roleLabel[row.actor.role] || row.actor.role : "-" },
      { label: "Admin ID", value: row.actor?.adminId ? <code>{row.actor.adminId}</code> : "-" },
      { label: "Target", value: row.target?.label || (row.target?.type ? `${row.target.type}${row.target.id ? ` · ${row.target.id}` : ""}` : "-") },
      { label: "Target type", value: row.target?.type || "-" },
      { label: "IP address", value: row.context?.ip ? <code>{row.context.ip}</code> : "-" },
      { label: "Event ID", value: <code>{row._id}</code> },
      { label: "Summary", value: row.summary || "-", wide: true },
      { label: "User agent", value: row.context?.userAgent || "-", wide: true },
    ]}
  />;
}
