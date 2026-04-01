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

// ─── Action Suggestions ───────────────────────────────────────────────────────

const ACTION_SUGGESTIONS: Record<string, {
  title: string;
  actions: string[];
  timing: string;
  offer: string;
}> = {
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, height: 140, borderLeft: `4px solid ${T.border}` }} />
      ))}
    </div>
  );
}

// ─── Segment Client Table ─────────────────────────────────────────────────────

function SegmentTable({ clients, segmentKey, onClose }: { clients: SegmentClient[]; segmentKey: string; onClose: () => void }) {
  function handleExport() {
    window.open(`/api/crm/actions/export?segment=${segmentKey}`, '_blank');
  }

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: T.bg, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
          Top {clients.length} klientów wg LTV
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleExport}
            style={{ padding: '5px 14px', border: `1px solid ${T.border}`, borderRadius: 6, background: T.card, cursor: 'pointer', fontSize: 12, color: T.text }}
          >
            Eksportuj CSV
          </button>
          <button
            onClick={onClose}
            style={{ padding: '5px 14px', border: `1px solid ${T.border}`, borderRadius: 6, background: T.card, cursor: 'pointer', fontSize: 12, color: T.muted }}
          >
            Zamknij ×
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 1 }}>
            <tr>
              {['Client ID', 'Segment', 'Risk', 'LTV', 'Zamówienia', 'Ostatnie zam.', 'Nieakt.', 'Świat'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: `1px solid ${T.border}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={c.client_id} style={{ borderTop: i > 0 ? `1px solid ${T.border}` : undefined }}>
                <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: T.muted }}>
                  {c.client_id.slice(0, 8)}…
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: '#f0ecf8', color: SEG_COLORS[c.legacy_segment || ''] || T.muted }}>
                    {c.legacy_segment || '—'}
                  </span>
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: RISK_COLORS[c.risk_level || ''] || T.muted }}>
                    {c.risk_level || '—'}
                  </span>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);
  const [segmentClients, setSegmentClients] = useState<SegmentClient[] | null>(null);
  const [segmentLoading, setSegmentLoading] = useState(false);

  useEffect(() => {
    fetch('/api/crm/actions')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setOpportunities(d.opportunities || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const expandSegment = useCallback((segKey: string) => {
    if (expandedSegment === segKey) {
      setExpandedSegment(null);
      setSegmentClients(null);
      return;
    }
    setExpandedSegment(segKey);
    setSegmentClients(null);
    setSegmentLoading(true);
    fetch(`/api/crm/actions?segment=${segKey}`)
      .then((r) => r.json())
      .then((d) => setSegmentClients(d.segmentClients || []))
      .catch(() => setSegmentClients([]))
      .finally(() => setSegmentLoading(false));
  }, [expandedSegment]);

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: T.text }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>
          Akcje CRM
        </h1>
        <p style={{ fontSize: 13, color: T.muted, margin: '4px 0 0' }}>
          Gotowe segmenty do uruchomienia kampanii
        </p>
      </div>

      {error && (
        <div style={{ background: '#fde8e8', border: `1px solid ${T.danger}`, borderRadius: 8, padding: 14, color: T.danger, marginBottom: 16, fontSize: 13 }}>
          Błąd ładowania: {error}
        </div>
      )}

      {/* SEKCJA 1: Opportunity Queue */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
          Kolejka szans — segmenty do akcji
        </div>
        {loading ? (
          <Skeleton />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {opportunities.map((opp) => {
              const urg = URGENCY[opp.urgency] || URGENCY.medium;
              const isExpanded = expandedSegment === opp.opportunity_type;
              return (
                <div
                  key={opp.opportunity_type}
                  style={{
                    background: isExpanded ? '#faf8f5' : T.card,
                    border: `1px solid ${isExpanded ? T.accent : T.border}`,
                    borderLeft: `4px solid ${urg.dot}`,
                    borderRadius: 8,
                    padding: 16,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: urg.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {opp.label}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 10, lineHeight: 1.4 }}>
                    {opp.description}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: T.text, lineHeight: 1, marginBottom: 6 }}>
                    {opp.client_count.toLocaleString('pl-PL')}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 2 }}>
                    Revenue pool: <strong style={{ color: T.text }}>{formatPLN(opp.revenue_potential)}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
                    Avg nieaktywność: {opp.avg_days_inactive}d
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => expandSegment(opp.opportunity_type)}
                      style={{
                        flex: 1,
                        padding: '5px 10px',
                        border: `1px solid ${T.accent}`,
                        borderRadius: 6,
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: T.accent,
                        fontWeight: 500,
                      }}
                    >
                      {isExpanded ? 'Zwiń ↑' : 'Rozwiń ↓'}
                    </button>
                    <a
                      href={`/api/crm/actions/export?segment=${opp.opportunity_type}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '5px 10px',
                        border: `1px solid ${T.border}`,
                        borderRadius: 6,
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: T.muted,
                        textDecoration: 'none',
                      }}
                    >
                      CSV
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEKCJA 2: Expanded segment */}
      {expandedSegment && (
        <div style={{ marginBottom: 24 }}>
          {segmentLoading && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, textAlign: 'center', fontSize: 13, color: T.muted }}>
              Ładowanie klientów…
            </div>
          )}
          {!segmentLoading && segmentClients && (
            <SegmentTable
              clients={segmentClients}
              segmentKey={expandedSegment}
              onClose={() => { setExpandedSegment(null); setSegmentClients(null); }}
            />
          )}
        </div>
      )}

      {/* SEKCJA 3: Suggested actions */}
      {!loading && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Sugerowane akcje per segment
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {Object.entries(ACTION_SUGGESTIONS).map(([key, s]) => {
              const opp = opportunities.find((o) => o.opportunity_type === key);
              const urg = opp ? URGENCY[opp.urgency] : URGENCY.medium;
              return (
                <div
                  key={key}
                  style={{
                    background: '#faf8f5',
                    border: `1px solid ${T.border}`,
                    borderLeft: `3px solid ${urg.dot}`,
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>
                    {s.title}
                    {opp && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: T.muted }}>
                        ({opp.client_count.toLocaleString('pl-PL')} klientów)
                      </span>
                    )}
                  </div>
                  <ul style={{ margin: '0 0 10px 0', paddingLeft: 18 }}>
                    {s.actions.map((a) => (
                      <li key={a} style={{ fontSize: 12, color: T.text, marginBottom: 3, lineHeight: 1.5 }}>{a}</li>
                    ))}
                  </ul>
                  <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic', marginBottom: 4 }}>
                    Timing: {s.timing}
                  </div>
                  <div style={{ fontSize: 12, color: T.text }}>
                    <strong>Oferta:</strong> {s.offer}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
