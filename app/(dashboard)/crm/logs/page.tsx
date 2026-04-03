'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Check {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'danger' | 'error';
  message: string;
  data?: any;
}

interface AuditData {
  checks: Check[];
  generatedAt: string;
  error?: string;
}

interface ImportRun {
  id: string;
  status: string;
  rows_upserted: number;
  triggered_at: string;
  error_message: string | null;
  filename: string | null;
  clients_count: number | null;
  unmapped_count: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function Badge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, { bg: string; color: string; text: string }> = {
    ok:     { bg: 'rgba(45,138,78,0.1)',  color: '#2d8a4e', text: 'OK' },
    warn:   { bg: 'rgba(230,168,23,0.1)', color: '#e6a817', text: 'WARN' },
    danger: { bg: 'rgba(221,68,68,0.1)',  color: '#dd4444', text: 'BŁĄD' },
    error:  { bg: 'rgba(221,68,68,0.1)',  color: '#dd4444', text: 'ERROR' },
    success:{ bg: 'rgba(45,138,78,0.1)',  color: '#2d8a4e', text: 'OK' },
    failed: { bg: 'rgba(221,68,68,0.1)',  color: '#dd4444', text: 'FAIL' },
    running:{ bg: 'rgba(53,119,179,0.1)', color: '#3577b3', text: 'W TOKU' },
  };
  const s = map[status] ?? { bg: 'rgba(107,107,107,0.1)', color: '#6b6b6b', text: status };
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, fontFamily: "'IBM Plex Mono', monospace" }}>
      {label ?? s.text}
    </span>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#1a1a1a', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────

const TABLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const TH: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6b6b', fontFamily: "'IBM Plex Mono', monospace", borderBottom: '1px solid #e8e0d8' };
const TD: React.CSSProperties = { padding: '8px', borderBottom: '1px solid #f0ece6', verticalAlign: 'top' };

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiGrid({ items }: { items: { label: string; value: string | number; sub?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {items.map(({ label, value, sub }) => (
        <div key={label} style={{ background: '#faf8f5', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#6b6b6b', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: '#6b6b6b', marginTop: 2 }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  const sk: React.CSSProperties = { background: 'linear-gradient(90deg,#e8e0d8 25%,#f0ece6 50%,#e8e0d8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite', borderRadius: 8 };
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ height: 32, width: 280, ...sk, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[...Array(4)].map((_, i) => <div key={i} style={{ ...sk, height: 80 }} />)}
      </div>
      {[300, 220, 180, 260, 140].map((h, i) => <div key={i} style={{ ...sk, height: h, marginBottom: 16 }} />)}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [actionLog, setActionLog] = useState<{ ts: string; label: string; ok: boolean; msg: string }[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/audit')
      .then(r => r.json())
      .then(d => { setAudit(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runAction(key: string, label: string, url: string) {
    setRefreshing(prev => ({ ...prev, [key]: true }));
    try {
      const r = await fetch(url, { method: 'POST' });
      const d = await r.json();
      const ok = r.ok && !d.error;
      setActionLog(prev => [{ ts: new Date().toLocaleTimeString('pl-PL'), label, ok, msg: d.error ?? d.message ?? (ok ? 'Sukces' : 'Błąd') }, ...prev].slice(0, 20));
      if (ok) load();
    } catch (e: any) {
      setActionLog(prev => [{ ts: new Date().toLocaleTimeString('pl-PL'), label, ok: false, msg: e.message }, ...prev].slice(0, 20));
    } finally {
      setRefreshing(prev => ({ ...prev, [key]: false }));
    }
  }

  if (loading) return <Skeleton />;

  const checks = audit?.checks ?? [];

  // Extract data from checks
  const overview   = checks.find(c => c.id === 'overview');
  const qualityIds = ['holes', 'duplicates', 'nulls', 'consistency', 'monthly_ean_quality', 'ltv_consistency', 'first_last_order_sanity', 'segments'];
  const quality    = checks.filter(c => qualityIds.includes(c.id));
  const history    = checks.find(c => c.id === 'import_history');
  const missing    = checks.filter(c => ['nulls', 'unmapped'].includes(c.id));
  const runs: ImportRun[] = history?.data?.runs ?? [];

  // KPI cards
  const kpiItems = [
    { label: 'Eventów',     value: (overview?.data?.totalEvents ?? 0).toLocaleString('pl-PL') },
    { label: 'Klientów',    value: (overview?.data?.distinctClients ?? 0).toLocaleString('pl-PL') },
    { label: 'Dane od',     value: overview?.data?.minDate ? fmtDateShort(overview.data.minDate) : '—' },
    { label: 'Dane do',     value: overview?.data?.maxDate ? fmtDateShort(overview.data.maxDate) : '—' },
  ];

  // Overall system status
  const hasErrors  = checks.some(c => c.status === 'danger' || c.status === 'error');
  const hasWarnings= checks.some(c => c.status === 'warn');
  const sysStatus  = hasErrors ? 'danger' : hasWarnings ? 'warn' : 'ok';

  const manualActions = [
    { key: 'refresh_views',    label: 'Odśwież widoki CRM',   desc: 'refresh_crm_views()',         url: '/api/crm/recalculate-ltv' },
    { key: 'refresh_views2',   label: 'Odśwież matviews',     desc: 'Wszystkie zmaterializowane',  url: '/api/crm/refresh-views' },
    { key: 'recalc_full',      label: 'Przelicz LTV (pełne)', desc: 'recalculate_all_ltv()',        url: '/api/crm/recalculate-ltv-full' },
    { key: 'deduplicate',      label: 'Deduplikuj eventy',    desc: 'Usuń duplikaty z eventów',    url: '/api/crm/deduplicate' },
    { key: 'fix_historical',   label: 'Fix historical data',  desc: 'Napraw historyczne daty',     url: '/api/crm/fix-historical' },
    { key: 'segment_recalc',   label: 'Przelicz segmenty',    desc: 'Przeliczy RFM i legacy',      url: '/api/crm/rfm' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#1a1a1a', margin: 0 }}>Logi systemu</h1>
          {audit?.generatedAt && (
            <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>
              Ostatni audyt: {fmtDate(audit.generatedAt)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge status={sysStatus} label={sysStatus === 'ok' ? 'System OK' : sysStatus === 'warn' ? 'Ostrzeżenia' : 'Błędy krytyczne'} />
          <button
            onClick={load}
            style={{ padding: '7px 16px', border: '1px solid #e8e0d8', background: '#fff', borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#6b6b6b', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Odśwież
          </button>
        </div>
      </div>

      {/* Stan systemu — KPI */}
      <Card title="Stan systemu">
        <KpiGrid items={kpiItems} />
      </Card>

      {/* Jakość danych */}
      <Card title="Jakość danych">
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={TH}>Kontrola</th>
              <th style={{ ...TH, textAlign: 'center', width: 80 }}>Status</th>
              <th style={TH}>Szczegóły</th>
            </tr>
          </thead>
          <tbody>
            {quality.map(c => (
              <tr key={c.id}>
                <td style={{ ...TD, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap' }}>{c.label}</td>
                <td style={{ ...TD, textAlign: 'center' }}><Badge status={c.status} /></td>
                <td style={{ ...TD, color: '#444', fontSize: 12 }}>{c.message}</td>
              </tr>
            ))}
            {quality.length === 0 && (
              <tr><td colSpan={3} style={{ ...TD, color: '#999', textAlign: 'center' }}>Brak danych jakości</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Harmonogram */}
      <Card title="Harmonogram odświeżeń">
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={TH}>Widok / Funkcja</th>
              <th style={TH}>Typ</th>
              <th style={TH}>Częstotliwość</th>
              <th style={TH}>Wyzwalacz</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'refresh_crm_views()',        type: 'Procedura SQL',    freq: 'Na żądanie',     trigger: 'Po imporcie CSV / ręcznie' },
              { name: 'crm_segments',               type: 'Widok materializ.',freq: 'Na żądanie',     trigger: 'Po recalculate-ltv' },
              { name: 'crm_lifecycle_funnel',       type: 'Widok materializ.',freq: 'Na żądanie',     trigger: 'Po refresh_crm_views' },
              { name: 'crm_cohort_retention',       type: 'Widok materializ.',freq: 'Na żądanie',     trigger: 'Po refresh_crm_views' },
              { name: 'crm_promo_dependency',       type: 'Widok materializ.',freq: 'Na żądanie',     trigger: 'Po refresh_crm_views' },
              { name: 'crm_time_to_second_order',   type: 'Widok materializ.',freq: 'Na żądanie',     trigger: 'Po refresh_crm_views' },
              { name: 'recalculate_all_ltv()',      type: 'Procedura SQL',    freq: 'Po imporcie',    trigger: 'Ręcznie lub po imporcie CSV' },
              { name: 'clients_360',                type: 'Widok',            freq: 'Automatyczny',   trigger: 'Po zmianie danych źródłowych' },
            ].map(row => (
              <tr key={row.name}>
                <td style={{ ...TD, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{row.name}</td>
                <td style={{ ...TD, color: '#6b6b6b' }}>{row.type}</td>
                <td style={{ ...TD }}>{row.freq}</td>
                <td style={{ ...TD, color: '#6b6b6b', fontSize: 12 }}>{row.trigger}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Historia importów */}
      <Card title="Historia importów CSV">
        {runs.length > 0 ? (
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={TH}>Data</th>
                <th style={TH}>Plik</th>
                <th style={{ ...TH, textAlign: 'right' }}>Wiersze</th>
                <th style={{ ...TH, textAlign: 'right' }}>Klienci</th>
                <th style={{ ...TH, textAlign: 'right' }}>Unmapped</th>
                <th style={{ ...TH, textAlign: 'center' }}>Status</th>
                <th style={TH}>Błąd</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 30).map(r => (
                <tr key={r.id}>
                  <td style={{ ...TD, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(r.triggered_at)}</td>
                  <td style={{ ...TD, fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filename ?? '—'}</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}>{(r.rows_upserted ?? 0).toLocaleString('pl-PL')}</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}>{r.clients_count != null ? r.clients_count.toLocaleString('pl-PL') : '—'}</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace', color: r.unmapped_count && r.unmapped_count > 50 ? '#dd4444' : '#1a1a1a" }}>{r.unmapped_count != null ? r.unmapped_count : '—'}</td>
                  <td style={{ ...TD, textAlign: 'center' }}><Badge status={r.status === 'success' ? 'ok' : r.status === 'failed' ? 'danger' : r.status} /></td>
                  <td style={{ ...TD, fontSize: 11, color: '#dd4444', maxWidth: 200 }}>{r.error_message ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: 24 }}>Brak historii importów</div>
        )}
      </Card>

      {/* Braki */}
      <Card title="Braki danych">
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={TH}>Problem</th>
              <th style={{ ...TH, textAlign: 'center', width: 80 }}>Status</th>
              <th style={TH}>Opis</th>
              <th style={TH}>Akcja</th>
            </tr>
          </thead>
          <tbody>
            {missing.map(c => (
              <tr key={c.id}>
                <td style={{ ...TD, fontWeight: 600 }}>{c.label}</td>
                <td style={{ ...TD, textAlign: 'center' }}><Badge status={c.status} /></td>
                <td style={{ ...TD, fontSize: 12, color: '#444' }}>{c.message}</td>
                <td style={{ ...TD, fontSize: 12 }}>
                  {c.id === 'unmapped' && c.status !== 'ok' && (
                    <a href="/crm/import/unmapped" style={{ color: '#b8763a', textDecoration: 'none', fontSize: 12 }}>→ Mapuj EAN</a>
                  )}
                  {c.id === 'nulls' && c.status !== 'ok' && (
                    <a href="/crm/import" style={{ color: '#b8763a', textDecoration: 'none', fontSize: 12 }}>→ Importuj dane</a>
                  )}
                </td>
              </tr>
            ))}
            {missing.length === 0 && (
              <tr><td colSpan={4} style={{ ...TD, color: '#999', textAlign: 'center' }}>Brak danych</td></tr>
            )}
          </tbody>
        </table>
        {/* EAN per-month quality */}
        {(() => {
          const eanCheck = checks.find(c => c.id === 'monthly_ean_quality');
          const eanMonths: any[] = eanCheck?.data?.eanMonths ?? [];
          const bad = eanMonths.filter(m => m.pct_null_ean > 15);
          if (bad.length === 0) return null;
          return (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Miesiące z wysokim % null EAN (&gt;15%)</div>
              <table style={TABLE}>
                <thead>
                  <tr>
                    <th style={TH}>Miesiąc</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Eventy</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Null EAN</th>
                    <th style={{ ...TH, textAlign: 'right' }}>% null</th>
                  </tr>
                </thead>
                <tbody>
                  {bad.map((m: any) => (
                    <tr key={m.month}>
                      <td style={{ ...TD, fontFamily: "'IBM Plex Mono', monospace" }}>{m.month}</td>
                      <td style={{ ...TD, textAlign: 'right' }}>{m.eventy.toLocaleString('pl-PL')}</td>
                      <td style={{ ...TD, textAlign: 'right' }}>{m.null_ean.toLocaleString('pl-PL')}</td>
                      <td style={{ ...TD, textAlign: 'right', color: m.pct_null_ean > 50 ? '#dd4444' : '#e6a817', fontWeight: 600 }}>{m.pct_null_ean}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Card>

      {/* Ręczne akcje */}
      <Card title="Ręczne akcje">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: actionLog.length > 0 ? 16 : 0 }}>
          {manualActions.map(action => {
            const busy = !!refreshing[action.key];
            return (
              <button
                key={action.key}
                onClick={() => runAction(action.key, action.label, action.url)}
                disabled={busy}
                style={{
                  border: '1px solid #e8e0d8',
                  borderRadius: 6,
                  padding: '10px 16px',
                  background: '#fff',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  textAlign: 'left',
                  opacity: busy ? 0.5 : 1,
                  transition: 'background 0.15s',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={e => { if (!busy) (e.currentTarget as HTMLButtonElement).style.background = '#faf8f5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
              >
                <div style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>
                  {busy ? '⟳ ' : ''}{action.label}
                </div>
                <div style={{ fontSize: 11, color: '#6b6b6b', fontFamily: "'IBM Plex Mono', monospace" }}>{action.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Action log */}
        {actionLog.length > 0 && (
          <div style={{ borderTop: '1px solid #f0ece6', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6b6b', marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>LOG AKCJI</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {actionLog.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: '#6b6b6b', fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>{entry.ts}</span>
                  <Badge status={entry.ok ? 'ok' : 'danger'} label={entry.ok ? 'OK' : 'FAIL'} />
                  <span style={{ color: '#1a1a1a' }}>{entry.label}</span>
                  {entry.msg && entry.msg !== 'Sukces' && <span style={{ color: '#6b6b6b' }}>— {entry.msg}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
