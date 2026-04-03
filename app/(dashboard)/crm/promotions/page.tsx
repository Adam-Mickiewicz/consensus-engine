'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import DateRangePicker from '../components/DateRangePicker';
import Tooltip from '../components/Tooltip';

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

const DEP_LABELS: Record<string, { label: string; color: string; bg: string; tooltip: string }> = {
  never_promo:    { label: 'Nigdy w promo',          color: T.success, bg: '#e8f5ee', tooltip: 'Klienci, którzy nigdy nie kupili w trakcie promocji. Najcenniejszy segment — kupują po pełnej cenie.' },
  low_promo:      { label: 'Niska zależność (<33%)',  color: '#1a7a3a', bg: '#d4edda', tooltip: 'Mniej niż 33% zamówień złożonych w promocji. Zdrowy profil zakupowy.' },
  mixed:          { label: 'Mieszani (33–66%)',       color: '#8a6000', bg: '#fff3cd', tooltip: '33–66% zamówień w promo. Klienci wrażliwi na ceny, ale nie uzależnieni.' },
  promo_led:      { label: 'Promo-driven (66–90%)',   color: '#9a4800', bg: '#ffe5cc', tooltip: '66–90% zamówień w promo. Wysoka wrażliwość cenowa — ryzyko utraty marży.' },
  promo_addicted: { label: 'Uzależnieni (>90%)',      color: T.danger,  bg: '#fde8e8', tooltip: 'Ponad 90% zamówień złożonych w promocji. Krytyczne ryzyko marży — rozważ zmianę strategii.' },
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

declare global { interface Window { Chart: any; } }

// ─── Chart.js Loader ─────────────────────────────────────────────────────────

function useChart(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  buildConfig: () => any,
  deps: any[]
) {
  const chartRef = useRef<any>(null);
  const buildFnRef = useRef(buildConfig);
  const scriptAddedRef = useRef(false);
  useEffect(() => { buildFnRef.current = buildConfig; });

  useEffect(() => {
    function render() {
      if (!canvasRef.current || !window.Chart) return;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      const cfg = buildFnRef.current();
      if (!cfg) return;
      chartRef.current = new window.Chart(canvasRef.current, cfg);
    }
    if (window.Chart) {
      render();
    } else if (!scriptAddedRef.current) {
      scriptAddedRef.current = true;
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = () => render();
      document.head.appendChild(s);
    }
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ─── TAB 1: Scorecard ─────────────────────────────────────────────────────────

function ScorecardTab({ scorecard }: { scorecard: PromoScorecard[] }) {
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const globalAOV = scorecard.length > 0 ? scorecard.reduce((s, r) => s + r.avg_order_value, 0) / scorecard.length : 0;
  const sorted = [...scorecard].sort((a, b) => b.promo_revenue - a.promo_revenue).slice(0, 15);

  useChart(barCanvasRef, () => {
    if (!sorted.length) return null;
    const badges = sorted.map(r => qualityBadge(r, globalAOV));
    return {
      type: 'bar',
      data: {
        labels: sorted.map(r => r.promo_name.length > 22 ? r.promo_name.slice(0, 22) + '…' : r.promo_name),
        datasets: [{
          label: 'Revenue',
          data: sorted.map(r => r.promo_revenue),
          backgroundColor: badges.map(b => b.color + 'bb'),
          borderColor: badges.map(b => b.color),
          borderWidth: 1, borderRadius: 3,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx: any) => '  ' + formatPLN(ctx.raw) } },
        },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: (v: any) => v >= 1000 ? Math.round(v / 1000) + 'K' : v, font: { size: 10, family: 'IBM Plex Mono, monospace' }, color: '#6b6b6b' } },
          y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#1a1a1a' } },
        },
      },
    };
  }, [sorted.map(r => r.promo_revenue).join(','), globalAOV]);

  if (scorecard.length === 0) {
    return (
      <div style={{ background: '#fff8e1', border: `1px solid ${T.warning}`, borderRadius: 8, padding: 20, color: '#6b4700' }}>
        Brak danych o promocjach. Sprawdź czy tabela <code>promotions</code> ma wpisy z datami pokrywającymi się z zamówieniami.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Cards per promotion */}
      {scorecard.map((row) => {
        const badge = qualityBadge(row, globalAOV);
        const discountLabel = row.discount_min != null
          ? `−${row.discount_min}${row.discount_max && row.discount_max !== row.discount_min ? `–${row.discount_max}` : ''}%`
          : row.free_shipping ? 'Darmowa dostawa' : '';
        const newPct = row.promo_customers > 0 ? (row.new_customers_in_promo / row.promo_customers) * 100 : 0;
        const aovPct = globalAOV > 0 ? Math.min(100, (row.avg_order_value / globalAOV) * 100) : 0;

        return (
          <div key={row.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                  {row.promo_name}
                  {discountLabel && <span style={{ marginLeft: 8, fontSize: 12, color: T.muted, fontWeight: 400 }}>({discountLabel})</span>}
                </div>
                <div style={{ fontSize: 12, color: T.muted }}>
                  {fmtDate(row.start_date)} – {fmtDate(row.end_date)}
                  {row.code_name && <span style={{ marginLeft: 8, background: T.bg, padding: '1px 6px', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace' }}>kod: {row.code_name}</span>}
                  {row.season && row.season.length > 0 && <span style={{ marginLeft: 8 }}>{row.season.join(', ')}</span>}
                </div>
              </div>
              <Tooltip text={badge.label === 'Dobra jakość' ? 'Nowi klienci ≥30% i AOV ≥80% średniej' : badge.label === 'Słaba jakość' ? 'Nowi klienci <10% lub AOV <60% średniej' : 'Pośrednie wyniki — ani dobra, ani słaba'}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: badge.bg, color: badge.color, cursor: 'help' }}>
                  {badge.label}
                </span>
              </Tooltip>
            </div>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Revenue',          value: formatPLN(row.promo_revenue) },
                { label: 'Zamówienia',        value: fmt(row.promo_orders) },
                { label: 'Klienci',           value: fmt(row.promo_customers) },
                { label: 'Nowi klienci',      value: fmt(row.new_customers_in_promo) },
                { label: 'Śr. wartość zam.',  value: `${row.avg_order_value.toFixed(0)} zł` },
              ].map((m) => (
                <div key={m.label} style={{ background: T.bg, borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3, fontFamily: 'IBM Plex Mono, monospace' }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: 'IBM Plex Mono, monospace' }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Progress bars */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* New customers bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginBottom: 4 }}>
                  <span>Nowi klienci</span>
                  <span style={{ fontWeight: 600, color: newPct >= 30 ? T.success : newPct < 10 ? T.danger : T.warning }}>{newPct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                  <div style={{ height: '100%', width: `${newPct}%`, background: newPct >= 30 ? T.success : newPct < 10 ? T.danger : T.warning, borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
              {/* AOV vs avg bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginBottom: 4 }}>
                  <span>AOV vs średnia ({globalAOV.toFixed(0)} zł)</span>
                  <span style={{ fontWeight: 600, color: aovPct >= 80 ? T.success : aovPct < 60 ? T.danger : T.warning }}>{row.avg_order_value.toFixed(0)} zł</span>
                </div>
                <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}`, position: 'relative' }}>
                  <div style={{ height: '100%', width: `${Math.min(aovPct, 100)}%`, background: aovPct >= 80 ? T.success : aovPct < 60 ? T.danger : T.warning, borderRadius: 3, transition: 'width 0.4s' }} />
                  {/* avg marker at 100% */}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Comparison bar chart */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Porównanie promocji — revenue</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { color: T.success, label: 'Dobra jakość (nowi ≥30%, AOV ≥80%)' },
            { color: T.warning, label: 'Mieszana' },
            { color: T.danger,  label: 'Słaba jakość' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, color: T.muted }}>{l.label}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', height: Math.max(200, sorted.length * 30) }}>
          <canvas ref={barCanvasRef} />
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2: Dependency ────────────────────────────────────────────────────────

function DependencyTab({ dependency }: { dependency: PromoDependency[] }) {
  const donutRef = useRef<HTMLCanvasElement>(null);
  const groupedRef = useRef<HTMLCanvasElement>(null);
  const total = dependency.reduce((s, r) => s + r.client_count, 0);
  const addicted = dependency.find((r) => r.dependency_segment === 'promo_addicted');
  const neverPromo = dependency.find((r) => r.dependency_segment === 'never_promo');
  const addictedPct = total > 0 && addicted ? ((addicted.client_count / total) * 100).toFixed(0) : '0';
  const ltvRatio = addicted && neverPromo && addicted.avg_ltv > 0
    ? (neverPromo.avg_ltv / addicted.avg_ltv).toFixed(1)
    : null;

  const DEP_ORDER = ['never_promo', 'low_promo', 'mixed', 'promo_led', 'promo_addicted'];
  const ordered = DEP_ORDER.map(k => dependency.find(r => r.dependency_segment === k)).filter(Boolean) as PromoDependency[];

  // Donut chart
  useChart(donutRef, () => {
    if (!ordered.length) return null;
    return {
      type: 'doughnut',
      data: {
        labels: ordered.map(r => DEP_LABELS[r.dependency_segment]?.label || r.dependency_segment),
        datasets: [{
          data: ordered.map(r => r.client_count),
          backgroundColor: ordered.map(r => DEP_COLORS[r.dependency_segment] || T.muted),
          borderWidth: 2, borderColor: '#fff',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0';
                return `  ${ctx.raw.toLocaleString('pl-PL')} kl. (${pct}%)`;
              },
            },
          },
        },
      },
    };
  }, [ordered.map(r => r.client_count).join(',')]);

  // Grouped bar: avg LTV per segment (single dataset, colors per bar)
  useChart(groupedRef, () => {
    if (!ordered.length) return null;
    return {
      type: 'bar',
      data: {
        labels: ordered.map(r => DEP_LABELS[r.dependency_segment]?.label.split(' ')[0] || r.dependency_segment),
        datasets: [
          {
            label: 'Avg LTV (zł)',
            data: ordered.map(r => Math.round(r.avg_ltv)),
            backgroundColor: ordered.map(r => DEP_COLORS[r.dependency_segment] + 'bb'),
            borderColor: ordered.map(r => DEP_COLORS[r.dependency_segment]),
            borderWidth: 1, borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Avg zamówień',
            data: ordered.map(r => parseFloat(r.avg_orders.toFixed(1))),
            backgroundColor: '#b8763a55',
            borderColor: '#b8763a',
            borderWidth: 1, borderRadius: 4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ctx.datasetIndex === 0
                ? `  Avg LTV: ${ctx.raw.toLocaleString('pl-PL')} zł`
                : `  Avg zamówień: ${ctx.raw}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#1a1a1a' } },
          y: {
            type: 'linear', position: 'left',
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { callback: (v: any) => v >= 1000 ? Math.round(v/1000) + 'K zł' : v + ' zł', font: { size: 10 }, color: T.success },
            title: { display: true, text: 'Avg LTV (zł)', color: T.success, font: { size: 10 } },
          },
          y1: {
            type: 'linear', position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { callback: (v: any) => v + ' zam.', font: { size: 10 }, color: '#b8763a' },
            title: { display: true, text: 'Avg zamówień', color: '#b8763a', font: { size: 10 } },
          },
        },
      },
    };
  }, [ordered.map(r => r.avg_ltv).join(',')]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Alert */}
      {parseFloat(addictedPct) > 20 && (
        <div style={{ background: '#fde8e8', border: `1px solid ${T.danger}`, borderRadius: 8, padding: 12, color: T.danger, fontSize: 13 }}>
          <strong>Uwaga:</strong> {addictedPct}% klientów kupuje wyłącznie w promocjach — {formatPLN(addicted?.total_ltv || 0)} LTV at risk.
        </div>
      )}

      {/* Row: stacked bar + donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Stacked bar */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>Rozkład uzależnienia</div>
          <div style={{ display: 'flex', height: 32, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 16 }}>
            {ordered.map((row) => {
              const pct = total > 0 ? (row.client_count / total) * 100 : 0;
              if (pct < 0.3) return null;
              return (
                <div
                  key={row.dependency_segment}
                  style={{ width: `${pct}%`, background: DEP_COLORS[row.dependency_segment] || T.muted }}
                  title={`${DEP_LABELS[row.dependency_segment]?.label}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ordered.map((row) => {
              const cfg = DEP_LABELS[row.dependency_segment] || { label: row.dependency_segment, color: T.muted, bg: T.bg, tooltip: '' };
              const pct = total > 0 ? ((row.client_count / total) * 100).toFixed(1) : '0';
              return (
                <div key={row.dependency_segment} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: DEP_COLORS[row.dependency_segment], flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: T.text }}>
                    <Tooltip text={cfg.tooltip || ''}>{cfg.label}</Tooltip>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: T.muted }}>{pct}%</div>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', minWidth: 70, textAlign: 'right' }}>{row.client_count.toLocaleString('pl-PL')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut chart */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>Struktura bazy klientów</div>
          <div style={{ position: 'relative', height: 200 }}>
            <canvas ref={donutRef} />
            {/* Center text */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.text, fontFamily: 'IBM Plex Mono, monospace' }}>{total.toLocaleString('pl-PL')}</div>
              <div style={{ fontSize: 11, color: T.muted }}>klientów</div>
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            {ordered.map(r => (
              <div key={r.dependency_segment} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: DEP_COLORS[r.dependency_segment] }} />
                <span style={{ color: T.muted }}>{DEP_LABELS[r.dependency_segment]?.label.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grouped bar: LTV vs orders per segment */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Avg LTV vs Avg zamówień per segment</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: T.success }} />
            <span style={{ fontSize: 11, color: T.muted }}>Avg LTV (zł) — lewa oś</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#b8763a' }} />
            <span style={{ fontSize: 11, color: T.muted }}>Avg zamówień — prawa oś</span>
          </div>
        </div>
        <div style={{ position: 'relative', height: 240 }}>
          <canvas ref={groupedRef} />
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 8, fontStyle: 'italic' }}>
          Wyższy LTV i więcej zamówień = klienci nigdy-promo są cenniejszi mimo mniejszego % klientów
        </div>
      </div>

      {/* Table (detail) */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'IBM Plex Mono, monospace' }}>Dane szczegółowe</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {['Segment', 'Klienci', 'Total LTV', 'Avg LTV', 'Avg zam.', 'Avg % promo'].map((h) => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((row, i) => {
              const cfg = DEP_LABELS[row.dependency_segment] || { label: row.dependency_segment, color: T.muted, bg: T.bg };
              return (
                <tr key={row.dependency_segment} style={{ borderTop: i > 0 ? `1px solid ${T.border}` : undefined }}>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </td>
                  <td style={{ padding: '8px 14px', fontWeight: 600 }}>{fmt(row.client_count)}</td>
                  <td style={{ padding: '8px 14px' }}>{formatPLN(row.total_ltv)}</td>
                  <td style={{ padding: '8px 14px' }}>{row.avg_ltv.toFixed(0)} zł</td>
                  <td style={{ padding: '8px 14px' }}>{row.avg_orders.toFixed(1)}</td>
                  <td style={{ padding: '8px 14px' }}>{row.avg_promo_pct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Insights */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>Kluczowe wnioski</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {addicted && total > 0 && (
            <div style={{ borderLeft: `4px solid ${T.danger}`, background: '#fde8e822', padding: '10px 14px', borderRadius: '0 6px 6px 0' }}>
              <span style={{ fontSize: 13, color: T.text }}>
                <strong style={{ color: T.danger }}>{addictedPct}%</strong> klientów kupuje wyłącznie w promo — to <strong>{formatPLN(addicted.total_ltv)}</strong> LTV at risk
              </span>
            </div>
          )}
          {ltvRatio && parseFloat(ltvRatio) > 1 && (
            <div style={{ borderLeft: `4px solid ${T.success}`, background: '#e8f5ee22', padding: '10px 14px', borderRadius: '0 6px 6px 0' }}>
              <span style={{ fontSize: 13, color: T.text }}>
                Klienci nigdy-promo mają <strong style={{ color: T.success }}>{ltvRatio}×</strong> wyższy avg LTV niż uzależnieni od promo
              </span>
            </div>
          )}
          {neverPromo && total > 0 && (
            <div style={{ borderLeft: `4px solid ${T.info}`, background: '#3577b322', padding: '10px 14px', borderRadius: '0 6px 6px 0' }}>
              <span style={{ fontSize: 13, color: T.text }}>
                <strong style={{ color: T.info }}>{((neverPromo.client_count / total) * 100).toFixed(0)}%</strong> klientów nigdy nie kupowało w promo — to <strong>{formatPLN(neverPromo.total_ltv)}</strong> pełnowartościowego LTV
              </span>
            </div>
          )}
          {addicted && neverPromo && (
            <div style={{ borderLeft: `4px solid ${T.warning}`, background: '#fff3cd22', padding: '10px 14px', borderRadius: '0 6px 6px 0' }}>
              <span style={{ fontSize: 13, color: T.text }}>
                Uzależnieni składają śr. <strong>{addicted.avg_orders.toFixed(1)} zamówień</strong> vs <strong>{neverPromo.avg_orders.toFixed(1)}</strong> u klientów bez promo — więcej zamówień, ale niższy AOV
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: Seasonality ───────────────────────────────────────────────────────

function SeasonTab({ seasons }: { seasons: SeasonPerformance[] }) {
  const barRef = useRef<HTMLCanvasElement>(null);
  const seasonNames = [...new Set(seasons.map((r) => r.season))].sort();
  const years = [...new Set(seasons.map((r) => r.year))].sort();

  const YEAR_COLORS = ['#c5c0b8', '#8a9fc0', '#3577b3', '#b8763a', '#2d8a4e'];
  const bySeasonYear: Record<string, Record<number, SeasonPerformance>> = {};
  seasons.forEach((r) => {
    if (!bySeasonYear[r.season]) bySeasonYear[r.season] = {};
    bySeasonYear[r.season][r.year] = r;
  });

  const prettySeasons = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  useChart(barRef, () => {
    if (!seasonNames.length || !years.length) return null;
    return {
      type: 'bar',
      data: {
        labels: seasonNames.map(s => prettySeasons(s).length > 12 ? prettySeasons(s).slice(0, 12) + '…' : prettySeasons(s)),
        datasets: years.map((y, idx) => ({
          label: String(y),
          data: seasonNames.map(s => bySeasonYear[s]?.[y]?.revenue ?? 0),
          backgroundColor: (YEAR_COLORS[idx] || '#999') + 'bb',
          borderColor: YEAR_COLORS[idx] || '#999',
          borderWidth: 1, borderRadius: 3,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const s = seasons.find(r => r.year === years[ctx.datasetIndex] && prettySeasons(r.season).startsWith(ctx.label.replace('…', '')));
                return [
                  `  ${ctx.dataset.label}: ${formatPLN(ctx.raw)}`,
                  s ? `  ${s.orders} zam. · ${s.unique_customers} kl.` : '',
                ].filter(Boolean);
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#1a1a1a' } },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { callback: (v: any) => v >= 1000 ? Math.round(v / 1000) + 'K' : v, font: { size: 10 }, color: T.muted },
          },
        },
      },
    };
  }, [seasons.map(r => r.revenue).join(',')]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Grouped bar chart */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Revenue per okazja — porównanie roczne</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {years.map((y, idx) => (
            <div key={y} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: YEAR_COLORS[idx] || '#999' }} />
              <span style={{ fontSize: 11, color: T.muted }}>{y}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', height: 300 }}>
          <canvas ref={barRef} />
        </div>
      </div>

      {/* YoY table per season */}
      {seasonNames.map((season) => {
        const rows = bySeasonYear[season];
        const yrs = years.filter((y) => rows[y]);
        const maxRev = Math.max(...yrs.map(y => rows[y].revenue), 1);
        return (
          <div key={season} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'IBM Plex Mono, monospace' }}>
              {prettySeasons(season)}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {['Rok', 'Revenue', 'Bar', 'Zamówienia', 'Klienci', 'Avg OV', 'YoY'].map((h) => (
                    <th key={h} style={{ padding: '6px 12px', textAlign: h === 'Bar' ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>{h === 'Bar' ? '' : h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yrs.map((y, i) => {
                  const row = rows[y];
                  const prev = rows[y - 1];
                  const yoy = prev && prev.revenue > 0 ? ((row.revenue - prev.revenue) / prev.revenue) * 100 : null;
                  return (
                    <tr key={y} style={{ borderTop: i > 0 ? `1px solid ${T.border}` : undefined }}>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>{y}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}>{formatPLN(row.revenue)}</td>
                      <td style={{ padding: '7px 12px', width: 100 }}>
                        <div style={{ height: 8, background: T.bg, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(row.revenue / maxRev) * 100}%`, background: T.accent, borderRadius: 2 }} />
                        </div>
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: T.muted }}>{fmt(row.orders)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: T.muted }}>{fmt(row.unique_customers)}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', color: T.muted }}>{row.avg_order_value.toFixed(0)} zł</td>
                      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
                        {yoy === null ? (
                          <span style={{ color: T.pale }}>—</span>
                        ) : (
                          <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: yoy >= 0 ? '#e8f5ee' : '#fde8e8', color: yoy >= 0 ? T.success : T.danger }}>
                            {yoy >= 0 ? '+' : ''}{yoy.toFixed(0)}%
                          </span>
                        )}
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
            {upcoming.map(occ => {
              const urgencyColor = occ.daysAway <= 7 ? T.danger : occ.daysAway <= 14 ? T.warning : T.info;
              const daysBarPct = Math.max(0, Math.min(100, (1 - occ.daysAway / 90) * 100));
              return (
                <div key={occ.seasonKey} style={{
                  padding: '12px 14px', background: occ.daysAway <= 14 ? 'rgba(230,168,23,0.04)' : T.bg,
                  border: `1px solid ${occ.daysAway <= 14 ? T.warning : T.border}`, borderRadius: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <div style={{ minWidth: 130, fontSize: 13, fontWeight: 600, color: T.text }}>{occ.name}</div>
                    <div style={{ fontSize: 12, color: T.muted, fontFamily: 'IBM Plex Mono, monospace' }}>
                      {occ.occDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: urgencyColor, minWidth: 80 }}>
                      za {occ.daysAway} dni
                    </div>
                    {occ.lastYearPerf ? (
                      <div style={{ fontSize: 12, color: T.muted }}>
                        Rok temu: <strong style={{ color: T.text }}>{formatPLN(occ.lastYearPerf.revenue)}</strong>
                        <span style={{ marginLeft: 6, color: T.muted }}>{occ.lastYearPerf.orders} zam.</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: T.pale }}>brak danych za rok temu</div>
                    )}
                  </div>
                  {/* Days countdown bar: fills as we get closer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                      <div style={{ height: '100%', width: `${daysBarPct}%`, background: urgencyColor, borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 10, color: T.muted, minWidth: 50, textAlign: 'right' }}>
                      {occ.daysAway <= 7 ? '🔴 pilne' : occ.daysAway <= 14 ? '🟡 wkrótce' : '🔵 planuj'}
                    </div>
                  </div>
                </div>
              );
            })}
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
  const [dateRange, setDateRange] = useState({ from: '2017-01-01', to: new Date().toISOString().split('T')[0], label: 'Cała historia' });

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (dateRange.label !== 'Cała historia') {
      params.set('date_from', dateRange.from);
      params.set('date_to', dateRange.to);
    }
    fetch(`/api/crm/promotions${params.toString() ? '?' + params : ''}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: T.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>
            Promocje i efektywność
          </h1>
          <p style={{ fontSize: 13, color: T.muted, margin: '4px 0 0' }}>
            Ocena wpływu promocji na przychód i retencję
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <DateRangePicker onChange={setDateRange} defaultPreset="Cała historia" />
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Filtruje klientów aktywnych w wybranym okresie (wg daty ostatniego zamówienia)</div>
        </div>
      </div>

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
