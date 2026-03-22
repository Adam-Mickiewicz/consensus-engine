"use client";
import { useState, useRef, useCallback } from "react";
import { useDarkMode } from "../../../../hooks/useDarkMode";
import { parseShoperCSV } from "../../../../../lib/crm/csvParser";
import { flattenShoperCSV } from "../../../../../lib/crm/csvFlatten";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "production" | "sandbox";
type RunState = "idle" | "loading" | "done" | "error";
type CheckStatus = "ok" | "warn" | "danger" | "error" | "na";

interface MonthData { month: string; count: number; }
interface SegRow { legacy_segment: string; count: number; sum_ltv: string; avg_ltv: string; pct: string; }

interface AuditCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  data?: {
    totalEvents?: number; distinctClients?: number; minDate?: string; maxDate?: string;
    months?: MonthData[]; holesZero?: number; holesSparse?: number;
    dupeGroups?: number;
    nullClient?: number; nullDate?: number; nullEan?: number; eanNullPct?: string;
    total360?: number; distinctInEvents?: number; withoutEvents?: number; eventsWithoutProfile?: number;
    unmappedCount?: number; unmappedPurchases?: number;
    segments?: SegRow[];
  };
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const DARK = {
  bg: "#0f1117", card: "#1a1f2e", border: "#2a3050",
  text: "#e2e8f0", textSub: "#8892a4",
  accent: "#6366f1", accentHover: "#4f46e5",
  cardHover: "#1e2438",
};
const LIGHT = {
  bg: "#f1f5f9", card: "#ffffff", border: "#e2e8f0",
  text: "#0f172a", textSub: "#64748b",
  accent: "#6366f1", accentHover: "#4f46e5",
  cardHover: "#f8fafc",
};

const STATUS_COLOR: Record<CheckStatus, string> = {
  ok:     "#22c55e",
  warn:   "#f59e0b",
  danger: "#ef4444",
  error:  "#ef4444",
  na:     "#475569",
};

const STATUS_ICON: Record<CheckStatus, string> = {
  ok:     "✓",
  warn:   "⚠",
  danger: "✕",
  error:  "✕",
  na:     "–",
};

// ─── Month helpers ────────────────────────────────────────────────────────────

function monthsBetween(minDate: string | null | undefined, maxDate: string | null | undefined): string[] {
  if (!minDate || !maxDate) return [];
  const months: string[] = [];
  const start = new Date(minDate.slice(0, 7) + "-01T00:00:00Z");
  const end   = new Date(maxDate.slice(0, 7) + "-01T00:00:00Z");
  let curr = new Date(start);
  while (curr <= end) {
    months.push(curr.toISOString().slice(0, 7));
    curr.setUTCMonth(curr.getUTCMonth() + 1);
  }
  return months;
}

function cellColor(count: number): string {
  if (count === 0)   return "#ef4444";
  if (count < 10)    return "#f59e0b";
  if (count < 100)   return "#60a5fa";
  return "#22c55e";
}

// ─── Sandbox checks ───────────────────────────────────────────────────────────

type FlatItem = { order_id: string; email: string; date: string; sum: number; product_name: string | null; qty: number; price: number; source_file: string; };

function computeSandboxChecks(items: FlatItem[]): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const total = items.length;

  // 1. Overview
  const emails = new Set(items.map(r => r.email).filter(Boolean));
  const dates  = items.map(r => r.date).filter(Boolean).sort();
  const minDate = dates[0] ?? null;
  const maxDate = dates[dates.length - 1] ?? null;
  checks.push({
    id: "overview", label: "Przegląd ogólny", status: "ok",
    message: `${total.toLocaleString("pl-PL")} line-itemów · ${emails.size.toLocaleString("pl-PL")} unikalnych e-maili (klientów) · zakres: ${minDate} → ${maxDate}`,
    data: { totalEvents: total, distinctClients: emails.size, minDate: minDate ?? undefined, maxDate: maxDate ?? undefined },
  });

  // 2. Holes
  const byMonth: Record<string, number> = {};
  for (const r of items) {
    if (!r.date) continue;
    const m = r.date.slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + 1;
  }
  const months   = monthsBetween(minDate, maxDate);
  const monthData = months.map(m => ({ month: m, count: byMonth[m] || 0 }));
  const holesZero   = monthData.filter(m => m.count === 0).length;
  const holesSparse = monthData.filter(m => m.count > 0 && m.count < 10).length;
  const holesStatus: CheckStatus = holesZero > 0 ? "danger" : holesSparse > 0 ? "warn" : "ok";
  checks.push({
    id: "holes", label: "Ciągłość czasowa", status: holesStatus,
    message: holesZero > 0
      ? `${holesZero} miesięcy bez danych · ${holesSparse} z <10 zamówieniami`
      : holesSparse > 0 ? `${holesSparse} miesięcy z <10 zamówieniami`
      : `Brak dziur — ${months.length} miesięcy z danymi`,
    data: { months: monthData, holesZero, holesSparse },
  });

  // 3. Duplicates (email + product_name + date)
  const dupeMap: Record<string, number> = {};
  for (const r of items) {
    const key = (r.email || "") + "|" + (r.product_name || "") + "|" + (r.date || "");
    dupeMap[key] = (dupeMap[key] || 0) + 1;
  }
  const dupeGroups = Object.values(dupeMap).filter(c => c > 1).length;
  const dupeStatus: CheckStatus = dupeGroups >= 100 ? "danger" : dupeGroups > 0 ? "warn" : "ok";
  checks.push({
    id: "duplicates", label: "Duplikaty", status: dupeStatus,
    message: dupeGroups === 0 ? "Brak duplikatów (email, produkt, data)"
      : `${dupeGroups.toLocaleString("pl-PL")} grup duplikatów`,
    data: { dupeGroups },
  });

  // 4. NULLs
  let nullEmail = 0, nullDate = 0, nullProduct = 0;
  for (const r of items) {
    if (!r.email) nullEmail++;
    if (!r.date)  nullDate++;
    if (!r.product_name) nullProduct++;
  }
  const pct = total > 0 ? (nullProduct / total * 100) : 0;
  const nullStatus: CheckStatus = nullEmail > 0 || nullDate > 0 ? "danger"
    : pct >= 20 ? "danger" : pct > 0 ? "warn" : "ok";
  checks.push({
    id: "nulls", label: "Brakujące dane (NULL)", status: nullStatus,
    message: nullEmail > 0 || nullDate > 0
      ? `KRYTYCZNE: ${nullEmail} null email · ${nullDate} null daty`
      : nullProduct > 0 ? `${nullProduct} brakujących nazw produktów (${pct.toFixed(1)}%)`
      : "Brak wartości NULL w kluczowych kolumnach",
    data: { nullClient: nullEmail, nullDate, nullEan: nullProduct, eanNullPct: pct.toFixed(1) },
  });

  // 5–7: N/A
  checks.push({ id: "consistency", label: "Spójność klientów",           status: "na", message: "Niedostępne w trybie piaskownicy — wymaga połączenia z bazą danych" });
  checks.push({ id: "unmapped",    label: "Produkty bez mapowania EAN",   status: "na", message: "Niedostępne w trybie piaskownicy — mapowanie EAN wymaga katalogu produktów" });
  checks.push({ id: "segments",    label: "Segmenty klientów",            status: "na", message: "Niedostępne w trybie piaskownicy — segmentacja odbywa się po ETL" });

  return checks;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeGrid({ months }: { months: MonthData[] }) {
  if (!months.length) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 3 }}>
        {months.map(({ month, count }) => {
          const [yr, mo] = month.split("-");
          const label = `${mo}/${yr.slice(2)}`;
          return (
            <div
              key={month}
              title={`${month}: ${count} eventów`}
              style={{
                background: cellColor(count),
                borderRadius: 3,
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 7,
                color: "#0f1117",
                fontWeight: 700,
                lineHeight: 1.2,
                opacity: count === 0 ? 0.85 : 1,
              }}
            >
              <span>{label}</span>
              <span style={{ fontSize: 6, opacity: 0.85 }}>{count > 999 ? `${Math.round(count / 1000)}k` : count}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        {[
          { color: "#ef4444", label: "0 eventów" },
          { color: "#f59e0b", label: "<10" },
          { color: "#60a5fa", label: "<100" },
          { color: "#22c55e", label: "≥100" },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#8892a4" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SegmentTable({ segments, t }: { segments: SegRow[]; t: typeof DARK }) {
  if (!segments.length) return null;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 }}>
      <thead>
        <tr>
          {["Segment", "Klientów", "%", "LTV suma", "LTV średnia"].map(h => (
            <th key={h} style={{ padding: "6px 10px", color: t.textSub, fontWeight: 500, fontSize: 10, borderBottom: `1px solid ${t.border}`, textAlign: h === "Segment" ? "left" : "right" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {segments.map(s => (
          <tr key={s.legacy_segment}>
            <td style={{ padding: "7px 10px", color: t.text, borderBottom: `1px solid ${t.border}` }}>{s.legacy_segment ?? "—"}</td>
            <td style={{ padding: "7px 10px", color: t.text, borderBottom: `1px solid ${t.border}`, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(s.count).toLocaleString("pl-PL")}</td>
            <td style={{ padding: "7px 10px", color: t.textSub, borderBottom: `1px solid ${t.border}`, textAlign: "right" }}>{s.pct}%</td>
            <td style={{ padding: "7px 10px", color: t.textSub, borderBottom: `1px solid ${t.border}`, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(s.sum_ltv ?? 0).toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł</td>
            <td style={{ padding: "7px 10px", color: t.textSub, borderBottom: `1px solid ${t.border}`, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(s.avg_ltv ?? 0).toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CheckCard({ check, t }: { check: AuditCheck; t: typeof DARK }) {
  const [open, setOpen] = useState(false);
  const sc = STATUS_COLOR[check.status];
  const hasData = check.data && Object.keys(check.data).length > 0;

  const renderData = () => {
    if (!check.data) return null;
    const d = check.data;

    if (check.id === "overview") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginTop: 12 }}>
          {[
            { label: "Eventy", val: d.totalEvents?.toLocaleString("pl-PL") },
            { label: "Klienci (distinct)", val: d.distinctClients?.toLocaleString("pl-PL") },
            { label: "Od", val: d.minDate },
            { label: "Do", val: d.maxDate },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 7, padding: "10px 12px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.text, fontVariantNumeric: "tabular-nums" }}>{val ?? "—"}</div>
              <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      );
    }

    if (check.id === "holes" && d.months) {
      return <TimeGrid months={d.months} />;
    }

    if (check.id === "nulls") {
      return (
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: "null client_id / email", val: d.nullClient },
            { label: "null order_date", val: d.nullDate },
            { label: "null EAN / produkt", val: d.nullEan },
            { label: "% null EAN", val: `${d.eanNullPct}%` },
          ].map(({ label, val }) => (
            <div key={label} style={{ minWidth: 110 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: (Number(val) || 0) > 0 ? STATUS_COLOR.danger : t.text, fontVariantNumeric: "tabular-nums" }}>{String(val ?? 0)}</div>
              <div style={{ fontSize: 10, color: t.textSub }}>{label}</div>
            </div>
          ))}
        </div>
      );
    }

    if (check.id === "consistency") {
      return (
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { label: "clients_360", val: d.total360 },
            { label: "z eventami", val: d.distinctInEvents },
            { label: "bez eventów", val: d.withoutEvents },
            { label: "eventy bez profilu", val: d.eventsWithoutProfile },
          ].map(({ label, val }) => (
            <div key={label} style={{ minWidth: 110 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.text, fontVariantNumeric: "tabular-nums" }}>{(val ?? 0).toLocaleString("pl-PL")}</div>
              <div style={{ fontSize: 10, color: t.textSub }}>{label}</div>
            </div>
          ))}
        </div>
      );
    }

    if (check.id === "unmapped") {
      return (
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          {[
            { label: "Unikalne nazwy bez EAN", val: d.unmappedCount?.toLocaleString("pl-PL") },
            { label: "Zakupy bez taksonomii", val: d.unmappedPurchases?.toLocaleString("pl-PL") },
          ].map(({ label, val }) => (
            <div key={label} style={{ minWidth: 120 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{val ?? "0"}</div>
              <div style={{ fontSize: 10, color: t.textSub }}>{label}</div>
            </div>
          ))}
        </div>
      );
    }

    if (check.id === "segments" && d.segments) {
      return <SegmentTable segments={d.segments} t={t} />;
    }

    if (check.id === "duplicates") {
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: d.dupeGroups === 0 ? STATUS_COLOR.ok : STATUS_COLOR.danger }}>{(d.dupeGroups ?? 0).toLocaleString("pl-PL")}</div>
          <div style={{ fontSize: 10, color: t.textSub }}>grup duplikatów (client_id · ean · order_date)</div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ display: "flex", background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
      <div style={{ width: 4, background: sc, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: sc + "22", color: sc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {STATUS_ICON[check.status]}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{check.label}</span>
            </div>
            <div style={{ fontSize: 13, color: t.textSub, paddingLeft: 28 }}>{check.message}</div>
          </div>
          {hasData && check.status !== "na" && (
            <button
              onClick={() => setOpen(o => !o)}
              style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontSize: 11, padding: "2px 6px", borderRadius: 4, flexShrink: 0, transition: "color 0.1s" }}
            >
              {open ? "Zwiń ▲" : "Szczegóły ▼"}
            </button>
          )}
        </div>
        {open && <div style={{ paddingLeft: 28 }}>{renderData()}</div>}
      </div>
    </div>
  );
}

function SummaryBar({ checks, t }: { checks: AuditCheck[]; t: typeof DARK }) {
  const okCount      = checks.filter(c => c.status === "ok").length;
  const warnCount    = checks.filter(c => c.status === "warn").length;
  const dangerCount  = checks.filter(c => c.status === "danger" || c.status === "error").length;
  const overallColor = dangerCount > 0 ? STATUS_COLOR.danger : warnCount > 0 ? STATUS_COLOR.warn : STATUS_COLOR.ok;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", background: overallColor + "15", border: `1px solid ${overallColor}44`, borderRadius: 8, marginBottom: 20, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: overallColor }}>
        {dangerCount > 0 ? "Wykryto błędy" : warnCount > 0 ? "Ostrzeżenia" : "Wszystko OK"}
      </span>
      <span style={{ fontSize: 12, color: t.textSub }}>
        <span style={{ color: STATUS_COLOR.ok, fontWeight: 600 }}>{okCount} ok</span>
        {" · "}
        <span style={{ color: STATUS_COLOR.warn, fontWeight: 600 }}>{warnCount} ostrzeżeń</span>
        {" · "}
        <span style={{ color: STATUS_COLOR.danger, fontWeight: 600 }}>{dangerCount} błędów</span>
      </span>
    </div>
  );
}

function DropZone({ onFile, dragOver, setDragOver, t }: {
  onFile: (f: File) => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  t: typeof DARK;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.toLowerCase().endsWith(".csv")) onFile(f);
  }, [onFile, setDragOver]);

  return (
    <div
      onClick={() => ref.current?.click()}
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && ref.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? t.accent : t.border}`,
        borderRadius: 10,
        background: dragOver ? t.accent + "0d" : t.card,
        padding: "48px 24px",
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 4 }}>Przeciągnij plik CSV lub kliknij</div>
      <div style={{ fontSize: 12, color: t.textSub }}>Eksport Shoper — jeden plik, tylko podgląd (dane nie trafiają do bazy)</div>
      <input ref={ref} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [darkRaw] = useDarkMode();
  const dark = darkRaw as boolean;
  const t = dark ? DARK : LIGHT;

  const [mode, setMode]         = useState<Mode>("production");
  const [runState, setRunState] = useState<RunState>("idle");
  const [checks, setChecks]     = useState<AuditCheck[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [csvFile, setCsvFile]   = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [parseInfo, setParseInfo]     = useState<string | null>(null);

  // Production audit
  async function runProductionAudit() {
    setRunState("loading");
    setChecks([]);
    setError(null);
    setGeneratedAt(null);
    try {
      const res = await fetch("/api/crm/audit");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setChecks(data.checks);
      setGeneratedAt(data.generatedAt);
      setRunState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd połączenia z serwerem");
      setRunState("error");
    }
  }

  // Sandbox CSV audit
  async function runSandboxAudit(file: File) {
    setRunState("loading");
    setChecks([]);
    setError(null);
    setGeneratedAt(null);
    setParseInfo(null);
    try {
      const text = await file.text();
      const rows = parseShoperCSV(text, file.name);
      const items = flattenShoperCSV(rows) as FlatItem[];
      setParseInfo(`${rows.length} wierszy CSV → ${items.length} line-itemów`);
      const result = computeSandboxChecks(items);
      setChecks(result);
      setGeneratedAt(new Date().toISOString());
      setRunState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd parsowania pliku");
      setRunState("error");
    }
  }

  function resetAll() {
    setRunState("idle");
    setChecks([]);
    setError(null);
    setCsvFile(null);
    setGeneratedAt(null);
    setParseInfo(null);
  }

  function switchMode(m: Mode) {
    setMode(m);
    resetAll();
  }

  const activeSubs = checks.filter(c => c.status !== "na");

  return (
    <>
      <style>{`
        .aud-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 860px; }
        .aud-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .aud-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 24px; }
        .aud-tabs { display: flex; gap: 4px; margin-bottom: 24px; background: ${t.card}; border: 1px solid ${t.border}; border-radius: 10px; padding: 4px; width: fit-content; }
        .aud-tab { padding: 8px 20px; border-radius: 7px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; background: none; color: ${t.textSub}; transition: background 0.15s, color 0.15s; font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .aud-tab:hover { color: ${t.text}; }
        .aud-tab.active { background: ${t.accent}; color: #fff; font-weight: 600; }
        .aud-btn { padding: 10px 22px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-geist-sans), system-ui, sans-serif; transition: opacity 0.15s, background 0.15s; }
        .aud-btn-primary { background: ${t.accent}; color: #fff; }
        .aud-btn-primary:hover:not(:disabled) { background: ${t.accentHover}; }
        .aud-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .aud-btn-ghost { background: transparent; color: ${t.textSub}; border: 1px solid ${t.border}; }
        .aud-btn-ghost:hover { color: ${t.text}; background: ${t.cardHover}; }
        .aud-spinner { width: 16px; height: 16px; border: 2px solid ${t.accent}44; border-top-color: ${t.accent}; border-radius: 50%; animation: aud-spin 0.7s linear infinite; display: inline-block; flex-shrink: 0; }
        @keyframes aud-spin { to { transform: rotate(360deg); } }
        .aud-loading { display: flex; align-items: center; gap: 12px; padding: 40px 0; color: ${t.textSub}; font-size: 14px; }
        .aud-error { padding: 14px 18px; background: #ef444411; border: 1px solid #ef444444; border-radius: 8px; color: #ef4444; font-size: 13px; }
        .aud-ts { font-size: 11px; color: ${t.textSub}; margin-bottom: 16px; }
        .aud-file-info { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: ${t.card}; border: 1px solid ${t.border}; border-radius: 8px; margin-bottom: 14px; }
        .aud-file-name { flex: 1; color: ${t.text}; font-size: 13px; font-weight: 500; }
        .aud-file-rm { background: none; border: none; color: ${t.textSub}; cursor: pointer; font-size: 18px; line-height: 1; padding: 0 2px; }
        .aud-file-rm:hover { color: #ef4444; }
        .aud-actions { display: flex; gap: 10px; align-items: center; margin-top: 16px; flex-wrap: wrap; }
        .aud-parse-info { font-size: 11px; color: ${t.textSub}; }
      `}</style>

      <div className="aud-wrap">
        <h1 className="aud-title">Audit danych</h1>
        <p className="aud-sub">Weryfikacja jakości danych — spójność, duplikaty, dziury czasowe, braki NULL</p>

        {/* Tabs */}
        <div className="aud-tabs">
          <button className={"aud-tab" + (mode === "production" ? " active" : "")} onClick={() => switchMode("production")}>
            🗄 Baza produkcyjna
          </button>
          <button className={"aud-tab" + (mode === "sandbox" ? " active" : "")} onClick={() => switchMode("sandbox")}>
            🧪 Piaskownica CSV
          </button>
        </div>

        {/* ── Production mode ─────────────────────────────────────────── */}
        {mode === "production" && (
          <div>
            {runState === "idle" && (
              <button className="aud-btn aud-btn-primary" onClick={runProductionAudit}>
                Uruchom audit
              </button>
            )}

            {runState === "loading" && (
              <div className="aud-loading">
                <span className="aud-spinner" />
                <span>Pobieranie danych z bazy… (może potrwać kilka sekund)</span>
              </div>
            )}

            {runState === "done" && (
              <div className="aud-actions" style={{ marginBottom: 20, marginTop: 0 }}>
                <button className="aud-btn aud-btn-ghost" onClick={runProductionAudit}>↻ Uruchom ponownie</button>
              </div>
            )}

            {runState === "error" && (
              <div style={{ marginBottom: 16 }}>
                <div className="aud-error">⚠ {error}</div>
                <div className="aud-actions" style={{ marginTop: 10 }}>
                  <button className="aud-btn aud-btn-ghost" onClick={runProductionAudit}>Spróbuj ponownie</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sandbox mode ─────────────────────────────────────────────── */}
        {mode === "sandbox" && (
          <div>
            {!csvFile && (
              <DropZone onFile={f => setCsvFile(f)} dragOver={dragOver} setDragOver={setDragOver} t={t} />
            )}

            {csvFile && (
              <>
                <div className="aud-file-info">
                  <span style={{ fontSize: 18 }}>📄</span>
                  <span className="aud-file-name">{csvFile.name}</span>
                  <span style={{ fontSize: 11, color: t.textSub }}>{(csvFile.size / 1024).toFixed(0)} KB</span>
                  <button className="aud-file-rm" onClick={resetAll} aria-label="Usuń plik">×</button>
                </div>

                {runState === "idle" && (
                  <div className="aud-actions">
                    <button className="aud-btn aud-btn-primary" onClick={() => runSandboxAudit(csvFile)}>
                      Uruchom audit lokalnie
                    </button>
                    <button className="aud-btn aud-btn-ghost" onClick={resetAll}>Wyczyść</button>
                  </div>
                )}

                {runState === "loading" && (
                  <div className="aud-loading">
                    <span className="aud-spinner" />
                    <span>Parsowanie i analiza CSV…</span>
                  </div>
                )}

                {runState === "done" && (
                  <div className="aud-actions" style={{ marginBottom: 20 }}>
                    {parseInfo && <span className="aud-parse-info">{parseInfo} ·</span>}
                    <button className="aud-btn aud-btn-ghost" onClick={() => runSandboxAudit(csvFile)}>↻ Uruchom ponownie</button>
                    <button className="aud-btn aud-btn-ghost" onClick={resetAll}>Wyczyść</button>
                  </div>
                )}

                {runState === "error" && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="aud-error">⚠ {error}</div>
                    <div className="aud-actions" style={{ marginTop: 10 }}>
                      <button className="aud-btn aud-btn-ghost" onClick={() => runSandboxAudit(csvFile)}>Spróbuj ponownie</button>
                      <button className="aud-btn aud-btn-ghost" onClick={resetAll}>Wyczyść</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {checks.length > 0 && (
          <>
            {generatedAt && (
              <div className="aud-ts">
                Wygenerowano: {new Date(generatedAt).toLocaleString("pl-PL")}
                {mode === "sandbox" && " · Tryb piaskownicy — dane lokalne, nie zapisano do bazy"}
              </div>
            )}

            <SummaryBar checks={activeSubs} t={t} />

            {checks.map(check => (
              <CheckCard key={check.id} check={check} t={t} />
            ))}
          </>
        )}
      </div>
    </>
  );
}
