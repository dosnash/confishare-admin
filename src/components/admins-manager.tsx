"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, Eye, EyeOff, Power, RefreshCw, Search, ShieldCheck, ShieldPlus, UserCheck, UserPlus, UsersRound, UserX, Wand2, X } from "lucide-react";
import { Admin, AdminRole, adminName, initials, normalizeAdmin, normalizePage, passwordIssues, relativeTime, roleLabel } from "@/lib/admins";
import { formatDate } from "@/lib/admin";
import { useAdminApi, useSession } from "./admin-shell";
import { generatePassword, Modal, PasswordChecks, useToast } from "./ui";

type Pending = { admin: Admin; change: { role?: AdminRole; isActive?: boolean } };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminsManager() {
  const { me, isSuper } = useSession();
  const api = useAdminApi();
  const toast = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [state, setState] = useState("ALL");
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const all: Admin[] = [];
      const seen = new Set<string>();
      for (let page = 1; page <= 50; page++) {
        const result = normalizePage<Admin>(await api(`admins?page=${page}&limit=100`), ["admins"]);
        const fresh = result.items.filter(item => !seen.has(item._id));
        fresh.forEach(item => { seen.add(item._id); all.push(item); });
        if (!fresh.length || all.length >= result.total || result.items.length < result.limit) break;
      }
      setAdmins(all);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Admins could not be loaded."); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { if (isSuper) void load(); }, [isSuper, load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return admins.filter(admin => {
      if (role !== "ALL" && admin.role !== role) return false;
      if (state === "ACTIVE" && admin.isActive === false) return false;
      if (state === "INACTIVE" && admin.isActive !== false) return false;
      return !needle || [adminName(admin), admin.email, admin.phone || ""].some(value => value.toLowerCase().includes(needle));
    }).sort((a, b) => (a.role === b.role ? 0 : a.role === "SUPER_ADMIN" ? -1 : 1) || adminName(a).localeCompare(adminName(b)));
  }, [admins, search, role, state]);

  function replace(updated: Admin) { setAdmins(list => list.map(item => item._id === updated._id ? { ...item, ...updated } : item)); }

  if (!me) return <div className="log-skeleton" role="status" aria-label="Loading"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>;
  if (!isSuper) return <div className="state-card gate-card"><span className="state-icon danger"><ShieldCheck size={25} /></span><h2>Super admins only</h2><p>Only super admins can view and manage admin accounts. Ask a super admin if you need a change.</p><Link className="button button-secondary" href="/admin">Back to overview</Link></div>;

  const counts = {
    total: admins.length,
    supers: admins.filter(admin => admin.role === "SUPER_ADMIN").length,
    active: admins.filter(admin => admin.isActive !== false).length,
    inactive: admins.filter(admin => admin.isActive === false).length,
  };

  return <>
    <div className="page-heading"><div><h1>Admins</h1><p>Invite admins, set their role and control who can sign in.</p></div><div className="admins-head-actions"><button className="button button-secondary refresh-button" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh</button><button className="button button-primary" onClick={() => setCreating(true)}><UserPlus size={16} /> Add admin</button></div></div>

    <section className="admins-summary" aria-label="Admin summary">
      {[["Total admins", counts.total, UsersRound], ["Super admins", counts.supers, ShieldCheck], ["Active", counts.active, UserCheck], ["Deactivated", counts.inactive, UserX]].map(([label, value, Icon]) => {
        const I = Icon as typeof UsersRound;
        return <div className="stat-card" key={label as string}><div className="stat-top"><span>{label as string}</span><I size={19} strokeWidth={1.8} aria-hidden="true" /></div><strong>{loading && !admins.length ? "–" : (value as number).toLocaleString("en")}</strong></div>;
      })}
    </section>

    <section className="panel admins-panel" aria-label="Admin accounts">
      <div className="admins-toolbar">
        <div className="search-wrap"><Search size={18} /><input aria-label="Search admins" placeholder="Search by name, email or phone..." value={search} onChange={event => setSearch(event.target.value)} /></div>
        <select aria-label="Filter by role" className="select-field" value={role} onChange={event => setRole(event.target.value)}><option value="ALL">All roles</option><option value="SUPER_ADMIN">Super admins</option><option value="ADMIN">Admins</option></select>
        <select aria-label="Filter by status" className="select-field" value={state} onChange={event => setState(event.target.value)}><option value="ALL">Any status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Deactivated</option></select>
      </div>
      {error ? <div className="inline-state"><span className="state-icon danger"><AlertCircle size={22} /></span><h3>Couldn’t load admins</h3><p>{error}</p><button className="button button-primary" onClick={load}>Try again</button></div>
        : loading && !admins.length ? <div className="log-skeleton" role="status" aria-label="Loading admins">{Array.from({ length: 5 }, (_, index) => <span className="skeleton" key={index} />)}</div>
        : !filtered.length ? <div className="table-empty"><span><UsersRound size={24} /></span><h3>No admins found</h3><p>{admins.length ? "Try a different search or filter." : "Add the first admin to share the workload."}</p></div>
        : <div className={`table-scroll ${loading ? "is-loading" : ""}`}><table className="admins-table"><thead><tr>{["Admin", "Role", "Status", "Last sign-in", "Added", ""].map(label => <th scope="col" key={label || "actions"}>{label || <span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody>
          {filtered.map(admin => {
            const self = admin._id === me._id;
            const active = admin.isActive !== false;
            return <tr key={admin._id} className={active ? "" : "inactive"}>
              <td><span className="person-cell"><span className="table-avatar">{initials(adminName(admin))}</span><span><strong>{adminName(admin)}{self && <span className="you-pill">You</span>}</strong><small>{admin.email}</small></span></span></td>
              <td><span className={`role-pill role-${admin.role.toLowerCase()}`}>{admin.role === "SUPER_ADMIN" && <ShieldCheck size={12} />}{roleLabel[admin.role] || admin.role}</span></td>
              <td><span className={`state-dot ${active ? "on" : "off"}`}><i />{active ? "Active" : "Deactivated"}</span></td>
              <td title={admin.lastLoginAt ? formatDate(admin.lastLoginAt) : undefined}>{relativeTime(admin.lastLoginAt)}</td>
              <td>{formatDate(admin.createdAt).replace(/,\s*\d{1,2}:\d{2}\s*[AP]M$/, "")}</td>
              <td>{self ? <div className="row-actions"><span className="self-note">Manage yourself in <Link href="/admin/account" className="text-button">Your account</Link></span></div> : <div className="row-actions">
                <button className="row-action" onClick={() => setPending({ admin, change: { role: admin.role === "SUPER_ADMIN" ? "ADMIN" : "SUPER_ADMIN" } })}><ShieldPlus size={14} />{admin.role === "SUPER_ADMIN" ? "Make admin" : "Make super admin"}</button>
                <button className={`row-action ${active ? "danger" : "positive"}`} onClick={() => setPending({ admin, change: { isActive: !active } })}><Power size={14} />{active ? "Deactivate" : "Reactivate"}</button>
              </div>}</td>
            </tr>;
          })}
        </tbody></table></div>}
      {!error && filtered.length > 0 && <div className="table-footer"><span>Showing {filtered.length} of {admins.length} admins</span></div>}
    </section>

    <AnimatePresence>
      {creating && <CreateAdmin key="create" close={() => setCreating(false)} created={admin => { setAdmins(list => [admin, ...list.filter(item => item._id !== admin._id)]); toast(`${adminName(admin)} was added as ${roleLabel[admin.role] || admin.role}.`); }} onFallback={load} />}
      {pending && <ConfirmChange key="confirm" pending={pending} close={() => setPending(null)} done={(updated, message) => { replace(updated); toast(message); }} />}
    </AnimatePresence>
  </>;
}

function ConfirmChange({ pending, close, done }: { pending: Pending; close: () => void; done: (admin: Admin, message: string) => void }) {
  const api = useAdminApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { admin, change } = pending;
  const name = adminName(admin);
  const deactivating = change.isActive === false;
  const promoting = change.role === "SUPER_ADMIN";
  const title = change.role ? (promoting ? `Make ${name} a super admin?` : `Change ${name} to admin?`) : deactivating ? `Deactivate ${name}?` : `Reactivate ${name}?`;
  const body = change.role
    ? promoting ? "Super admins can add admins, change roles, deactivate accounts and see every admin’s activity." : "They’ll keep access to the overview and logs, but can no longer manage admins or see other admins’ activity."
    : deactivating ? "They won’t be able to sign in until a super admin reactivates them." : "They’ll be able to sign in again with their existing password.";

  async function confirm() {
    setBusy(true); setError("");
    try {
      const result = await api(`admins/${encodeURIComponent(admin._id)}`, { method: "PATCH", body: JSON.stringify(change) });
      const updated = normalizeAdmin(result) || { ...admin, ...change };
      const message = change.role ? `${name} is now ${roleLabel[change.role] === "Admin" ? "an admin" : "a super admin"}.` : deactivating ? `${name} was deactivated.` : `${name} was reactivated.`;
      done({ ...admin, ...updated, ...change }, message);
      close();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The change could not be saved."); setBusy(false); }
  }

  return <Modal labelledBy="confirm-title" close={close} busy={busy} narrow>
    <div className="form-dialog-head"><div><span className={`dialog-icon ${deactivating ? "danger" : change.role ? "warn" : ""}`}>{deactivating ? <UserX size={20} /> : change.role ? <ShieldPlus size={20} /> : <UserCheck size={20} />}</span><h2 id="confirm-title">{title}</h2><p>{body}</p></div><button className="icon-button" aria-label="Close" onClick={close} disabled={busy}><X size={20} /></button></div>
    <div className="form-body">
      <div className="notice warn"><AlertTriangle size={16} /><span>This signs {name} out on every device straight away.</span></div>
      {error && <p className="form-error" role="alert" style={{ margin: 0 }}>{error}</p>}
    </div>
    <div className="form-actions"><button className="button button-secondary" onClick={close} disabled={busy}>Cancel</button><button className={`button ${deactivating ? "button-danger" : "button-primary"}`} onClick={confirm} disabled={busy} autoFocus>{busy ? "Saving…" : deactivating ? "Deactivate" : change.role ? "Change role" : "Reactivate"}</button></div>
  </Modal>;
}

function CreateAdmin({ close, created, onFallback }: { close: () => void; created: (admin: Admin) => void; onFallback: () => void }) {
  const api = useAdminApi();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "ADMIN" as AdminRole });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [field, setField] = useState("");
  const [touched, setTouched] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });

  const local = {
    firstName: form.firstName.trim().length < 2 ? "Enter at least 2 characters." : "",
    lastName: form.lastName.trim().length < 2 ? "Enter at least 2 characters." : "",
    email: !emailPattern.test(form.email.trim()) ? "Enter a valid email address." : "",
    password: passwordIssues(form.password).length ? "Meet every password requirement." : "",
  };
  const invalid = Object.values(local).some(Boolean);
  const show = (key: keyof typeof local) => (touched && local[key]) || (field === key ? error : "");

  async function submit(event: FormEvent) {
    event.preventDefault(); setTouched(true);
    if (invalid || busy) return;
    setBusy(true); setError(""); setField("");
    const payload: Record<string, string> = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(), password: form.password, role: form.role };
    if (form.phone.trim()) payload.phone = form.phone.trim();
    try {
      const result = await api("admins", { method: "POST", body: JSON.stringify(payload) });
      const admin = normalizeAdmin(result);
      if (admin) created(admin); else onFallback();
      close();
    } catch (cause) {
      const failure = cause as Error & { field?: string };
      setError(failure.message || "The admin could not be added."); setField(failure.field || ""); setBusy(false);
    }
  }

  return <Modal labelledBy="create-title" close={close} busy={busy}>
    <form onSubmit={submit} noValidate>
      <div className="form-dialog-head"><div><span className="dialog-icon"><UserPlus size={20} /></span><h2 id="create-title">Add an admin</h2><p>They’ll sign in with this email and password. Share the password securely.</p></div><button type="button" className="icon-button" aria-label="Close" onClick={close} disabled={busy}><X size={20} /></button></div>
      <div className="form-body">
        {error && !["firstName", "lastName", "email", "password", "phone"].includes(field) && <p className="form-error" role="alert" style={{ margin: 0 }}>{error}</p>}
        <div className="form-row">
          <label className="form-field"><span>First name</span><input className="field" value={form.firstName} onChange={set("firstName")} autoComplete="off" aria-invalid={!!show("firstName")} autoFocus />{show("firstName") && <span className="field-error">{show("firstName")}</span>}</label>
          <label className="form-field"><span>Last name</span><input className="field" value={form.lastName} onChange={set("lastName")} autoComplete="off" aria-invalid={!!show("lastName")} />{show("lastName") && <span className="field-error">{show("lastName")}</span>}</label>
        </div>
        <label className="form-field"><span>Work email</span><input className="field" type="email" value={form.email} onChange={set("email")} autoComplete="off" placeholder="name@confishare.io" aria-invalid={!!show("email")} />{show("email") && <span className="field-error">{show("email")}</span>}</label>
        <label className="form-field"><span>Phone <small>(optional)</small></span><input className="field" type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" aria-invalid={field === "phone"} />{field === "phone" && <span className="field-error">{error}</span>}</label>
        <div className="form-field"><span id="role-label">Role</span><div className="role-options" role="radiogroup" aria-labelledby="role-label">
          <label className="role-option"><input type="radio" name="role" value="ADMIN" checked={form.role === "ADMIN"} onChange={() => setForm({ ...form, role: "ADMIN" })} /><strong>Admin</strong><span>Overview, users and their own activity.</span></label>
          <label className="role-option"><input type="radio" name="role" value="SUPER_ADMIN" checked={form.role === "SUPER_ADMIN"} onChange={() => setForm({ ...form, role: "SUPER_ADMIN" })} /><strong>Super admin</strong><span>Everything, plus managing admins.</span></label>
        </div></div>
        <label className="form-field"><span>Temporary password</span><div className="password-wrap"><input className="field" type={visible ? "text" : "password"} value={form.password} onChange={set("password")} autoComplete="new-password" aria-invalid={!!show("password")} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><PasswordChecks value={form.password} />{field === "password" && <span className="field-error">{error}</span>}</label>
        <button type="button" className="text-button generate-link" onClick={() => { setForm({ ...form, password: generatePassword() }); setVisible(true); }}><Wand2 size={14} /> Generate a strong password</button>
      </div>
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={close} disabled={busy}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Adding…" : "Add admin"}</button></div>
    </form>
  </Modal>;
}
