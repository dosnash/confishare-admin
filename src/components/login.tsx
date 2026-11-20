"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, ChartNoAxesCombined, CreditCard, Eye, EyeOff, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import Logo from "./logo";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign in failed.");
      router.replace("/admin"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign in failed."); setBusy(false); }
  }
  return <main className="login-page">
    <aside className="login-brand-panel" aria-label="ConfiShare administration">
      <div className="login-brand-top"><Logo /><span className="login-brand-tag">ADMIN</span></div>
      <div className="login-brand-content">
        <div className="login-brand-symbol" aria-hidden="true"><Image src="/icon.png" alt="" width={72} height={72} /></div>
        <h2>A clearer view of your platform.</h2>
        <p>Users, subscriptions and usage in one focused workspace.</p>
        <div className="login-feature-list" aria-hidden="true">
          <span><Users size={17} /> User directory</span>
          <span><CreditCard size={17} /> Subscription overview</span>
          <span><ChartNoAxesCombined size={17} /> Usage insights</span>
        </div>
      </div>
      <div className="login-brand-bottom"><ShieldCheck size={16} /> Authorized administrators only</div>
    </aside>
    <section className="login-form-panel" aria-labelledby="login-title">
      <div className="login-mobile-brand"><Logo /><span>ADMIN</span></div>
      <div className="login-center">
        <span className="login-emblem"><LockKeyhole size={22} strokeWidth={1.8} /></span>
        <h1 id="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to your admin workspace.</p>
        <form onSubmit={submit} className="login-form">
          {error && <p className="form-error" role="alert">{error}</p>}
          <label className="field-label" htmlFor="email">Email address</label>
          <input id="email" className="field" type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={event => setEmail(event.target.value)} required />
          <label className="field-label password-label" htmlFor="password">Password</label>
          <div className="password-wrap"><input id="password" className="field" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} required /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <button className="button button-primary login-submit" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}<ArrowRight size={18} /></button>
        </form>
        <p className="login-footnote"><ShieldCheck size={15} /> Access is limited to authorized platform administrators.</p>
      </div>
      <div className="login-bottom">© {new Date().getFullYear()} ConfiShare <span>Secure administration</span></div>
    </section>
  </main>;
}
