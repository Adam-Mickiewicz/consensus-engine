"use client";
import { useDarkMode } from "../../../../hooks/useDarkMode";
import { cohortAnalytics } from "../../../../../lib/crm/mockData";

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

const MONTHS_PL: Record<string, string> = {
  '01': 'Sty', '02': 'Lut', '03': 'Mar', '04': 'Kwi', '05': 'Maj', '06': 'Cze',
  '07': 'Lip', '08': 'Sie', '09': 'Wrz', '10': 'Paź', '11': 'Lis', '12': 'Gru',
};

function fmtCohort(key: string) {
  const [y, m] = key.split('-');
  return `${MONTHS_PL[m]} ${y}`;
}

function retColor(pct: number): string {
  if (pct === 0) return 'transparent';
  if (pct >= 60) return `rgba(52, 211, 153, ${0.3 + pct / 200})`;
  if (pct >= 30) return `rgba(251, 191, 36, ${0.2 + pct / 200})`;
  return `rgba(248, 113, 113, ${0.15 + pct / 200})`;
}

export default function CohortsPage() {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  const { matrix, avgTimeToSecond, retentionBySegment } = cohortAnalytics;

  // Show last 18 cohorts
  const displayMatrix = matrix.slice(-18);
  const MAX_OFFSET = 6; // Show first 6 months for readability

  return (
    <>
      <style>{`
        .ch-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .ch-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .ch-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .ch-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .ch-block { margin-bottom: 32px; }
        .ch-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .ch-two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
        .ch-matrix-wrap { overflow-x: auto; }
        .ch-matrix { border-collapse: collapse; font-size: 11px; width: 100%; }
        .ch-matrix th { padding: 6px 10px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: center; white-space: nowrap; background: ${t.surface}; }
        .ch-matrix th:first-child { text-align: left; min-width: 80px; }
        .ch-matrix td { padding: 5px 8px; border: 1px solid ${t.border}; text-align: center; font-size: 11px; min-width: 52px; }
        .ch-matrix td:first-child { text-align: left; color: ${t.textSub}; background: ${t.surface}; font-size: 10px; white-space: nowrap; }
        .ch-matrix td.cohort-0 { background: ${t.accent}22; color: ${t.accent}; font-weight: 700; }
        .ch-ret-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${t.border}; }
        .ch-ret-row:last-child { border-bottom: none; }
        .ch-seg-badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .ch-bar-bg { background: ${t.border}; border-radius: 3px; height: 8px; flex: 1; overflow: hidden; }
        .ch-bar-fill { height: 8px; border-radius: 3px; }
        .ch-time-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .ch-time-row:last-child { border-bottom: none; }
        @media (max-width: 768px) { .ch-two { grid-template-columns: 1fr; } }
      `}</style>

      <div className="ch-wrap">
        <h1 className="ch-title">Kohorty Retencji</h1>
        <p className="ch-sub">Analiza powrotów klientów per miesiąc akwizycji</p>

        {/* Retention per segment + time to second purchase */}
        <div className="ch-two">
          <div>
            <div className="ch-section">Wskaźnik retencji per segment (zakup 2+)</div>
            <div className="ch-card">
              {retentionBySegment.map(r => (
                <div key={r.segment} className="ch-ret-row">
                  <span className="ch-seg-badge" style={{
                    background: SEG_COLORS[r.segment] + "22",
                    color: SEG_COLORS[r.segment],
                    minWidth: 80,
                  }}>{r.segment}</span>
                  <div className="ch-bar-bg">
                    <div className="ch-bar-fill" style={{
                      width: `${r.rate}%`,
                      background: SEG_COLORS[r.segment],
                    }} />
                  </div>
                  <div style={{ textAlign: "right", minWidth: 90 }}>
                    <span style={{ color: t.text, fontWeight: 600, fontSize: 14 }}>{r.rate}%</span>
                    <span style={{ color: t.textSub, fontSize: 11, marginLeft: 4 }}>({r.repeat}/{r.total})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="ch-section">Śr. czas do 2. zakupu (dni)</div>
            <div className="ch-card">
              {avgTimeToSecond.map(r => (
                <div key={r.segment} className="ch-time-row">
                  <span className="ch-seg-badge" style={{
                    background: SEG_COLORS[r.segment] + "22",
                    color: SEG_COLORS[r.segment],
                    minWidth: 80,
                  }}>{r.segment}</span>
                  <div style={{ flex: 1 }} />
                  {r.days !== null ? (
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 20, color: t.text }}>{r.days}</span>
                      <span style={{ color: t.textSub, fontSize: 11, marginLeft: 4 }}>dni</span>
                    </div>
                  ) : (
                    <span style={{ color: t.textSub, fontSize: 12 }}>brak danych</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cohort matrix */}
        <div className="ch-block">
          <div className="ch-section">
            Macierz kohort — retencja miesięczna (ostatnie 18 kohort, % klientów aktywnych)
          </div>
          <div className="ch-card">
            <div className="ch-matrix-wrap">
              <table className="ch-matrix">
                <thead>
                  <tr>
                    <th>Kohorta</th>
                    <th>Rozmiar</th>
                    <th>M+0</th>
                    {Array.from({ length: MAX_OFFSET }, (_, i) => (
                      <th key={i + 1}>M+{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayMatrix.map(row => (
                    <tr key={row.cohort}>
                      <td>{fmtCohort(row.cohort)}</td>
                      <td style={{ color: t.textSub, textAlign: "center" }}>{row.size}</td>
                      {row.retentionByOffset.slice(0, MAX_OFFSET + 1).map((pct, i) => (
                        <td
                          key={i}
                          className={i === 0 ? "cohort-0" : ""}
                          style={{
                            background: i === 0 ? undefined : retColor(pct),
                            color: i === 0 ? undefined : pct === 0 ? t.border : t.text,
                          }}
                        >
                          {pct > 0 ? `${pct}%` : i === 0 ? "100%" : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 20, fontSize: 11, color: t.textSub }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(52,211,153,0.7)" }} />
                ≥60% retencja
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(251,191,36,0.6)" }} />
                30–59%
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(248,113,113,0.5)" }} />
                &lt;30%
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
