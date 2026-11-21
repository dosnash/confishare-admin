import type { Metadata } from "next";
import Account from "@/components/account";

export const metadata: Metadata = { title: "Your account | ConfiShare Admin" };

export default function AccountPage() {
  return <Account />;
}
