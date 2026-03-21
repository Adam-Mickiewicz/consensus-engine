"use client";
import { useDarkMode } from "../../../../hooks/useDarkMode";
import { behaviorAnalytics, overview, SEGMENTS } from "../../../../../lib/crm/mockData";

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

const SEG_COLORS: Record<string, string> = {
  Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24",
  Returning: "#34d399", New: "#f87171",
};

const PERSONAS = [
  {
    key: "earlyAdopters",
    title: "Early Adopters",
    icon: "🚀",
    desc: "Kupują nowości w ciągu 30 dni od launchu. Najcenniejsi ambasadorzy.",
    color: "#60a5fa",
  },
  {
    key: "promoHunters",
    title: "Promo Hunters",
    icon: "🏷️",
    desc: "70%+ zakupów na promocjach. Wrażliwi cenowo, niskie marże.",
    color: "#f87171",
  },
  {
    key: "occasionBuyers",
    title: "Occasion Buyers",
    icon: "🎁",
    desc: "Kupują regularnie na konkretne okazje (Dzień Matki, Boże Narodzenie).",
    color: "#34d399",
  },
];

export default function BehaviorPage() {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  const total = overview.totalCustomers;
  const { promoOnly, fullOnly, mixed, personas, ordersPerYear, promoBySegment } = behaviorAnalytics;

  const buyerTypes = [
    { label: "Tylko full price", count: fullOnly, color: "#34d399", pct: Math.round(fullOnly / total * 100) },
    { label: "Mix promo + full", count: mixed, color: t.accent, pct: Math.round(mixed / total * 100) },
    { label: "Promo hunters (70%+ promo)", count: promoOnly, color: "#f87171", pct: Math.round(promoOnly / total * 100) },
  ];

  const maxOrders = Math.max(...ordersPerYear.map(r => r.avgOrdersPerYear));

  return (
    <>
      <style>{`
        .bh-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .bh-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .bh-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .bh-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .bh-block { margin-bottom: 32px; }
        .bh-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .bh-two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
        .bh-three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .bh-bar-bg { background: ${t.border}; border-radius: 4px; height: 10px; flex: 1; overflow: hidden; }
        .bh-bar-fill { height: 10px; border-radius: 4px; }
        .bh-buyer-row { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .bh-buyer-row:last-child { border-bottom: none; }
        .bh-persona-card { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 10px; padding: 20px; }
        .bh-persona-icon { font-size: 28px; margin-bottom: 10px; }
        .bh-persona-title { font-size: 14px; font-weight: 700; color: ${t.text}; margin-bottom: 4px; }
        .bh-persona-count { font-family: var(--font-dm-serif), serif; font-size: 24px; margin-bottom: 6px; }
        .bh-persona-desc { font-size: 12px; color: ${t.textSub}; line-height: 1.5; }
        .bh-seg-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bh-seg-table th { padding: 8px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: center; }
        .bh-seg-table td { padding: 10px 14px; border-bottom: 1px solid ${t.border}; text-align: center; color: ${t.text}; }
        .bh-seg-table td:first-child { text-align: left; }
        .bh-seg-table tr:last-child td { border-bottom: none; }
        .bh-seg-badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .bh-orders-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .bh-orders-row:last-child { border-bottom: none; }
        @media (max-width: 768px) { .bh-two { grid-template-columns: 1fr; } .bh-three { grid-template-columns: 1fr; } }
      `}</style>

      <div className="bh-wrap">
        <h1 className="bh-title">Analiza Zachowań Zakupowych</h1>
        <p className="bh-sub">Wzorce zakupowe, typologie klientów i aktywność per segment</p>

        {/* Buyer types */}
        <div className="bh-two">
          <div>
            <div className="bh-section">Promo vs Full Price</div>
            <div className="bh-card">
              {buyerTypes.map(bt => (
                <div key={bt.label} className="bh-buyer-row">
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: bt.color, flexShrink: 0 }} />
                  <span style={{ minWidth: 200, color: t.text }}>{bt.label}</span>
                  <div className="bh-bar-bg">
                    <div className="bh-bar-fill" style={{ width: `${bt.pct}%`, background: bt.color }} />
                  </div>
                  <span style={{ color: t.textSub, fontSize: 12, minWidth: 80, textAlign: "right" }}>
                    {bt.count} ({bt.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Orders per year */}
          <div>
            <div className="bh-section">Śr. zakupów / rok per segment</div>
            <div className="bh-card">
              {ordersPerYear.map(r => (
                <div key={r.segment} className="bh-orders-row">
                  <span className="bh-seg-badge" style={{
                    background: SEG_COLORS[r.segment] + "22",
                    color: SEG_COLORS[r.segment],
                    minWidth: 80,
                  }}>{r.segment}</span>
                  <div className="bh-bar-bg">
                    <div className="bh-bar-fill" style={{
                      width: `${(r.avgOrdersPerYear / maxOrders) * 100}%`,
                      background: SEG_COLORS[r.segment],
                    }} />
                  </div>
                  <span style={{ color: t.text, fontSize: 13, minWidth: 50, textAlign: "right", fontWeight: 600 }}>
                    {r.avgOrdersPerYear}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3 Personas */}
        <div className="bh-block">
          <div className="bh-section">Persony zakupowe</div>
          <div className="bh-three">
            {PERSONAS.map(p => {
              const count = personas[p.key as keyof typeof personas];
              const pct = Math.round((count / total) * 100);
              return (
                <div key={p.key} className="bh-persona-card">
                  <div className="bh-persona-icon">{p.icon}</div>
                  <div className="bh-persona-title">{p.title}</div>
                  <div className="bh-persona-count" style={{ color: p.color }}>
                    {count.toLocaleString('pl-PL')}
                    <span style={{ fontSize: 14, color: t.textSub, fontFamily: "var(--font-geist-sans)", marginLeft: 6 }}>({pct}%)</span>
                  </div>
                  <div className="bh-persona-desc">{p.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Promo breakdown per segment */}
        <div className="bh-block">
          <div className="bh-section">Zachowania promo per segment</div>
          <div className="bh-card">
            <table className="bh-seg-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Segment</th>
                  <th style={{ color: "#34d399" }}>Full Price</th>
                  <th style={{ color: t.accent }}>Mieszani</th>
                  <th style={{ color: "#f87171" }}>Promo Hunters</th>
                  <th>% promo hunters</th>
                </tr>
              </thead>
              <tbody>
                {SEGMENTS.map(seg => {
                  const d = promoBySegment[seg];
                  const segTotal = d.promo + d.full + d.mixed;
                  const promoPct = segTotal ? Math.round((d.promo / segTotal) * 100) : 0;
                  return (
                    <tr key={seg}>
                      <td>
                        <span className="bh-seg-badge" style={{
                          background: SEG_COLORS[seg] + "22",
                          color: SEG_COLORS[seg],
                        }}>{seg}</span>
                      </td>
                      <td style={{ color: "#34d399" }}>{d.full}</td>
                      <td style={{ color: t.accent }}>{d.mixed}</td>
                      <td style={{ color: "#f87171" }}>{d.promo}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                          <div style={{ width: 60, background: t.border, borderRadius: 3, height: 6, overflow: "hidden" }}>
                            <div style={{ width: `${promoPct}%`, background: "#f87171", height: 6, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: t.textSub }}>{promoPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Early adopters highlight */}
        <div className="bh-block">
          <div className="bh-section">Early Adopters — szczegóły</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {[
              { label: "Early Adopters (total)", value: `${personas.earlyAdopters} klientów`, color: "#60a5fa" },
              { label: "% bazy który kupuje nowości", value: `${Math.round(personas.earlyAdopters / total * 100)}%`, color: "#60a5fa" },
              { label: "Full-price loyal", value: `${personas.fullPricers} klientów`, color: "#34d399" },
              { label: "Mieszani (promo + full)", value: `${personas.mixedBuyers} klientów`, color: t.accent },
            ].map(c => (
              <div key={c.label} className="bh-card" style={{ padding: "18px 20px" }}>
                <div style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 22, color: c.color, marginBottom: 4 }}>{c.value}</div>
                <div style={{ fontSize: 12, color: t.textSub }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
