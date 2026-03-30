"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const ACCENT = "#b8763a";

const STATUS_CONFIG = {
  queued:     { dot: "#9e9e9e", label: "W kolejce",        bg: "#f5f5f5" },
  processing: { dot: "#ff9800", label: "Przetwarzanie...", bg: "#fff8e1", animate: true },
  done:       { dot: "#4caf50", label: "Gotowy",           bg: "#f0fff4" },
  failed:     { dot: "#f44336", label: "Błąd",             bg: "#fce4ec" },
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function JobQueue({ autoRefresh = true }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(null);
  const [toast, setToast] = useState(null);
  const prevJobsRef = useRef([]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/brand-media/jobs?limit=20");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newJobs = data.jobs || [];

      const newlyDone = newJobs.filter(j =>
        j.status === "done" &&
        prevJobsRef.current.find(p => p.id === j.id && p.status === "processing")
      );
      newlyDone.forEach(j =>
        showToast(`✓ ${j.job_type === "video" ? "Wideo" : "Grafika"} gotowe! Znajdziesz je w Bibliotece.`)
      );

      prevJobsRef.current = newJobs;
      setJobs(newJobs);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  async function triggerWorker() {
    try {
      await fetch("/api/cron/process-video-jobs", {
        headers: { "Authorization": `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` },
      });
    } catch {
      // cicho ignoruj
    }
  }

  useEffect(() => {
    fetchJobs();
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      await fetchJobs();
      setJobs(prev => {
        const hasActive = prev.some(j => j.status === "queued" || j.status === "processing");
        if (hasActive) triggerWorker();
        return prev;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchJobs, autoRefresh]);

  async function deleteJob(id) {
    if (!confirm("Usunąć ten job?")) return;
    try {
      await fetch(`/api/brand-media/jobs/${id}`, { method: "DELETE" });
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      showToast("Błąd usuwania: " + err.message, "error");
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
      setJobs(prev => prev.filter(j => j.id !== job.id));
      showToast("Job dodany do kolejki");
      await fetchJobs();
    } catch (err) {
      showToast("Błąd: " + err.message, "error");
    } finally {
      setRetrying(null);
    }
  }

  if (loading) return <div style={{ padding: 24, color: "#888", fontSize: 13 }}>Ładowanie kolejki...</div>;
  if (error)   return <div style={{ padding: 24, color: "#c62828", fontSize: 13 }}>Błąd: {error}</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          background: toast.type === "success" ? ACCENT : "#ef4444",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#888" }}>Łącznie: {jobs.length} jobów</span>
        <button onClick={fetchJobs} style={{ fontSize: 12, color: ACCENT, background: "none", border: "none", cursor: "pointer" }}>
          Odśwież
        </button>
      </div>

      {!jobs.length ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 14 }}>Brak aktywnych jobów. Gotowe materiały znajdziesz w Bibliotece.</div>
        </div>
      ) : (
        <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
                <th style={th}>Typ</th>
                <th style={th}>Model</th>
                <th style={th}>Status</th>
                <th style={th}>Czas</th>
                <th style={th}>Koszt</th>
                <th style={th}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
                const modelName = job.bms_model_config?.model_name || job.model_id;
                const isRetrying = retrying === job.id;

                return (
                  <tr key={job.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
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
                          ...(sc.animate ? { animation: "queuePulse 1.5s infinite" } : {}),
                        }} />
                        <span style={{ fontSize: 12 }}>{sc.label}</span>
                      </div>
                      {job.status === "failed" && job.error_message && (
                        <div style={{ fontSize: 10, color: "#f44336", marginTop: 2, maxWidth: 200 }}>
                          {job.error_message.slice(0, 80)}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ color: "#888" }}>{formatDate(job.created_at)}</span>
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
                        {job.status === "failed" && (
                          <button
                            onClick={() => retryJob(job)}
                            disabled={isRetrying}
                            style={{
                              fontSize: 11, color: isRetrying ? "#aaa" : ACCENT,
                              border: `1px solid ${isRetrying ? "#eee" : "#e8c49a"}`,
                              borderRadius: 4, padding: "3px 8px", background: "none",
                              cursor: isRetrying ? "not-allowed" : "pointer",
                            }}
                          >
                            {isRetrying ? "..." : "Powtórz"}
                          </button>
                        )}
                        <button
                          onClick={() => deleteJob(job.id)}
                          style={{ fontSize: 11, color: "#999", border: "1px solid #eee", borderRadius: 4, padding: "3px 8px", background: "none", cursor: "pointer" }}
                        >
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
      )}

      <style>{`
        @keyframes queuePulse {
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
