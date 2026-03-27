"use client";
import React from "react";
import { useDarkMode } from "../../../hooks/useDarkMode";

const LIGHT = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", badge: "#f0e8de", badgeText: "#b8763a",
  kpi: "#faf9f7",
};
const DARK = {
  bg: "#0a0a0a", surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", badge: "#2a1f14", badgeText: "#b8763a",
  kpi: "#0d0d0c",
};

const SEG_COLORS: Record<string, string> = {
  Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24",
  Returning: "#34d399", New: "#f87171",
};
const RISK_COLORS: Record<string, string> = {
  OK: "#34d399", Risk: "#fbbf24", HighRisk: "#f97316", Lost: "#f87171",
};

function fmtPln(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} mln zł`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)} tys. zł`;
  return `${n.toLocaleString('pl-PL')} zł`;
}

export type OverviewData = {
  totalCustomers: number;
  totalLtv: number;
  avgLtv: number;
  vipReanimacja: number;
  bySegment: { segment: string; count: number; sumLtv: number; avgLtv: number; pct: number }[];
  byRisk: { risk_level: string; count: number; pct: number }[];
  topDomains: { domain: string; count: number }[];
} | null;

export default function OverviewView({ data }: { data: OverviewData }) {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  function handleRefresh() {
    window.location.reload();
  }

  if (!data) {
    return (
      <div style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", color: t.textSub, padding: "60px 0", textAlign: "center", fontSize: 15 }}>
        Brak danych — wgraj CSV w zakładce <strong style={{ color: t.text }}>Import</strong>
      </div>
    );
  }

  const maxDomain = Math.max(...data.topDomains.map(d => d.count), 1);
  const maxRisk = Math.max(...data.byRisk.map(r => r.count), 1);

  return (
    <>
      <style>{`
        .oa-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .oa-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .oa-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .oa-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .oa-kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-bottom: 32px; }
        .oa-kpi { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 10px; padding: 20px 22px; }
        .oa-kpi-val { font-family: var(--font-dm-serif), serif; font-size: 30px; color: ${t.text}; margin: 0 0 2px; }
        .oa-kpi-label { font-size: 12px; color: ${t.textSub}; }
        .oa-kpi-accent { color: ${t.accent}; }
        .oa-block { margin-bottom: 32px; }
        .oa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .oa-table th { text-align: left; padding: 8px 12px; color: ${t.textSub}; font-size: 11px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; }
        .oa-table td { padding: 10px 12px; border-bottom: 1px solid ${t.border}; color: ${t.text}; }
        .oa-table tr:last-child td { border-bottom: none; }
        .oa-table-wrap { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .oa-seg-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .oa-risk-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; color: #fff; }
        .oa-bar-bg { background: ${t.border}; border-radius: 4px; height: 8px; overflow: hidden; }
        .oa-bar-fill { height: 8px; border-radius: 4px; transition: width 0.3s; }
        .oa-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .oa-world-row { display: grid; grid-template-columns: 120px 1fr 50px; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid ${t.border}; font-size: 13px; color: ${t.text}; }
        .oa-world-row:last-child { border-bottom: none; }
        .oa-risk-row { padding: 12px 16px; border-bottom: 1px solid ${t.border}; display: flex; align-items: center; gap: 12px; }
        .oa-risk-row:last-child { border-bottom: none; }
        @media (max-width: 768px) { .oa-two-col { grid-template-columns: 1fr; } }
      `}</style>

      <div className="oa-wrap">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 4 }}>
          <h1 className="oa-title">Analityka CRM — Overview 360°</h1>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <button
              onClick={handleRefresh}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 13px", fontSize: 12, fontWeight: 500,
                borderRadius: 7, cursor: "pointer",
                background: t.kpi, border: `1px solid ${t.border}`,
                color: t.text,
                whiteSpace: "nowrap",
              }}
            >
              <span>🔄</span>
              Odśwież dane
            </button>
          </div>
        </div>
        <p className="oa-sub">Kompletny przegląd bazy klientów Nadwyraz.com</p>

        <div className="oa-kpis">
          <div className="oa-kpi">
            <div className="oa-kpi-val">{data.totalCustomers.toLocaleString('pl-PL')}</div>
            <div className="oa-kpi-label">Łączna liczba klientów</div>
          </div>
          <div className="oa-kpi">
            <div className="oa-kpi-val oa-kpi-accent">{fmtPln(data.totalLtv)}</div>
            <div className="oa-kpi-label">LTV łączne (suma)</div>
          </div>
          <div className="oa-kpi">
            <div className="oa-kpi-val">{data.avgLtv.toLocaleString('pl-PL')} zł</div>
            <div className="oa-kpi-label">Średnie LTV na klienta</div>
          </div>
          <div className="oa-kpi">
            <div className="oa-kpi-val" style={{ color: "#f97316" }}>{data.vipReanimacja}</div>
            <div className="oa-kpi-label">VIP do reanimacji (Diamond + Platinum Lost/HighRisk)</div>
          </div>
        </div>

        <div className="oa-block">
          <div className="oa-section">Segmenty klientów</div>
          <div className="oa-table-wrap">
            <table className="oa-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th style={{ textAlign: "right" }}>Klienci</th>
                  <th style={{ textAlign: "right" }}>% bazy</th>
                  <th style={{ textAlign: "right" }}>Suma LTV</th>
                  <th style={{ textAlign: "right" }}>Avg LTV</th>
                </tr>
              </thead>
              <tbody>
                {data.bySegment.map(s => (
                  <tr key={s.segment}>
                    <td>
                      <span className="oa-seg-badge" style={{
                        background: SEG_COLORS[s.segment] + "22",
                        color: SEG_COLORS[s.segment],
                        border: `1px solid ${SEG_COLORS[s.segment]}44`,
                      }}>
                        {s.segment}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{s.count}</td>
                    <td style={{ textAlign: "right", color: t.textSub }}>{s.pct}%</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtPln(s.sumLtv)}</td>
                    <td style={{ textAlign: "right", color: t.accent, fontVariantNumeric: "tabular-nums" }}>{s.avgLtv.toLocaleString('pl-PL')} zł</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="oa-two-col">
          <div className="oa-block">
            <div className="oa-section">Poziomy ryzyka (churn)</div>
            <div className="oa-table-wrap">
              {data.byRisk.map(r => (
                <div key={r.risk_level} className="oa-risk-row">
                  <span className="oa-risk-badge" style={{ background: RISK_COLORS[r.risk_level] }}>
                    {r.risk_level}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="oa-bar-bg">
                      <div className="oa-bar-fill" style={{
                        width: `${(r.count / maxRisk) * 100}%`,
                        background: RISK_COLORS[r.risk_level],
                      }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: t.text, fontVariantNumeric: "tabular-nums", minWidth: 50, textAlign: "right" }}>
                    {r.count} <span style={{ color: t.textSub, fontSize: 11 }}>({r.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="oa-block">
            <div className="oa-section">Top 10 domen tematycznych</div>
            <div className="oa-table-wrap" style={{ padding: "4px 16px" }}>
              {data.topDomains.map((d, i) => (
                <div key={d.domain} className="oa-world-row">
                  <span style={{ color: t.textSub, fontSize: 11 }}>#{i + 1} {d.domain}</span>
                  <div className="oa-bar-bg">
                    <div className="oa-bar-fill" style={{
                      width: `${(d.count / maxDomain) * 100}%`,
                      background: t.accent,
                    }} />
                  </div>
                  <span style={{ color: t.textSub, fontSize: 11, textAlign: "right" }}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
