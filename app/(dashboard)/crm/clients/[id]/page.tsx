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
const SEASON_ICONS: Record<string, string> = {
  wiosna: "🌸", spring: "🌸",
  lato: "☀️", summer: "☀️",
  "jesień": "🍂", autumn: "🍂", fall: "🍂",
  zima: "❄️", winter: "❄️",
};
const DOW_LABELS = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

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
  order_id: string | null;
  order_sum: number | null;
  is_promo: boolean | null;
  is_new_product: boolean | null;
  price_category_id: string | null;
}
interface Taxonomy {
  top_tags_granularne: string[] | null;
  top_tags_domenowe: string[] | null;
  top_filary_marki: string[] | null;
  top_okazje: string[] | null;
}
interface Prediction {
  predicted_next_order: string | null;
  days_to_next_order: number | null;
  purchase_probability_30d: number | null;
  predicted_ltv_12m: number | null;
  avg_order_value: number | null;
  avg_days_between_orders: number | null;
  orders_count: number | null;
}
interface OrderGroup {
  key: string;
  date: string;
  products: EventRow[];
  order_sum: number | null;
  season: string | null;
  occasion: string | null;
  is_promo: boolean;
  daysSincePrev: number | null;
  isFirst: boolean;
  isLast: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}
function daysSince(date: string): number {
  return Math.round((Date.now() - new Date(date).getTime()) / 86_400_000);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" });
}
function buildOrderGroups(events: EventRow[]): OrderGroup[] {
  // Sort ASC
  const sorted = [...events].filter(e => e.order_date).sort((a, b) =>
    (a.order_date ?? "").localeCompare(b.order_date ?? "")
  );
  // Group by order_id or date
  const map = new Map<string, EventRow[]>();
  for (const ev of sorted) {
    const key = ev.order_id ?? ev.order_date ?? "?";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  const keys = Array.from(map.keys());
  return keys.map((key, i) => {
    const prods = map.get(key)!;
    const rep = prods[0];
    const prev = i > 0 ? map.get(keys[i - 1])![0] : null;
    return {
      key,
      date: rep.order_date ?? "",
      products: prods,
      order_sum: prods.find(p => p.order_sum != null)?.order_sum ?? null,
      season: rep.season,
      occasion: rep.occasion ?? prods.find(p => p.occasion)?.occasion ?? null,
      is_promo: prods.some(p => p.is_promo),
      daysSincePrev: prev?.order_date ? daysBetween(prev.order_date, rep.order_date ?? "") : null,
      isFirst: i === 0,
      isLast: i === keys.length - 1,
    };
  }).reverse(); // newest first for display
}

// ─── RevealModal ──────────────────────────────────────────────────────────────

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

// ─── ClientTimeline ────────────────────────────────────────────────────────────

function ClientTimeline({ groups, t }: { groups: OrderGroup[]; t: typeof DARK }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([groups[0]?.key, groups[groups.length - 1]?.key]));
  const toggleExpand = (key: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(key) ? s.delete(key) : s.add(key);
    return s;
  });

  if (!groups.length) return <div style={{ color: t.textSub, fontSize: 13 }}>Brak zamówień</div>;

  return (
    <div style={{ position: "relative" }}>
      {/* Vertical line */}
      <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: t.border, zIndex: 0 }} />

      {groups.map((g, idx) => {
        const seasonColor = SEASON_COLORS[g.season?.toLowerCase() ?? ""] ?? t.accent;
        const seasonIcon = SEASON_ICONS[g.season?.toLowerCase() ?? ""] ?? "🛒";
        const isOpen = expanded.has(g.key);
        const isLast = idx === groups.length - 1;

        return (
          <div key={g.key} style={{ position: "relative", paddingLeft: 48, marginBottom: 4 }}>
            {/* Dot */}
            <div style={{
              position: "absolute", left: 10, top: 14, width: 20, height: 20,
              borderRadius: "50%", background: seasonColor, zIndex: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, border: `2px solid ${t.card}`,
              boxShadow: `0 0 0 2px ${seasonColor}44`,
            }}>
              {g.isFirst ? "🎉" : seasonIcon}
            </div>

            {/* Gap label between orders */}
            {g.daysSincePrev != null && (
              <div style={{
                position: "absolute", left: 26, top: -12,
                fontSize: 9, color: t.textSub, background: t.card,
                padding: "1px 6px", borderRadius: 8,
                border: `1px solid ${t.border}`, whiteSpace: "nowrap",
              }}>
                po {g.daysSincePrev} {g.daysSincePrev === 1 ? "dniu" : "dniach"}
              </div>
            )}

            {/* Card */}
            <div style={{
              background: t.card, border: `1px solid ${t.border}`,
              borderLeft: `3px solid ${seasonColor}`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 2,
              cursor: "pointer",
            }} onClick={() => toggleExpand(g.key)}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                    {g.isFirst ? "🎉 Pierwszy zakup" : isLast ? "🕐 Ostatni zakup" : fmtDate(g.date)}
                  </span>
                  {(g.isFirst || isLast) && (
                    <span style={{ fontSize: 11, color: t.textSub }}>{fmtDate(g.date)}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {g.order_sum != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>
                      {Number(g.order_sum).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                    </span>
                  )}
                  {g.is_promo && (
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#f59e0b22", color: "#f59e0b", fontWeight: 700 }}>PROMO</span>
                  )}
                  {g.occasion && (
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: t.accent + "22", color: t.accent, fontWeight: 600 }}>
                      🎁 {g.occasion}
                    </span>
                  )}
                  {isLast && (
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#64748b22", color: t.textSub }}>
                      {daysSince(g.date)} dni temu
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: t.textSub }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Products (collapsed: just count) */}
              {!isOpen ? (
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 4 }}>
                  {g.products.length} {g.products.length === 1 ? "produkt" : g.products.length < 5 ? "produkty" : "produktów"}
                </div>
              ) : (
                <div style={{ marginTop: 8, borderTop: `1px solid ${t.border}`, paddingTop: 8 }}>
                  {g.products.map((p, pi) => (
                    <div key={pi} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.product_name ?? "—"}
                          {p.is_new_product && (
                            <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#22c55e22", color: "#22c55e", fontWeight: 700 }}>NOWOŚĆ</span>
                          )}
                        </div>
                        {p.ean && (
                          <div style={{ fontSize: 10, color: t.textSub, fontFamily: "var(--font-geist-mono), monospace" }}>{p.ean}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ClientProductMap ──────────────────────────────────────────────────────────

function ClientProductMap({ events, t }: { events: EventRow[]; t: typeof DARK }) {
  interface ProductEntry { name: string; ean: string | null; count: number; dates: string[] }
  const map = new Map<string, ProductEntry>();
  for (const ev of events) {
    const key = ev.ean ?? ev.product_name ?? "?";
    if (!map.has(key)) map.set(key, { name: ev.product_name ?? key, ean: ev.ean, count: 0, dates: [] });
    const e = map.get(key)!;
    e.count++;
    if (ev.order_date) e.dates.push(ev.order_date.slice(0, 10));
  }
  const products = Array.from(map.values()).sort((a, b) => b.count - a.count);
  if (!products.length) return <div style={{ color: t.textSub, fontSize: 13 }}>Brak danych produktowych</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
      {products.map(p => (
        <div key={p.ean ?? p.name} title={`${p.name}\n${p.ean ?? ""}\nZakupy: ${p.dates.join(", ")}`}
          style={{
            background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
            padding: "10px 10px 8px", position: "relative", overflow: "hidden",
          }}>
          {p.count > 1 && (
            <div style={{
              position: "absolute", top: 6, right: 8,
              fontSize: 9, fontWeight: 700, color: t.accent,
              background: t.accent + "22", padding: "1px 6px", borderRadius: 10,
            }}>×{p.count}</div>
          )}
          <div style={{ fontSize: 11, fontWeight: 600, color: t.text, lineHeight: 1.3,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden", paddingRight: p.count > 1 ? 24 : 0 }}>
            {p.name}
          </div>
          {p.ean && (
            <div style={{ fontSize: 9, color: t.textSub, fontFamily: "var(--font-geist-mono), monospace", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.ean}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── BehaviorCards ─────────────────────────────────────────────────────────────

function BehaviorCards({ events, t }: { events: EventRow[]; t: typeof DARK }) {
  // Promo %
  const total = events.length;
  const promoCount = events.filter(e => e.is_promo).length;
  const promoPct = total ? Math.round((promoCount / total) * 100) : null;

  // Season
  const seasonCounts: Record<string, number> = {};
  for (const ev of events) if (ev.season) seasonCounts[ev.season] = (seasonCounts[ev.season] || 0) + 1;
  const topSeason = Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])[0];

  // Day of week
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  const seenDates = new Set<string>();
  for (const ev of events) {
    if (ev.order_date) {
      const key = ev.order_id ?? ev.order_date.slice(0, 10);
      if (!seenDates.has(key)) {
        seenDates.add(key);
        dowCounts[new Date(ev.order_date).getDay()]++;
      }
    }
  }
  const maxDow = Math.max(...dowCounts, 1);

  // Avg basket
  const orderSums: number[] = [];
  const seenOrders = new Set<string>();
  const sixMonthsAgo = new Date(Date.now() - 180 * 86_400_000);
  let recentSum = 0, recentN = 0, olderSum = 0, olderN = 0;
  for (const ev of events) {
    if (ev.order_sum == null) continue;
    const key = ev.order_id ?? ev.order_date ?? String(ev.id);
    if (!seenOrders.has(key)) {
      seenOrders.add(key);
      const v = Number(ev.order_sum);
      orderSums.push(v);
      if (ev.order_date && new Date(ev.order_date) >= sixMonthsAgo) {
        recentSum += v; recentN++;
      } else {
        olderSum += v; olderN++;
      }
    }
  }
  const avgBasket = orderSums.length ? orderSums.reduce((a, b) => a + b, 0) / orderSums.length : null;
  const recentAvg = recentN ? recentSum / recentN : null;
  const olderAvg  = olderN  ? olderSum  / olderN  : null;
  const trend = recentAvg != null && olderAvg != null ? (recentAvg > olderAvg ? "▲" : recentAvg < olderAvg ? "▼" : "→") : null;
  const trendColor = trend === "▲" ? "#22c55e" : trend === "▼" ? "#ef4444" : t.textSub;

  const cardStyle = {
    background: t.card, border: `1px solid ${t.border}`, borderRadius: 10,
    padding: "14px 16px", flex: 1, minWidth: 140,
  };
  const labelStyle = { fontSize: 10, color: t.textSub, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {/* Promo vs Full Price */}
      <div style={cardStyle}>
        <div style={labelStyle}>Promo / Full Price</div>
        {promoPct != null ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Simple pie SVG */}
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke={t.border} strokeWidth="8" />
              <circle cx="20" cy="20" r="16" fill="none" stroke="#f59e0b" strokeWidth="8"
                strokeDasharray={`${promoPct * 100.5 / 100} 100.5`}
                strokeDashoffset="25.1" strokeLinecap="butt" transform="rotate(-90 20 20)" />
              <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill={t.text}>{promoPct}%</text>
            </svg>
            <div>
              <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>Promo: {promoPct}%</div>
              <div style={{ fontSize: 11, color: t.textSub }}>Full: {100 - promoPct}%</div>
            </div>
          </div>
        ) : <div style={{ fontSize: 12, color: t.textSub }}>Brak danych</div>}
      </div>

      {/* Season */}
      <div style={cardStyle}>
        <div style={labelStyle}>Pora roku</div>
        {topSeason ? (
          <>
            <div style={{ fontSize: 24 }}>{SEASON_ICONS[topSeason[0].toLowerCase()] ?? "📅"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: SEASON_COLORS[topSeason[0].toLowerCase()] ?? t.text, marginTop: 4 }}>
              {topSeason[0]}
            </div>
            <div style={{ fontSize: 11, color: t.textSub }}>
              {Math.round((topSeason[1] / total) * 100)}% zakupów
            </div>
          </>
        ) : <div style={{ fontSize: 12, color: t.textSub }}>Brak danych</div>}
      </div>

      {/* DOW bar chart */}
      <div style={{ ...cardStyle, minWidth: 180 }}>
        <div style={labelStyle}>Dzień tygodnia</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 36 }}>
          {dowCounts.map((cnt, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: "100%", background: cnt === Math.max(...dowCounts) ? t.accent : t.border,
                height: Math.max(2, Math.round((cnt / maxDow) * 30)), borderRadius: "2px 2px 0 0", minHeight: 2 }} />
              <span style={{ fontSize: 8, color: t.textSub }}>{DOW_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Avg basket */}
      <div style={cardStyle}>
        <div style={labelStyle}>Śr. koszyk</div>
        {avgBasket != null ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>
              {Number(avgBasket).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł
            </div>
            {trend && (
              <div style={{ fontSize: 12, color: trendColor, fontWeight: 600, marginTop: 3 }}>
                {trend} vs. poprz. 6M
              </div>
            )}
          </>
        ) : <div style={{ fontSize: 12, color: t.textSub }}>Brak danych</div>}
      </div>
    </div>
  );
}

// ─── PredictionCard ────────────────────────────────────────────────────────────

function PredictionCard({ pred, t }: { pred: Prediction; t: typeof DARK }) {
  const prob = pred.purchase_probability_30d ?? 0;
  const probColor = prob >= 70 ? "#22c55e" : prob >= 40 ? "#f59e0b" : "#ef4444";
  const days = pred.days_to_next_order;

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textSub, marginBottom: 12 }}>
        Predykcja zakupu
      </div>

      {/* Next order */}
      {pred.predicted_next_order && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.textSub, marginBottom: 2 }}>Przewidywany następny zakup</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{fmtDate(pred.predicted_next_order)}</div>
          {days != null && (
            <div style={{ fontSize: 11, color: days < 0 ? "#ef4444" : days <= 30 ? "#22c55e" : t.textSub, marginTop: 2 }}>
              {days < 0 ? `${Math.abs(days)} dni po terminie` : days === 0 ? "Dziś!" : `za ${days} dni`}
            </div>
          )}
        </div>
      )}

      {/* Probability bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: t.textSub }}>Prawdopodobieństwo (30d)</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: probColor }}>{prob}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: t.border, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${prob}%`, background: probColor, borderRadius: 3, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {pred.predicted_ltv_12m != null && (
          <div style={{ background: t.bg, borderRadius: 7, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>LTV 12M</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>
              {Number(pred.predicted_ltv_12m).toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł
            </div>
          </div>
        )}
        {pred.avg_days_between_orders != null && (
          <div style={{ background: t.bg, borderRadius: 7, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Rytm</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
              {Math.round(pred.avg_days_between_orders)} dni
            </div>
          </div>
        )}
      </div>
      {pred.orders_count != null && (
        <div style={{ marginTop: 8, fontSize: 11, color: t.textSub }}>
          Model oparty na {pred.orders_count} zamówieniach
        </div>
      )}
    </div>
  );
}

// ─── ActionsPanel ──────────────────────────────────────────────────────────────

function ActionsPanel({ clientId, onReveal, isAdmin, t }: {
  clientId: string; onReveal: () => void; isAdmin: boolean; t: typeof DARK
}) {
  const [copying, setCopying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState<string | null>(null);

  const copyId = async () => {
    await navigator.clipboard.writeText(clientId);
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  };

  const exportEdrone = () => {
    setExporting(true);
    setExportDone(null);
    window.location.href = `/api/crm/clients/export-edrone?client_ids=${encodeURIComponent(clientId)}`;
    setTimeout(() => { setExporting(false); setExportDone("Pobieranie CSV..."); }, 1000);
  };

  const btnStyle = {
    display: "block", width: "100%", padding: "9px 14px",
    background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
    color: t.text, fontSize: 12, fontWeight: 500, cursor: "pointer",
    textAlign: "left" as const, textDecoration: "none",
    transition: "border-color 0.1s, background 0.1s",
    marginBottom: 6,
  };

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textSub, marginBottom: 12 }}>
        Szybkie akcje
      </div>

      <button style={btnStyle} onClick={exportEdrone} disabled={exporting}>
        📤 {exporting ? "Eksportowanie…" : "Eksportuj do edrone"}
      </button>
      {exportDone && <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 6 }}>{exportDone}</div>}

      <Link href={`/crm/analytics/ai?client_id=${encodeURIComponent(clientId)}`} style={btnStyle}>
        🤖 Rekomendacje AI
      </Link>

      <Link href={`/crm/analytics/ai?client_id=${encodeURIComponent(clientId)}&tab=3`} style={btnStyle}>
        ⚡ Analiza winback AI
      </Link>

      <button style={btnStyle} onClick={copyId}>
        {copying ? "✓ Skopiowano!" : "📋 Kopiuj client_id"}
      </button>

      {isAdmin && (
        <button style={{ ...btnStyle, color: t.accent, borderColor: t.accent + "44", background: t.accent + "0d" }} onClick={onReveal}>
          🔓 Odkryj tożsamość
        </button>
      )}
    </div>
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

  const [profile, setProfile]     = useState<Profile | null>(null);
  const [events, setEvents]       = useState<EventRow[]>([]);
  const [taxonomy, setTaxonomy]   = useState<Taxonomy | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [isAdmin, setIsAdmin]     = useState(false);

  useEffect(() => {
    fetch(`/api/crm/clients/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setProfile(d.profile);
        setEvents(d.events ?? []);
        setTaxonomy(d.taxonomy ?? null);
        setPrediction(d.prediction ?? null);
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
  const orderGroups = buildOrderGroups(events);

  // Occasions
  const occasionCounts: Record<string, number> = {};
  for (const ev of events) {
    if (ev.occasion) occasionCounts[ev.occasion] = (occasionCounts[ev.occasion] || 0) + 1;
  }
  const occasions = Object.entries(occasionCounts).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <style>{`
        .cp-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 1100px; }
        .cp-card { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; padding: 18px 20px; margin-bottom: 14px; }
        .cp-section-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin-bottom: 12px; }
        .cp-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .cp-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; background: ${t.hover}; color: ${t.text}; border: 1px solid ${t.border}; margin: 3px; }
        .cp-pillar { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; background: ${t.accent}22; color: ${t.accent}; border: 1px solid ${t.accent}44; margin: 3px; }
        @media (max-width: 768px) { .cp-cols { flex-direction: column !important; } }
      `}</style>

      {showReveal && <RevealModal clientId={id} onClose={() => setShowReveal(false)} dark={dark} />}

      <div className="cp-wrap">
        {/* Back */}
        <div style={{ marginBottom: 14 }}>
          <Link href="/crm/clients" style={{ color: t.accent, fontSize: 13, textDecoration: "none" }}>← Wróć do listy</Link>
        </div>

        {/* VIP Banner */}
        {isVipReanimacja && (
          <div style={{ background: "#ef444418", border: "1px solid #ef444466", borderRadius: 10, padding: "12px 20px", marginBottom: 14, color: "#ef4444", fontWeight: 700, fontSize: 14 }}>
            🚨 VIP REANIMACJA — priorytet winback
          </div>
        )}

        {/* ── Header: ID + Badges ───────────────────────────────────────── */}
        <div className="cp-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, color: t.textSub, background: t.hover, border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 10px", letterSpacing: "0.04em" }}>
              {profile.client_id}
            </span>
            {seg && <span className="cp-badge" style={{ background: (SEG_COLORS[seg] ?? t.accent) + "22", color: SEG_COLORS[seg] ?? t.accent }}>{seg}</span>}
            {risk && <span className="cp-badge" style={{ background: (RISK_COLORS[risk] ?? "#475569") + "22", color: RISK_COLORS[risk] ?? "#475569" }}>{risk}</span>}
            {profile.winback_priority && (
              <span className="cp-badge" style={{ background: "#f9731622", color: "#f97316" }}>⚡ Winback</span>
            )}
          </div>
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div className="cp-cols" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* LEFT 60% — Timeline + Product map */}
          <div style={{ flex: 3, minWidth: 0 }}>
            {/* Timeline */}
            <div className="cp-card">
              <div className="cp-section-label">Oś czasu zamówień ({orderGroups.length})</div>
              <ClientTimeline groups={orderGroups} t={t} />
            </div>

            {/* Product map */}
            <div className="cp-card">
              <div className="cp-section-label">Mapa produktów ({new Set(events.map(e => e.ean ?? e.product_name)).size} unikalnych)</div>
              <ClientProductMap events={events} t={t} />
            </div>
          </div>

          {/* RIGHT 40% — KPIs, Prediction, Behavior, Actions, Interests, Occasions */}
          <div style={{ flex: 2, minWidth: 260 }}>

            {/* Hero KPIs */}
            <div className="cp-card">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "LTV", val: profile.ltv != null ? `${Number(profile.ltv).toLocaleString("pl-PL")} zł` : "—", color: t.accent },
                  { label: "Zamówienia", val: profile.orders_count ?? "—", color: t.text },
                  { label: "Pierwszy zakup", val: profile.first_order?.slice(0, 10) ?? "—", color: t.text },
                  { label: "Ostatni zakup", val: profile.last_order?.slice(0, 10) ?? "—", color: t.text },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{String(val)}</div>
                    <div style={{ fontSize: 10, color: t.textSub, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              {profile.ulubiony_swiat && (
                <div>
                  <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Ulubiony świat</div>
                  <span className="cp-pillar" style={{ fontSize: 13 }}>{profile.ulubiony_swiat}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <ActionsPanel clientId={id} onReveal={() => setShowReveal(true)} isAdmin={isAdmin} t={t} />

            {/* Prediction */}
            {prediction && <div style={{ marginBottom: 14 }}><PredictionCard pred={prediction} t={t} /></div>}

            {/* Behavior */}
            {events.length > 0 && (
              <div className="cp-card">
                <div className="cp-section-label">Wskaźniki zachowania</div>
                <BehaviorCards events={events} t={t} />
              </div>
            )}

            {/* Interests */}
            {taxonomy && (
              <div className="cp-card">
                <div className="cp-section-label">Profil zainteresowań</div>
                {taxonomy.top_tags_granularne?.length ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Tagi granularne</div>
                    <div>{taxonomy.top_tags_granularne.slice(0, 5).map(tag => <span key={tag} className="cp-pill">{tag}</span>)}</div>
                  </div>
                ) : null}
                {taxonomy.top_tags_domenowe?.length ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Domeny</div>
                    <div>{taxonomy.top_tags_domenowe.slice(0, 3).map(d => <span key={d} className="cp-badge" style={{ background: t.hover, color: t.text, marginRight: 4, border: `1px solid ${t.border}` }}>{d}</span>)}</div>
                  </div>
                ) : null}
                {taxonomy.top_filary_marki?.length ? (
                  <div>
                    <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Filary marki</div>
                    <div>{taxonomy.top_filary_marki.map(p => <span key={p} className="cp-pillar">{p}</span>)}</div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Occasions */}
            {occasions.length > 0 && (
              <div className="cp-card">
                <div className="cp-section-label">Okazje zakupowe</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {occasions.map(([occ, cnt]) => (
                    <span key={occ} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, background: t.accent + "18", border: `1px solid ${t.accent}44`, color: t.accent, fontSize: 11, fontWeight: 500 }}>
                      🎁 {occ}
                      <span style={{ background: t.accent + "33", borderRadius: 10, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>×{cnt}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
