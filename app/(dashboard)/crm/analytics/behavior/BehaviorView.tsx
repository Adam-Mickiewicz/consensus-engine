"use client";
import { useDarkMode } from "../../../../hooks/useDarkMode";

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

const SEASON_LABELS: Record<string, string> = {
  WALENTYNKI: "Walentynki",
  DZIEN_KOBIET: "Dzień Kobiet",
  DZIEN_MATKI: "Dzień Matki",
  DZIEN_OJCA: "Dzień Ojca",
  DZIEN_CHLOPAKA: "Dzień Chłopaka",
  DZIEN_NAUCZYCIELA: "Dzień Nauczyciela",
  BLACK_WEEK: "Black Week",
  MIKOLAJKI: "Mikołajki",
  GWIAZDKA: "Gwiazdka",
  DZIEN_MEZCZYZNY: "Dzień Mężczyzny",
};

export type BehaviorData = {
  totalCustomers: number;
  ordersPerYear: { segment: string; avgOrdersPerYear: number }[];
  retentionBySegment: { segment: string; total: number; repeat: number; rate: number }[];
  topSeasons: { season: string; count: number; pct: number }[];
} | null;

export default function BehaviorView({ data }: { data: BehaviorData }) {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  if (!data) {
    return (
      <div style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", color: t.textSub, padding: "60px 0", textAlign: "center", fontSize: 15 }}>
        Brak danych — wgraj CSV w zakładce <strong style={{ color: t.text }}>Import</strong>
      </div>
    );
  }

  const maxOrders = Math.max(...data.ordersPerYear.map(r => r.avgOrdersPerYear), 1);
  const maxSeason = Math.max(...data.topSeasons.map(s => s.count), 1);

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
        .bh-bar-bg { background: ${t.border}; border-radius: 4px; height: 10px; flex: 1; overflow: hidden; }
        .bh-bar-fill { height: 10px; border-radius: 4px; }
        .bh-seg-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .bh-seg-table th { padding: 8px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: center; }
        .bh-seg-table td { padding: 10px 14px; border-bottom: 1px solid ${t.border}; text-align: center; color: ${t.text}; }
        .bh-seg-table td:first-child { text-align: left; }
        .bh-seg-table tr:last-child td { border-bottom: none; }
        .bh-seg-badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .bh-orders-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .bh-orders-row:last-child { border-bottom: none; }
        .bh-season-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .bh-season-row:last-child { border-bottom: none; }
        @media (max-width: 768px) { .bh-two { grid-template-columns: 1fr; } }
      `}</style>

      <div className="bh-wrap">
        <h1 className="bh-title">Analiza Zachowań Zakupowych</h1>
        <p className="bh-sub">Częstotliwość zakupów, retencja per segment i sezonowość</p>

        <div className="bh-two">
          {/* Orders per year */}
          <div>
            <div className="bh-section">Śr. zakupów / rok per segment</div>
            <div className="bh-card">
              {data.ordersPerYear.map(r => (
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
                    {r.avgOrdersPerYear.toFixed(1)}×
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top seasons */}
          <div>
            <div className="bh-section">Top okazje zakupowe</div>
            <div className="bh-card">
              {data.topSeasons.map(s => (
                <div key={s.season} className="bh-season-row">
                  <span style={{ minWidth: 160, color: t.text, fontWeight: 500, fontSize: 12 }}>
                    {SEASON_LABELS[s.season] ?? s.season}
                  </span>
                  <div className="bh-bar-bg">
                    <div className="bh-bar-fill" style={{
                      width: `${(s.count / maxSeason) * 100}%`,
                      background: t.accent,
                    }} />
                  </div>
                  <span style={{ color: t.textSub, fontSize: 12, minWidth: 70, textAlign: "right" }}>
                    {s.count} ({s.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Retention per segment */}
        <div className="bh-block">
          <div className="bh-section">Retencja per segment (zakup 2+)</div>
          <div className="bh-card">
            <table className="bh-seg-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Segment</th>
                  <th style={{ textAlign: "right" }}>Klienci łącznie</th>
                  <th style={{ textAlign: "right" }}>Powtórni (2+)</th>
                  <th>% retencja</th>
                </tr>
              </thead>
              <tbody>
                {data.retentionBySegment.map(r => (
                  <tr key={r.segment}>
                    <td>
                      <span className="bh-seg-badge" style={{
                        background: SEG_COLORS[r.segment] + "22",
                        color: SEG_COLORS[r.segment],
                      }}>{r.segment}</span>
                    </td>
                    <td style={{ textAlign: "right", color: t.textSub }}>{r.total}</td>
                    <td style={{ textAlign: "right", color: "#34d399" }}>{r.repeat}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                        <div style={{ width: 60, background: t.border, borderRadius: 3, height: 6, overflow: "hidden" }}>
                          <div style={{ width: `${r.rate}%`, background: "#34d399", height: 6, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: t.textSub }}>{r.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
