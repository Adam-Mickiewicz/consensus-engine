"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const ACCENT = "#b8763a";

function formatTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("pl", { hour: "2-digit", minute: "2-digit" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function JobCard({ job, onDelete, onRerun, onExtend }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden", marginBottom: 0 }}>
      {/* Górna część — podgląd / player */}
      <div style={{
        background: "#111", aspectRatio: "16/9", position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {job.status === "queued" && (
          <div style={{ color: "#888", fontSize: 13, textAlign: "center" }}>
            <div style={{ marginBottom: 8 }}>⏳ W kolejce...</div>
          </div>
        )}

        {job.status === "processing" && (
          <div style={{ width: "80%", textAlign: "center" }}>
            <div style={{ color: "#fff", fontSize: 13, marginBottom: 12 }}>Generowanie wideo...</div>
            <div style={{ height: 4, background: "#333", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: ACCENT, borderRadius: 2,
                animation: "veoprogress 2s ease-in-out infinite", width: "60%",
              }} />
            </div>
          </div>
        )}

        {job.status === "done" && job.output_urls?.[0] && (
          <video
            src={job.output_urls[0]}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            controls
            autoPlay
            muted
            loop
          />
        )}

        {job.status === "done" && !job.output_urls?.[0] && (
          <div style={{ color: "#4caf50", fontSize: 24 }}>✓</div>
        )}

        {job.status === "failed" && (
          <div style={{ color: "#ef4444", fontSize: 13, textAlign: "center", padding: 16 }}>
            ❌ Błąd generowania
            {job.error_message && (
              <div style={{ color: "#888", fontSize: 11, marginTop: 4, maxWidth: 300 }}>
                {job.error_message.slice(0, 100)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dolna część — metadane i akcje */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
              {job.bms_model_config?.model_name || job.model_name || job.model_id}
            </div>
            <div style={{ fontSize: 11, color: "#888" }}>
              {job.params?.orientation} · {job.params?.duration} · {formatTime(job.created_at)}
              {job.status === "done" && job.output_expires_at && daysUntil(job.output_expires_at) <= 7 && (
                <span style={{ color: "#ff9800", marginLeft: 6 }}>
                  · wygasa za {daysUntil(job.output_expires_at)}d
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: job.estimated_cost > 1 ? ACCENT : "#888" }}>
            {job.actual_cost != null
              ? `$${Number(job.actual_cost).toFixed(2)}`
              : job.estimated_cost != null
                ? `~$${Number(job.estimated_cost).toFixed(2)}`
                : "—"
            }
          </div>
        </div>

        {/* Prompt preview */}
        <div style={{
          fontSize: 12, color: "#666", marginBottom: 12,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {job.prompt}
        </div>

        {/* Akcje */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {job.status === "done" && job.output_urls?.[0] && (
            <a
              href={job.output_urls[0]}
              download
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 12,
                background: ACCENT, color: "#fff", textDecoration: "none",
              }}
            >
              ⬇ Pobierz
            </a>
          )}

          {(job.status === "done" || job.status === "failed") && (
            <button
              onClick={() => onRerun(job)}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 12,
                background: "transparent", border: "1px solid #ddd", cursor: "pointer",
              }}
            >
              ↺ Re-run
            </button>
          )}

          {job.status === "done" && job.job_type === "video" && (
            <button
              onClick={() => onExtend(job)}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 12,
                background: "transparent", border: `1px solid ${ACCENT}`,
                color: ACCENT, cursor: "pointer",
              }}
            >
              + Extend
            </button>
          )}

          <button
            onClick={() => onDelete(job.id)}
            style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 12,
              background: "transparent", border: "1px solid #eee",
              color: "#999", cursor: "pointer", marginLeft: "auto",
            }}
          >
            Usuń
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobQueue({ autoRefresh = true }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [rerunJob, setRerunJob] = useState(null);
  const [rerunPrompt, setRerunPrompt] = useState("");
  const [rerunSubmitting, setRerunSubmitting] = useState(false);
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

      // Wykryj nowo ukończone joby
      const newlyDone = newJobs.filter(j =>
        j.status === "done" &&
        prevJobsRef.current.find(p => p.id === j.id && p.status === "processing")
      );
      newlyDone.forEach(j =>
        showToast(`✓ ${j.job_type === "video" ? "Wideo" : "Grafika"} gotowe!`)
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

  async function handleDelete(id) {
    if (!confirm("Usunąć ten job?")) return;
    try {
      await fetch(`/api/brand-media/jobs/${id}`, { method: "DELETE" });
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      showToast("Błąd usuwania: " + err.message, "error");
    }
  }

  function handleRerun(job) {
    setRerunJob(job);
    setRerunPrompt(job.prompt || "");
  }

  function handleExtend(job) {
    showToast("Funkcja Extend będzie dostępna wkrótce");
  }

  async function submitRerun() {
    if (!rerunJob) return;
    setRerunSubmitting(true);
    try {
      const endpoint = rerunJob.job_type === "video"
        ? "/api/brand-media/generate-video"
        : "/api/brand-media/generate-image";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: rerunJob.model_id,
          prompt: rerunPrompt,
          music_mode: rerunJob.music_mode,
          music_brief: rerunJob.music_brief,
          params: rerunJob.params,
          reference_urls: rerunJob.reference_urls,
          estimated_cost: rerunJob.estimated_cost,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRerunJob(null);
      showToast("Job dodany do kolejki");
      await fetchJobs();
    } catch (err) {
      showToast("Błąd: " + err.message, "error");
    } finally {
      setRerunSubmitting(false);
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

      {/* Modal re-run */}
      {rerunJob && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 500, maxWidth: "90vw" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Re-run {rerunJob.job_type === "video" ? "wideo" : "obrazu"}</h3>
            <textarea
              value={rerunPrompt}
              onChange={e => setRerunPrompt(e.target.value)}
              style={{
                width: "100%", minHeight: 120, padding: 10,
                border: "1px solid #ddd", borderRadius: 8, fontSize: 13,
                resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                onClick={() => setRerunJob(null)}
                style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 6, background: "transparent", cursor: "pointer" }}
              >
                Anuluj
              </button>
              <button
                onClick={submitRerun}
                disabled={rerunSubmitting}
                style={{ padding: "8px 16px", background: ACCENT, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                {rerunSubmitting ? "Dodaję..." : "Generuj ponownie"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "#888" }}>Łącznie: {jobs.length} jobów</span>
        <button onClick={fetchJobs} style={{ fontSize: 12, color: ACCENT, background: "none", border: "none", cursor: "pointer" }}>
          Odśwież
        </button>
      </div>

      {!jobs.length ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 14 }}>Brak jobów. Wygeneruj pierwsze wideo lub obraz.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={handleDelete}
              onRerun={handleRerun}
              onExtend={handleExtend}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes veoprogress {
          0% { transform: translateX(-100%) }
          100% { transform: translateX(200%) }
        }
      `}</style>
    </div>
  );
}
