'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import DateRangePicker from '../components/DateRangePicker';

// ─── Types ────────────────────────────────────────────────────────────────────
interface KPIs {
  active_90d: number; repeaters_90d: number; buyers_90d: number;
  active_in_range: number; repeaters_in_range: number; buyers_in_range: number;
  at_risk_revenue: number; at_risk_count: number;
  winback_vip_count: number; winback_vip_revenue: number;
  total_clients: number; total_ltv: number; avg_ltv: number;
  diamond_count: number; second_order_candidates: number;
}
interface MatrixRow { legacy_segment: string; risk_level: string; client_count: number; total_ltv: number; avg_ltv: number; }
interface RevenueRow { month: string; total_revenue: number; repeat_revenue: number; new_revenue: number; promo_revenue: number; }
interface FunnelRow { stage: string; client_count: number; total_ltv: number; avg_ltv: number; }
interface WorldRow { world: string; client_count: number; total_ltv: number; avg_ltv: number; repeat_clients: number; repeat_rate: number; vip_count: number; }
interface Promo { promo_revenue: number; total_revenue: number; promo_share_pct: number; new_product_revenue: number; new_product_share_pct: number; }
interface DashboardData { kpis: KPIs; matrix: MatrixRow[]; revenue: RevenueRow[]; funnel: FunnelRow[]; worlds: WorldRow[]; promo: Promo; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPLN(val: number): string {
  if (!val || isNaN(val)) return '0 zł';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' mln zł';
  if (val >= 1_000) return Math.round(val / 1_000) + ' tys. zł';
  return Math.round(val) + ' zł';
}
function formatNumber(val: number): string {
  return new Intl.NumberFormat('pl-PL').format(Math.round(val || 0));
}
function formatDate(d: Date): string {
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Widget Registry ──────────────────────────────────────────────────────────
const AVAILABLE_WIDGETS = [
  { id: 'kpi_row',           name: 'KPI strategiczne',       description: '8 kart z kluczowymi metrykami',       default: true,  size: 'full' },
  { id: 'value_risk_matrix', name: 'Value × Risk matrix',    description: 'Heatmap segmentów vs ryzyka',          default: true,  size: 'half' },
  { id: 'revenue_trend',     name: 'Revenue trend',          description: 'Wykres przychodów 18m',                default: true,  size: 'half' },
  { id: 'opportunity_cards', name: 'Opportunity cards',      description: '4 karty z akcjami do podjęcia',        default: true,  size: 'full' },
  { id: 'lifecycle_funnel',  name: 'Lifecycle funnel',       description: 'Lejek New → Diamond',                  default: true,  size: 'half' },
  { id: 'worlds_performance',name: 'Worlds performance',     description: 'Top światy wg repeat rate',            default: true,  size: 'half' },
  { id: 'alert_center',      name: 'Alert center',           description: 'Automatyczne alerty i rekomendacje',   default: true,  size: 'full' },
  { id: 'cohort_mini',       name: 'Kohorty (mini)',         description: 'Ostatnie 6 kohort z retencją M+1/M+3', default: false, size: 'half' },
  { id: 'promo_dependency',  name: 'Promo dependency',       description: 'Segmentacja promo-zależności',         default: false, size: 'half' },
  { id: 'time_to_second',    name: 'Time to 2nd order',      description: 'Histogram czasu do drugiego zakupu',   default: false, size: 'half' },
  { id: 'repeat_ladder',     name: 'Repeat ladder',          description: 'Rozkład klientów wg liczby zamówień',  default: false, size: 'half' },
  { id: 'top_products',      name: 'Top produkty',           description: 'Top 10 produktów po revenue',         default: false, size: 'half' },
  { id: 'season_calendar',   name: 'Nadchodzące okazje',     description: 'Najbliższe okazje z danymi YoY',       default: false, size: 'half' },
  { id: 'segment_migration', name: 'Migracja segmentów',     description: 'Przepływy między segmentami',          default: false, size: 'full' },
  { id: 'traffic_pulse',     name: 'Traffic pulse',          description: 'Sesje, konwersje i top źródło (7d)',   default: false, size: 'half' },
];
const DEFAULT_WIDGETS = AVAILABLE_WIDGETS.filter(w => w.default).map(w => w.id);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  const sk: React.CSSProperties = {
    background: 'linear-gradient(90deg, #e8e0d8 25%, #f0ece6 50%, #e8e0d8 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderRadius: 8,
  };
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ height: 32, width: 300, ...sk, marginBottom: 8 }} />
      <div style={{ height: 16, width: 400, ...sk, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ ...sk, height: 90 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <div style={{ ...sk, height: 300 }} /><div style={{ ...sk, height: 300 }} />
      </div>
    </div>
  );
}

function MiniSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #e8e0d8 25%, #f0ece6 50%, #e8e0d8 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite',
      borderRadius: 8, height,
    }} />
  );
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 15, color: '#1a1a1a', marginBottom: 8 }}>Błąd ładowania dashboardu</div>
        <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 24 }}>{message || 'Nieznany błąd'}</div>
        <button onClick={onRetry} style={{ padding: '8px 20px', background: '#b8763a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>
          Spróbuj ponownie
        </button>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, subtitle, accent }: { label: string; value: string | React.ReactNode; subtitle?: string; accent?: boolean }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ? '#b8763a' : '#1a1a1a', lineHeight: 1.2 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>{subtitle}</div>}
    </div>
  );
}

// ─── KPI Row ──────────────────────────────────────────────────────────────────
function KpiRow({ kpis, promo, revenue }: { kpis: KPIs; promo: Promo; revenue: RevenueRow[] }) {
  const activeClients = (kpis as any).active_in_range ?? kpis.active_90d ?? 0;
  const repeaters = (kpis as any).repeaters_in_range ?? kpis.repeaters_90d ?? 0;
  const buyers = (kpis as any).buyers_in_range ?? kpis.buyers_90d ?? 0;
  const repeatRate = buyers > 0 ? (repeaters / buyers * 100).toFixed(1) : '0.0';
  const last3Repeat = revenue.slice(-3).reduce((s, r) => s + (r.repeat_revenue || 0), 0);
  const newPct = promo?.new_product_share_pct || 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 4 }}>
      <KpiCard label="Active (zakres)" value={formatNumber(activeClients)} subtitle={`z ${formatNumber(kpis.total_clients)} wszystkich`} />
      <KpiCard label="Repeat rate" value={repeatRate + '%'} subtitle={`${formatNumber(repeaters)} powracających`} accent={parseFloat(repeatRate) < 10} />
      <KpiCard label="Repeat revenue 90d" value={formatPLN(last3Repeat)} subtitle="ostatnie 3 miesiące" />
      <KpiCard label="At-risk revenue" value={formatPLN(kpis.at_risk_revenue)} subtitle={`${formatNumber(kpis.at_risk_count)} klientów`} accent />
      <KpiCard label="Winback VIP" value={formatNumber(kpis.winback_vip_count)} subtitle={`~${formatPLN(kpis.winback_vip_revenue)} potential`} />
      <KpiCard label="2nd order candidates" value={formatNumber(kpis.second_order_candidates)} subtitle="New, 30-90d window" />
      <KpiCard label="Promo share" value={(promo?.promo_share_pct || 0) + '%'} subtitle={`${formatPLN(promo?.promo_revenue || 0)} z ${formatPLN(promo?.total_revenue || 0)}`} />
      <KpiCard label="Nowości share" value={newPct.toFixed(0) + '%'} subtitle="udział nowości w sprzedaży" />
    </div>
  );
}

// ─── Value × Risk Matrix ──────────────────────────────────────────────────────
const SEGMENTS = ['Diamond', 'Platinum', 'Gold', 'Returning', 'New'];
const RISKS = ['OK', 'Risk', 'HighRisk', 'Lost'];
const RISK_CELL_COLORS: Record<string, (i: number) => string> = {
  OK:       (i) => `rgba(45,138,78,${(0.06 + i * 0.22).toFixed(2)})`,
  Risk:     (i) => `rgba(230,168,23,${(0.06 + i * 0.22).toFixed(2)})`,
  HighRisk: (i) => `rgba(221,68,68,${(0.06 + i * 0.22).toFixed(2)})`,
  Lost:     (i) => `rgba(0,0,0,${(0.03 + i * 0.10).toFixed(2)})`,
};

function ValueRiskMatrix({ matrix }: { matrix: MatrixRow[] }) {
  const lookup: Record<string, MatrixRow> = {};
  matrix.forEach(r => { lookup[`${r.legacy_segment}_${r.risk_level}`] = r; });
  const maxLtv = Math.max(...matrix.map(r => r.total_ltv), 1);
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Value × Risk matrix</div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 11, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Segment</th>
            {RISKS.map(r => (
              <th key={r} style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEGMENTS.map(seg => (
            <tr key={seg}>
              <td style={{ padding: '4px 8px', fontWeight: 600, color: '#1a1a1a', fontSize: 12, whiteSpace: 'nowrap', fontFamily: 'IBM Plex Mono, monospace' }}>{seg}</td>
              {RISKS.map(risk => {
                const cell = lookup[`${seg}_${risk}`];
                const intensity = cell ? Math.min(1, cell.total_ltv / maxLtv) : 0;
                const bg = cell ? RISK_CELL_COLORS[risk](intensity) : 'transparent';
                return (
                  <td key={risk}
                    onClick={() => { if (cell) window.location.href = `/crm/clients?segment=${seg}&risk=${risk}`; }}
                    style={{ padding: '6px 8px', textAlign: 'center', background: bg, cursor: cell ? 'pointer' : 'default', borderRadius: 4 }}
                    title={cell ? `${seg} / ${risk}: ${formatNumber(cell.client_count)} klientów` : ''}>
                    {cell ? (
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{formatNumber(cell.client_count)}</div>
                        <div style={{ fontSize: 11, color: '#333' }}>{formatPLN(cell.total_ltv)}</div>
                        <div style={{ fontSize: 10, color: '#6b6b6b' }}>avg {formatPLN(cell.avg_ltv)}</div>
                      </div>
                    ) : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Revenue Trend ────────────────────────────────────────────────────────────
declare global { interface Window { Chart: any; } }

function RevenueTrend({ revenue }: { revenue: RevenueRow[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const scriptAddedRef = useRef(false);
  const renderChartFnRef = useRef<() => void>(() => {});

  const renderChart = useCallback(() => {
    if (!canvasRef.current || !window.Chart || !revenue.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const labels = revenue.map(r => {
      const d = new Date(r.month);
      return (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear().toString().slice(2);
    });
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Repeat revenue', data: revenue.map(r => r.repeat_revenue), backgroundColor: '#2d8a4e', borderRadius: 2, stack: 'rev' },
          { label: 'New revenue', data: revenue.map(r => r.new_revenue), backgroundColor: '#d4cfc7', borderRadius: 2, stack: 'rev' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ' ' + formatPLN(ctx.raw) } } },
        scales: {
          x: { stacked: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 10, family: 'IBM Plex Mono, monospace' }, color: '#6b6b6b' } },
          y: { stacked: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, color: '#6b6b6b', callback: (v: number) => Math.round(v / 1000) + 'K' } },
        },
      },
    });
  }, [revenue]);

  useEffect(() => { renderChartFnRef.current = renderChart; }, [renderChart]);
  useEffect(() => {
    if (window.Chart) {
      renderChart();
      return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    }
    if (!scriptAddedRef.current) {
      scriptAddedRef.current = true;
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      script.onload = () => renderChartFnRef.current();
      document.head.appendChild(script);
    }
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [renderChart]);

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace' }}>Revenue trend</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b6b6b', alignItems: 'center' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#2d8a4e', borderRadius: 2, marginRight: 4 }} />Repeat</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#d4cfc7', borderRadius: 2, marginRight: 4 }} />New</span>
        </div>
      </div>
      <div style={{ height: 220 }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

// ─── Opportunity Cards ────────────────────────────────────────────────────────
function OpportunityCards({ kpis, promo }: { kpis: KPIs; promo: Promo }) {
  const cards = [
    { color: '#d44', title: 'VIP reactivation', desc: 'Diamond/Platinum, Lost/HighRisk', value: formatNumber(kpis.winback_vip_count), sub: 'Revenue pool: ' + formatPLN(kpis.winback_vip_revenue), href: '/crm/winback', link: 'Zobacz segment →' },
    { color: '#e6a817', title: 'Convert to 2nd order', desc: 'First-time buyers, 30-90d window', value: formatNumber(kpis.second_order_candidates), sub: 'Optymalny moment na kampanię', href: '/crm/clients?segment=New', link: 'Zobacz segment →' },
    { color: '#3577b3', title: 'Promo share revenue', desc: 'Udział promo w revenue', value: (promo?.promo_share_pct || 0) + '%', sub: formatPLN(promo?.promo_revenue || 0) + ' z ' + formatPLN(promo?.total_revenue || 0), href: '/crm/clients', link: 'Filtruj klientów →' },
    { color: '#2d8a4e', title: 'Diamond klienci', desc: 'Legacy Diamond segment', value: formatNumber(kpis.diamond_count), sub: 'avg LTV: ' + formatPLN((kpis.total_ltv || 0) / Math.max(kpis.diamond_count || 1, 1)), href: '/crm/clients?segment=Diamond', link: 'Zobacz segment →' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
      {cards.map((c) => (
        <div key={c.title} style={{ background: '#fff', border: '1px solid #e8e0d8', borderLeft: `4px solid ${c.color}`, borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.color, marginBottom: 4 }}>{c.title}</div>
          <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 10 }}>{c.desc}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>{c.value}</div>
          <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 10 }}>{c.sub}</div>
          <a href={c.href} style={{ fontSize: 12, color: '#b8763a', textDecoration: 'none' }}>{c.link}</a>
        </div>
      ))}
    </div>
  );
}

// ─── Lifecycle Funnel ─────────────────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  '1_new': 'New (1 zam.)', '2_returning': 'Returning (2-3)', '3_gold': 'Gold (4-7)',
  '4_platinum': 'Platinum (8-14)', '5_diamond': 'Diamond (15+)',
};
const STAGE_COLORS = ['#d4cfc7', '#3577b3', '#e6a817', '#8b7355', '#b8763a'];

function LifecycleFunnel({ funnel }: { funnel: FunnelRow[] }) {
  const sorted = [...funnel].sort((a, b) => a.stage.localeCompare(b.stage));
  const maxCount = Math.max(...sorted.map(s => s.client_count), 1);
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Lifecycle funnel</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((row, i) => {
          const barWidth = Math.max((row.client_count / maxCount) * 100, 4);
          const next = sorted[i + 1];
          const convertPct = next && row.client_count > 0 ? (next.client_count / row.client_count * 100).toFixed(1) : null;
          return (
            <div key={row.stage}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 130, fontSize: 12, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{STAGE_LABELS[row.stage] || row.stage}</div>
                <div style={{ flex: 1, background: '#f0ece6', borderRadius: 4, height: 24, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${barWidth}%`, background: STAGE_COLORS[i] || '#b8763a', borderRadius: 4, minWidth: 20 }} />
                </div>
                <div style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{formatNumber(row.client_count)}</div>
                <div style={{ fontSize: 11, color: '#6b6b6b', minWidth: 80, textAlign: 'right' }}>{formatPLN(row.avg_ltv)}</div>
              </div>
              {convertPct && <div style={{ fontSize: 10, color: '#999', paddingLeft: 138, marginTop: 2 }}>↓ {convertPct}% convert</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Worlds Performance ───────────────────────────────────────────────────────
function WorldsPerformance({ worlds }: { worlds: WorldRow[] }) {
  const maxRepeatRate = Math.max(...worlds.map(w => w.repeat_rate || 0), 1);
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Worlds performance</div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e8e0d8' }}>
            {['World', 'Klienci', 'Repeat rate', 'Avg LTV', 'VIP%'].map(h => (
              <th key={h} style={{ padding: '6px 8px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h === 'World' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {worlds.map(w => {
            const vipPct = w.client_count > 0 ? (w.vip_count / w.client_count * 100).toFixed(1) : '0.0';
            const barPct = maxRepeatRate > 0 ? (w.repeat_rate / maxRepeatRate * 100) : 0;
            return (
              <tr key={w.world}
                onClick={() => { window.location.href = `/crm/clients?world=${encodeURIComponent(w.world)}`; }}
                style={{ borderBottom: '1px solid #f0ece6', cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#faf8f5'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                <td style={{ padding: '8px 8px', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{w.world}</td>
                <td style={{ padding: '8px 8px', fontSize: 13, color: '#1a1a1a', textAlign: 'right' }}>{formatNumber(w.client_count)}</td>
                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <div style={{ width: 60, height: 6, background: '#e8e0d8', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: '#2d8a4e', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#1a1a1a', minWidth: 36 }}>{w.repeat_rate}%</span>
                  </div>
                </td>
                <td style={{ padding: '8px 8px', fontSize: 12, color: '#1a1a1a', textAlign: 'right' }}>{formatPLN(w.avg_ltv)}</td>
                <td style={{ padding: '8px 8px', fontSize: 12, color: '#6b6b6b', textAlign: 'right' }}>{vipPct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Alert Center ─────────────────────────────────────────────────────────────
const ALERT_COLORS: Record<string, string> = { danger: '#d44', warning: '#e6a817', success: '#2d8a4e', info: '#3577b3' };
const ALERT_BG: Record<string, string> = { danger: 'rgba(221,68,68,0.04)', warning: 'rgba(230,168,23,0.04)', success: 'rgba(45,138,78,0.04)', info: 'rgba(53,119,179,0.04)' };

function generateAlerts(kpis: KPIs, promo: Promo, worlds: WorldRow[]) {
  const alerts: { type: string; text: string }[] = [];
  if (kpis.winback_vip_count > 50) alerts.push({ type: 'danger', text: `${formatNumber(kpis.winback_vip_count)} Diamond/Platinum klientów w statusie Lost/HighRisk — revenue pool: ${formatPLN(kpis.winback_vip_revenue)}` });
  if (promo?.promo_share_pct > 25) alerts.push({ type: 'warning', text: `Udział promo w revenue wynosi ${promo.promo_share_pct}% — rozważ kampanie full-price` });
  if (worlds.length > 0) {
    const best = [...worlds].sort((a, b) => b.repeat_rate - a.repeat_rate)[0];
    if (best) alerts.push({ type: 'success', text: `Świat "${best.world}": repeat rate ${best.repeat_rate}% — najwyższy w portfolio` });
  }
  if (kpis.second_order_candidates > 500) alerts.push({ type: 'warning', text: `${formatNumber(kpis.second_order_candidates)} klientów po 1. zakupie w oknie 30-90 dni — optymalny moment na kampanię 2nd order` });
  const repeaters = (kpis as any).repeaters_in_range ?? kpis.repeaters_90d ?? 0;
  const buyers = (kpis as any).buyers_in_range ?? kpis.buyers_90d ?? 0;
  const repeatRate = buyers > 0 ? (repeaters / buyers * 100) : 0;
  if (repeatRate > 0 && repeatRate < 10) alerts.push({ type: 'warning', text: `Repeat rate wynosi ${repeatRate.toFixed(1)}% — poniżej benchmarku e-commerce (10-15%)` });
  return alerts;
}

function AlertCenter({ kpis, promo, worlds }: { kpis: KPIs; promo: Promo; worlds: WorldRow[] }) {
  const alerts = generateAlerts(kpis, promo, worlds);
  if (!alerts.length) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 10 }}>Alerty</div>
      {alerts.map((a, i) => (
        <div key={i} style={{ borderLeft: `4px solid ${ALERT_COLORS[a.type]}`, background: ALERT_BG[a.type], padding: '12px 16px', marginBottom: 8, borderRadius: '0 4px 4px 0', fontSize: 13, color: '#1a1a1a' }}>
          {a.text}
        </div>
      ))}
    </div>
  );
}

// ─── Mini Widgets ─────────────────────────────────────────────────────────────
function MiniWidgetShell({ title, href, children, loading }: { title: string; href: string; children: React.ReactNode; loading: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace' }}>{title}</div>
        <a href={href} style={{ fontSize: 11, color: '#b8763a', textDecoration: 'none' }}>Zobacz więcej →</a>
      </div>
      {loading ? <MiniSkeleton height={200} /> : children}
    </div>
  );
}

function MiniCohort() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/crm/cohorts').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  // Pivot: retention rows (cohort_month, months_after, cohort_size, retention_pct) -> per-cohort with M+1, M+3
  const retention = data?.retention || [];
  const byMonth: Record<string, any> = {};
  for (const r of retention) {
    const key = r.cohort_month;
    if (!byMonth[key]) byMonth[key] = { cohort_month: key, cohort_size: r.cohort_size };
    if (r.months_after === 1) byMonth[key].m1 = r.retention_pct;
    if (r.months_after === 3) byMonth[key].m3 = r.retention_pct;
  }
  const cohorts = Object.values(byMonth).sort((a: any, b: any) => b.cohort_month.localeCompare(a.cohort_month)).slice(0, 6);
  return (
    <MiniWidgetShell title="Kohorty (mini)" href="/crm/cohorts" loading={loading}>
      {cohorts.length > 0 ? (
        <div style={{ overflowX: 'auto', maxHeight: 280 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e0d8' }}>
                {['Kohorta', 'Klienci', 'M+1', 'M+3'].map(h => (
                  <th key={h} style={{ padding: '4px 6px', textAlign: h === 'Kohorta' ? 'left' : 'right', color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ece6' }}>
                  <td style={{ padding: '5px 6px', fontFamily: 'IBM Plex Mono, monospace' }}>{(c.cohort_month || '').slice(0, 7)}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right' }}>{(c.cohort_size || 0).toLocaleString('pl-PL')}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#2d8a4e' }}>{c.m1 != null ? c.m1 + '%' : '—'}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#3577b3' }}>{c.m3 != null ? c.m3 + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>Brak danych kohort</div>}
    </MiniWidgetShell>
  );
}

function MiniPromo() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/crm/promotions').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const segments = (data?.dependency || data?.promo_segments || []).filter((s: any) => s.dependency_segment !== 'never_promo');
  return (
    <MiniWidgetShell title="Promo dependency" href="/crm/promotions" loading={loading}>
      {segments.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {segments.slice(0, 5).map((s: any, i: number) => {
            const pct = Math.round(s.avg_promo_pct ?? s.promo_pct ?? s.pct ?? 0);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 90, fontSize: 11, color: '#1a1a1a', flexShrink: 0 }}>{s.dependency_segment || s.segment || s.name || '—'}</div>
                <div style={{ flex: 1, background: '#f0ece6', borderRadius: 3, height: 14, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: '#e6a817', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: '#e6a817', minWidth: 38, textAlign: 'right' }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      ) : <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>Brak danych promo</div>}
    </MiniWidgetShell>
  );
}

function MiniTimeToSecond() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/crm/cohorts?type=time_to_second').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const buckets = data?.timeToSecond || data?.time_to_second || data?.histogram || [];
  return (
    <MiniWidgetShell title="Time to 2nd order" href="/crm/cohorts" loading={loading}>
      {buckets.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {buckets.map((b: any, i: number) => {
            const maxVal = Math.max(...buckets.map((x: any) => x.client_count || x.count || x.clients || 0), 1);
            const val = b.client_count || b.count || b.clients || 0;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 70, fontSize: 10, color: '#6b6b6b', flexShrink: 0 }}>{b.bucket || b.range}</div>
                <div style={{ flex: 1, background: '#f0ece6', borderRadius: 3, height: 12 }}>
                  <div style={{ height: '100%', width: `${(val / maxVal) * 100}%`, background: '#3577b3', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 10, color: '#1a1a1a', minWidth: 40, textAlign: 'right' }}>{val.toLocaleString('pl-PL')}</div>
              </div>
            );
          })}
        </div>
      ) : <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>Brak danych</div>}
    </MiniWidgetShell>
  );
}

function MiniRepeatLadder() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/crm/lifecycle').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const ladder = data?.ladder || [];
  const maxClients = Math.max(...ladder.map((r: any) => r.clients || 0), 1);
  return (
    <MiniWidgetShell title="Repeat ladder" href="/crm/lifecycle" loading={loading}>
      {ladder.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ladder.slice(0, 7).map((r: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 40, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#b8763a', flexShrink: 0 }}>{r.bucket}</div>
              <div style={{ flex: 1, background: '#f0ece6', borderRadius: 3, height: 14 }}>
                <div style={{ height: '100%', width: `${(r.clients / maxClients) * 100}%`, background: '#b8763a', borderRadius: 3, opacity: 0.7 + i * 0.04 }} />
              </div>
              <div style={{ fontSize: 11, color: '#1a1a1a', minWidth: 50, textAlign: 'right' }}>{(r.clients || 0).toLocaleString('pl-PL')}</div>
            </div>
          ))}
        </div>
      ) : <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>Brak danych</div>}
    </MiniWidgetShell>
  );
}

function MiniTopProducts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/crm/products-analytics?limit=10').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const products = data?.products || data?.top || [];
  return (
    <MiniWidgetShell title="Top produkty" href="/crm/products" loading={loading}>
      {products.length > 0 ? (
        <div style={{ overflowY: 'auto', maxHeight: 250 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e0d8' }}>
                {['Produkt', 'Revenue'].map(h => <th key={h} style={{ padding: '4px 6px', textAlign: h === 'Produkt' ? 'left' : 'right', color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ece6' }}>
                  <td style={{ padding: '5px 6px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name || p.name || '—'}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#b8763a' }}>{formatPLN(p.total_revenue || p.revenue || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>Brak danych produktów</div>}
    </MiniWidgetShell>
  );
}

function MiniSeasonCalendar() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/crm/promotions').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const occasions = (data?.upcoming || data?.occasions || []).slice(0, 5);
  return (
    <MiniWidgetShell title="Nadchodzące okazje" href="/crm/promotions" loading={loading}>
      {occasions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {occasions.map((o: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#faf8f5', borderRadius: 4 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{o.name || o.occasion}</div>
                <div style={{ fontSize: 10, color: '#6b6b6b' }}>{o.date || o.days_ahead}</div>
              </div>
              {o.yoy_growth && <div style={{ fontSize: 11, color: o.yoy_growth > 0 ? '#2d8a4e' : '#dd4444' }}>{o.yoy_growth > 0 ? '+' : ''}{o.yoy_growth}% YoY</div>}
            </div>
          ))}
        </div>
      ) : <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>Brak danych kalendarza</div>}
    </MiniWidgetShell>
  );
}

function MiniTrafficPulse() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      fetch('/api/crm/traffic?section=overview&period=7d').then(r => r.json()).catch(() => null),
      fetch('/api/crm/traffic?section=sources&period=7d').then(r => r.json()).catch(() => null),
    ]).then(([overview, sources]) => {
      setData({ overview, sources });
      setLoading(false);
    });
  }, []);

  const kpis = data?.overview?.kpis;
  const prev = data?.overview?.previousPeriod;
  const channels: any[] = data?.sources?.channels || [];
  const topChannel = channels.sort((a: any, b: any) => b.sessions - a.sessions)[0];
  const ga4Ok = data?.overview?.ga4_configured;

  return (
    <MiniWidgetShell title="Traffic pulse (7d)" href="/crm/traffic" loading={loading}>
      {!ga4Ok ? (
        <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>GA4 nie skonfigurowane</div>
      ) : !kpis ? (
        <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>Brak danych</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Sesje', value: new Intl.NumberFormat('pl-PL').format(Math.round(kpis.sessions || 0)), delta: prev?.sessions ? ((kpis.sessions - prev.sessions) / prev.sessions * 100).toFixed(1) : null },
              { label: 'Konwersja', value: (kpis.conversionRate || 0).toFixed(1) + '%', delta: null },
            ].map((item, i) => (
              <div key={i} style={{ background: '#faf8f5', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace' }}>{item.value}</div>
                {item.delta && (
                  <div style={{ fontSize: 10, color: parseFloat(item.delta) >= 0 ? '#2d8a4e' : '#dd4444' }}>
                    {parseFloat(item.delta) >= 0 ? '+' : ''}{item.delta}% vs poprz.
                  </div>
                )}
              </div>
            ))}
          </div>
          {topChannel && (
            <div style={{ fontSize: 12, padding: '6px 10px', background: '#faf8f5', borderRadius: 6 }}>
              <span style={{ color: '#6b6b6b' }}>Top kanał: </span>
              <span style={{ fontWeight: 600, color: '#b8763a' }}>{topChannel.channel}</span>
              <span style={{ color: '#6b6b6b' }}> · {new Intl.NumberFormat('pl-PL').format(topChannel.sessions)} sesji</span>
            </div>
          )}
        </div>
      )}
    </MiniWidgetShell>
  );
}

function MiniSegmentMigration() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/crm/segment-migration').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const segs = ['New', 'Returning', 'Gold', 'Platinum', 'Diamond'];

  return (
    <MiniWidgetShell title="Migracja segmentów" href="/crm/lifecycle" loading={loading}>
      {!data?.migration ? (
        <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 20 }}>
          {data?.message || 'Brak danych migracji — potrzebne snapshoty'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ fontSize: 10, color: '#6b6b6b', marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace' }}>
            {data.fromDate} → {data.toDate}
          </div>
          <table style={{ borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr>
                <th style={{ padding: '3px 5px', color: '#6b6b6b' }}></th>
                {segs.map(s => <th key={s} style={{ padding: '3px 5px', color: '#6b6b6b', fontWeight: 600 }}>{s.slice(0, 3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {segs.map((from, fi) => (
                <tr key={from}>
                  <td style={{ padding: '3px 5px', fontWeight: 600, color: '#6b6b6b', whiteSpace: 'nowrap' }}>{from.slice(0, 3)}</td>
                  {segs.map((to, ti) => {
                    const entry = data.migration?.find((m: any) => m.from_segment === from && m.to_segment === to);
                    const count = entry?.client_count || 0;
                    const isDiag = fi === ti;
                    const isUp = ti > fi;
                    const bg = count === 0 ? 'transparent' : isDiag ? 'rgba(0,0,0,0.04)' : isUp ? `rgba(45,138,78,0.15)` : `rgba(221,68,68,0.15)`;
                    return (
                      <td key={to} style={{ padding: '3px 5px', textAlign: 'center', background: bg, borderRadius: 2, fontSize: 10 }}>
                        {count > 0 ? count.toLocaleString('pl-PL') : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MiniWidgetShell>
  );
}

// ─── Widget Picker Panel ──────────────────────────────────────────────────────
function WidgetPicker({ customWidgets, onChange, onSave, onReset }: {
  customWidgets: string[]; onChange: (ids: string[]) => void; onSave: () => void; onReset: () => void;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
        Wybierz widgety do wyświetlenia:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {AVAILABLE_WIDGETS.map(widget => {
          const isActive = customWidgets.includes(widget.id);
          return (
            <label key={widget.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
              background: isActive ? 'rgba(184,118,58,0.06)' : '#faf8f5',
              border: `1px solid ${isActive ? '#b8763a' : '#e8e0d8'}`,
              borderRadius: 6, cursor: 'pointer', fontSize: 12,
            }}>
              <input type="checkbox" checked={isActive}
                onChange={() => onChange(isActive ? customWidgets.filter(id => id !== widget.id) : [...customWidgets, widget.id])}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{widget.name}</div>
                <div style={{ color: '#6b6b6b', fontSize: 11 }}>{widget.description}</div>
              </div>
            </label>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button onClick={onReset} style={{ padding: '6px 12px', fontSize: 12, border: '1px solid #e8e0d8', borderRadius: 4, cursor: 'pointer', background: '#fff', fontFamily: 'IBM Plex Mono, monospace' }}>
          Reset do domyślnych
        </button>
        <button onClick={onSave} style={{ padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 4, cursor: 'pointer', background: '#b8763a', color: '#fff', fontFamily: 'IBM Plex Mono, monospace' }}>
          Zapisz konfigurację
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    return { from, to, label: 'Ostatnie 90d' };
  });

  // Custom dashboard state
  const [dashboardMode, setDashboardMode] = useState<'general' | 'custom'>('general');
  const [customWidgets, setCustomWidgets] = useState<string[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);

  // Load saved config on mount
  useEffect(() => {
    fetch('/api/crm/dashboard-config?user_id=default')
      .then(r => r.json())
      .then(d => {
        const defaultConfig = d.configs?.find((c: any) => c.is_default);
        if (defaultConfig?.widgets?.length) {
          setCustomWidgets(defaultConfig.widgets);
          setDashboardMode('custom');
        }
      })
      .catch(() => {});
  }, []);

  const saveConfig = async () => {
    await fetch('/api/crm/dashboard-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'default', config_name: 'Mój dashboard', widgets: customWidgets, is_default: true }),
    });
    setEditMode(false);
  };

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (dateRange.from) params.set('date_from', dateRange.from);
    if (dateRange.to) params.set('date_to', dateRange.to);
    fetch(`/api/crm/dashboard?${params}`)
      .then(r => r.json())
      .then((d: DashboardData & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setData(d); setLastRefresh(new Date()); setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [dateRange.from, dateRange.to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) return <ErrorState message={error} onRetry={load} />;

  const { kpis, matrix, revenue, funnel, worlds, promo } = data;

  const activeWidgets = dashboardMode === 'general' ? AVAILABLE_WIDGETS.map(w => w.id) : customWidgets;
  const show = (id: string) => activeWidgets.includes(id);

  // Pairs of half-width widgets
  const halfPairs: [string, string][] = [
    ['value_risk_matrix', 'revenue_trend'],
    ['lifecycle_funnel', 'worlds_performance'],
    ['cohort_mini', 'promo_dependency'],
    ['time_to_second', 'repeat_ladder'],
    ['top_products', 'season_calendar'],
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', margin: 0, marginBottom: 6 }}>Executive Dashboard</h1>
          <div style={{ fontSize: 13, color: '#6b6b6b' }}>Stan bazy klientów Nadwyraz.com · odświeżono {formatDate(lastRefresh)}</div>
        </div>
        <button onClick={load} style={{ padding: '7px 16px', border: '1px solid #e8e0d8', background: '#fff', borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>
          Odśwież
        </button>
      </div>

      <DateRangePicker onChange={setDateRange} defaultPreset="Ostatnie 90d" />

      {/* Dashboard mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 0, border: '1px solid #e8e0d8', borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => { setDashboardMode('general'); setEditMode(false); }} style={{
            padding: '6px 16px', fontSize: 12, border: 'none', cursor: 'pointer',
            background: dashboardMode === 'general' ? '#b8763a' : '#fff',
            color: dashboardMode === 'general' ? '#fff' : '#1a1a1a',
            fontFamily: 'IBM Plex Mono, monospace',
          }}>Ogólny</button>
          <button onClick={() => setDashboardMode('custom')} style={{
            padding: '6px 16px', fontSize: 12, border: 'none', cursor: 'pointer',
            background: dashboardMode === 'custom' ? '#b8763a' : '#fff',
            color: dashboardMode === 'custom' ? '#fff' : '#1a1a1a',
            fontFamily: 'IBM Plex Mono, monospace',
          }}>Mój dashboard</button>
        </div>
        {dashboardMode === 'custom' && (
          <button onClick={() => setEditMode(prev => !prev)} style={{
            padding: '6px 12px', fontSize: 12, border: '1px solid #e8e0d8', borderRadius: 4,
            background: editMode ? '#b8763a' : '#fff', color: editMode ? '#fff' : '#6b6b6b',
            cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace',
          }}>
            {editMode ? 'Zamknij edycję' : '⚙ Edytuj widgety'}
          </button>
        )}
      </div>

      {/* Edit panel */}
      {editMode && dashboardMode === 'custom' && (
        <WidgetPicker
          customWidgets={customWidgets}
          onChange={setCustomWidgets}
          onSave={saveConfig}
          onReset={() => setCustomWidgets(DEFAULT_WIDGETS)}
        />
      )}

      {/* KPI row */}
      {show('kpi_row') && <KpiRow kpis={kpis} promo={promo} revenue={revenue} />}

      {/* Half-width pairs */}
      {halfPairs.map(([a, b]) => {
        const showA = show(a);
        const showB = show(b);
        if (!showA && !showB) return null;

        const renderWidget = (id: string) => {
          switch (id) {
            case 'value_risk_matrix': return <ValueRiskMatrix matrix={matrix} />;
            case 'revenue_trend': return <RevenueTrend revenue={revenue} />;
            case 'lifecycle_funnel': return <LifecycleFunnel funnel={funnel} />;
            case 'worlds_performance': return <WorldsPerformance worlds={worlds} />;
            case 'cohort_mini': return <MiniCohort />;
            case 'promo_dependency': return <MiniPromo />;
            case 'time_to_second': return <MiniTimeToSecond />;
            case 'repeat_ladder': return <MiniRepeatLadder />;
            case 'top_products': return <MiniTopProducts />;
            case 'season_calendar': return <MiniSeasonCalendar />;
            case 'traffic_pulse': return <MiniTrafficPulse />;
            default: return null;
          }
        };

        if (showA && showB) {
          return (
            <div key={`${a}_${b}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
              {renderWidget(a)}
              {renderWidget(b)}
            </div>
          );
        }
        return (
          <div key={`${a}_${b}`} style={{ marginTop: 20 }}>
            {showA ? renderWidget(a) : renderWidget(b)}
          </div>
        );
      })}

      {/* Full-width widgets */}
      {show('opportunity_cards') && <OpportunityCards kpis={kpis} promo={promo} />}
      {show('segment_migration') && (
        <div style={{ marginTop: 20 }}>
          <MiniSegmentMigration />
        </div>
      )}
      {show('alert_center') && <AlertCenter kpis={kpis} promo={promo} worlds={worlds} />}
    </div>
  );
}
