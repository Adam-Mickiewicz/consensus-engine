'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DateRangePicker from '../components/DateRangePicker';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RetentionRow { cohort_month: string; cohort_size: number; months_after: number; active_clients: number; retention_pct: number; }
interface TimeToSecondRow { bucket: string; client_count: number; avg_days: number; median_days: number; }
interface ContextRow { context_type: string; context_group: string; cohort_size: number; repeat_clients: number; repeat_rate: number; avg_ltv: number; avg_orders: number; }
interface CohortData { retention: RetentionRow[]; timeToSecond: TimeToSecondRow[]; byContext: ContextRow[]; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPLN(v: number) {
  if (!v) return '0 zł';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' mln zł';
  if (v >= 1_000) return Math.round(v / 1_000) + ' tys. zł';
  return Math.round(v) + ' zł';
}
function fmtMonth(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { year: 'numeric', month: 'short' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  const sk: React.CSSProperties = { background: 'linear-gradient(90deg,#e8e0d8 25%,#f0ece6 50%,#e8e0d8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderRadius: 8 };
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ height: 32, width: 300, ...sk, marginBottom: 24 }} />
      <div style={{ ...sk, height: 400, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ ...sk, height: 300 }} />
        <div style={{ ...sk, height: 300 }} />
      </div>
    </div>
  );
}

// ─── Retention Heatmap ────────────────────────────────────────────────────────
function RetentionHeatmap({ retention }: { retention: RetentionRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const map = new Map<string, Map<number, number>>();
  const sizes = new Map<string, number>();
  for (const r of retention) {
    if (!map.has(r.cohort_month)) map.set(r.cohort_month, new Map());
    map.get(r.cohort_month)!.set(r.months_after, r.retention_pct);
    sizes.set(r.cohort_month, r.cohort_size);
  }

  const allMonths = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
  const visibleMonths = showAll ? allMonths : allMonths.slice(0, 18);

  function cellBg(pct: number | undefined): string {
    if (pct == null) return 'transparent';
    const intensity = Math.min(pct / 12, 1);
    if (pct >= 8) return `rgba(45,138,78,${0.08 + intensity * 0.4})`;
    if (pct >= 4) return `rgba(230,168,23,${0.08 + intensity * 0.4})`;
    return `rgba(221,68,68,${0.06 + intensity * 0.3})`;
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Heatmapa retencji kohort</div>
      <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 4 }}>% klientów z kohorty którzy wrócili w danym miesiącu · zielony &gt; 8% · żółty 4-8% · czerwony &lt; 4%</div>
      <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 16, fontStyle: 'italic' }}>Wiersz = miesiąc pierwszego zakupu. Komórka = % klientów z kohorty, którzy kupili ponownie w miesiącu M+N.</div>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 700 }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 10px', textAlign: 'left', color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Kohorta</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rozmiar</th>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <th key={m} style={{ padding: '4px 6px', textAlign: 'center', color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, minWidth: 44 }}>M+{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleMonths.map(month => {
            const monthMap = map.get(month)!;
            const size = sizes.get(month) || 0;
            const isHighlighted = highlight === month;
            return (
              <tr
                key={month}
                onClick={() => setHighlight(isHighlighted ? null : month)}
                style={{ cursor: 'pointer', background: isHighlighted ? 'rgba(184,118,58,0.06)' : 'transparent' }}
              >
                <td style={{ padding: '5px 10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', borderBottom: '1px solid #f0ece6' }}>{fmtMonth(month)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#6b6b6b', fontSize: 11, borderBottom: '1px solid #f0ece6' }}>{size.toLocaleString('pl-PL')}</td>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                  const pct = monthMap.get(m);
                  return (
                    <td key={m} style={{ padding: '5px 4px', textAlign: 'center', background: cellBg(pct), borderRadius: 4, fontSize: 11, color: pct != null ? '#1a1a1a' : '#ccc', borderBottom: '1px solid #f0ece6', fontWeight: pct && pct >= 8 ? 700 : 400 }}>
                      {pct != null ? pct + '%' : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {allMonths.length > 18 && (
        <button onClick={() => setShowAll(s => !s)} style={{ marginTop: 12, padding: '6px 16px', background: 'none', border: '1px solid #e8e0d8', borderRadius: 4, fontSize: 12, color: '#6b6b6b', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>
          {showAll ? 'Pokaż mniej' : `Pokaż wszystkie (${allMonths.length} kohort)`}
        </button>
      )}
    </div>
  );
}

// ─── Time to 2nd Order ────────────────────────────────────────────────────────
const BUCKET_COLORS = ['#2d8a4e','#3577b3','#e6a817','#b8763a','#d44','#8b5544','#999'];
const BUCKET_ORDER = ['0-7d','8-14d','15-30d','31-60d','61-90d','91-180d','181-365d','365d+'];

function TimeToSecond({ data }: { data: TimeToSecondRow[] }) {
  const sorted = [...data].sort((a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket));
  const maxCount = Math.max(...sorted.map(r => r.client_count), 1);
  const totalClients = sorted.reduce((s, r) => s + r.client_count, 0);
  const median = sorted.find(r => r.median_days)?.median_days || null;

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Czas do 2. zamówienia</div>
      <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 16 }}>Rozkład dla klientów z &ge;2 zamówieniami</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((row, i) => {
          const pct = totalClients > 0 ? (row.client_count / totalClients * 100).toFixed(1) : '0';
          const barW = (row.client_count / maxCount * 100);
          return (
            <div key={row.bucket} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 64, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', flexShrink: 0 }}>{row.bucket}</div>
              <div style={{ flex: 1, background: '#f0ece6', borderRadius: 4, height: 22, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barW}%`, background: BUCKET_COLORS[i] || '#999', borderRadius: 4, minWidth: 4, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  {barW > 20 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.client_count.toLocaleString('pl-PL')}</span>}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#6b6b6b', minWidth: 48, textAlign: 'right' }}>{pct}%</div>
            </div>
          );
        })}
      </div>
      {median != null && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(184,118,58,0.08)', borderRadius: 6, border: '1px solid #e8e0d8' }}>
          <span style={{ fontSize: 12, color: '#6b6b6b' }}>Mediana: </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#b8763a', fontFamily: 'IBM Plex Mono, monospace' }}>{median} dni</span>
        </div>
      )}
    </div>
  );
}

// ─── Cohorts by Context ───────────────────────────────────────────────────────
function ContextTable({ data }: { data: ContextRow[] }) {
  const promoData = data.filter(r => r.context_group === 'promo_vs_fullprice');
  const seasonData = data.filter(r => r.context_group === 'by_season').sort((a, b) => b.repeat_rate - a.repeat_rate);
  const maxRepeatPromo = Math.max(...promoData.map(r => r.repeat_rate), 0);
  const maxRepeatSeason = Math.max(...seasonData.map(r => r.repeat_rate), 0);

  const thStyle: React.CSSProperties = { padding: '6px 8px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', fontWeight: 600, borderBottom: '2px solid #e8e0d8' };
  const tdStyle: React.CSSProperties = { padding: '7px 8px', fontSize: 12, color: '#1a1a1a', textAlign: 'right', borderBottom: '1px solid #f0ece6' };

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Jakość kohort wg kontekstu</div>

      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'IBM Plex Mono, monospace' }}>Promo vs Full price</div>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 20 }}>
        <thead><tr>
          <th style={{ ...thStyle, textAlign: 'left' }}>Kontekst</th>
          <th style={thStyle}>Klientów</th>
          <th style={thStyle}>Repeat rate</th>
          <th style={thStyle}>Avg LTV</th>
        </tr></thead>
        <tbody>
          {promoData.map(r => (
            <tr key={r.context_type}>
              <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{r.context_type}</td>
              <td style={tdStyle}>{r.cohort_size.toLocaleString('pl-PL')}</td>
              <td style={{ ...tdStyle, background: r.repeat_rate === maxRepeatPromo ? 'rgba(45,138,78,0.08)' : 'transparent', fontWeight: r.repeat_rate === maxRepeatPromo ? 700 : 400, color: r.repeat_rate === maxRepeatPromo ? '#2d8a4e' : '#1a1a1a' }}>{r.repeat_rate}%</td>
              <td style={tdStyle}>{formatPLN(r.avg_ltv)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'IBM Plex Mono, monospace' }}>Wg okazji pierwszego zakupu</div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead><tr>
          <th style={{ ...thStyle, textAlign: 'left' }}>Okazja</th>
          <th style={thStyle}>Klientów</th>
          <th style={thStyle}>Repeat rate</th>
          <th style={thStyle}>Avg LTV</th>
        </tr></thead>
        <tbody>
          {seasonData.map(r => (
            <tr key={r.context_type}>
              <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{r.context_type}</td>
              <td style={tdStyle}>{r.cohort_size.toLocaleString('pl-PL')}</td>
              <td style={{ ...tdStyle, background: r.repeat_rate === maxRepeatSeason ? 'rgba(45,138,78,0.08)' : 'transparent', fontWeight: r.repeat_rate === maxRepeatSeason ? 700 : 400, color: r.repeat_rate === maxRepeatSeason ? '#2d8a4e' : '#1a1a1a' }}>{r.repeat_rate}%</td>
              <td style={tdStyle}>{formatPLN(r.avg_ltv)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Key Insights ─────────────────────────────────────────────────────────────
function generateInsights(retention: RetentionRow[], timeToSecond: TimeToSecondRow[], byContext: ContextRow[]) {
  const insights: { type: string; text: string }[] = [];

  const m1rows = retention.filter(r => r.months_after === 1);
  if (m1rows.length > 1) {
    const best = [...m1rows].sort((a, b) => b.retention_pct - a.retention_pct)[0];
    const worst = [...m1rows].sort((a, b) => a.retention_pct - b.retention_pct)[0];
    insights.push({ type: 'success', text: `Najlepsza retencja M+1: kohorta ${fmtMonth(best.cohort_month)} — ${best.retention_pct}%` });
    if (worst.retention_pct < best.retention_pct * 0.5) {
      insights.push({ type: 'warning', text: `Najsłabsza retencja M+1: kohorta ${fmtMonth(worst.cohort_month)} — zaledwie ${worst.retention_pct}%` });
    }
  }

  const medianRow = timeToSecond.find(r => r.median_days);
  if (medianRow) {
    insights.push({ type: 'info', text: `Mediana czasu do 2. zamówienia: ${medianRow.median_days} dni. ${medianRow.median_days > 60 ? 'Rozważ kampanię retencyjną w dniu 30-45.' : 'Dobry wynik — klienci wracają szybko.'}` });
  }

  const promoRow = byContext.find(r => r.context_group === 'promo_vs_fullprice' && r.context_type === 'Promo');
  const fullRow = byContext.find(r => r.context_group === 'promo_vs_fullprice' && r.context_type === 'Full price');
  if (promoRow && fullRow) {
    const diff = (fullRow.repeat_rate - promoRow.repeat_rate).toFixed(1);
    const isFullBetter = fullRow.repeat_rate > promoRow.repeat_rate;
    insights.push({
      type: isFullBetter ? 'warning' : 'success',
      text: `Klienci pozyskani w promo mają ${isFullBetter ? `${diff}% niższy` : `${Math.abs(parseFloat(diff))}% wyższy`} repeat rate (${promoRow.repeat_rate}%) vs full price (${fullRow.repeat_rate}%)`
    });
  }

  return insights;
}

const INSIGHT_COLORS: Record<string, string> = { success: '#2d8a4e', warning: '#e6a817', info: '#3577b3', danger: '#dd4444' };
const INSIGHT_BG: Record<string, string> = { success: 'rgba(45,138,78,0.04)', warning: 'rgba(230,168,23,0.04)', info: 'rgba(53,119,179,0.04)', danger: 'rgba(221,68,68,0.04)' };

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CohortsPage() {
  const [data, setData] = useState<CohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date().toISOString().split('T')[0];
    return { from: '2017-01-01', to, label: 'Cała historia' };
  });

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetch('/api/crm/cohorts')
      .then(r => r.json())
      .then((d: CohortData & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setData(d); setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton />;
  if (error || !data) return (
    <div style={{ padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 32, textAlign: 'center' }}>
        <div style={{ color: '#dd4444', marginBottom: 12 }}>Blad: {error}</div>
        <button onClick={load} style={{ padding: '8px 20px', background: '#b8763a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>Spróbuj ponownie</button>
      </div>
    </div>
  );

  const filteredCohorts = useMemo(() => {
    if (!data?.retention || !dateRange.from) return data?.retention || [];
    return data.retention.filter(r => r.cohort_month >= dateRange.from && r.cohort_month <= dateRange.to);
  }, [data?.retention, dateRange.from, dateRange.to]);

  const insights = generateInsights(filteredCohorts, data.timeToSecond, data.byContext);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', margin: 0, marginBottom: 6 }}>Kohorty &amp; Retencja</h1>
        <div style={{ fontSize: 13, color: '#6b6b6b' }}>Analiza jakości pozyskiwanych klientów i retencji w czasie</div>
      </div>

      <DateRangePicker onChange={setDateRange} defaultPreset="Cała historia" />

      <RetentionHeatmap retention={filteredCohorts} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <TimeToSecond data={data.timeToSecond} />
        <ContextTable data={data.byContext} />
      </div>

      {insights.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 10 }}>Kluczowe obserwacje</div>
          {insights.map((ins, i) => (
            <div key={i} style={{ borderLeft: `4px solid ${INSIGHT_COLORS[ins.type]}`, background: INSIGHT_BG[ins.type], padding: '12px 16px', marginBottom: 8, borderRadius: '0 4px 4px 0', fontSize: 13, color: '#1a1a1a' }}>
              {ins.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
