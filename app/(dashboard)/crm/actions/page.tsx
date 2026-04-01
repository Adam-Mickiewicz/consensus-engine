'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opportunity {
  opportunity_type: string;
  label: string;
  description: string;
  client_count: number;
  revenue_potential: number;
  avg_ltv: number;
  avg_days_inactive: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  sort_order: number;
}

interface SegmentClient {
  client_id: string;
  legacy_segment: string | null;
  risk_level: string | null;
  ltv: number | null;
  orders_count: number | null;
  last_order: string | null;
  top_domena: string | null;
  winback_priority: string | null;
}

interface LeadDist {
  lead_temperature: string;
  client_count: number;
  total_ltv: number;
  avg_ltv: number;
  avg_probability: number;
  avg_lead_score: number;
  predicted_revenue: number;
}

interface HotLead {
  client_id: string;
  legacy_segment: string | null;
  rfm_segment: string | null;
  ltv: number | null;
  orders_count: number | null;
  lead_score: number | null;
  lead_temperature: string | null;
  purchase_probability_30d: number | null;
  predicted_ltv_12m: number | null;
  top_domena: string | null;
  days_since_last_order: number | null;
}

interface GiftDist {
  gift_label: string;
  client_count: number;
  total_ltv: number;
  avg_ltv: number;
  avg_orders: number;
  avg_gift_score: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPLN(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.', ',') + ' M zł';
  if (v >= 1_000) return Math.round(v / 1_000) + ' K zł';
  return v.toFixed(0) + ' zł';
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysSince(s: string | null) {
  if (!s) return '—';
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000) + 'd';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const T = {
  bg: '#f5f2ee', card: '#fff', border: '#e8e0d8',
  accent: '#b8763a', danger: '#dd4444', warning: '#e6a817',
  success: '#2d8a4e', info: '#3577b3', text: '#1a1a1a', muted: '#6b6b6b',
};

const URGENCY: Record<string, { color: string; bg: string; dot: string }> = {
  critical: { color: T.danger,  bg: '#fde8e8', dot: T.danger },
  high:     { color: '#9a4800', bg: '#fff0e0', dot: T.warning },
  medium:   { color: '#1a4d80', bg: '#e0ecfa', dot: T.info },
  low:      { color: '#1a5c38', bg: '#e0f2ea', dot: T.success },
};

const SEG_COLORS: Record<string, string> = {
  Diamond: '#7c3aed', Platinum: '#64748b', Gold: '#d97706',
  Returning: '#2563eb', New: '#64748b',
};
const RISK_COLORS: Record<string, string> = {
  OK: T.success, Risk: T.warning, HighRisk: '#f97316', Lost: T.danger,
};

const TEMP_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  Hot:  { bg: T.danger,  text: '#fff', label: '🔥 Hot'  },
  Warm: { bg: T.warning, text: '#fff', label: '🟡 Warm' },
  Cool: { bg: T.info,    text: '#fff', label: '🔵 Cool' },
  Cold: { bg: '#999',    text: '#fff', label: '❄️ Cold' },
};

// ─── Action Suggestions ───────────────────────────────────────────────────────

const ACTION_SUGGESTIONS: Record<string, { title: string; actions: string[]; timing: string; offer: string }> = {
  vip_reactivation: {
    title: 'VIP do reanimacji',
    actions: [
      'Personalizowany email z produktami z ulubionego świata klienta',
      'Ekskluzywny rabat -15% (niepubliczny, tylko dla VIP)',
      'SMS reminder z personalizowaną ofertą',
    ],
    timing: 'Natychmiast — każdy dzień to utracony przychód',
    offer: 'Rabat % lub darmowa wysyłka + nowość z ulubionego świata',
  },
  second_order: {
    title: 'Konwersja na 2. zamówienie',
    actions: [
      'Email z cross-sell na podstawie pierwszego zakupu',
      'Darmowa wysyłka (NIE rabat — nie ucz rabatu od pierwszego zakupu)',
      'Prezentacja nowości z kategorii pierwszego zakupu',
    ],
    timing: '30–45 dni po pierwszym zakupie (okno optymalne)',
    offer: 'Darmowa wysyłka lub mały upominek, bez rabatu procentowego',
  },
  falling_frequency: {
    title: 'Spadająca częstotliwość',
    actions: [
      'Reminder „dawno Cię nie widzieliśmy" z nowościami',
      'Limitowana oferta czasowa (urgency)',
      'Ankieta „co moglibyśmy poprawić"',
    ],
    timing: 'Gdy interval przekroczy 1,5× historyczny średni interval klienta',
    offer: 'Nowości + limitowana edycja, unikaj głębokich rabatów',
  },
  returning_at_risk: {
    title: 'Returning zagrożeni',
    actions: [
      'Automatyczny email retencyjny',
      'Cross-sell z innego świata niż dotychczasowe zakupy',
      'Social proof — „inni klienci kupili też..."',
    ],
    timing: 'Gdy days_since_last_order > 1,3× avg_interval klienta',
    offer: 'Darmowa wysyłka lub gratis do zamówienia',
  },
  dormant_loyals: {
    title: 'Uśpieni lojalni',
    actions: [
      'Personal outreach — „tęsknimy, wracaj"',
      'Specjalna oferta reaktywacyjna (jednorazowa)',
      'Prezentacja co nowego od ich ostatniego zakupu',
    ],
    timing: 'Kampania reaktywacyjna raz na kwartał',
    offer: 'Mocniejszy rabat uzasadniony — to wartościowi klienci',
  },
  recent_high_value: {
    title: 'Świeżo aktywni VIP',
    actions: [
      'Program lojalnościowy / VIP club',
      'Wczesny dostęp do nowości',
      'Thank you email z personalizowaną rekomendacją',
    ],
    timing: '7–14 dni po zakupie — utrzymaj momentum',
    offer: 'Nie rabat — ekskluzywność i dostęp',
  },
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, height: 140, borderLeft: `4px solid ${T.border}` }} />
      ))}
    </div>
  );
}

function MiniSkeleton({ h = 120 }: { h?: number }) {
  return <div style={{ background: 'linear-gradient(90deg,#e8e0d8 25%,#f0ece6 50%,#e8e0d8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderRadius: 8, height: h }} />;
}

// ─── Segment Client Table ─────────────────────────────────────────────────────

function SegmentTable({ clients, segmentKey, onClose }: { clients: SegmentClient[]; segmentKey: string; onClose: () => void }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Top {clients.length} klientów wg LTV</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.open(`/api/crm/actions/export?segment=${segmentKey}`, '_blank')}
            style={{ padding: '5px 14px', border: `1px solid ${T.border}`, borderRadius: 6, background: T.card, cursor: 'pointer', fontSize: 12, color: T.text }}>
            Eksportuj CSV
          </button>
          <button onClick={onClose}
            style={{ padding: '5px 14px', border: `1px solid ${T.border}`, borderRadius: 6, background: T.card, cursor: 'pointer', fontSize: 12, color: T.muted }}>
            Zamknij ×
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 1 }}>
            <tr>
              {['Client ID','Segment','Risk','LTV','Zamówienia','Ostatnie zam.','Nieakt.','Świat'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={c.client_id} style={{ borderTop: i > 0 ? `1px solid ${T.border}` : undefined }}>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: T.muted }}>{c.client_id.slice(0, 8)}…</td>
                <td style={{ padding: '7px 12px' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: '#f0ecf8', color: SEG_COLORS[c.legacy_segment || ''] || T.muted }}>{c.legacy_segment || '—'}</span>
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: RISK_COLORS[c.risk_level || ''] || T.muted }}>{c.risk_level || '—'}</span>
                </td>
                <td style={{ padding: '7px 12px', fontWeight: 600 }}>{c.ltv?.toFixed(0) || '—'} zł</td>
                <td style={{ padding: '7px 12px' }}>{c.orders_count ?? '—'}</td>
                <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{fmtDate(c.last_order)}</td>
                <td style={{ padding: '7px 12px', color: T.muted }}>{daysSince(c.last_order)}</td>
                <td style={{ padding: '7px 12px', fontSize: 11 }}>{c.top_domena || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Lead Scoring Tab ─────────────────────────────────────────────────────────

function LeadScoringTab() {
  const [data, setData] = useState<{ distribution: LeadDist[]; topHot: HotLead[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crm/lead-scoring')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>{[1,2,3,4].map(i => <MiniSkeleton key={i} h={100} />)}</div>
      <MiniSkeleton h={300} />
    </div>
  );
  if (!data) return <div style={{ fontSize: 13, color: T.muted, padding: 20 }}>Brak danych</div>;

  const TEMP_ORDER = ['Hot','Warm','Cool','Cold'];
  const distByTemp: Record<string, LeadDist> = {};
  data.distribution.forEach(d => { distByTemp[d.lead_temperature] = d; });

  return (
    <div>
      {/* Temperature overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {TEMP_ORDER.map(temp => {
          const d = distByTemp[temp];
          const tc = TEMP_COLORS[temp];
          return (
            <div key={temp} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, borderTop: `3px solid ${tc.bg}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ padding: '2px 10px', borderRadius: 12, background: tc.bg, color: tc.text, fontSize: 11, fontWeight: 700 }}>{tc.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.text, lineHeight: 1, marginBottom: 4 }}>
                {d ? d.client_count.toLocaleString('pl-PL') : '—'}
              </div>
              {d && <>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>pred. {formatPLN(d.predicted_revenue)}</div>
                <div style={{ fontSize: 11, color: T.muted }}>avg score: {Math.round(d.avg_lead_score)}/100</div>
              </>}
            </div>
          );
        })}
      </div>

      {/* Top 50 Hot leads */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Top {data.topHot.length} Hot leads</div>
          <a href="/api/crm/lead-scoring?format=csv&temperature=Hot" target="_blank" rel="noopener noreferrer"
            style={{ padding: '5px 14px', border: `1px solid ${T.border}`, borderRadius: 6, background: T.card, fontSize: 12, color: T.text, textDecoration: 'none' }}>
            Eksportuj CSV
          </a>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 1 }}>
              <tr>
                {['Client ID','Segment','Lead Score','Prob. 30d','Pred. LTV 12m','Nieakt.','Świat'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topHot.map((c, i) => (
                <tr key={c.client_id}
                  onClick={() => window.location.href = `/crm/clients/${c.client_id}`}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#faf8f5'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  style={{ cursor: 'pointer', borderTop: i > 0 ? `1px solid ${T.border}` : undefined }}>
                  <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: T.muted }}>{c.client_id.slice(0,8)}…</td>
                  <td style={{ padding: '7px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: '#f0ecf8', color: SEG_COLORS[c.legacy_segment || ''] || T.muted }}>{c.legacy_segment || '—'}</span>
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 50, height: 5, background: '#e8e0d8', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${c.lead_score || 0}%`, background: T.danger, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontWeight: 700, color: T.danger }}>{c.lead_score ?? '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '7px 12px', color: (c.purchase_probability_30d ?? 0) > 50 ? T.success : T.text }}>{c.purchase_probability_30d != null ? c.purchase_probability_30d.toFixed(1)+'%' : '—'}</td>
                  <td style={{ padding: '7px 12px', color: T.info }}>{c.predicted_ltv_12m != null ? formatPLN(c.predicted_ltv_12m) : '—'}</td>
                  <td style={{ padding: '7px 12px', color: T.muted }}>{c.days_since_last_order != null ? c.days_since_last_order+'d' : '—'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11 }}>{c.top_domena || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scoring methodology */}
      <div style={{ background: '#faf8f5', border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace' }}>Metodologia scoringu</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>Lead score składa się z pięciu czynników:</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {[
            { label: 'Purchase probability', pct: 40, color: T.danger },
            { label: 'Recency', pct: 20, color: T.warning },
            { label: 'Engagement', pct: 15, color: T.success },
            { label: 'Value (LTV)', pct: 10, color: T.info },
            { label: 'Season match', pct: 15, color: T.accent },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 10px' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: f.color }} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{f.pct}%</span>
              <span style={{ fontSize: 11, color: T.muted }}>{f.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: T.muted }}>
          Hot ≥70 · Warm ≥45 · Cool ≥20 · Cold &lt;20
        </div>
      </div>
    </div>
  );
}

// ─── Gift Analysis Tab ────────────────────────────────────────────────────────

function GiftAnalysisTab() {
  const [data, setData] = useState<{ giftDistribution: GiftDist[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crm/lead-scoring')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>{[1,2,3].map(i => <MiniSkeleton key={i} h={110} />)}</div>
      <MiniSkeleton h={180} />
    </div>
  );

  const gd = data?.giftDistribution || [];
  const totalClients = gd.reduce((s, r) => s + r.client_count, 0);
  const totalLtv = gd.reduce((s, r) => s + r.total_ltv, 0);
  const giftBuyers = gd.find(r => r.gift_label === 'Głównie prezenty');
  const giftBuyersPct = giftBuyers && totalClients > 0 ? (giftBuyers.client_count / totalClients * 100).toFixed(1) : '—';
  const giftRevenuePct = giftBuyers && totalLtv > 0 ? (giftBuyers.total_ltv / totalLtv * 100).toFixed(0) : '—';
  const giftLtvRatio = giftBuyers && gd.find(r => r.gift_label === 'Głównie dla siebie')
    ? (giftBuyers.avg_ltv / gd.find(r => r.gift_label === 'Głównie dla siebie')!.avg_ltv).toFixed(1)
    : null;

  const GIFT_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
    'Głównie prezenty':       { icon: '🎁', color: T.accent,  bg: 'rgba(184,118,58,0.06)' },
    'Mix: siebie + prezenty': { icon: '🔀', color: T.info,    bg: 'rgba(53,119,179,0.06)' },
    'Głównie dla siebie':     { icon: '👤', color: T.success, bg: 'rgba(45,138,78,0.06)'  },
  };

  return (
    <div>
      {/* Distribution cards */}
      {gd.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>
          Brak danych gift analysis. Upewnij się że scoring był uruchomiony.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {['Głównie prezenty','Mix: siebie + prezenty','Głównie dla siebie'].map(label => {
            const row = gd.find(r => r.gift_label === label);
            const gs = GIFT_STYLES[label];
            return (
              <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, borderTop: `3px solid ${gs.color}` }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{gs.icon} <span style={{ fontSize: 13, fontWeight: 700, color: gs.color }}>{label}</span></div>
                <div style={{ fontSize: 28, fontWeight: 700, color: T.text, lineHeight: 1, marginBottom: 4 }}>
                  {row ? row.client_count.toLocaleString('pl-PL') : '—'}
                </div>
                {row && <>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>avg score: {Math.round(row.avg_gift_score)}/100</div>
                  <div style={{ fontSize: 12, color: T.muted }}>avg LTV: {formatPLN(row.avg_ltv)}</div>
                </>}
              </div>
            );
          })}
        </div>
      )}

      {/* Insights */}
      {gd.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>Kluczowe wnioski</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {giftLtvRatio && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>💡</span>
                <span style={{ fontSize: 13, color: T.text }}>Klienci kupujący prezenty mają <strong style={{ color: T.accent }}>{giftLtvRatio}×</strong> wyższe LTV niż kupujący głównie dla siebie.</span>
              </div>
            )}
            {giftBuyersPct !== '—' && giftRevenuePct !== '—' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>📊</span>
                <span style={{ fontSize: 13, color: T.text }}>Gift buyers stanowią <strong style={{ color: T.accent }}>{giftBuyersPct}%</strong> bazy, ale odpowiadają za <strong style={{ color: T.accent }}>{giftRevenuePct}%</strong> łącznego LTV.</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16 }}>🎯</span>
              <span style={{ fontSize: 13, color: T.text }}>Segmentuj kampanie świąteczne (Mikołaj, Walentynki, Dzień Matki/Ojca) osobno dla gift buyers — reagują inaczej niż self-buyers.</span>
            </div>
          </div>
        </div>
      )}

      {/* Methodology */}
      <div style={{ background: '#faf8f5', border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace' }}>Metodologia (6 sygnałów)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {[
            { label: 'Sezon prezentowy', pct: 30 },
            { label: 'Segment produktu', pct: 25 },
            { label: 'Okazje produktowe', pct: 15 },
            { label: 'Dywersyfikacja', pct: 10 },
            { label: 'Zestawy/gift boxy', pct: 10 },
            { label: 'Różne segm. prezent.', pct: 10 },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>{f.pct}%</span>
              <span style={{ fontSize: 11, color: T.muted }}>{f.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: T.muted }}>
          &gt;60 = Głównie prezenty · 30–60 = Mix · &lt;30 = Głównie dla siebie
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'queue',  label: 'Opportunity Queue' },
  { id: 'leads',  label: 'Lead Scoring'       },
  { id: 'gift',   label: 'Gift Analysis'      },
];

export default function ActionsPage() {
  const [activeTab, setActiveTab] = useState('queue');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);
  const [segmentClients, setSegmentClients] = useState<SegmentClient[] | null>(null);
  const [segmentLoading, setSegmentLoading] = useState(false);

  useEffect(() => {
    fetch('/api/crm/actions')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setOpportunities(d.opportunities || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const expandSegment = useCallback((segKey: string) => {
    if (expandedSegment === segKey) { setExpandedSegment(null); setSegmentClients(null); return; }
    setExpandedSegment(segKey); setSegmentClients(null); setSegmentLoading(true);
    fetch(`/api/crm/actions?segment=${segKey}`)
      .then(r => r.json())
      .then(d => setSegmentClients(d.segmentClients || []))
      .catch(() => setSegmentClients([]))
      .finally(() => setSegmentLoading(false));
  }, [expandedSegment]);

  const tabStyle = (id: string): React.CSSProperties => ({
    padding: '10px 20px', fontSize: 13, fontWeight: activeTab === id ? 700 : 400,
    color: activeTab === id ? T.accent : T.muted,
    background: activeTab === id ? T.card : 'transparent',
    border: '1px solid ' + (activeTab === id ? T.border : 'transparent'),
    borderBottom: activeTab === id ? '2px solid ' + T.card : '2px solid transparent',
    borderRadius: '4px 4px 0 0', cursor: 'pointer', marginBottom: -2,
    fontFamily: 'IBM Plex Mono, monospace',
  });

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: T.text }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>Akcje CRM</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: '4px 0 0' }}>Segmenty, lead scoring i analiza prezentowa</p>
      </div>

      {error && (
        <div style={{ background: '#fde8e8', border: `1px solid ${T.danger}`, borderRadius: 8, padding: 14, color: T.danger, marginBottom: 16, fontSize: 13 }}>
          Błąd ładowania: {error}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${T.border}`, marginBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '0 8px 8px 8px', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        {/* ── Tab: Opportunity Queue ── */}
        {activeTab === 'queue' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              Kolejka szans — segmenty do akcji
            </div>
            {loading ? <Skeleton /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                {opportunities.map(opp => {
                  const urg = URGENCY[opp.urgency] || URGENCY.medium;
                  const isExpanded = expandedSegment === opp.opportunity_type;
                  return (
                    <div key={opp.opportunity_type} style={{ background: isExpanded ? '#faf8f5' : T.card, border: `1px solid ${isExpanded ? T.accent : T.border}`, borderLeft: `4px solid ${urg.dot}`, borderRadius: 8, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: urg.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{opp.label}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10, lineHeight: 1.4 }}>{opp.description}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: T.text, lineHeight: 1, marginBottom: 6 }}>{opp.client_count.toLocaleString('pl-PL')}</div>
                      <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>Revenue pool: <strong style={{ color: T.text }}>{formatPLN(opp.revenue_potential)}</strong></div>
                      <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>Avg nieaktywność: {opp.avg_days_inactive}d</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => expandSegment(opp.opportunity_type)}
                          style={{ flex: 1, padding: '5px 10px', border: `1px solid ${T.accent}`, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: T.accent, fontWeight: 500 }}>
                          {isExpanded ? 'Zwiń ↑' : 'Rozwiń ↓'}
                        </button>
                        <a href={`/api/crm/actions/export?segment=${opp.opportunity_type}`} target="_blank" rel="noopener noreferrer"
                          style={{ padding: '5px 10px', border: `1px solid ${T.border}`, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: T.muted, textDecoration: 'none' }}>
                          CSV
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {expandedSegment && (
              <div style={{ marginBottom: 24 }}>
                {segmentLoading && (
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, textAlign: 'center', fontSize: 13, color: T.muted }}>
                    Ładowanie klientów…
                  </div>
                )}
                {!segmentLoading && segmentClients && (
                  <SegmentTable clients={segmentClients} segmentKey={expandedSegment}
                    onClose={() => { setExpandedSegment(null); setSegmentClients(null); }} />
                )}
              </div>
            )}
            {!loading && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, marginTop: 8 }}>
                  Sugerowane akcje per segment
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                  {Object.entries(ACTION_SUGGESTIONS).map(([key, s]) => {
                    const opp = opportunities.find(o => o.opportunity_type === key);
                    const urg = opp ? URGENCY[opp.urgency] : URGENCY.medium;
                    return (
                      <div key={key} style={{ background: '#faf8f5', border: `1px solid ${T.border}`, borderLeft: `3px solid ${urg.dot}`, borderRadius: 8, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>
                          {s.title}
                          {opp && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: T.muted }}>({opp.client_count.toLocaleString('pl-PL')} klientów)</span>}
                        </div>
                        <ul style={{ margin: '0 0 10px 0', paddingLeft: 18 }}>
                          {s.actions.map(a => <li key={a} style={{ fontSize: 12, color: T.text, marginBottom: 3, lineHeight: 1.5 }}>{a}</li>)}
                        </ul>
                        <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic', marginBottom: 4 }}>Timing: {s.timing}</div>
                        <div style={{ fontSize: 12, color: T.text }}><strong>Oferta:</strong> {s.offer}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Lead Scoring ── */}
        {activeTab === 'leads' && <LeadScoringTab />}

        {/* ── Tab: Gift Analysis ── */}
        {activeTab === 'gift' && <GiftAnalysisTab />}
      </div>
    </div>
  );
}
