import type { Metadata } from "next";
import AuditLogs from "@/components/audit-logs";

export const metadata: Metadata = { title: "Admin activity | ConfiShare Admin" };

export default function AuditLogsPage() {
  return <AuditLogs />;
}
