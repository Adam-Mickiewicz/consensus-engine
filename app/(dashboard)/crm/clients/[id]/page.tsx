"use client";
import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PIIAccessButton from "../../../../../components/auth/PIIAccessButton";
import PIIMasked from "../../../../../components/crm/PIIMasked";

// ─── Theme ────────────────────────────────────────────────────────────────────

const DARK = {
  bg: "#0f1117", card: "#1a1f2e", border: "#2a3050",
  text: "#e2e8f0", textSub: "#8892a4",
  accent: "#b8763a", accentHover: "#a06830",
  hover: "#1e2438",
};
const LIGHT = {
  bg: "#f5f2ee", card: "#ffffff", border: "#e8e0d8",
  text: "#1a1a1a", textSub: "#6b6b6b",
  accent: "#b8763a", accentHover: "#a06830",
  hover: "#faf8f5",
};

const SEG_COLORS: Record<string, string> = {
  Diamond: "#b8763a", Platinum: "#8b7355", Gold: "#c9a84c",
  Returning: "#3577b3", New: "#999999",
};
const RISK_COLORS: Record<string, string> = {
  OK: "#2d8a4e", Risk: "#e6a817", HighRisk: "#dd4444", Lost: "#999999",
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

const NOTE_ICONS: Record<string, string> = {
  general: "📝", contact: "📞", campaign: "📧",
  gift: "🎁", complaint: "⚠️", other: "💬",
};
const NOTE_BORDER: Record<string, string> = {
  complaint: "#dd4444", gift: "#b8763a", campaign: "#3577b3",
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
  top_domena: string | null;
  winback_priority: string | null;
  rfm_segment: string | null;
  rfm_total_score: number | null;
  customer_health_score: number | null;
  purchase_probability_30d: number | null;
  predicted_ltv_12m: number | null;
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
  line_total: number | null;
  is_promo: boolean | null;
  is_new_product: boolean | null;
  price_category_id: string | null;
}
interface Taxonomy {
  top_tags_granularne: string[] | null;
  top_tags_domenowe: string[] | null;
  top_filary_marki: string[] | null;
  top_okazje: string[] | null;
  tags_granularne_counts: Record<string, number> | null;
  tags_domenowe_counts: Record<string, number> | null;
  filary_marki_counts: Record<string, number> | null;
  okazje_counts: Record<string, number> | null;
  top_segments: { segment: string; count: number }[] | null;
  seasons_counts: Record<string, number> | null;
  product_groups_counts: Record<string, number> | null;
  new_products_ratio: number | null;
  promo_count: number | null;
  total_events: number | null;
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
interface BarometerData {
  score: number;
  label: string;
  color: string;
  recency: number;
  frequency: number;
  monetary: number;
}
interface SeasonBreakdownRow { name: string; count: number; revenue: number }
interface Note {
  id: string;
  client_id: string;
  note: string;
  tags: string[];
  note_type: string;
  created_by: string;
  created_at: string;
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
function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function buildOrderGroups(events: EventRow[]): OrderGroup[] {
  const sorted = [...events].filter(e => e.order_date).sort((a, b) =>
    (a.order_date ?? "").localeCompare(b.order_date ?? "")
  );
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
  }).reverse();
}

// ─── PIICard ──────────────────────────────────────────────────────────────────

function PIICard({ clientId, dark, t }: { clientId: string; dark: boolean; t: typeof DARK }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textSub, marginBottom: 10 }}>
        Dane osobowe
      </div>
      <PIIAccessButton dark={dark} onUnlocked={(sid: string | null) => setSessionId(sid)} label="Odblokuj dane osobowe" size="sm" />
      {sessionId && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Email</div>
            <PIIMasked clientId={clientId} type="email" sessionId={sessionId} masked="—" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Imię i nazwisko</div>
            <PIIMasked clientId={clientId} type="name" sessionId={sessionId} masked="—" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ClientTimeline ───────────────────────────────────────────────────────────

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
      <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: t.border, zIndex: 0 }} />
      {groups.map((g, idx) => {
        const seasonColor = SEASON_COLORS[g.season?.toLowerCase() ?? ""] ?? t.accent;
        const seasonIcon = SEASON_ICONS[g.season?.toLowerCase() ?? ""] ?? "🛒";
        const isOpen = expanded.has(g.key);
        const isLast = idx === groups.length - 1;
        return (
          <div key={g.key} style={{ position: "relative", paddingLeft: 48, marginBottom: 4 }}>
            <div style={{
              position: "absolute", left: 10, top: 14, width: 20, height: 20,
              borderRadius: "50%", background: seasonColor, zIndex: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, border: `2px solid ${t.card}`, boxShadow: `0 0 0 2px ${seasonColor}44`,
            }}>
              {g.isFirst ? "🎉" : seasonIcon}
            </div>
            {g.daysSincePrev != null && (
              <div style={{
                position: "absolute", left: 26, top: -12,
                fontSize: 9, color: t.textSub, background: t.card,
                padding: "1px 6px", borderRadius: 8, border: `1px solid ${t.border}`, whiteSpace: "nowrap",
              }}>
                po {g.daysSincePrev} {g.daysSincePrev === 1 ? "dniu" : "dniach"}
              </div>
            )}
            <div style={{
              background: t.card, border: `1px solid ${t.border}`,
              borderLeft: `3px solid ${seasonColor}`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 2, cursor: "pointer",
            }} onClick={() => toggleExpand(g.key)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                    {g.isFirst ? "🎉 Pierwszy zakup" : isLast ? "🕐 Ostatni zakup" : fmtDate(g.date)}
                  </span>
                  {(g.isFirst || isLast) && <span style={{ fontSize: 11, color: t.textSub }}>{fmtDate(g.date)}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {g.order_sum != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>
                      {Number(g.order_sum).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
                    </span>
                  )}
                  {g.is_promo && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#f59e0b22", color: "#f59e0b", fontWeight: 700 }}>PROMO</span>}
                  {g.occasion && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: t.accent + "22", color: t.accent, fontWeight: 600 }}>🎁 {g.occasion}</span>}
                  {isLast && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#64748b22", color: t.textSub }}>{daysSince(g.date)} dni temu</span>}
                  <span style={{ fontSize: 10, color: t.textSub }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>
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
                          {p.is_new_product && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#22c55e22", color: "#22c55e", fontWeight: 700 }}>NOWOŚĆ</span>}
                        </div>
                        {p.ean && <div style={{ fontSize: 10, color: t.textSub, fontFamily: "var(--font-geist-mono), monospace" }}>{p.ean}</div>}
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

// ─── ClientProductMap ─────────────────────────────────────────────────────────

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
          style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 10px 8px", position: "relative", overflow: "hidden" }}>
          {p.count > 1 && (
            <div style={{ position: "absolute", top: 6, right: 8, fontSize: 9, fontWeight: 700, color: t.accent, background: t.accent + "22", padding: "1px 6px", borderRadius: 10 }}>×{p.count}</div>
          )}
          <div style={{ fontSize: 11, fontWeight: 600, color: t.text, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", paddingRight: p.count > 1 ? 24 : 0 }}>
            {p.name}
          </div>
          {p.ean && <div style={{ fontSize: 9, color: t.textSub, fontFamily: "var(--font-geist-mono), monospace", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>{p.ean}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── BehaviorCards ────────────────────────────────────────────────────────────

function BehaviorCards({ events, t }: { events: EventRow[]; t: typeof DARK }) {
  const total = events.length;
  const promoCount = events.filter(e => e.is_promo).length;
  const promoPct = total ? Math.round((promoCount / total) * 100) : null;

  const seasonCounts: Record<string, number> = {};
  for (const ev of events) if (ev.season) seasonCounts[ev.season] = (seasonCounts[ev.season] || 0) + 1;
  const topSeason = Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])[0];

  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  const seenDates = new Set<string>();
  for (const ev of events) {
    if (ev.order_date) {
      const key = ev.order_id ?? ev.order_date.slice(0, 10);
      if (!seenDates.has(key)) { seenDates.add(key); dowCounts[new Date(ev.order_date).getDay()]++; }
    }
  }
  const maxDow = Math.max(...dowCounts, 1);

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
      if (ev.order_date && new Date(ev.order_date) >= sixMonthsAgo) { recentSum += v; recentN++; }
      else { olderSum += v; olderN++; }
    }
  }
  const avgBasket = orderSums.length ? orderSums.reduce((a, b) => a + b, 0) / orderSums.length : null;
  const recentAvg = recentN ? recentSum / recentN : null;
  const olderAvg  = olderN  ? olderSum  / olderN  : null;
  const trend = recentAvg != null && olderAvg != null ? (recentAvg > olderAvg ? "▲" : recentAvg < olderAvg ? "▼" : "→") : null;
  const trendColor = trend === "▲" ? "#22c55e" : trend === "▼" ? "#ef4444" : t.textSub;

  const cardStyle = { background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 140 };
  const labelStyle = { fontSize: 10, color: t.textSub, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <div style={cardStyle}>
        <div style={labelStyle}>Promo / Full Price</div>
        {promoPct != null ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
      <div style={cardStyle}>
        <div style={labelStyle}>Pora roku</div>
        {topSeason ? (
          <>
            <div style={{ fontSize: 24 }}>{SEASON_ICONS[topSeason[0].toLowerCase()] ?? "📅"}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: SEASON_COLORS[topSeason[0].toLowerCase()] ?? t.text, marginTop: 4 }}>{topSeason[0]}</div>
            <div style={{ fontSize: 11, color: t.textSub }}>{Math.round((topSeason[1] / total) * 100)}% zakupów</div>
          </>
        ) : <div style={{ fontSize: 12, color: t.textSub }}>Brak danych</div>}
      </div>
      <div style={{ ...cardStyle, minWidth: 180 }}>
        <div style={labelStyle}>Dzień tygodnia</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 36 }}>
          {dowCounts.map((cnt, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: "100%", background: cnt === Math.max(...dowCounts) ? t.accent : t.border, height: Math.max(2, Math.round((cnt / maxDow) * 30)), borderRadius: "2px 2px 0 0", minHeight: 2 }} />
              <span style={{ fontSize: 8, color: t.textSub }}>{DOW_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Śr. koszyk</div>
        {avgBasket != null ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>
              {Number(avgBasket).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł
            </div>
            {trend && <div style={{ fontSize: 12, color: trendColor, fontWeight: 600, marginTop: 3 }}>{trend} vs. poprz. 6M</div>}
          </>
        ) : <div style={{ fontSize: 12, color: t.textSub }}>Brak danych</div>}
      </div>
    </div>
  );
}

// ─── PredictionCard ───────────────────────────────────────────────────────────

function PredictionCard({ pred, t }: { pred: Prediction; t: typeof DARK }) {
  const prob = pred.purchase_probability_30d ?? 0;
  const probColor = prob >= 70 ? "#22c55e" : prob >= 40 ? "#f59e0b" : "#ef4444";
  const days = pred.days_to_next_order;

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textSub, marginBottom: 12 }}>Predykcja zakupu</div>
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
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: t.textSub }}>Prawdopodobieństwo (30d)</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: probColor }}>{prob}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: t.border, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${prob}%`, background: probColor, borderRadius: 3, transition: "width 0.4s" }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {pred.predicted_ltv_12m != null && (
          <div style={{ background: t.bg, borderRadius: 7, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>LTV 12M</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>{Number(pred.predicted_ltv_12m).toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł</div>
          </div>
        )}
        {pred.avg_days_between_orders != null && (
          <div style={{ background: t.bg, borderRadius: 7, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Rytm</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{Math.round(pred.avg_days_between_orders)} dni</div>
          </div>
        )}
      </div>
      {pred.orders_count != null && (
        <div style={{ marginTop: 8, fontSize: 11, color: t.textSub }}>Model oparty na {pred.orders_count} zamówieniach</div>
      )}
    </div>
  );
}

// ─── ActionsPanel ─────────────────────────────────────────────────────────────

function ActionsPanel({ clientId, t }: { clientId: string; t: typeof DARK }) {
  const [copying, setCopying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState<string | null>(null);

  const copyId = async () => {
    await navigator.clipboard.writeText(clientId);
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  };
  const exportEdrone = () => {
    setExporting(true); setExportDone(null);
    window.location.href = `/api/crm/clients/export-edrone?client_ids=${encodeURIComponent(clientId)}`;
    setTimeout(() => { setExporting(false); setExportDone("Pobieranie CSV..."); }, 1000);
  };

  const btnStyle = { display: "block", width: "100%", padding: "9px 14px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left" as const, textDecoration: "none", transition: "border-color 0.1s, background 0.1s", marginBottom: 6 };

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textSub, marginBottom: 12 }}>Szybkie akcje</div>
      <button style={btnStyle} onClick={exportEdrone} disabled={exporting}>📤 {exporting ? "Eksportowanie…" : "Eksportuj do edrone"}</button>
      {exportDone && <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 6 }}>{exportDone}</div>}
      <Link href={`/crm/analytics/ai?client_id=${encodeURIComponent(clientId)}`} style={btnStyle}>🤖 Rekomendacje AI</Link>
      <Link href={`/crm/analytics/ai?client_id=${encodeURIComponent(clientId)}&tab=3`} style={btnStyle}>⚡ Analiza winback AI</Link>
      <button style={btnStyle} onClick={copyId}>{copying ? "✓ Skopiowano!" : "📋 Kopiuj client_id"}</button>
    </div>
  );
}

// ─── TagGroup ─────────────────────────────────────────────────────────────────

function TagGroup({ label, items, limit = 5, chipStyle, t }: {
  label: string; items: [string, number][]; limit?: number; chipStyle?: React.CSSProperties; t: typeof DARK;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  const visible = expanded ? items : items.slice(0, limit);
  const hasMore = items.length > limit;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {visible.map(([tag, cnt]) => (
          <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, fontSize: 11, background: t.hover, color: t.text, border: `1px solid ${t.border}`, ...chipStyle }}>
            {tag}
            <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(0,0,0,0.12)", borderRadius: 8, padding: "1px 4px" }}>{cnt}</span>
          </span>
        ))}
        {hasMore && (
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: `1px dashed ${t.border}`, borderRadius: 20, padding: "3px 8px", fontSize: 11, color: t.textSub, cursor: "pointer" }}>
            {expanded ? "Pokaż mniej" : `+${items.length - limit} więcej`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Barometer ────────────────────────────────────────────────────────────────

function Barometer({ data, t }: { data: BarometerData; t: typeof DARK }) {
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: t.text }}>
          Barometr klienta
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: data.color }}>{data.score}/100</span>
      </div>
      <div style={{ height: 8, background: t.border, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: `${data.score}%`, background: data.color, borderRadius: 4, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ fontSize: 13, color: data.color, fontWeight: 600, marginBottom: 8 }}>{data.label}</div>
      <div style={{ display: "flex", gap: 20, fontSize: 11, color: t.textSub }}>
        <span>Recency: <strong style={{ color: t.text }}>{data.recency}</strong></span>
        <span>Frequency: <strong style={{ color: t.text }}>{data.frequency}</strong></span>
        <span>Value: <strong style={{ color: t.text }}>{data.monetary}</strong></span>
      </div>
    </div>
  );
}

// ─── NotesPanel ───────────────────────────────────────────────────────────────

function NotesPanel({ clientId, t }: { clientId: string; t: typeof DARK }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState("general");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetch(`/api/crm/clients/${clientId}/notes`)
      .then(r => r.json())
      .then(d => setNotes(d.notes || []))
      .catch(() => setNotes([]));
  }, [clientId]);

  const handleAddNote = useCallback(async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/crm/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote, note_type: newNoteType }),
      });
      const data = await res.json();
      if (data.note) { setNotes(prev => [data.note, ...prev]); setNewNote(""); }
    } catch {}
    setAddingNote(false);
  }, [clientId, newNote, newNoteType]);

  const handleDelete = useCallback(async (noteId: string) => {
    await fetch(`/api/crm/clients/${clientId}/notes?note_id=${noteId}`, { method: "DELETE" }).catch(() => {});
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, [clientId]);

  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: t.textSub, marginBottom: 14 }}>
        Adnotacje
      </div>

      {/* Dodaj nową */}
      <div style={{ marginBottom: 14 }}>
        <select
          value={newNoteType}
          onChange={e => setNewNoteType(e.target.value)}
          style={{ width: "100%", border: `1px solid ${t.border}`, borderRadius: 4, padding: "6px 8px", fontSize: 12, background: t.card, color: t.text, marginBottom: 8 }}
        >
          <option value="general">📝 Ogólna</option>
          <option value="contact">📞 Kontakt</option>
          <option value="campaign">📧 Kampania</option>
          <option value="gift">🎁 Prezent / Paczka</option>
          <option value="complaint">⚠️ Reklamacja</option>
          <option value="other">💬 Inne</option>
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAddNote(); }}
            placeholder="Dodaj adnotację... (Ctrl+Enter)"
            rows={2}
            style={{ flex: 1, border: `1px solid ${t.border}`, borderRadius: 4, padding: "8px", fontSize: 12, resize: "vertical", fontFamily: "-apple-system, sans-serif", minHeight: 44, background: t.card, color: t.text }}
          />
          <button
            onClick={handleAddNote}
            disabled={addingNote || !newNote.trim()}
            style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 4, padding: "8px 14px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", alignSelf: "flex-end", opacity: addingNote || !newNote.trim() ? 0.5 : 1 }}
          >
            {addingNote ? "…" : "Dodaj"}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, overflowY: "auto" }}>
        {notes.length === 0 && (
          <div style={{ fontSize: 12, color: t.textSub, padding: "8px 0" }}>Brak adnotacji</div>
        )}
        {notes.map(note => (
          <div key={note.id} style={{
            padding: "8px 10px", background: t.bg, borderRadius: 6, fontSize: 12,
            borderLeft: `3px solid ${NOTE_BORDER[note.note_type] ?? t.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: t.textSub, fontSize: 11 }}>
                {NOTE_ICONS[note.note_type] ?? "📝"} {fmtShort(note.created_at)} · {note.created_by}
              </span>
              <button onClick={() => handleDelete(note.id)} style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ color: t.text, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{note.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── InterestProfile ──────────────────────────────────────────────────────────

function InterestProfile({ taxonomy, seasonBreakdown, newProductRatio, newProductCount, t }: {
  taxonomy: Taxonomy;
  seasonBreakdown: SeasonBreakdownRow[];
  newProductRatio: number;
  newProductCount: number;
  t: typeof DARK;
}) {
  const [showAllSegments, setShowAllSegments] = useState(false);
  const [showAllSeasons, setShowAllSeasons] = useState(false);

  function sortedEntries(obj: Record<string, number> | null | undefined): [string, number][] {
    if (!obj) return [];
    return Object.entries(obj).sort((a, b) => b[1] - a[1]);
  }

  const tagsGranularne = sortedEntries(taxonomy.tags_granularne_counts ?? {});
  const tagsDomenowe   = sortedEntries(taxonomy.tags_domenowe_counts ?? {});
  const okazje         = sortedEntries(taxonomy.okazje_counts ?? {});
  const filaryMarki    = sortedEntries(taxonomy.filary_marki_counts ?? {});
  const productGroups  = sortedEntries(taxonomy.product_groups_counts ?? {});
  const topSegments    = (taxonomy.top_segments ?? []) as { segment: string; count: number }[];

  const totalEvents = taxonomy.total_events ?? 0;
  const promoCount  = taxonomy.promo_count ?? 0;
  const promoPct    = totalEvents ? Math.round((promoCount / totalEvents) * 100) : 0;

  const blockStyle  = { background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 14 };
  const blockLabel  = { fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: t.textSub, marginBottom: 12 };
  const subLabel    = { fontSize: 10, color: t.textSub, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 };
  const accentChip: React.CSSProperties  = { background: t.accent + "18", color: t.accent, border: `1px solid ${t.accent}44` };
  const pillChip: React.CSSProperties   = { background: t.accent + "22", color: t.accent, border: `1px solid ${t.accent}44` };

  const visibleSeasons = showAllSeasons ? seasonBreakdown : seasonBreakdown.slice(0, 6);

  return (
    <>
      {/* BLOK 1 — DNA zakupowe */}
      <div style={blockStyle}>
        <div style={blockLabel}>DNA zakupowe</div>
        {tagsGranularne.length > 0
          ? <TagGroup label="Tagi granularne" items={tagsGranularne} limit={6} t={t} />
          : <div style={{ fontSize: 12, color: t.textSub, marginBottom: 8 }}>Brak tagów granularnych</div>}
        {tagsDomenowe.length > 0
          ? <TagGroup label="Domeny" items={tagsDomenowe} limit={5} t={t} chipStyle={accentChip} />
          : null}
        {okazje.length > 0
          ? <TagGroup label="Okazje" items={okazje} limit={5} t={t} chipStyle={accentChip} />
          : null}
        {filaryMarki.length > 0 && <TagGroup label="Filary marki" items={filaryMarki} limit={5} t={t} chipStyle={pillChip} />}
      </div>

      {/* BLOK 2 — Wzorce zakupowe */}
      <div style={blockStyle}>
        <div style={blockLabel}>Wzorce zakupowe</div>

        {/* Segmenty prezentowe */}
        {topSegments.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={subLabel}>Segmenty prezentowe</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(showAllSegments ? topSegments : topSegments.slice(0, 3)).map(({ segment, count }) => (
                <div key={segment} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: t.bg, borderRadius: 7, border: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: 12, color: t.text }}>{segment}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.accent }}>{count}×</span>
                </div>
              ))}
              {topSegments.length > 3 && (
                <button onClick={() => setShowAllSegments(s => !s)} style={{ background: "none", border: `1px dashed ${t.border}`, borderRadius: 7, padding: "4px 8px", fontSize: 11, color: t.textSub, cursor: "pointer", textAlign: "left" }}>
                  {showAllSegments ? "Pokaż mniej" : `Pokaż wszystkie (${topSegments.length})`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Kategorie produktowe */}
        {productGroups.length > 0 && <TagGroup label="Kategorie produktowe" items={productGroups} limit={5} t={t} />}

        {/* Sezony z revenue */}
        {seasonBreakdown.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={subLabel}>Sezony zakupowe</div>
            {visibleSeasons.map(s => (
              <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12, borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.text, flex: 1 }}>{s.name}</span>
                <span style={{ color: t.textSub, width: 40, textAlign: "right" }}>{s.count}×</span>
                <span style={{ color: "#999", width: 70, textAlign: "right", fontSize: 11 }}>{s.revenue.toLocaleString("pl-PL")} zł</span>
              </div>
            ))}
            {seasonBreakdown.length > 6 && (
              <button onClick={() => setShowAllSeasons(v => !v)} style={{ background: "none", border: "none", color: t.accent, fontSize: 11, cursor: "pointer", padding: "4px 0" }}>
                {showAllSeasons ? "Zwiń" : `Pokaż wszystkie (${seasonBreakdown.length})`}
              </button>
            )}
          </div>
        )}

        {/* Nowości share */}
        <div style={{ marginBottom: 12 }}>
          <div style={subLabel}>Zakupy nowości</div>
          <div style={{ height: 6, borderRadius: 3, overflow: "hidden", background: t.border, marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${newProductRatio}%`, background: "#22c55e", transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ color: "#22c55e" }}>Nowości {newProductRatio}%</span>
            <span style={{ color: t.textSub }}>{newProductCount} pozycji</span>
          </div>
        </div>

        {/* Promo vs full price */}
        <div>
          <div style={subLabel}>Promo vs full price</div>
          <div style={{ height: 6, borderRadius: 3, overflow: "hidden", background: t.border, marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${promoPct}%`, background: "#f59e0b", transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ color: "#f59e0b" }}>Promo {promoPct}%</span>
            <span style={{ color: t.textSub }}>Full price {100 - promoPct}%</span>
          </div>
        </div>
      </div>

      {/* BLOK 3 — Statystyki */}
      <div style={blockStyle}>
        <div style={blockLabel}>Statystyki</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.accent }}>{totalEvents}</div>
            <div style={{ fontSize: 9, color: t.textSub, marginTop: 2 }}>Łącznie pozycji</div>
          </div>
          <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{promoCount}</div>
            <div style={{ fontSize: 9, color: t.textSub, marginTop: 2 }}>Zakupy w promocji</div>
          </div>
        </div>
      </div>
    </>
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
  const dark = false;
  const t = dark ? DARK : LIGHT;

  const [profile, setProfile]       = useState<Profile | null>(null);
  const [events, setEvents]         = useState<EventRow[]>([]);
  const [taxonomy, setTaxonomy]     = useState<Taxonomy | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [barometer, setBarometer]   = useState<BarometerData | null>(null);
  const [giftScore, setGiftScore]   = useState(0);
  const [giftLabel, setGiftLabel]   = useState("Głównie dla siebie");
  const [seasonBreakdown, setSeasonBreakdown] = useState<SeasonBreakdownRow[]>([]);
  const [newProductRatio, setNewProductRatio] = useState(0);
  const [newProductCount, setNewProductCount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/crm/clients/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setProfile(d.profile);
        setEvents(d.events ?? []);
        setTaxonomy(d.taxonomy ?? null);
        setPrediction(d.prediction ?? null);
        if (d.barometer) setBarometer(d.barometer);
        setGiftScore(d.giftScore ?? 0);
        setGiftLabel(d.giftLabel ?? "Głównie dla siebie");
        setSeasonBreakdown(d.seasonBreakdown ?? []);
        setNewProductRatio(d.newProductRatio ?? 0);
        setNewProductCount(d.newProductCount ?? 0);
        setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) return <ProfileSkeleton t={t} />;
  if (error) return (
    <div style={{ fontFamily: "var(--font-geist-sans)", color: t.text }}>
      <Link href="/crm/clients" style={{ color: "#b8763a", fontSize: 13, textDecoration: "none" }}>← Wróć do listy</Link>
      <div style={{ marginTop: 16, padding: "14px 18px", background: "#ef444411", border: "1px solid #ef444444", borderRadius: 8, color: "#ef4444" }}>⚠ {error}</div>
    </div>
  );
  if (!profile) return null;

  const seg = profile.legacy_segment ?? "";
  const risk = profile.risk_level ?? "";
  const isVipReanimacja = profile.winback_priority?.includes("VIP") || profile.winback_priority?.includes("REANIMACJA");
  const orderGroups = buildOrderGroups(events);

  const giftColor = giftScore > 60 ? t.accent : giftScore > 30 ? "#e6a817" : "#2d8a4e";

  return (
    <>
      <style>{`
        .cp-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 1400px; }
        .cp-card { background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; padding: 18px 20px; margin-bottom: 14px; }
        .cp-section-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin-bottom: 12px; }
        .cp-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .cp-pillar { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; background: ${t.accent}22; color: ${t.accent}; border: 1px solid ${t.accent}44; margin: 3px; }
        .cp-3col { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr; gap: 16px; align-items: start; }
        @media (max-width: 1024px) { .cp-3col { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 768px) { .cp-3col { grid-template-columns: 1fr; } }
      `}</style>

      <div className="cp-wrap">
        {/* Back */}
        <div style={{ marginBottom: 14 }}>
          <Link href="/crm/clients" style={{ color: "#b8763a", fontSize: 13, textDecoration: "none" }}>← Wróć do listy</Link>
        </div>

        {/* VIP Banner */}
        {isVipReanimacja && (
          <div style={{ background: "#ef444418", border: "1px solid #ef444466", borderRadius: 10, padding: "12px 20px", marginBottom: 14, color: "#ef4444", fontWeight: 700, fontSize: 14 }}>
            🚨 VIP REANIMACJA — priorytet winback
          </div>
        )}

        {/* Header */}
        <div className="cp-card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, color: t.textSub, background: t.hover, border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 10px", letterSpacing: "0.04em" }}>
              {profile.client_id}
            </span>
            {seg && <span className="cp-badge" style={{ background: SEG_COLORS[seg] ?? t.accent, color: "#fff" }}>{seg}</span>}
            {risk && <span className="cp-badge" style={{ background: RISK_COLORS[risk] ?? "#999", color: "#fff" }}>{risk}</span>}
            {profile.rfm_segment && (
              <span className="cp-badge" style={{ background: "#f5f2ee", color: "#b8763a", border: "1px solid #b8763a66", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
                RFM: {profile.rfm_segment}
              </span>
            )}
            {profile.winback_priority && <span className="cp-badge" style={{ background: "#dd444422", color: "#dd4444" }}>⚡ Winback</span>}
          </div>
        </div>

        {/* Barometer — full width */}
        {barometer && <Barometer data={barometer} t={t} />}

        {/* KPIs + Gift indicator */}
        <div className="cp-card" style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {[
              { label: "LTV", val: profile.ltv != null ? `${Number(profile.ltv).toLocaleString("pl-PL")} zł` : "—", color: t.accent },
              { label: "Zamówienia", val: String(profile.orders_count ?? "—"), color: t.text },
              { label: "Pierwszy zakup", val: profile.first_order?.slice(0, 10) ?? "—", color: t.text },
              { label: "Ostatni zakup", val: profile.last_order?.slice(0, 10) ?? "—", color: t.text },
              ...(profile.purchase_probability_30d != null ? [{ label: "Prob. zakupu 30d", val: `${Number(profile.purchase_probability_30d).toFixed(1)}%`, color: Number(profile.purchase_probability_30d) > 50 ? "#2d8a4e" : Number(profile.purchase_probability_30d) > 20 ? "#e6a817" : "#dd4444" }] : []),
              ...(profile.predicted_ltv_12m != null ? [{ label: "Pred. LTV 12m", val: `${Number(profile.predicted_ltv_12m).toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł`, color: "#3577b3" }] : []),
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{val}</div>
                <div style={{ fontSize: 10, color: t.textSub, marginTop: 2 }}>{label}</div>
              </div>
            ))}
            {/* Gift indicator */}
            <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: giftColor }}>🎁 {giftScore}%</div>
              <div style={{ fontSize: 10, color: t.textSub, marginTop: 2 }}>Gift indicator</div>
              <div style={{ fontSize: 10, color: giftColor, marginTop: 2 }}>{giftLabel}</div>
            </div>
          </div>
          {profile.top_domena && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Top domena</div>
              <span className="cp-pillar" style={{ fontSize: 13 }}>{profile.top_domena}</span>
            </div>
          )}
        </div>

        {/* 3-column layout */}
        <div className="cp-3col">

          {/* COL 1 — Timeline + Product map */}
          <div>
            <div className="cp-card">
              <div className="cp-section-label">Oś czasu zamówień ({orderGroups.length})</div>
              <ClientTimeline groups={orderGroups} t={t} />
            </div>
            <div className="cp-card">
              <div className="cp-section-label">Mapa produktów ({new Set(events.map(e => e.ean ?? e.product_name)).size} unikalnych)</div>
              <ClientProductMap events={events} t={t} />
            </div>
          </div>

          {/* COL 2 — Customer DNA */}
          <div>
            <PIICard clientId={id} dark={dark} t={t} />
            <ActionsPanel clientId={id} t={t} />
            {prediction && <div style={{ marginBottom: 14 }}><PredictionCard pred={prediction} t={t} /></div>}
            {events.length > 0 && (
              <div className="cp-card">
                <div className="cp-section-label">Wskaźniki zachowania</div>
                <BehaviorCards events={events} t={t} />
              </div>
            )}
            {taxonomy && (
              <InterestProfile
                taxonomy={taxonomy}
                seasonBreakdown={seasonBreakdown}
                newProductRatio={newProductRatio}
                newProductCount={newProductCount}
                t={t}
              />
            )}
          </div>

          {/* COL 3 — Adnotacje */}
          <div>
            <NotesPanel clientId={id} t={t} />
          </div>
        </div>
      </div>
    </>
  );
}
