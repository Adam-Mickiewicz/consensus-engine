"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useDarkMode } from "../../../hooks/useDarkMode";

// ─── Theme ────────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", badge: "#f0e8de", kpi: "#faf9f7",
};
const DARK = {
  bg: "#0a0a0a", surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", badge: "#2a1f14", kpi: "#0d0d0c",
};
const RISK_COLORS: Record<string, string> = {
  OK: "#34d399", Risk: "#fbbf24", HighRisk: "#f97316", Lost: "#ef4444",
};
const RISK_EMOJI: Record<string, string> = {
  OK: "✅", Risk: "⚠️", HighRisk: "🔴", Lost: "💀",
};
const SEG_EMOJI: Record<string, string> = {
  Diamond: "💎", Platinum: "🥈", Gold: "🥇", Returning: "🔄", New: "🆕",
};
const RISK_ORDER = ["OK", "Risk", "HighRisk", "Lost"];

type StaticData = {
  totalCustomers: number; totalLtv: number; avgLtv: number; vipReanimacja: number;
  bySegment: { segment: string; count: number; sumLtv: number; avgLtv: number; pct: number }[];
  byRisk:    { risk_level: string; count: number; pct: number }[];
  topDomains: { domain: string; count: number }[];
};

// ─── Formatting ───────────────────────────────────────────────────────────────
function fmtPln(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mln zł`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} tys. zł`;
  return `${n.toLocaleString("pl-PL")} zł`;
}
const fmtN = (n: number) => n.toLocaleString("pl-PL");
const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 18, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return <div className="ov-skel" style={{ width: w, height: h, borderRadius: r }} />;
}

// ─── Revenue Trend SVG ────────────────────────────────────────────────────────
function RevenueTrend({ rows, t }: { rows: { month: string; revenue: number }[]; t: typeof LIGHT }) {
  const [hov, setHov] = useState<number | null>(null);
  if (!rows.length) return <div style={{ padding: "40px", textAlign: "center", color: t.textSub, fontSize: 12 }}>Brak danych trendów</div>;
  const W = 580; const H = 150;
  const PAD = { top: 12, right: 14, bottom: 28, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxRev = Math.max(...rows.map(r => r.revenue), 1);
  const xStep = cW / Math.max(rows.length - 1, 1);
  const pts = rows.map((r, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + cH - (r.revenue / maxRev) * cH,
    ...r,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `M ${pts[0].x} ${PAD.top + cH} ${pts.map(p => `L ${p.x} ${p.y}`).join(" ")} L ${pts[pts.length - 1].x} ${PAD.top + cH} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="ov-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={t.accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD.top + cH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={t.border} strokeWidth={0.6} />
            <text x={PAD.left - 4} y={y + 3} fontSize={8} textAnchor="end" fill={t.textSub}>{fmtPln(maxRev * f)}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#ov-grad)" />
      <polyline points={polyline} fill="none" stroke={t.accent} strokeWidth={2} strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r={hov === i ? 5 : 3}
            fill={hov === i ? t.accent : t.surface} stroke={t.accent} strokeWidth={2}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            style={{ cursor: "default" }}
          />
          {i % 3 === 0 && (
            <text x={p.x} y={H - 5} fontSize={8} textAnchor="middle" fill={t.textSub}>{p.month}</text>
          )}
        </g>
      ))}
      {hov !== null && (() => {
        const p = pts[hov]; const TW = 110; const TH = 38;
        const tx = Math.min(Math.max(p.x - TW / 2, PAD.left), W - PAD.right - TW);
        const ty = Math.max(p.y - TH - 8, PAD.top);
        return (
          <g>
            <rect x={tx} y={ty} width={TW} height={TH} rx={5} fill={t.surface} stroke={t.border} />
            <text x={tx + TW / 2} y={ty + 13} fontSize={9} textAnchor="middle" fill={t.textSub}>{p.month}</text>
            <text x={tx + TW / 2} y={ty + 29} fontSize={11} textAnchor="middle" fontWeight="600" fill={t.accent}>{fmtPln(p.revenue)}</text>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OverviewView() {
  const { isDark: dark } = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  const [sData, setSData]         = useState<StaticData | null>(null);
  const [sLoading, setSLoading]   = useState(true);
  const [trend, setTrend]         = useState<{ month: string; revenue: number }[]>([]);
  const [diamonds, setDiamonds]   = useState<any[]>([]);
  const [orders, setOrders]       = useState<any[]>([]);
  const [dynLoading, setDynLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatic = useCallback(async () => {
    setSLoading(true);
    try {
      const res = await fetch("/api/crm/overview-full");
      if (res.ok) setSData(await res.json());
    } catch {}
    setSLoading(false);
  }, []);

  const loadDynamic = useCallback(async () => {
    setDynLoading(true);
    try {
      const [tRes, dRes, oRes] = await Promise.all([
        fetch("/api/crm/analytics/revenue-trend").then(r => r.json()).catch(() => ({ rows: [] })),
        fetch("/api/crm/analytics/top-diamonds").then(r => r.json()).catch(() => ({ rows: [] })),
        fetch("/api/crm/analytics/recent-orders").then(r => r.json()).catch(() => ({ rows: [] })),
      ]);
      setTrend(tRes.rows ?? []);
      setDiamonds(dRes.rows ?? []);
      setOrders(oRes.rows ?? []);
      setLastRefresh(new Date());
    } catch {}
    setDynLoading(false);
  }, []);

  useEffect(() => {
    loadStatic();
    loadDynamic();
    timer.current = setInterval(loadDynamic, 5 * 60 * 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [loadStatic, loadDynamic]);

  const maxDomain = Math.max(...(sData?.topDomains ?? []).map(d => d.count), 1);
  const maxRisk   = Math.max(...(sData?.byRisk ?? []).map(r => r.count), 1);
  const totalRisk = (sData?.byRisk ?? []).reduce((s, r) => s + r.count, 0) || 1;

  return (
    <>
      <style>{`
        .ov-skel { background: linear-gradient(90deg, ${t.kpi} 25%, ${t.hover} 50%, ${t.kpi} 75%); background-size: 200% 100%; animation: ov-shimmer 1.4s infinite; }
        @keyframes ov-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .ov-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .ov-panel { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 12px; overflow: hidden; }
        .ov-panel-hdr { padding: 11px 16px; border-bottom: 1px solid ${t.border}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: ${t.textSub}; display: flex; align-items: center; justify-content: space-between; }
        .ov-kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 18px; }
        .ov-kpi { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 12px; padding: 18px 20px; }
        .ov-kpi-val { font-family: var(--font-dm-serif), serif; font-size: 26px; margin-bottom: 3px; }
        .ov-kpi-label { font-size: 11px; color: ${t.textSub}; }
        .ov-row2 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 14px; }
        .ov-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .ov-feed-row { display: grid; grid-template-columns: 100px 1fr 80px; gap: 8px; align-items: center; padding: 7px 14px; border-bottom: 1px solid ${t.border}; font-size: 11px; }
        .ov-feed-row:last-child { border-bottom: none; }
        .ov-risk-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; color: #fff; }
        .ov-bar-bg { background: ${t.border}; border-radius: 3px; height: 6px; overflow: hidden; flex: 1; }
        .ov-bar-fill { height: 6px; border-radius: 3px; transition: width 0.5s; }
        .ov-domain-row { display: grid; grid-template-columns: 130px 1fr 50px; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid ${t.border}; font-size: 11px; }
        .ov-domain-row:last-child { border-bottom: none; }
        @media (max-width: 1100px) { .ov-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) { .ov-row2 { grid-template-columns: 1fr; } .ov-row3 { grid-template-columns: 1fr; } }
        @media (max-width: 600px) { .ov-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div className="ov-wrap">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-dm-serif,serif)", fontSize: 26, color: t.text, margin: "0 0 3px" }}>
              Analityka CRM — Overview 360°
            </h1>
            <p style={{ fontSize: 12, color: t.textSub, margin: 0 }}>
              Kompletny przegląd bazy klientów · odświeżono o {lastRefresh.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <button onClick={() => { loadStatic(); loadDynamic(); }} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "6px 13px",
            fontSize: 12, borderRadius: 7, cursor: "pointer", flexShrink: 0,
            background: t.kpi, border: `1px solid ${t.border}`, color: t.text,
            fontFamily: "var(--font-geist-sans,sans-serif)",
          }}>
            🔄 Odśwież
          </button>
        </div>

        {/* ─── Row 1: 5 KPI cards ─── */}
        <div className="ov-kpi-grid">
          {sLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ov-kpi">
                <Skel h={26} r={4} /><div style={{ marginTop: 8 }}><Skel h={12} w="60%" r={3} /></div>
              </div>
            ))
          ) : (() => {
            const d = sData;
            const diamondRow = d?.bySegment.find(s => s.segment === "Diamond");
            const kpis = [
              { label: "Łączna liczba klientów", val: fmtN(d?.totalCustomers ?? 0), color: t.text },
              { label: "LTV łączne", val: fmtPln(d?.totalLtv ?? 0), color: t.accent },
              { label: "Średnie LTV na klienta", val: fmtPln(d?.avgLtv ?? 0), color: t.text },
              { label: "VIP do reanimacji 🚨", val: fmtN(d?.vipReanimacja ?? 0), color: "#f97316" },
              { label: "💎 Diamond klientów", val: fmtN(diamondRow?.count ?? 0), color: "#60a5fa" },
            ];
            return kpis.map(k => (
              <div key={k.label} className="ov-kpi">
                <div className="ov-kpi-val" style={{ color: k.color }}>{k.val}</div>
                <div className="ov-kpi-label">{k.label}</div>
              </div>
            ));
          })()}
        </div>

        {/* ─── Row 2: Revenue (2/3) + VIP + Feed (1/3) ─── */}
        <div className="ov-row2">
          {/* Left: Revenue trend + segment table */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ov-panel">
              <div className="ov-panel-hdr"><span>📈 Trend przychodów — ostatnie 18 miesięcy</span></div>
              <div style={{ padding: "14px 16px 8px" }}>
                {dynLoading ? <Skel h={150} r={8} /> : <RevenueTrend rows={trend} t={t} />}
              </div>
            </div>

            {/* Segment table */}
            <div className="ov-panel">
              <div className="ov-panel-hdr"><span>👥 Segmenty klientów</span></div>
              {sLoading ? (
                <div style={{ padding: 14 }}><Skel h={120} r={6} /></div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Segment", "Klienci", "% bazy", "Suma LTV", "Avg LTV"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: h === "Segment" ? "left" : "right", color: t.textSub, fontSize: 10, fontWeight: 500, borderBottom: `1px solid ${t.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(sData?.bySegment ?? []).map(s => (
                      <tr key={s.segment}>
                        <td style={{ padding: "9px 12px", borderBottom: `1px solid ${t.border}` }}>
                          <Link href={`/crm/clients?segment=${s.segment}`} style={{ textDecoration: "none", color: t.text }}>
                            {SEG_EMOJI[s.segment]} {s.segment}
                          </Link>
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums", color: t.text }}>{fmtN(s.count)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${t.border}`, color: t.textSub }}>{s.pct}%</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums", color: t.textSub }}>{fmtPln(s.sumLtv)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums", color: t.accent }}>{fmtPln(s.avgLtv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: VIP alerts + live order feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* VIP alerts */}
            <div className="ov-panel">
              <div className="ov-panel-hdr"><span>🚨 VIP do reanimacji</span></div>
              <div style={{ padding: "14px 16px" }}>
                {sLoading ? <Skel h={70} r={8} /> : (sData?.vipReanimacja ?? 0) === 0 ? (
                  <div style={{ textAlign: "center", color: t.textSub, fontSize: 12, padding: "12px 0" }}>
                    Brak VIP-ów do reanimacji 🎉
                  </div>
                ) : (
                  <>
                    <div style={{ padding: "12px 14px", background: "#f9731618", border: "1px solid #f9731644", borderRadius: 8, marginBottom: 10 }}>
                      <div style={{ fontSize: 24, fontFamily: "var(--font-dm-serif,serif)", color: "#f97316" }}>
                        {fmtN(sData?.vipReanimacja ?? 0)}
                      </div>
                      <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>
                        Diamond/Platinum w statusie Lost lub HighRisk
                      </div>
                    </div>
                    <Link href="/crm/clients?segment=Diamond&risk=Lost" style={{
                      display: "block", padding: "7px 12px", borderRadius: 7, fontSize: 11,
                      background: t.kpi, border: `1px solid ${t.border}`, textDecoration: "none",
                      color: t.accent, textAlign: "center",
                    }}>
                      Zobacz listę VIP →
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Live order feed */}
            <div className="ov-panel" style={{ flex: 1 }}>
              <div className="ov-panel-hdr">
                <span>⚡ Ostatnie zamówienia</span>
                {dynLoading && <span style={{ fontSize: 9, color: t.textSub, fontWeight: 400 }}>ładowanie…</span>}
              </div>
              {dynLoading ? (
                <div style={{ padding: "8px 0" }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="ov-feed-row"><Skel h={11} /><Skel h={11} /><Skel h={11} /></div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: t.textSub, fontSize: 12 }}>Brak zamówień</div>
              ) : orders.slice(0, 10).map((o: any, i: number) => (
                <div key={i} className="ov-feed-row">
                  <span style={{ color: t.textSub, fontVariantNumeric: "tabular-nums" }}>{fmtDate(o.order_date)}</span>
                  <span style={{ color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={o.product_name}>{o.product_name}</span>
                  <span style={{ textAlign: "right", color: t.accent, fontVariantNumeric: "tabular-nums" }}>
                    {o.line_total ? fmtPln(Number(o.line_total)) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Row 3: Risk, Domains, Top Diamonds ─── */}
        <div className="ov-row3">
          {/* Risk churn */}
          <div className="ov-panel">
            <div className="ov-panel-hdr"><span>⚠️ Ryzyko churnu</span></div>
            {sLoading ? (
              <div style={{ padding: 14 }}><Skel h={120} r={6} /></div>
            ) : (
              RISK_ORDER.map(rl => {
                const row = (sData?.byRisk ?? []).find(r => r.risk_level === rl);
                const count = row?.count ?? 0;
                const max   = Math.max(...(sData?.byRisk ?? []).map(r => r.count), 1);
                return (
                  <div key={rl} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: `1px solid ${t.border}` }}>
                    <span className="ov-risk-badge" style={{ background: RISK_COLORS[rl], minWidth: 80 }}>
                      {RISK_EMOJI[rl]} {rl}
                    </span>
                    <div className="ov-bar-bg">
                      <div className="ov-bar-fill" style={{ width: `${(count / max) * 100}%`, background: RISK_COLORS[rl] }} />
                    </div>
                    <span style={{ fontSize: 12, color: t.text, fontVariantNumeric: "tabular-nums", minWidth: 60, textAlign: "right" }}>
                      {fmtN(count)} <span style={{ color: t.textSub, fontSize: 10 }}>({Math.round(count / totalRisk * 100)}%)</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Top domains */}
          <div className="ov-panel">
            <div className="ov-panel-hdr"><span>🌐 Top domeny tematyczne</span></div>
            <div style={{ padding: "4px 16px" }}>
              {sLoading ? <Skel h={140} r={6} /> : (sData?.topDomains ?? []).map((d, i) => (
                <Link key={d.domain} href={`/crm/analytics/behavior`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="ov-domain-row">
                    <span style={{ color: t.textSub }}>#{i + 1} {d.domain}</span>
                    <div className="ov-bar-bg">
                      <div className="ov-bar-fill" style={{ width: `${(d.count / maxDomain) * 100}%`, background: t.accent }} />
                    </div>
                    <span style={{ color: t.textSub, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtN(d.count)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Diamond clients */}
          <div className="ov-panel">
            <div className="ov-panel-hdr"><span>💎 Top Diamond klienci (LTV)</span></div>
            {dynLoading ? (
              <div style={{ padding: 14 }}><Skel h={140} r={6} /></div>
            ) : diamonds.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: t.textSub, fontSize: 12 }}>Brak danych</div>
            ) : diamonds.slice(0, 8).map((d: any, i: number) => (
              <div key={d.client_id} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 8, padding: "8px 14px", borderBottom: `1px solid ${t.border}`, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: t.textSub, fontVariantNumeric: "tabular-nums" }}>#{i + 1}</span>
                <div>
                  <div style={{ fontSize: 11, color: t.text, fontFamily: "var(--font-geist-mono,monospace)", letterSpacing: "-0.02em" }}>{d.client_id}</div>
                  <div style={{ fontSize: 10, color: t.textSub, marginTop: 1 }}>
                    {d.orders_count} zam.{d.top_domena ? ` · ${d.top_domena}` : ""}
                    {d.risk_level && d.risk_level !== "OK" && (
                      <span style={{ marginLeft: 5, color: RISK_COLORS[d.risk_level] ?? t.textSub }}>{RISK_EMOJI[d.risk_level]}</span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: t.accent, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtPln(Number(d.ltv))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
