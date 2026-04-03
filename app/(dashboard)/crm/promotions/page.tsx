'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import DateRangePicker from '../components/DateRangePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoScorecard {
  id: number;
  promo_name: string;
  promo_type: string[] | null;
  discount_type: string | null;
  discount_min: number | null;
  discount_max: number | null;
  free_shipping: boolean;
  start_date: string;
  end_date: string;
  season: string[] | null;
  code_name: string | null;
  promo_revenue: number;
  promo_orders: number;
  promo_customers: number;
  new_customers_in_promo: number;
  avg_order_value: number;
}

interface PromoDependency {
  dependency_segment: string;
  client_count: number;
  total_ltv: number;
  avg_ltv: number;
  avg_orders: number;
  avg_promo_pct: number;
}

interface SeasonPerformance {
  season: string;
  year: number;
  revenue: number;
  orders: number;
  unique_customers: number;
  avg_order_value: number;
  promo_count: number;
  total_count: number;
}

interface Promotion {
  id: number;
  promo_name: string;
  discount_type: string | null;
  discount_min: number | null;
  free_shipping: boolean;
  start_date: string;
  end_date: string;
  season: string[] | null;
  code_name: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPLN(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.', ',') + ' M zł';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + ' K zł';
  return v.toFixed(0) + ' zł';
}

function fmt(v: number) {
  return v.toLocaleString('pl-PL');
}

function fmtDate(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const T = {
  bg: '#f5f2ee',
  card: '#fff',
  border: '#e8e0d8',
  accent: '#b8763a',
  danger: '#dd4444',
  warning: '#e6a817',
  success: '#2d8a4e',
  info: '#3577b3',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  pale: '#999',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, height: 100 }}>
          <div style={{ background: T.bg, borderRadius: 4, height: 14, width: '40%', marginBottom: 8 }} />
          <div style={{ background: T.bg, borderRadius: 4, height: 10, width: '60%' }} />
        </div>
      ))}
    </div>
  );
}

// ─── Dependency Labels ────────────────────────────────────────────────────────

const DEP_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  never_promo:    { label: 'Nigdy w promo',          color: T.success, bg: '#e8f5ee' },
  low_promo:      { label: 'Niska zależność (<33%)',  color: '#1a7a3a', bg: '#d4edda' },
  mixed:          { label: 'Mieszani (33–66%)',       color: '#8a6000', bg: '#fff3cd' },
  promo_led:      { label: 'Promo-driven (66–90%)',   color: '#9a4800', bg: '#ffe5cc' },
  promo_addicted: { label: 'Uzależnieni (>90%)',      color: T.danger,  bg: '#fde8e8' },
};

const DEP_COLORS: Record<string, string> = {
  never_promo:    T.success,
  low_promo:      '#2da855',
  mixed:          T.warning,
  promo_led:      '#e67e17',
  promo_addicted: T.danger,
};

// ─── Promo Quality Badge ──────────────────────────────────────────────────────

function qualityBadge(row: PromoScorecard, globalAOV: number) {
  if (row.promo_customers === 0) return { label: 'Brak danych', color: T.pale, bg: '#f0f0f0' };
  const newPct = row.new_customers_in_promo / row.promo_customers;
  const aovRatio = globalAOV > 0 ? row.avg_order_value / globalAOV : 1;
  if (newPct >= 0.3 && aovRatio >= 0.8) return { label: 'Dobra jakość', color: T.success, bg: '#e8f5ee' };
  if (newPct < 0.1 || aovRatio < 0.6) return { label: 'Słaba jakość', color: T.danger, bg: '#fde8e8' };
  return { label: 'Mieszana', color: T.warning, bg: '#fff3cd' };
}

// ─── TAB 1: Scorecard ─────────────────────────────────────────────────────────

function ScorecardTab({ scorecard }: { scorecard: PromoScorecard[] }) {
  if (scorecard.length === 0) {
    return (
      <div style={{ background: '#fff8e1', border: `1px solid ${T.warning}`, borderRadius: 8, padding: 20, color: '#6b4700' }}>
        Brak danych o promocjach. Sprawdź czy tabela <code>promotions</code> ma wpisy z datami pokrywającymi się z zamówieniami.
      </div>
    );
  }

  const globalAOV = scorecard.reduce((s, r) => s + r.avg_order_value, 0) / scorecard.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {scorecard.map((row) => {
        const badge = qualityBadge(row, globalAOV);
        const discountLabel = row.discount_min != null
          ? `−${row.discount_min}${row.discount_max && row.discount_max !== row.discount_min ? `–${row.discount_max}` : ''}%`
          : row.free_shipping ? 'Darmowa dostawa' : '';

        return (
          <div key={row.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                  {row.promo_name}
                  {discountLabel && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: T.muted, fontWeight: 400 }}>({discountLabel})</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: T.muted }}>
                  {fmtDate(row.start_date)} – {fmtDate(row.end_date)}
                  {row.code_name && <span style={{ marginLeft: 8, background: T.bg, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>code: {row.code_name}</span>}
                  {row.season && row.season.length > 0 && (
                    <span style={{ marginLeft: 8 }}>{row.season.join(', ')}</span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            </div>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {[
                { label: 'Revenue', value: formatPLN(row.promo_revenue) },
                { label: 'Zamówienia', value: fmt(row.promo_orders) },
                { label: 'Klienci', value: fmt(row.promo_customers) },
                { label: 'Nowi klienci', value: fmt(row.new_customers_in_promo) },
                { label: 'Śr. wartość zam.', value: `${row.avg_order_value.toFixed(0)} zł` },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* New customer % bar */}
            {row.promo_customers > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>
                  Nowi klienci: {((row.new_customers_in_promo / row.promo_customers) * 100).toFixed(0)}%
                </div>
                <div style={{ height: 4, background: T.bg, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (row.new_customers_in_promo / row.promo_customers) * 100)}%`,
                    background: T.accent,
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── TAB 2: Dependency ────────────────────────────────────────────────────────

function DependencyTab({ dependency }: { dependency: PromoDependency[] }) {
  const total = dependency.reduce((s, r) => s + r.client_count, 0);
  const addicted = dependency.find((r) => r.dependency_segment === 'promo_addicted');
  const neverPromo = dependency.find((r) => r.dependency_segment === 'never_promo');
  const addictedPct = total > 0 && addicted ? ((addicted.client_count / total) * 100).toFixed(0) : '0';
  const ltvRatio = addicted && neverPromo && addicted.avg_ltv > 0
    ? (neverPromo.avg_ltv / addicted.avg_ltv).toFixed(1)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Alert */}
      {parseFloat(addictedPct) > 20 && (
        <div style={{ background: '#fde8e8', border: `1px solid ${T.danger}`, borderRadius: 8, padding: 12, color: T.danger, fontSize: 13 }}>
          <strong>Uwaga:</strong> {addictedPct}% klientów kupuje wyłącznie w promocjach (uzależnieni). To {formatPLN(addicted?.total_ltv || 0)} LTV at risk.
        </div>
      )}

      {/* Stacked bar */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: T.text }}>Rozkład uzależnienia od promocji</div>
        <div style={{ display: 'flex', height: 28, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
          {dependency.map((row) => {
            const pct = total > 0 ? (row.client_count / total) * 100 : 0;
            if (pct < 0.5) return null;
            return (
              <div
                key={row.dependency_segment}
                style={{ width: `${pct}%`, background: DEP_COLORS[row.dependency_segment] || T.muted, position: 'relative' }}
                title={`${DEP_LABELS[row.dependency_segment]?.label || row.dependency_segment}: ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          {dependency.map((row) => {
            const cfg = DEP_LABELS[row.dependency_segment] || { label: row.dependency_segment, color: T.muted, bg: T.bg };
            const pct = total > 0 ? ((row.client_count / total) * 100).toFixed(1) : '0';
            return (
              <div key={row.dependency_segment} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: DEP_COLORS[row.dependency_segment] }} />
                <span style={{ fontSize: 12, color: T.muted }}>{cfg.label} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {['Segment', 'Klienci', 'Total LTV', 'Avg LTV', 'Avg zamówień', 'Avg % promo'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dependency.map((row, i) => {
              const cfg = DEP_LABELS[row.dependency_segment] || { label: row.dependency_segment, color: T.muted, bg: T.bg };
              return (
                <tr key={row.dependency_segment} style={{ borderTop: i > 0 ? `1px solid ${T.border}` : undefined }}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{fmt(row.client_count)}</td>
                  <td style={{ padding: '10px 14px' }}>{formatPLN(row.total_ltv)}</td>
                  <td style={{ padding: '10px 14px' }}>{row.avg_ltv.toFixed(0)} zł</td>
                  <td style={{ padding: '10px 14px' }}>{row.avg_orders.toFixed(1)}</td>
                  <td style={{ padding: '10px 14px' }}>{row.avg_promo_pct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Insight */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: T.text }}>Kluczowe wnioski</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {addicted && total > 0 && (
            <div style={{ fontSize: 13, color: T.text }}>
              • <strong>{addictedPct}%</strong> klientów kupuje wyłącznie w promo — to {formatPLN(addicted.total_ltv)} LTV at risk
            </div>
          )}
          {ltvRatio && (
            <div style={{ fontSize: 13, color: T.text }}>
              • Klienci nigdy-promo mają <strong>{ltvRatio}×</strong> wyższy avg LTV niż uzależnieni od promo
            </div>
          )}
          {neverPromo && total > 0 && (
            <div style={{ fontSize: 13, color: T.text }}>
              • <strong>{((neverPromo.client_count / total) * 100).toFixed(0)}%</strong> klientów nigdy nie kupowało w promo — to {formatPLN(neverPromo.total_ltv)} pełnowartościowego LTV
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: Seasonality ───────────────────────────────────────────────────────

function SeasonTab({ seasons }: { seasons: SeasonPerformance[] }) {
  const seasonNames = [...new Set(seasons.map((r) => r.season))].sort();
  const years = [...new Set(seasons.map((r) => r.year))].sort();

  const bySeasonYear: Record<string, Record<number, SeasonPerformance>> = {};
  seasons.forEach((r) => {
    if (!bySeasonYear[r.season]) bySeasonYear[r.season] = {};
    bySeasonYear[r.season][r.year] = r;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {seasonNames.map((season) => {
        const rows = bySeasonYear[season];
        const yrs = years.filter((y) => rows[y]);
        return (
          <div key={season} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.text }}>
              {season.replace(/_/g, ' ')}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Rok</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Revenue</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Zamówienia</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Klienci</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Avg OV</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>YoY</th>
                </tr>
              </thead>
              <tbody>
                {yrs.map((y, i) => {
                  const row = rows[y];
                  const prev = rows[y - 1];
                  const yoy = prev && prev.revenue > 0 ? ((row.revenue - prev.revenue) / prev.revenue) * 100 : null;
                  const yoyColor = yoy === null ? T.muted : yoy >= 0 ? T.success : T.danger;
                  const rowBorder = yoy !== null ? (yoy >= 0 ? `3px solid ${T.success}` : `3px solid ${T.danger}`) : undefined;
                  return (
                    <tr key={y} style={{ borderTop: i > 0 ? `1px solid ${T.border}` : undefined, borderLeft: rowBorder }}>
                      <td style={{ padding: '8px 14px', fontWeight: 600 }}>{y}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>{formatPLN(row.revenue)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>{fmt(row.orders)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>{fmt(row.unique_customers)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>{row.avg_order_value.toFixed(0)} zł</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', color: yoyColor, fontWeight: 600 }}>
                        {yoy === null ? '—' : `${yoy >= 0 ? '+' : ''}${yoy.toFixed(0)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ─── TAB 4: Calendar ─────────────────────────────────────────────────────────

const UPCOMING_OCCASIONS = [
  { name: 'Dzień Matki',    month: 5,  day: 26, seasonKey: 'DZIEN_MATKI' },
  { name: 'Dzień Dziecka',  month: 6,  day: 1,  seasonKey: 'DZIEN_DZIECKA' },
  { name: 'Dzień Ojca',     month: 6,  day: 23, seasonKey: 'DZIEN_OJCA' },
  { name: 'Wakacje',        month: 7,  day: 1,  seasonKey: 'WAKACJE' },
  { name: 'Back to School', month: 9,  day: 1,  seasonKey: 'BACK_TO_SCHOOL' },
  { name: 'Mikołajki',      month: 12, day: 6,  seasonKey: 'MIKOLAJKI' },
  { name: 'Gwiazdka',       month: 12, day: 24, seasonKey: 'GWIAZDKA' },
  { name: 'Walentynki',     month: 2,  day: 14, seasonKey: 'WALENTYNKI' },
  { name: 'Dzień Kobiet',   month: 3,  day: 8,  seasonKey: 'DZIEN_KOBIET' },
  { name: 'Wielkanoc',      month: 4,  day: 20, seasonKey: 'WIELKANOC' },
  { name: 'Dzień Chłopaka', month: 9,  day: 30, seasonKey: 'DZIEN_CHLOPAKA' },
  { name: 'Black Week',     month: 11, day: 25, seasonKey: 'BLACK_WEEK' },
];

function promoColor(p: Promotion): string {
  if (p.free_shipping) return '#3577b3';
  if (p.discount_type === 'PROCENT') return '#e6a817';
  return '#b8763a';
}

function CalendarTab({ promotions, seasons, onRefresh }: { promotions: Promotion[]; seasons: SeasonPerformance[]; onRefresh: () => void }) {
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];

  const visiblePromos = [...promotions]
    .filter(p => p.end_date >= cutoff)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  // Upcoming occasions within 90 days
  const upcoming = UPCOMING_OCCASIONS.map(occ => {
    let occDate = new Date(now.getFullYear(), occ.month - 1, occ.day);
    if (occDate < now) occDate = new Date(now.getFullYear() + 1, occ.month - 1, occ.day);
    const daysAway = Math.ceil((occDate.getTime() - now.getTime()) / 86400000);
    const lastYearPerf = seasons.find(s => s.season === occ.seasonKey && s.year === now.getFullYear() - 1);
    return { ...occ, occDate, daysAway, lastYearPerf };
  }).filter(o => o.daysAway <= 90).sort((a, b) => a.daysAway - b.daysAway);

  // Add promotion form
  const [form, setForm] = useState({
    promo_name: '', discount_type: 'ŻADNE', discount_value: '', free_shipping: false,
    start_date: '', end_date: '', season: '', code_name: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/crm/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitMsg({ ok: false, text: json.error || 'Błąd zapisu' });
      } else {
        setSubmitMsg({ ok: true, text: `Promocja "${json.promotion?.promo_name}" dodana pomyślnie` });
        setForm({ promo_name: '', discount_type: 'ŻADNE', discount_value: '', free_shipping: false, start_date: '', end_date: '', season: '', code_name: '' });
        onRefresh();
      }
    } catch (err) {
      setSubmitMsg({ ok: false, text: err instanceof Error ? err.message : 'Błąd połączenia' });
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: 4,
    fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: T.text,
    background: T.card, width: '100%', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px',
    marginBottom: 4, display: 'block', fontFamily: 'IBM Plex Mono, monospace',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Section 1: Timeline */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Timeline promocji</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Ostatni rok + przyszłe · niebieskie = darmowa dostawa · żółte = rabat % · brązowe = inne</div>
        {visiblePromos.length === 0 && <div style={{ color: T.muted, fontSize: 13 }}>Brak promocji w tym zakresie.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visiblePromos.map(p => {
            const isFuture = new Date(p.start_date) > now;
            const durationDays = Math.max(1, Math.ceil((new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) / 86400000));
            const barWidth = Math.min(Math.max(durationDays * 4, 40), 300);
            const color = promoColor(p);
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 88, fontSize: 10, color: T.muted, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0, textAlign: 'right' }}>
                  {new Date(p.start_date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                </div>
                <div style={{
                  width: barWidth, height: 28, background: color + '22',
                  border: `${isFuture ? '2px dashed' : '1px solid'} ${color}`,
                  borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8,
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 11, color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: barWidth - 16 }}>
                    {p.promo_name}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>
                  {durationDays}d
                  {p.discount_min && <span style={{ marginLeft: 4, color }}>{p.discount_min}%</span>}
                  {p.free_shipping && <span style={{ marginLeft: 4, color: '#3577b3' }}>FS</span>}
                  {isFuture && <span style={{ marginLeft: 4, background: '#3577b322', color: '#3577b3', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>nadchodzi</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Upcoming occasions */}
      {upcoming.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Nadchodzące okazje (90 dni)</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Okazje w ciągu 90 dni z wynikami rok temu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(occ => (
              <div key={occ.seasonKey} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '10px 14px', background: occ.daysAway <= 14 ? 'rgba(230,168,23,0.06)' : T.bg,
                border: `1px solid ${occ.daysAway <= 14 ? T.warning : T.border}`, borderRadius: 6,
              }}>
                <div style={{ minWidth: 120, fontSize: 13, fontWeight: 600, color: T.text }}>{occ.name}</div>
                <div style={{ minWidth: 80, fontSize: 12, color: T.muted, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {occ.occDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                </div>
                <div style={{ minWidth: 80, fontSize: 12, fontWeight: 600, color: occ.daysAway <= 7 ? T.danger : occ.daysAway <= 14 ? T.warning : T.muted }}>
                  za {occ.daysAway} dni
                </div>
                {occ.lastYearPerf ? (
                  <div style={{ fontSize: 12, color: T.muted }}>
                    Rok temu: <strong style={{ color: T.text }}>{formatPLN(occ.lastYearPerf.revenue)}</strong>
                    <span style={{ marginLeft: 8 }}>{occ.lastYearPerf.orders} zam.</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: T.pale }}>brak danych za rok temu</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Add promotion form */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Dodaj promocję</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Nazwa promocji *</label>
              <input
                type="text" required value={form.promo_name}
                onChange={e => setForm(f => ({ ...f, promo_name: e.target.value }))}
                style={inputStyle} placeholder="np. Gwiazdka 2025"
              />
            </div>
            <div>
              <label style={labelStyle}>Typ rabatu</label>
              <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} style={inputStyle}>
                <option value="ŻADNE">ŻADNE</option>
                <option value="PROCENT">PROCENT</option>
                <option value="KWOTA">KWOTA</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Wartość rabatu</label>
              <input
                type="number" value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                style={inputStyle} placeholder="np. 20"
              />
            </div>
            <div>
              <label style={labelStyle}>Kod promocji</label>
              <input
                type="text" value={form.code_name}
                onChange={e => setForm(f => ({ ...f, code_name: e.target.value }))}
                style={inputStyle} placeholder="np. SUMMER20"
              />
            </div>
            <div>
              <label style={labelStyle}>Data rozpoczęcia *</label>
              <input
                type="date" required value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Data zakończenia *</label>
              <input
                type="date" required value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Okazja / sezon</label>
              <select value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} style={inputStyle}>
                <option value="">— wybierz okazję —</option>
                {UPCOMING_OCCASIONS.map(o => <option key={o.seasonKey} value={o.seasonKey}>{o.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox" id="free_shipping" checked={form.free_shipping}
                onChange={e => setForm(f => ({ ...f, free_shipping: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="free_shipping" style={{ ...labelStyle, margin: 0, cursor: 'pointer', textTransform: 'none', fontSize: 13 }}>Darmowa dostawa</label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="submit" disabled={submitting}
              style={{ padding: '9px 20px', background: T.accent, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, fontFamily: 'IBM Plex Mono, monospace' }}
            >
              {submitting ? 'Zapisuję…' : 'Dodaj promocję'}
            </button>
            {submitMsg && (
              <div style={{ fontSize: 13, color: submitMsg.ok ? T.success : T.danger, fontFamily: 'IBM Plex Mono, monospace' }}>
                {submitMsg.ok ? '✓ ' : '⚠ '}{submitMsg.text}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'scorecard' | 'dependency' | 'seasons' | 'calendar';

export default function PromotionsPage() {
  const [tab, setTab] = useState<TabKey>('scorecard');
  const [data, setData] = useState<{ scorecard: PromoScorecard[]; dependency: PromoDependency[]; seasons: SeasonPerformance[]; promotions: Promotion[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '', label: 'Ostatnie 12m' });

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (dateRange.from) params.set('date_from', dateRange.from);
    if (dateRange.to) params.set('date_to', dateRange.to);
    fetch(`/api/crm/promotions?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: T.text }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>
          Promocje &amp; Incrementality
        </h1>
        <p style={{ fontSize: 13, color: T.muted, margin: '4px 0 0' }}>
          Ocena wpływu promocji na przychód i retencję
        </p>
      </div>

      <DateRangePicker onChange={setDateRange} defaultPreset="Ostatnie 12m" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {([
          { key: 'scorecard', label: 'Karta wyników' },
          { key: 'dependency', label: 'Uzależnienie od promo' },
          { key: 'seasons', label: 'Sezonowość' },
          { key: 'calendar', label: 'Kalendarz' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              background: tab === t.key ? T.accent : 'transparent',
              color: tab === t.key ? '#fff' : T.muted,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {error && (
        <div style={{ background: '#fde8e8', border: `1px solid ${T.danger}`, borderRadius: 8, padding: 14, color: T.danger, marginBottom: 16, fontSize: 13 }}>
          Błąd ładowania: {error}
        </div>
      )}
      {loading && <Skeleton />}
      {!loading && data && tab === 'scorecard' && <ScorecardTab scorecard={data.scorecard} />}
      {!loading && data && tab === 'dependency' && <DependencyTab dependency={data.dependency} />}
      {!loading && data && tab === 'seasons' && <SeasonTab seasons={data.seasons} />}
      {!loading && data && tab === 'calendar' && (
        <CalendarTab promotions={data.promotions} seasons={data.seasons} onRefresh={load} />
      )}
    </div>
  );
}
