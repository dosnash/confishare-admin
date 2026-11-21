"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, CheckCircle2, Circle, X } from "lucide-react";
import { passwordIssues } from "@/lib/admins";

type Toast = { id: number; tone: "ok" | "bad"; text: string };
const ToastContext = createContext<(text: string, tone?: Toast["tone"]) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const dismiss = useCallback((id: number) => setToasts(list => list.filter(toast => toast.id !== id)), []);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = ++counter.current;
    setToasts(list => [...list.slice(-2), { id, tone, text }]);
    window.setTimeout(() => dismiss(id), tone === "bad" ? 7000 : 4500);
  }, [dismiss]);
  return <ToastContext.Provider value={push}>
    {children}
    <div className="toast-stack" aria-live="polite" role="status">
      <AnimatePresence>{toasts.map(toast => <motion.div key={toast.id} className={`toast ${toast.tone}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: .16 }}>
        {toast.tone === "ok" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{toast.text}</span><button aria-label="Dismiss" onClick={() => dismiss(toast.id)}><X size={15} /></button>
      </motion.div>)}</AnimatePresence>
    </div>
  </ToastContext.Provider>;
}

/** Accessible modal: focus trap, Escape to close (unless busy), scroll lock, focus restore. */
export function Modal({ labelledBy, close, busy = false, narrow = false, children }: { labelledBy: string; close: () => void; busy?: boolean; narrow?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = ref.current?.querySelector<HTMLElement>("[autofocus], input, select, textarea");
    (first || ref.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) close();
      if (event.key !== "Tab" || !ref.current) return;
      const targets = [...ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(item => !item.hasAttribute("disabled"));
      if (!targets.length) return;
      const head = targets[0], tail = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === head) { event.preventDefault(); tail.focus(); }
      else if (!event.shiftKey && document.activeElement === tail) { event.preventDefault(); head.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus(); };
  }, [close]);
  return <motion.div className="modal-backdrop" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget && !busyRef.current) close(); }}>
    <motion.div ref={ref} className={`form-dialog ${narrow ? "narrow" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} initial={reduced ? false : { opacity: 0, scale: .98, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, scale: .98 }} transition={{ duration: .18 }}>
      {children}
    </motion.div>
  </motion.div>;
}

export function PasswordChecks({ value }: { value: string }) {
  const issues = passwordIssues(value);
  const all = ["At least 8 characters", "An uppercase letter", "A lowercase letter", "A number", "A symbol"];
  return <ul className="password-checks" aria-label="Password requirements">{all.map(rule => { const met = !!value && !issues.includes(rule); return <li key={rule} className={met ? "met" : ""}>{met ? <Check size={12} /> : <Circle size={10} />}{rule}</li>; })}</ul>;
}

export function generatePassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%^&*?"];
  const all = sets.join("");
  const random = (max: number) => { const buffer = new Uint32Array(1); crypto.getRandomValues(buffer); return buffer[0] % max; };
  const chars = sets.map(set => set[random(set.length)]);
  while (chars.length < 16) chars.push(all[random(all.length)]);
  for (let index = chars.length - 1; index > 0; index--) { const swap = random(index + 1); [chars[index], chars[swap]] = [chars[swap], chars[index]]; }
  return chars.join("");
}
