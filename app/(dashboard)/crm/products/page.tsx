'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import DateRangePicker from '../components/DateRangePicker';

interface ProductRow { product_name: string | null; ean: number | null; times_sold: number; total_quantity: number; total_revenue: number; unique_buyers: number; repeat_buyers: number; buyer_repeat_rate: number; promo_sales: number; promo_share_pct: number; collection: string | null; product_group: string | null; available: boolean | null; }
interface SeasonRow { season: string; year: number; revenue: number; orders: number; unique_customers: number; avg_order_value: number; promo_count: number; }
interface CrossSellRow { product_a: string; product_b: string; co_occurrence: number; }
interface WorldRow { world: string; client_count: number; total_ltv: number; avg_ltv: number; repeat_clients: number; repeat_rate: number; vip_count: number; lost_count: number; avg_orders: number; }
interface ProductsData { products: ProductRow[]; seasons: SeasonRow[]; crossSell: CrossSellRow[]; worlds: WorldRow[]; }

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
      <div style={{ height: 44, ...sk, marginBottom: 16 }} />
      <div style={{ ...sk, height: 500 }} />
    </div>
  );
}

function ProductsTab({ products }: { products: ProductRow[] }) {
  const [sortBy, setSortBy] = useState<keyof ProductRow>('total_revenue');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [filterCollection, setFilterCollection] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  const collections = Array.from(new Set(products.map(p => p.collection).filter(Boolean))).sort() as string[];

  const sorted = [...products]
    .filter(p => !filterCollection || p.collection === filterCollection)
    .sort((a, b) => {
      const av = (a[sortBy] as number) || 0;
      const bv = (b[sortBy] as number) || 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const visible = sorted.slice((page-1)*PER_PAGE, page*PER_PAGE);

  function toggleSort(col: keyof ProductRow) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
    setPage(1);
  }

  function sortIcon(col: keyof ProductRow) {
    if (sortBy !== col) return ' \u2195';
    return sortDir === 'desc' ? ' \u2193' : ' \u2191';
  }

  const thStyle = (col: keyof ProductRow): React.CSSProperties => ({
    padding: '8px 10px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace',
    textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: col==='product_name'?'left':'right',
    borderBottom: '2px solid #e8e0d8', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    background: sortBy === col ? 'rgba(184,118,58,0.06)' : '#faf8f5',
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterCollection} onChange={e => { setFilterCollection(e.target.value); setPage(1); }}
          style={{ padding: '7px 10px', border: '1px solid #e8e0d8', borderRadius: 4, background: '#fff', fontSize: 13, color: '#1a1a1a' }}>
          <option value="">Wszystkie kolekcje</option>
          {collections.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6b6b6b' }}>{sorted.length} produktów</div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle('product_name'), minWidth: 200 }} onClick={() => toggleSort('product_name')}>Produkt{sortIcon('product_name')}</th>
              <th style={thStyle('total_revenue')} onClick={() => toggleSort('total_revenue')}>Revenue{sortIcon('total_revenue')}</th>
              <th style={thStyle('times_sold')} onClick={() => toggleSort('times_sold')}>Sprzedaż{sortIcon('times_sold')}</th>
              <th style={thStyle('unique_buyers')} onClick={() => toggleSort('unique_buyers')}>Kupcy{sortIcon('unique_buyers')}</th>
              <th style={thStyle('buyer_repeat_rate')} onClick={() => toggleSort('buyer_repeat_rate')}>Repeat%{sortIcon('buyer_repeat_rate')}</th>
              <th style={thStyle('promo_share_pct')} onClick={() => toggleSort('promo_share_pct')}>Promo%{sortIcon('promo_share_pct')}</th>
              <th style={{ ...thStyle('collection'), textAlign: 'left' }}>Kolekcja</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p, idx) => {
              const isTop5 = (page === 1 && idx < 5 && sortBy === 'total_revenue' && sortDir === 'desc');
              return (
                <tr key={`${p.ean}-${p.product_name}`}
                  style={{ borderBottom: '1px solid #f0ece6', background: isTop5 ? 'rgba(184,118,58,0.03)' : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#faf8f5'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background=isTop5?'rgba(184,118,58,0.03)':'transparent'}>
                  <td style={{ padding: '8px 10px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isTop5 ? 700 : 400 }}>
                    {p.product_name || '—'}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b8763a', fontWeight: 600 }}>{formatPLN(p.total_revenue)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{p.times_sold?.toLocaleString('pl-PL')}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{p.unique_buyers?.toLocaleString('pl-PL')}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: p.buyer_repeat_rate >= 50 ? '#2d8a4e' : '#1a1a1a' }}>{p.buyer_repeat_rate ?? '—'}%</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: p.promo_share_pct >= 50 ? '#e6a817' : '#1a1a1a' }}>{p.promo_share_pct ?? '—'}%</td>
                  <td style={{ padding: '8px 10px', fontSize: 11, color: '#6b6b6b', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.collection || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13 }}>
          <div style={{ color: '#6b6b6b' }}>Wyświetlono {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, sorted.length)} z {sorted.length}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ padding: '6px 14px', border: '1px solid #e8e0d8', borderRadius: 4, background: '#fff', cursor: page===1?'default':'pointer', opacity: page===1?0.4:1, fontSize: 12 }}>Poprzednia</button>
            <span style={{ padding: '6px 10px', fontSize: 12, color: '#6b6b6b' }}>Str. {page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} style={{ padding: '6px 14px', border: '1px solid #e8e0d8', borderRadius: 4, background: '#fff', cursor: page>=totalPages?'default':'pointer', opacity: page>=totalPages?0.4:1, fontSize: 12 }}>Następna</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WorldsTab({ worlds }: { worlds: WorldRow[] }) {
  const maxRevenue = Math.max(...worlds.map(w => w.total_ltv), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e8e0d8' }}>
            {['Domena','Klienci','Przychód','Wsk. powrotu','Śr. LTV','VIP','Utraceni','Śr. zamówień'].map(h => (
              <th key={h} style={{ padding: '8px 10px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h==='Domena'?'left':'right', background: '#faf8f5', borderBottom: '2px solid #e8e0d8' }}>{h}</th>
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
              <td style={{ padding: '10px', fontWeight: 600 }}>{w.world}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{w.client_count.toLocaleString('pl-PL')}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  <div style={{ width: 60, height: 6, background: '#e8e0d8', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${w.total_ltv/maxRevenue*100}%`, background: '#b8763a', borderRadius: 3 }} />
                  </div>
                  <span>{formatPLN(w.total_ltv)}</span>
                </div>
              </td>
              <td style={{ padding: '10px', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  <div style={{ width: 50, height: 6, background: '#e8e0d8', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${Math.min(w.repeat_rate, 100)}%`, background: '#2d8a4e', borderRadius: 3 }} />
                  </div>
                  <span style={{ color: w.repeat_rate >= 20 ? '#2d8a4e' : '#1a1a1a' }}>{w.repeat_rate}%</span>
                </div>
              </td>
              <td style={{ padding: '10px', textAlign: 'right' }}>{formatPLN(w.avg_ltv)}</td>
              <td style={{ padding: '10px', textAlign: 'right', color: '#b8763a' }}>{w.vip_count}</td>
              <td style={{ padding: '10px', textAlign: 'right', color: '#dd4444' }}>{w.lost_count}</td>
              <td style={{ padding: '10px', textAlign: 'right', color: '#6b6b6b' }}>{Number(w.avg_orders).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeasonsTab({ seasons }: { seasons: SeasonRow[] }) {
  const allYears = Array.from(new Set(seasons.map(s => s.year))).sort();
  const allSeasons = Array.from(new Set(seasons.map(s => s.season))).sort();

  const lookup: Record<string, SeasonRow> = {};
  seasons.forEach(s => { lookup[`${s.season}_${s.year}`] = s; });

  return (
    <div>
      <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 16 }}>Porównanie rok do roku · zielony = wzrost, czerwony = spadek</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e8e0d8' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', background: '#faf8f5' }}>Sezon/Okazja</th>
              {allYears.map(y => (
                <th key={y} style={{ padding: '8px 12px', textAlign: 'right', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', background: '#faf8f5' }}>{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allSeasons.map(season => (
              <tr key={season} style={{ borderBottom: '1px solid #f0ece6' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{season}</td>
                {allYears.map((year, yi) => {
                  const row = lookup[`${season}_${year}`];
                  const prev = yi > 0 ? lookup[`${season}_${allYears[yi-1]}`] : null;
                  const growth = prev && prev.revenue > 0 ? ((row?.revenue || 0) - prev.revenue) / prev.revenue * 100 : null;
                  const bg = growth != null ? (growth > 0 ? 'rgba(45,138,78,0.07)' : growth < -5 ? 'rgba(221,68,68,0.07)' : 'transparent') : 'transparent';
                  return (
                    <td key={year} style={{ padding: '10px 12px', textAlign: 'right', background: bg }}>
                      {row ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{formatPLN(row.revenue)}</div>
                          <div style={{ fontSize: 10, color: '#6b6b6b' }}>{row.orders} zam.</div>
                          {growth != null && <div style={{ fontSize: 10, color: growth > 0 ? '#2d8a4e' : '#dd4444' }}>{growth > 0 ? '+' : ''}{growth.toFixed(0)}% YoY</div>}
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
    </div>
  );
}

function CrossSellPairsChart({ crossSell }: { crossSell: CrossSellRow[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const scriptAddedRef = useRef(false);
  const renderFnRef = useRef<() => void>(() => {});

  const top10 = crossSell.slice(0, 10);

  const renderChart = useCallback(() => {
    if (!canvasRef.current || !window.Chart || !top10.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const labels = top10.map(r => {
      const a = r.product_a.length > 22 ? r.product_a.slice(0, 22) + '…' : r.product_a;
      const b = r.product_b.length > 22 ? r.product_b.slice(0, 22) + '…' : r.product_b;
      return `${a} + ${b}`;
    });
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: top10.map(r => r.co_occurrence), backgroundColor: '#b8763a', borderRadius: 4, hoverBackgroundColor: '#9a6030' }],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} razy razem` } } },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10, family: 'IBM Plex Mono, monospace' }, color: '#6b6b6b' } },
          y: { grid: { display: false }, ticks: { font: { size: 10, family: 'IBM Plex Mono, monospace' }, color: '#1a1a1a' } },
        },
      },
    });
  }, [top10]);

  useEffect(() => { renderFnRef.current = renderChart; }, [renderChart]);
  useEffect(() => {
    if (window.Chart) { renderChart(); return () => { chartRef.current?.destroy(); chartRef.current = null; }; }
    if (!scriptAddedRef.current) {
      scriptAddedRef.current = true;
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = () => renderFnRef.current();
      document.head.appendChild(s);
    }
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [renderChart]);

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>Top 10 par — częstość kupowania razem</div>
      <div style={{ fontSize: 11, color: '#6b6b6b', marginBottom: 12 }}>Długość paska = liczba zamówień zawierających oba produkty jednocześnie</div>
      <div style={{ height: 320 }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

function CrossSellTab({ crossSell }: { crossSell: CrossSellRow[] }) {
  const [showTable, setShowTable] = useState(false);
  const top20 = crossSell.slice(0, 20);
  const top10 = crossSell.slice(0, 10);
  const maxOcc = Math.max(...top20.map(r => r.co_occurrence), 1);

  return (
    <div>
      <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 16 }}>
        Produkty najczęściej kupowane razem w jednym zamówieniu. Użyj do planowania bundli i rekomendacji.
      </div>

      {/* SEKCJA A: Para visualization */}
      <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12 }}>Pary produktowe — wizualizacja</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {top10.map((r, i) => {
            const thickness = Math.max(2, Math.round(r.co_occurrence / maxOcc * 8));
            const opacity = 0.3 + (r.co_occurrence / maxOcc) * 0.7;
            const nameA = r.product_a.length > 28 ? r.product_a.slice(0, 28) + '…' : r.product_a;
            const nameB = r.product_b.length > 28 ? r.product_b.slice(0, 28) + '…' : r.product_b;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.product_a}>{nameA}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 120 }}>
                  <div style={{ flex: 1, height: thickness, background: `rgba(184,118,58,${opacity})`, borderRadius: thickness }} />
                  <span style={{ fontSize: 10, color: '#b8763a', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>{r.co_occurrence}×</span>
                  <div style={{ flex: 1, height: thickness, background: `rgba(184,118,58,${opacity})`, borderRadius: thickness }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.product_b}>{nameB}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEKCJA B: Bar chart */}
      {crossSell.length > 0 && <CrossSellPairsChart crossSell={crossSell} />}

      {/* Tabela — zwinięta */}
      <button onClick={() => setShowTable(s => !s)} style={{ padding: '6px 14px', background: 'none', border: '1px solid #e8e0d8', borderRadius: 4, fontSize: 12, color: '#6b6b6b', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12 }}>
        {showTable ? 'Ukryj tabelę szczegółów ↑' : 'Pokaż tabelę szczegółów ↓'}
      </button>
      {showTable && (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e8e0d8' }}>
              {['Produkt A','Produkt B','Razem (razy)',''].map(h => (
                <th key={h} style={{ padding: '8px 10px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h==='Razem (razy)'?'right':'left', background: '#faf8f5', borderBottom: '2px solid #e8e0d8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top20.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0ece6' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#faf8f5'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                <td style={{ padding: '8px 10px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product_a}</td>
                <td style={{ padding: '8px 10px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product_b}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#b8763a' }}>{r.co_occurrence}</td>
                <td style={{ padding: '8px 10px', width: 120 }}>
                  <div style={{ height: 6, background: '#f0ece6', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${r.co_occurrence/maxOcc*100}%`, background: '#b8763a', borderRadius: 3 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface LaunchProduct {
  ean: number; product_name: string; launch_date: string; product_group: string | null;
  collection: string | null; days_since_launch: number; orders: number; unique_buyers: number;
  new_customer_buyers: number; repeat_customer_buyers: number; total_revenue: number;
  total_quantity: number; repeat_buyer_pct: number | null;
}
interface LaunchSummary {
  total_launches: number; total_revenue: number; total_buyers: number;
  avg_repeat_pct: number; new_customer_attracted: number;
}

function LaunchBubbleChart({ products, benchmark30d }: { products: LaunchProduct[]; benchmark30d: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const scriptAddedRef = useRef(false);
  const renderFnRef = useRef<() => void>(() => {});

  const renderChart = useCallback(() => {
    if (!canvasRef.current || !window.Chart || !products.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const maxBuyers = Math.max(...products.map(p => p.unique_buyers), 1);
    const points = products.map(p => {
      const revPer30d = p.total_revenue * 30 / Math.max(p.days_since_launch, 1);
      const aboveBenchmark = benchmark30d > 0 && revPer30d >= benchmark30d;
      return {
        x: new Date(p.launch_date).getTime(),
        y: Math.round(p.total_revenue),
        r: Math.max(4, Math.round(p.unique_buyers / maxBuyers * 24)),
        label: p.product_name || '—',
        buyers: p.unique_buyers,
        bg: aboveBenchmark ? '#2d8a4e' : '#dd4444',
      };
    });
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'bubble',
      data: {
        datasets: [{
          data: points,
          backgroundColor: points.map(p => p.bg + 'bb'),
          borderColor: points.map(p => p.bg),
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const p = points[ctx.dataIndex];
                return [`${p.label}`, `Revenue: ${formatPLN(p.y)}`, `Kupcy: ${p.buyers}`];
              },
            },
          },
        },
        scales: {
          x: {
            type: 'time' as const,
            time: { unit: 'month' as const },
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 10, family: 'IBM Plex Mono, monospace' }, color: '#6b6b6b' },
            title: { display: true, text: 'Data premiery', color: '#6b6b6b', font: { size: 10 } },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 10 }, color: '#6b6b6b', callback: (v: number) => Math.round(v / 1000) + 'K zł' },
            title: { display: true, text: 'Revenue łączny', color: '#6b6b6b', font: { size: 10 } },
          },
        },
      },
    });
  }, [products, benchmark30d]);

  useEffect(() => { renderFnRef.current = renderChart; }, [renderChart]);
  useEffect(() => {
    const loadChart = () => renderFnRef.current();
    if (window.Chart) { renderChart(); return () => { chartRef.current?.destroy(); chartRef.current = null; }; }
    if (!scriptAddedRef.current) {
      scriptAddedRef.current = true;
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      s.onload = () => {
        // Load chartjs-adapter-date-fns for time scale
        const adapter = document.createElement('script');
        adapter.src = 'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3/dist/chartjs-adapter-date-fns.bundle.min.js';
        adapter.onload = loadChart;
        document.head.appendChild(adapter);
      };
      document.head.appendChild(s);
    }
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [renderChart]);

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>Timeline premier</div>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#6b6b6b', marginBottom: 12 }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#2d8a4e', marginRight: 4 }} />Powyżej benchmarku</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#dd4444', marginRight: 4 }} />Poniżej benchmarku</span>
        <span>Rozmiar bąbla = liczba kupujących</span>
      </div>
      <div style={{ height: 320 }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

function LaunchBenchmarkChart({ products, benchmark30d }: { products: LaunchProduct[]; benchmark30d: number }) {
  const sorted = [...products].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 15);
  const maxRev = Math.max(...sorted.map(p => p.total_revenue), 1);

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>Revenue vs benchmark</div>
      <div style={{ fontSize: 11, color: '#6b6b6b', marginBottom: 14 }}>
        Linia referencyjna: benchmark avg 30d = <strong style={{ color: '#1a1a1a' }}>{formatPLN(benchmark30d)}</strong> · Zielony = powyżej · Czerwony = poniżej
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {sorted.map((p) => {
          const revPer30d = p.total_revenue * 30 / Math.max(p.days_since_launch, 1);
          const aboveBench = benchmark30d > 0 && revPer30d >= benchmark30d;
          const barW = (p.total_revenue / maxRev) * 100;
          const benchmarkW = benchmark30d > 0 ? Math.min((benchmark30d / maxRev) * 100, 99) : 0;
          const name = (p.product_name || '—').length > 36 ? (p.product_name || '').slice(0, 36) + '…' : (p.product_name || '—');
          return (
            <div key={p.ean}>
              <div style={{ fontSize: 10, color: '#1a1a1a', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.product_name || '—'}>{name}</div>
              <div style={{ position: 'relative', height: 18, background: '#f0ece6', borderRadius: 3 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${barW}%`, background: aboveBench ? '#2d8a4e' : '#dd4444', borderRadius: 3, opacity: 0.75 }} />
                {benchmarkW > 0 && (
                  <div style={{ position: 'absolute', left: `${benchmarkW}%`, top: 0, height: '100%', width: 2, background: '#b8763a', zIndex: 2 }} />
                )}
                <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 700, color: aboveBench ? '#2d8a4e' : '#dd4444', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {formatPLN(p.total_revenue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LaunchMonitorTab() {
  const [products, setProducts] = useState<LaunchProduct[]>([]);
  const [summary, setSummary] = useState<LaunchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const sk: React.CSSProperties = { background: 'linear-gradient(90deg,#e8e0d8 25%,#f0ece6 50%,#e8e0d8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderRadius: 8 };

  useEffect(() => {
    fetch('/api/crm/launch-monitor')
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setSummary(d.summary || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>{[1,2,3,4].map(i => <div key={i} style={{ ...sk, height: 80 }} />)}</div>
      <div style={{ ...sk, height: 400 }} />
    </div>
  );

  if (products.length === 0) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#6b6b6b', fontSize: 13 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
      Brak produktów z datą premiery w ostatnich 12 miesiącach.<br />
      Uzupełnij <code>launch_date</code> w tabeli <code>products</code>.
    </div>
  );

  const benchmark30d = products.length > 0
    ? products.reduce((s, p) => s + (p.days_since_launch <= 30 ? p.total_revenue : p.total_revenue * 30 / Math.max(p.days_since_launch, 1)), 0) / products.length
    : 0;

  return (
    <div>
      {/* SEKCJA A: KPI */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Premiery 12m', value: summary.total_launches.toString() },
            { label: 'Łączny revenue', value: formatPLN(summary.total_revenue) },
            { label: 'Śr. revenue / premiera', value: summary.total_launches > 0 ? formatPLN(summary.total_revenue / summary.total_launches) : '—' },
            { label: 'Nowych klientów', value: summary.new_customer_attracted.toLocaleString('pl-PL') + (summary.total_buyers > 0 ? ' (' + Math.round(summary.new_customer_attracted / summary.total_buyers * 100) + '%)' : '') },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#b8763a' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* SEKCJA B: Bubble timeline */}
      <LaunchBubbleChart products={products} benchmark30d={benchmark30d} />

      {/* SEKCJA C: Benchmark bar */}
      <LaunchBenchmarkChart products={products} benchmark30d={benchmark30d} />

      {/* Tabela — zwinięta */}
      <button onClick={() => setShowTable(s => !s)} style={{ padding: '6px 14px', background: 'none', border: '1px solid #e8e0d8', borderRadius: 4, fontSize: 12, color: '#6b6b6b', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12 }}>
        {showTable ? 'Ukryj tabelę szczegółów ↑' : 'Pokaż tabelę szczegółów ↓'}
      </button>
      {showTable && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#faf8f5', borderBottom: '2px solid #e8e0d8' }}>
                {['Produkt','Premiera','Dni','Revenue','Kupcy','Nowi kl.','Repeat%','vs benchmark'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h === 'Produkt' ? 'left' : 'right', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const revPer30d = p.total_revenue * 30 / Math.max(p.days_since_launch, 1);
                const vsBenchmark = benchmark30d > 0 ? Math.round(revPer30d / benchmark30d * 100) : 0;
                const benchColor = vsBenchmark > 150 ? '#2d8a4e' : vsBenchmark < 80 ? '#dd4444' : '#1a1a1a';
                return (
                  <tr key={p.ean} style={{ borderBottom: '1px solid #f0ece6' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#faf8f5'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td style={{ padding: '8px 10px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: i < 3 ? 700 : 400 }}>{p.product_name || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: '#6b6b6b' }}>{new Date(p.launch_date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6b6b6b' }}>{p.days_since_launch}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b8763a', fontWeight: 600 }}>{formatPLN(p.total_revenue)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{p.unique_buyers.toLocaleString('pl-PL')}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#2d8a4e' }}>{p.new_customer_buyers.toLocaleString('pl-PL')}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: (p.repeat_buyer_pct ?? 0) >= 30 ? '#2d8a4e' : '#1a1a1a' }}>{p.repeat_buyer_pct != null ? p.repeat_buyer_pct + '%' : '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: benchColor }}>{vsBenchmark}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'products', label: 'Produkty' },
  { id: 'worlds', label: 'Domeny' },
  { id: 'seasons', label: 'Sezonowość' },
  { id: 'crosssell', label: 'Produkty powiązane' },
  { id: 'launch', label: '🚀 Monitor nowości' },
];

export default function ProductsPage() {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('products');
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];
    return { from, to, label: 'Ostatnie 12m' };
  });

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ limit: '200' });
    if (dateRange.from) params.set('date_from', dateRange.from);
    if (dateRange.to) params.set('date_to', dateRange.to);
    fetch(`/api/crm/products-analytics?${params}`)
      .then(r => r.json())
      .then((d: ProductsData & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setData(d); setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [dateRange.from, dateRange.to]);

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
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', margin: 0, marginBottom: 6 }}>Produkty &amp; Domeny</h1>
        <div style={{ fontSize: 13, color: '#6b6b6b' }}>CRM perspective na asortyment i sezonowość</div>
      </div>

      <DateRangePicker onChange={setDateRange} defaultPreset="Ostatnie 12m" />

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e8e0d8', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: activeTab===tab.id ? 700 : 400,
              color: activeTab===tab.id ? '#b8763a' : '#6b6b6b',
              background: activeTab===tab.id ? '#fff' : 'transparent',
              border: '1px solid ' + (activeTab===tab.id ? '#e8e0d8' : 'transparent'),
              borderBottom: activeTab===tab.id ? '2px solid #fff' : '2px solid transparent',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              marginBottom: -2,
              fontFamily: 'IBM Plex Mono, monospace',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: '0 8px 8px 8px', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {activeTab === 'products' && <ProductsTab products={data.products} />}
        {activeTab === 'worlds' && <WorldsTab worlds={data.worlds} />}
        {activeTab === 'seasons' && <SeasonsTab seasons={data.seasons} />}
        {activeTab === 'crosssell' && <CrossSellTab crossSell={data.crossSell} />}
        {activeTab === 'launch' && <LaunchMonitorTab />}
      </div>
    </div>
  );
}
