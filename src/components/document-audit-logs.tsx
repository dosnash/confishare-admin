"use client";

import { FileText } from "lucide-react";
import { DocumentAuditLog, actionLabel, initials } from "@/lib/admins";
import LogView, { Outcome, When } from "./log-view";

const outcomes = [{ value: "SUCCESS", label: "Success" }, { value: "DENIED", label: "Denied" }, { value: "FAILED", label: "Failed" }];

export default function DocumentAuditLogs() {
  return <LogView<DocumentAuditLog>
    endpoint="document-audit-logs"
    title="Document activity"
    description="Platform-wide audit trail of customer document access, sharing and refusals."
    noun="events"
    filters={[
      { key: "outcome", label: "Outcome", type: "select", placeholder: "Any outcome", options: outcomes },
      { key: "action", label: "Action", type: "action", placeholder: "e.g. document.activated" },
      { key: "resourceType", label: "Resource type", type: "text", placeholder: "e.g. document" },
      { key: "resourceId", label: "Resource ID", type: "text", placeholder: "Document ID" },
      { key: "ownerId", label: "Owner ID", type: "text", placeholder: "Customer who owns the resource" },
      { key: "actorUserId", label: "Actor ID", type: "text", placeholder: "Customer who acted" },
    ]}
    headline={row => row.summary || actionLabel(row.action)}
    columns={[
      { label: "When", render: row => <When value={row.createdAt} /> },
      { label: "Customer", render: row => <span className="person-cell"><span className="table-avatar">{initials(row.actor?.name || row.actor?.email || "?")}</span><span><strong>{row.actor?.name || "Unknown"}</strong><small>{row.actor?.email || "-"}</small></span></span> },
      { label: "Action", render: row => <span className="action-cell">{actionLabel(row.action)}<code>{row.action}</code></span> },
      { label: "Resource", render: row => <span className="resource-cell"><FileText size={15} aria-hidden="true" /><span>{row.resource?.name || row.resource?.id || "-"}</span></span> },
      { label: "Outcome", render: row => <Outcome value={row.outcome} reason={row.reason} /> },
      { label: "Device", className: "device-cell", render: row => <span><span>{row.context?.userAgent || "-"}</span><small>{row.context?.ip || ""}</small></span> },
    ]}
    details={row => [
      { label: "Customer", value: row.actor?.name || "-" },
      { label: "Customer email", value: row.actor?.email || "-" },
      { label: "Resource", value: row.resource?.name || "-" },
      { label: "Resource type", value: row.resource?.type || "-" },
      { label: "Resource ID", value: row.resource?.id ? <code>{row.resource.id}</code> : "-" },
      { label: "Owner ID", value: row.ownerId ? <code>{row.ownerId}</code> : "-" },
      { label: "Actor ID", value: row.actor?.userId ? <code>{row.actor.userId}</code> : "-" },
      { label: "Device ID", value: row.context?.deviceId ? <code>{row.context.deviceId}</code> : "-" },
      { label: "IP address", value: row.context?.ip ? <code>{row.context.ip}</code> : "-" },
      { label: "Event ID", value: <code>{row._id}</code> },
      { label: "Summary", value: row.summary || "-", wide: true },
      { label: "User agent", value: row.context?.userAgent || "-", wide: true },
    ]}
  />;
}
