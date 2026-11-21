import type { Metadata } from "next";
import AdminsManager from "@/components/admins-manager";

export const metadata: Metadata = { title: "Admins | ConfiShare Admin" };

export default function AdminsPage() {
  return <AdminsManager />;
}
