"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDarkMode } from "../../../hooks/useDarkMode";

// ─── Theme ────────────────────────────────────────────────────────────────────

const DARK = {
  bg: "#0f1117", card: "#1a1f2e", border: "#2a3050",
  text: "#e2e8f0", textSub: "#8892a4",
  accent: "#6366f1", accentHover: "#4f46e5",
  hover: "#1e2438",
};
const LIGHT = {
  bg: "#f1f5f9", card: "#ffffff", border: "#e2e8f0",
  text: "#0f172a", textSub: "#64748b",
  accent: "#6366f1", accentHover: "#4f46e5",
  hover: "#f8fafc",
};

const SEG_COLORS: Record<string, string> = {
  Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24",
  Returning: "#34d399", New: "#f87171",
};
const RISK_COLORS: Record<string, string> = {
  OK: "#22c55e", Risk: "#f59e0b", HighRisk: "#f97316", Lost: "#ef4444",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientRow {
  client_id: string;
  legacy_segment: string | null;
  risk_level: string | null;
  ltv: number | null;
  orders_count: number | null;
  last_order: string | null;
  first_order: string | null;
  ulubiony_swiat: string | null;
  winback_priority: string | null;
}

interface Filters {
  segment: string;
  risk: string;
  world: string;
  ltv_min: string;
  ltv_max: string;
  search: string;
  sort: string;
  page: number;
  per_page: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ t }: { t: typeof DARK }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 16, padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
          {[160, 80, 70, 70, 60, 90, 110, 70].map((w, j) => (
            <div key={j} style={{ width: w, height: 14, borderRadius: 4, background: t.border, animation: "cl-pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientsView() {
  const [darkRaw] = useDarkMode();
  const dark = darkRaw as boolean;
  const t = dark ? DARK : LIGHT;

  const [filters, setFilters] = useState<Filters>({
    segment: "", risk: "", world: "", ltv_min: "", ltv_max: "",
    search: "", sort: "ltv_desc", page: 1, per_page: 50,
  });
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [worlds, setWorlds] = useState<string[]>([]);
  const [worldsLoaded, setWorldsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQS = useCallback((f: Filters, extras?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (f.segment)  p.set("segment", f.segment);
    if (f.risk)     p.set("risk", f.risk);
    if (f.world)    p.set("world", f.world);
    if (f.ltv_min)  p.set("ltv_min", f.ltv_min);
    if (f.ltv_max)  p.set("ltv_max", f.ltv_max);
    if (f.search)   p.set("search", f.search);
    p.set("sort", f.sort);
    p.set("page", String(f.page));
    p.set("per_page", String(f.per_page));
    if (extras) for (const [k, v] of Object.entries(extras)) p.set(k, v);
    return p.toString();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/crm/clients/list?${buildQS(filters)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setClients(d.clients ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.total_pages ?? 1);
        if (!worldsLoaded && d.worlds?.length) {
          setWorlds(d.worlds);
          setWorldsLoaded(true);
        }
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters, buildQS, worldsLoaded]);

  function update(patch: Partial<Filters>) {
    setFilters(f => ({ ...f, ...patch, page: "page" in patch ? (patch.page ?? 1) : 1 }));
  }

  function resetFilters() {
    setFilters(f => ({ ...f, segment: "", risk: "", world: "", ltv_min: "", ltv_max: "", search: "", sort: "ltv_desc", page: 1 }));
  }

  function exportCSV() {
    const qs = buildQS(filters);
    window.location.href = `/api/crm/clients/export?${qs}`;
  }

  const hasFilters = !!(filters.segment || filters.risk || filters.world || filters.ltv_min || filters.ltv_max || filters.search);

  return (
    <>
      <style>{`
        @keyframes cl-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        .cl-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 1100px; }
        .cl-topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .cl-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0; }
        .cl-count { font-size: 13px; color: ${t.textSub}; margin-left: 8px; }
        .cl-btn { padding: 8px 16px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-geist-sans), system-ui, sans-serif; transition: opacity 0.15s, background 0.15s; }
        .cl-btn-primary { background: ${t.accent}; color: #fff; }
        .cl-btn-primary:hover { background: ${t.accentHover}; }
        .cl-btn-ghost { background: none; color: ${t.textSub}; border: 1px solid ${t.border}; }
        .cl-btn-ghost:hover { color: ${t.text}; background: ${t.hover}; }
        .cl-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; padding: 14px 16px; background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; margin-bottom: 16px; }
        .cl-filter-group { display: flex; flex-direction: column; gap: 4px; }
        .cl-filter-label { font-size: 10px; color: ${t.textSub}; text-transform: uppercase; letter-spacing: 0.06em; }
        .cl-input { padding: 7px 10px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.bg}; color: ${t.text}; font-size: 13px; font-family: var(--font-geist-sans), system-ui, sans-serif; outline: none; width: 140px; }
        .cl-input:focus { border-color: ${t.accent}; }
        .cl-input-sm { width: 90px; }
        .cl-select { padding: 7px 10px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.bg}; color: ${t.text}; font-size: 13px; font-family: var(--font-geist-sans), system-ui, sans-serif; outline: none; cursor: pointer; }
        .cl-select:focus { border-color: ${t.accent}; }
        .cl-table-wrap { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; overflow-x: auto; }
        .cl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .cl-table th { padding: 9px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid ${t.border}; text-align: left; white-space: nowrap; background: ${t.bg}; }
        .cl-table td { padding: 10px 14px; border-bottom: 1px solid ${t.border}; color: ${t.text}; white-space: nowrap; }
        .cl-table tr:last-child td { border-bottom: none; }
        .cl-table tr:hover td { background: ${t.hover}; }
        .cl-badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .cl-link { color: ${t.accent}; text-decoration: none; font-family: var(--font-geist-mono), monospace; font-size: 12px; letter-spacing: 0.02em; }
        .cl-link:hover { text-decoration: underline; }
        .cl-pagination { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 13px; color: ${t.textSub}; }
        .cl-page-btn { padding: 6px 14px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.card}; color: ${t.text}; cursor: pointer; font-size: 12px; }
        .cl-page-btn:hover:not(:disabled) { background: ${t.hover}; }
        .cl-page-btn:disabled { opacity: 0.4; cursor: default; }
        .cl-empty { padding: 60px 0; text-align: center; color: ${t.textSub}; font-size: 14px; }
        .cl-error { padding: 14px 18px; background: #ef444411; border: 1px solid #ef444444; border-radius: 8px; color: #ef4444; font-size: 13px; margin-bottom: 16px; }
      `}</style>

      <div className="cl-wrap">
        {/* Top bar */}
        <div className="cl-topbar">
          <h1 className="cl-title">
            Klienci 360°
            {!loading && <span className="cl-count">({total.toLocaleString("pl-PL")})</span>}
          </h1>
          <button className="cl-btn cl-btn-primary" onClick={exportCSV} style={{ marginLeft: "auto" }}>
            📥 Eksportuj CSV
          </button>
        </div>

        {/* Filters */}
        <div className="cl-filters">
          <div className="cl-filter-group">
            <span className="cl-filter-label">Szukaj</span>
            <input
              className="cl-input"
              placeholder="ID klienta…"
              value={filters.search}
              onChange={e => update({ search: e.target.value })}
            />
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Segment</span>
            <select className="cl-select" value={filters.segment} onChange={e => update({ segment: e.target.value })}>
              <option value="">Wszystkie</option>
              {["Diamond", "Platinum", "Gold", "Returning", "New"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Risk</span>
            <select className="cl-select" value={filters.risk} onChange={e => update({ risk: e.target.value })}>
              <option value="">Wszystkie</option>
              {["OK", "Risk", "HighRisk", "Lost"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Świat</span>
            <select className="cl-select" value={filters.world} onChange={e => update({ world: e.target.value })}>
              <option value="">Wszystkie</option>
              {worlds.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">LTV od</span>
            <input className="cl-input cl-input-sm" placeholder="0" type="number" value={filters.ltv_min} onChange={e => update({ ltv_min: e.target.value })} />
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">LTV do</span>
            <input className="cl-input cl-input-sm" placeholder="∞" type="number" value={filters.ltv_max} onChange={e => update({ ltv_max: e.target.value })} />
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Sortuj</span>
            <select className="cl-select" value={filters.sort} onChange={e => update({ sort: e.target.value })}>
              <option value="ltv_desc">LTV malejąco</option>
              <option value="ltv_asc">LTV rosnąco</option>
              <option value="last_order_desc">Ostatni zakup ↓</option>
              <option value="last_order_asc">Ostatni zakup ↑</option>
              <option value="orders_desc">Zamówienia ↓</option>
            </select>
          </div>
          {hasFilters && (
            <button className="cl-btn cl-btn-ghost" onClick={resetFilters} style={{ alignSelf: "flex-end" }}>
              Resetuj
            </button>
          )}
        </div>

        {/* Error */}
        {error && <div className="cl-error">⚠ {error}</div>}

        {/* Table */}
        {loading ? (
          <Skeleton t={t} />
        ) : clients.length === 0 ? (
          <div className="cl-empty">
            {hasFilters ? "Brak klientów spełniających kryteria" : "Brak danych — wgraj CSV w zakładce Import"}
          </div>
        ) : (
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead>
                <tr>
                  <th>ID klienta</th>
                  <th>Segment</th>
                  <th>Risk</th>
                  <th style={{ textAlign: "right" }}>LTV</th>
                  <th style={{ textAlign: "right" }}>Zamówienia</th>
                  <th>Ostatni zakup</th>
                  <th>Ulubiony świat</th>
                  <th>Winback</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.client_id}>
                    <td>
                      <Link href={`/crm/clients/${c.client_id}`} className="cl-link">
                        {c.client_id}
                      </Link>
                    </td>
                    <td>
                      {c.legacy_segment ? (
                        <span className="cl-badge" style={{
                          background: (SEG_COLORS[c.legacy_segment] ?? "#6366f1") + "22",
                          color: SEG_COLORS[c.legacy_segment] ?? "#6366f1",
                        }}>{c.legacy_segment}</span>
                      ) : "—"}
                    </td>
                    <td>
                      {c.risk_level ? (
                        <span className="cl-badge" style={{
                          background: (RISK_COLORS[c.risk_level] ?? "#475569") + "22",
                          color: RISK_COLORS[c.risk_level] ?? "#475569",
                        }}>{c.risk_level}</span>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: t.accent, fontWeight: 600 }}>
                      {c.ltv != null ? `${Number(c.ltv).toLocaleString("pl-PL")} zł` : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: t.textSub }}>
                      {c.orders_count ?? "—"}
                    </td>
                    <td style={{ color: t.textSub, fontSize: 12 }}>
                      {c.last_order ? c.last_order.slice(0, 10) : "—"}
                    </td>
                    <td style={{ color: t.textSub, fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.ulubiony_swiat ?? "—"}
                    </td>
                    <td>
                      {c.winback_priority ? (
                        <span className="cl-badge" style={{ background: "#ef444422", color: "#ef4444", fontSize: 10 }}>
                          {c.winback_priority.includes("VIP") ? "VIP" : "✓"}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <Link href={`/crm/clients/${c.client_id}`} style={{ color: t.accent, fontSize: 12, textDecoration: "none" }}>
                        →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="cl-pagination">
            <button className="cl-page-btn" disabled={filters.page === 1} onClick={() => update({ page: filters.page - 1 })}>
              ← Poprzednia
            </button>
            <span>Strona {filters.page} z {totalPages} ({total.toLocaleString("pl-PL")} klientów)</span>
            <button className="cl-page-btn" disabled={filters.page >= totalPages} onClick={() => update({ page: filters.page + 1 })}>
              Następna →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
