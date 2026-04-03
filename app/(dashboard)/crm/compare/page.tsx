'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

function formatPLN(val: number): string {
  if (!val || isNaN(val)) return '0 zł';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' mln zł';
  if (val >= 1_000) return Math.round(val / 1_000) + ' tys. zł';
  return Math.round(val) + ' zł';
}
function fmtNum(v: number) { return new Intl.NumberFormat('pl-PL').format(Math.round(v || 0)); }

const SEGMENT_OPTIONS = ['New', 'Returning', 'Gold', 'Platinum', 'Diamond'];
const RISK_OPTIONS = ['OK', 'Risk', 'HighRisk', 'Lost'];
const SEG_COLORS: Record<string, string> = { Diamond:'#b8763a', Platinum:'#8b7355', Gold:'#c9a84c', Returning:'#3577b3', New:'#aaa' };
const RISK_COLORS: Record<string, string> = { OK:'#2d8a4e', Risk:'#e6a817', HighRisk:'#dd4444', Lost:'#6b6b6b' };

// ─── MultiSelect ──────────────────────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 10, color: '#6b6b6b', marginBottom: 3, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '7px 12px', border: '1px solid #e8e0d8', borderRadius: 4,
        background: '#fff', textAlign: 'left', fontSize: 12, cursor: 'pointer',
        color: selected.length > 0 ? '#1a1a1a' : '#999', fontFamily: 'IBM Plex Mono, monospace',
      }}>
        {selected.length > 0 ? selected.join(', ') : 'Wszystkie'}
        <span style={{ float: 'right', color: '#999' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff',
          border: '1px solid #e8e0d8', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 10, maxHeight: 200, overflowY: 'auto', padding: 4,
        }}>
          {options.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12, borderRadius: 3 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#faf8f5'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
              <input type="checkbox" checked={selected.includes(opt)}
                onChange={() => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])}
              />
              {opt}
            </label>
          ))}
          <button onClick={() => { onChange([]); setOpen(false); }}
            style={{ width: '100%', padding: '5px', fontSize: 11, border: 'none', background: '#faf8f5', cursor: 'pointer', borderRadius: 2, marginTop: 2, color: '#6b6b6b' }}>
            Wyczyść (Wszystkie)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
interface GroupFilters { segments: string[]; risks: string[]; worlds: string[]; }

function FilterPanel({ label, filters, onChange, worldOptions }: { label: string; filters: GroupFilters; onChange: (f: GroupFilters) => void; worldOptions: string[] }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#b8763a', marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MultiSelect label="Segment" options={SEGMENT_OPTIONS} selected={filters.segments}
          onChange={v => onChange({ ...filters, segments: v })} />
        <MultiSelect label="Risk" options={RISK_OPTIONS} selected={filters.risks}
          onChange={v => onChange({ ...filters, risks: v })} />
        <MultiSelect label="Domena" options={worldOptions} selected={filters.worlds}
          onChange={v => onChange({ ...filters, worlds: v })} />
      </div>
    </div>
  );
}

// ─── Distribution Bar ─────────────────────────────────────────────────────────
function DistBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((count / total) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <div style={{ width: 80, fontSize: 11, color: '#1a1a1a', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ flex: 1, background: '#f0ece6', borderRadius: 3, height: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, minWidth: pct > 0 ? 4 : 0 }} />
      </div>
      <div style={{ fontSize: 11, color: '#6b6b6b', minWidth: 42, textAlign: 'right' }}>{fmtNum(count)}</div>
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────
interface GroupResult {
  client_count: number; total_ltv: number; avg_ltv: number;
  avg_orders: number; avg_frequency: number;
  segment_distribution: { segment: string; count: number }[] | null;
  risk_distribution: { risk: string; count: number }[] | null;
}

function ResultPanel({ label, result }: { label: string; result: GroupResult }) {
  const metrics = [
    { key: 'Klienci', value: fmtNum(result.client_count) },
    { key: 'Avg LTV', value: formatPLN(result.avg_ltv) },
    { key: 'Avg zamówień', value: (result.avg_orders || 0).toFixed(1) },
    { key: 'Avg częstotliwość', value: (result.avg_frequency || 0).toFixed(2) + '/rok' },
    { key: 'Total LTV', value: formatPLN(result.total_ltv) },
  ];

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#b8763a', marginBottom: 14, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>
        {label}: {fmtNum(result.client_count)} klientów
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {metrics.slice(1).map(m => (
          <div key={m.key} style={{ background: '#faf8f5', borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', marginBottom: 2 }}>{m.key}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {result.segment_distribution && result.segment_distribution.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', marginBottom: 8 }}>Segmenty</div>
          {result.segment_distribution.map(s => (
            <DistBar key={s.segment} label={s.segment} count={s.count} total={result.client_count} color={SEG_COLORS[s.segment] || '#999'} />
          ))}
        </div>
      )}

      {result.risk_distribution && result.risk_distribution.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', marginBottom: 8 }}>Risk</div>
          {result.risk_distribution.map(r => (
            <DistBar key={r.risk} label={r.risk} count={r.count} total={result.client_count} color={RISK_COLORS[r.risk] || '#999'} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Delta section ────────────────────────────────────────────────────────────
function DeltaSection({ groupA, groupB }: { groupA: GroupResult; groupB: GroupResult }) {
  const deltas: { text: string; positive: boolean }[] = [];

  if (groupA.avg_ltv > 0 && groupB.avg_ltv > 0) {
    const diff = ((groupA.avg_ltv - groupB.avg_ltv) / groupB.avg_ltv * 100);
    deltas.push({ text: `Grupa A ma ${Math.abs(diff).toFixed(1)}% ${diff > 0 ? 'wyższe' : 'niższe'} avg LTV`, positive: diff > 0 });
  }
  if (groupA.avg_orders > 0 && groupB.avg_orders > 0) {
    const diff = ((groupA.avg_orders - groupB.avg_orders) / groupB.avg_orders * 100);
    deltas.push({ text: `Grupa A ma ${Math.abs(diff).toFixed(0)}% ${diff > 0 ? 'więcej' : 'mniej'} zamówień średnio`, positive: diff > 0 });
  }
  if (groupA.avg_frequency > 0 && groupB.avg_frequency > 0) {
    const diff = ((groupA.avg_frequency - groupB.avg_frequency) / groupB.avg_frequency * 100);
    deltas.push({ text: `Grupa A ma ${Math.abs(diff).toFixed(0)}% ${diff > 0 ? 'wyższą' : 'niższą'} częstotliwość zakupów`, positive: diff > 0 });
  }

  const lostA = groupA.risk_distribution?.find(r => r.risk === 'Lost');
  const lostB = groupB.risk_distribution?.find(r => r.risk === 'Lost');
  if (lostA && lostB && groupA.client_count > 0 && groupB.client_count > 0) {
    const pctA = lostA.count / groupA.client_count * 100;
    const pctB = lostB.count / groupB.client_count * 100;
    const diff = pctA - pctB;
    if (Math.abs(diff) > 0.5) {
      deltas.push({ text: `Grupa ${diff > 0 ? 'A' : 'B'} ma ${Math.abs(diff).toFixed(1)}pp wyższy udział Lost`, positive: diff < 0 });
    }
  }

  if (deltas.length === 0) return null;

  return (
    <div style={{ marginTop: 20, background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12 }}>Delta</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {deltas.map((d, i) => (
          <div key={i} style={{
            fontSize: 13, color: '#1a1a1a', padding: '8px 12px',
            background: d.positive ? 'rgba(45,138,78,0.04)' : 'rgba(221,68,68,0.04)',
            borderLeft: `3px solid ${d.positive ? '#2d8a4e' : '#dd4444'}`,
            borderRadius: '0 4px 4px 0',
          }}>
            {d.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ResultSkeleton() {
  const sk: React.CSSProperties = {
    background: 'linear-gradient(90deg,#e8e0d8 25%,#f0ece6 50%,#e8e0d8 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderRadius: 8,
  };
  return <div style={{ ...sk, height: 320 }} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const [worldOptions, setWorldOptions] = useState<string[]>([]);
  const [groupA, setGroupA] = useState<GroupFilters>({ segments: [], risks: [], worlds: [] });
  const [groupB, setGroupB] = useState<GroupFilters>({ segments: [], risks: [], worlds: [] });
  const [results, setResults] = useState<{ group_a: GroupResult; group_b: GroupResult } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/lifecycle')
      .then(r => r.json())
      .then(d => {
        const worlds = (d.worlds || []).map((w: any) => w.world).filter(Boolean);
        setWorldOptions(worlds);
      })
      .catch(() => {});
  }, []);

  const compare = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/crm/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_a: groupA, group_b: groupB }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
    } catch (e: any) {
      setError(e.message || 'Błąd porównania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#1a1a1a', margin: 0, marginBottom: 6 }}>Porównanie grup klientów</h1>
        <div style={{ fontSize: 13, color: '#6b6b6b' }}>Porównaj dwie dowolne grupy klientów według wybranych filtrów</div>
      </div>

      {/* Filter panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <FilterPanel label="Grupa A" filters={groupA} onChange={setGroupA} worldOptions={worldOptions} />
        <FilterPanel label="Grupa B" filters={groupB} onChange={setGroupB} worldOptions={worldOptions} />
      </div>

      <button onClick={compare} disabled={loading} style={{
        padding: '10px 28px', fontSize: 13, border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
        background: loading ? '#ccc' : '#b8763a', color: '#fff', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
        marginBottom: 20,
      }}>
        {loading ? 'Porównuję…' : 'Porównaj'}
      </button>

      {error && (
        <div style={{ background: 'rgba(221,68,68,0.06)', border: '1px solid rgba(221,68,68,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#dd4444' }}>
          Błąd: {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ResultSkeleton /><ResultSkeleton />
        </div>
      )}

      {!loading && results && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ResultPanel label="Grupa A" result={results.group_a} />
            <ResultPanel label="Grupa B" result={results.group_b} />
          </div>
          <DeltaSection groupA={results.group_a} groupB={results.group_b} />
        </>
      )}

      {!loading && !results && !error && (
        <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
          <div style={{ fontSize: 14, color: '#6b6b6b' }}>Wybierz filtry dla obu grup i kliknij Porównaj</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>Brak filtrów = wszyscy klienci w danej grupie</div>
        </div>
      )}
    </div>
  );
}
