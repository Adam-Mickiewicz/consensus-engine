"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";

// ─── Data overview types ──────────────────────────────────────────────────────
interface DataOverview {
  summary: { clients: number; events: number; products: number; promotions: number; dateFrom: string | null; dateTo: string | null };
  granulation: { period: string; clients: number; orders: number; revenue: number; avg_aov: number }[];
  quality: { ean_pct: number; promo_pct: number };
}

const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", kpi: "#faf9f7",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", kpi: "#0d0d0c",
};


async function compressFile(file: File): Promise<File> {
  const stream = file.stream().pipeThrough(new CompressionStream("gzip"));
  const blob = await new Response(stream).blob();
  return new File([blob], file.name + ".gz", { type: "application/gzip" });
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type FileEntry = { file: File; id: string };
type RunStatus = "idle" | "running" | "done" | "error";
type SyncLogRow = {
  id: number;
  source: string;
  status: string;
  rows_upserted: number;
  triggered_at: string;
  error_message?: string;
  meta?: Record<string, unknown>;
};

export default function ImportPage() {
  const dark = false;
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [syncLogs, setSyncLogs] = useState<SyncLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveResult, setLiveResult] = useState<Record<string, unknown> | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  const [overview, setOverview] = useState<DataOverview | null>(null);
  const [granularity, setGranularity] = useState('yearly');
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [eanGaps, setEanGaps] = useState<{ product_name: string; event_count: number; unique_buyers: number }[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    setFiles((prev) => {
      const existingNames = new Set(prev.map((e) => e.file.name));
      const fresh = arr
        .filter((f) => !existingNames.has(f.name))
        .map((f) => ({ file: f, id: `${f.name}-${f.size}` }));
      return [...prev, ...fresh];
    });
  }, []);

  const removeFile = (id: string) => setFiles((prev) => prev.filter((e) => e.id !== id));

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  const loadSyncLog = useCallback(async () => {
    setLogsLoading(true);
    const { data } = await supabase
      .from("sync_log")
      .select("id, source, status, rows_upserted, triggered_at, error_message, meta")
      .in("source", ["shoper_api", "csv_upload"])
      .order("triggered_at", { ascending: false })
      .limit(10);
    setSyncLogs((data as SyncLogRow[]) ?? []);
    setLogsLoading(false);
  }, []);

  useEffect(() => { loadSyncLog(); }, [loadSyncLog]);

  useEffect(() => {
    setOverviewLoading(true);
    fetch(`/api/crm/import/data-overview?granularity=${granularity}`)
      .then(r => r.json())
      .then(d => { setOverview(d); setOverviewLoading(false); })
      .catch(() => setOverviewLoading(false));
  }, [granularity]);

  useEffect(() => {
    fetch('/api/crm/ean-gaps?limit=10')
      .then(r => r.json())
      .then(d => setEanGaps(d.gaps ?? null))
      .catch(() => {});
  }, []);

  async function handleUpload() {
    if (files.length === 0 || status === "running") return;
    setStatus("running");
    setResult(null);
    setErrorMsg(null);
    setProgressMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token ?? null;

      if (!jwt) {
        setErrorMsg("Zaloguj się, aby importować dane.");
        setStatus("error");
        return;
      }

      let totalProcessed = 0;
      let totalClients = 0;
      let totalEvents = 0;
      let totalUnmapped = 0;
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const { file } = files[i];
        setProgressMsg(`Przetwarzanie plik ${i + 1}/${files.length}: ${file.name}…`);

        const compressed = await compressFile(file);
        const fd = new FormData();
        fd.append("file", compressed);

        try {
          const res = await fetch(`${window.location.origin}/api/etl/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${jwt}`, "X-Content-Encoding": "gzip" },
            body: fd,
          });

          const ct = res.headers.get("content-type") ?? "";
          if (!ct.includes("application/json")) {
            const errText = await res.text().catch(() => "");
            errors.push(`${file.name}: nieoczekiwana odpowiedź (${res.status})`);
            console.error("[ETL upload] non-JSON:", res.status, errText.slice(0, 300));
            continue;
          }

          const json = await res.json();
          if (!res.ok) {
            errors.push(`${file.name}: ${json.error ?? `błąd ${res.status}`}`);
            continue;
          }

          totalProcessed += (json.processed as number) ?? 0;
          totalClients   += (json.clients   as number) ?? 0;
          totalEvents    += (json.events    as number) ?? 0;
          totalUnmapped  += (json.unmapped  as number) ?? 0;
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : "błąd połączenia"}`);
        }
      }

      if (errors.length > 0 && totalProcessed === 0) {
        setErrorMsg(errors.join("\n"));
        setStatus("error");
        return;
      }

      setResult({ processed: totalProcessed, clients: totalClients, events: totalEvents, unmapped: totalUnmapped });
      if (errors.length > 0) setErrorMsg(`Ostrzeżenia (${errors.length} plik/ów):\n${errors.join("\n")}`);
      setStatus("done");
      loadSyncLog();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Błąd połączenia z serwerem.");
      setStatus("error");
    }
  }

  async function handleLiveSync() {
    if (liveRunning) return;
    setLiveRunning(true);
    setLiveResult(null);
    setLiveError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token ?? null;

      if (!jwt) {
        setLiveError("Zaloguj się, aby uruchomić synchronizację.");
        setLiveRunning(false);
        return;
      }

      const res = await fetch(`${window.location.origin}/api/etl/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      });

      const json = await res.json();
      if (!res.ok) setLiveError(json.error ?? "Błąd live sync.");
      else { setLiveResult(json); loadSyncLog(); }
    } catch (err: unknown) {
      setLiveError(err instanceof Error ? err.message : "Błąd połączenia.");
    } finally {
      setLiveRunning(false);
    }
  }

  const borderColor = dragOver ? t.accent : t.border;

  return (
    <>
      <style>{`
        .imp-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 820px; }
        .imp-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .imp-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .imp-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .imp-block { margin-bottom: 32px; }
        .imp-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .imp-dropzone { border: 2px dashed ${borderColor}; border-radius: 10px; background: ${dragOver ? t.accent + "0a" : t.kpi}; padding: 40px 20px; text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
        .imp-dropzone:hover { border-color: ${t.accent}; }
        .imp-drop-icon { font-size: 36px; margin-bottom: 10px; }
        .imp-drop-title { font-size: 15px; font-weight: 600; color: ${t.text}; margin-bottom: 4px; }
        .imp-drop-hint { font-size: 12px; color: ${t.textSub}; }
        .imp-drop-link { color: ${t.accent}; cursor: pointer; text-decoration: underline; }
        .imp-file-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
        .imp-file-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 8px; }
        .imp-file-name { flex: 1; color: ${t.text}; font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .imp-file-size { color: ${t.textSub}; font-size: 11px; min-width: 60px; text-align: right; }
        .imp-file-rm { background: none; border: none; color: ${t.textSub}; cursor: pointer; font-size: 18px; padding: 0 2px; line-height: 1; }
        .imp-file-rm:hover { color: #f87171; }
        .imp-actions { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
        .imp-btn { padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-geist-sans); transition: opacity 0.15s; }
        .imp-btn-primary { background: ${t.accent}; color: #fff; }
        .imp-btn-primary:hover:not(:disabled) { opacity: 0.87; }
        .imp-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
        .imp-btn-ghost { background: transparent; color: ${t.textSub}; border: 1px solid ${t.border}; }
        .imp-btn-ghost:hover { background: ${t.hover}; color: ${t.text}; }
        .imp-spinner { width: 14px; height: 14px; border: 2px solid ${t.accent}44; border-top-color: ${t.accent}; border-radius: 50%; animation: imp-spin 0.7s linear infinite; flex-shrink: 0; display: inline-block; }
        @keyframes imp-spin { to { transform: rotate(360deg); } }
        .imp-progress { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: ${t.accent}11; border: 1px solid ${t.accent}44; border-radius: 8px; margin-top: 14px; font-size: 13px; color: ${t.text}; }
        .imp-result { margin-top: 14px; padding: 16px 20px; background: #34d39911; border: 1px solid #34d39944; border-radius: 8px; }
        .imp-result-title { font-size: 13px; font-weight: 700; color: #34d399; margin-bottom: 10px; }
        .imp-result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
        .imp-result-kpi { text-align: center; padding: 10px; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 7px; }
        .imp-result-val { font-family: var(--font-dm-serif), serif; font-size: 22px; color: ${t.text}; }
        .imp-result-label { font-size: 11px; color: ${t.textSub}; }
        .imp-error { margin-top: 14px; padding: 12px 16px; background: #f8717111; border: 1px solid #f8717144; border-radius: 8px; font-size: 13px; color: #f87171; }
        .imp-live-row { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 20px; gap: 14px; flex-wrap: wrap; }
        .imp-log-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .imp-log-table th { padding: 8px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; border-bottom: 1px solid ${t.border}; text-align: left; }
        .imp-log-table td { padding: 9px 14px; border-bottom: 1px solid ${t.border}; color: ${t.text}; }
        .imp-log-table tr:last-child td { border-bottom: none; }
        .imp-log-badge { display: inline-block; padding: 2px 7px; border-radius: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
      `}</style>

      <div className="imp-wrap">
        <h1 className="imp-title">Import / ETL</h1>
        <p className="imp-sub">Wgraj eksport CSV z Shoper lub uruchom synchronizację live z API</p>

        {/* CSV Upload */}
        <div className="imp-block">
          <div className="imp-section">Import plików CSV</div>

          <div
            className="imp-dropzone"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <div className="imp-drop-icon">📂</div>
            <div className="imp-drop-title">Przeciągnij pliki CSV tutaj</div>
            <div className="imp-drop-hint">
              lub <span className="imp-drop-link">kliknij, aby wybrać</span> — obsługuje wiele plików jednocześnie
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              multiple
              style={{ display: "none" }}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="imp-file-list">
              {files.map(({ file, id }) => (
                <div key={id} className="imp-file-row">
                  <span style={{ fontSize: 15 }}>📄</span>
                  <span className="imp-file-name">{file.name}</span>
                  <span className="imp-file-size">{fmtBytes(file.size)}</span>
                  <button className="imp-file-rm" onClick={() => removeFile(id)} aria-label={`Usuń ${file.name}`}>×</button>
                </div>
              ))}
            </div>
          )}

          <div className="imp-actions">
            <button
              className="imp-btn imp-btn-primary"
              onClick={handleUpload}
              disabled={files.length === 0 || status === "running"}
            >
              {status === "running" ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="imp-spinner" /> Przetwarzam…
                </span>
              ) : `Uruchom ETL (${files.length} ${files.length === 1 ? "plik" : "pliki/plików"})`}
            </button>
            {files.length > 0 && status !== "running" && (
              <button className="imp-btn imp-btn-ghost" onClick={() => { setFiles([]); setResult(null); setErrorMsg(null); setStatus("idle"); }}>
                Wyczyść
              </button>
            )}
          </div>

          {status === "running" && (
            <div className="imp-progress">
              <span className="imp-spinner" />
              {progressMsg || "Przygotowywanie…"}
            </div>
          )}

          {status === "done" && result && (
            <div className="imp-result">
              <div className="imp-result-title">✓ ETL zakończony pomyślnie</div>
              <div className="imp-result-grid">
                {[
                  { label: "Przetworzone line-items", val: result.processed as number },
                  { label: "Klientów (upsert)", val: result.clients as number },
                  { label: "Eventów produktowych", val: result.events as number },
                  { label: "Produktów bez mapowania", val: result.unmapped as number, warn: true },
                ].map((k) => (
                  <div key={k.label} className="imp-result-kpi">
                    <div className="imp-result-val" style={{ color: k.warn && (k.val as number) > 0 ? "#f97316" : undefined }}>
                      {((k.val as number) ?? 0).toLocaleString("pl-PL")}
                    </div>
                    <div className="imp-result-label">{k.label}</div>
                  </div>
                ))}
              </div>
              {(result.unmapped as number) > 0 && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid #f9731633` }}>
                  <Link
                    href="/crm/import/unmapped"
                    style={{ fontSize: 13, color: "#f97316", textDecoration: "none", fontWeight: 600 }}
                  >
                    Zobacz {(result.unmapped as number).toLocaleString("pl-PL")} produktów bez mapowania →
                  </Link>
                </div>
              )}
            </div>
          )}

          {status === "error" && errorMsg && (
            <div className="imp-error">⚠ {errorMsg}</div>
          )}
        </div>

        {/* Live Sync */}
        <div className="imp-block">
          <div className="imp-section">Live Sync — Shoper API</div>
          <div className="imp-card">
            <div className="imp-live-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>
                  Synchronizacja z Shoper API
                </div>
                <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5 }}>
                  Pobiera zamówienia od daty ostatniego runu i uruchamia pełny ETL pipeline.
                  Wymaga zmiennych środowiskowych: <code style={{ fontSize: 11, color: t.accent }}>SHOPER_URL</code>, <code style={{ fontSize: 11, color: t.accent }}>SHOPER_CLIENT_ID</code>, <code style={{ fontSize: 11, color: t.accent }}>SHOPER_CLIENT_SECRET</code>.
                </div>
                {liveResult && (
                  <div style={{ fontSize: 12, color: "#34d399", marginTop: 8 }}>
                    ✓ {liveResult.processed as number} line-items, {liveResult.clients as number} klientów zaktualizowanych
                  </div>
                )}
                {liveError && (
                  <div style={{ fontSize: 12, color: "#f87171", marginTop: 8 }}>⚠ {liveError}</div>
                )}
              </div>
              <button
                className="imp-btn imp-btn-primary"
                onClick={handleLiveSync}
                disabled={liveRunning}
                style={{ flexShrink: 0 }}
              >
                {liveRunning ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="imp-spinner" /> Synchronizuję…
                  </span>
                ) : "Uruchom teraz"}
              </button>
            </div>
          </div>
        </div>

        {/* Przegląd danych */}
        <div className="imp-block">
          <div className="imp-section">Przegląd danych</div>
          {overviewLoading && <div style={{ color: t.textSub, fontSize: 13 }}>Ładowanie…</div>}
          {!overviewLoading && overview && (
            <div>
              {/* Summary KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Klienci", val: overview.summary.clients.toLocaleString("pl-PL") },
                  { label: "Zamówienia", val: overview.summary.events.toLocaleString("pl-PL") },
                  { label: "Produkty", val: overview.summary.products.toLocaleString("pl-PL") },
                  { label: "Promocje", val: overview.summary.promotions.toLocaleString("pl-PL") },
                  { label: "Okres", val: overview.summary.dateFrom && overview.summary.dateTo
                    ? `${new Date(overview.summary.dateFrom).getFullYear()}–${new Date(overview.summary.dateTo).getFullYear()}`
                    : "—" },
                ].map(k => (
                  <div key={k.label} className="imp-result-kpi">
                    <div className="imp-result-val">{k.val}</div>
                    <div className="imp-result-label">{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Granularity buttons */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[
                  { key: "yearly", label: "Roczna" },
                  { key: "quarterly", label: "Kwartalna" },
                  { key: "monthly", label: "Miesięczna" },
                ].map(g => (
                  <button
                    key={g.key}
                    onClick={() => setGranularity(g.key)}
                    style={{
                      padding: "5px 14px", border: `1px solid ${granularity === g.key ? t.accent : t.border}`,
                      borderRadius: 4, background: granularity === g.key ? t.accent : t.surface,
                      color: granularity === g.key ? "#fff" : t.textSub, fontSize: 12,
                      cursor: "pointer", fontFamily: "IBM Plex Mono, monospace",
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              {/* Granulation table */}
              <div className="imp-card" style={{ marginBottom: 16 }}>
                <table className="imp-log-table">
                  <thead>
                    <tr>
                      <th>Okres</th>
                      <th style={{ textAlign: "right" }}>Klienci</th>
                      <th style={{ textAlign: "right" }}>Zamówienia</th>
                      <th style={{ textAlign: "right" }}>Przychód</th>
                      <th style={{ textAlign: "right" }}>Śr. AOV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.granulation.map(row => (
                      <tr key={row.period}>
                        <td style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>{row.period}</td>
                        <td style={{ textAlign: "right" }}>{Number(row.clients).toLocaleString("pl-PL")}</td>
                        <td style={{ textAlign: "right" }}>{Number(row.orders).toLocaleString("pl-PL")}</td>
                        <td style={{ textAlign: "right", color: t.accent, fontWeight: 600 }}>
                          {Number(row.revenue) >= 1_000_000
                            ? (Number(row.revenue) / 1_000_000).toFixed(1) + " mln zł"
                            : Number(row.revenue) >= 1_000
                            ? Math.round(Number(row.revenue) / 1_000) + " tys. zł"
                            : Math.round(Number(row.revenue)) + " zł"}
                        </td>
                        <td style={{ textAlign: "right", color: t.textSub }}>{Math.round(Number(row.avg_aov))} zł</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Data quality */}
              <div style={{ fontSize: 12, fontWeight: 600, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Jakość danych
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Pokrycie EAN (zamówienia z kodem produktu)", pct: overview.quality.ean_pct, warn: overview.quality.ean_pct < 80 },
                  { label: "Flaga promo (zamówienia z oznaczeniem promocji)", pct: overview.quality.promo_pct, warn: false },
                ].map(q => (
                  <div key={q.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, fontSize: 12, color: t.text }}>{q.label}</div>
                    <div style={{ width: 120, height: 6, background: t.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${q.pct}%`, background: q.warn ? "#e6a817" : "#2d8a4e", borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: q.warn ? "#e6a817" : "#2d8a4e", minWidth: 44, textAlign: "right" }}>{q.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Braki EAN */}
        <div className="imp-block">
          <div className="imp-section">Braki EAN</div>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: "IBM Plex Mono, monospace" }}>Produkty bez EAN</div>
                <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>Pobierz CSV, uzupełnij kolumnę EAN i wgraj z powrotem</div>
              </div>
              <button
                onClick={() => window.open('/api/crm/ean-gaps?format=csv&limit=500', '_blank')}
                style={{ padding: "8px 16px", background: t.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "IBM Plex Mono, monospace", flexShrink: 0 }}>
                Pobierz CSV (top 500)
              </button>
            </div>
            {eanGaps && eanGaps.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: t.textSub, fontWeight: 500 }}>Produkt</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: t.textSub, fontWeight: 500 }}>Zamówień</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: t.textSub, fontWeight: 500 }}>Kupców</th>
                  </tr>
                </thead>
                <tbody>
                  {eanGaps.slice(0, 10).map(g => (
                    <tr key={g.product_name} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: "6px 8px", color: t.text, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.product_name}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: t.accent, fontWeight: 600 }}>{Number(g.event_count).toLocaleString("pl-PL")}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: t.textSub }}>{Number(g.unique_buyers).toLocaleString("pl-PL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {eanGaps && eanGaps.length === 0 && (
              <div style={{ fontSize: 13, color: "#2d8a4e" }}>Brak produktów bez EAN</div>
            )}
            {!eanGaps && <div style={{ fontSize: 13, color: t.textSub }}>Ładowanie…</div>}
          </div>
        </div>

        {/* Historia runów */}
        <div className="imp-block">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="imp-section" style={{ margin: 0, border: "none" }}>Historia synchronizacji (ostatnie 10)</div>
            <button className="imp-btn imp-btn-ghost" onClick={loadSyncLog} style={{ fontSize: 11, padding: "4px 10px" }}>
              Odśwież
            </button>
          </div>

          {logsLoading ? (
            <div style={{ color: t.textSub, fontSize: 13 }}>Ładowanie…</div>
          ) : syncLogs.length === 0 ? (
            <div style={{ color: t.textSub, fontSize: 13, padding: "14px 0" }}>
              Brak historii. Uruchom pierwszy import lub live sync.
            </div>
          ) : (
            <div className="imp-card">
              <table className="imp-log-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Źródło</th>
                    <th>Status</th>
                    <th>Plik</th>
                    <th style={{ textAlign: "right" }}>Wiersze</th>
                    <th>Klienci / Szczegóły</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((row) => (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.triggered_at)}</td>
                      <td>
                        <span className="imp-log-badge" style={{
                          background: row.source === "shoper_api" ? "#60a5fa22" : `${t.accent}22`,
                          color: row.source === "shoper_api" ? "#60a5fa" : t.accent,
                        }}>
                          {row.source === "shoper_api" ? "Shoper API" : "CSV Upload"}
                        </span>
                      </td>
                      <td>
                        <span className="imp-log-badge" style={{
                          background: row.status === "success" ? "#34d39922" : "#f8717122",
                          color: row.status === "success" ? "#34d399" : "#f87171",
                        }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ color: t.textSub, fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.meta?.file ? String(row.meta.file) : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {row.rows_upserted.toLocaleString("pl-PL")}
                      </td>
                      <td style={{ color: t.textSub, fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.error_message
                          ? `⚠ ${row.error_message.slice(0, 60)}`
                          : row.meta
                          ? `klientów: ${row.meta.clients_upserted ?? "–"} | unmapped: ${row.meta.unmapped ?? "–"}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
