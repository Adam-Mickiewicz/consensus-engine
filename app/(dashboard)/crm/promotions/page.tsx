'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const [tab, setTab] = useState<'scorecard' | 'dependency' | 'seasons'>('scorecard');
  const [data, setData] = useState<{ scorecard: PromoScorecard[]; dependency: PromoDependency[]; seasons: SeasonPerformance[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/promotions')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: T.text }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>
          Promocje & Incrementality
        </h1>
        <p style={{ fontSize: 13, color: T.muted, margin: '4px 0 0' }}>
          Ocena wpływu promocji na przychód i retencję
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {([
          { key: 'scorecard', label: 'Scorecard' },
          { key: 'dependency', label: 'Promo Dependency' },
          { key: 'seasons', label: 'Sezonowość' },
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
    </div>
  );
}
