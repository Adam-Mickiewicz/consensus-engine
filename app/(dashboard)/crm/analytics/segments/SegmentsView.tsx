"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useDarkMode } from "../../../../hooks/useDarkMode";

// ── Theme ────────────────────────────────────────────────────────────────────
const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", kpi: "#faf9f7",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", kpi: "#0d0d0c",
};

// ── Churn colors ─────────────────────────────────────────────────────────────
const CHURN_COLOR: Record<string, string> = {
  KRYTYCZNY: "#ef4444",
  WYSOKI:    "#f97316",
  ŚREDNI:    "#eab308",
  NISKI:     "#84cc16",
  OK:        "#22c55e",
};
const CHURN_TABS = ["KRYTYCZNY", "WYSOKI", "ŚREDNI", "NISKI"] as const;
type ChurnTab = (typeof CHURN_TABS)[number];

// ── Types ────────────────────────────────────────────────────────────────────
type Summary = {
  collectors_count: number; single_product_count: number; multi_world_count: number;
  critical_churn: number; high_churn: number; avg_churn_score: number;
} | null;

type CollectorRow = { client_id: string; ulubiony_swiat: string; unique_products: number; total_orders: number; products_per_order: number; first_order: string; last_order: string };
type SingleRow    = { client_id: string; product_name: string; ean: number; purchase_count: number; total_spent: number; first_order: string; last_order: string };
type WorldRow     = { client_id: string; all_worlds: string[]; world_count: number; first_order: string; last_order: string };
type ChurnRow     = { client_id: string; legacy_segment: string; risk_level: string; ltv: number; days_inactive: number; orders_count: number; avg_order_value: number; churn_priority: string; churn_score: number };

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pl-PL", { year: "numeric", month: "short", day: "numeric" });
}

function downloadCsv(rows: ChurnRow[], priority: string) {
  const header = "client_id,segment,risk,ltv,dni_nieaktywnosci,zamowienia,avg_order,churn_score";
  const lines = rows.map(r =>
    [r.client_id, r.legacy_segment, r.risk_level, r.ltv, r.days_inactive, r.orders_count, r.avg_order_value, r.churn_score].join(",")
  );
  const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `churn_${priority.toLowerCase()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Scatter Plot ─────────────────────────────────────────────────────────────
const SCATTER_W = 520;
const SCATTER_H = 320;
const PAD = { top: 20, right: 20, bottom: 40, left: 60 };

function ScatterPlot({ data, t }: { data: ChurnRow[]; t: typeof LIGHT }) {
  const [hover, setHover] = useState<ChurnRow | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const subset = useMemo(() =>
    data.filter(r => r.churn_priority !== "OK").slice(0, 400),
    [data]
  );

  const maxX = Math.min(Math.max(...subset.map(r => r.days_inactive), 1), 730);
  const maxY = Math.max(...subset.map(r => r.ltv), 1);

  const plotW = SCATTER_W - PAD.left - PAD.right;
  const plotH = SCATTER_H - PAD.top - PAD.bottom;

  function px(days: number) { return PAD.left + (Math.min(days, maxX) / maxX) * plotW; }
  function py(ltv: number)  { return PAD.top  + plotH - (Math.min(ltv, maxY) / maxY) * plotH; }

  const xTicks = [0, Math.round(maxX * 0.25), Math.round(maxX * 0.5), Math.round(maxX * 0.75), maxX];
  const yTicks = [0, Math.round(maxY * 0.25), Math.round(maxY * 0.5), Math.round(maxY * 0.75), maxY];

  return (
    <div style={{ position: "relative" }}>
      <svg
        width={SCATTER_W} height={SCATTER_H}
        style={{ display: "block", maxWidth: "100%" }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid lines */}
        {yTicks.map(v => (
          <line key={v} x1={PAD.left} x2={SCATTER_W - PAD.right} y1={py(v)} y2={py(v)}
            stroke={t.border} strokeWidth={0.5} />
        ))}
        {/* Axis labels */}
        {xTicks.map(v => (
          <text key={v} x={px(v)} y={SCATTER_H - 8} textAnchor="middle" fontSize={9} fill={t.textSub}>{v}d</text>
        ))}
        {yTicks.slice(1).map(v => (
          <text key={v} x={PAD.left - 6} y={py(v) + 3} textAnchor="end" fontSize={9} fill={t.textSub}>
            {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
          </text>
        ))}
        {/* Axis lines */}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={SCATTER_H - PAD.bottom} stroke={t.border} />
        <line x1={PAD.left} x2={SCATTER_W - PAD.right} y1={SCATTER_H - PAD.bottom} y2={SCATTER_H - PAD.bottom} stroke={t.border} />
        {/* Axis titles */}
        <text x={SCATTER_W / 2} y={SCATTER_H - 2} textAnchor="middle" fontSize={10} fill={t.textSub}>Dni nieaktywności</text>
        <text x={12} y={SCATTER_H / 2} textAnchor="middle" fontSize={10} fill={t.textSub}
          transform={`rotate(-90, 12, ${SCATTER_H / 2})`}>LTV (zł)</text>

        {/* Points */}
        {subset.map((r, i) => (
          <circle
            key={i}
            cx={px(r.days_inactive)} cy={py(r.ltv)}
            r={r.churn_priority === "KRYTYCZNY" ? 5 : r.churn_priority === "WYSOKI" ? 4 : 3}
            fill={CHURN_COLOR[r.churn_priority] ?? "#888"}
            fillOpacity={0.75}
            stroke={hover?.client_id === r.client_id ? "#fff" : "none"}
            strokeWidth={1.5}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => {
              setHover(r);
              const rect = (e.target as SVGCircleElement).closest("svg")!.getBoundingClientRect();
              setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hover && (
        <div style={{
          position: "absolute",
          left: Math.min(mouse.x + 12, SCATTER_W - 160),
          top: Math.max(mouse.y - 60, 0),
          background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8,
          padding: "8px 12px", fontSize: 11, pointerEvents: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)", zIndex: 10, minWidth: 150,
        }}>
          <div style={{ fontWeight: 700, color: t.text, marginBottom: 3 }}>{hover.client_id}</div>
          <div style={{ color: CHURN_COLOR[hover.churn_priority], fontWeight: 600 }}>{hover.churn_priority}</div>
          <div style={{ color: t.textSub }}>{hover.legacy_segment} · {hover.risk_level}</div>
          <div style={{ color: t.text }}>LTV: {hover.ltv.toFixed(0)} zł</div>
          <div style={{ color: t.textSub }}>Nieaktywny: {hover.days_inactive} dni</div>
          <div style={{ color: t.textSub }}>Score: {hover.churn_score}</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
        {Object.entries(CHURN_COLOR).filter(([k]) => k !== "OK").map(([k, clr]) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: t.textSub }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: clr, display: "inline-block" }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SegmentsView({
  summary, collectors, single, worlds, churn,
}: {
  summary: Summary;
  collectors: CollectorRow[];
  single: SingleRow[];
  worlds: WorldRow[];
  churn: ChurnRow[];
}) {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;
  const [churnTab, setChurnTab] = useState<ChurnTab>("KRYTYCZNY");

  const churnFiltered = useMemo(() =>
    churn.filter(r => r.churn_priority === churnTab).slice(0, 50),
    [churn, churnTab]
  );

  const churnCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of churn) counts[r.churn_priority] = (counts[r.churn_priority] ?? 0) + 1;
    return counts;
  }, [churn]);

  if (!summary) {
    return (
      <div style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", color: t.textSub, padding: "60px 0", textAlign: "center", fontSize: 15 }}>
        Brak danych — wgraj CSV w zakładce <strong style={{ color: t.text }}>Import</strong>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .seg-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 1100px; }
        .seg-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .seg-sub   { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .seg-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .seg-block { margin-bottom: 32px; }
        .seg-card  { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .seg-two   { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }

        .seg-kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 32px; }
        .seg-kpi      { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 10px; padding: 16px 18px; }
        .seg-kpi-val  { font-size: 26px; font-weight: 700; color: ${t.accent}; line-height: 1; margin-bottom: 4px; }
        .seg-kpi-lbl  { font-size: 10px; color: ${t.textSub}; text-transform: uppercase; letter-spacing: 0.06em; }

        .seg-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
        .seg-tbl th { padding: 8px 12px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: left; white-space: nowrap; }
        .seg-tbl td { padding: 8px 12px; border-bottom: 1px solid ${t.border}; color: ${t.text}; }
        .seg-tbl tr:last-child td { border-bottom: none; }
        .seg-tbl tr:hover td { background: ${t.hover}; }
        .seg-tbl td:last-child { text-align: right; }

        .seg-tabs { display: flex; gap: 0; border-bottom: 1px solid ${t.border}; overflow-x: auto; }
        .seg-tab  { padding: 10px 16px; font-size: 12px; cursor: pointer; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; transition: color 0.1s; }
        .seg-tab.active { font-weight: 600; border-bottom-color: currentColor; }

        .seg-badge { display: inline-block; padding: 2px 7px; border-radius: 8px; font-size: 10px; font-weight: 600; }
        .seg-pill  { display: inline-block; padding: 1px 6px; border-radius: 6px; font-size: 10px; background: ${t.hover}; color: ${t.textSub}; margin: 1px; border: 1px solid ${t.border}; }
        .seg-link  { color: ${t.accent}; text-decoration: none; }
        .seg-link:hover { text-decoration: underline; }
        .seg-export { padding: 5px 12px; font-size: 11px; background: ${t.hover}; border: 1px solid ${t.border}; border-radius: 6px; color: ${t.textSub}; cursor: pointer; margin-left: auto; }
        .seg-export:hover { color: ${t.text}; }

        @media (max-width: 900px) {
          .seg-kpi-grid { grid-template-columns: repeat(3, 1fr); }
          .seg-two { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .seg-kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="seg-wrap">
        <h1 className="seg-title">Segmentacja Zaawansowana</h1>
        <p className="seg-sub">Kolekcjonerzy, klienci jednoproduktowi, ewolucja światów i model predykcyjny churnu</p>

        {/* ── A: KPI HERO ─────────────────────────────────────────── */}
        <div className="seg-kpi-grid">
          <div className="seg-kpi">
            <div className="seg-kpi-val">{summary.collectors_count}</div>
            <div className="seg-kpi-lbl">Kolekcjonerzy</div>
          </div>
          <div className="seg-kpi">
            <div className="seg-kpi-val">{summary.single_product_count}</div>
            <div className="seg-kpi-lbl">Jednoproduktowi</div>
          </div>
          <div className="seg-kpi">
            <div className="seg-kpi-val">{summary.multi_world_count}</div>
            <div className="seg-kpi-lbl">Multi-światowi</div>
          </div>
          <div className="seg-kpi">
            <div className="seg-kpi-val" style={{ color: "#ef4444" }}>{summary.critical_churn}</div>
            <div className="seg-kpi-lbl">Churn KRYTYCZNY</div>
          </div>
          <div className="seg-kpi">
            <div className="seg-kpi-val" style={{ color: "#f97316" }}>{summary.high_churn}</div>
            <div className="seg-kpi-lbl">Churn WYSOKI</div>
          </div>
        </div>

        {/* ── B: CHURN SCATTER PLOT ────────────────────────────────── */}
        <div className="seg-block">
          <div className="seg-section">Churn Risk Matrix — dni nieaktywności vs LTV</div>
          <div className="seg-card" style={{ padding: "20px" }}>
            {churn.length === 0 ? (
              <div style={{ color: t.textSub, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Brak danych churn</div>
            ) : (
              <ScatterPlot data={churn} t={t} />
            )}
          </div>
        </div>

        {/* ── C + D: Collectors + Single product tables ────────────── */}
        <div className="seg-two">
          {/* C: Collectors */}
          <div>
            <div className="seg-section">Kolekcjonerzy — top {collectors.length}</div>
            <div className="seg-card">
              <table className="seg-tbl">
                <thead>
                  <tr>
                    <th>Klient</th>
                    <th>Świat</th>
                    <th style={{ textAlign: "right" }}>Prod.</th>
                    <th style={{ textAlign: "right" }}>Zam.</th>
                    <th style={{ textAlign: "right" }}>Profil</th>
                  </tr>
                </thead>
                <tbody>
                  {collectors.map((r, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.client_id}
                      </td>
                      <td>
                        <span className="seg-badge" style={{ background: `${t.accent}18`, color: t.accent }}>
                          {r.ulubiony_swiat}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{r.unique_products}</td>
                      <td style={{ textAlign: "right", color: t.textSub }}>{r.total_orders}</td>
                      <td>
                        <Link href={`/crm/clients/${encodeURIComponent(r.client_id)}`} className="seg-link">→</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* D: Single product */}
          <div>
            <div className="seg-section">Jednoproduktowi — top {single.length}</div>
            <div className="seg-card">
              <div style={{ padding: "10px 14px 6px", fontSize: 11, color: t.textSub, borderBottom: `1px solid ${t.border}` }}>
                {summary.single_product_count} klientów kupiło tylko jeden produkt w całej historii
              </div>
              <table className="seg-tbl">
                <thead>
                  <tr>
                    <th>Klient</th>
                    <th>Produkt</th>
                    <th style={{ textAlign: "right" }}>Razy</th>
                    <th style={{ textAlign: "right" }}>Wydał</th>
                    <th style={{ textAlign: "right" }}>Profil</th>
                  </tr>
                </thead>
                <tbody>
                  {single.map((r, i) => (
                    <tr key={i}>
                      <td style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.client_id}
                      </td>
                      <td style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.textSub, fontSize: 11 }}>
                        {r.product_name}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{r.purchase_count}×</td>
                      <td style={{ textAlign: "right", color: t.accent }}>{r.total_spent.toFixed(0)} zł</td>
                      <td>
                        <Link href={`/crm/clients/${encodeURIComponent(r.client_id)}`} className="seg-link">→</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── E: World Evolution ──────────────────────────────────── */}
        <div className="seg-block">
          <div className="seg-section">Ewolucja światów — top {worlds.length} klientów multi-światowych</div>
          <div className="seg-card">
            <table className="seg-tbl">
              <thead>
                <tr>
                  <th>Klient</th>
                  <th>Światy</th>
                  <th style={{ textAlign: "center" }}>Liczba</th>
                  <th>Pierwsza wizyta</th>
                  <th>Ostatnia wizyta</th>
                  <th style={{ textAlign: "right" }}>Profil</th>
                </tr>
              </thead>
              <tbody>
                {worlds.map((r, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.client_id}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, maxWidth: 300 }}>
                        {(r.all_worlds ?? []).map(w => (
                          <span key={w} className="seg-pill">{w}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: r.world_count >= 4 ? `${t.accent}22` : t.hover,
                        color: r.world_count >= 4 ? t.accent : t.text,
                      }}>
                        {r.world_count}
                      </span>
                    </td>
                    <td style={{ color: t.textSub, fontSize: 11 }}>{fmtDate(r.first_order)}</td>
                    <td style={{ color: t.textSub, fontSize: 11 }}>{fmtDate(r.last_order)}</td>
                    <td>
                      <Link href={`/crm/clients/${encodeURIComponent(r.client_id)}`} className="seg-link">→</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── F: Churn Priority Tabs ──────────────────────────────── */}
        <div className="seg-block">
          <div className="seg-section">Churn Priority — lista klientów do kontaktu</div>
          <div className="seg-card">
            {/* Tab bar */}
            <div className="seg-tabs">
              {CHURN_TABS.map(tab => (
                <button
                  key={tab}
                  className={"seg-tab" + (churnTab === tab ? " active" : "")}
                  style={{ color: churnTab === tab ? CHURN_COLOR[tab] : t.textSub }}
                  onClick={() => setChurnTab(tab)}
                >
                  {tab}
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400 }}>
                    ({churnCounts[tab] ?? 0}{churn.length >= 500 && (churnCounts[tab] ?? 0) >= 50 ? "+" : ""})
                  </span>
                </button>
              ))}
              <button
                className="seg-export"
                onClick={() => downloadCsv(churnFiltered, churnTab)}
                title="Eksportuj CSV"
              >
                ↓ CSV
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="seg-tbl">
                <thead>
                  <tr>
                    <th>Klient</th>
                    <th>Segment</th>
                    <th>Risk</th>
                    <th style={{ textAlign: "right" }}>LTV</th>
                    <th style={{ textAlign: "right" }}>Dni bez zam.</th>
                    <th style={{ textAlign: "right" }}>Zam.</th>
                    <th style={{ textAlign: "right" }}>Score</th>
                    <th style={{ textAlign: "right" }}>Profil</th>
                  </tr>
                </thead>
                <tbody>
                  {churnFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", color: t.textSub, padding: "20px 12px" }}>
                        Brak klientów w tej kategorii
                      </td>
                    </tr>
                  ) : (
                    churnFiltered.map((r, i) => (
                      <tr key={i}>
                        <td style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.client_id}
                        </td>
                        <td>
                          <span className="seg-badge" style={{
                            background: { Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24", Returning: "#34d399", New: "#f87171" }[r.legacy_segment] + "22",
                            color: { Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24", Returning: "#34d399", New: "#f87171" }[r.legacy_segment] ?? t.textSub,
                          }}>
                            {r.legacy_segment}
                          </span>
                        </td>
                        <td style={{ color: t.textSub, fontSize: 11 }}>{r.risk_level}</td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: t.accent }}>
                          {r.ltv.toFixed(0)} zł
                        </td>
                        <td style={{ textAlign: "right", color: r.days_inactive > 365 ? "#ef4444" : t.textSub }}>
                          {r.days_inactive ?? "—"}
                        </td>
                        <td style={{ textAlign: "right", color: t.textSub }}>{r.orders_count}</td>
                        <td style={{ textAlign: "right" }}>
                          <span style={{
                            display: "inline-block", padding: "1px 6px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: CHURN_COLOR[r.churn_priority] + "22",
                            color: CHURN_COLOR[r.churn_priority],
                          }}>
                            {r.churn_score}
                          </span>
                        </td>
                        <td>
                          <Link href={`/crm/clients/${encodeURIComponent(r.client_id)}`} className="seg-link">→</Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
