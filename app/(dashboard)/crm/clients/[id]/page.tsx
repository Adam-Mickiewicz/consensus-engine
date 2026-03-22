"use client";
import { use, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useDarkMode } from "../../../../hooks/useDarkMode";
import { supabase } from "../../../../../lib/supabase";

// ─── Theme ────────────────────────────────────────────────────────────────────

const DARK = {
  bg: "#0f1117", card: "#1a1f2e", border: "#2a3050",
  text: "#e2e8f0", textSub: "#8892a4",
  accent: "#6366f1", accentHover: "#4f46e5",
  hover: "#1e2438",
};
const LIGHT = {
  bg: "#f1f5f9", card: "#ffffff", border: "#e2e8f0",
  text: "#0f172a", textSub: "#64748b",
  accent: "#6366f1", accentHover: "#4f46e5",
  hover: "#f8fafc",
};

const SEG_COLORS: Record<string, string> = {
  Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24",
  Returning: "#34d399", New: "#f87171",
};
const RISK_COLORS: Record<string, string> = {
  OK: "#22c55e", Risk: "#f59e0b", HighRisk: "#f97316", Lost: "#ef4444",
};
const SEASON_COLORS: Record<string, string> = {
  wiosna: "#22c55e", spring: "#22c55e",
  lato: "#fbbf24", summer: "#fbbf24",
  "jesień": "#f97316", autumn: "#f97316", fall: "#f97316",
  zima: "#60a5fa", winter: "#60a5fa",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  client_id: string;
  legacy_segment: string | null;
  risk_level: string | null;
  ltv: number | null;
  orders_count: number | null;
  first_order: string | null;
  last_order: string | null;
  ulubiony_swiat: string | null;
  winback_priority: string | null;
}
interface EventRow {
  id: number;
  client_id: string;
  ean: string | null;
  product_name: string | null;
  order_date: string | null;
  season: string | null;
  occasion: string | null;
}
interface Taxonomy {
  top_tags_granularne: string[] | null;
  top_tags_domenowe: string[] | null;
  top_filary_marki: string[] | null;
  top_okazje: string[] | null;
}

// ─── Reveal Modal ─────────────────────────────────────────────────────────────

function RevealModal({ clientId, onClose, dark }: { clientId: string; onClose: () => void; dark: boolean }) {
  const t = dark ? DARK : LIGHT;
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "revealed">("form");
  const emailRef = useRef<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => () => { emailRef.current = null; }, []);

  const handleReveal = useCallback(async () => {
    if (!reason.trim()) { setError("Powód odkrycia jest wymagany."); return; }
    setError(null); setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token ?? null;
      const res = await fetch("/api/crm/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(jwt ? { "Authorization": `Bearer ${jwt}` } : {}) },
        body: JSON.stringify({ client_id: clientId, reason: reason.trim() }),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Nieznany błąd."); return; }
      emailRef.current = json.email;
      setRevealed(true);
      setStep("revealed");
    } catch { setError("Błąd połączenia."); }
    finally { setLoading(false); }
  }, [clientId, reason]);

  const handleClose = useCallback(() => { emailRef.current = null; setRevealed(false); onClose(); }, [onClose]);

  return (
    <>
      <style>{`
        .rv-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
        .rv-modal{background:${t.card};border:1px solid ${t.border};border-radius:14px;padding:28px 32px;width:100%;max-width:460px;font-family:var(--font-geist-sans),system-ui,sans-serif;box-shadow:0 8px 40px rgba(0,0,0,0.3)}
      `}</style>
      <div className="rv-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
        <div className="rv-modal" onClick={e => e.stopPropagation()}>
          {step === "form" ? (
            <>
              <div style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 20, color: t.text, marginBottom: 8 }}>Odkryj tożsamość klienta</div>
              <div style={{ fontSize: 13, color: t.textSub, marginBottom: 20 }}>ID: <strong>{clientId}</strong> · Operacja audytowana</div>
              <label style={{ fontSize: 11, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Powód odkrycia *</label>
              <textarea
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${t.border}`, borderRadius: 8, background: t.bg, color: t.text, fontSize: 13, fontFamily: "var(--font-geist-sans)", resize: "vertical", minHeight: 80, outline: "none" }}
                placeholder="np. Weryfikacja zamówienia, kontakt ws. reklamacji…"
                value={reason} onChange={e => setReason(e.target.value)} maxLength={500} autoFocus
              />
              {error && <div style={{ marginTop: 10, padding: "8px 12px", background: "#ef444422", border: "1px solid #ef444444", borderRadius: 6, fontSize: 12, color: "#ef4444" }}>⚠ {error}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={handleReveal} disabled={loading || !reason.trim()} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: t.accent, color: "#fff", opacity: (loading || !reason.trim()) ? 0.5 : 1 }}>
                  {loading ? "Weryfikuję…" : "Odkryj"}
                </button>
                <button onClick={handleClose} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", border: `1px solid ${t.border}`, color: t.textSub }}>Anuluj</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 20, color: t.text, marginBottom: 8 }}>Tożsamość odkryta</div>
              <div style={{ padding: "14px 16px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, margin: "16px 0" }}>
                <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Identyfikator (vault)</div>
                {revealed && emailRef.current
                  ? <div style={{ fontSize: 14, color: t.text, fontFamily: "var(--font-geist-mono), monospace", wordBreak: "break-all" }}>{emailRef.current}</div>
                  : <div style={{ color: t.textSub, fontSize: 13 }}>Brak danych w vault.</div>
                }
              </div>
              <div style={{ fontSize: 11, color: "#f97316", marginBottom: 16 }}>⚠ Widoczne jednorazowo — zniknie po zamknięciu.</div>
              <button onClick={handleClose} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", border: `1px solid ${t.border}`, color: t.textSub }}>Zamknij</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── SVG Timeline ─────────────────────────────────────────────────────────────

function ActivityTimeline({ events, t }: { events: EventRow[]; t: typeof DARK }) {
  const dated = events.filter(e => e.order_date).map(e => ({ ...e, d: new Date(e.order_date!) }));
  if (!dated.length) return <div style={{ color: t.textSub, fontSize: 13 }}>Brak danych</div>;

  const W = 560, H = 72, PAD = { l: 8, r: 8, t: 10, b: 22 };
  const innerW = W - PAD.l - PAD.r;
  const minT = Math.min(...dated.map(e => e.d.getTime()));
  const maxT = Math.max(...dated.map(e => e.d.getTime()));
  const range = maxT - minT || 1;

  // Year ticks
  const minYear = dated[0] ? dated[0].d.getFullYear() : new Date().getFullYear();
  const maxYear = dated[dated.length - 1] ? dated[dated.length - 1].d.getFullYear() : minYear;
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke={t.border} strokeWidth={1} />
      {years.map(yr => {
        const xPct = (new Date(yr, 0, 1).getTime() - minT) / range;
        const x = PAD.l + xPct * innerW;
        if (x < PAD.l || x > W - PAD.r) return null;
        return (
          <g key={yr}>
            <line x1={x} x2={x} y1={H - PAD.b} y2={H - PAD.b + 4} stroke={t.border} strokeWidth={1} />
            <text x={x} y={H - 2} fontSize={8} fill={t.textSub} textAnchor="middle">{yr}</text>
          </g>
        );
      })}
      {dated.map((ev, i) => {
        const x = PAD.l + ((ev.d.getTime() - minT) / range) * innerW;
        const color = SEASON_COLORS[ev.season?.toLowerCase() ?? ""] ?? t.accent;
        return (
          <circle key={i} cx={x} cy={H - PAD.b - 12} r={4} fill={color} opacity={0.85}>
            <title>{ev.order_date?.slice(0, 10)}: {ev.product_name ?? "—"} ({ev.season ?? "—"})</title>
          </circle>
        );
      })}
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton({ t }: { t: typeof DARK }) {
  return (
    <>
      <style>{`@keyframes pulse-sk{0%,100%{opacity:0.3}50%{opacity:0.7}}`}</style>
      <div style={{ fontFamily: "var(--font-geist-sans)" }}>
        {[200, 100, 120].map((w, i) => (
          <div key={i} style={{ height: 18, width: w, background: t.border, borderRadius: 6, marginBottom: 12, animation: "pulse-sk 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
        ))}
        <div style={{ height: 100, background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, marginTop: 16 }} />
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [darkRaw] = useDarkMode();
  const dark = darkRaw as boolean;
  const t = dark ? DARK : LIGHT;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch(`/api/crm/clients/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setProfile(d.profile);
        setEvents(d.events ?? []);
        setTaxonomy(d.taxonomy ?? null);
        setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [id]);

  useEffect(() => {
    supabase.from("user_permissions").select("access_level").eq("category", "admin").eq("access_level", "write").limit(1)
      .then(({ data, error }) => { if (!error && data?.length) setIsAdmin(true); });
  }, []);

  if (loading) return <ProfileSkeleton t={t} />;
  if (error) return (
    <div style={{ fontFamily: "var(--font-geist-sans)", color: t.text }}>
      <Link href="/crm/clients" style={{ color: t.accent, fontSize: 13, textDecoration: "none" }}>← Wróć do listy</Link>
      <div style={{ marginTop: 16, padding: "14px 18px", background: "#ef444411", border: "1px solid #ef444444", borderRadius: 8, color: "#ef4444" }}>⚠ {error}</div>
    </div>
  );
  if (!profile) return null;

  const seg = profile.legacy_segment ?? "";
  const risk = profile.risk_level ?? "";
  const isVipReanimacja = profile.winback_priority?.includes("VIP") || profile.winback_priority?.includes("REANIMACJA");

  // Mini stats from events
  const productCounts: Record<string, number> = {};
  const monthCounts: Record<string, number> = {};
  const seasonCounts: Record<string, number> = {};
  for (const ev of events) {
    if (ev.product_name) productCounts[ev.product_name] = (productCounts[ev.product_name] || 0) + 1;
    if (ev.order_date) {
      const m = ev.order_date.slice(0, 7);
      monthCounts[m] = (monthCounts[m] || 0) + 1;
    }
    if (ev.season) seasonCounts[ev.season] = (seasonCounts[ev.season] || 0) + 1;
  }
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];
  const topMonth   = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
  const topSeason  = Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])[0];

  // Occasions
  const occasionCounts: Record<string, number> = {};
  for (const ev of events) {
    if (ev.occasion) occasionCounts[ev.occasion] = (occasionCounts[ev.occasion] || 0) + 1;
  }
  const occasions = Object.entries(occasionCounts).sort((a, b) => b[1] - a[1]);

  const visibleEvents = showAll ? events : events.slice(0, 20);

  return (
    <>
      <style>{`
        .cp-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 960px; }
        .cp-card { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; padding: 18px 20px; margin-bottom: 16px; }
        .cp-section-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin-bottom: 12px; }
        .cp-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .cp-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; background: ${t.hover}; color: ${t.text}; border: 1px solid ${t.border}; margin: 3px; }
        .cp-pillar { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; background: ${t.accent}22; color: ${t.accent}; border: 1px solid ${t.accent}44; margin: 3px; }
        .cp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .cp-table th { padding: 7px 12px; color: ${t.textSub}; font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: left; }
        .cp-table td { padding: 8px 12px; border-bottom: 1px solid ${t.border}; color: ${t.text}; }
        .cp-table tr:last-child td { border-bottom: none; }
        @media (max-width: 768px) { .cp-cols { flex-direction: column !important; } }
      `}</style>

      {showReveal && <RevealModal clientId={id} onClose={() => setShowReveal(false)} dark={dark} />}

      <div className="cp-wrap">
        {/* Back */}
        <div style={{ marginBottom: 16 }}>
          <Link href="/crm/clients" style={{ color: t.accent, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            ← Wróć do listy
          </Link>
        </div>

        {/* VIP Banner */}
        {isVipReanimacja && (
          <div style={{ background: "#ef444418", border: "1px solid #ef444466", borderRadius: 10, padding: "12px 20px", marginBottom: 16, color: "#ef4444", fontWeight: 700, fontSize: 14 }}>
            🚨 VIP REANIMACJA — priorytet winback
          </div>
        )}

        {/* ── SEKCJA 1: Hero ──────────────────────────────────────────── */}
        <div className="cp-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              {/* ID */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, color: t.textSub, background: t.hover, border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 10px", letterSpacing: "0.04em" }}>
                  {profile.client_id}
                </span>
                {isAdmin ? (
                  <button onClick={() => setShowReveal(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, background: "transparent", border: `1px solid ${t.accent}`, color: t.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    🔓 Odkryj tożsamość
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: t.textSub }}>Tożsamość chroniona</span>
                )}
              </div>
              {/* Badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {seg && <span className="cp-badge" style={{ background: (SEG_COLORS[seg] ?? "#6366f1") + "22", color: SEG_COLORS[seg] ?? "#6366f1" }}>{seg}</span>}
                {risk && <span className="cp-badge" style={{ background: (RISK_COLORS[risk] ?? "#475569") + "22", color: RISK_COLORS[risk] ?? "#475569" }}>{risk}</span>}
                {profile.winback_priority && (
                  <span className="cp-badge" style={{ background: "#f9731622", color: "#f97316" }}>⚡ Winback</span>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(110px, 1fr))", gap: 10 }}>
              {[
                { label: "LTV", val: profile.ltv != null ? `${Number(profile.ltv).toLocaleString("pl-PL")} zł` : "—", color: t.accent },
                { label: "Zamówienia", val: profile.orders_count ?? "—", color: t.text },
                { label: "Pierwszy zakup", val: profile.first_order?.slice(0, 10) ?? "—", color: t.text },
                { label: "Ostatni zakup", val: profile.last_order?.slice(0, 10) ?? "—", color: t.text },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{String(val)}</div>
                  <div style={{ fontSize: 10, color: t.textSub, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SEKCJA 2: Dwie kolumny ───────────────────────────────────── */}
        <div className="cp-cols" style={{ display: "flex", gap: 16, marginBottom: 16 }}>

          {/* Lewa 2/3 */}
          <div style={{ flex: 2, minWidth: 0 }}>
            <div className="cp-card">
              <div className="cp-section-label">Historia zakupów ({events.length})</div>
              {events.length === 0 ? (
                <div style={{ color: t.textSub, fontSize: 13 }}>Brak eventów zakupowych</div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="cp-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Produkt</th>
                          <th>EAN</th>
                          <th>Sezon</th>
                          <th>Okazja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleEvents.map((ev, i) => (
                          <tr key={i}>
                            <td style={{ color: t.textSub, whiteSpace: "nowrap" }}>{ev.order_date?.slice(0, 10) ?? "—"}</td>
                            <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.product_name ?? "—"}</td>
                            <td style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: ev.ean ? t.textSub : "#475569" }}>
                              {ev.ean ?? <span style={{ color: "#475569", fontStyle: "italic" }}>brak EAN</span>}
                            </td>
                            <td style={{ color: ev.season ? SEASON_COLORS[ev.season.toLowerCase()] ?? t.textSub : t.textSub }}>
                              {ev.season ?? "—"}
                            </td>
                            <td style={{ color: t.textSub, fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ev.occasion ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {events.length > 20 && !showAll && (
                    <button onClick={() => setShowAll(true)} style={{ marginTop: 10, background: "none", border: `1px solid ${t.border}`, borderRadius: 6, color: t.accent, fontSize: 12, padding: "6px 14px", cursor: "pointer" }}>
                      Pokaż wszystkie ({events.length}) ↓
                    </button>
                  )}

                  {/* Mini stats */}
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.border}`, display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {topProduct && (
                      <div>
                        <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Najczęściej kupowany</div>
                        <div style={{ fontSize: 12, color: t.text, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topProduct[0]} <span style={{ color: t.textSub }}>×{topProduct[1]}</span></div>
                      </div>
                    )}
                    {topMonth && (
                      <div>
                        <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Najaktywniejszy miesiąc</div>
                        <div style={{ fontSize: 12, color: t.text }}>{topMonth[0]} <span style={{ color: t.textSub }}>({topMonth[1]} eventów)</span></div>
                      </div>
                    )}
                    {topSeason && (
                      <div>
                        <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Ulubiona pora roku</div>
                        <div style={{ fontSize: 12, color: SEASON_COLORS[topSeason[0].toLowerCase()] ?? t.text }}>{topSeason[0]}</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Prawa 1/3 */}
          <div style={{ flex: 1, minWidth: 220 }}>
            {/* Profil zainteresowań */}
            <div className="cp-card" style={{ marginBottom: 16 }}>
              <div className="cp-section-label">Profil zainteresowań</div>
              {profile.ulubiony_swiat && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Ulubiony świat</div>
                  <span className="cp-pillar" style={{ fontSize: 14, padding: "6px 14px" }}>{profile.ulubiony_swiat}</span>
                </div>
              )}
              {taxonomy?.top_tags_granularne?.length ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Tagi granularne</div>
                  <div>{taxonomy.top_tags_granularne.slice(0, 5).map(tag => <span key={tag} className="cp-pill">{tag}</span>)}</div>
                </div>
              ) : null}
              {taxonomy?.top_tags_domenowe?.length ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Domeny</div>
                  <div>{taxonomy.top_tags_domenowe.slice(0, 3).map(d => <span key={d} className="cp-badge" style={{ background: t.hover, color: t.text, marginRight: 4, border: `1px solid ${t.border}` }}>{d}</span>)}</div>
                </div>
              ) : null}
              {taxonomy?.top_filary_marki?.length ? (
                <div>
                  <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Filary marki</div>
                  <div>{taxonomy.top_filary_marki.map(p => <span key={p} className="cp-pillar">{p}</span>)}</div>
                </div>
              ) : null}
              {!profile.ulubiony_swiat && !taxonomy && (
                <div style={{ color: t.textSub, fontSize: 13 }}>Brak danych taksonomicznych</div>
              )}
            </div>

            {/* Timeline */}
            <div className="cp-card">
              <div className="cp-section-label">Timeline aktywności</div>
              <ActivityTimeline events={events} t={t} />
              {/* Legend */}
              <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                {[["wiosna", "#22c55e"], ["lato", "#fbbf24"], ["jesień", "#f97316"], ["zima", "#60a5fa"]].map(([s, c]) => (
                  <span key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: t.textSub }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── SEKCJA 3: Okazje ─────────────────────────────────────────── */}
        {occasions.length > 0 && (
          <div className="cp-card">
            <div className="cp-section-label">Okazje zakupowe</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {occasions.map(([occ, cnt]) => (
                <span key={occ} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: t.accent + "18", border: `1px solid ${t.accent}44`, color: t.accent, fontSize: 12, fontWeight: 500 }}>
                  🎁 {occ}
                  <span style={{ background: t.accent + "33", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>×{cnt}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
