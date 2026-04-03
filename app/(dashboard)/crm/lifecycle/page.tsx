'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import DateRangePicker from '../components/DateRangePicker';

interface FunnelRow { stage: string; client_count: number; total_ltv: number; avg_ltv: number; avg_orders: number; }
interface MatrixRow { legacy_segment: string; risk_level: string; client_count: number; total_ltv: number; avg_ltv: number; avg_orders: number; }
interface LadderRow { bucket: string; clients: number; total_revenue: number; avg_aov: number; avg_ltv: number; }
interface WorldRow { world: string; client_count: number; total_ltv: number; avg_ltv: number; repeat_clients: number; repeat_rate: number; vip_count: number; lost_count: number; avg_orders: number; }
interface LifecycleData { funnel: FunnelRow[]; matrix: MatrixRow[]; ladder: LadderRow[]; worlds: WorldRow[]; }
interface MigrationRow { from_segment: string; to_segment: string; client_count: number; total_ltv: number; }

// ─── RFM types ─────────────────────────────────────────────────────────────────
interface RfmDistRow {
  rfm_segment: string; client_count: number; total_ltv: number; avg_ltv: number;
  avg_orders: number; avg_recency: number; avg_probability: number; total_predicted_ltv: number;
}
interface RfmData {
  distribution: RfmDistRow[];
  heatmap: Record<string, number>;
  predictive: { total_predicted_ltv: number; avg_predicted_ltv: number; high_prob_count: number; prob_buckets: Record<string, number>; };
}

// ─── Journey types ─────────────────────────────────────────────────────────────
interface JourneyRow { order_number: number; product_group: string; world: string; client_count: number; item_count: number; }
interface TransitionRow { from_group: string; from_order: number; to_group: string; to_order: number; transition_count: number; avg_days_between: number; avg_order_value: number; }
interface JourneyData { journey: JourneyRow[]; transitions: TransitionRow[]; }

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

const RFM_SEGMENT_COLORS: Record<string, string> = {
  Champions: '#2d8a4e', Loyal: '#3577b3', 'Potential Loyal': '#b8763a',
  Recent: '#e6a817', Promising: '#e6a817', 'Need Attention': '#e6a817',
  'About to Sleep': '#dd4444', 'At Risk': '#dd4444', 'Cant Lose': '#dd4444',
  Lost: '#999', Hibernating: '#999', Other: '#ccc',
};

function riskCellColor(risk: string, intensity: number): string {
  const i = intensity;
  if (risk === 'OK') return `rgba(45,138,78,${(0.06 + i * 0.22).toFixed(2)})`;
  if (risk === 'Risk') return `rgba(230,168,23,${(0.06 + i * 0.22).toFixed(2)})`;
  if (risk === 'HighRisk') return `rgba(221,68,68,${(0.06 + i * 0.22).toFixed(2)})`;
  return `rgba(0,0,0,${(0.03 + i * 0.10).toFixed(2)})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle sections (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function FunnelSection({ funnel }: { funnel: FunnelRow[] }) {
  const sorted = [...funnel].sort((a,b) => a.stage.localeCompare(b.stage));
  const maxCount = Math.max(...sorted.map(s => s.client_count), 1);
  const totalClients = sorted.reduce((s,r)=>s+r.client_count, 0);
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Lejek lifecycle</div>
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
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Drabina powrotu</div>
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
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Podział wg domen</div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e8e0d8' }}>
            {['Domena','Klienci','Przychód','Wsk. powrotu','Śr. LTV','VIP','Utraceni'].map(h => (
              <th key={h} style={{ padding: '6px 8px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h==='Domena'?'left':'right' }}>{h}</th>
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

const MIGRATION_SEGMENTS = ['New', 'Returning', 'Gold', 'Platinum', 'Diamond'];

function migrationCellBg(fi: number, ti: number, count: number, maxCount: number): string {
  if (count === 0) return 'transparent';
  const intensity = Math.min(0.15 + (count / maxCount) * 0.45, 0.6);
  if (fi === ti) return `rgba(0,0,0,0.04)`;
  if (ti > fi) return `rgba(45,138,78,${intensity.toFixed(2)})`;
  return `rgba(221,68,68,${intensity.toFixed(2)})`;
}

function generateMigrationInsights(migration: MigrationRow[]): string[] {
  const insights: string[] = [];
  const upgrades = migration.filter(m => {
    const fi = MIGRATION_SEGMENTS.indexOf(m.from_segment);
    const ti = MIGRATION_SEGMENTS.indexOf(m.to_segment);
    return ti > fi && m.client_count > 0;
  }).sort((a, b) => b.client_count - a.client_count);
  const downgrades = migration.filter(m => {
    const fi = MIGRATION_SEGMENTS.indexOf(m.from_segment);
    const ti = MIGRATION_SEGMENTS.indexOf(m.to_segment);
    return ti < fi && m.client_count > 0;
  }).sort((a, b) => b.client_count - a.client_count);
  if (upgrades[0]) insights.push(`${upgrades[0].client_count.toLocaleString('pl-PL')} klientów ${upgrades[0].from_segment} → ${upgrades[0].to_segment} (awans)`);
  if (downgrades[0]) insights.push(`${downgrades[0].client_count.toLocaleString('pl-PL')} klientów ${downgrades[0].from_segment} → ${downgrades[0].to_segment} (degradacja)`);
  const diamondStay = migration.find(m => m.from_segment === 'Diamond' && m.to_segment === 'Diamond');
  const diamondTotal = migration.filter(m => m.from_segment === 'Diamond').reduce((s, m) => s + m.client_count, 0);
  if (diamondStay && diamondTotal > 0) {
    const retPct = (diamondStay.client_count / diamondTotal * 100).toFixed(1);
    insights.push(`${diamondStay.client_count} z ${diamondTotal} Diamond utrzymało segment (${retPct}% retencja)`);
  }
  return insights;
}

function SegmentMigrationSection() {
  const [migData, setMigData] = useState<{ migration: MigrationRow[] | null; fromDate: string; toDate: string; availableDates: string[]; message?: string } | null>(null);
  const [migLoading, setMigLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadMigration = useCallback((fd?: string, td?: string) => {
    setMigLoading(true);
    const params = new URLSearchParams();
    if (fd) params.set('from_date', fd);
    if (td) params.set('to_date', td);
    fetch(`/api/crm/segment-migration?${params}`)
      .then(r => r.json())
      .then(d => { setMigData(d); setMigLoading(false); })
      .catch(() => setMigLoading(false));
  }, []);

  useEffect(() => { loadMigration(); }, [loadMigration]);

  const migration = migData?.migration || [];
  const maxCount = Math.max(...migration.map(m => m.client_count), 1);
  const insights = migration.length > 0 ? generateMigrationInsights(migration) : [];

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>Migracja segmentów</div>
        <div style={{ fontSize: 12, color: '#6b6b6b' }}>Jak klienci przemieszczają się między segmentami</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace' }}>Od:</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e8e0d8', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace' }}>Do:</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e8e0d8', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', background: '#fff' }} />
        </div>
        <button onClick={() => loadMigration(fromDate || undefined, toDate || undefined)}
          style={{ padding: '5px 12px', fontSize: 12, border: 'none', borderRadius: 4, cursor: 'pointer', background: '#b8763a', color: '#fff', fontFamily: 'IBM Plex Mono, monospace' }}>
          Zastosuj
        </button>
        {migData?.availableDates?.length > 0 && (
          <span style={{ fontSize: 11, color: '#999' }}>
            Snapshoty: {migData.availableDates.slice(0, 5).join(', ')}{migData.availableDates.length > 5 ? '…' : ''}
          </span>
        )}
      </div>
      {migLoading ? (
        <div style={{ background: 'linear-gradient(90deg,#e8e0d8 25%,#f0ece6 50%,#e8e0d8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderRadius: 8, height: 220 }} />
      ) : !migData?.migration ? (
        <div style={{ background: '#faf8f5', border: '1px solid #e8e0d8', borderRadius: 8, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Brak danych do porównania</div>
          <div style={{ fontSize: 12, color: '#6b6b6b', maxWidth: 440, margin: '0 auto' }}>
            {migData?.message || 'Wymaga codziennych snapshotów.'}
          </div>
        </div>
      ) : (
        <>
          {migData.fromDate && <div style={{ fontSize: 11, color: '#6b6b6b', marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>Porównanie: {migData.fromDate} → {migData.toDate}</div>}
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 420 }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>OD \ DO</th>
                  {MIGRATION_SEGMENTS.map(s => <th key={s} style={{ padding: '6px 10px', textAlign: 'center', fontSize: 11, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {MIGRATION_SEGMENTS.map((from, fi) => (
                  <tr key={from}>
                    <td style={{ padding: '6px 10px', fontWeight: 700, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', whiteSpace: 'nowrap' }}>{from}</td>
                    {MIGRATION_SEGMENTS.map((to, ti) => {
                      const entry = migration.find(m => m.from_segment === from && m.to_segment === to);
                      const count = entry?.client_count || 0;
                      return (
                        <td key={to} style={{ padding: '6px 10px', textAlign: 'center', background: migrationCellBg(fi, ti, count, maxCount), borderRadius: 4, fontSize: 12 }}>
                          {count > 0 ? <span style={{ fontWeight: fi === ti ? 600 : 400, color: '#1a1a1a' }}>{count.toLocaleString('pl-PL')}</span> : <span style={{ color: '#ccc' }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#6b6b6b', marginBottom: 16 }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(45,138,78,0.4)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />Awans</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(221,68,68,0.4)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />Degradacja</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(0,0,0,0.07)', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />Bez zmian</span>
          </div>
          {insights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {insights.map((ins, i) => (
                <div key={i} style={{ fontSize: 12, color: '#1a1a1a', padding: '8px 12px', background: '#faf8f5', borderRadius: 4, borderLeft: '3px solid #e8e0d8' }}>{ins}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RFM Tab
// ─────────────────────────────────────────────────────────────────────────────

function RfmBadge({ segment }: { segment: string }) {
  const color = RFM_SEGMENT_COLORS[segment] || '#999';
  const isBorder = ['Cant Lose', 'At Risk', 'About to Sleep'].includes(segment);
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
      background: isBorder ? '#fff' : color + '22',
      color: color,
      border: isBorder ? `1px solid ${color}` : `1px solid ${color}44`,
      fontFamily: 'IBM Plex Mono, monospace',
    }}>{segment}</span>
  );
}

function RfmTab() {
  const [data, setData] = useState<RfmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/rfm')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <Skeleton />;
  if (error || !data) return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 24, textAlign: 'center', color: '#dd4444' }}>
      Błąd: {error || 'Brak danych RFM — uruchom recalculate_rfm_scores()'}
    </div>
  );

  if (data.distribution.length === 0) return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Brak danych RFM</div>
      <div style={{ fontSize: 12, color: '#6b6b6b' }}>Uruchom <code>SELECT recalculate_rfm_scores()</code> w Supabase SQL Editor</div>
    </div>
  );

  // Build heatmap data
  const maxHeatCount = Math.max(...Object.values(data.heatmap), 1);
  const dist = data.distribution;
  const pred = data.predictive;
  const probBuckets = pred?.prob_buckets || {};
  const maxBucket = Math.max(...Object.values(probBuckets), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Segment table */}
      <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Scoring RFM — segmenty</div>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e8e0d8' }}>
              {['Segment','Klienci','Total LTV','Śr. LTV','Śr. zamówień','Śr. recency','Prawdop. 30d','Prognoza LTV 12m'].map(h => (
                <th key={h} style={{ padding: '6px 10px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h==='Segment'?'left':'right' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dist.map(row => (
              <tr key={row.rfm_segment}
                onClick={() => window.location.href=`/crm/clients?rfm_segment=${encodeURIComponent(row.rfm_segment)}`}
                style={{ borderBottom: '1px solid #f0ece6', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#faf8f5'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                <td style={{ padding: '8px 10px' }}><RfmBadge segment={row.rfm_segment} /></td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{row.client_count.toLocaleString('pl-PL')}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b8763a' }}>{formatPLN(row.total_ltv)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatPLN(row.avg_ltv)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.avg_orders).toFixed(1)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: Number(row.avg_recency) > 365 ? '#dd4444' : Number(row.avg_recency) > 90 ? '#e6a817' : '#2d8a4e' }}>{Math.round(Number(row.avg_recency))}d</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.avg_probability).toFixed(1)}%</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#3577b3' }}>{formatPLN(row.total_predicted_ltv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Heatmap + Predictive side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* RFM Heatmap */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Heatmapa RFM — R × F</div>
          <div style={{ fontSize: 11, color: '#6b6b6b', marginBottom: 16 }}>Kliknij komórkę → filtruj listę klientów</div>
          <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 6px', color: '#6b6b6b', textAlign: 'left', fontFamily: 'IBM Plex Mono, monospace' }}>R\F</th>
                {[1,2,3,4,5].map(f => (
                  <th key={f} style={{ padding: '4px 8px', textAlign: 'center', color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>F={f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[5,4,3,2,1].map(r => (
                <tr key={r}>
                  <td style={{ padding: '4px 6px', fontFamily: 'IBM Plex Mono, monospace', color: '#6b6b6b', fontSize: 10, whiteSpace: 'nowrap' }}>
                    R={r} <span style={{ color: '#ccc', fontSize: 9 }}>{r === 5 ? '(niedawno)' : r === 1 ? '(dawno)' : ''}</span>
                  </td>
                  {[1,2,3,4,5].map(f => {
                    const count = data.heatmap[`${r}_${f}`] || 0;
                    const intensity = count / maxHeatCount;
                    return (
                      <td key={f}
                        onClick={() => window.location.href=`/crm/clients?rfm_r=${r}&rfm_f=${f}`}
                        title={`R=${r}, F=${f}: ${count.toLocaleString('pl-PL')} klientów`}
                        style={{
                          padding: '6px 8px', textAlign: 'center', cursor: count > 0 ? 'pointer' : 'default',
                          background: count > 0 ? `rgba(184,118,58,${(intensity * 0.6 + 0.05).toFixed(2)})` : '#f9f7f4',
                          borderRadius: 4, fontSize: 11, fontWeight: count > 100 ? 700 : 400,
                          minWidth: 50,
                        }}>
                        {count > 0 ? count.toLocaleString('pl-PL') : <span style={{ color: '#ddd' }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 10, color: '#6b6b6b' }}>
            <span>F=1 Rzadko → F=5 Często</span>
            <span>·</span>
            <span>R=5 Niedawno → R=1 Dawno</span>
          </div>
        </div>

        {/* Predictive overview */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace' }}>Przegląd predykcji</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Pred. revenue 12m', value: formatPLN(pred?.total_predicted_ltv || 0), color: '#b8763a' },
              { label: 'Avg pred. LTV 12m', value: formatPLN(pred?.avg_predicted_ltv || 0), color: '#3577b3' },
              { label: 'Prob > 50% (30d)', value: (pred?.high_prob_count || 0).toLocaleString('pl-PL'), color: '#2d8a4e' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: '#faf8f5', border: '1px solid #e8e0d8', borderRadius: 6, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: kpi.color, fontFamily: 'IBM Plex Mono, monospace' }}>{kpi.value}</div>
                <div style={{ fontSize: 10, color: '#6b6b6b', marginTop: 4 }}>{kpi.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 10, fontFamily: 'IBM Plex Mono, monospace' }}>Prob. zakupu 30d — rozkład</div>
          {Object.entries(probBuckets).map(([bucket, count]) => (
            <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 60, fontSize: 11, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{bucket}%</div>
              <div style={{ flex: 1, background: '#f0ece6', borderRadius: 3, height: 16, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / maxBucket) * 100}%`, background: '#b8763a', borderRadius: 3 }} />
              </div>
              <div style={{ minWidth: 60, textAlign: 'right', fontSize: 11, color: '#6b6b6b' }}>{count.toLocaleString('pl-PL')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Journey Tab
// ─────────────────────────────────────────────────────────────────────────────

function JourneyTab() {
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transFilter, setTransFilter] = useState<number>(1);

  useEffect(() => {
    fetch('/api/crm/journey')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <Skeleton />;
  if (error || !data) return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 24, color: '#dd4444', textAlign: 'center' }}>
      Błąd: {error || 'Brak danych journey'}
    </div>
  );

  // Journey flow: group by order_number, top 5 per step
  const journeyByStep: Record<number, JourneyRow[]> = {};
  data.journey.forEach(r => {
    if (!journeyByStep[r.order_number]) journeyByStep[r.order_number] = [];
    journeyByStep[r.order_number].push(r);
  });
  const steps = [1, 2, 3].filter(s => journeyByStep[s]);
  steps.forEach(s => { journeyByStep[s] = journeyByStep[s].sort((a,b) => b.client_count - a.client_count).slice(0, 5); });

  const filteredTrans = data.transitions.filter(t => t.from_order === transFilter);

  // Key insights
  const topTrans = data.transitions[0];
  const step1to2 = data.transitions.filter(t => t.from_order === 1);
  const avgDays = step1to2.length > 0 ? Math.round(step1to2.reduce((s,t) => s + Number(t.avg_days_between), 0) / step1to2.length) : null;
  const topAov = [...step1to2].sort((a,b) => Number(b.avg_order_value) - Number(a.avg_order_value))[0];

  const STEP_COLORS = ['#3577b3','#b8763a','#2d8a4e','#e6a817','#8b7355'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Journey flow */}
      <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Ścieżka zakupowa klienta</div>
        <div style={{ fontSize: 12, color: '#6b6b6b', marginBottom: 16 }}>Top grupy produktów per numer zamówienia (1.–3.)</div>
        {steps.length === 0 ? (
          <div style={{ color: '#6b6b6b', fontSize: 13 }}>Brak danych — matview wymaga produktów z EAN</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 16 }}>
            {steps.map(step => (
              <div key={step}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
                  {step}. zamówienie
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {journeyByStep[step].map((row, i) => {
                    const maxCount = journeyByStep[step][0]?.client_count || 1;
                    const trans = data.transitions.filter(t => t.from_order === step && t.from_group === row.product_group).slice(0, 3);
                    return (
                      <div key={`${row.product_group}-${row.world}`} style={{ background: '#faf8f5', border: `1px solid ${STEP_COLORS[i % STEP_COLORS.length]}33`, borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{row.product_group}</div>
                          <div style={{ fontSize: 11, color: '#6b6b6b' }}>{row.client_count.toLocaleString('pl-PL')}</div>
                        </div>
                        <div style={{ background: '#e8e0d8', borderRadius: 3, height: 4, overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ height: '100%', width: `${(row.client_count / maxCount) * 100}%`, background: STEP_COLORS[i % STEP_COLORS.length], borderRadius: 3 }} />
                        </div>
                        {trans.length > 0 && step < 3 && (
                          <div style={{ fontSize: 10, color: '#6b6b6b', marginTop: 4 }}>
                            → {trans.map(t => `${t.to_group} (${t.transition_count})`).join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transition table */}
      <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace' }}>Przejścia między zamówieniami</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[[1,'1→2'],[2,'2→3'],[3,'3→4']].map(([n, label]) => (
              <button key={n}
                onClick={() => setTransFilter(n as number)}
                style={{ padding: '4px 12px', fontSize: 11, border: `1px solid ${transFilter === n ? '#b8763a' : '#e8e0d8'}`, borderRadius: 4, background: transFilter === n ? '#b8763a' : '#fff', color: transFilter === n ? '#fff' : '#6b6b6b', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {filteredTrans.length === 0 ? (
          <div style={{ color: '#6b6b6b', fontSize: 13 }}>Brak danych dla tego przejścia</div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e8e0d8' }}>
                {['Z (produkt)','Do (produkt)','Klienci','Avg dni między','Avg wartość'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h==='Z (produkt)'||h==='Do (produkt)'?'left':'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTrans.slice(0, 30).map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ece6' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 600 }}>{t.from_group}</td>
                  <td style={{ padding: '7px 10px', color: '#3577b3' }}>{t.to_group}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{t.transition_count.toLocaleString('pl-PL')}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#6b6b6b' }}>{t.avg_days_between ?? '—'} dni</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#b8763a' }}>{formatPLN(Number(t.avg_order_value))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Key insights */}
      {(topTrans || avgDays) && (
        <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>Insights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topTrans && (
              <div style={{ fontSize: 13, padding: '8px 12px', background: '#faf8f5', borderRadius: 4, borderLeft: '3px solid #3577b3' }}>
                Najczęstsze przejście: <strong>{topTrans.from_group} → {topTrans.to_group}</strong> ({topTrans.transition_count.toLocaleString('pl-PL')} klientów, zamów. {topTrans.from_order}→{topTrans.to_order})
              </div>
            )}
            {avgDays && (
              <div style={{ fontSize: 13, padding: '8px 12px', background: '#faf8f5', borderRadius: 4, borderLeft: '3px solid #2d8a4e' }}>
                Średni czas 1. → 2. zamówienie: <strong>{avgDays} dni</strong>
              </div>
            )}
            {topAov && (
              <div style={{ fontSize: 13, padding: '8px 12px', background: '#faf8f5', borderRadius: 4, borderLeft: '3px solid #b8763a' }}>
                Najwyższe AOV po 1. zamówieniu: <strong>{topAov.to_group}</strong> ({formatPLN(Number(topAov.avg_order_value))})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Lifecycle', 'Scoring RFM', 'Ścieżka zakupowa'] as const;
type Tab = typeof TABS[number];


export default function LifecyclePage() {
  const [data, setData] = useState<LifecycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '', label: 'Cała historia' });
  const [activeTab, setActiveTab] = useState<Tab>('Lifecycle');


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

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', margin: 0, marginBottom: 6 }}>Lifecycle &amp; Segmenty</h1>
        <div style={{ fontSize: 13, color: '#6b6b6b' }}>Struktura bazy klientów, RFM scoring i ścieżki zakupowe</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e8e0d8' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
            fontFamily: 'IBM Plex Mono, monospace', border: 'none', background: 'transparent',
            color: activeTab === tab ? '#b8763a' : '#6b6b6b', cursor: 'pointer',
            borderBottom: activeTab === tab ? '2px solid #b8763a' : '2px solid transparent',
            marginBottom: -2, transition: 'color 0.15s',
          }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Lifecycle' && (
        <>
          {activeTab === 'Lifecycle' && <DateRangePicker onChange={setDateRange} defaultPreset="Cała historia" />}
          {loading ? <Skeleton /> : error || !data ? (
            <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 32, textAlign: 'center' }}>
              <div style={{ color: '#dd4444', marginBottom: 12 }}>Błąd: {error}</div>
              <button onClick={load} style={{ padding: '8px 20px', background: '#b8763a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>Spróbuj ponownie</button>
            </div>
          ) : (
            <>
              <FunnelSection funnel={data.funnel} />
              <div style={{ marginTop: 20 }}><MatrixSection matrix={data.matrix} /></div>
              <div style={{ marginTop: 20 }}><RepeatLadder ladder={data.ladder} /></div>
              <div style={{ marginTop: 20 }}><WorldsBreakdown worlds={data.worlds} /></div>
              <div style={{ marginTop: 20 }}><SegmentMigrationSection /></div>
            </>
          )}
        </>
      )}

      {activeTab === 'Scoring RFM' && <RfmTab />}
      {activeTab === 'Ścieżka zakupowa' && <JourneyTab />}
    </div>
  );
}
