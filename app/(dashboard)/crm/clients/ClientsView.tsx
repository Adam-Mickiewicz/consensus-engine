"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDarkMode } from "../../../hooks/useDarkMode";
import EdroneExportDocs from "@/components/crm/EdroneExportDocs";

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

interface ClientRow {
  client_id: string;
  legacy_segment: string | null;
  risk_level: string | null;
  ltv: number | null;
  orders_count: number | null;
  last_order: string | null;
  first_order: string | null;
  top_domena: string | null;
  winback_priority: string | null;
}

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

const SORT_COLS = [
  { key: "ltv",         asc: "ltv_asc",          desc: "ltv_desc" },
  { key: "orders",      asc: "orders_asc",        desc: "orders_desc" },
  { key: "last_order",  asc: "last_order_asc",    desc: "last_order_desc" },
  { key: "first_order", asc: "first_order_asc",   desc: "first_order_desc" },
];

export default function ClientsView() {
  const [darkRaw] = useDarkMode();
  const dark = darkRaw as boolean;
  const t = dark ? DARK : LIGHT;

  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();

  // URL-synced state
  const segment  = searchParams.get("segment")   || "";
  const risk     = searchParams.get("risk")       || "";
  const world    = searchParams.get("world")      || "";
  const ltv_min  = searchParams.get("ltv_min")    || "";
  const ltv_max  = searchParams.get("ltv_max")    || "";
  const sort     = searchParams.get("sort")       || "ltv_desc";
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const date_from = searchParams.get("date_from") || "";
  const date_to  = searchParams.get("date_to")    || "";
  const occasion = searchParams.get("occasion")   || "";

  // Local-only (debounced) state for search
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const [clients,    setClients]    = useState<ClientRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [worlds,     setWorlds]     = useState<string[]>([]);
  const [worldsLoaded, setWorldsLoaded] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Edrone export modal
  const [edroneModal,   setEdroneModal]   = useState(false);
  const [edroneLoading, setEdroneLoading] = useState(false);
  const [edroneResult,  setEdroneResult]  = useState<{ exported: number; missing: number } | null>(null);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    if (key !== "page") p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }

  function setSort(col: string) {
    const entry = SORT_COLS.find(c => c.key === col);
    if (!entry) return;
    const next = sort === entry.desc ? entry.asc : entry.desc;
    setParam("sort", next);
  }

  function sortIcon(col: string) {
    const entry = SORT_COLS.find(c => c.key === col);
    if (!entry) return null;
    if (sort === entry.desc) return " ↓";
    if (sort === entry.asc)  return " ↑";
    return " ↕";
  }

  function resetFilters() {
    const p = new URLSearchParams(searchParams.toString());
    ["segment","risk","world","ltv_min","ltv_max","search","date_from","date_to","occasion","page","sort"].forEach(k => p.delete(k));
    setSearchInput("");
    router.push(`${pathname}?${p.toString()}`);
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setParam("search", searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = searchParams.toString();
    fetch(`/api/crm/clients/list?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setClients(d.clients ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.total_pages ?? 1);
        if (!worldsLoaded && d.worlds?.length) { setWorlds(d.worlds); setWorldsLoaded(true); }
        setLoading(false);
      })
      .catch((e: Error) => { if (cancelled) return; setError(e.message); setLoading(false); });

    return () => { cancelled = true; };
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  function exportCSV() {
    window.location.href = `/api/crm/clients/export?${searchParams.toString()}`;
  }

  async function exportEdrone() {
    setEdroneLoading(true);
    setEdroneModal(false);
    setEdroneResult(null);
    try {
      const res = await fetch(`/api/crm/clients/export-edrone?${searchParams.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const exported = Number(res.headers.get("X-Export-Count") ?? "0");
      const missing  = Number(res.headers.get("X-Missing-Emails") ?? "0");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `edrone_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setEdroneResult({ exported, missing });
    } catch (e: unknown) {
      alert("Błąd eksportu: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setEdroneLoading(false);
    }
  }

  const hasFilters = !!(segment || risk || world || ltv_min || ltv_max || searchInput || date_from || date_to || occasion);

  const thStyle = (col: string) => ({
    cursor: SORT_COLS.find(c => c.key === col) ? "pointer" : "default",
    userSelect: "none" as const,
    whiteSpace: "nowrap" as const,
  });

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
        .cl-input-date { width: 130px; }
        .cl-select { padding: 7px 10px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.bg}; color: ${t.text}; font-size: 13px; font-family: var(--font-geist-sans), system-ui, sans-serif; outline: none; cursor: pointer; }
        .cl-select:focus { border-color: ${t.accent}; }
        .cl-table-wrap { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; overflow-x: auto; }
        .cl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .cl-table th { padding: 9px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid ${t.border}; text-align: left; white-space: nowrap; background: ${t.bg}; }
        .cl-table th:hover { color: ${t.text}; }
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
            <input className="cl-input" placeholder="ID klienta…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Segment</span>
            <select className="cl-select" value={segment} onChange={e => setParam("segment", e.target.value)}>
              <option value="">Wszystkie</option>
              {["Diamond","Platinum","Gold","Returning","New"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Risk</span>
            <select className="cl-select" value={risk} onChange={e => setParam("risk", e.target.value)}>
              <option value="">Wszystkie</option>
              {["OK","Risk","HighRisk","Lost"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Świat</span>
            <select className="cl-select" value={world} onChange={e => setParam("world", e.target.value)}>
              <option value="">Wszystkie</option>
              {worlds.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Ostatni zakup od</span>
            <input className="cl-input cl-input-date" type="date" value={date_from} onChange={e => setParam("date_from", e.target.value)} />
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Ostatni zakup do</span>
            <input className="cl-input cl-input-date" type="date" value={date_to} onChange={e => setParam("date_to", e.target.value)} />
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">LTV od</span>
            <input className="cl-input cl-input-sm" placeholder="0" type="number" value={ltv_min} onChange={e => setParam("ltv_min", e.target.value)} />
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">LTV do</span>
            <input className="cl-input cl-input-sm" placeholder="∞" type="number" value={ltv_max} onChange={e => setParam("ltv_max", e.target.value)} />
          </div>
          <div className="cl-filter-group">
            <span className="cl-filter-label">Sortuj</span>
            <select className="cl-select" value={sort} onChange={e => setParam("sort", e.target.value)}>
              <option value="ltv_desc">LTV malejąco</option>
              <option value="ltv_asc">LTV rosnąco</option>
              <option value="last_order_desc">Ostatni zakup ↓</option>
              <option value="last_order_asc">Ostatni zakup ↑</option>
              <option value="orders_desc">Zamówienia ↓</option>
              <option value="orders_asc">Zamówienia ↑</option>
            </select>
          </div>
          {hasFilters && (
            <button className="cl-btn cl-btn-ghost" onClick={resetFilters} style={{ alignSelf: "flex-end" }}>Resetuj</button>
          )}
        </div>

        {error && <div className="cl-error">⚠ {error}</div>}

        {loading ? (
          <Skeleton t={t} />
        ) : clients.length === 0 ? (
          <div className="cl-empty">{hasFilters ? "Brak klientów spełniających kryteria" : "Brak danych — wgraj CSV w zakładce Import"}</div>
        ) : (
          <div className="cl-table-wrap">
            <table className="cl-table">
              <thead>
                <tr>
                  <th>ID klienta</th>
                  <th>Segment</th>
                  <th>Risk</th>
                  <th style={{ textAlign: "right", ...thStyle("ltv") }} onClick={() => setSort("ltv")}>LTV{sortIcon("ltv")}</th>
                  <th style={{ textAlign: "right", ...thStyle("orders") }} onClick={() => setSort("orders")}>Zamówienia{sortIcon("orders")}</th>
                  <th style={thStyle("last_order")} onClick={() => setSort("last_order")}>Ostatni zakup{sortIcon("last_order")}</th>
                  <th style={thStyle("first_order")} onClick={() => setSort("first_order")}>Pierwszy zakup{sortIcon("first_order")}</th>
                  <th>Top domena</th>
                  <th>Winback</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.client_id}>
                    <td><Link href={`/crm/clients/${c.client_id}`} className="cl-link">{c.client_id}</Link></td>
                    <td>
                      {c.legacy_segment ? (
                        <span className="cl-badge" style={{ background: (SEG_COLORS[c.legacy_segment] ?? "#6366f1") + "22", color: SEG_COLORS[c.legacy_segment] ?? "#6366f1" }}>{c.legacy_segment}</span>
                      ) : "—"}
                    </td>
                    <td>
                      {c.risk_level ? (
                        <span className="cl-badge" style={{ background: (RISK_COLORS[c.risk_level] ?? "#475569") + "22", color: RISK_COLORS[c.risk_level] ?? "#475569" }}>{c.risk_level}</span>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: t.accent, fontWeight: 600 }}>
                      {c.ltv != null ? `${Number(c.ltv).toLocaleString("pl-PL")} zł` : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: t.textSub }}>{c.orders_count ?? "—"}</td>
                    <td style={{ color: t.textSub, fontSize: 12 }}>{c.last_order ? c.last_order.slice(0, 10) : "—"}</td>
                    <td style={{ color: t.textSub, fontSize: 12 }}>{c.first_order ? c.first_order.slice(0, 10) : "—"}</td>
                    <td style={{ color: t.textSub, fontSize: 12, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{c.top_domena ?? "—"}</td>
                    <td>
                      {c.winback_priority ? (
                        <span className="cl-badge" style={{ background: "#ef444422", color: "#ef4444", fontSize: 10 }}>
                          {c.winback_priority.includes("VIP") ? "VIP" : "✓"}
                        </span>
                      ) : null}
                    </td>
                    <td><Link href={`/crm/clients/${c.client_id}`} style={{ color: t.accent, fontSize: 12, textDecoration: "none" }}>→</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="cl-pagination">
            <button className="cl-page-btn" disabled={page === 1} onClick={() => setParam("page", String(page - 1))}>← Poprzednia</button>
            <span>Strona {page} z {totalPages} ({total.toLocaleString("pl-PL")} klientów)</span>
            <button className="cl-page-btn" disabled={page >= totalPages} onClick={() => setParam("page", String(page + 1))}>Następna →</button>
          </div>
        )}

        {/* ── Eksport do edrone ─────────────────────────────────────── */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${t.border}` }}>
          <EdroneExportDocs />
          <div style={{
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            padding: "14px 16px", background: t.card, border: `1px solid ${t.border}`,
            borderRadius: 10,
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2 }}>
                📧 Eksport do edrone
              </div>
              <div style={{ fontSize: 12, color: t.textSub }}>
                {loading ? "Ładowanie…" : `Eksport obejmie ${total.toLocaleString("pl-PL")} klientów z aktualnych filtrów`}
              </div>
            </div>
            <button
              className="cl-btn cl-btn-primary"
              onClick={() => setEdroneModal(true)}
              disabled={edroneLoading || loading || total === 0}
              style={{ opacity: (edroneLoading || loading || total === 0) ? 0.5 : 1 }}
            >
              {edroneLoading ? "Generowanie…" : "📧 Eksport do edrone"}
            </button>
          </div>
          {edroneResult && (
            <div style={{
              marginTop: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: edroneResult.missing > 0 ? "#f59e0b18" : "#22c55e18",
              border: `1px solid ${edroneResult.missing > 0 ? "#f59e0b44" : "#22c55e44"}`,
              color: t.text,
            }}>
              {edroneResult.exported > 0
                ? <>✓ Pobrano <strong>{edroneResult.exported.toLocaleString("pl-PL")}</strong> rekordów.</>
                : <>⚠ Brak rekordów z emailem.</>
              }
              {edroneResult.missing > 0 && (
                <span style={{ color: "#f59e0b", marginLeft: 8 }}>
                  ⚠ {edroneResult.missing.toLocaleString("pl-PL")} klientów bez emaila — wymagany <strong>re-import ETL</strong> (migracja 038 dodaje kolumnę email do master_key).
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Modal potwierdzenia ───────────────────────────────────── */}
        {edroneModal && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}>
            <div style={{
              background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
              padding: "28px 32px", maxWidth: 420, width: "90%",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: t.text, marginBottom: 12 }}>
                Potwierdzenie eksportu
              </div>
              <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7, marginBottom: 20 }}>
                Eksport odkryje adresy email <strong style={{ color: t.text }}>{total.toLocaleString("pl-PL")} klientów</strong>.
                <br />
                Operacja zostanie zalogowana w systemie bezpieczeństwa CRM.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  className="cl-btn cl-btn-ghost"
                  onClick={() => setEdroneModal(false)}
                >
                  Anuluj
                </button>
                <button
                  className="cl-btn cl-btn-primary"
                  onClick={exportEdrone}
                >
                  Pobierz CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
