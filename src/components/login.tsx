"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import Logo from "./logo";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Sign in failed.");
      router.replace("/admin"); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return <main className="signin-page">
    <div className="signin-shell">
      <div className="signin-brand"><Logo /><span>ADMIN</span></div>
      <section className="signin-card" aria-labelledby="login-title">
        <span className="signin-emblem"><LockKeyhole size={22} strokeWidth={1.8} /></span>
        <h1 id="login-title">Welcome back</h1>
        <p className="signin-subtitle">Sign in to the ConfiShare admin workspace.</p>
        <form onSubmit={submit} className="login-form">
          {error && <p className="form-error" role="alert">{error}</p>}
          <label className="field-label" htmlFor="email">Email address</label>
          <input id="email" className="field" type="email" autoComplete="username" placeholder="name@confishare.io" value={email} onChange={event => setEmail(event.target.value)} required autoFocus />
          <label className="field-label password-label" htmlFor="password">Password</label>
          <div className="password-wrap"><input id="password" className="field" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} required /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <button className="button button-primary login-submit" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}<ArrowRight size={18} /></button>
        </form>
      </section>
      <p className="signin-footnote"><ShieldCheck size={15} /> Access is limited to authorized ConfiShare administrators.</p>
      <p className="signin-copy">© {new Date().getFullYear()} ConfiShare</p>
    </div>
  </main>;
}
