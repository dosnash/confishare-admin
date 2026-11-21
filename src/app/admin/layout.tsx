import { redirect } from "next/navigation";
import { token } from "@/lib/server-auth";
import AdminShell from "@/components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!await token()) redirect("/login");
  return <AdminShell>{children}</AdminShell>;
}
