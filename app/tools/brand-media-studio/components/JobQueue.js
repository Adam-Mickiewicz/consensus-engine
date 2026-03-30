"use client";
import { useState, useEffect, useCallback } from "react";

const ACCENT = "#b8763a";

const STATUS_CONFIG = {
  queued:     { dot: "#9e9e9e", label: "W kolejce",        bg: "#f5f5f5" },
  processing: { dot: "#ff9800", label: "Przetwarzanie...", bg: "#fff8e1", animate: true },
  done:       { dot: "#4caf50", label: "Gotowy",           bg: "#f0fff4" },
  failed:     { dot: "#f44336", label: "Błąd",             bg: "#fce4ec" },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function JobQueue({ autoRefresh = true }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/brand-media/jobs?limit=20");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setError(null);
    } catch (err) {
      console.error("JobQueue fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    if (!autoRefresh) return;
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs, autoRefresh]);

  async function deleteJob(id) {
    if (!confirm("Usunąć ten job?")) return;
    try {
      await fetch(`/api/brand-media/jobs/${id}`, { method: "DELETE" });
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      console.error("Delete job error:", err);
    }
  }

  async function retryJob(job) {
    setRetrying(job.id);
    try {
      const endpoint = job.job_type === "video"
        ? "/api/brand-media/generate-video"
        : "/api/brand-media/generate-image";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: job.model_id,
          prompt: job.prompt,
          music_mode: job.music_mode,
          music_brief: job.music_brief,
          params: job.params,
          reference_urls: job.reference_urls,
          estimated_cost: job.estimated_cost,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Usuń stary failed job z widoku i odśwież
      setJobs(prev => prev.filter(j => j.id !== job.id));
      await fetchJobs();
    } catch (err) {
      console.error("Retry job error:", err);
      alert("Błąd podczas powtarzania: " + err.message);
    } finally {
      setRetrying(null);
    }
  }

  if (loading) return <div style={{ padding: 24, color: "#888", fontSize: 13 }}>Ładowanie kolejki...</div>;
  if (error)   return <div style={{ padding: 24, color: "#c62828", fontSize: 13 }}>Błąd: {error}</div>;
  if (!jobs.length) return (
    <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
      <div style={{ fontSize: 14 }}>Brak jobów. Wygeneruj pierwsze wideo lub obraz.</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#888" }}>Łącznie: {jobs.length} jobów</span>
        <button onClick={fetchJobs} style={{ fontSize: 12, color: ACCENT, background: "none", border: "none", cursor: "pointer" }}>
          Odśwież
        </button>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
              <th style={th}>Podgląd</th>
              <th style={th}>Typ</th>
              <th style={th}>Model</th>
              <th style={th}>Status</th>
              <th style={th}>Utworzono</th>
              <th style={th}>Koszt</th>
              <th style={th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => {
              const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
              const modelName = job.bms_model_config?.model_name || job.model_id;
              const expires = daysUntil(job.output_expires_at);
              const showExpiry = job.status === "done" && expires !== null && expires <= 7;
              const isRetrying = retrying === job.id;

              return (
                <tr key={job.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  {/* Podgląd */}
                  <td style={td}>
                    {job.status === "done" && job.thumbnail_url ? (
                      <img
                        src={job.thumbnail_url}
                        alt=""
                        style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, display: "block" }}
                      />
                    ) : job.status === "done" ? (
                      <div style={{
                        width: 40, height: 40, borderRadius: 4, background: "#e8f5e9",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16,
                      }}>
                        ✓
                      </div>
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 4, background: "#f5f5f5" }} />
                    )}
                  </td>

                  <td style={td}>
                    <span style={{ fontSize: 15 }}>{job.job_type === "video" ? "🎬" : job.job_type === "image" ? "🖼" : "🔄"}</span>
                    <span style={{ marginLeft: 6, textTransform: "capitalize" }}>{job.job_type}</span>
                  </td>

                  <td style={td}>
                    <span style={{ color: "#555" }}>{modelName || "—"}</span>
                  </td>

                  <td style={td}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: sc.bg, borderRadius: 12, padding: "3px 10px" }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%", background: sc.dot, display: "inline-block",
                        ...(sc.animate ? { animation: "pulse 1.5s infinite" } : {}),
                      }} />
                      <span style={{ fontSize: 12 }}>{sc.label}</span>
                    </div>
                  </td>

                  <td style={td}>
                    <span style={{ color: "#888" }}>{formatDate(job.created_at)}</span>
                    {showExpiry && (
                      <div style={{ fontSize: 10, color: "#ff9800", marginTop: 2 }}>
                        wygasa za {expires}d
                      </div>
                    )}
                  </td>

                  <td style={td}>
                    {job.actual_cost != null
                      ? <span style={{ color: ACCENT }}>${Number(job.actual_cost).toFixed(2)}</span>
                      : job.estimated_cost != null
                        ? <span style={{ color: "#aaa" }}>~${Number(job.estimated_cost).toFixed(2)}</span>
                        : <span style={{ color: "#ccc" }}>—</span>
                    }
                  </td>

                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {job.status === "done" && job.output_urls?.length > 0 && (
                        <a href={job.output_urls[0]} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: "#2e7d32", border: "1px solid #c8e6c9", borderRadius: 4, padding: "3px 8px", textDecoration: "none" }}>
                          Pobierz
                        </a>
                      )}
                      {job.status === "failed" && (
                        <>
                          <button
                            onClick={() => retryJob(job)}
                            disabled={isRetrying}
                            title={job.error_message || "Nieznany błąd"}
                            style={{
                              fontSize: 11, color: isRetrying ? "#aaa" : ACCENT,
                              border: `1px solid ${isRetrying ? "#eee" : "#e8c49a"}`,
                              borderRadius: 4, padding: "3px 8px", background: "none",
                              cursor: isRetrying ? "not-allowed" : "pointer",
                            }}
                          >
                            {isRetrying ? "..." : "Powtórz"}
                          </button>
                          <button
                            onClick={() => alert(`Błąd: ${job.error_message || "Nieznany błąd"}`)}
                            style={{ fontSize: 11, color: "#c62828", border: "1px solid #f0b8b8", borderRadius: 4, padding: "3px 8px", background: "none", cursor: "pointer" }}
                          >
                            Szczegóły
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteJob(job.id)}
                        style={{ fontSize: 11, color: "#999", border: "1px solid #eee", borderRadius: 4, padding: "3px 8px", background: "none", cursor: "pointer" }}>
                        Usuń
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

const th = {
  padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11,
  color: "#888", letterSpacing: "0.05em", textTransform: "uppercase",
};
const td = { padding: "12px 14px", verticalAlign: "middle" };
