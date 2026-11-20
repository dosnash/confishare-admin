import { redirect } from "next/navigation";
import { token } from "@/lib/server-auth";
import Login from "@/components/login";

export default async function LoginPage() {
  if (await token()) redirect("/admin");
  return <Login />;
}
