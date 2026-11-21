"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Info } from "lucide-react";
import { adminName, initials, normalizeAdmin, passwordIssues, relativeTime, roleLabel } from "@/lib/admins";
import { formatDate } from "@/lib/admin";
import { useAdminApi, useSession } from "./admin-shell";
import { PasswordChecks, useToast } from "./ui";

export default function Account() {
  const { me } = useSession();
  if (!me) return <div className="log-skeleton" role="status" aria-label="Loading"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>;
  return <>
    <div className="page-heading"><div><h1>Your account</h1><p>Your profile details and sign-in security.</p></div></div>
    <div className="account-grid">
      <section className="panel account-card" aria-label="Profile summary">
        <div className="account-identity"><span className="account-avatar">{initials(adminName(me))}</span><div><h2>{adminName(me)}</h2><p>{me.email}</p></div><span className={`role-pill role-${me.role.toLowerCase()}`}>{roleLabel[me.role] || me.role}</span></div>
        <dl className="account-facts">
          <div><dt>Status</dt><dd><span className={`state-dot ${me.isActive === false ? "off" : "on"}`}><i />{me.isActive === false ? "Deactivated" : "Active"}</span></dd></div>
          <div><dt>Last sign-in</dt><dd title={me.lastLoginAt ? formatDate(me.lastLoginAt) : undefined}>{relativeTime(me.lastLoginAt)}</dd></div>
          <div><dt>Password changed</dt><dd>{me.passwordChangedAt ? relativeTime(me.passwordChangedAt) : "Never"}</dd></div>
          <div><dt>Member since</dt><dd>{formatDate(me.createdAt).replace(/,\s*\d{1,2}:\d{2}\s*[AP]M$/, "")}</dd></div>
        </dl>
      </section>
      <div className="account-forms"><ProfileForm /><PasswordForm /></div>
    </div>
  </>;
}

function ProfileForm() {
  const { me, setMe } = useSession();
  const api = useAdminApi();
  const toast = useToast();
  const [form, setForm] = useState({ firstName: me?.firstName || "", lastName: me?.lastName || "", phone: me?.phone || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (me) setForm({ firstName: me.firstName || "", lastName: me.lastName || "", phone: me.phone || "" }); }, [me]);
  if (!me) return null;

  const changes: Record<string, string | null> = {};
  if (form.firstName.trim() !== (me.firstName || "")) changes.firstName = form.firstName.trim();
  if (form.lastName.trim() !== (me.lastName || "")) changes.lastName = form.lastName.trim();
  if (form.phone.trim() !== (me.phone || "")) changes.phone = form.phone.trim() || null;
  const dirty = Object.keys(changes).length > 0;
  const nameError = form.firstName.trim().length < 2 || form.lastName.trim().length < 2;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || nameError || busy || !me) return;
    setBusy(true); setError("");
    try {
      const result = await api("auth/me", { method: "PATCH", body: JSON.stringify(changes) });
      setMe({ ...me, ...(normalizeAdmin(result) || changes) } as typeof me);
      toast("Your profile was updated.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your profile could not be saved."); }
    finally { setBusy(false); }
  }

  return <form className="panel form-card" onSubmit={submit} noValidate>
    <div className="form-card-head"><h2>Profile</h2><p>How your name appears across the admin workspace and activity log.</p></div>
    <div className="form-body">
      {error && <p className="form-error" role="alert" style={{ margin: 0 }}>{error}</p>}
      <div className="form-row">
        <label className="form-field"><span>First name</span><input className="field" value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} autoComplete="given-name" aria-invalid={form.firstName.trim().length < 2} /></label>
        <label className="form-field"><span>Last name</span><input className="field" value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} autoComplete="family-name" aria-invalid={form.lastName.trim().length < 2} /></label>
      </div>
      {nameError && <span className="field-error">First and last name need at least 2 characters.</span>}
      <div className="form-row">
        <label className="form-field"><span>Email</span><input className="field" value={me.email} disabled readOnly /><span className="field-hint">Ask a super admin to change your email.</span></label>
        <label className="form-field"><span>Phone <small>(optional)</small></span><input className="field" type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} autoComplete="tel" /></label>
      </div>
    </div>
    <div className="form-actions"><button type="button" className="button button-secondary" disabled={!dirty || busy} onClick={() => setForm({ firstName: me.firstName || "", lastName: me.lastName || "", phone: me.phone || "" })}>Discard</button><button type="submit" className="button button-primary" disabled={!dirty || nameError || busy}>{busy ? "Saving…" : "Save changes"}</button></div>
  </form>;
}

function PasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const { expired } = useSession();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const weak = passwordIssues(form.next).length > 0;
  const mismatch = !!form.confirm && form.confirm !== form.next;
  const same = !!form.next && form.next === form.current;
  const ready = !!form.current && !weak && !mismatch && !same && form.confirm === form.next;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/session/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) { expired(); return; }
      if (!response.ok) throw new Error(result.error || "Your password could not be changed.");
      setForm({ current: "", next: "", confirm: "" });
      if (result.reauthenticate) { router.replace("/login"); router.refresh(); return; }
      toast("Password changed. Your other sessions were signed out.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your password could not be changed."); }
    finally { setBusy(false); }
  }

  const type = visible ? "text" : "password";
  return <form className="panel form-card" onSubmit={submit} noValidate>
    <div className="form-card-head"><h2>Password</h2><p>Use a unique password you don’t use anywhere else.</p></div>
    <div className="form-body">
      {error && <p className="form-error" role="alert" style={{ margin: 0 }}>{error}</p>}
      <label className="form-field"><span>Current password</span><div className="password-wrap"><input className="field" type={type} value={form.current} onChange={event => setForm({ ...form, current: event.target.value })} autoComplete="current-password" /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide passwords" : "Show passwords"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
      <div className="form-row">
        <label className="form-field"><span>New password</span><input className="field" type={type} value={form.next} onChange={event => setForm({ ...form, next: event.target.value })} autoComplete="new-password" aria-invalid={same} />{same && <span className="field-error">Choose a different password from your current one.</span>}</label>
        <label className="form-field"><span>Confirm new password</span><input className="field" type={type} value={form.confirm} onChange={event => setForm({ ...form, confirm: event.target.value })} autoComplete="new-password" aria-invalid={mismatch} />{mismatch && <span className="field-error">Passwords don’t match.</span>}</label>
      </div>
      <PasswordChecks value={form.next} />
      <div className="notice info"><Info size={16} /><span>Changing your password signs you out everywhere else. This device stays signed in.</span></div>
    </div>
    <div className="form-actions"><button type="submit" className="button button-primary" disabled={!ready || busy}>{busy ? "Updating…" : "Update password"}</button></div>
  </form>;
}
