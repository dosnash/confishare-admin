"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, FileClock, LayoutDashboard, LogOut, Menu, ScrollText, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Admin, adminName, initials, normalizeAdmin, roleLabel } from "@/lib/admins";
import Logo from "./logo";
import { ToastProvider } from "./ui";

type Session = { me: Admin | null; isSuper: boolean; setMe: (admin: Admin) => void; signOut: () => Promise<void>; expired: () => void };
const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside AdminShell");
  return value;
}

/** Fetch helper for client pages: JSON in/out, redirects to sign-in on 401. */
export function useAdminApi() {
  const { expired } = useSession();
  return useCallback(async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`/api/admin/${path.replace(/^\/+/, "")}`, { cache: "no-store", ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { expired(); throw Object.assign(new Error("Your session has ended. Sign in again."), { status: 401 }); }
    if (!response.ok) {
      const fallback = response.status === 504 || response.status === 502 ? `The server took too long to respond (${response.status}). Try again shortly.` : `The request failed (${response.status}). Try again shortly.`;
      const error = new Error((result as { error?: string }).error || fallback) as Error & { status?: number; field?: string };
      error.status = response.status;
      error.field = (result as { field?: string }).field;
      throw error;
    }
    return result as T;
  }, [expired]);
}

const nav: { href: string; label: string; icon: LucideIcon; superOnly?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/admins", label: "Admins", icon: UsersRound, superOnly: true },
  { href: "/admin/audit-logs", label: "Admin activity", icon: ScrollText },
  { href: "/admin/document-audit-logs", label: "Document activity", icon: FileClock },
  { href: "/admin/account", label: "Your account", icon: UserCog },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Admin | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const expired = useCallback(() => { router.replace("/login"); router.refresh(); }, [router]);
  const signOut = useCallback(async () => {
    await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
    router.replace("/login"); router.refresh();
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/auth/me", { cache: "no-store" }).then(async response => {
      if (response.status === 401) { expired(); return; }
      const admin = normalizeAdmin(await response.json().catch(() => null));
      if (!cancelled && admin) setMe(admin);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [expired]);

  useEffect(() => { setMenuOpen(false); setProfileOpen(false); }, [pathname]);
  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (event: MouseEvent) => { if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setProfileOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [profileOpen]);

  const isSuper = me?.role === "SUPER_ADMIN";
  const name = me ? adminName(me) : "";
  const links = nav.filter(item => !item.superOnly || isSuper);
  const active = (href: string) => href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return <SessionContext.Provider value={{ me, isSuper, setMe, signOut, expired }}>
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={21} /></button><Logo /><span className="admin-context">Admin workspace</span></div>
        <div className="profile-area" ref={profileRef}>
          <button className="profile-trigger" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}>
            <span className="profile-avatar">{me ? initials(name) : ""}</span>
            <span className="profile-text">{me ? name : <span className="skeleton-text" />}</span>
            <ChevronDown size={16} />
          </button>
          {profileOpen && <div className="profile-popover" role="menu">
            <div className="profile-popover-head"><strong>{name || "Administrator"}</strong><span>{me?.email}</span>{me && <span className={`role-pill role-${me.role.toLowerCase()}`}>{roleLabel[me.role] || me.role}</span>}</div>
            <Link role="menuitem" href="/admin/account" className="popover-item"><UserCog size={16} /> Your account</Link>
            <button role="menuitem" onClick={signOut}><LogOut size={16} /> Sign out</button>
          </div>}
        </div>
      </header>
      {menuOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="side-label">WORKSPACE</div>
        <nav aria-label="Admin navigation" className="side-nav">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-item ${active(href) ? "active" : ""}`} aria-current={active(href) ? "page" : undefined}><Icon size={18} /> {label}</Link>)}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-shield"><ShieldCheck size={17} /><span>{me ? roleLabel[me.role] || me.role : "Administrator"} access</span></div><p>{isSuper ? "You can manage admins and view all activity." : "Platform overview and your own activity."}</p></div>
      </aside>
      <main className="main-content"><ToastProvider>{children}</ToastProvider></main>
    </div>
  </SessionContext.Provider>;
}
