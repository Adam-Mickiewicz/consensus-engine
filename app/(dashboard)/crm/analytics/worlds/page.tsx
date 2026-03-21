"use client";
import { useDarkMode } from "../../../../hooks/useDarkMode";
import { worldsAnalytics, SEGMENTS } from "../../../../../lib/crm/mockData";

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
const PILLAR_COLORS = ["#b8763a", "#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f97316"];

export default function WorldsPage() {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  const maxTag = Math.max(...worldsAnalytics.topTags.map(t => t.count));
  const maxPillar = Math.max(...worldsAnalytics.pillarStats.map(p => p.count));

  // Heat intensity for heatmap
  function heatColor(pct: number) {
    const alpha = Math.min(0.85, 0.05 + pct / 50);
    return `rgba(184, 118, 58, ${alpha})`;
  }

  return (
    <>
      <style>{`
        .wl-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .wl-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .wl-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .wl-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .wl-block { margin-bottom: 32px; }
        .wl-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .wl-two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
        .wl-bar-bg { background: ${t.border}; border-radius: 3px; height: 6px; flex: 1; overflow: hidden; }
        .wl-bar-fill { height: 6px; border-radius: 3px; }
        .wl-tag-row { display: flex; align-items: center; gap: 10px; padding: 7px 16px; border-bottom: 1px solid ${t.border}; font-size: 12px; }
        .wl-tag-row:last-child { border-bottom: none; }
        .wl-tag-rank { color: ${t.textSub}; font-size: 10px; min-width: 18px; }
        .wl-tag-name { min-width: 140px; color: ${t.text}; }
        .wl-tag-count { color: ${t.textSub}; font-size: 11px; min-width: 36px; text-align: right; }
        .wl-pillar-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .wl-pillar-row:last-child { border-bottom: none; }
        .wl-pillar-name { min-width: 160px; color: ${t.text}; font-weight: 500; }
        .wl-pillar-pct { color: ${t.textSub}; font-size: 12px; min-width: 45px; text-align: right; }
        .wl-domain-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .wl-domain-row:last-child { border-bottom: none; }
        .wl-heat-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .wl-heat-table th { padding: 8px 10px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: center; }
        .wl-heat-table td { padding: 8px 10px; border-bottom: 1px solid ${t.border}; text-align: center; }
        .wl-heat-table tr:last-child td { border-bottom: none; }
        .wl-heat-table td:first-child { text-align: left; }
        .wl-seg-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        @media (max-width: 768px) { .wl-two { grid-template-columns: 1fr; } }
      `}</style>

      <div className="wl-wrap">
        <h1 className="wl-title">Mapa Zainteresowań</h1>
        <p className="wl-sub">DNA taksonomiczne bazy klientów — tagi, światy i filary marki Nadwyraz.com</p>

        <div className="wl-two">
          {/* Top granular tags */}
          <div>
            <div className="wl-section">Top 20 tagów granularnych</div>
            <div className="wl-card">
              {worldsAnalytics.topTags.map((item, i) => (
                <div key={item.tag} className="wl-tag-row">
                  <span className="wl-tag-rank">#{i + 1}</span>
                  <span className="wl-tag-name">{item.tag}</span>
                  <div className="wl-bar-bg">
                    <div className="wl-bar-fill" style={{
                      width: `${(item.count / maxTag) * 100}%`,
                      background: t.accent,
                    }} />
                  </div>
                  <span className="wl-tag-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Brand pillars */}
          <div>
            <div className="wl-section">Filary marki Nadwyraz</div>
            <div className="wl-card" style={{ marginBottom: 20 }}>
              {worldsAnalytics.pillarStats.map((p, i) => (
                <div key={p.pillar} className="wl-pillar-row">
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: PILLAR_COLORS[i], flexShrink: 0 }} />
                  <span className="wl-pillar-name">{p.pillar}</span>
                  <div className="wl-bar-bg">
                    <div className="wl-bar-fill" style={{
                      width: `${(p.count / maxPillar) * 100}%`,
                      background: PILLAR_COLORS[i],
                    }} />
                  </div>
                  <span className="wl-pillar-pct">{p.pct}%</span>
                </div>
              ))}
            </div>

            {/* Domains */}
            <div className="wl-section">Domeny tematyczne</div>
            <div className="wl-card">
              {worldsAnalytics.domains.map(d => (
                <div key={d.domain} className="wl-domain-row">
                  <div>
                    <div style={{ fontWeight: 600, color: t.text, marginBottom: 2 }}>{d.domain}</div>
                    <div style={{ fontSize: 11, color: t.textSub }}>{d.worlds.join(", ")}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: t.accent, fontWeight: 600 }}>{d.count}</div>
                    <div style={{ fontSize: 11, color: t.textSub }}>{d.pct}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Segment × World heatmap */}
        <div className="wl-block">
          <div className="wl-section">Heatmapa: Segment × Ulubiony Świat</div>
          <div className="wl-card" style={{ overflowX: "auto" }}>
            <table className="wl-heat-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", minWidth: 90 }}>Segment</th>
                  {["Koty", "Literatura", "Humor", "Polszczyzna", "Psy", "Filozofia", "Relacje i miłość", "Jedzenie i napoje", "Edukacja", "Zwierzęta"].map(w => (
                    <th key={w} style={{ minWidth: 70, fontSize: 10 }}>{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {worldsAnalytics.heatmap.map(row => (
                  <tr key={row.segment}>
                    <td>
                      <span className="wl-seg-badge" style={{
                        background: SEG_COLORS[row.segment] + "22",
                        color: SEG_COLORS[row.segment],
                      }}>{row.segment}</span>
                    </td>
                    {row.worldDist.map(wd => (
                      <td key={wd.world} style={{
                        background: heatColor(wd.pct),
                        color: t.text,
                        fontSize: 11,
                      }}>
                        {wd.pct > 0 ? `${wd.pct}%` : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Segment domain breakdown */}
        <div className="wl-block">
          <div className="wl-section">Breakdown domen per segment</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {worldsAnalytics.domains.map(d => (
              <div key={d.domain} className="wl-card" style={{ padding: "16px" }}>
                <div style={{ fontWeight: 600, color: t.text, marginBottom: 10, fontSize: 13 }}>{d.domain}</div>
                {d.bySegment.map(bs => (
                  <div key={bs.segment} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: SEG_COLORS[bs.segment] }}>{bs.segment}</span>
                    <span style={{ color: t.textSub }}>{bs.count} klientów</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
