"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useDarkMode } from "../../../../hooks/useDarkMode";

// ── Theme ─────────────────────────────────────────────────────────────────────
const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", kpi: "#faf9f7",
  green: "#16a34a", red: "#dc2626", amber: "#d97706",
  greenBg: "#dcfce7", redBg: "#fee2e2", amberBg: "#fef3c7",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", kpi: "#0d0d0c",
  green: "#4ade80", red: "#f87171", amber: "#fbbf24",
  greenBg: "#052e16", redBg: "#450a0a", amberBg: "#1c1208",
};

const SEG_COLORS = {
  Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24",
  Returning: "#34d399", New: "#f87171",
};

// ── Formatowanie ──────────────────────────────────────────────────────────────
function fmtPln(v)  { return v != null ? `${Number(v).toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł` : "—"; }
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDays(d) {
  if (d == null) return "—";
  const n = Number(d);
  if (n === 0) return "dziś";
  return n > 0 ? `za ${n} dni` : `${Math.abs(n)} dni temu`;
}

// ── Komponenty pomocnicze ─────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, t }) {
  return (
    <div style={{
      background: t.kpi, border: `1px solid ${t.border}`, borderRadius: 10,
      padding: "18px 20px", minWidth: 0,
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? t.accent, lineHeight: 1, marginBottom: 4 }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 11, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: t.textSub, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SegBadge({ seg, t }) {
  const color = SEG_COLORS[seg] ?? t.textSub;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 10,
      fontSize: 11, fontWeight: 600,
      background: color + "22", color,
    }}>
      {seg ?? "—"}
    </span>
  );
}

function ProbBadge({ prob, t }) {
  const n = Number(prob);
  const color = n >= 70 ? t.green : n >= 50 ? t.amber : t.textSub;
  const bg    = n >= 70 ? t.greenBg : n >= 50 ? t.amberBg : t.hover;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 10,
      fontSize: 11, fontWeight: 600,
      background: bg, color,
    }}>
      {n}%
    </span>
  );
}

function DaysBadge({ days, t }) {
  const n = Number(days);
  let color = t.textSub;
  let bg    = t.hover;
  if (n >= 0 && n <= 7)  { color = t.green;  bg = t.greenBg; }
  if (n > 7 && n <= 30)  { color = t.amber;  bg = t.amberBg; }
  if (n < 0)             { color = t.red;    bg = t.redBg;   }
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 10,
      fontSize: 11, fontWeight: 600, background: bg, color,
    }}>
      {fmtDays(days)}
    </span>
  );
}

function Spinner({ t }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0", color: t.textSub }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/>
        </path>
      </svg>
    </div>
  );
}

// ── Wykres kalendarza przychodów (SVG) ────────────────────────────────────────
const CHART_W = 700;
const CHART_H = 220;
const PAD = { top: 16, right: 16, bottom: 36, left: 64 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top  - PAD.bottom;

function RevenueCalendar({ data, t }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: t.textSub, fontSize: 13 }}>
        Brak danych kalendarza — wymagane widoki SQL z migracją 039
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxRev = Math.max(...data.map(d => Number(d.expected_revenue) || 0), 1);
  const barW   = Math.floor(INNER_W / data.length) - 2;

  // Tick labels dla osi Y
  const yTicks = [0, Math.round(maxRev / 2), maxRev].map(v => ({
    val: v,
    y: PAD.top + INNER_H - (v / maxRev) * INNER_H,
  }));

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        style={{ width: "100%", maxWidth: CHART_W, display: "block", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        {/* Gridlines Y */}
        {yTicks.map(tick => (
          <g key={tick.val}>
            <line
              x1={PAD.left} x2={CHART_W - PAD.right}
              y1={tick.y} y2={tick.y}
              stroke={t.border} strokeDasharray="3 3"
            />
            <text x={PAD.left - 6} y={tick.y + 4} textAnchor="end" fontSize="9" fill={t.textSub}>
              {tick.val >= 1000 ? `${Math.round(tick.val / 1000)}k` : tick.val}
            </text>
          </g>
        ))}

        {/* Słupki */}
        {data.map((d, i) => {
          const weekDate = new Date(d.week);
          const isPast   = weekDate < today;
          const isNow    = Math.abs(weekDate - today) < 7 * 24 * 3600 * 1000;
          const rev      = Number(d.expected_revenue) || 0;
          const barH     = (rev / maxRev) * INNER_H;
          const x        = PAD.left + i * (barW + 2);
          const y        = PAD.top + INNER_H - barH;
          const color    = isPast ? t.border : isNow ? t.amber : t.accent;

          return (
            <g key={d.week}>
              <rect
                x={x} y={y} width={barW} height={barH}
                fill={color} rx="2" opacity={isPast ? 0.5 : 0.85}
              />
              {/* Etykieta X co 4 tygodnie */}
              {i % 4 === 0 && (
                <text
                  x={x + barW / 2} y={CHART_H - 6}
                  textAnchor="middle" fontSize="9" fill={t.textSub}
                >
                  {weekDate.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                </text>
              )}
            </g>
          );
        })}

        {/* Linia "dziś" */}
        {(() => {
          const todayIdx = data.findIndex(d => {
            const w = new Date(d.week);
            return w <= today && today < new Date(w.getTime() + 7 * 24 * 3600 * 1000);
          });
          if (todayIdx < 0) return null;
          const x = PAD.left + todayIdx * (barW + 2) + barW / 2;
          return (
            <g>
              <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + INNER_H}
                    stroke={t.green} strokeWidth="2" strokeDasharray="4 3"/>
              <text x={x + 4} y={PAD.top + 12} fontSize="9" fill={t.green} fontWeight="600">dziś</text>
            </g>
          );
        })()}

        {/* Oś X */}
        <line
          x1={PAD.left} x2={CHART_W - PAD.right}
          y1={PAD.top + INNER_H} y2={PAD.top + INNER_H}
          stroke={t.border}
        />
      </svg>
    </div>
  );
}

// ── Tabela klientów ───────────────────────────────────────────────────────────
function ClientTable({ clients, mode, t }) {
  if (!clients || clients.length === 0) {
    return <div style={{ padding: "40px 0", textAlign: "center", color: t.textSub, fontSize: 13 }}>Brak danych</div>;
  }

  const thS = {
    padding: "8px 14px", color: t.textSub, fontSize: 10, fontWeight: 500,
    letterSpacing: "0.05em", textTransform: "uppercase",
    borderBottom: `1px solid ${t.border}`, textAlign: "left",
    background: t.kpi, whiteSpace: "nowrap",
  };
  const tdS = {
    padding: "9px 14px", borderBottom: `1px solid ${t.border}`,
    color: t.text, fontSize: 13, whiteSpace: "nowrap",
  };
  const tdL = { ...tdS, borderBottom: "none" };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thS}>ID klienta</th>
            <th style={thS}>Segment</th>
            {mode === "top_ltv" ? (
              <>
                <th style={{ ...thS, textAlign: "right" }}>Bieżący LTV</th>
                <th style={{ ...thS, textAlign: "right" }}>Przewidywany LTV 12m</th>
                <th style={{ ...thS, textAlign: "right" }}>Wzrost</th>
                <th style={{ ...thS, textAlign: "right" }}>Śr. zamówienie</th>
              </>
            ) : (
              <>
                <th style={thS}>{mode === "overdue" ? "Miał kupić" : "Przewidywana data"}</th>
                <th style={thS}>{mode === "overdue" ? "Spóźnienie" : "Dni do zakupu"}</th>
                <th style={thS}>Prawdopodobieństwo</th>
                <th style={{ ...thS, textAlign: "right" }}>Śr. zamówienie</th>
              </>
            )}
            <th style={thS}></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c, i) => {
            const isLast = i === clients.length - 1;
            const td = isLast ? tdL : tdS;
            const growth = mode === "top_ltv" && c.current_ltv > 0
              ? Math.round(((Number(c.predicted_ltv_12m) - Number(c.current_ltv)) / Number(c.current_ltv)) * 100)
              : null;

            return (
              <tr key={c.client_id} style={{ cursor: "default" }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.hover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                <td style={{ ...td, fontFamily: "var(--font-geist-mono), monospace", fontSize: 12 }}>
                  {c.client_id}
                </td>
                <td style={td}><SegBadge seg={c.legacy_segment} t={t} /></td>
                {mode === "top_ltv" ? (
                  <>
                    <td style={{ ...td, textAlign: "right", color: t.textSub }}>{fmtPln(c.current_ltv)}</td>
                    <td style={{ ...td, textAlign: "right", color: t.accent, fontWeight: 600 }}>{fmtPln(c.predicted_ltv_12m)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {growth != null ? (
                        <span style={{ color: growth >= 0 ? t.green : t.red, fontWeight: 600 }}>
                          {growth >= 0 ? "+" : ""}{growth}%
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ ...td, textAlign: "right", color: t.textSub }}>{fmtPln(c.avg_order_value)}</td>
                  </>
                ) : (
                  <>
                    <td style={{ ...td, color: t.textSub, fontSize: 12 }}>{fmtDate(c.predicted_next_order)}</td>
                    <td style={td}><DaysBadge days={c.days_to_next_order} t={t} /></td>
                    <td style={td}><ProbBadge prob={c.purchase_probability_30d} t={t} /></td>
                    <td style={{ ...td, textAlign: "right", color: t.textSub }}>{fmtPln(c.avg_order_value)}</td>
                  </>
                )}
                <td style={td}>
                  <Link href={`/crm/clients/${c.client_id}`}
                    style={{ color: t.accent, fontSize: 12, textDecoration: "none" }}>
                    →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Metodologia (collapsible) ─────────────────────────────────────────────────
function Methodology({ t }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", marginTop: 32 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: t.kpi, border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>ℹ️ Jak działa predykcja?</span>
        <span style={{ color: t.textSub }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "18px 20px", background: t.surface, fontSize: 13, color: t.text, lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 10px" }}>
            <strong>Model oparty na historycznym rytmie zakupów</strong> — bez ML, ale sprawdzony dla
            e-commerce z regularnym cyklem zakupowym (okazje, sezony).
          </p>
          <ul style={{ margin: "0 0 14px", paddingLeft: 20, color: t.textSub }}>
            <li><strong style={{ color: t.text }}>Średni odstęp</strong> = (last_order − first_order) / (orders_count − 1)</li>
            <li><strong style={{ color: t.text }}>Przewidywana data</strong> = last_order + średni odstęp</li>
            <li><strong style={{ color: t.text }}>Prawdopodobieństwo 30d</strong>:
              <ul style={{ marginTop: 4 }}>
                <li>80% — zakup mieści się w oknie 0–30 dni od dziś</li>
                <li>Spada o ~3% za każdy dzień po terminie (minimum 10%)</li>
                <li>40% — zakup dalej niż 30 dni w przód</li>
                <li>20% — tylko 1 zamówienie (brak rytmu)</li>
              </ul>
            </li>
            <li><strong style={{ color: t.text }}>LTV 12m</strong> = tempo wzrostu LTV × 1 dodatkowy rok</li>
          </ul>
          <p style={{ margin: 0, color: t.textSub, fontSize: 12 }}>
            ⚠ Dostępne tylko dla klientów z 2+ zamówieniami.
            Im więcej zamówień, tym dokładniejszy rytm i lepsza predykcja.
            Klienci jednorazowi (New) nie są uwzględniani.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Główna strona ─────────────────────────────────────────────────────────────
export default function PredictivePage() {
  const [dark] = useDarkMode();
  const t = dark ? DARK : LIGHT;

  const [summary,     setSummary]     = useState(null);
  const [buyingSoon,  setBuyingSoon]  = useState([]);
  const [calendar,    setCalendar]    = useState([]);
  const [tabClients,  setTabClients]  = useState([]);
  const [activeTab,   setActiveTab]   = useState("buying_soon");
  const [loading,     setLoading]     = useState(true);
  const [tabLoading,  setTabLoading]  = useState(false);
  const [error,       setError]       = useState(null);

  // Ładuj podsumowanie + buying_soon + calendar na mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/crm/predictive").then(r => r.json()),
      fetch("/api/crm/predictive?view=calendar").then(r => r.json()),
    ])
      .then(([main, cal]) => {
        if (main.error) throw new Error(main.error);
        setSummary(main.summary);
        setBuyingSoon(main.buying_soon ?? []);
        setCalendar(cal.calendar ?? []);
        setTabClients(main.buying_soon ?? []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Ładuj dane zakładki
  useEffect(() => {
    if (activeTab === "buying_soon") {
      setTabClients(buyingSoon);
      return;
    }
    const viewMap = {
      overdue:   "overdue",
      high_prob: "high_prob",
      top_ltv:   "top_ltv",
    };
    const view = viewMap[activeTab];
    if (!view) return;

    setTabLoading(true);
    fetch(`/api/crm/predictive?view=${view}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setTabClients(d.clients ?? []);
        setTabLoading(false);
      })
      .catch(() => setTabLoading(false));
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = summary ?? {};

  const TABS = [
    { id: "buying_soon", label: "Kupią wkrótce" },
    { id: "overdue",     label: "Spóźnieni" },
    { id: "high_prob",   label: "Wysokie prawdopodobieństwo" },
    { id: "top_ltv",     label: "Top LTV 12m" },
  ];

  return (
    <>
      <style>{`
        .pred-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 1100px; }
        .pred-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .pred-sub   { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .pred-kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 32px; }
        .pred-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .pred-block { margin-bottom: 32px; }
        .pred-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .pred-tabs { display: flex; border-bottom: 1px solid ${t.border}; }
        .pred-tab { padding: 10px 18px; font-size: 12px; cursor: pointer; background: none; border: none; color: ${t.textSub}; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.1s; font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .pred-tab.active { color: ${t.accent}; border-bottom-color: ${t.accent}; font-weight: 600; }
        .pred-tab:hover { color: ${t.text}; }
        .pred-overdue-info { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: ${t.redBg}; border-bottom: 1px solid ${t.border}; font-size: 12px; color: ${t.red}; }
        @media (max-width: 900px) { .pred-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .pred-kpi-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="pred-wrap">
        <h1 className="pred-title">Predictive Analytics</h1>
        <p className="pred-sub">Przewidywanie zachowań zakupowych — kiedy klient kupi i ile wyda</p>

        {loading ? (
          <Spinner t={t} />
        ) : error ? (
          <div style={{ padding: "14px 18px", background: "#ef444411", border: "1px solid #ef444444", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
            ⚠ {error}
          </div>
        ) : (
          <>
            {/* ── A. HERO KPIs ──────────────────────────────────────── */}
            <div className="pred-kpi-grid">
              <KpiCard
                label="Kupi w ciągu 30 dni"
                value={Number(s.buying_soon ?? 0).toLocaleString("pl-PL")}
                sub="klientów w oknie"
                color={t.green} t={t}
              />
              <KpiCard
                label='Spóźnieni'
                value={Number(s.overdue ?? 0).toLocaleString("pl-PL")}
                sub="powinni byli kupić"
                color={t.red} t={t}
              />
              <KpiCard
                label="Wysokie prawdopodobieństwo"
                value={Number(s.high_probability ?? 0).toLocaleString("pl-PL")}
                sub="≥ 70% w 30 dni"
                color={t.amber} t={t}
              />
              <KpiCard
                label="Prognoza 30 dni"
                value={fmtPln(s.revenue_next_30d)}
                sub="oczekiwany przychód"
                color={t.accent} t={t}
              />
              <KpiCard
                label="LTV całej bazy 12m"
                value={fmtPln(s.total_predicted_ltv_12m)}
                sub={`śr. ${fmtPln(s.avg_predicted_ltv_12m)} / klient`}
                color={t.accent} t={t}
              />
            </div>

            {/* ── B. KALENDARZ PRZYCHODÓW ───────────────────────────── */}
            <div className="pred-block">
              <div className="pred-section">Kalendarz prognozowanych przychodów (tygodniowo)</div>
              <div className="pred-card" style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 11, color: t.textSub, marginBottom: 12, display: "flex", gap: 16 }}>
                  <span>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: t.accent, marginRight: 4 }}/>
                    Przyszłość
                  </span>
                  <span>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: t.amber, marginRight: 4 }}/>
                    Bieżący tydzień
                  </span>
                  <span>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: t.border, marginRight: 4 }}/>
                    Przeszłość
                  </span>
                  <span>
                    <span style={{ display: "inline-block", width: 2, height: 10, background: t.green, marginRight: 4 }}/>
                    Dziś
                  </span>
                </div>
                <RevenueCalendar data={calendar} t={t} />
              </div>
            </div>

            {/* ── C/D/E. TABELE KLIENTÓW — zakładki ─────────────────── */}
            <div className="pred-block">
              <div className="pred-section">Klienci</div>
              <div className="pred-card">
                <div className="pred-tabs">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      className={"pred-tab" + (activeTab === tab.id ? " active" : "")}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Info dla spóźnionych */}
                {activeTab === "overdue" && (
                  <div className="pred-overdue-info">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Ci klienci to idealni kandydaci do kampanii winback — powinni byli kupić, ale tego nie zrobili.
                    <Link href="/crm/winback" style={{ color: t.red, fontWeight: 600, textDecoration: "none", marginLeft: "auto", fontSize: 11 }}>
                      Przejdź do Winback →
                    </Link>
                  </div>
                )}

                {tabLoading ? (
                  <Spinner t={t} />
                ) : (
                  <ClientTable clients={tabClients} mode={activeTab === "top_ltv" ? "top_ltv" : "default"} t={t} />
                )}
              </div>
            </div>

            {/* ── F. METODOLOGIA ────────────────────────────────────── */}
            <Methodology t={t} />
          </>
        )}
      </div>
    </>
  );
}
