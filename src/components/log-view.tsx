"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ChevronLeft, ChevronRight, FilterX, Inbox, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { actionLabel, normalizePage, Page, reasonLabel, relativeTime } from "@/lib/admins";
import { formatDate } from "@/lib/admin";
import { useAdminApi } from "./admin-shell";

export type LogFilter = { key: string; label: string; type: "text" | "select" | "action"; placeholder?: string; options?: { value: string; label: string }[] };
export type LogColumn<T> = { label: string; render: (row: T) => React.ReactNode; className?: string };
export type LogDetail = { label: string; value: React.ReactNode; wide?: boolean };

type Props<T extends { _id: string; action: string; outcome: string; createdAt?: string }> = {
  endpoint: string;
  title: string;
  description: string;
  noun: string;
  filters: LogFilter[];
  columns: LogColumn<T>[];
  details: (row: T) => LogDetail[];
  headline: (row: T) => string;
  initialFilters?: Record<string, string>;
};

const limits = [20, 50, 100];

export function Outcome({ value, reason }: { value: string; reason?: string | null }) {
  const tone = value === "SUCCESS" ? "ok" : value === "DENIED" ? "warn" : value === "FAILED" ? "bad" : "neutral";
  return <span className="outcome-wrap"><span className={`outcome outcome-${tone}`}><i aria-hidden="true" />{value === "SUCCESS" ? "Success" : value ? value[0] + value.slice(1).toLowerCase() : "-"}</span>{reason && <span className="outcome-reason">{reasonLabel(reason)}</span>}</span>;
}

export function When({ value }: { value?: string }) {
  if (!value) return <>-</>;
  return <time dateTime={value} title={formatDate(value)} className="when"><span>{relativeTime(value)}</span><small>{formatDate(value)}</small></time>;
}

export default function LogView<T extends { _id: string; action: string; outcome: string; createdAt?: string }>({ endpoint, title, description, noun, filters, columns, details, headline, initialFilters = {} }: Props<T>) {
  const api = useAdminApi();
  const reduced = useReducedMotion();
  const [values, setValues] = useState<Record<string, string>>(initialFilters);
  const [applied, setApplied] = useState<Record<string, string>>(initialFilters);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<T | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [seenActions, setSeenActions] = useState<string[]>([]);
  const request = useRef(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    Object.entries(applied).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()); });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [applied, from, to, page, limit]);

  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError("");
    try {
      const result = normalizePage<T>(await api(`${endpoint}?${query}`));
      if (id !== request.current) return;
      setData(result);
      setSeenActions(previous => [...new Set([...previous, ...result.items.map(item => item.action).filter(Boolean)])].sort());
    } catch (cause) {
      if (id === request.current) setError(cause instanceof Error ? cause.message : `${title} could not be loaded.`);
    } finally { if (id === request.current) setLoading(false); }
  }, [api, endpoint, query, title]);

  useEffect(() => { void load(); }, [load]);

  const activeCount = Object.values(applied).filter(value => value.trim()).length + (from ? 1 : 0) + (to ? 1 : 0);
  const pages = data ? Math.max(1, Math.ceil(data.total / (data.limit || limit))) : 1;
  const textKeys = filters.filter(filter => filter.type !== "select").map(filter => filter.key);
  const pending = textKeys.some(key => (values[key] || "") !== (applied[key] || ""));

  function apply(next = values) { setApplied(next); setPage(1); }
  function setSelect(key: string, value: string) { const next = { ...values, [key]: value }; setValues(next); apply(next); }
  function clearAll() { setValues({}); setApplied({}); setFrom(""); setTo(""); setPage(1); }

  return <>
    <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div><button className="button button-secondary refresh-button" onClick={() => load()} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh</button></div>
    <section className="panel log-panel">
      <form className="log-toolbar" onSubmit={event => { event.preventDefault(); apply(); }}>
        <div className="log-toolbar-main">
          {filters.filter(filter => filter.type === "select").map(filter => <select key={filter.key} aria-label={filter.label} className="select-field" value={values[filter.key] || ""} onChange={event => setSelect(filter.key, event.target.value)}><option value="">{filter.placeholder || `All ${filter.label.toLowerCase()}`}</option>{filter.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>)}
          <label className="date-chip"><span>From</span><input type="date" value={from} max={to || undefined} onChange={event => { setFrom(event.target.value); setPage(1); }} /></label>
          <label className="date-chip"><span>To</span><input type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1); }} /></label>
          {textKeys.length > 0 && <button type="button" className={`button button-secondary filter-toggle ${showFilters ? "on" : ""}`} aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} /> More filters</button>}
          {activeCount > 0 && <button type="button" className="text-button" onClick={clearAll}><FilterX size={15} /> Clear {activeCount}</button>}
        </div>
        <AnimatePresence initial={false}>{showFilters && <motion.div className="log-toolbar-extra" initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduced ? undefined : { height: 0, opacity: 0 }} transition={{ duration: .18 }}>
          <div className="log-extra-grid">
            {filters.filter(filter => filter.type !== "select").map(filter => <label key={filter.key} className="mini-field"><span>{filter.label}</span><input list={filter.type === "action" ? `${endpoint}-actions` : undefined} placeholder={filter.placeholder} value={values[filter.key] || ""} onChange={event => setValues({ ...values, [filter.key]: event.target.value })} spellCheck={false} autoComplete="off" /></label>)}
            <datalist id={`${endpoint}-actions`}>{seenActions.map(action => <option key={action} value={action}>{actionLabel(action)}</option>)}</datalist>
          </div>
          <div className="log-extra-actions"><button type="submit" className="button button-primary" disabled={!pending}>Apply filters</button></div>
        </motion.div>}</AnimatePresence>
      </form>

      {error ? <div className="inline-state"><span className="state-icon danger"><AlertCircle size={22} /></span><h3>Couldn’t load {title.toLowerCase()}</h3><p>{error}</p><button className="button button-primary" onClick={() => load()}>Try again</button></div>
        : !data && loading ? <div className="log-skeleton" role="status" aria-label={`Loading ${title.toLowerCase()}`}>{Array.from({ length: 8 }, (_, index) => <span className="skeleton" key={index} />)}</div>
        : data && data.items.length === 0 ? <div className="table-empty"><span><Inbox size={24} /></span><h3>No {noun} found</h3><p>{activeCount ? "Nothing matches these filters. Try widening the date range or clearing filters." : "Activity will appear here as it happens."}</p>{activeCount > 0 && <button className="button button-secondary empty-action" onClick={clearAll}>Clear filters</button>}</div>
        : data && <>
          <div className={`table-scroll ${loading ? "is-loading" : ""}`} aria-busy={loading}><table className="log-table"><thead><tr>{columns.map(column => <th scope="col" key={column.label}>{column.label}</th>)}</tr></thead><tbody>
            {data.items.map(row => <tr key={row._id} tabIndex={0} role="button" aria-label={`View ${headline(row)}`} onClick={() => setSelected(row)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(row); } }}>{columns.map(column => <td key={column.label} className={column.className}>{column.render(row)}</td>)}</tr>)}
          </tbody></table></div>
          <div className="table-footer"><span aria-live="polite">{data.total ? `Showing ${((data.page - 1) * data.limit + 1).toLocaleString("en")}–${Math.min(data.page * data.limit, data.total).toLocaleString("en")} of ${data.total.toLocaleString("en")} ${noun}` : ""}</span>
            <div className="pagination"><label className="page-size">Rows <select value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1); }}>{limits.map(size => <option key={size} value={size}>{size}</option>)}</select></label><button className="icon-button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button><span>Page {Math.min(page, pages)} of {pages}</span><button className="icon-button" aria-label="Next page" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button></div>
          </div>
        </>}
    </section>
    <AnimatePresence>{selected && <LogDrawer key={selected._id} title={headline(selected)} row={selected} details={details(selected)} close={() => setSelected(null)} />}</AnimatePresence>
  </>;
}

function LogDrawer<T extends { action: string; outcome: string; createdAt?: string; reason?: string | null; metadata?: Record<string, unknown> | null }>({ title, row, details, close }: { title: string; row: T; details: LogDetail[]; close: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab" || !panel.current) return;
      const targets = [...panel.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')];
      if (!targets.length) return;
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus(); };
  }, [close]);
  const metadata = row.metadata && Object.keys(row.metadata).length ? JSON.stringify(row.metadata, null, 2) : "";
  return <motion.div className="drawer-backdrop" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <motion.div ref={panel} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} initial={reduced ? false : { x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={reduced ? undefined : { x: 40, opacity: 0 }} transition={{ duration: .2, ease: "easeOut" }}>
      <div className="drawer-head">
        <div><span className="drawer-eyebrow"><code>{row.action}</code></span><h2 id="drawer-title">{title}</h2><div className="drawer-meta"><Outcome value={row.outcome} reason={row.reason} /><span>{formatDate(row.createdAt)}</span></div></div>
        <button className="icon-button" aria-label="Close details" onClick={close}><X size={20} /></button>
      </div>
      <dl className="drawer-grid">{details.map(item => <div key={item.label} className={`detail-field ${item.wide ? "wide" : ""}`}><dt>{item.label}</dt><dd>{item.value ?? "-"}</dd></div>)}</dl>
      {metadata && <div className="drawer-section"><h3>Metadata</h3><pre>{metadata}</pre></div>}
    </motion.div>
  </motion.div>;
}
