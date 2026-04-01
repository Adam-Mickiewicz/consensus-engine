"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Nav from "../../../components/Nav";
import ModelSelector from "../components/ModelSelector";
import MusicPanel from "../components/MusicPanel";
import PresetPanel from "../components/PresetPanel";
import PresetVariables from "../components/PresetVariables";

const ACCENT = "#b8763a";

const CAMERA_MOVES = ["Statyczny", "Powolny zoom in", "Powolny zoom out", "Pan lewo → prawo", "Orbit (obrót produktu)", "Dolly forward"];
const VISUAL_STYLES = ["Product hero (studyjny)", "Lifestyle", "Cinematic", "Animowany / motion", "Dokumentalny"];
const LIGHTINGS = ["Naturalne (studio)", "Ciepłe (złata godzina)", "Zimne (minimalistyczne)", "Dramatyczne", "Soft (rozmyte tło)"];
const STEP_LABELS = ["Model", "Parametry", "Prompt", "Generuj"];

function calculateModelCost(model, params) {
  if (!model) return 0;
  const duration = parseInt(params?.duration) || 4;
  const variants = parseInt(params?.variants) || 1;
  const pricePerSec = params?.resolution === "4K" && model.capabilities?.price_4k
    ? parseFloat(model.capabilities.price_4k)
    : parseFloat(model.price_per_unit);
  return pricePerSec * duration * variants;
}

function ToggleGroup({ options, value, onChange, small }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: small ? "5px 12px" : "7px 14px",
            fontSize: 12, border: `1px solid ${value === opt ? ACCENT : "#ddd"}`,
            borderRadius: 6, background: value === opt ? "#fdf7f2" : "#fff",
            color: value === opt ? ACCENT : "#555", cursor: "pointer",
            fontWeight: value === opt ? 600 : 400, transition: "all 0.15s",
          }}
        >{opt}</button>
      ))}
    </div>
  );
}

function ParamRow({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
      <div style={{ width: 130, flexShrink: 0, fontSize: 13, color: "#555", paddingTop: 7, fontWeight: 500 }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", cursor: "pointer" }}
    >
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

function ProgressBar({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 32, alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => i + 1).map(s => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, flex: s < total ? "1" : "none" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: s <= step ? ACCENT : "#eee",
            color: s <= step ? "#fff" : "#999",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 500, flexShrink: 0,
          }}>{s}</div>
          <span style={{ fontSize: 13, color: s === step ? ACCENT : "#999", fontWeight: s === step ? 500 : 400 }}>
            {STEP_LABELS[s - 1]}
          </span>
          {s < total && <div style={{ flex: 1, height: 1, background: s < step ? ACCENT : "#eee" }} />}
        </div>
      ))}
    </div>
  );
}

function VideoJobCard({ job, aspectRatio }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "0.5px solid #e5e5e5", background: "#fff" }}>
      <div style={{
        padding: "8px 12px",
        background: job.status === "done" ? "#E1F5EE" : "#fafaf8",
        borderBottom: "0.5px solid #eee",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: job.status === "done" ? "#0F6E56" : "#666" }}>
          {job.modelName}
        </span>
        <span style={{
          fontSize: 10, padding: "1px 6px", borderRadius: 10, marginLeft: "auto",
          background: job.status === "done" ? "#1D9E75" : job.status === "failed" ? "#ef4444" : "#888",
          color: "#fff",
        }}>
          {job.status === "queued" ? "W kolejce"
            : job.status === "processing" ? "Generuję..."
            : job.status === "done" ? "✓ Gotowe"
            : "✗ Błąd"}
        </span>
      </div>

      {(job.status === "queued" || job.status === "processing") && (
        <div style={{ aspectRatio: aspectRatio || "16/9", background: "#fafaf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 3, width: 80, height: 80 }}>
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} style={{
                borderRadius: 2,
                background: ["#b8763a", "#e8c99a", "#f5e6d3"][i % 3],
                animation: `bmsPixel ${0.5 + (i % 5) * 0.1}s ease-in-out infinite alternate`,
                animationDelay: `${(i * 0.05) % 1}s`,
              }} />
            ))}
          </div>
        </div>
      )}

      {job.status === "done" && job.output_urls?.[0] && (
        <div>
          <div style={{ aspectRatio: aspectRatio || "16/9", background: "#000" }}>
            <video
              src={job.output_urls[0]}
              controls autoPlay muted loop
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
          <div style={{ padding: 8, display: "flex", gap: 6, borderTop: "0.5px solid #eee" }}>
            <a href={job.output_urls[0]} download style={{
              flex: 1, padding: 5, background: ACCENT, color: "#fff",
              borderRadius: 6, fontSize: 11, textDecoration: "none", textAlign: "center",
            }}>⬇ Pobierz</a>
          </div>
        </div>
      )}

      {job.status === "failed" && (
        <div style={{
          padding: 16, color: "#ef4444", fontSize: 12,
          textAlign: "center", aspectRatio: aspectRatio || "16/9",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>Błąd generowania</div>
      )}
    </div>
  );
}

export default function VideoPage() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [mode, setMode] = useState("idle");
  const [selectedModels, setSelectedModels] = useState([]);

  // Global params (shared across all models)
  const [globalParams, setGlobalParams] = useState({
    camera_move: "Statyczny",
    visual_style: "Product hero (studyjny)",
    lighting: "Naturalne (studio)",
  });

  const [baseImages, setBaseImages] = useState([]);
  const [musicConfig, setMusicConfig] = useState({ mode: "none" });
  const [prompt, setPrompt] = useState("");
  const [presetVariables, setPresetVariables] = useState([]);
  const [presetTemplate, setPresetTemplate] = useState("");
  const [toast, setToast] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [enhancing, setEnhancing] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [aiModel, setAiModel] = useState("claude");
  const [aiInstruction, setAiInstruction] = useState("");

  // Extend (single-model only)
  const [showExtend, setShowExtend] = useState(false);
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendDuration, setExtendDuration] = useState("8s");
  const [extendGenerating, setExtendGenerating] = useState(false);
  const [extendedParts, setExtendedParts] = useState([]);
  const extendPollingRef = useRef(null);

  const pollingRefs = useRef({});

  useEffect(() => {
    return () => {
      Object.values(pollingRefs.current).forEach(clearInterval);
      if (extendPollingRef.current) clearInterval(extendPollingRef.current);
    };
  }, []);

  function setGlobalParam(key, val) {
    setGlobalParams(p => ({ ...p, [key]: val }));
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function startPolling(jobId) {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/brand-media/jobs/${jobId}`);
        const data = await res.json();
        const job = data.job ?? data;
        setActiveJobs(prev => {
          const updated = prev.map(j =>
            j.jobId === jobId ? { ...j, status: job.status, output_urls: job.output_urls || [] } : j
          );
          if (updated.every(j => j.status === "done" || j.status === "failed")) {
            setMode("done");
            if (updated.some(j => j.status === "done")) showToast("Wideo gotowe!");
          }
          return updated;
        });
        if (job.status === "done" || job.status === "failed") {
          clearInterval(pollingRefs.current[jobId]);
          delete pollingRefs.current[jobId];
          if (job.status === "failed") showToast("Błąd: " + (job.error_message || "nieznany"), "error");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 10000);
    pollingRefs.current[jobId] = iv;
  }

  function getCurrentConfig() {
    return {
      model_id: selectedModels[0]?.model?.model_id,
      params: { ...selectedModels[0]?.params, ...globalParams },
      prompt_template: prompt,
    };
  }

  function handlePresetApply(preset) {
    if (preset.params) setGlobalParams(p => ({ ...p, ...preset.params }));
    setPresetTemplate(preset.prompt_template || "");
    setPresetVariables(preset.variables || []);
    if (!preset.variables?.length) setPrompt(preset.prompt_template || "");
  }

  async function handleEnhancePrompt() {
    if (!prompt.trim()) return;
    setEnhancing(true);
    setAlternatives([]);
    try {
      const res = await fetch("/api/brand-media/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt, instruction: aiInstruction, model: aiModel,
          context: { selectedModel: selectedModels[0]?.model?.model_id, params: selectedModels[0]?.params, jobType: "video" },
        }),
      });
      const data = await res.json();
      if (data.enhanced) setPrompt(data.enhanced);
      if (data.alternatives?.length) setAlternatives(data.alternatives);
    } catch {
      showToast("Błąd ulepszania promptu", "error");
    } finally {
      setEnhancing(false);
    }
  }

  async function generateAll() {
    const jobs = await Promise.all(
      selectedModels.map(async ({ model, params: mp }) => {
        try {
          const body = {
            model_id: model.model_id,
            prompt,
            music_mode: musicConfig.mode,
            music_brief: musicConfig.mode === "brief"
              ? `${musicConfig.genre} / ${musicConfig.tempo}${musicConfig.description ? " / " + musicConfig.description : ""}`
              : null,
            params: {
              ...mp,
              ...globalParams,
              base_images: baseImages.map(b => b.url),
            },
            estimated_cost: calculateModelCost(model, mp).toFixed(2),
          };
          const res = await fetch("/api/brand-media/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          const jobId = data.job_id ?? data.id;
          return { jobId, modelId: model.model_id, modelName: model.model_name, modelParams: mp, status: "queued", output_urls: [] };
        } catch (err) {
          return { jobId: null, modelId: model.model_id, modelName: model.model_name, modelParams: mp, status: "failed", output_urls: [] };
        }
      })
    );
    setActiveJobs(jobs);
    setExtendedParts([]);
    jobs.filter(j => j.jobId).forEach(j => startPolling(j.jobId));
    if (jobs.every(j => !j.jobId)) setMode("idle");
  }

  async function handleGenerate() {
    if (!selectedModels.length || !prompt.trim()) return;
    setMode("generating");
    setAlternatives([]);
    await generateAll();
  }

  async function handleRerun() {
    Object.values(pollingRefs.current).forEach(clearInterval);
    pollingRefs.current = {};
    setMode("generating");
    await generateAll();
  }

  function handleCancel() {
    Object.values(pollingRefs.current).forEach(clearInterval);
    pollingRefs.current = {};
    setMode("idle");
    setActiveJobs([]);
  }

  function handleReset() {
    Object.values(pollingRefs.current).forEach(clearInterval);
    pollingRefs.current = {};
    if (extendPollingRef.current) { clearInterval(extendPollingRef.current); extendPollingRef.current = null; }
    setMode("idle");
    setActiveJobs([]);
    setPrompt("");
    setStep(1);
    setShowExtend(false);
    setExtendedParts([]);
    setExtendPrompt("");
  }

  async function handleExtend() {
    const primaryJob = activeJobs[0];
    if (!primaryJob?.jobId || extendGenerating) return;
    const model = selectedModels[0]?.model;
    const mp = selectedModels[0]?.params;
    if (!model) return;

    setExtendGenerating(true);
    setShowExtend(false);
    try {
      const res = await fetch("/api/brand-media/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: model.model_id,
          prompt: extendPrompt.trim() || "",
          params: { ...mp, ...globalParams, duration: extendDuration },
          extend_from_job_id: extendedParts.length > 0
            ? extendedParts[extendedParts.length - 1].id
            : primaryJob.jobId,
          estimated_cost: calculateModelCost(model, { ...mp, duration: extendDuration }).toFixed(2),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `HTTP ${res.status}`); }
      const data = await res.json();
      const jobId = data.job_id ?? data.id;
      if (!jobId) throw new Error("Brak job_id");

      const newPart = { id: jobId, status: "queued", output_urls: [] };
      setExtendedParts(prev => [...prev, newPart]);

      if (extendPollingRef.current) clearInterval(extendPollingRef.current);
      extendPollingRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/brand-media/jobs/${jobId}`);
          const d = await r.json();
          const job = d.job ?? d;
          setExtendedParts(prev => prev.map(p => p.id === jobId ? job : p));
          if (job.status === "done" || job.status === "failed") {
            clearInterval(extendPollingRef.current);
            extendPollingRef.current = null;
            setExtendGenerating(false);
            if (job.status === "done") { showToast("Rozszerzenie gotowe!"); setExtendPrompt(""); setExtendDuration("8s"); }
            else showToast("Błąd rozszerzenia: " + (job.error_message || "nieznany"), "error");
          }
        } catch (e) { console.error("Extend polling error:", e); }
      }, 10000);
    } catch (err) {
      setExtendGenerating(false);
      showToast("Błąd: " + err.message, "error");
    }
  }

  const totalCost = selectedModels.reduce(
    (sum, { model, params: mp }) => sum + calculateModelCost(model, mp), 0
  ).toFixed(2);

  const canGenerate = selectedModels.length > 0 && prompt.trim().length > 0;
  const cols = Math.max(activeJobs.length, 1);

  // For extend: only when single model selected and done
  const canExtend = selectedModels.length === 1 && activeJobs[0]?.status === "done" && selectedModels[0]?.model?.capabilities?.extend;
  const primaryJobOrientation = activeJobs[0]?.modelParams?.orientation || "16:9";
  const aspectRatio = primaryJobOrientation === "9:16" ? "9/16" : primaryJobOrientation === "1:1" ? "1/1" : "16/9";

  // Capabilities of first selected model (for music panel, base images)
  const firstCap = selectedModels[0]?.model?.capabilities || {};

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f6", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <Nav current="/tools/brand-media-studio" />

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          background: toast.type === "error" ? "#ef4444" : "#1D9E75",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
          <Link href="/tools/brand-media-studio" style={{ color: "#aaa", textDecoration: "none" }}>Brand Media Studio</Link>
          {" / "}
          <span style={{ color: "#555" }}>Generowanie wideo</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 28px", color: "#1a1a1a" }}>🎬 Generowanie wideo</h1>

        {/* ── TRYB GENERATING ── */}
        {mode === "generating" && (
          <div style={{ marginBottom: 32 }}>
            <style>{`@keyframes bmsPixel { 0%{opacity:0.3} 100%{opacity:1} }`}</style>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(200px, 1fr))`,
              gap: 12, marginBottom: 12,
            }}>
              {activeJobs.map(job => (
                <VideoJobCard key={job.jobId || job.modelId} job={job} aspectRatio={aspectRatio} />
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={handleCancel} style={{
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: 12, color: "#aaa", textDecoration: "underline",
              }}>Anuluj</button>
            </div>
          </div>
        )}

        {/* ── TRYB DONE ── */}
        {mode === "done" && activeJobs.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <style>{`@keyframes bmsPixel { 0%{opacity:0.3} 100%{opacity:1} }`}</style>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(200px, 1fr))`,
              gap: 12, marginBottom: 16,
            }}>
              {activeJobs.map(job => (
                <VideoJobCard key={job.jobId || job.modelId} job={job} aspectRatio={aspectRatio} />
              ))}
            </div>

            {/* Extended parts (single-model only) */}
            {extendedParts.filter(p => p.status === "done" && p.output_urls?.[0]).map((p, i) => (
              <div key={p.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                  Przedłużenie {i + 1}
                </div>
                <div style={{ borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio }}>
                  <video src={p.output_urls[0]} controls muted loop style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <a href={p.output_urls[0]} download style={{ padding: "6px 12px", background: "transparent", border: "0.5px solid #ddd", color: "#555", borderRadius: 6, fontSize: 12, textDecoration: "none" }}>⬇ Pobierz</a>
                </div>
              </div>
            ))}

            {extendedParts.filter(p => p.status === "queued" || p.status === "processing").map((p, i) => (
              <div key={p.id} style={{ borderRadius: 12, border: "1px dashed #e0d8d0", padding: 20, textAlign: "center", marginBottom: 16, background: "#fdf9f6" }}>
                <div style={{ fontSize: 13, color: ACCENT, marginBottom: 4 }}>🦄 Generuję przedłużenie...</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>{p.status === "queued" ? "W kolejce" : "Przetwarzanie"}</div>
              </div>
            ))}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <button onClick={handleRerun} style={{ padding: "8px 16px", border: "0.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, background: "transparent", cursor: "pointer", color: "#1a1a1a" }}>↺ Re-run</button>

              {canExtend && !extendGenerating && (
                <button onClick={() => setShowExtend(v => !v)} style={{ padding: "8px 16px", border: `0.5px solid ${ACCENT}`, borderRadius: 8, fontSize: 13, background: showExtend ? "#fdf7f2" : "transparent", cursor: "pointer", color: ACCENT }}>
                  ↗ Przedłuż wideo
                </button>
              )}

              {extendGenerating && (
                <div style={{ padding: "8px 16px", border: "0.5px solid #e0d8d0", borderRadius: 8, fontSize: 13, color: ACCENT, background: "#fdf9f6" }}>
                  🦄 Generuję rozszerzenie...
                </div>
              )}
            </div>

            {/* Extend panel */}
            {showExtend && !extendGenerating && (
              <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 16, background: "#fafafa" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 12 }}>↗ Przedłuż wideo</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 500 }}>Jak kontynuować?</div>
                <textarea
                  value={extendPrompt}
                  onChange={e => setExtendPrompt(e.target.value)}
                  placeholder="np. kamera odjeżdża, ujawniając szerszy krajobraz..."
                  style={{ width: "100%", minHeight: 70, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 12 }}
                />
                <div style={{ fontSize: 12, color: "#666", marginBottom: 8, fontWeight: 500 }}>Dodaj sekund:</div>
                <ToggleGroup options={["5s", "8s", "10s", "20s"]} value={extendDuration} onChange={setExtendDuration} small />
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 8, marginBottom: 12 }}>Max 20s/raz · max 6 rozszerzeń · łącznie max 120s</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleExtend} style={{ padding: "8px 18px", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Generuj rozszerzenie</button>
                  <button onClick={() => setShowExtend(false)} style={{ padding: "8px 14px", background: "transparent", border: "0.5px solid #ddd", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#666" }}>Anuluj</button>
                </div>
              </div>
            )}

            <button onClick={handleReset} style={{ width: "100%", padding: 10, border: "0.5px solid #ddd", borderRadius: 8, fontSize: 13, background: "transparent", cursor: "pointer", color: "#888" }}>
              ← Zacznij od nowa
            </button>
          </div>
        )}

        {/* ── WIZARD ── */}
        <div style={{
          opacity: mode === "idle" ? 1 : mode === "generating" ? 0.4 : 0,
          pointerEvents: mode === "idle" ? "auto" : "none",
          transition: "opacity 0.3s",
          visibility: mode === "done" ? "hidden" : "visible",
        }}>
          <ProgressBar step={step} total={totalSteps} />

          {/* KROK 1 — Model */}
          {step === 1 && (
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Wybierz model
              </div>
              <div style={{ marginBottom: 20 }}>
                <PresetPanel jobType="video" onApply={handlePresetApply} currentConfig={getCurrentConfig()} />
              </div>
              <ModelSelector
                category="video"
                selectedModels={selectedModels}
                onModelsChange={setSelectedModels}
              />
            </div>
          )}

          {/* KROK 2 — Parametry globalne */}
          {step === 2 && (
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Parametry wideo
              </div>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
                Orientacja, długość i rozdzielczość: ustaw per model w Ustawieniach (⚙) w kroku 1.
              </div>

              <ParamRow label="Ruch kamery">
                <Select value={globalParams.camera_move} onChange={v => setGlobalParam("camera_move", v)} options={CAMERA_MOVES} />
              </ParamRow>
              <ParamRow label="Styl wizualny">
                <Select value={globalParams.visual_style} onChange={v => setGlobalParam("visual_style", v)} options={VISUAL_STYLES} />
              </ParamRow>
              <ParamRow label="Oświetlenie">
                <Select value={globalParams.lighting} onChange={v => setGlobalParam("lighting", v)} options={LIGHTINGS} />
              </ParamRow>

              <ParamRow label="Muzyka">
                <MusicPanel modelCapabilities={firstCap} onMusicChange={setMusicConfig} />
              </ParamRow>

              {selectedModels[0]?.model?.max_ref_images > 0 && (
                <ParamRow label="Zdjęcia bazowe">
                  <div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>Max {selectedModels[0].model.max_ref_images} zdjęć</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {Array.from({ length: selectedModels[0].model.max_ref_images }).map((_, i) => {
                        const img = baseImages[i];
                        return (
                          <div key={i}
                            style={{ width: 64, height: 64, border: `2px dashed ${img ? ACCENT : "#ddd"}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: img ? "transparent" : "#fafafa" }}
                            onClick={() => {
                              if (img) setBaseImages(prev => prev.filter((_, pi) => pi !== i));
                              else {
                                const url = window.prompt("URL zdjęcia bazowego:");
                                if (url) setBaseImages(prev => { const next = [...prev]; next[i] = { url }; return next; });
                              }
                            }}
                          >
                            {img
                              ? <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <span style={{ fontSize: 20, color: "#ccc" }}>+</span>
                            }
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ParamRow>
              )}
            </div>
          )}

          {/* KROK 3 — Prompt */}
          {step === 3 && (
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Prompt
              </div>

              {presetVariables.length > 0 && (
                <PresetVariables variables={presetVariables} promptTemplate={presetTemplate} onPromptChange={setPrompt} />
              )}

              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Opisz co ma się dziać w wideo..."
                style={{ width: "100%", minHeight: 200, padding: "12px 14px", border: `1.5px solid ${ACCENT}`, borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit", lineHeight: 1.6, marginBottom: 16, background: "#fdf8f3" }}
              />

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 500 }}>Model AI do ulepszania</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[{ id: "claude", label: "Claude Sonnet" }, { id: "gpt-4o", label: "GPT-4o" }, { id: "gpt-4.1", label: "GPT-4.1" }, { id: "o3", label: "o3" }].map(m => (
                    <button key={m.id} onClick={() => setAiModel(m.id)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", background: aiModel === m.id ? ACCENT : "transparent", color: aiModel === m.id ? "#fff" : "#666", border: aiModel === m.id ? `1px solid ${ACCENT}` : "1px solid #ddd", fontWeight: aiModel === m.id ? 500 : 400 }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 500 }}>Instrukcja dla AI (opcjonalna)</div>
                <textarea value={aiInstruction} onChange={e => setAiInstruction(e.target.value)} placeholder="np. 'zaproponuj 3 warianty'" style={{ width: "100%", minHeight: 60, padding: 10, border: "1px solid #ddd", borderRadius: 8, fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
              </div>

              <button onClick={handleEnhancePrompt} disabled={enhancing || !prompt.trim()} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 6, border: `1px solid ${ACCENT}`, background: "#fff", color: enhancing ? "#ccc" : ACCENT, cursor: enhancing || !prompt.trim() ? "not-allowed" : "pointer" }}>
                {enhancing ? "Generuję..." : "✦ Ulepsz prompt (AI)"}
              </button>

              {alternatives.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>Propozycje AI — kliknij aby użyć:</div>
                  {alternatives.map((alt, i) => (
                    <div key={i} onClick={() => setPrompt(alt)} style={{ padding: "10px 14px", border: prompt === alt ? `1.5px solid ${ACCENT}` : "1px solid #eee", borderRadius: 8, fontSize: 13, lineHeight: 1.5, cursor: "pointer", background: prompt === alt ? "#fdf6ee" : "#fff", color: "#333" }}>
                      <div style={{ fontSize: 10, color: ACCENT, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Wariant {i + 1}</div>
                      {alt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KROK 4 — Generuj */}
          {step === 4 && (
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Podsumowanie i generowanie
              </div>

              <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                {selectedModels.map(({ model, params: mp }) => (
                  <div key={model.model_id} style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#555", marginBottom: 4 }}>
                    <span><strong>{model.model_name}</strong></span>
                    <span>{mp.orientation} · {mp.duration} · {mp.variants}x</span>
                    <span style={{ color: ACCENT }}>~${calculateModelCost(model, mp).toFixed(2)}</span>
                  </div>
                ))}
                {selectedModels.length > 1 && (
                  <div style={{ fontSize: 13, color: ACCENT, fontWeight: 600, borderTop: "1px solid #eee", paddingTop: 8, marginTop: 4 }}>
                    Łącznie: ~${totalCost}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Prompt (możesz edytować):</div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                style={{ width: "100%", minHeight: 140, padding: "12px 14px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit", lineHeight: 1.6, marginBottom: 20 }}
              />

              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                style={{ width: "100%", padding: "14px 20px", fontSize: 15, fontWeight: 600, background: !canGenerate ? "#f0e8df" : ACCENT, border: "none", borderRadius: 8, color: "#fff", cursor: !canGenerate ? "not-allowed" : "pointer", letterSpacing: "0.02em" }}
              >
                {!selectedModels.length ? "Wybierz co najmniej 1 model" : "🎬 Generuj wideo"}
              </button>
            </div>
          )}

          {/* Nawigacja */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              style={{ padding: "9px 20px", fontSize: 13, borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: step === 1 ? "#ccc" : "#555", cursor: step === 1 ? "not-allowed" : "pointer" }}
            >← Wstecz</button>

            {step < totalSteps && (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !selectedModels.length}
                style={{ padding: "9px 20px", fontSize: 13, fontWeight: 600, borderRadius: 6, background: (step === 1 && !selectedModels.length) ? "#f0e8df" : ACCENT, border: "none", color: "#fff", cursor: (step === 1 && !selectedModels.length) ? "not-allowed" : "pointer" }}
              >Dalej →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
