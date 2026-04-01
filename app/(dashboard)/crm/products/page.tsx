'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';

interface ProductRow { product_name: string | null; ean: number | null; times_sold: number; total_quantity: number; total_revenue: number; unique_buyers: number; repeat_buyers: number; buyer_repeat_rate: number; promo_sales: number; promo_share_pct: number; collection: string | null; product_group: string | null; evergreen: boolean | null; available: boolean | null; }
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
  const [filterEvergreen, setFilterEvergreen] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  const collections = Array.from(new Set(products.map(p => p.collection).filter(Boolean))).sort() as string[];

  const sorted = [...products]
    .filter(p => !filterCollection || p.collection === filterCollection)
    .filter(p => !filterEvergreen || p.evergreen)
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1a1a1a', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterEvergreen} onChange={e => { setFilterEvergreen(e.target.checked); setPage(1); }} />
          Tylko evergreen
        </label>
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
              <th style={{ ...thStyle('evergreen'), textAlign: 'center' }}>Evergreen</th>
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
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{p.evergreen ? '\u2713' : '—'}</td>
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
            {['World','Klienci','Revenue','Repeat rate','Avg LTV','VIP','Lost','Avg orders'].map(h => (
              <th key={h} style={{ padding: '8px 10px', fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h==='World'?'left':'right', background: '#faf8f5', borderBottom: '2px solid #e8e0d8' }}>{h}</th>
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

function CrossSellTab({ crossSell }: { crossSell: CrossSellRow[] }) {
  const top20 = crossSell.slice(0, 20);
  const maxOcc = Math.max(...top20.map(r => r.co_occurrence), 1);
  return (
    <div>
      <div style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 16 }}>
        Produkty najczęściej kupowane razem w jednym zamówieniu. Użyj do planowania bundli i rekomendacji.
      </div>
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
    </div>
  );
}

const TABS = [
  { id: 'products', label: 'Produkty' },
  { id: 'worlds', label: 'Światy' },
  { id: 'seasons', label: 'Sezonowość' },
  { id: 'crosssell', label: 'Cross-sell' },
];

export default function ProductsPage() {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('products');

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetch('/api/crm/products-analytics?limit=200')
      .then(r => r.json())
      .then((d: ProductsData & { error?: string }) => {
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

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', margin: 0, marginBottom: 6 }}>Produkty &amp; Światy</h1>
        <div style={{ fontSize: 13, color: '#6b6b6b' }}>CRM perspective na asortyment i sezonowość</div>
      </div>

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
      </div>
    </div>
  );
}
