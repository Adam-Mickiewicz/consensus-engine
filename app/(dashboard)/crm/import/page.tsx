"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useDarkMode } from "../../../hooks/useDarkMode";
import { supabase } from "../../../../lib/supabase";

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
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveResult, setLiveResult] = useState<Record<string, unknown> | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

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

  async function handleUpload() {
    if (files.length === 0 || status === "running") return;
    setStatus("running");
    setResult(null);
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token ?? null;

      const fd = new FormData();
      for (const { file } of files) fd.append("files", file);

      const res = await fetch("/api/etl/upload", {
        method: "POST",
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) { setErrorMsg(json.error ?? "Błąd serwera."); setStatus("error"); return; }
      setResult(json);
      setStatus("done");
      loadSyncLog();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Błąd połączenia.");
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

      const res = await fetch("/api/etl/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
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
              lub <span className="imp-drop-link">kliknij, aby wybrać</span> — obsługuje wiele plików jednocześnie (max 50 MB łącznie)
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
              Trwa ETL — normalizacja, vault, taksonomia, okazje, profile, upsert…
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
