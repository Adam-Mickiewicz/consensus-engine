'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = '7d' | '30d' | '90d';
type Tab = 'overview' | 'sources' | 'funnel' | 'products' | 'search' | 'devices';

interface KPIs {
  sessions: number; users: number; newUsers: number; purchases: number;
  revenue: number; pageViews: number; engagementDuration: number;
  avgSessionDuration: number; conversionRate: number;
}
interface PrevKPIs { sessions: number; users: number; purchases: number; revenue: number; }
interface DailyRow { date: string; sessions: number; users: number; purchases: number; revenue: number; }
interface ChannelRow { channel: string; sessions: number; users: number; newUsers: number; purchases: number; revenue: number; }
interface SourceRow { source: string; medium: string; sessions: number; purchases: number; revenue: number; }
interface CampaignRow { campaign: string; sessions: number; purchases: number; revenue: number; }
interface FunnelRow { event: string; count: number; }
interface ProductRow { path: string; pageViews: number; purchases: number; revenue: number; engagementDuration: number; }
interface SearchRow { term: string; sessions: number; }
interface DeviceRow { device: string; sessions: number; purchases: number; revenue: number; }
interface BrowserRow { browser: string; sessions: number; }
interface GeoRow { city: string; sessions: number; purchases: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatN(v: number): string {
  return new Intl.NumberFormat('pl-PL').format(Math.round(v || 0));
}
function formatPLN(v: number): string {
  if (!v || isNaN(v)) return '0 zł';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' mln zł';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + ' tys. zł';
  return Math.round(v) + ' zł';
}
function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
function formatPct(v: number): string {
  return v.toFixed(1) + '%';
}
function delta(curr: number, prev: number): { val: string; positive: boolean; zero: boolean } {
  if (!prev) return { val: '—', positive: true, zero: true };
  const d = ((curr - prev) / prev) * 100;
  return { val: (d >= 0 ? '+' : '') + d.toFixed(1) + '%', positive: d >= 0, zero: Math.abs(d) < 0.05 };
}
function convRate(purchases: number, sessions: number): string {
  if (!sessions) return '0.0%';
  return ((purchases / sessions) * 100).toFixed(1) + '%';
}

// ─── Color palette ───────────────────────────────────────────────────────────
const C = {
  bg: '#f5f2ee', card: '#fff', border: '#e8e0d8', accent: '#b8763a',
  danger: '#dd4444', warning: '#e6a817', success: '#2d8a4e', info: '#3577b3',
  text: '#1a1a1a', muted: '#6b6b6b', hover: '#f0ece6',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ h = 80, w = '100%' }: { h?: number; w?: string | number }) {
  return (
    <div style={{
      height: h, width: w,
      background: 'linear-gradient(90deg, #e8e0d8 25%, #f0ece6 50%, #e8e0d8 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderRadius: 8,
    }} />
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, deltaInfo, sub }: {
  label: string; value: string;
  deltaInfo?: { val: string; positive: boolean; zero: boolean };
  sub?: string;
}) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.1 }}>{value}</div>
      {deltaInfo && !deltaInfo.zero && (
        <div style={{ fontSize: 11, marginTop: 4, color: deltaInfo.positive ? C.success : C.danger, fontFamily: 'IBM Plex Mono, monospace' }}>
          {deltaInfo.val} vs poprz. okres
        </div>
      )}
      {sub && <div style={{ fontSize: 11, marginTop: 4, color: C.muted, fontFamily: 'IBM Plex Mono, monospace' }}>{sub}</div>}
    </div>
  );
}

// ─── Daily Chart (Chart.js via CDN, same pattern as analytics page) ──────────
declare global { interface Window { Chart: any; } }

function DailyChart({ data }: { data: DailyRow[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const scriptAddedRef = useRef(false);
  const renderChartFnRef = useRef<() => void>(() => {});

  const renderChart = useCallback(() => {
    if (!canvasRef.current || !window.Chart || !data.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const labels = data.map(r => {
      const d = r.date;
      return `${d.slice(6, 8)}.${d.slice(4, 6)}`;
    });

    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Sesje',
            data: data.map(r => r.sessions),
            borderColor: C.info,
            backgroundColor: C.info + '18',
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            yAxisID: 'y',
          },
          {
            label: 'Zakupy',
            data: data.map(r => r.purchases),
            borderColor: C.accent,
            backgroundColor: C.accent + '18',
            fill: false,
            tension: 0.35,
            pointRadius: 2,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { font: { family: 'IBM Plex Mono', size: 11 }, color: C.muted, boxWidth: 12 } },
        },
        scales: {
          x: { ticks: { font: { family: 'IBM Plex Mono', size: 10 }, color: C.muted, maxTicksLimit: 10 }, grid: { color: C.border } },
          y: {
            position: 'left',
            ticks: { font: { family: 'IBM Plex Mono', size: 10 }, color: C.info },
            grid: { color: C.border },
            title: { display: true, text: 'Sesje', font: { family: 'IBM Plex Mono', size: 10 }, color: C.info },
          },
          y1: {
            position: 'right',
            ticks: { font: { family: 'IBM Plex Mono', size: 10 }, color: C.accent },
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Zakupy', font: { family: 'IBM Plex Mono', size: 10 }, color: C.accent },
          },
        },
      },
    });
  }, [data]);

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

  return <div style={{ height: 260 }}><canvas ref={canvasRef} /></div>;
}

// ─── Funnel Bar ───────────────────────────────────────────────────────────────
const FUNNEL_ORDER = ['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'add_payment_info', 'purchase'];
const FUNNEL_LABELS: Record<string, string> = {
  page_view: 'Odsłony strony',
  view_item: 'Wyświetlenie produktu',
  add_to_cart: 'Dodanie do koszyka',
  begin_checkout: 'Rozpoczęcie checkout',
  add_payment_info: 'Dane płatności',
  purchase: 'Zakup',
};

function FunnelView({ rows }: { rows: FunnelRow[] }) {
  const map: Record<string, number> = {};
  rows.forEach(r => { map[r.event] = r.count; });

  const steps = FUNNEL_ORDER
    .filter(e => map[e] !== undefined)
    .map(e => ({ event: e, count: map[e] }));

  if (!steps.length) return <div style={{ color: C.muted, fontSize: 13 }}>Brak danych funnel.</div>;

  const maxCount = steps[0].count || 1;
  const shades = ['#f0e8de', '#e8d4bf', '#dfc09f', '#d6ac80', '#cc9860', C.accent];
  const total = steps[0].count;

  return (
    <div style={{ maxWidth: 640 }}>
      {steps.map((step, i) => {
        const pct = (step.count / maxCount) * 100;
        const prevCount = i > 0 ? steps[i - 1].count : null;
        const convFromPrev = prevCount ? ((step.count / prevCount) * 100).toFixed(1) : null;
        const convFromTop = total ? ((step.count / total) * 100).toFixed(1) : null;
        const color = shades[Math.min(i, shades.length - 1)];

        return (
          <div key={step.event}>
            {i > 0 && convFromPrev && (
              <div style={{ fontSize: 11, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', paddingLeft: 140, margin: '4px 0', opacity: 0.8 }}>
                ↓ {convFromPrev}% przeszło dalej
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
              <div style={{ width: 140, fontSize: 11, color: C.text, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0, textAlign: 'right' }}>
                {FUNNEL_LABELS[step.event] || step.event}
              </div>
              <div style={{ flex: 1, background: '#f0ece6', borderRadius: 4, height: 28, overflow: 'hidden' }}>
                <div style={{
                  width: pct + '%', height: '100%', background: color,
                  borderRadius: 4, transition: 'width 0.5s ease',
                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                }}>
                  <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: i >= 4 ? '#fff' : C.text, whiteSpace: 'nowrap' }}>
                    {formatN(step.count)}
                  </span>
                </div>
              </div>
              <div style={{ width: 52, fontSize: 11, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>
                {convFromTop}%
              </div>
            </div>
          </div>
        );
      })}
      {steps.length >= 2 && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.muted, fontFamily: 'IBM Plex Mono, monospace' }}>
          Konwersja {FUNNEL_LABELS[steps[0].event]} → {FUNNEL_LABELS[steps[steps.length - 1].event]}:{' '}
          <span style={{ color: C.accent, fontWeight: 700 }}>
            {((steps[steps.length - 1].count / steps[0].count) * 100).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{
      padding: '8px 12px', textAlign: right ? 'right' : 'left',
      fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: C.muted,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      borderBottom: `1px solid ${C.border}`, background: '#faf8f5', fontWeight: 500,
    }}>{children}</th>
  );
}
function Td({ children, right, bold, color }: { children: React.ReactNode; right?: boolean; bold?: boolean; color?: string }) {
  return (
    <td style={{
      padding: '8px 12px', textAlign: right ? 'right' : 'left',
      fontSize: 12, fontFamily: 'IBM Plex Mono, monospace',
      color: color || C.text, fontWeight: bold ? 700 : 400,
      borderBottom: `1px solid ${C.border}`,
    }}>{children}</td>
  );
}

// ─── Not configured fallback ──────────────────────────────────────────────────
function NotConfigured() {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 32, maxWidth: 520,
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12 }}>
        Google Analytics 4 nie skonfigurowane
      </div>
      <div style={{ fontSize: 13, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.8 }}>
        Aby zobaczyć dane o ruchu, skonfiguruj zmienne środowiskowe:
      </div>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['GA4_PROPERTY_ID', 'GA4_CLIENT_EMAIL', 'GA4_PRIVATE_KEY'].map(k => (
          <div key={k} style={{ background: '#faf8f5', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: C.accent }}>
            {k}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.7 }}>
        Instrukcja: analytics.google.com → Administracja →<br />
        Zarządzanie dostępem → dodaj email konta usługi jako Viewer
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TrafficPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [ga4Ok, setGa4Ok] = useState(true);

  const fetchData = useCallback(async (t: Tab, p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/traffic?section=${t}&period=${p}`);
      const json = await res.json();
      if (!json.ga4_configured) {
        setGa4Ok(false);
      } else {
        setGa4Ok(true);
        setData(json);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(tab, period); }, [tab, period, fetchData]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Przegląd' },
    { id: 'sources', label: 'Źródła' },
    { id: 'funnel', label: 'Lejek' },
    { id: 'products', label: 'Produkty' },
    { id: 'search', label: 'Wyszukiwania' },
    { id: 'devices', label: 'Geo i urządzenia' },
  ];

  const pillBtn = (active: boolean) => ({
    padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
    fontFamily: 'IBM Plex Mono, monospace',
    background: active ? C.accent : C.card,
    color: active ? '#fff' : C.muted,
    border: `1px solid ${active ? C.accent : C.border}`,
    fontWeight: active ? 600 : 400,
  } as React.CSSProperties);

  return (
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .tr-table { width: 100%; border-collapse: collapse; }
        .tr-table tbody tr:hover td { background: ${C.hover}; }
        .tr-scroll { overflow-x: auto; border: 1px solid ${C.border}; border-radius: 10px; }
      `}</style>

      <div style={{ maxWidth: 1300, margin: '0 auto', fontFamily: 'IBM Plex Mono, monospace' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>
            Ruch &amp; Pozyskanie
          </h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Dane z Google Analytics 4</div>
        </div>

        {/* Period picker */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={pillBtn(period === p)}>
              {p === '7d' ? '7 dni' : p === '30d' ? '30 dni' : '90 dni'}
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                fontFamily: 'IBM Plex Mono, monospace',
                background: 'none', border: 'none',
                borderBottom: tab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
                color: tab === t.id ? C.accent : C.muted,
                fontWeight: tab === t.id ? 600 : 400,
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Not configured */}
        {!ga4Ok && <NotConfigured />}

        {/* Error */}
        {error && ga4Ok && (
          <div style={{ color: C.danger, fontSize: 13, padding: 16 }}>Błąd: {error}</div>
        )}

        {/* Loading skeletons */}
        {loading && ga4Ok && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={90} />)}
            </div>
            <Skeleton h={260} />
          </div>
        )}

        {/* Content */}
        {!loading && !error && ga4Ok && data && (
          <>
            {tab === 'overview' && <OverviewTab data={data} />}
            {tab === 'sources' && <SourcesTab data={data} />}
            {tab === 'funnel' && <FunnelTab data={data} />}
            {tab === 'products' && <ProductsTab data={data} />}
            {tab === 'search' && <SearchTab data={data} />}
            {tab === 'devices' && <DevicesTab data={data} />}
          </>
        )}
      </div>
    </>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab({ data }: { data: any }) {
  const k: KPIs = data.kpis || {};
  const p: PrevKPIs = data.previousPeriod || {};
  const daily: DailyRow[] = data.daily || [];

  const cards = [
    { label: 'Sesje', value: formatN(k.sessions), d: delta(k.sessions, p.sessions) },
    { label: 'Użytkownicy', value: formatN(k.users), d: delta(k.users, p.users) },
    { label: 'Nowi użytkownicy', value: formatN(k.newUsers), d: undefined },
    { label: 'Zakupy', value: formatN(k.purchases), d: delta(k.purchases, p.purchases) },
    { label: 'Przychód', value: formatPLN(k.revenue), d: delta(k.revenue, p.revenue) },
    { label: 'Konwersja', value: formatPct(k.conversionRate), d: undefined },
    { label: 'Odsłony', value: formatN(k.pageViews), d: undefined },
    { label: 'Śr. czas sesji', value: formatDuration(k.avgSessionDuration), d: undefined },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {cards.map((c, i) => (
          <KpiCard key={i} label={c.label} value={c.value} deltaInfo={c.d} />
        ))}
      </div>
      {daily.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Dzienny trend
          </div>
          <DailyChart data={daily} />
        </div>
      )}
    </div>
  );
}

// ─── Tab: Sources ─────────────────────────────────────────────────────────────
function SourcesTab({ data }: { data: any }) {
  const channels: ChannelRow[] = data.channels || [];
  const sourceMedium: SourceRow[] = data.sourceMedium || [];
  const campaigns: CampaignRow[] = data.campaigns || [];

  const allConvRates = channels.map(r => (r.sessions > 0 ? r.purchases / r.sessions : 0));
  const maxConv = Math.max(...allConvRates);
  const minConv = Math.min(...allConvRates.filter(v => v > 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Channels */}
      <div>
        <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Kanały</div>
        <div className="tr-scroll">
          <table className="tr-table">
            <thead>
              <tr>
                <Th>Kanał</Th>
                <Th right>Sesje</Th>
                <Th right>Użytkownicy</Th>
                <Th right>Nowi</Th>
                <Th right>Zakupy</Th>
                <Th right>Przychód</Th>
                <Th right>Wsk. konwersji</Th>
              </tr>
            </thead>
            <tbody>
              {channels.map((r, i) => {
                const cr = r.sessions > 0 ? r.purchases / r.sessions : 0;
                const crColor = cr === maxConv ? C.success : (cr === minConv && cr > 0) ? C.danger : undefined;
                return (
                  <tr key={i}>
                    <Td>{r.channel || '(inne)'}</Td>
                    <Td right>{formatN(r.sessions)}</Td>
                    <Td right>{formatN(r.users)}</Td>
                    <Td right>{formatN(r.newUsers)}</Td>
                    <Td right>{formatN(r.purchases)}</Td>
                    <Td right>{formatPLN(r.revenue)}</Td>
                    <Td right color={crColor}>{convRate(r.purchases, r.sessions)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source / Medium */}
      <div>
        <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Source / Medium</div>
        <div className="tr-scroll">
          <table className="tr-table">
            <thead>
              <tr>
                <Th>Source</Th>
                <Th>Medium</Th>
                <Th right>Sesje</Th>
                <Th right>Zakupy</Th>
                <Th right>Przychód</Th>
                <Th right>Wsk. konwersji</Th>
              </tr>
            </thead>
            <tbody>
              {sourceMedium.map((r, i) => (
                <tr key={i}>
                  <Td>{r.source || '(direct)'}</Td>
                  <Td color={C.muted}>{r.medium || '(none)'}</Td>
                  <Td right>{formatN(r.sessions)}</Td>
                  <Td right>{formatN(r.purchases)}</Td>
                  <Td right>{formatPLN(r.revenue)}</Td>
                  <Td right>{convRate(r.purchases, r.sessions)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaigns */}
      {campaigns.filter(c => c.campaign && c.campaign !== '(not set)').length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Kampanie</div>
          <div className="tr-scroll">
            <table className="tr-table">
              <thead>
                <tr>
                  <Th>Kampania</Th>
                  <Th right>Sesje</Th>
                  <Th right>Zakupy</Th>
                  <Th right>Przychód</Th>
                  <Th right>Wsk. konwersji</Th>
                </tr>
              </thead>
              <tbody>
                {campaigns.filter(c => c.campaign && c.campaign !== '(not set)').map((r, i) => (
                  <tr key={i}>
                    <Td>{r.campaign}</Td>
                    <Td right>{formatN(r.sessions)}</Td>
                    <Td right>{formatN(r.purchases)}</Td>
                    <Td right>{formatPLN(r.revenue)}</Td>
                    <Td right>{convRate(r.purchases, r.sessions)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Funnel ──────────────────────────────────────────────────────────────
function FunnelTab({ data }: { data: any }) {
  const rows: FunnelRow[] = data.funnel || [];
  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>E-commerce funnel</div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 16, fontStyle: 'italic' }}>Ścieżka od wyświetlenia strony do zakupu. Procent = konwersja z poprzedniego kroku.</div>
      {rows.length === 0
        ? <div style={{ color: C.muted, fontSize: 13 }}>Brak danych. Upewnij się że GA4 zbiera eventy e-commerce.</div>
        : <FunnelView rows={rows} />
      }
    </div>
  );
}

// ─── Tab: Products ────────────────────────────────────────────────────────────
function ProductsTab({ data }: { data: any }) {
  const products: ProductRow[] = data.products || [];

  if (!products.length) {
    return <div style={{ color: C.muted, fontSize: 13 }}>Brak danych stron produktowych.</div>;
  }

  const maxConv = Math.max(...products.map(p => p.pageViews > 0 ? p.purchases / p.pageViews : 0));
  const topConv = products.reduce((best, p) => {
    const cr = p.pageViews > 0 ? p.purchases / p.pageViews : 0;
    return cr > (best.pageViews > 0 ? best.purchases / best.pageViews : 0) ? p : best;
  }, products[0]);
  const zeroConv = products.filter(p => p.pageViews > 100 && p.purchases === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Insights */}
      <div style={{ display: 'flex', gap: 12 }}>
        {topConv && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.text, fontFamily: 'IBM Plex Mono, monospace' }}>
            Najwyższa konwersja:{' '}
            <span style={{ color: C.success }}>{topConv.path} ({convRate(topConv.purchases, topConv.pageViews)})</span>
          </div>
        )}
        {zeroConv.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.text, fontFamily: 'IBM Plex Mono, monospace' }}>
            Wysokie views bez zakupu:{' '}
            <span style={{ color: C.warning }}>{zeroConv[0].path} ({formatN(zeroConv[0].pageViews)} odsłon)</span>
          </div>
        )}
      </div>

      <div className="tr-scroll">
        <table className="tr-table">
          <thead>
            <tr>
              <Th>Strona</Th>
              <Th right>Odsłony</Th>
              <Th right>Zakupy</Th>
              <Th right>Przychód</Th>
              <Th right>Wsk. konwersji</Th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 50).map((r, i) => {
              const cr = r.pageViews > 0 ? r.purchases / r.pageViews : 0;
              const crColor = cr === maxConv && cr > 0 ? C.success : undefined;
              return (
                <tr key={i}>
                  <Td><span style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.path}</span></Td>
                  <Td right>{formatN(r.pageViews)}</Td>
                  <Td right>{formatN(r.purchases)}</Td>
                  <Td right>{formatPLN(r.revenue)}</Td>
                  <Td right color={crColor}>{convRate(r.purchases, r.pageViews)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Search ──────────────────────────────────────────────────────────────
function SearchTab({ data }: { data: any }) {
  const terms: SearchRow[] = (data.searchTerms || []).filter((r: SearchRow) => r.term && r.term !== '(not set)');
  const maxSessions = terms[0]?.sessions || 1;

  if (!terms.length) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, maxWidth: 480 }}>
        <div style={{ fontSize: 13, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.8 }}>
          Brak danych site search.<br />
          Upewnij się że GA4 zbiera event <span style={{ color: C.accent }}>'search'</span> lub{' '}
          <span style={{ color: C.accent }}>'view_search_results'</span>.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
        Wyszukiwania na stronie — top {Math.min(terms.length, 30)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 600 }}>
        {terms.slice(0, 30).map((r, i) => {
          const barPct = (r.sessions / maxSessions) * 100;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 160, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.term}
              </div>
              <div style={{ flex: 1, background: '#f0ece6', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                <div style={{ width: barPct + '%', height: '100%', background: C.accent + 'aa', borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ width: 48, textAlign: 'right', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: C.muted }}>
                {formatN(r.sessions)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Devices ─────────────────────────────────────────────────────────────
function DevicesTab({ data }: { data: any }) {
  const devices: DeviceRow[] = data.devices || [];
  const browsers: BrowserRow[] = data.browsers || [];
  const geo: GeoRow[] = data.geo || [];

  const totalSessions = devices.reduce((s, d) => s + d.sessions, 0) || 1;

  const DEVICE_LABELS: Record<string, string> = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Devices + Geo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Devices */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Urządzenia</div>
          {devices.map((d, i) => {
            const pct = Math.round((d.sessions / totalSessions) * 100);
            const cr = d.sessions > 0 ? (d.purchases / d.sessions * 100).toFixed(1) : '0.0';
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: C.text }}>
                    {DEVICE_LABELS[d.device] || d.device}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: C.muted }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ background: '#f0ece6', borderRadius: 4, height: 8 }}>
                  <div style={{ width: pct + '%', height: '100%', background: C.accent, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', marginTop: 3 }}>
                  {formatN(d.sessions)} sesji · conv. {cr}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Geo */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Top miasta</div>
          <div className="tr-scroll" style={{ border: 'none', borderRadius: 0 }}>
            <table className="tr-table">
              <thead>
                <tr>
                  <Th>Miasto</Th>
                  <Th right>Sesje</Th>
                  <Th right>Zakupy</Th>
                </tr>
              </thead>
              <tbody>
                {geo.slice(0, 15).map((r, i) => (
                  <tr key={i}>
                    <Td>{r.city || '(nieznane)'}</Td>
                    <Td right>{formatN(r.sessions)}</Td>
                    <Td right>{formatN(r.purchases)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Browsers */}
      {browsers.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Przeglądarki (top 10)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(() => {
              const total = browsers.reduce((s, b) => s + b.sessions, 0) || 1;
              return browsers.map((b, i) => {
                const pct = Math.round((b.sessions / total) * 100);
                return (
                  <div key={i} style={{ background: '#faf8f5', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: C.text }}>
                    {b.browser} <span style={{ color: C.muted }}>{pct}%</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
