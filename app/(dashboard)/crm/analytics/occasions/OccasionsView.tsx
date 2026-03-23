"use client";
import { useState } from "react";
import Link from "next/link";
import { useDarkMode } from "../../../../hooks/useDarkMode";

// ── Theme ────────────────────────────────────────────────────────────────────
const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", kpi: "#faf9f7",
  green: "#16a34a", red: "#dc2626",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", kpi: "#0d0d0c",
  green: "#4ade80", red: "#f87171",
};

const SEASON_LABELS: Record<string, string> = {
  WALENTYNKI:        "Walentynki",
  DZIEN_KOBIET:      "Dzień Kobiet",
  DZIEN_MATKI:       "Dzień Matki",
  DZIEN_OJCA:        "Dzień Ojca",
  DZIEN_CHLOPAKA:    "Dzień Chłopaka",
  DZIEN_NAUCZYCIELA: "Dzień Nauczyciela",
  BLACK_WEEK:        "Black Week",
  MIKOLAJKI:         "Mikołajki",
  GWIAZDKA:          "Gwiazdka",
  DZIEN_MEZCZYZNY:   "Dzień Mężczyzny",
  URODZINY:          "Urodziny",
  WIELKANOC:         "Wielkanoc",
};

function occ(key: string) { return SEASON_LABELS[key] ?? key; }

// ── Types ────────────────────────────────────────────────────────────────────
type RetentionMap = Record<string, Record<number, number | null>>;

type LtvRow    = { occasion: string; clients: number; orders: number; avg_basket: number; avg_client_ltv: number };
type FirstRow  = { occasion: string; new_clients: number; avg_first_basket: number; pct_of_new: number };
type LoyalRow  = { client_id: string; occasion: string; years_active: number; first_purchase: string; last_purchase: string; total_ltv: number };
type DriftRow  = { client_id: string; occasions: string[]; occasion_count: number; first_order: string; last_order: string };

type OccasionsData = {
  loyalCount:        number;
  bestLtvOccasion:   string;
  bestLtvValue:      number;
  bestRetention:     { occasion: string; pct: number; year: number } | null;
  bestNewOccasion:   string;
  bestNewCount:      number;
  retentionOccasions: string[];
  retentionMap:      RetentionMap;
  retentionYears:    number[];
  first:  FirstRow[];
  ltv:    LtvRow[];
  loyal:  LoyalRow[];
  drift:  DriftRow[];
} | null;

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pl-PL", { year: "numeric", month: "short", day: "numeric" });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function OccasionsView({ data }: { data: OccasionsData }) {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;
  const [tab, setTab] = useState<"loyal" | "drift">("loyal");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  if (!data) {
    return (
      <div style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", color: t.textSub, padding: "60px 0", textAlign: "center", fontSize: 15 }}>
        Brak danych — wgraj CSV w zakładce <strong style={{ color: t.text }}>Import</strong>
      </div>
    );
  }

  const maxLtv   = Math.max(...data.ltv.map(r => r.avg_client_ltv), 1);
  const maxFirst = Math.max(...data.first.map(r => r.new_clients), 1);

  // Retention cell color
  function retCell(pct: number | null): string {
    if (pct === null) return t.border;
    if (pct >= 60)   return "#16a34a";
    if (pct >= 40)   return "#65a30d";
    if (pct >= 25)   return "#ca8a04";
    if (pct >= 10)   return "#ea580c";
    return "#dc2626";
  }
  function retTextColor(pct: number | null): string {
    return pct === null ? t.textSub : "#ffffff";
  }

  return (
    <>
      <style>{`
        .oca-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 1100px; }
        .oca-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .oca-sub   { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .oca-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .oca-block { margin-bottom: 32px; }
        .oca-card  { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .oca-two   { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }

        /* KPI */
        .oca-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .oca-kpi      { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 10px; padding: 18px 20px; }
        .oca-kpi-val  { font-size: 24px; font-weight: 700; color: ${t.accent}; line-height: 1.1; margin-bottom: 4px; }
        .oca-kpi-lbl  { font-size: 11px; color: ${t.textSub}; text-transform: uppercase; letter-spacing: 0.06em; }

        /* Retention heatmap table */
        .oca-ret-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
        .oca-ret-tbl th { padding: 8px 10px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: center; }
        .oca-ret-tbl th:first-child { text-align: left; }
        .oca-ret-tbl td { padding: 6px 8px; border-bottom: 1px solid ${t.border}; text-align: center; }
        .oca-ret-tbl tr:last-child td { border-bottom: none; }
        .oca-ret-cell { border-radius: 5px; padding: 5px 8px; font-size: 11px; font-weight: 600; min-width: 52px; display: inline-block; }

        /* Bar rows */
        .oca-bar-row  { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; }
        .oca-bar-row:last-child { border-bottom: none; }
        .oca-bar-bg   { flex: 1; background: ${t.border}; border-radius: 4px; height: 8px; overflow: hidden; }
        .oca-bar-fill { height: 8px; border-radius: 4px; }
        .oca-bar-lbl  { min-width: 140px; color: ${t.text}; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .oca-bar-num  { min-width: 80px; text-align: right; color: ${t.textSub}; font-size: 12px; }

        /* Tabs */
        .oca-tabs     { display: flex; gap: 0; border-bottom: 1px solid ${t.border}; margin-bottom: 0; }
        .oca-tab      { padding: 10px 20px; font-size: 12px; cursor: pointer; background: none; border: none; color: ${t.textSub}; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.1s; }
        .oca-tab.active { color: ${t.accent}; border-bottom-color: ${t.accent}; font-weight: 600; }
        .oca-tab:hover  { color: ${t.text}; }

        /* Data table */
        .oca-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .oca-tbl th { padding: 8px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: left; }
        .oca-tbl td { padding: 9px 14px; border-bottom: 1px solid ${t.border}; color: ${t.text}; }
        .oca-tbl tr:last-child td { border-bottom: none; }
        .oca-tbl tr:hover td { background: ${t.hover}; }
        .oca-badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; background: ${t.hover}; color: ${t.accent}; }
        .oca-occ-pill { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 10px; background: ${t.kpi}; color: ${t.textSub}; margin: 1px; border: 1px solid ${t.border}; }

        @media (max-width: 900px) {
          .oca-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .oca-two      { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="oca-wrap">
        <h1 className="oca-title">Analityka Okazji</h1>
        <p className="oca-sub">Retencja, LTV, pierwsze zakupy i lojalność per okazja</p>

        {/* ── Year pills ──────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
          {([null, ...data.retentionYears] as (number | null)[]).map(y => (
            <button
              key={y ?? "all"}
              onClick={() => setSelectedYear(y)}
              style={{
                padding: "5px 14px", fontSize: 12, fontWeight: 600,
                borderRadius: 20, border: `1px solid ${selectedYear === y ? t.accent : t.border}`,
                background: selectedYear === y ? `${t.accent}18` : "none",
                color: selectedYear === y ? t.accent : t.textSub,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {y ?? "Wszystkie lata"}
            </button>
          ))}
        </div>

        {/* ── A: KPI HERO ─────────────────────────────────────────── */}
        <div className="oca-kpi-grid">
          <div className="oca-kpi">
            <div className="oca-kpi-val">{data.loyalCount}</div>
            <div className="oca-kpi-lbl">Okazjonalnych lojalnych (2+ lata)</div>
          </div>
          <div className="oca-kpi">
            <div className="oca-kpi-val" style={{ fontSize: 16 }}>{occ(data.bestLtvOccasion)}</div>
            <div style={{ fontSize: 13, color: t.accent, fontWeight: 700, margin: "2px 0 4px" }}>
              {data.bestLtvValue.toFixed(0)} zł LTV
            </div>
            <div className="oca-kpi-lbl">Najwyższy avg LTV klienta</div>
          </div>
          <div className="oca-kpi">
            <div className="oca-kpi-val">
              {data.bestRetention ? `${data.bestRetention.pct}%` : "—"}
            </div>
            <div style={{ fontSize: 11, color: t.textSub, marginBottom: 2 }}>
              {data.bestRetention ? occ(data.bestRetention.occasion) : ""}
              {data.bestRetention ? ` (${data.bestRetention.year}→${data.bestRetention.year + 1})` : ""}
            </div>
            <div className="oca-kpi-lbl">Najlepsza retencja r/r</div>
          </div>
          <div className="oca-kpi">
            <div className="oca-kpi-val" style={{ fontSize: 16 }}>{occ(data.bestNewOccasion)}</div>
            <div style={{ fontSize: 13, color: t.accent, fontWeight: 700, margin: "2px 0 4px" }}>
              {data.bestNewCount} nowych klientów
            </div>
            <div className="oca-kpi-lbl">Najlepsza okazja dla nowych</div>
          </div>
        </div>

        {/* ── B: RETENCJA — heatmap table ─────────────────────────── */}
        <div className="oca-block">
          <div className="oca-section">Retencja per okazja rok do roku</div>
          <div className="oca-card">
            <div style={{ overflowX: "auto" }}>
              <table className="oca-ret-tbl">
                <thead>
                  <tr>
                    <th style={{ minWidth: 140 }}>Okazja</th>
                    {(selectedYear ? [selectedYear] : data.retentionYears).map(y => (
                      <th key={y}>{y}→{y + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.retentionOccasions.map(occasion => (
                    <tr key={occasion}>
                      <td style={{ textAlign: "left", color: t.text, fontWeight: 500, fontSize: 12 }}>
                        {occ(occasion)}
                      </td>
                      {(selectedYear ? [selectedYear] : data.retentionYears).map(y => {
                        const pct = data.retentionMap[occasion]?.[y] ?? null;
                        return (
                          <td key={y}>
                            <span
                              className="oca-ret-cell"
                              style={{
                                background: retCell(pct),
                                color: retTextColor(pct),
                              }}
                            >
                              {pct !== null ? `${pct}%` : "—"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "8px 14px 10px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: t.textSub, marginRight: 4 }}>Retencja:</span>
              {[["≥60%", "#16a34a"], ["40–60%", "#65a30d"], ["25–40%", "#ca8a04"], ["10–25%", "#ea580c"], ["<10%", "#dc2626"]].map(([lbl, clr]) => (
                <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: t.textSub }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: clr, display: "inline-block" }} />
                  {lbl}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── C + D: New clients source + LTV per occasion ─────────── */}
        <div className="oca-two">

          {/* C: Skąd przychodzą nowi */}
          <div>
            <div className="oca-section">Pierwsza okazja nowych klientów</div>
            <div className="oca-card">
              {data.first.slice(0, 10).map(r => (
                <div key={r.occasion} className="oca-bar-row">
                  <span className="oca-bar-lbl">{occ(r.occasion)}</span>
                  <div className="oca-bar-bg">
                    <div
                      className="oca-bar-fill"
                      style={{ width: `${(r.new_clients / maxFirst) * 100}%`, background: t.accent }}
                    />
                  </div>
                  <span className="oca-bar-num">{r.pct_of_new}% · {r.new_clients}</span>
                </div>
              ))}
            </div>
          </div>

          {/* D: LTV per occasion */}
          <div>
            <div className="oca-section">Śr. LTV klienta per okazja</div>
            <div className="oca-card">
              {data.ltv.slice(0, 10).map((r, i) => (
                <div key={r.occasion} className="oca-bar-row">
                  <span className="oca-bar-lbl">{occ(r.occasion)}</span>
                  <div className="oca-bar-bg">
                    <div
                      className="oca-bar-fill"
                      style={{
                        width: `${(r.avg_client_ltv / maxLtv) * 100}%`,
                        background: i === 0 ? t.accent : `${t.accent}99`,
                      }}
                    />
                  </div>
                  <span className="oca-bar-num">{r.avg_client_ltv.toFixed(0)} zł</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── E + F: Loyal + Drift — tabbed ───────────────────────── */}
        <div className="oca-block">
          <div className="oca-section">Lojalni okazjonalni i klienci wielookazjonalni</div>
          <div className="oca-card">
            {/* Tabs */}
            <div className="oca-tabs">
              <button
                className={"oca-tab" + (tab === "loyal" ? " active" : "")}
                onClick={() => setTab("loyal")}
              >
                Okazjonalni lojalni ({data.loyalCount})
              </button>
              <button
                className={"oca-tab" + (tab === "drift" ? " active" : "")}
                onClick={() => setTab("drift")}
              >
                Drift okazji — top {data.drift.length}
              </button>
            </div>

            {/* Loyal table */}
            {tab === "loyal" && (
              <table className="oca-tbl">
                <thead>
                  <tr>
                    <th>Klient</th>
                    <th>Okazja</th>
                    <th style={{ textAlign: "center" }}>Lat aktywności</th>
                    <th style={{ textAlign: "right" }}>LTV</th>
                    <th>Pierwsza wizyta</th>
                    <th>Ostatnia wizyta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.loyal.map((r, i) => (
                    <tr key={`${r.client_id}-${r.occasion}-${i}`}>
                      <td>
                        <Link
                          href={`/crm/clients/${encodeURIComponent(r.client_id)}`}
                          style={{ color: t.accent, textDecoration: "none", fontSize: 12 }}
                        >
                          {r.client_id}
                        </Link>
                      </td>
                      <td>
                        <span className="oca-badge">{occ(r.occasion)}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", minWidth: 28, padding: "2px 8px",
                          borderRadius: 10, fontWeight: 700, fontSize: 12,
                          background: r.years_active >= 3 ? `${t.accent}22` : t.hover,
                          color: r.years_active >= 3 ? t.accent : t.text,
                        }}>
                          {r.years_active}×
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: t.accent }}>
                        {r.total_ltv.toFixed(0)} zł
                      </td>
                      <td style={{ color: t.textSub, fontSize: 12 }}>{fmtDate(r.first_purchase)}</td>
                      <td style={{ color: t.textSub, fontSize: 12 }}>{fmtDate(r.last_purchase)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Drift table */}
            {tab === "drift" && (
              <table className="oca-tbl">
                <thead>
                  <tr>
                    <th>Klient</th>
                    <th>Okazje</th>
                    <th style={{ textAlign: "center" }}>Liczba okazji</th>
                    <th>Pierwsza wizyta</th>
                    <th>Ostatnia wizyta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.drift.map((r, i) => (
                    <tr key={`${r.client_id}-${i}`}>
                      <td>
                        <Link
                          href={`/crm/clients/${encodeURIComponent(r.client_id)}`}
                          style={{ color: t.accent, textDecoration: "none", fontSize: 12 }}
                        >
                          {r.client_id}
                        </Link>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {(r.occasions ?? []).map(o => (
                            <span key={o} className="oca-occ-pill">{occ(o)}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", minWidth: 28, padding: "2px 8px",
                          borderRadius: 10, fontWeight: 700, fontSize: 12,
                          background: r.occasion_count >= 4 ? `${t.accent}22` : t.hover,
                          color: r.occasion_count >= 4 ? t.accent : t.text,
                        }}>
                          {r.occasion_count}
                        </span>
                      </td>
                      <td style={{ color: t.textSub, fontSize: 12 }}>{fmtDate(r.first_order)}</td>
                      <td style={{ color: t.textSub, fontSize: 12 }}>{fmtDate(r.last_order)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
