import { redirect } from "next/navigation";
import { token } from "@/lib/server-auth";
import Dashboard from "@/components/dashboard";

export default async function AdminPage() {
  if (!await token()) redirect("/login");
  return <Dashboard />;
}
