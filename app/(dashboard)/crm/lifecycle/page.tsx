'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import DateRangePicker from '../components/DateRangePicker';

interface FunnelRow { stage: string; client_count: number; total_ltv: number; avg_ltv: number; avg_orders: number; }
interface MatrixRow { legacy_segment: string; risk_level: string; client_count: number; total_ltv: number; avg_ltv: number; avg_orders: number; }
interface LadderRow { bucket: string; clients: number; total_revenue: number; avg_aov: number; avg_ltv: number; }
interface WorldRow { world: string; client_count: number; total_ltv: number; avg_ltv: number; repeat_clients: number; repeat_rate: number; vip_count: number; lost_count: number; avg_orders: number; }
interface LifecycleData { funnel: FunnelRow[]; matrix: MatrixRow[]; ladder: LadderRow[]; worlds: WorldRow[]; }

function formatPLN(v: number) {
  if (!v) return '0 zł';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' mln zł';
  if (v >= 1_000) return Math.round(v / 1_000) + ' tys. zł';
  return Math.round(v) + ' zł';
}

function Skeleton() {
  const sk: React.CSSProperties = { background: 'linear-gradient(90deg,#e8e0d8 25%,#f0ece6 50%,#e8e0d8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderRadius: 8 };
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ height: 32, width: 300, ...sk, marginBottom: 24 }} />
      {[300, 280, 260, 260].map((h, i) => <div key={i} style={{ ...sk, height: h, marginBottom: 20 }} />)}
    </div>
  );
}

const STAGE_LABELS: Record<string, string> = {
  '1_new': 'New (1 zam.)', '2_returning': 'Returning (2-3)', '3_gold': 'Gold (4-7)',
  '4_platinum': 'Platinum (8-14)', '5_diamond': 'Diamond (15+)',
};
const STAGE_COLORS = ['#d4cfc7','#3577b3','#e6a817','#8b7355','#b8763a'];
const SEGMENTS = ['Diamond','Platinum','Gold','Returning','New'];
const RISKS = ['OK','Risk','HighRisk','Lost'];
const SEG_COLORS: Record<string,string> = { Diamond:'#b8763a', Platinum:'#8b7355', Gold:'#c9a84c', Returning:'#3577b3', New:'#999' };

function riskCellColor(risk: string, intensity: number): string {
  const i = intensity;
  if (risk === 'OK') return `rgba(45,138,78,${(0.06 + i * 0.22).toFixed(2)})`;
  if (risk === 'Risk') return `rgba(230,168,23,${(0.06 + i * 0.22).toFixed(2)})`;
  if (risk === 'HighRisk') return `rgba(221,68,68,${(0.06 + i * 0.22).toFixed(2)})`;
  return `rgba(0,0,0,${(0.03 + i * 0.10).toFixed(2)})`;
}

function FunnelSection({ funnel }: { funnel: FunnelRow[] }) {
  const sorted = [...funnel].sort((a,b) => a.stage.localeCompare(b.stage));
  const maxCount = Math.max(...sorted.map(s => s.client_count), 1);
  const totalClients = sorted.reduce((s,r)=>s+r.client_count, 0);

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Lifecycle funnel</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((row, i) => {
          const barW = Math.max((row.client_count / maxCount) * 100, 4);
          const pct = (row.client_count / totalClients * 100).toFixed(1);
          const next = sorted[i+1];
          const convert = next && row.client_count > 0 ? (next.client_count / row.client_count * 100).toFixed(1) : null;
          return (
            <div key={row.stage}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 140, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0, color: '#1a1a1a' }}>{STAGE_LABELS[row.stage]||row.stage}</div>
                <div style={{ flex: 1, background: '#f0ece6', borderRadius: 4, height: 28, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${barW}%`, background: STAGE_COLORS[i]||'#999', borderRadius: 4, minWidth: 20 }} />
                </div>
                <div style={{ minWidth: 70, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{row.client_count.toLocaleString('pl-PL')}</div>
                <div style={{ minWidth: 40, textAlign: 'right', fontSize: 11, color: '#6b6b6b' }}>{pct}%</div>
                <div style={{ minWidth: 90, textAlign: 'right', fontSize: 11, color: '#6b6b6b' }}>{formatPLN(row.avg_ltv)}</div>
                <div style={{ minWidth: 90, textAlign: 'right', fontSize: 11, color: '#b8763a' }}>{formatPLN(row.total_ltv)}</div>
              </div>
              {convert && <div style={{ fontSize: 10, color: '#999', paddingLeft: 148, marginTop: 1 }}>konwersja {convert}%</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatrixSection({ matrix }: { matrix: MatrixRow[] }) {
  const lookup: Record<string,MatrixRow> = {};
  matrix.forEach(r => { lookup[`${r.legacy_segment}_${r.risk_level}`] = r; });
  const maxLtv = Math.max(...matrix.map(r=>r.total_ltv), 1);

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Segment x Risk matrix</div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 11, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Segment</th>
            {RISKS.map(r => <th key={r} style={{ textAlign: 'center', padding: '4px 8px', fontSize: 11, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>{r}</th>)}
          </tr>
        </thead>
        <tbody>
          {SEGMENTS.map(seg => (
            <tr key={seg}>
              <td style={{ padding: '4px 8px', fontWeight: 700, color: SEG_COLORS[seg]||'#999', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', background: (SEG_COLORS[seg]||'#999')+'18' }}>
                <span style={{ background: SEG_COLORS[seg]||'#999', color:'#fff', padding:'2px 8px', borderRadius:4, fontSize:11 }}>{seg}</span>
              </td>
              {RISKS.map(risk => {
                const cell = lookup[`${seg}_${risk}`];
                const intensity = cell ? Math.min(1, cell.total_ltv / maxLtv) : 0;
                const bg = cell ? riskCellColor(risk, intensity) : 'transparent';
                return (
                  <td key={risk}
                    onClick={() => { if (cell) window.location.href=`/crm/clients?segment=${seg}&risk=${risk}`; }}
                    style={{ padding: '6px 8px', textAlign: 'center', background: bg, cursor: cell?'pointer':'default', borderRadius: 4 }}
                    title={cell ? `${seg}/${risk}: ${cell.client_count} klientów` : ''}>
                    {cell ? (
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{cell.client_count.toLocaleString('pl-PL')}</div>
                        <div style={{ fontSize: 10, color: '#333' }}>{formatPLN(cell.total_ltv)}</div>
                        <div style={{ fontSize: 9, color: '#6b6b6b' }}>avg {formatPLN(cell.avg_ltv)}</div>
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

const LADDER_ORDER = ['1','2','3','4-5','6-9','10-14','15+'];
const LADDER_COLORS = ['#d4cfc7','#d4cfc7','#3577b3','#3577b3','#e6a817','#8b7355','#b8763a'];

function RepeatLadder({ ladder }: { ladder: LadderRow[] }) {
  const sorted = [...ladder].sort((a,b) => LADDER_ORDER.indexOf(a.bucket) - LADDER_ORDER.indexOf(b.bucket));
  const maxClients = Math.max(...sorted.map(r => r.clients), 1);
  const maxAov = Math.max(...sorted.map(r => r.avg_aov), 1);

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Repeat ladder</div>
      <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 16 }}>Rozkład klientów wg liczby zamówień + avg AOV</div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e8e0d8' }}>
            {['Zamówienia','Klienci','Rozkład','Avg AOV','Total LTV'].map(h => (
              <th key={h} style={{ padding: '6px 8px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h==='Zamówienia'?'left':'right' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.bucket} style={{ borderBottom: '1px solid #f0ece6' }}>
              <td style={{ padding: '8px 8px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: LADDER_COLORS[i]||'#999' }}>{row.bucket}</td>
              <td style={{ padding: '8px 8px', textAlign: 'right' }}>{row.clients.toLocaleString('pl-PL')}</td>
              <td style={{ padding: '8px 8px', width: 120 }}>
                <div style={{ flex: 1, background: '#f0ece6', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(row.clients/maxClients)*100}%`, background: LADDER_COLORS[i]||'#999', borderRadius: 3 }} />
                </div>
              </td>
              <td style={{ padding: '8px 8px', textAlign: 'right', color: row.avg_aov === maxAov ? '#2d8a4e' : '#1a1a1a', fontWeight: row.avg_aov === maxAov ? 700 : 400 }}>{formatPLN(row.avg_aov)}</td>
              <td style={{ padding: '8px 8px', textAlign: 'right', color: '#b8763a' }}>{formatPLN(row.total_revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorldsBreakdown({ worlds }: { worlds: WorldRow[] }) {
  const maxLtv = Math.max(...worlds.map(w => w.total_ltv), 1);
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Worlds breakdown</div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e8e0d8' }}>
            {['World','Klienci','Revenue','Repeat%','Avg LTV','VIP','Lost'].map(h => (
              <th key={h} style={{ padding: '6px 8px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h==='World'?'left':'right' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {worlds.map(w => (
            <tr key={w.world}
              onClick={() => window.location.href=`/crm/clients?world=${encodeURIComponent(w.world)}`}
              style={{ borderBottom: '1px solid #f0ece6', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#faf8f5'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
              <td style={{ padding: '8px', fontSize: 13, fontWeight: 600 }}>{w.world}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{w.client_count.toLocaleString('pl-PL')}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <div style={{ width: 50, height: 5, background: '#e8e0d8', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${w.total_ltv/maxLtv*100}%`, background: '#b8763a', borderRadius: 3 }} />
                  </div>
                  <span>{formatPLN(w.total_ltv)}</span>
                </div>
              </td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, color: w.repeat_rate >= 20 ? '#2d8a4e' : '#1a1a1a' }}>{w.repeat_rate}%</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }}>{formatPLN(w.avg_ltv)}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, color: '#b8763a' }}>{w.vip_count}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontSize: 12, color: '#dd4444' }}>{w.lost_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LifecyclePage() {
  const [data, setData] = useState<LifecycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '', label: 'Cała historia' });

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (dateRange.from) params.set('date_from', dateRange.from);
    if (dateRange.to) params.set('date_to', dateRange.to);
    fetch(`/api/crm/lifecycle?${params}`)
      .then(r => r.json())
      .then((d: LifecycleData & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setData(d); setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [dateRange]);

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

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', margin: 0, marginBottom: 6 }}>Lifecycle &amp; Segmenty</h1>
        <div style={{ fontSize: 13, color: '#6b6b6b' }}>Struktura bazy klientów i przepływy między etapami</div>
      </div>
      <DateRangePicker onChange={setDateRange} defaultPreset="Cała historia" />
      <FunnelSection funnel={data.funnel} />
      <div style={{ marginTop: 20 }}><MatrixSection matrix={data.matrix} /></div>
      <div style={{ marginTop: 20 }}><RepeatLadder ladder={data.ladder} /></div>
      <div style={{ marginTop: 20 }}><WorldsBreakdown worlds={data.worlds} /></div>
    </div>
  );
}
