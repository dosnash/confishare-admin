"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowDownToLine, BadgeCheck, Building2, ChevronLeft, ChevronRight, CreditCard, Hourglass, RefreshCw, Search, ShieldCheck, User, Users, UsersRound, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminUser, billingAccount, companyFor, csvFor, displayName, formatDate, formatStorage, effectiveStatus, effectiveStatusLabel, normalizeUsers, planLabel, rawStatus, renewalDue, statusLabel, statuses, StatusFilter, validDate } from "@/lib/admin";
import { useAdminApi, useSession } from "./admin-shell";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);
const number = (value: number) => new Intl.NumberFormat("en").format(value);
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const pageSize = 15;

/** Reads a total count from paginated users responses, if the API provides one. */
function totalOf(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;
  const data = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data as Record<string, unknown> : {};
  const meta = [data.pagination, data.meta, body.pagination, body.meta].find(item => item && typeof item === "object") as Record<string, unknown> | undefined;
  const value = meta?.total ?? data.total ?? body.total;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
type DateFilter = "ANY" | "TODAY" | "7" | "30" | "MONTH" | "CUSTOM";

function StatusPill({ user, now, inherited = false }: { user: AdminUser; now: number; inherited?: boolean }) {
  const status = effectiveStatus(user, now);
  const label = status === "OTHER" ? rawStatus(user) : statusLabel[status];
  const due = renewalDue(user, now);
  return <span className="status-stack"><span className={`status-pill status-${status.toLowerCase()}`} title={status === "TRIAL_ENDED" ? "Stored as TRIAL, but the trial end date has passed" : undefined}>{label}</span>{due && <small className="status-note">Renewal due</small>}{inherited && <small className="status-note inherited">Via company</small>}</span>;
}

function StatCard({ label, value, icon: Icon, index }: { label: string; value: number; icon: LucideIcon; index: number }) {
  const reduced = useReducedMotion();
  return <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, delay: Math.min(index * .035, .2) }} className="stat-card">
    <div className="stat-top"><span>{label}</span><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></div><strong>{number(value)}</strong>
  </motion.div>;
}

function Breakdown({ title, rows, total }: { title: string; rows: { label: string; count: number }[]; total: number }) {
  return <section className="panel breakdown"><div className="section-head"><h2>{title}</h2></div><div className="breakdown-list">{rows.map((row) => <div className="breakdown-row" key={row.label}><div className="breakdown-line"><span>{row.label}</span><strong>{number(row.count)}</strong></div><div className="progress-track"><span style={{ width: `${total ? row.count / total * 100 : 0}%` }} /></div></div>)}{!rows.length && <p className="quiet-empty">No data available yet.</p>}</div></section>;
}

function DetailDialog({ user, users, close }: { user: AdminUser; users: AdminUser[]; close: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const billing = billingAccount(user, users);
  const inherited = billing !== user;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key !== "Tab" || !dialog.current) return;
      const targets = [...dialog.current.querySelectorAll<HTMLElement>('button, [href], input, select, [tabindex]:not([tabindex="-1"])')].filter(item => !item.hasAttribute("disabled"));
      if (!targets.length) { event.preventDefault(); return; }
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      else if (document.activeElement === dialog.current) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [close]);
  const fields = [
    ["Account type", user.accountType ? user.accountType[0].toUpperCase() + user.accountType.slice(1) : "-"],
    ["Role", user.role === "TEAM_MEMBER" ? "Team member" : "Owner"],
    ...(user.companyId ? [["Company", companyFor(user, users)]] : []),
    ["Status", effectiveStatusLabel(billing) + (inherited ? " (company subscription)" : "")],
    ...(!inherited && rawStatus(user) && effectiveStatus(user) !== rawStatus(user) ? [["Stored status", rawStatus(user)]] : []),
    ["Plan", planLabel(billing.subscription?.subscriptionPlan)],
    ["Trial ends", formatDate(billing.subscription?.trialEndDate)],
    ["Subscription expires", formatDate(billing.subscription?.subscriptionExpiresAt)],
    ["Email verified", user.isVerified ? "Yes" : "No"],
    ["Documents shared", number(user.usage?.shareCount || 0)],
    ["Storage used", formatStorage(user.usage?.storageBytes)],
    ["Registered", formatDate(user.createdAt)],
    ...(user.accountType === "company" ? [["Team members", number(users.filter(candidate => candidate.companyId === user._id).length)]] : []),
  ];
  return <motion.div className="modal-backdrop" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <motion.div className="detail-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1} initial={reduced ? false : { opacity: 0, scale: .98, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, scale: .98 }} transition={{ duration: .18 }}>
      <div className="dialog-head"><div><span className="dialog-avatar">{displayName(user).slice(0, 1).toUpperCase()}</span><h2 id="dialog-title">{displayName(user)}</h2><p>{user.email}</p></div><button className="icon-button" aria-label="Close user details" onClick={close}><X size={20} /></button></div>
      <div className="detail-grid">{fields.map(([label, value]) => <div className="detail-field" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</div>
    </motion.div>
  </motion.div>;
}

export default function Dashboard() {
  const api = useAdminApi();
  const { signOut } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ANY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true);
    setError(""); setDenied(false);
    try {
      const all: AdminUser[] = [];
      const seen = new Set<string>();
      for (let page = 1; page <= 200; page++) {
        const result = await api(`users?page=${page}&limit=100`);
        const batch = normalizeUsers(result);
        const fresh = batch.filter(user => !seen.has(user._id));
        fresh.forEach(user => { seen.add(user._id); all.push(user); });
        const total = totalOf(result);
        if (!fresh.length || batch.length < 100 || (total !== null && all.length >= total)) break;
      }
      setUsers(all);
    } catch (cause) {
      if ((cause as { status?: number }).status === 403) setDenied(true);
      else setError(cause instanceof Error ? cause.message : "Users could not be loaded.");
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [api]);
  useEffect(() => { void load(true); }, [load]);
  useEffect(() => setPage(1), [status, search, plan, dateFilter, from, to]);
  // Re-evaluated whenever users reload, so trial and renewal dates are judged against the current time.
  const now = useMemo(() => new Date(), [users]); // eslint-disable-line react-hooks/exhaustive-deps
  const billingOf = useMemo(() => new Map(users.map(user => [user._id, billingAccount(user, users)])), [users]);
  const bill = useCallback((user: AdminUser) => billingOf.get(user._id) ?? user, [billingOf]);
  const counts = useMemo(() => {
    const tally: Record<string, number> = Object.fromEntries(statuses.map(item => [item, 0]));
    users.forEach(user => { const key = effectiveStatus(bill(user), now.getTime()); if (key in tally) tally[key] += 1; });
    return tally;
  }, [users, now, bill]);
  const visibleStatuses = statuses.filter(item => item !== "NONE" || (counts.NONE || 0) > 0 || status === "NONE");
  const plans = useMemo(() => [...new Set(users.map(user => bill(user).subscription?.subscriptionPlan).filter((item): item is string => !!item))].sort((a, b) => a.localeCompare(b)), [users, bill]);
  const filtered = useMemo(() => users.filter(user => {
    const billing = bill(user);
    if (status !== "ALL" && effectiveStatus(billing, now.getTime()) !== status) return false;
    if (plan !== "ALL" && (plan === "NONE" ? !!billing.subscription?.subscriptionPlan : billing.subscription?.subscriptionPlan !== plan)) return false;
    const needle = search.trim().toLocaleLowerCase();
    if (needle && ![displayName(user), user.email, user.companyName || ""].some(value => value.toLocaleLowerCase().includes(needle))) return false;
    if (dateFilter !== "ANY") {
      const registered = validDate(user.createdAt);
      if (!registered) return false;
      if (dateFilter === "TODAY" && dateKey(registered) !== dateKey(now)) return false;
      if (dateFilter === "7" && (registered > now || registered.getTime() < now.getTime() - 7 * 86400000)) return false;
      if (dateFilter === "30" && (registered > now || registered.getTime() < now.getTime() - 30 * 86400000)) return false;
      if (dateFilter === "MONTH" && (registered.getMonth() !== now.getMonth() || registered.getFullYear() !== now.getFullYear())) return false;
      if (dateFilter === "CUSTOM") {
        if (from && registered < new Date(`${from}T00:00:00`)) return false;
        if (to && registered > new Date(`${to}T23:59:59.999`)) return false;
      }
    }
    return true;
  }).sort((a, b) => (validDate(b.createdAt)?.getTime() || 0) - (validDate(a.createdAt)?.getTime() || 0)), [users, status, plan, search, dateFilter, from, to, now, bill]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const monthDates = useMemo(() => Array.from({ length: 12 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)), [now]);
  const monthly = useMemo(() => monthDates.map(month => users.filter(user => { const date = validDate(user.createdAt); return date && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth(); }).length), [monthDates, users]);
  const lapsed = (counts.TRIAL_ENDED || 0) + (counts.EXPIRED || 0) + (counts.CANCELLED || 0) + (counts.PAST_DUE || 0);
  const stats: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Total users", value: users.length, icon: Users },
    { label: "Verified emails", value: users.filter(user => user.isVerified === true).length, icon: BadgeCheck },
    { label: "Paying accounts (active)", value: users.filter(user => bill(user) === user && effectiveStatus(user, now.getTime()) === "ACTIVE").length, icon: CreditCard },
    { label: "On free trial (current)", value: counts.TRIAL || 0, icon: Hourglass },
    { label: "Individual accounts", value: users.filter(user => user.accountType === "individual").length, icon: User },
    { label: "Company accounts", value: users.filter(user => user.accountType === "company").length, icon: Building2 },
    { label: "Team members", value: users.filter(user => user.role === "TEAM_MEMBER").length, icon: UsersRound },
    { label: "New in last 30 days", value: users.filter(user => { const date = validDate(user.createdAt); return date && date <= now && date.getTime() >= now.getTime() - 30 * 86400000; }).length, icon: Users },
  ];
  const planRows = useMemo(() => { const map = new Map<string, number>(); users.forEach(user => { const key = planLabel(bill(user).subscription?.subscriptionPlan); map.set(key, (map.get(key) || 0) + 1); }); return [...map].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)); }, [users, bill]);
  function exportCsv() { const blob = new Blob([csvFor(filtered, users)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `confishare-users-${dateKey(new Date())}.csv`; link.click(); URL.revokeObjectURL(url); }
  return <>

      <div className="page-heading"><div><h1>Overview</h1><p>Platform-wide users, subscriptions and usage.</p></div><button className="button button-secondary refresh-button" onClick={() => load()} disabled={loading || refreshing}><RefreshCw size={16} className={loading || refreshing ? "spin" : ""} /> Refresh</button></div>
      {denied ? <div className="state-card"><span className="state-icon danger"><ShieldCheck size={25} /></span><h2>Access denied</h2><p>Your account cannot view platform users. Contact your administrator if this looks wrong.</p><button className="button button-secondary" onClick={signOut}>Sign out</button></div> : error ? <div className="state-card"><span className="state-icon danger"><AlertCircle size={25} /></span><h2>Couldn’t load your dashboard</h2><p>{error}</p><button className="button button-primary" onClick={() => load(true)}>Try again</button></div> : loading ? <div className="loading-dashboard" aria-label="Loading dashboard" role="status"><div className="skeleton-stats">{Array.from({ length: 8 }, (_, index) => <span className="skeleton" key={index} />)}</div><div className="skeleton-panels"><span className="skeleton" /><span className="skeleton" /></div><span className="skeleton skeleton-table" /><span className="sr-only">Loading users and platform metrics…</span></div> : <>
        <section aria-label="Platform summary" className="stats-grid">{stats.map((stat, index) => <StatCard key={stat.label} {...stat} index={index} />)}</section>
        <div className="analytics-grid"><section className="panel chart-panel"><div className="section-head"><div><h2>New users per month</h2><p>Last 12 months</p></div></div><div className="chart-wrap"><Bar data={{ labels: monthDates.map(date => date.toLocaleDateString("en", { month: "short", year: "2-digit" }).replace(" ", " ’")), datasets: [{ data: monthly, backgroundColor: "#059669", hoverBackgroundColor: "#047857", borderRadius: 5, maxBarThickness: 32 }] }} options={{ responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0F172A", padding: 10, displayColors: false } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: "#64748B", font: { family: "Inter", size: 11 }, maxRotation: 0, autoSkip: true } }, y: { beginAtZero: true, border: { display: false, dash: [3, 4] }, grid: { color: "#EEF1F4" }, ticks: { color: "#94A3B8", precision: 0, stepSize: 1, font: { family: "Inter", size: 11 } } } } }} /></div></section>
          <section className="panel usage-panel"><div className="section-head"><h2>Usage</h2></div><div className="usage-list"><div><span>Documents shared <small>(all users)</small></span><strong>{number(users.reduce((sum, user) => sum + (user.usage?.shareCount || 0), 0))}</strong></div><div><span>Storage used <small>(all users)</small></span><strong>{formatStorage(users.reduce((sum, user) => sum + (user.usage?.storageBytes || 0), 0))}</strong></div><div><span>Lapsed <small>(trial ended, expired, cancelled, past due)</small></span><strong>{number(lapsed)}</strong></div></div></section></div>
        <div className="breakdowns-grid"><Breakdown title="Subscription status" total={users.length} rows={visibleStatuses.map(item => ({ label: statusLabel[item], count: counts[item] || 0 }))} /><Breakdown title="Plans" total={users.length} rows={planRows} /></div>
        <section className="panel users-panel" aria-labelledby="users-heading"><div className="users-head"><div><h2 id="users-heading">Users</h2><p>Click a user to see their details.</p></div><span className="users-total">{number(users.length)} total</span></div>
          <div className="status-filters" aria-label="Filter by subscription status">{(["ALL", ...visibleStatuses] as StatusFilter[]).map(item => <button key={item} className={`filter-chip ${status === item ? "selected" : ""}`} aria-pressed={status === item} onClick={() => setStatus(item)}>{item === "ALL" ? "All" : statusLabel[item]} <span>({item === "ALL" ? users.length : counts[item] || 0})</span></button>)}</div>
          <div className="filter-toolbar"><div className="search-wrap"><Search size={18} /><input aria-label="Search users" placeholder="Search by name, email or company..." value={search} onChange={event => setSearch(event.target.value)} /></div><select aria-label="Filter by plan" className="select-field" value={plan} onChange={event => setPlan(event.target.value)}><option value="ALL">All plans</option><option value="NONE">No paid plan</option>{plans.map(item => <option key={item} value={item}>{planLabel(item)}</option>)}</select><select aria-label="Filter by registration date" className="select-field" value={dateFilter} onChange={event => setDateFilter(event.target.value as DateFilter)}><option value="ANY">Registered any time</option><option value="TODAY">Registered today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="MONTH">This month</option><option value="CUSTOM">Custom range…</option></select><button className="button button-primary export-button" disabled={!filtered.length} onClick={exportCsv}><ArrowDownToLine size={16} /> Export CSV ({filtered.length})</button></div>
          {dateFilter === "CUSTOM" && <div className="date-range"><label>From <input type="date" value={from} max={to || undefined} onChange={event => { const value = event.target.value; setFrom(value); if (to && value > to) setTo(""); }} /></label><label>To <input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} /></label></div>}
          {filtered.length ? <><div className="table-scroll"><table><thead><tr>{["Name", "Email", "Account", "Plan", "Status", "Verified", "Shares", "Storage", "Registered"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map(user => <tr key={user._id} tabIndex={0} role="button" aria-label={`View details for ${displayName(user)}`} onClick={() => setSelected(user)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(user); } }}><td className="name-cell"><span className="table-avatar">{displayName(user).slice(0, 1).toUpperCase()}</span><span>{displayName(user)}</span></td><td>{user.email}</td><td>{user.accountType ? user.accountType[0].toUpperCase() + user.accountType.slice(1) : "-"}{user.role === "TEAM_MEMBER" && <span className="team-pill">Team member</span>}</td><td>{bill(user).subscription?.subscriptionPlan ? planLabel(bill(user).subscription?.subscriptionPlan) : "-"}</td><td><StatusPill user={bill(user)} now={now.getTime()} inherited={bill(user) !== user} /></td><td>{user.isVerified ? <span className="verified"><BadgeCheck size={17} aria-label="Verified" /> Yes</span> : "No"}</td><td>{number(user.usage?.shareCount || 0)}</td><td>{formatStorage(user.usage?.storageBytes)}</td><td>{validDate(user.createdAt) ? <time dateTime={validDate(user.createdAt)!.toISOString()}>{formatDate(user.createdAt)}</time> : "-"}</td></tr>)}</tbody></table></div><div className="table-footer"><span aria-live="polite">Showing {number((currentPage - 1) * pageSize + 1)}–{number(Math.min(currentPage * pageSize, filtered.length))} of {number(filtered.length)} users</span>{pages > 1 && <div className="pagination"><button className="icon-button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} /></button><span>Page {currentPage} of {pages}</span><button className="icon-button" aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} /></button></div>}</div></> : <div className="table-empty"><span><Users size={24} /></span><h3>No users found</h3><p>Try a different search or status filter.</p></div>}
        </section>
      </>}
    <AnimatePresence>{selected && <DetailDialog key={selected._id} user={selected} users={users} close={() => setSelected(null)} />}</AnimatePresence>
  </>;
}
