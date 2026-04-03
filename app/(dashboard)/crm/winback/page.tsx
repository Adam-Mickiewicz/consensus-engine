"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  Diamond: "#a78bfa", Platinum: "#94a3b8", Gold: "#fbbf24",
  Returning: "#60a5fa", New: "#94a3b8",
};
const RISK_COLORS: Record<string, string> = {
  OK: "#22c55e", Risk: "#f59e0b", HighRisk: "#f97316", Lost: "#ef4444",
};

type Tier = "vip" | "all" | "lost" | "highrisk";

interface WinbackClient {
  client_id: string;
  legacy_segment: string | null;
  risk_level: string | null;
  ltv: number | null;
  orders_count: number | null;
  last_order: string | null;
  top_domena: string | null;
  winback_priority: string | null;
  days_since_last_order: number | null;
}

interface Stats {
  total: number;
  total_ltv: number;
  avg_days_inactive: number | null;
  vip_count: number;
  vip_ltv: number;
}

function Skeleton({ t }: { t: typeof DARK }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 16, padding: "13px 16px", borderBottom: `1px solid ${t.border}` }}>
          {[150, 80, 70, 80, 50, 90, 70, 110, 80].map((w, j) => (
            <div key={j} style={{ width: w, height: 14, borderRadius: 4, background: t.border, animation: "wb-pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

const PER_PAGE = 50;

function WinbackContent() {
  const dark = false;
  const t = dark ? DARK : LIGHT;

  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();

  // Local state for tier/sort/page (winback-specific)
  const [tier, setTier]   = useState<Tier>((searchParams.get("tier") as Tier) || "vip");
  const [sort, setSort]   = useState(searchParams.get("sort") || "ltv_desc");
  const [page, setPage]   = useState(Math.max(1, parseInt(searchParams.get("page") || "1") || 1));

  const [clients,    setClients]    = useState<WinbackClient[]>([]);
  const [stats,      setStats]      = useState<Stats | null>(null);
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

  // Sync tier/sort/page with URL
  useEffect(() => {
    setTier((searchParams.get("tier") as Tier) || "vip");
    setSort(searchParams.get("sort") || "ltv_desc");
    setPage(Math.max(1, parseInt(searchParams.get("page") || "1") || 1));
  }, [searchParams]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    if (key !== "page") p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }

  const buildQS = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tier", tier);
    p.set("sort", sort);
    p.set("page", String(page));
    p.set("per_page", String(PER_PAGE));
    return p.toString();
  }, [searchParams, tier, sort, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/crm/winback?${buildQS()}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setClients(d.clients ?? []);
        setStats(d.stats ?? null);
        setTotal(d.total ?? 0);
        setTotalPages(d.total_pages ?? 1);
        if (!worldsLoaded && d.worlds?.length) { setWorlds(d.worlds); setWorldsLoaded(true); }
        setLoading(false);
      })
      .catch((e: Error) => { if (cancelled) return; setError(e.message); setLoading(false); });

    return () => { cancelled = true; };
  }, [buildQS, worldsLoaded]);

  function exportCSV() {
    window.location.href = `/api/crm/winback/export?${buildQS()}`;
  }

  async function exportEdrone() {
    setEdroneLoading(true);
    setEdroneModal(false);
    setEdroneResult(null);
    try {
      const res  = await fetch(`/api/crm/clients/export-edrone?scope=winback`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const exported = Number(res.headers.get("X-Export-Count") ?? "0");
      const missing  = Number(res.headers.get("X-Missing-Emails") ?? "0");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `edrone_winback_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setEdroneResult({ exported, missing });
    } catch (e: unknown) {
      alert("Błąd eksportu: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setEdroneLoading(false);
    }
  }

  const TIER_OPTS: { value: Tier; label: string }[] = [
    { value: "vip",      label: "💎 VIP REANIMACJA" },
    { value: "all",      label: "Wszyscy" },
    { value: "lost",     label: "Utraceni" },
    { value: "highrisk", label: "Wysokie ryzyko" },
  ];

  return (
    <>
      <style>{`
        @keyframes wb-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        .wb-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 1100px; }
        .wb-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .wb-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 20px; }
        .wb-kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; margin-bottom: 20px; }
        .wb-kpi { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; padding: 14px 16px; }
        .wb-kpi-val { font-size: 22px; font-weight: 700; color: ${t.text}; font-variant-numeric: tabular-nums; line-height: 1.2; }
        .wb-kpi-label { font-size: 11px; color: ${t.textSub}; margin-top: 3px; }
        .wb-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; padding: 12px 14px; background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; margin-bottom: 16px; }
        .wb-filter-group { display: flex; flex-direction: column; gap: 4px; }
        .wb-filter-label { font-size: 10px; color: ${t.textSub}; text-transform: uppercase; letter-spacing: 0.06em; }
        .wb-tier-group { display: flex; gap: 4px; background: ${t.bg}; border: 1px solid ${t.border}; border-radius: 8px; padding: 4px; }
        .wb-tier-btn { padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; border: none; font-family: var(--font-geist-sans), system-ui, sans-serif; transition: background 0.15s, color 0.15s; white-space: nowrap; }
        .wb-select { padding: 7px 10px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.bg}; color: ${t.text}; font-size: 13px; font-family: var(--font-geist-sans), system-ui, sans-serif; outline: none; cursor: pointer; }
        .wb-btn { padding: 8px 16px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .wb-btn-ghost { background: none; color: ${t.textSub}; border: 1px solid ${t.border}; }
        .wb-btn-ghost:hover { color: ${t.text}; background: ${t.hover}; }
        .wb-table-wrap { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; overflow-x: auto; }
        .wb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .wb-table th { padding: 9px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid ${t.border}; text-align: left; white-space: nowrap; background: ${t.bg}; cursor: pointer; }
        .wb-table th:hover { color: ${t.text}; }
        .wb-table td { padding: 10px 14px; border-bottom: 1px solid ${t.border}; color: ${t.text}; white-space: nowrap; }
        .wb-table tr:last-child td { border-bottom: none; }
        .wb-table tr:hover td { background: ${t.hover}; }
        .wb-badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .wb-link { color: ${t.accent}; text-decoration: none; font-family: var(--font-geist-mono), monospace; font-size: 12px; letter-spacing: 0.02em; }
        .wb-link:hover { text-decoration: underline; }
        .wb-pagination { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 13px; color: ${t.textSub}; }
        .wb-page-btn { padding: 6px 14px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.card}; color: ${t.text}; cursor: pointer; font-size: 12px; }
        .wb-page-btn:hover:not(:disabled) { background: ${t.hover}; }
        .wb-page-btn:disabled { opacity: 0.4; cursor: default; }
        .wb-empty { padding: 60px 0; text-align: center; color: ${t.textSub}; font-size: 14px; }
        .wb-error { padding: 14px 18px; background: #ef444411; border: 1px solid #ef444444; border-radius: 8px; color: #ef4444; font-size: 13px; margin-bottom: 16px; }
      `}</style>

      <div className="wb-wrap">
        <h1 className="wb-title">Winback</h1>
        <p className="wb-sub">Klienci wymagający reaktywacji — Lost i High Risk</p>

        {stats && stats.vip_count > 0 && (
          <div style={{ background: "#ef444418", border: "1px solid #ef444466", borderRadius: 10, padding: "12px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 14 }}>🚨 VIP REANIMACJA: {stats.vip_count.toLocaleString("pl-PL")} klientów</span>
            <span style={{ color: "#ef4444", fontSize: 13 }}>· LTV do odzyskania: <strong>{stats.vip_ltv.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł</strong></span>
          </div>
        )}

        <div className="wb-kpis">
          <div className="wb-kpi"><div className="wb-kpi-val">{stats ? stats.total.toLocaleString("pl-PL") : "—"}</div><div className="wb-kpi-label">Łącznie do winback</div></div>
          <div className="wb-kpi"><div className="wb-kpi-val" style={{ color: "#ef4444" }}>{stats ? stats.total_ltv.toLocaleString("pl-PL", { maximumFractionDigits: 0 }) + " zł" : "—"}</div><div className="wb-kpi-label">Łączne LTV zagrożone</div></div>
          <div className="wb-kpi"><div className="wb-kpi-val" style={{ color: "#f59e0b" }}>{stats?.avg_days_inactive != null ? `${stats.avg_days_inactive} dni` : "—"}</div><div className="wb-kpi-label">Średnia nieaktywności</div></div>
          <div className="wb-kpi"><div className="wb-kpi-val" style={{ color: "#a78bfa" }}>{stats ? stats.vip_count.toLocaleString("pl-PL") : "—"}</div><div className="wb-kpi-label">VIP REANIMACJA</div></div>
        </div>

        <div className="wb-filters">
          <div className="wb-filter-group">
            <span className="wb-filter-label">Tryb</span>
            <div className="wb-tier-group">
              {TIER_OPTS.map(opt => (
                <button key={opt.value} className="wb-tier-btn" onClick={() => setParam("tier", opt.value)}
                  style={{ background: tier === opt.value ? t.accent : "none", color: tier === opt.value ? "#fff" : t.textSub }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="wb-filter-group">
            <span className="wb-filter-label">Domena</span>
            <select className="wb-select" value={searchParams.get("world") || ""} onChange={e => setParam("world", e.target.value)}>
              <option value="">Wszystkie</option>
              {worlds.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="wb-filter-group">
            <span className="wb-filter-label">Sortuj</span>
            <select className="wb-select" value={sort} onChange={e => setParam("sort", e.target.value)}>
              <option value="ltv_desc">LTV malejąco</option>
              <option value="ltv_asc">LTV rosnąco</option>
              <option value="last_order_asc">Najdłużej nieaktywni</option>
            </select>
          </div>
          <button className="wb-btn wb-btn-ghost" onClick={exportCSV} style={{ alignSelf: "flex-end" }}>📥 Eksportuj CSV</button>
        </div>

        {error && <div className="wb-error">⚠ {error}</div>}

        {loading ? <Skeleton t={t} /> : clients.length === 0 ? (
          <div className="wb-empty">Brak klientów w tym segmencie</div>
        ) : (
          <div className="wb-table-wrap">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>ID klienta</th>
                  <th>Segment</th>
                  <th>Risk</th>
                  <th style={{ textAlign: "right" }} onClick={() => setParam("sort", sort === "ltv_desc" ? "ltv_asc" : "ltv_desc")}>LTV {sort === "ltv_desc" ? "↓" : sort === "ltv_asc" ? "↑" : "↕"}</th>
                  <th style={{ textAlign: "right" }}>Zamówień</th>
                  <th onClick={() => setParam("sort", sort === "last_order_asc" ? "ltv_desc" : "last_order_asc")}>Ostatni zakup {sort === "last_order_asc" ? "↑" : "↕"}</th>
                  <th style={{ textAlign: "right" }}>Dni nieaktywności</th>
                  <th>Top domena</th>
                  <th>Winback</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => {
                  const days = c.days_since_last_order;
                  const daysColor = days != null && days > 730 ? "#ef4444" : days != null && days > 365 ? "#f97316" : t.textSub;
                  const isVip = c.winback_priority?.includes("VIP") || c.winback_priority?.includes("REANIMACJA");
                  return (
                    <tr key={c.client_id}>
                      <td><Link href={`/crm/clients/${c.client_id}`} className="wb-link">{c.client_id}</Link></td>
                      <td>{c.legacy_segment ? <span className="wb-badge" style={{ background: (SEG_COLORS[c.legacy_segment] ?? "#6366f1") + "22", color: SEG_COLORS[c.legacy_segment] ?? "#6366f1" }}>{c.legacy_segment}</span> : "—"}</td>
                      <td>{c.risk_level ? <span className="wb-badge" style={{ background: (RISK_COLORS[c.risk_level] ?? "#475569") + "22", color: RISK_COLORS[c.risk_level] ?? "#475569" }}>{c.risk_level}</span> : "—"}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: t.accent }}>{c.ltv != null ? `${Number(c.ltv).toLocaleString("pl-PL")} zł` : "—"}</td>
                      <td style={{ textAlign: "right", color: t.textSub, fontVariantNumeric: "tabular-nums" }}>{c.orders_count ?? "—"}</td>
                      <td style={{ color: t.textSub, fontSize: 12 }}>{c.last_order ? c.last_order.slice(0, 10) : "—"}</td>
                      <td style={{ textAlign: "right", color: daysColor, fontWeight: days != null && days > 365 ? 600 : 400, fontVariantNumeric: "tabular-nums" }}>{days != null ? `${days.toLocaleString("pl-PL")} dni` : "—"}</td>
                      <td style={{ color: t.textSub, fontSize: 12, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{c.top_domena ?? "—"}</td>
                      <td>{isVip ? <span className="wb-badge" style={{ background: "#ef444422", color: "#ef4444", fontSize: 10 }}>VIP</span> : c.winback_priority ? <span className="wb-badge" style={{ background: "#f9731622", color: "#f97316", fontSize: 10 }}>⚡</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="wb-pagination">
            <button className="wb-page-btn" disabled={page === 1} onClick={() => setParam("page", String(page - 1))}>← Poprzednia</button>
            <span>Strona {page} z {totalPages} ({total.toLocaleString("pl-PL")} klientów)</span>
            <button className="wb-page-btn" disabled={page >= totalPages} onClick={() => setParam("page", String(page + 1))}>Następna →</button>
          </div>
        )}

        {/* ── Eksport do edrone (Winback) ───────────────────────────── */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${t.border}` }}>
          <EdroneExportDocs />
          <div style={{
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            padding: "14px 16px", background: t.card, border: `1px solid ${t.border}`,
            borderRadius: 10,
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2 }}>
                📧 Eksport do edrone (Winback)
              </div>
              <div style={{ fontSize: 12, color: t.textSub }}>
                Eksportuje VIP REANIMACJA + Lost + HighRisk z tagami winback
              </div>
            </div>
            <button
              style={{
                padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                cursor: edroneLoading ? "not-allowed" : "pointer", border: "none",
                background: edroneLoading ? t.border : t.accent,
                color: edroneLoading ? t.textSub : "#fff",
                opacity: edroneLoading ? 0.6 : 1,
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                transition: "opacity 0.15s",
              }}
              disabled={edroneLoading}
              onClick={() => setEdroneModal(true)}
            >
              {edroneLoading ? "Generowanie…" : "📧 Eksport do edrone (Winback)"}
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
                  ⚠ {edroneResult.missing.toLocaleString("pl-PL")} klientów bez emaila — wymagany <strong>re-import ETL</strong>.
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
                Potwierdzenie eksportu — Winback
              </div>
              <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7, marginBottom: 20 }}>
                Eksport odkryje adresy email klientów z grupy winback
                (<strong style={{ color: t.text }}>VIP REANIMACJA + Lost + HighRisk</strong>).
                <br />
                Operacja zostanie zalogowana w systemie bezpieczeństwa CRM.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  style={{
                    padding: "7px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer",
                    background: "none", border: `1px solid ${t.border}`, color: t.textSub,
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  }}
                  onClick={() => setEdroneModal(false)}
                >
                  Anuluj
                </button>
                <button
                  style={{
                    padding: "7px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", border: "none", background: t.accent, color: "#fff",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  }}
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

export default function WinbackPage() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <WinbackContent />
    </Suspense>
  );
}
