import { NextResponse } from "next/server";
import { apiBase, clearSession, token } from "@/lib/server-auth";
import { normalizeUsers } from "@/lib/admin";

export async function GET() {
  const bearer = await token();
  if (!bearer) return NextResponse.json({ error: "Your session has ended." }, { status: 401 });
  try {
    const upstream = await fetch(`${apiBase()}/auth/users`, { headers: { Authorization: `Bearer ${bearer}` }, cache: "no-store" });
    if (upstream.status === 401) {
      await clearSession();
      return NextResponse.json({ error: "Your session has ended." }, { status: 401 });
    }
    if (upstream.status === 403) return NextResponse.json({ error: "Your account cannot view platform users." }, { status: 403 });
    if (!upstream.ok) return NextResponse.json({ error: "Users could not be loaded. Try again." }, { status: upstream.status });
    const users = normalizeUsers(await upstream.json());
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Users could not be loaded." }, { status: 502 });
  }
}
