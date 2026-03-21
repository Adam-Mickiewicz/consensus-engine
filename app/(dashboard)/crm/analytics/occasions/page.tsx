"use client";
import { useDarkMode } from "../../../../hooks/useDarkMode";
import { occasionsAnalytics, customers } from "../../../../../lib/crm/mockData";

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

const MONTH_LABELS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

export default function OccasionsPage() {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  const { topOccasions, cyclicalByOcc, heatmapMonths, cyclicMatki } = occasionsAnalytics;
  const maxCust = Math.max(...topOccasions.map(o => o.customerCount));
  const maxMonth = Math.max(...heatmapMonths.map(m => m.orders));

  // Clamp heat opacity
  function heatOpacity(val: number, max: number) {
    return Math.min(0.9, 0.08 + (val / max) * 0.82);
  }

  // Cyclic buyers list (buys same occasion 2+ years)
  const cyclicRows = topOccasions.slice(0, 8).map(occ => {
    const cyclic = cyclicalByOcc[occ.occasion] || 0;
    const pct = occ.customerCount > 0 ? Math.round((cyclic / occ.customerCount) * 100) : 0;
    return { ...occ, cyclic, cyclicPct: pct };
  });

  // Campaign list: buyers of Dzień Matki every year
  const dzieMatkiEveryYear = customers.filter(c => {
    const years = [...new Set(c.orders.filter(o => o.occasion === 'Dzień Matki').map(o => o.date.slice(0, 4)))];
    return years.length >= 2;
  }).length;

  return (
    <>
      <style>{`
        .oc-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .oc-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .oc-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .oc-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .oc-block { margin-bottom: 32px; }
        .oc-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .oc-two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
        .oc-bar-bg { background: ${t.border}; border-radius: 3px; height: 8px; flex: 1; overflow: hidden; }
        .oc-bar-fill { height: 8px; border-radius: 3px; }
        .oc-occ-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .oc-occ-row:last-child { border-bottom: none; }
        .oc-occ-name { min-width: 150px; color: ${t.text}; font-weight: 500; }
        .oc-occ-count { color: ${t.textSub}; font-size: 12px; min-width: 55px; text-align: right; }
        .oc-heat { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; }
        .oc-heat-cell { border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; min-height: 64px; }
        .oc-heat-month { font-size: 10px; color: ${t.textSub}; margin-bottom: 2px; }
        .oc-heat-val { font-size: 13px; font-weight: 700; color: ${t.text}; }
        .oc-cyclic-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .oc-cyclic-table th { padding: 8px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: left; }
        .oc-cyclic-table td { padding: 10px 14px; border-bottom: 1px solid ${t.border}; color: ${t.text}; }
        .oc-cyclic-table tr:last-child td { border-bottom: none; }
        .oc-campaign-card { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 10px; padding: 20px 24px; display: flex; align-items: center; gap: 20px; }
        @media (max-width: 768px) { .oc-two { grid-template-columns: 1fr; } .oc-heat { grid-template-columns: repeat(6, 1fr); } }
      `}</style>

      <div className="oc-wrap">
        <h1 className="oc-title">Kalendarz Okazji</h1>
        <p className="oc-sub">Analiza sezonowości, okazji zakupowych i klientów cyklicznych</p>

        <div className="oc-two">
          {/* Top 10 occasions */}
          <div>
            <div className="oc-section">Top 10 okazji — liczba klientów</div>
            <div className="oc-card">
              {topOccasions.slice(0, 10).map((occ, i) => (
                <div key={occ.occasion} className="oc-occ-row">
                  <span style={{ color: t.textSub, fontSize: 11, minWidth: 18 }}>#{i + 1}</span>
                  <span className="oc-occ-name">{occ.occasion}</span>
                  <div className="oc-bar-bg">
                    <div className="oc-bar-fill" style={{
                      width: `${(occ.customerCount / maxCust) * 100}%`,
                      background: t.accent,
                    }} />
                  </div>
                  <span className="oc-occ-count">{occ.customerCount} klientów</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cyclical occasions */}
          <div>
            <div className="oc-section">Cykliczność okazji (2+ lata z rzędu)</div>
            <div className="oc-card">
              <table className="oc-cyclic-table">
                <thead>
                  <tr>
                    <th>Okazja</th>
                    <th style={{ textAlign: "right" }}>Cyklicznych</th>
                    <th style={{ textAlign: "right" }}>% okazji</th>
                  </tr>
                </thead>
                <tbody>
                  {cyclicRows.map(r => (
                    <tr key={r.occasion}>
                      <td>{r.occasion}</td>
                      <td style={{ textAlign: "right", color: r.cyclic > 0 ? "#34d399" : t.textSub }}>
                        {r.cyclic}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          <div style={{ width: 50, background: t.border, borderRadius: 3, height: 5, overflow: "hidden" }}>
                            <div style={{ width: `${r.cyclicPct}%`, background: "#34d399", height: 5, borderRadius: 3 }} />
                          </div>
                          <span style={{ color: t.textSub, fontSize: 11 }}>{r.cyclicPct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Monthly heatmap */}
        <div className="oc-block">
          <div className="oc-section">Heatmapa sezonowości — zamówienia per miesiąc roku</div>
          <div className="oc-heat">
            {heatmapMonths.map((m, i) => (
              <div key={m.month} className="oc-heat-cell" style={{
                background: `rgba(184, 118, 58, ${heatOpacity(m.orders, maxMonth)})`,
                border: `1px solid ${t.border}`,
              }}>
                <div className="oc-heat-month">{m.month}</div>
                <div className="oc-heat-val">{m.orders}</div>
                <div style={{ fontSize: 9, color: t.textSub }}>{m.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign lists */}
        <div className="oc-block">
          <div className="oc-section">Kampanie personalizowane — listy klientów</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            <div className="oc-campaign-card">
              <div style={{ fontSize: 32 }}>🌺</div>
              <div>
                <div style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 24, color: t.accent, marginBottom: 2 }}>
                  {dzieMatkiEveryYear}
                </div>
                <div style={{ fontWeight: 600, color: t.text, fontSize: 13, marginBottom: 2 }}>
                  Kupuje Dzień Matki co roku
                </div>
                <div style={{ fontSize: 11, color: t.textSub }}>
                  Warto targetować kampanię od 15 kwietnia
                </div>
              </div>
            </div>
            {topOccasions.slice(0, 3).map(occ => {
              const cyclic = cyclicalByOcc[occ.occasion] || 0;
              return (
                <div key={occ.occasion} className="oc-campaign-card">
                  <div style={{ fontSize: 32 }}>🎯</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 24, color: t.text, marginBottom: 2 }}>
                      {cyclic}
                    </div>
                    <div style={{ fontWeight: 600, color: t.text, fontSize: 13, marginBottom: 2 }}>
                      {occ.occasion} — cykliczni
                    </div>
                    <div style={{ fontSize: 11, color: t.textSub }}>
                      {occ.customerCount} łącznie kupuje tę okazję
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
