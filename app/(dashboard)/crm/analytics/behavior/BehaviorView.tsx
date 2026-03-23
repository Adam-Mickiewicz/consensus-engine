"use client";
import { useDarkMode } from "../../../../hooks/useDarkMode";

// ── Theme ────────────────────────────────────────────────────────────────────
const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", kpi: "#faf9f7", amber10: "#fef3c7",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", kpi: "#0d0d0c", amber10: "#1c1208",
};

// ── Labels ───────────────────────────────────────────────────────────────────
const DOW_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
const DOW_FULL  = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const MON_SHORT = ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"];

// ── Pie chart helper ─────────────────────────────────────────────────────────
function pieSlicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
}

// ── Types ────────────────────────────────────────────────────────────────────
type HeatCell = { dow: number; month: number; cnt: number };
type DistEntry = { dow?: number; month?: number; cnt: number };

type Segments = {
  total_clients: number;
  promo_hunters_count: number; full_price_count: number; mixed_count: number;
  promo_hunters_pct: number;   full_price_pct: number;   mixed_pct: number;
  overall_avg_basket: number;
  basket_lt50: number; basket_50_100: number; basket_100_200: number; basket_200plus: number;
  avg_days_between_orders: number;
  gaps_lt30: number; gaps_30_90: number; gaps_90_180: number; gaps_180_365: number; gaps_365plus: number;
  dow_distribution: DistEntry[] | null;
  month_distribution: DistEntry[] | null;
  heatmap: HeatCell[] | null;
} | null;

type CobuyRow = { product_a: string; product_b: string; co_purchases: number };

// ── Component ────────────────────────────────────────────────────────────────
export default function BehaviorView({
  segments,
  cobuying,
}: {
  segments: Segments;
  cobuying: CobuyRow[];
}) {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  if (!segments) {
    return (
      <div style={{
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        color: t.textSub, padding: "60px 0", textAlign: "center", fontSize: 15,
      }}>
        Brak danych — wgraj CSV w zakładce <strong style={{ color: t.text }}>Import</strong>
      </div>
    );
  }

  // ── Derived values ──
  const topDow = segments.dow_distribution?.[0]?.dow ?? 5;
  const topDowName = DOW_FULL[topDow] ?? "—";

  const heatMap: Record<string, number> = {};
  let heatMax = 1;
  for (const cell of segments.heatmap ?? []) {
    const key = `${cell.dow}-${cell.month}`;
    heatMap[key] = cell.cnt;
    if (cell.cnt > heatMax) heatMax = cell.cnt;
  }

  const basketBuckets = [
    { label: "< 50 zł",    value: segments.basket_lt50 },
    { label: "50–100 zł",  value: segments.basket_50_100 },
    { label: "100–200 zł", value: segments.basket_100_200 },
    { label: "200+ zł",    value: segments.basket_200plus },
  ];
  const maxBasket = Math.max(...basketBuckets.map(b => b.value), 1);
  const domBasketIdx = basketBuckets.reduce((mi, b, i) => b.value > basketBuckets[mi].value ? i : mi, 0);

  const gapBuckets = [
    { label: "< 30 dni",    value: segments.gaps_lt30 },
    { label: "30–90 dni",   value: segments.gaps_30_90 },
    { label: "90–180 dni",  value: segments.gaps_90_180 },
    { label: "180–365 dni", value: segments.gaps_180_365 },
    { label: "365+ dni",    value: segments.gaps_365plus },
  ];
  const maxGap = Math.max(...gapBuckets.map(b => b.value), 1);

  // Pie chart
  const pieData = [
    { label: "Promo Hunters", pct: Number(segments.promo_hunters_pct), count: segments.promo_hunters_count, color: "#f59e0b" },
    { label: "Mixed",          pct: Number(segments.mixed_pct),          count: segments.mixed_count,          color: "#94a3b8" },
    { label: "Full-Price",     pct: Number(segments.full_price_pct),     count: segments.full_price_count,     color: "#34d399" },
  ];
  let startAngle = -Math.PI / 2;
  const pieSlices = pieData.map(seg => {
    const sweep = (seg.pct / 100) * 2 * Math.PI;
    const path = pieSlicePath(80, 80, 70, startAngle, startAngle + sweep);
    startAngle += sweep;
    return { ...seg, path };
  });

  return (
    <>
      <style>{`
        .bha-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 1100px; }
        .bha-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .bha-sub   { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .bha-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .bha-block { margin-bottom: 32px; }
        .bha-card  { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .bha-two   { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
        .bha-three { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 32px; }

        /* KPI cards */
        .bha-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .bha-kpi  { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 10px; padding: 18px 20px; }
        .bha-kpi-val  { font-size: 28px; font-weight: 700; color: ${t.accent}; line-height: 1; margin-bottom: 4px; }
        .bha-kpi-lbl  { font-size: 11px; color: ${t.textSub}; text-transform: uppercase; letter-spacing: 0.06em; }

        /* Bar rows */
        .bha-bar-row  { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .bha-bar-row:last-child { border-bottom: none; }
        .bha-bar-bg   { flex: 1; background: ${t.border}; border-radius: 4px; height: 8px; overflow: hidden; }
        .bha-bar-fill { height: 8px; border-radius: 4px; }
        .bha-bar-lbl  { min-width: 100px; color: ${t.text}; font-size: 12px; }
        .bha-bar-num  { min-width: 60px; text-align: right; color: ${t.textSub}; font-size: 12px; }

        /* Heatmap */
        .bha-heat-grid  { display: grid; grid-template-columns: 28px repeat(12, 1fr); gap: 3px; padding: 16px; }
        .bha-heat-label { font-size: 10px; color: ${t.textSub}; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px; }
        .bha-heat-cell  { border-radius: 3px; aspect-ratio: 1; }
        .bha-heat-month { font-size: 9px; color: ${t.textSub}; text-align: center; }

        /* Table */
        .bha-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bha-tbl th { padding: 8px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: left; }
        .bha-tbl td { padding: 9px 14px; border-bottom: 1px solid ${t.border}; color: ${t.text}; }
        .bha-tbl tr:last-child td { border-bottom: none; }
        .bha-tbl td:last-child { text-align: right; font-weight: 600; color: ${t.accent}; }
        .bha-tbl-num  { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 20px; border-radius: 4px; font-size: 11px; background: ${t.hover}; color: ${t.textSub}; margin-right: 6px; }

        @media (max-width: 900px) {
          .bha-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .bha-two, .bha-three { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="bha-wrap">
        <h1 className="bha-title">Analiza Zachowań Zakupowych</h1>
        <p className="bha-sub">Koszyki, timing, promo, lojalność i powiązania produktów</p>

        {/* ── A: KPI HERO ─────────────────────────────────────────── */}
        <div className="bha-kpi-grid">
          <div className="bha-kpi">
            <div className="bha-kpi-val">
              {segments.overall_avg_basket != null
                ? Number(segments.overall_avg_basket).toFixed(0) + " zł"
                : "—"}
            </div>
            <div className="bha-kpi-lbl">Średni koszyk</div>
          </div>
          <div className="bha-kpi">
            <div className="bha-kpi-val">{segments.promo_hunters_pct ?? 0}%</div>
            <div className="bha-kpi-lbl">Promo Hunters</div>
          </div>
          <div className="bha-kpi">
            <div className="bha-kpi-val">
              {segments.avg_days_between_orders != null
                ? Number(segments.avg_days_between_orders).toFixed(0) + " dni"
                : "—"}
            </div>
            <div className="bha-kpi-lbl">Śr. czas między zamówieniami</div>
          </div>
          <div className="bha-kpi">
            <div className="bha-kpi-val" style={{ fontSize: 20 }}>{topDowName}</div>
            <div className="bha-kpi-lbl">Najpopularniejszy dzień</div>
          </div>
        </div>

        {/* ── B + D: Basket distribution + Promo pie ───────────────── */}
        <div className="bha-two">

          {/* B: Rozkład koszyków */}
          <div>
            <div className="bha-section">Rozkład koszyków</div>
            <div className="bha-card">
              {basketBuckets.map((b, i) => (
                <div key={b.label} className="bha-bar-row">
                  <span className="bha-bar-lbl">{b.label}</span>
                  <div className="bha-bar-bg">
                    <div
                      className="bha-bar-fill"
                      style={{
                        width: `${(b.value / maxBasket) * 100}%`,
                        background: i === domBasketIdx ? t.accent : t.border,
                        opacity: i === domBasketIdx ? 1 : 0.6,
                      }}
                    />
                  </div>
                  <span className="bha-bar-num">{b.value} klientów</span>
                </div>
              ))}
            </div>
          </div>

          {/* D: Promo vs Full-Price pie */}
          <div>
            <div className="bha-section">Promo vs Full-Price</div>
            <div className="bha-card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  {pieSlices.map(s => (
                    <path key={s.label} d={s.path} fill={s.color} opacity={0.85} />
                  ))}
                  <circle cx="80" cy="80" r="32" fill={t.surface} />
                  <text x="80" y="85" textAnchor="middle" fontSize="13" fontWeight="700" fill={t.text}>
                    {segments.total_clients ?? 0}
                  </text>
                  <text x="80" y="98" textAnchor="middle" fontSize="9" fill={t.textSub}>
                    klientów
                  </text>
                </svg>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pieSlices.map(s => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, color: t.text, fontWeight: 600 }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: 11, color: t.textSub }}>
                          {s.pct}% · {s.count} klientów
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── C: Heatmap zakupów (dow × month) ─────────────────────── */}
        <div className="bha-block">
          <div className="bha-section">Kalendarz zakupów — intensywność (dzień tygodnia × miesiąc)</div>
          <div className="bha-card">
            <div className="bha-heat-grid">
              {/* Header row: month labels */}
              <div />
              {MON_SHORT.map(m => (
                <div key={m} className="bha-heat-month">{m}</div>
              ))}
              {/* 7 rows for each day of week */}
              {DOW_SHORT.map((day, d) => (
                <>
                  <div key={`lbl-${d}`} className="bha-heat-label">{day}</div>
                  {Array.from({ length: 12 }, (_, mi) => {
                    const cnt = heatMap[`${d}-${mi + 1}`] ?? 0;
                    const intensity = heatMax > 0 ? cnt / heatMax : 0;
                    const alpha = 0.08 + intensity * 0.92;
                    return (
                      <div
                        key={`cell-${d}-${mi}`}
                        className="bha-heat-cell"
                        title={`${DOW_FULL[d]}, ${MON_SHORT[mi]}: ${cnt} zamówień`}
                        style={{
                          background: cnt === 0
                            ? t.border
                            : `rgba(184, 118, 58, ${alpha.toFixed(2)})`,
                        }}
                      />
                    );
                  })}
                </>
              ))}
            </div>
            <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: t.textSub }}>Mniej</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                <div key={v} style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: `rgba(184, 118, 58, ${v})`,
                }} />
              ))}
              <span style={{ fontSize: 10, color: t.textSub }}>Więcej</span>
            </div>
          </div>
        </div>

        {/* ── E + F: Co-buying table + Days histogram ──────────────── */}
        <div className="bha-two">

          {/* E: Co-buying */}
          <div>
            <div className="bha-section">Co kupują razem — top 20 par</div>
            <div className="bha-card">
              {cobuying.length === 0 ? (
                <div style={{ padding: "20px 16px", color: t.textSub, fontSize: 13 }}>
                  Brak danych (wymagane pole order_id)
                </div>
              ) : (
                <table className="bha-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>#</th>
                      <th>Produkt A</th>
                      <th>Produkt B</th>
                      <th style={{ textAlign: "right" }}>Razem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobuying.slice(0, 20).map((row, i) => (
                      <tr key={i}>
                        <td>
                          <span className="bha-tbl-num">{i + 1}</span>
                        </td>
                        <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.product_a}
                        </td>
                        <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.product_b}
                        </td>
                        <td>{row.co_purchases}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* F: Days between orders histogram */}
          <div>
            <div className="bha-section">Czas między zamówieniami</div>
            <div className="bha-card">
              <div style={{ padding: "14px 16px 8px", fontSize: 12, color: t.textSub }}>
                Średnio klienci wracają po{" "}
                <strong style={{ color: t.text }}>
                  {segments.avg_days_between_orders != null
                    ? Number(segments.avg_days_between_orders).toFixed(0)
                    : "—"}{" "}
                  dniach
                </strong>
              </div>
              {gapBuckets.map((b, i) => (
                <div key={b.label} className="bha-bar-row">
                  <span className="bha-bar-lbl">{b.label}</span>
                  <div className="bha-bar-bg">
                    <div
                      className="bha-bar-fill"
                      style={{
                        width: `${(b.value / maxGap) * 100}%`,
                        background: i === 1 ? t.accent : `${t.accent}88`,
                      }}
                    />
                  </div>
                  <span className="bha-bar-num">{b.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
