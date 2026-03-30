"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDarkMode } from "../../../../hooks/useDarkMode";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEG_OPTIONS = [
  { value: "", label: "Wszystkie segmenty" },
  { value: "Diamond",   label: "💎 Diamond" },
  { value: "Platinum",  label: "🥈 Platinum" },
  { value: "Gold",      label: "🥇 Gold" },
  { value: "Returning", label: "🔄 Returning" },
  { value: "New",       label: "🆕 New" },
];
const RISK_OPTIONS = [
  { value: "", label: "Wszystkie poziomy" },
  { value: "OK",       label: "✅ OK" },
  { value: "Risk",     label: "⚠️ Risk" },
  { value: "HighRisk", label: "🔴 HighRisk" },
  { value: "Lost",     label: "💀 Lost" },
];
const DOMENY = [
  "Hobby", "Literatura", "Polszczyzna", "Zwierzęta", "Relacje i miłość",
  "Jedzenie i napoje", "Humor", "Torba prezentowa", "Prezent z Polski", "Filozofia",
];
const SEGMENTS_ORDER = ["Diamond", "Platinum", "Gold", "Returning", "New"];
const RISKS_ORDER    = ["OK", "Risk", "HighRisk", "Lost"];
const SEG_COLORS: Record<string, string> = {
  Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24", Returning: "#34d399", New: "#f87171",
};
const RISK_COLORS: Record<string, string> = {
  OK: "#34d399", Risk: "#fbbf24", HighRisk: "#f97316", Lost: "#ef4444",
};
const SEG_EMOJI: Record<string, string> = {
  Diamond: "💎", Platinum: "🥈", Gold: "🥇", Returning: "🔄", New: "🆕",
};
const RISK_EMOJI: Record<string, string> = {
  OK: "✅", Risk: "⚠️", HighRisk: "🔴", Lost: "💀",
};
const SEG_GRADIENTS: Record<string, string> = {
  Diamond:  "linear-gradient(135deg, #1e3a5f 0%, #2563eb33 100%)",
  Platinum: "linear-gradient(135deg, #2d1b69 0%, #7c3aed33 100%)",
  Gold:     "linear-gradient(135deg, #422006 0%, #d9770633 100%)",
  Returning:"linear-gradient(135deg, #064e3b 0%, #10b98133 100%)",
  New:      "linear-gradient(135deg, #4c1d1d 0%, #ef444433 100%)",
  "":       "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
};
const TABS = [
  { key: "segments", label: "📊 Segmentacja" },
  { key: "dna",      label: "🧬 DNA zakupowe" },
  { key: "seasons",  label: "📅 Sezonowość" },
  { key: "promos",   label: "🏷️ Promocje" },
] as const;
type TabKey = typeof TABS[number]["key"];

const ACCENT   = "#b8763a";
const ACCENT_B = "#5b8aa8";
const PIE_COLORS = [ACCENT, "#c98d5f", "#d9a480", "#e8bba0", ACCENT_B, "#7aa3bb", "#9bbdcf", "#bccedc"];
const LIGHT = { surface: "#ffffff", border: "#ddd9d2", text: "#1a1814", textSub: "#7a7570", hover: "#eeecea", bg: "#f5f0ea", kpi: "#faf9f7" };
const DARK  = { surface: "#111110", border: "#1e1e1e", text: "#e0ddd8", textSub: "#6a6560", hover: "#1a1a1a", bg: "#0a0a09", kpi: "#0d0d0c" };

// ─── Formatting ───────────────────────────────────────────────────────────────
const fmtN = (n: number) => n.toLocaleString("pl-PL", { maximumFractionDigits: 0 });
const fmtZ = (n: number) => n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " zł";
const fmtPct = (n: number) => n.toFixed(1) + "%";
const fmtDelta = (a: number, b: number, isPercent = false) => {
  const d = a - b;
  if (d === 0) return { label: "—", color: "#9b9690" };
  const sign = d > 0 ? "+" : "";
  const label = isPercent ? sign + d.toFixed(1) + "pp" : sign + fmtN(d);
  return { label, color: d > 0 ? "#34d399" : "#ef4444" };
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 18, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return <div className="beh-skel" style={{ width: w, height: h, borderRadius: r }} />;
}
function SkeletonGroup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Skel h={80} r={12} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={68} r={10} />)}
      </div>
    </div>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────────
function Empty({ label = "Brak danych" }: { label?: string }) {
  return <div style={{ padding: "32px 0", textAlign: "center", color: "#9b9690", fontSize: 12 }}>📭 {label}</div>;
}

// ─── HBar (horizontal bar chart) ─────────────────────────────────────────────
function HBar({ items, total, color = ACCENT, t }: {
  items: { tag: string; klientow: number }[];
  total: number; color?: string;
  t: typeof LIGHT;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!items.length) return <Empty />;
  const max = Math.max(...items.map(x => x.klientow), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map((it, i) => {
        const pct = total > 0 ? (it.klientow / total * 100) : 0;
        const barW = (it.klientow / max * 100);
        return (
          <div key={it.tag}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ display: "grid", gridTemplateColumns: "130px 1fr 60px 50px", alignItems: "center", gap: 8, padding: "3px 0" }}
          >
            <span style={{ fontSize: 11, color: hovered === i ? t.text : t.textSub, truncate: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{it.tag}</span>
            <div style={{ background: t.border, borderRadius: 3, height: 7, overflow: "hidden" }}>
              <div style={{ width: `${barW}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: 11, color: t.textSub, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtN(it.klientow)}</span>
            <span style={{ fontSize: 10, color: hovered === i ? t.text : "#9b9690", textAlign: "right" }}>{fmtPct(pct)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tag Cloud ────────────────────────────────────────────────────────────────
function TagCloud({ items, total, color = ACCENT }: {
  items: { tag: string; klientow: number }[];
  total: number; color?: string;
}) {
  if (!items.length) return <Empty />;
  const max = Math.max(...items.map(x => x.klientow), 1);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "4px 0" }}>
      {items.map(it => {
        const size = Math.round(10 + (it.klientow / max) * 8);
        const alpha = Math.round(30 + (it.klientow / max) * 70);
        const alphaHex = alpha.toString(16).padStart(2, "0");
        return (
          <span key={it.tag} title={`${it.klientow} klientów (${fmtPct(it.klientow / total * 100)})`} style={{
            fontSize: size, padding: "3px 8px", borderRadius: 20,
            background: color + alphaHex, color: color,
            border: `1px solid ${color}44`, cursor: "default", whiteSpace: "nowrap",
          }}>
            {it.tag}
          </span>
        );
      })}
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function Donut({ items, total, size = 160 }: {
  items: { tag: string; klientow: number }[];
  total: number; size?: number;
}) {
  const [hov, setHov] = useState<number | null>(null);
  if (!items.length || total === 0) return <Empty />;
  const R = size / 2; const r = R * 0.58; const c = size / 2;
  let cumAngle = -Math.PI / 2;
  const slices = items.slice(0, 8).map((it, i) => {
    const pct = it.klientow / total;
    const angle = pct * 2 * Math.PI;
    const start = cumAngle; cumAngle += angle;
    const x1 = c + R * Math.cos(start); const y1 = c + R * Math.sin(start);
    const x2 = c + R * Math.cos(cumAngle); const y2 = c + R * Math.sin(cumAngle);
    const x3 = c + r * Math.cos(cumAngle); const y3 = c + r * Math.sin(cumAngle);
    const x4 = c + r * Math.cos(start); const y4 = c + r * Math.sin(start);
    const lg = pct > 0.5 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${lg} 0 ${x4} ${y4} Z`;
    return { ...it, d, color: PIE_COLORS[i % PIE_COLORS.length], pct };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={s.tag} d={s.d} fill={s.color} opacity={hov === null || hov === i ? 1 : 0.4}
            stroke={hov === i ? "#fff" : "none"} strokeWidth={hov === i ? 1.5 : 0}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            style={{ cursor: "default", transition: "opacity 0.15s" }}
          />
        ))}
        {hov !== null && (
          <text x={c} y={c - 5} textAnchor="middle" fontSize={11} fill="#e0ddd8">{fmtPct(slices[hov].pct * 100)}</text>
        )}
        {hov !== null && (
          <text x={c} y={c + 12} textAnchor="middle" fontSize={9} fill="#9b9690">
            {slices[hov].tag.length > 12 ? slices[hov].tag.slice(0, 12) + "…" : slices[hov].tag}
          </text>
        )}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {slices.map((s, i) => (
          <div key={s.tag} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "default", opacity: hov === null || hov === i ? 1 : 0.5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "#9b9690", maxWidth: 120, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{s.tag}</span>
            <span style={{ fontSize: 10, color: "#9b9690", marginLeft: "auto" }}>{fmtPct(s.pct * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Season Bars ─────────────────────────────────────────────────────────────
function SeasonBars({ dataA, dataB, t }: {
  dataA: { season: string; klientow: number; zakupow: number }[];
  dataB: { season: string; klientow: number; zakupow: number }[];
  t: typeof LIGHT;
}) {
  const seasons = Array.from(new Set([...dataA, ...dataB].map(x => x.season)));
  if (!seasons.length) return <Empty />;
  const getA = (s: string) => dataA.find(x => x.season === s)?.klientow ?? 0;
  const getB = (s: string) => dataB.find(x => x.season === s)?.klientow ?? 0;
  const max = Math.max(...seasons.map(s => Math.max(getA(s), getB(s))), 1);
  const BAR_H = 18; const GAP = 4; const ROW_H = BAR_H * 2 + GAP + 12;
  const H = seasons.length * ROW_H + 20; const W = 400; const LABEL_W = 110;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: "var(--font-geist-sans,sans-serif)" }}>
      {seasons.map((s, i) => {
        const y = i * ROW_H + 10;
        const wA = ((getA(s) / max) * (W - LABEL_W - 10));
        const wB = ((getB(s) / max) * (W - LABEL_W - 10));
        return (
          <g key={s}>
            <text x={LABEL_W - 6} y={y + BAR_H / 2 + 4} fontSize={10} textAnchor="end" fill={t.textSub}>{s}</text>
            <rect x={LABEL_W} y={y} width={Math.max(wA, 2)} height={BAR_H} rx={3} fill={ACCENT} opacity={0.85} />
            <rect x={LABEL_W} y={y + BAR_H + GAP} width={Math.max(wB, 2)} height={BAR_H} rx={3} fill={ACCENT_B} opacity={0.85} />
            {wA > 20 && (
              <text x={LABEL_W + wA + 4} y={y + BAR_H / 2 + 4} fontSize={9} fill={t.textSub}>{fmtN(getA(s))}</text>
            )}
            {wB > 20 && (
              <text x={LABEL_W + wB + 4} y={y + BAR_H + GAP + BAR_H / 2 + 4} fontSize={9} fill={t.textSub}>{fmtN(getB(s))}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({ seg, data, label, accent, t }: {
  seg: string; data: any; label: string; accent: string; t: typeof LIGHT;
}) {
  const grad = SEG_GRADIENTS[seg] ?? SEG_GRADIENTS[""];
  return (
    <div style={{ background: grad, border: `1px solid ${accent}44`, borderRadius: 14, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, color: "#9b9690", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 28, fontFamily: "var(--font-dm-serif,serif)", color: accent }}>
          {fmtN(data?.total_clients ?? 0)}
        </div>
        <div style={{ fontSize: 11, color: "#9b9690", marginTop: 2 }}>klientów</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "#9b9690", marginBottom: 2 }}>Avg LTV</div>
        <div style={{ fontSize: 20, fontFamily: "var(--font-dm-serif,serif)", color: "#e0ddd8" }}>{fmtZ(data?.avg_ltv ?? 0)}</div>
        <div style={{ fontSize: 11, color: "#9b9690", marginTop: 6 }}>Avg zamówień</div>
        <div style={{ fontSize: 14, color: "#e0ddd8", fontVariantNumeric: "tabular-nums" }}>{(data?.avg_orders ?? 0).toFixed(1)}</div>
      </div>
    </div>
  );
}

// ─── Metric Tile ─────────────────────────────────────────────────────────────
function MetricTile({ label, valA, valB, fmt, t }: {
  label: string; valA: number; valB: number;
  fmt: (n: number) => string; t: typeof LIGHT;
}) {
  const dA = fmtDelta(valA, valB, fmt === fmtPct);
  return (
    <div style={{ background: t.kpi, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div>
          <div style={{ fontSize: 8, color: ACCENT, marginBottom: 1 }}>GRUPA A</div>
          <div style={{ fontSize: 16, color: t.text, fontVariantNumeric: "tabular-nums" }}>{fmt(valA)}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: ACCENT_B, marginBottom: 1 }}>GRUPA B</div>
          <div style={{ fontSize: 16, color: t.text, fontVariantNumeric: "tabular-nums" }}>{fmt(valB)}</div>
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 10, color: dA.color }}>{dA.label}</div>
    </div>
  );
}

// ─── Segment Heatmap ─────────────────────────────────────────────────────────
function SegHeatmap({ heatmap, t, groupLabel }: {
  heatmap: { legacy_segment: string; risk_level: string; klientow: number; avg_ltv: number }[];
  t: typeof LIGHT; groupLabel: string;
}) {
  const router = useRouter();
  if (!heatmap?.length) return <Empty />;
  const max = Math.max(...heatmap.map(x => x.klientow), 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
        <thead>
          <tr>
            <th style={{ padding: "8px 10px", textAlign: "left", color: t.textSub, fontWeight: 500, borderBottom: `1px solid ${t.border}` }}>Segment</th>
            {RISKS_ORDER.map(r => (
              <th key={r} style={{ padding: "8px 10px", textAlign: "center", color: RISK_COLORS[r], fontWeight: 600, borderBottom: `1px solid ${t.border}`, fontSize: 10 }}>
                {RISK_EMOJI[r]} {r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEGMENTS_ORDER.map(seg => (
            <tr key={seg}>
              <td style={{ padding: "6px 10px", color: SEG_COLORS[seg] ?? t.text, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>
                {SEG_EMOJI[seg]} {seg}
              </td>
              {RISKS_ORDER.map(risk => {
                const cell = heatmap.find(x => x.legacy_segment === seg && x.risk_level === risk);
                const k = cell?.klientow ?? 0;
                const intensity = max > 0 ? k / max : 0;
                const bg = k > 0 ? `rgba(184,118,58,${0.08 + intensity * 0.55})` : t.hover;
                return (
                  <td key={risk} onClick={() => k > 0 && router.push(`/crm/clients?segment=${seg}&risk=${risk}`)}
                    title={k > 0 ? `${seg} × ${risk}: ${fmtN(k)} klientów, avg LTV: ${fmtZ(cell?.avg_ltv ?? 0)}` : ""}
                    style={{
                      padding: "7px 10px", textAlign: "center", borderBottom: `1px solid ${t.border}`,
                      background: bg, cursor: k > 0 ? "pointer" : "default",
                      transition: "background 0.15s",
                    }}
                  >
                    {k > 0 ? (
                      <div>
                        <div style={{ fontWeight: 600, color: t.text, fontVariantNumeric: "tabular-nums" }}>{fmtN(k)}</div>
                        <div style={{ fontSize: 9, color: t.textSub }}>{fmtZ(cell?.avg_ltv ?? 0)}</div>
                      </div>
                    ) : (
                      <span style={{ color: t.textSub }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── DNA Diff Table ───────────────────────────────────────────────────────────
function DnaDiffTable({ dataA, dataB, t }: { dataA: any; dataB: any; t: typeof LIGHT }) {
  const allTags = Array.from(new Set([
    ...(dataA?.granularne ?? []).map((x: any) => x.tag),
    ...(dataB?.granularne ?? []).map((x: any) => x.tag),
  ])).slice(0, 15);
  if (!allTags.length) return <Empty label="Brak danych DNA" />;
  const totalA = (dataA?.granularne ?? []).reduce((s: number, x: any) => s + x.klientow, 0) || 1;
  const totalB = (dataB?.granularne ?? []).reduce((s: number, x: any) => s + x.klientow, 0) || 1;
  const getA = (tag: string) => (dataA?.granularne ?? []).find((x: any) => x.tag === tag)?.klientow ?? 0;
  const getB = (tag: string) => (dataB?.granularne ?? []).find((x: any) => x.tag === tag)?.klientow ?? 0;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ padding: "7px 10px", textAlign: "left", color: t.textSub, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>Tag</th>
          <th style={{ padding: "7px 10px", textAlign: "right", color: ACCENT, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>Gr. A %</th>
          <th style={{ padding: "7px 10px", textAlign: "right", color: ACCENT_B, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>Gr. B %</th>
          <th style={{ padding: "7px 10px", textAlign: "right", color: t.textSub, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>Różnica</th>
        </tr>
      </thead>
      <tbody>
        {allTags.map(tag => {
          const a = getA(tag); const b = getB(tag);
          const pA = a / totalA * 100; const pB = b / totalB * 100;
          const diff = pA - pB;
          return (
            <tr key={tag}>
              <td style={{ padding: "7px 10px", color: t.text, borderBottom: `1px solid ${t.border}` }}>{tag}</td>
              <td style={{ padding: "7px 10px", textAlign: "right", color: ACCENT, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{fmtPct(pA)}</td>
              <td style={{ padding: "7px 10px", textAlign: "right", color: ACCENT_B, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{fmtPct(pB)}</td>
              <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: `1px solid ${t.border}`, color: diff > 0 ? "#34d399" : diff < 0 ? "#ef4444" : t.textSub, fontVariantNumeric: "tabular-nums" }}>
                {diff > 0 ? "+" : ""}{diff.toFixed(1)}pp
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Promo Badge ─────────────────────────────────────────────────────────────
const PROMO_TYPE_COLORS: Record<string, string> = {
  sale: "#34d399", discount: "#fbbf24", bundle: "#60a5fa",
  free_shipping: "#a78bfa", promo_code: "#f87171", loyalty: "#f97316",
};
function PromoBadge({ type }: { type?: string }) {
  const t = type ?? "other";
  const c = PROMO_TYPE_COLORS[t] ?? "#9b9690";
  return (
    <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", background: c + "22", color: c, border: `1px solid ${c}44` }}>
      {t}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BehaviorPage() {
  const [darkRaw] = useDarkMode();
  const dark = darkRaw as boolean;
  const t = dark ? DARK : LIGHT;

  const [tab, setTab] = useState<TabKey>("segments");
  const [segA, setSegA] = useState(""); const [riskA, setRiskA] = useState(""); const [domA, setDomA] = useState("");
  const [segB, setSegB] = useState(""); const [riskB, setRiskB] = useState(""); const [domB, setDomB] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [promoSort, setPromoSort] = useState<{ col: string; dir: 1 | -1 }>({ col: "klientow", dir: -1 });
  const [promoTypeFilter, setPromoTypeFilter] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (currentTab: TabKey) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const p = new URLSearchParams({
        tab: currentTab,
        a_segment: segA, a_risk: riskA, a_domena: domA,
        b_segment: segB, b_risk: riskB, b_domena: domB,
      });
      const res = await fetch(`/api/crm/behavior?${p}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      if (e.name !== "AbortError") console.error("[behavior]", e);
    } finally {
      setLoading(false);
    }
  }, [segA, riskA, domA, segB, riskB, domB]);

  useEffect(() => { fetchData(tab); }, [tab, segA, riskA, domA, segB, riskB, domB]);

  const ga = data?.group_a;
  const gb = data?.group_b;
  const meta = data?.promotions_meta ?? {};

  const accentA = segA ? (SEG_COLORS[segA] ?? ACCENT) : ACCENT;
  const accentB = segB ? (SEG_COLORS[segB] ?? ACCENT_B) : ACCENT_B;
  const labelA = segA ? `${SEG_EMOJI[segA] ?? ""} ${segA}` : "Grupa A";
  const labelB = segB ? `${SEG_EMOJI[segB] ?? ""} ${segB}` : "Grupa B";

  const promoRows = (() => {
    const rowsA = ga ?? []; const rowsB = gb ?? [];
    if (!Array.isArray(rowsA) && !Array.isArray(rowsB)) return [];
    const allNames = Array.from(new Set([...(Array.isArray(rowsA) ? rowsA : []).map((r: any) => r.promo_name), ...(Array.isArray(rowsB) ? rowsB : []).map((r: any) => r.promo_name)]));
    return allNames.map(name => {
      const a = Array.isArray(rowsA) ? rowsA.find((r: any) => r.promo_name === name) : undefined;
      const b = Array.isArray(rowsB) ? rowsB.find((r: any) => r.promo_name === name) : undefined;
      const m = meta[name];
      return { promo_name: name, klientow: (a?.klientow ?? 0) + (b?.klientow ?? 0), aKlientow: a?.klientow ?? 0, bKlientow: b?.klientow ?? 0, promo_type: m?.promo_type, season: m?.season, discount_type: m?.discount_type };
    }).filter(r => !promoTypeFilter || r.promo_type === promoTypeFilter)
      .sort((a, b) => promoSort.dir * (b[promoSort.col as keyof typeof b] as number - a[promoSort.col as keyof typeof a] as number));
  })();

  function togglePromoSort(col: string) {
    setPromoSort(s => s.col === col ? { col, dir: s.dir === 1 ? -1 : 1 } : { col, dir: -1 });
  }

  return (
    <>
      <style>{`
        .beh-skel { background: linear-gradient(90deg, #1e1e1e 25%, #2a2a2a 50%, #1e1e1e 75%); background-size: 200% 100%; animation: beh-shimmer 1.4s infinite; }
        @keyframes beh-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .beh-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .beh-title { font-family: var(--font-dm-serif), serif; font-size: 24px; color: ${t.text}; margin: 0 0 2px; }
        .beh-sub { font-size: 12px; color: ${t.textSub}; margin: 0 0 20px; }
        .beh-filter-bar { position: sticky; top: 0; z-index: 100; background: ${t.bg}; border-bottom: 1px solid ${t.border}; padding: 10px 0 12px; margin-bottom: 20px; }
        .beh-filter-inner { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: start; }
        .beh-filter-group { display: flex; flex-direction: column; gap: 6px; }
        .beh-filter-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: ${t.textSub}; margin-bottom: 2px; }
        .beh-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .beh-sel { padding: 5px 8px; border-radius: 7px; border: 1px solid ${t.border}; background: ${t.surface}; color: ${t.text}; font-size: 12px; font-family: var(--font-geist-sans,sans-serif); cursor: pointer; outline: none; }
        .beh-sel:focus { border-color: ${ACCENT}; }
        .beh-vs { display: flex; align-items: center; justify-content: center; font-size: 11px; color: ${t.textSub}; font-weight: 700; padding-top: 22px; }
        .beh-tabs { display: flex; gap: 2px; margin-bottom: 20px; border-bottom: 1px solid ${t.border}; }
        .beh-tab { padding: 10px 16px; font-size: 12px; color: ${t.textSub}; cursor: pointer; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; background: none; border-top: none; border-left: none; border-right: none; font-family: var(--font-geist-sans,sans-serif); }
        .beh-tab:hover { color: ${t.text}; }
        .beh-tab.active { color: ${ACCENT}; border-bottom-color: ${ACCENT}; }
        .beh-ab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .beh-panel { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 12px; overflow: hidden; }
        .beh-panel-hdr { padding: 12px 16px; border-bottom: 1px solid ${t.border}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: ${t.textSub}; }
        .beh-panel-body { padding: 14px 16px; }
        .beh-section { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: ${t.textSub}; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1px solid ${t.border}; }
        .beh-metrics-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 12px; }
        .beh-reset-btn { padding: 5px 12px; border-radius: 7px; border: 1px solid ${t.border}; background: ${t.surface}; color: ${t.textSub}; font-size: 11px; cursor: pointer; font-family: var(--font-geist-sans,sans-serif); }
        .beh-reset-btn:hover { color: ${t.text}; }
        .beh-sort-btn { background: none; border: none; cursor: pointer; font-size: 10px; color: ${t.textSub}; padding: 0 2px; }
        @media (max-width: 900px) { .beh-ab-grid { grid-template-columns: 1fr; } .beh-filter-inner { grid-template-columns: 1fr; } .beh-vs { display: none; } }
      `}</style>

      <div className="beh-wrap">
        <h1 className="beh-title">Analityka Behawioralna</h1>
        <p className="beh-sub">Porównanie grup klientów według zachowań zakupowych, DNA, promocji i sezonowości</p>

        {/* ─── Filter Bar ─── */}
        <div className="beh-filter-bar">
          <div className="beh-filter-inner">
            {/* Grupa A */}
            <div className="beh-filter-group">
              <div className="beh-filter-label" style={{ color: accentA }}>◆ Grupa A</div>
              <div className="beh-filter-row">
                <select className="beh-sel" value={segA} onChange={e => setSegA(e.target.value)}>
                  {SEG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select className="beh-sel" value={riskA} onChange={e => setRiskA(e.target.value)}>
                  {RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select className="beh-sel" value={domA} onChange={e => setDomA(e.target.value)}>
                  <option value="">Wszystkie domeny</option>
                  {DOMENY.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="beh-vs">VS</div>

            {/* Grupa B */}
            <div className="beh-filter-group">
              <div className="beh-filter-label" style={{ color: accentB }}>◆ Grupa B</div>
              <div className="beh-filter-row">
                <select className="beh-sel" value={segB} onChange={e => setSegB(e.target.value)}>
                  {SEG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select className="beh-sel" value={riskB} onChange={e => setRiskB(e.target.value)}>
                  {RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select className="beh-sel" value={domB} onChange={e => setDomB(e.target.value)}>
                  <option value="">Wszystkie domeny</option>
                  {DOMENY.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>
          {(segA || riskA || domA || segB || riskB || domB) && (
            <div style={{ marginTop: 8 }}>
              <button className="beh-reset-btn" onClick={() => { setSegA(""); setRiskA(""); setDomA(""); setSegB(""); setRiskB(""); setDomB(""); }}>
                ✕ Wyczyść filtry
              </button>
            </div>
          )}
        </div>

        {/* ─── Tabs ─── */}
        <div className="beh-tabs">
          {TABS.map(tb => (
            <button key={tb.key} className={"beh-tab" + (tab === tb.key ? " active" : "")} onClick={() => setTab(tb.key)}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: SEGMENTACJA */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === "segments" && (
          <div>
            {loading ? (
              <div className="beh-ab-grid"><SkeletonGroup /><SkeletonGroup /></div>
            ) : (
              <>
                <div className="beh-ab-grid">
                  {/* Group A */}
                  <div>
                    <HeroCard seg={segA} data={ga} label={labelA} accent={accentA} t={t} />
                    <div className="beh-metrics-grid">
                      <MetricTile label="Suma LTV" valA={ga?.sum_ltv ?? 0} valB={gb?.sum_ltv ?? 0} fmt={fmtZ} t={t} />
                      <MetricTile label="Promo buyers" valA={ga?.promo_buyers_pct ?? 0} valB={gb?.promo_buyers_pct ?? 0} fmt={fmtPct} t={t} />
                      <MetricTile label="Free shipping" valA={ga?.free_shipping_pct ?? 0} valB={gb?.free_shipping_pct ?? 0} fmt={fmtPct} t={t} />
                      <MetricTile label="Nowe produkty" valA={ga?.avg_new_products_ratio ?? 0} valB={gb?.avg_new_products_ratio ?? 0} fmt={fmtPct} t={t} />
                      <MetricTile label="Evergreen ratio" valA={ga?.avg_evergreen_ratio ?? 0} valB={gb?.avg_evergreen_ratio ?? 0} fmt={fmtPct} t={t} />
                      <MetricTile label="Avg. events" valA={ga?.avg_events ?? 0} valB={gb?.avg_events ?? 0} fmt={n => n.toFixed(1)} t={t} />
                    </div>
                  </div>

                  {/* Group B */}
                  <div>
                    <HeroCard seg={segB} data={gb} label={labelB} accent={accentB} t={t} />
                    <div style={{ height: 12 + 4 * 68 + 3 * 8 }} /> {/* spacer to match A */}
                  </div>
                </div>

                {/* Heatmap */}
                <div style={{ marginTop: 24 }}>
                  <div className="beh-section">Mapa cieplna — klienci per segment × ryzyko (kliknij komórkę → lista klientów)</div>
                  <div className="beh-ab-grid">
                    <div>
                      <div style={{ fontSize: 10, color: accentA, fontWeight: 600, marginBottom: 8 }}>{labelA}</div>
                      <div className="beh-panel" style={{ padding: 0 }}>
                        <SegHeatmap heatmap={ga?.heatmap ?? []} t={t} groupLabel={labelA} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: accentB, fontWeight: 600, marginBottom: 8 }}>{labelB}</div>
                      <div className="beh-panel" style={{ padding: 0 }}>
                        <SegHeatmap heatmap={gb?.heatmap ?? []} t={t} groupLabel={labelB} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: DNA */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === "dna" && (
          <div>
            {loading ? (
              <div className="beh-ab-grid"><SkeletonGroup /><SkeletonGroup /></div>
            ) : (
              <>
                <div className="beh-ab-grid">
                  {/* Granularne tags */}
                  <div className="beh-panel">
                    <div className="beh-panel-hdr" style={{ color: accentA }}>🏷️ {labelA} — Tagi granularne (top 20)</div>
                    <div className="beh-panel-body">
                      <HBar items={ga?.granularne ?? []} total={ga?.total_clients ?? 0} color={accentA} t={t} />
                    </div>
                  </div>
                  <div className="beh-panel">
                    <div className="beh-panel-hdr" style={{ color: accentB }}>🏷️ {labelB} — Tagi granularne (top 20)</div>
                    <div className="beh-panel-body">
                      <HBar items={gb?.granularne ?? []} total={gb?.total_clients ?? 0} color={accentB} t={t} />
                    </div>
                  </div>
                </div>

                {/* Tag cloud + domenowe donut */}
                <div className="beh-ab-grid" style={{ marginTop: 16 }}>
                  <div className="beh-panel">
                    <div className="beh-panel-hdr">☁️ {labelA} — Chmura tagów</div>
                    <div className="beh-panel-body">
                      <TagCloud items={ga?.granularne ?? []} total={ga?.total_clients ?? 0} color={accentA} />
                    </div>
                  </div>
                  <div className="beh-panel">
                    <div className="beh-panel-hdr">☁️ {labelB} — Chmura tagów</div>
                    <div className="beh-panel-body">
                      <TagCloud items={gb?.granularne ?? []} total={gb?.total_clients ?? 0} color={accentB} />
                    </div>
                  </div>
                </div>

                {/* Domenowe donuts */}
                <div className="beh-ab-grid" style={{ marginTop: 16 }}>
                  <div className="beh-panel">
                    <div className="beh-panel-hdr">🌐 {labelA} — Domeny tematyczne</div>
                    <div className="beh-panel-body">
                      <Donut items={ga?.domenowe ?? []} total={(ga?.domenowe ?? []).reduce((s: number, x: any) => s + x.klientow, 0)} />
                    </div>
                  </div>
                  <div className="beh-panel">
                    <div className="beh-panel-hdr">🌐 {labelB} — Domeny tematyczne</div>
                    <div className="beh-panel-body">
                      <Donut items={gb?.domenowe ?? []} total={(gb?.domenowe ?? []).reduce((s: number, x: any) => s + x.klientow, 0)} />
                    </div>
                  </div>
                </div>

                {/* Okazje */}
                <div className="beh-ab-grid" style={{ marginTop: 16 }}>
                  <div className="beh-panel">
                    <div className="beh-panel-hdr">🎁 {labelA} — Okazje</div>
                    <div className="beh-panel-body">
                      <HBar items={ga?.okazje ?? []} total={ga?.total_clients ?? 0} color={accentA} t={t} />
                    </div>
                  </div>
                  <div className="beh-panel">
                    <div className="beh-panel-hdr">🎁 {labelB} — Okazje</div>
                    <div className="beh-panel-body">
                      <HBar items={gb?.okazje ?? []} total={gb?.total_clients ?? 0} color={accentB} t={t} />
                    </div>
                  </div>
                </div>

                {/* Grupy produktowe */}
                <div className="beh-ab-grid" style={{ marginTop: 16 }}>
                  <div className="beh-panel">
                    <div className="beh-panel-hdr">📦 {labelA} — Grupy produktowe</div>
                    <div className="beh-panel-body">
                      <HBar items={(ga?.product_groups ?? []).map((x: any) => ({ tag: x.product_group, klientow: x.klientow }))} total={ga?.total_clients ?? 0} color={accentA} t={t} />
                    </div>
                  </div>
                  <div className="beh-panel">
                    <div className="beh-panel-hdr">📦 {labelB} — Grupy produktowe</div>
                    <div className="beh-panel-body">
                      <HBar items={(gb?.product_groups ?? []).map((x: any) => ({ tag: x.product_group, klientow: x.klientow }))} total={gb?.total_clients ?? 0} color={accentB} t={t} />
                    </div>
                  </div>
                </div>

                {/* DNA diff table */}
                <div style={{ marginTop: 24 }}>
                  <div className="beh-section">Tabela różnic DNA — A vs B (tagi granularne, top 15)</div>
                  <div className="beh-panel" style={{ padding: 0 }}>
                    <DnaDiffTable dataA={ga} dataB={gb} t={t} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: SEZONOWOŚĆ */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === "seasons" && (
          <div>
            {loading ? <SkeletonGroup /> : (
              <>
                {/* Bar comparison */}
                <div className="beh-panel">
                  <div className="beh-panel-hdr">
                    <span style={{ color: accentA }}>■ {labelA}</span>
                    <span style={{ marginLeft: 16, color: accentB }}>■ {labelB}</span>
                    <span style={{ marginLeft: 8 }}> — Klienci per sezon</span>
                  </div>
                  <div className="beh-panel-body">
                    <SeasonBars dataA={ga ?? []} dataB={gb ?? []} t={t} />
                  </div>
                </div>

                {/* Comparison table */}
                <div style={{ marginTop: 16 }}>
                  <div className="beh-panel" style={{ padding: 0 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "9px 14px", textAlign: "left", color: t.textSub, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>Sezon</th>
                          <th style={{ padding: "9px 14px", textAlign: "right", color: accentA, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>A — klientów</th>
                          <th style={{ padding: "9px 14px", textAlign: "right", color: accentA, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>A — zakupów</th>
                          <th style={{ padding: "9px 14px", textAlign: "right", color: accentB, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>B — klientów</th>
                          <th style={{ padding: "9px 14px", textAlign: "right", color: accentB, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>B — zakupów</th>
                          <th style={{ padding: "9px 14px", textAlign: "right", color: t.textSub, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}` }}>Różnica</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set([...(ga ?? []), ...(gb ?? [])].map((x: any) => x.season)))
                          .map((season: any) => {
                            const a = (ga ?? []).find((x: any) => x.season === season);
                            const b = (gb ?? []).find((x: any) => x.season === season);
                            const aK = a?.klientow ?? 0; const bK = b?.klientow ?? 0;
                            const diff = fmtDelta(aK, bK);
                            return (
                              <tr key={season}>
                                <td style={{ padding: "9px 14px", color: t.text, borderBottom: `1px solid ${t.border}`, fontWeight: 500 }}>{season}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: accentA, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{fmtN(aK)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: t.textSub, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{fmtN(a?.zakupow ?? 0)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: accentB, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{fmtN(bK)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: t.textSub, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{fmtN(b?.zakupow ?? 0)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: diff.color, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{diff.label}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Insight cards */}
                {ga?.length > 0 && (
                  <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                    {[...(ga ?? [])].sort((a: any, b: any) => b.klientow - a.klientow).slice(0, 3).map((s: any) => (
                      <div key={s.season} style={{ background: t.kpi, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, color: t.textSub, marginBottom: 4 }}>Top sezon {labelA}</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: accentA }}>{s.season}</div>
                        <div style={{ fontSize: 12, color: t.textSub, marginTop: 3 }}>{fmtN(s.klientow)} klientów</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: PROMOCJE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === "promos" && (
          <div>
            {loading ? <SkeletonGroup /> : (
              <>
                {/* Summary metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Promo buyers A", val: ga?.promo_buyers_pct ?? 0, color: accentA },
                    { label: "Free shipping A", val: ga?.free_shipping_pct ?? 0, color: accentA },
                    { label: "Promo buyers B", val: gb?.promo_buyers_pct ?? 0, color: accentB },
                    { label: "Free shipping B", val: gb?.free_shipping_pct ?? 0, color: accentB },
                  ].map(m => (
                    <div key={m.label} style={{ background: t.kpi, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, color: t.textSub, marginBottom: 6 }}>{m.label}</div>
                      <div style={{ background: t.border, borderRadius: 4, height: 8, marginBottom: 6, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(m.val, 100)}%`, height: "100%", background: m.color, borderRadius: 4, transition: "width 0.5s" }} />
                      </div>
                      <div style={{ fontSize: 18, fontFamily: "var(--font-dm-serif,serif)", color: m.color }}>{fmtPct(m.val)}</div>
                    </div>
                  ))}
                </div>

                {/* Type filter */}
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {["", "sale", "discount", "bundle", "free_shipping", "promo_code", "loyalty"].map(pt => (
                    <button key={pt} onClick={() => setPromoTypeFilter(pt)} style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                      border: `1px solid ${promoTypeFilter === pt ? ACCENT : t.border}`,
                      background: promoTypeFilter === pt ? ACCENT + "22" : t.surface,
                      color: promoTypeFilter === pt ? ACCENT : t.textSub,
                      fontFamily: "var(--font-geist-sans,sans-serif)",
                    }}>
                      {pt || "Wszystkie typy"}
                    </button>
                  ))}
                </div>

                {/* Promo table */}
                <div className="beh-panel" style={{ padding: 0, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {[
                          { col: "promo_name", label: "Promocja" },
                          { col: "promo_type", label: "Typ" },
                          { col: "season", label: "Sezon" },
                          { col: "klientow", label: "Łącznie" },
                          { col: "aKlientow", label: `${labelA}` },
                          { col: "bKlientow", label: `${labelB}` },
                        ].map(h => (
                          <th key={h.col} onClick={() => togglePromoSort(h.col)} style={{
                            padding: "9px 12px", textAlign: h.col === "promo_name" ? "left" : "right",
                            color: promoSort.col === h.col ? ACCENT : t.textSub, fontSize: 10, fontWeight: 500,
                            borderBottom: `1px solid ${t.border}`, cursor: "pointer", userSelect: "none",
                          }}>
                            {h.label} {promoSort.col === h.col ? (promoSort.dir === -1 ? "↓" : "↑") : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {promoRows.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: "center", padding: "24px", color: t.textSub }}>Brak danych</td></tr>
                      ) : promoRows.map((row, i) => (
                        <tr key={row.promo_name} style={{ background: i % 2 === 1 ? t.hover + "44" : "transparent" }}>
                          <td style={{ padding: "9px 12px", color: t.text, borderBottom: `1px solid ${t.border}`, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.promo_name}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", borderBottom: `1px solid ${t.border}` }}>
                            <PromoBadge type={row.promo_type} />
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: t.textSub, borderBottom: `1px solid ${t.border}`, fontSize: 11 }}>{row.season ?? "—"}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: t.text, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{fmtN(row.klientow)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: accentA, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{fmtN(row.aKlientow)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: accentB, borderBottom: `1px solid ${t.border}`, fontVariantNumeric: "tabular-nums" }}>{fmtN(row.bKlientow)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
