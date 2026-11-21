import type { Metadata } from "next";
import DocumentAuditLogs from "@/components/document-audit-logs";

export const metadata: Metadata = { title: "Document activity | ConfiShare Admin" };

export default function DocumentAuditLogsPage() {
  return <DocumentAuditLogs />;
}
