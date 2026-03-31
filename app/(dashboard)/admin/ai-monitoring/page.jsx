"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const LIGHT = {
  bg: "#f5f3ef", surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", badge: "#f0e8de",
  red: "#c0392b", green: "#2ecc71", gray: "#aaa9a5",
  tableHead: "#f7f5f2",
};
const DARK = {
  bg: "#0d0d0c", surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", badge: "#2a1f14",
  red: "#e74c3c", green: "#27ae60", gray: "#555",
  tableHead: "#181816",
};

function fmt(n, dec = 2) {
  if (n == null) return "—";
  return Number(n).toFixed(dec);
}
function fmtK(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
function fmtCost(usd) {
  if (usd == null) return "—";
  if (usd < 0.001) return "<$0.001";
  return "$" + Number(usd).toFixed(4);
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pl-PL", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
function DailyChart({ daily, dark }) {
  const t = dark ? DARK : LIGHT;
  if (!daily?.length) return <div style={{ color: t.textSub, fontSize: 13, padding: "20px 0" }}>Brak danych</div>;

  const W = 680, H = 130, PAD_L = 46, PAD_B = 22, PAD_T = 8, PAD_R = 8;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_B - PAD_T;
  const maxCost = Math.max(...daily.map(d => d.cost_usd), 0.0001);
  const barW = Math.max(2, Math.floor(plotW / daily.length) - 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block" }}>
      {/* Y axis */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PAD_T + plotH * (1 - f);
        return (
          <g key={f}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
              stroke={t.border} strokeWidth="0.5" />
            <text x={PAD_L - 4} y={y + 4} fontSize="9" fill={t.textSub}
              textAnchor="end">{fmtCost(maxCost * f)}</text>
          </g>
        );
      })}
      {/* Bars */}
      {daily.map((d, i) => {
        const barH = (d.cost_usd / maxCost) * plotH;
        const x = PAD_L + (plotW / daily.length) * i + ((plotW / daily.length) - barW) / 2;
        const y = PAD_T + plotH - barH;
        const isLast = i === daily.length - 1;
        return (
          <g key={d.day}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 1)}
              fill={isLast ? t.accent : (dark ? "#3a3530" : "#d4c4b0")}
              rx="2" />
            {i % Math.max(1, Math.floor(daily.length / 10)) === 0 && (
              <text x={x + barW / 2} y={H - 4} fontSize="8" fill={t.textSub}
                textAnchor="middle">{d.day.slice(5)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, t }) {
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 10, padding: "16px 20px",
    }}>
      <div style={{ fontSize: 11, color: t.textSub, textTransform: "uppercase",
        letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: t.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: t.textSub, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── Model Badge ───────────────────────────────────────────────────────────────
function ModelBadge({ model, t }) {
  let color = t.accent;
  if (model?.startsWith("claude-")) color = "#9b59b6";
  if (model?.startsWith("gpt-"))    color = "#27ae60";
  if (model?.startsWith("gemini-")) color = "#2980b9";
  return (
    <span style={{
      fontSize: 10, padding: "2px 7px", borderRadius: 4,
      background: color + "22", color, fontWeight: 600,
      fontFamily: "var(--font-geist-mono), monospace",
    }}>{model ?? "?"}</span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AIMonitoringPage() {
  const dark = false;
  const t = dark ? DARK : LIGHT;

  const [days, setDays]     = useState(30);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [tab, setTab]       = useState("recent"); // recent | by_model | by_endpoint

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-usage?days=${days}&limit=100`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;

  return (
    <>
      <style>{`
        .aim-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .aim-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 24px; }
        .aim-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 28px; }
        .aim-section { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
        .aim-section-title { font-size: 13px; font-weight: 700; color: ${t.text}; margin: 0 0 14px; }
        .aim-tabs { display: flex; gap: 4px; margin-bottom: 16px; }
        .aim-tab { padding: 6px 14px; font-size: 12px; border-radius: 6px; border: 1px solid ${t.border}; cursor: pointer; background: transparent; color: ${t.textSub}; transition: all 0.1s; }
        .aim-tab.active { background: ${t.accent}22; color: ${t.accent}; border-color: ${t.accent}44; font-weight: 600; }
        .aim-tab:hover:not(.active) { background: ${t.hover}; color: ${t.text}; }
        .aim-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .aim-table th { text-align: left; padding: 7px 10px; background: ${t.tableHead}; color: ${t.textSub}; font-weight: 600; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; }
        .aim-table td { padding: 8px 10px; border-top: 1px solid ${t.border}; color: ${t.text}; }
        .aim-table tr:hover td { background: ${t.hover}; }
        .aim-err { color: ${t.red}; font-size: 11px; font-family: monospace; }
        .aim-days { display: flex; gap: 4px; align-items: center; }
        .aim-day-btn { padding: 4px 10px; font-size: 11px; border-radius: 5px; border: 1px solid ${t.border}; background: transparent; color: ${t.textSub}; cursor: pointer; }
        .aim-day-btn.active { background: ${t.accent}22; color: ${t.accent}; border-color: ${t.accent}44; }
      `}</style>

      <h1 className="aim-title">Monitoring AI</h1>
      <p className="aim-sub">Zużycie tokenów i koszty wywołań API (Anthropic, OpenAI, Gemini)</p>

      {/* Day range selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: t.textSub }}>Zakres:</span>
        <div className="aim-days">
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} className={"aim-day-btn" + (days === d ? " active" : "")}
              onClick={() => setDays(d)}>{d}d</button>
          ))}
        </div>
        <button onClick={load} style={{
          padding: "4px 12px", fontSize: 11, borderRadius: 5,
          border: `1px solid ${t.border}`, background: t.hover,
          color: t.textSub, cursor: "pointer",
        }}>↻ Odśwież</button>
      </div>

      {error && (
        <div style={{ color: t.red, background: t.red + "11", border: `1px solid ${t.red}33`,
          borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          Błąd: {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ color: t.textSub, fontSize: 13 }}>Ładowanie…</div>
      )}

      {s && (
        <>
          {/* KPI Grid */}
          <div className="aim-grid">
            <KpiCard label="Wywołania" value={s.total_calls.toLocaleString()}
              sub={`${days} dni`} t={t} />
            <KpiCard label="Koszt łączny"
              value={s.total_cost_usd < 0.01
                ? fmtCost(s.total_cost_usd)
                : "$" + fmt(s.total_cost_usd, 4)}
              sub={`avg ${fmtCost(s.total_calls ? s.total_cost_usd / s.total_calls : 0)} / call`}
              t={t} />
            <KpiCard label="Tokeny wejście" value={fmtK(s.total_input_tokens)}
              sub="promptów" t={t} />
            <KpiCard label="Tokeny wyjście" value={fmtK(s.total_output_tokens)}
              sub="odpowiedzi" t={t} />
            <KpiCard label="Błędy" value={s.error_count}
              sub={s.total_calls ? `${((s.error_count / s.total_calls) * 100).toFixed(1)}% calls` : ""}
              t={t} />
          </div>

          {/* Daily chart */}
          <div className="aim-section">
            <div className="aim-section-title">Dzienny koszt API (USD)</div>
            <DailyChart daily={data.daily} dark={dark} />
          </div>

          {/* Tabs */}
          <div className="aim-section">
            <div className="aim-tabs">
              {[
                { id: "recent",      label: "Ostatnie wywołania" },
                { id: "by_model",    label: "Wg modelu" },
                { id: "by_endpoint", label: "Wg endpointu" },
              ].map(tb => (
                <button key={tb.id} className={"aim-tab" + (tab === tb.id ? " active" : "")}
                  onClick={() => setTab(tb.id)}>{tb.label}</button>
              ))}
            </div>

            {tab === "recent" && (
              <div style={{ overflowX: "auto" }}>
                <table className="aim-table">
                  <thead>
                    <tr>
                      <th>Czas</th>
                      <th>Endpoint</th>
                      <th>Model</th>
                      <th style={{ textAlign: "right" }}>In</th>
                      <th style={{ textAlign: "right" }}>Out</th>
                      <th style={{ textAlign: "right" }}>Koszt</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recent ?? []).map(r => (
                      <tr key={r.id}>
                        <td style={{ color: t.textSub, whiteSpace: "nowrap" }}>{fmtDate(r.called_at)}</td>
                        <td style={{ color: t.textSub, fontFamily: "monospace", fontSize: 11 }}>
                          {r.endpoint ?? <span style={{ color: t.gray }}>—</span>}
                        </td>
                        <td><ModelBadge model={r.model} t={t} /></td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {fmtK(r.input_tokens)}
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {fmtK(r.output_tokens)}
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: t.accent }}>
                          {fmtCost(r.cost_usd)}
                        </td>
                        <td>
                          {r.error
                            ? <span className="aim-err" title={r.error}>✗ error</span>
                            : <span style={{ color: t.green, fontSize: 11 }}>✓</span>}
                        </td>
                      </tr>
                    ))}
                    {!data.recent?.length && (
                      <tr><td colSpan={7} style={{ textAlign: "center", color: t.textSub, padding: 20 }}>
                        Brak danych w wybranym zakresie
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "by_model" && (
              <table className="aim-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th style={{ textAlign: "right" }}>Wywołania</th>
                    <th style={{ textAlign: "right" }}>Tokeny in</th>
                    <th style={{ textAlign: "right" }}>Tokeny out</th>
                    <th style={{ textAlign: "right" }}>Koszt łączny</th>
                    <th style={{ textAlign: "right" }}>Avg / call</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.by_model ?? []).map(m => (
                    <tr key={m.model}>
                      <td><ModelBadge model={m.model} t={t} /></td>
                      <td style={{ textAlign: "right" }}>{m.calls.toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>{fmtK(m.input_tokens)}</td>
                      <td style={{ textAlign: "right" }}>{fmtK(m.output_tokens)}</td>
                      <td style={{ textAlign: "right", color: t.accent }}>
                        {fmtCost(m.cost_usd)}
                      </td>
                      <td style={{ textAlign: "right", color: t.textSub }}>
                        {fmtCost(m.calls ? m.cost_usd / m.calls : 0)}
                      </td>
                    </tr>
                  ))}
                  {!data.by_model?.length && (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: t.textSub, padding: 20 }}>
                      Brak danych
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === "by_endpoint" && (
              <table className="aim-table">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th style={{ textAlign: "right" }}>Wywołania</th>
                    <th style={{ textAlign: "right" }}>Koszt łączny</th>
                    <th style={{ textAlign: "right" }}>Avg / call</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.by_endpoint ?? []).map(e => (
                    <tr key={e.endpoint}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{e.endpoint}</td>
                      <td style={{ textAlign: "right" }}>{e.calls.toLocaleString()}</td>
                      <td style={{ textAlign: "right", color: t.accent }}>{fmtCost(e.cost_usd)}</td>
                      <td style={{ textAlign: "right", color: t.textSub }}>
                        {fmtCost(e.calls ? e.cost_usd / e.calls : 0)}
                      </td>
                    </tr>
                  ))}
                  {!data.by_endpoint?.length && (
                    <tr><td colSpan={4} style={{ textAlign: "center", color: t.textSub, padding: 20 }}>
                      Brak danych
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Price reference */}
          <details style={{ fontSize: 12, color: t.textSub }}>
            <summary style={{ cursor: "pointer", color: t.textSub, userSelect: "none" }}>
              Cennik tokenów (USD / 1M)
            </summary>
            <div style={{
              marginTop: 10, background: t.surface, border: `1px solid ${t.border}`,
              borderRadius: 8, padding: 14, display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8,
            }}>
              {[
                ["claude-opus-4-x",        "$15.00",  "$75.00"],
                ["claude-sonnet-4-x",       "$3.00",   "$15.00"],
                ["gpt-5.4",                "$2.00",   "$8.00"],
                ["gpt-4o-mini / gpt-5.4-mini", "$0.50", "$1.50"],
                ["gemini-2.5-pro",         "$1.25",   "$5.00"],
                ["gemini-2.5-flash",       "$0.075",  "$0.30"],
                ["gemini-2.5-flash-lite",  "$0.025",  "$0.10"],
              ].map(([model, inp, out]) => (
                <div key={model} style={{ display: "flex", justifyContent: "space-between",
                  padding: "5px 8px", background: t.hover, borderRadius: 5 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11 }}>{model}</span>
                  <span style={{ color: t.accent }}>in {inp} · out {out}</span>
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </>
  );
}
