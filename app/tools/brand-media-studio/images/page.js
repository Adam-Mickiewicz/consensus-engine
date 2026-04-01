"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Nav from "../../../components/Nav";
import ModelSelector from "../components/ModelSelector";
import AttachmentPanel from "../components/AttachmentPanel";
import PresetPanel from "../components/PresetPanel";
import PresetVariables from "../components/PresetVariables";

const ACCENT = "#b8763a";

const STYLE_OPTIONS = [
  "Fotorealistyczny", "Ilustracja", "Fotografia produktowa",
  "Cinematic", "Animowany", "Minimalistyczny", "Vintage", "Szkic",
];

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
      {title && (
        <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "6px 14px", fontSize: 12,
            border: `1px solid ${value === opt ? ACCENT : "#ddd"}`,
            borderRadius: 6, background: value === opt ? "#fdf7f2" : "#fff",
            color: value === opt ? ACCENT : "#555", cursor: "pointer",
            fontWeight: value === opt ? 600 : 400, transition: "all 0.15s",
          }}
        >{opt}</button>
      ))}
    </div>
  );
}

function JobCard({ job, onLightbox }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "0.5px solid #e5e5e5", background: "#fff" }}>
      {/* Model header */}
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

      {/* Unicorn animation when pending */}
      {(job.status === "queued" || job.status === "processing") && (
        <>
          <style>{`
            @keyframes unicornFloat {
              0%   { transform: translate(-50%,-55%) scale(1)   rotate(-6deg); }
              100% { transform: translate(-50%,-55%) scale(1.1) rotate(6deg);  }
            }
            @keyframes fly0 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(75px,-65px)  scale(0);opacity:0} }
            @keyframes fly1 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-75px,-65px) scale(0);opacity:0} }
            @keyframes fly2 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(0,-95px)     scale(0);opacity:0} }
            @keyframes fly3 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(95px,10px)   scale(0);opacity:0} }
            @keyframes fly4 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-95px,10px)  scale(0);opacity:0} }
            @keyframes fly5 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(55px,-90px)  scale(0);opacity:0} }
            @keyframes fly6 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-55px,-90px) scale(0);opacity:0} }
            @keyframes fly7 { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(30px,-100px) scale(0);opacity:0} }
            @keyframes bmsBarJob { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }
            @keyframes borderHueJob { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
          `}</style>
          <div style={{ aspectRatio: "1/1", position: "relative", borderRadius: 0, overflow: "hidden" }}>
            {/* Rainbow border */}
            <div style={{
              position: "absolute", inset: 0,
              background: "conic-gradient(from 0deg, #ff6bb5, #b86bff, #ffd700, #6bdbff, #ff8c42, #a8ff6b, #ff6bb5)",
              animation: "borderHueJob 3s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 3, borderRadius: 0, overflow: "hidden",
              background: "linear-gradient(135deg, #fdf4ff 0%, #fff8f0 50%, #f0f8ff 100%)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <div style={{ position: "relative", width: 120, height: 120 }}>
                {[
                  { color: "#ff6bb5", anim: "fly0", dur: 1.0, delay: 0.0,  size: 8  },
                  { color: "#b86bff", anim: "fly1", dur: 1.2, delay: 0.15, size: 6  },
                  { color: "#ffd700", anim: "fly2", dur: 0.9, delay: 0.3,  size: 9  },
                  { color: "#6bdbff", anim: "fly3", dur: 1.1, delay: 0.0,  size: 5  },
                  { color: "#ff8c42", anim: "fly4", dur: 1.0, delay: 0.45, size: 7  },
                  { color: "#a8ff6b", anim: "fly5", dur: 0.8, delay: 0.6,  size: 8  },
                  { color: "#ff6b6b", anim: "fly6", dur: 1.3, delay: 0.1,  size: 6  },
                  { color: "#6bffd4", anim: "fly7", dur: 1.0, delay: 0.75, size: 7  },
                  { color: "#ff6bb5", anim: "fly2", dur: 1.1, delay: 0.9,  size: 5  },
                  { color: "#ffd700", anim: "fly0", dur: 0.9, delay: 0.5,  size: 9  },
                ].map((p, i) => (
                  <div key={i} style={{
                    position: "absolute", left: "50%", top: "60%",
                    width: p.size, height: p.size, borderRadius: "50%",
                    background: p.color, marginLeft: -p.size / 2, marginTop: -p.size / 2,
                    animation: `${p.anim} ${p.dur}s ease-out infinite`,
                    animationDelay: `${p.delay}s`,
                    boxShadow: `0 0 6px ${p.color}`,
                  }} />
                ))}
                <div style={{
                  position: "absolute", left: "50%", top: "55%",
                  fontSize: 52, lineHeight: 1,
                  animation: "unicornFloat 1.4s ease-in-out infinite alternate",
                  userSelect: "none",
                }}>🦄</div>
              </div>
              <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>
                {job.status === "queued" ? "W kolejce..." : "Generuję..."}
              </div>
              {/* Progress bar */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "40%", background: "linear-gradient(90deg, #ff6bb5, #b86bff, #ffd700)", animation: "bmsBarJob 1.5s ease-in-out infinite" }} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Result images — all variants */}
      {job.status === "done" && job.output_urls?.length > 0 && (
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: job.output_urls.length > 1 ? "repeat(2,1fr)" : "1fr",
            gap: "2px",
          }}>
            {job.output_urls.map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img
                  src={url}
                  style={{ width: "100%", display: "block", cursor: "pointer" }}
                  onClick={() => onLightbox(url)}
                />
                <a
                  href={url}
                  download={`wariant-${i + 1}.png`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: "absolute", bottom: 4, right: 4,
                    padding: "3px 8px",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff", borderRadius: 4,
                    fontSize: 10, textDecoration: "none",
                  }}
                >⬇</a>
              </div>
            ))}
          </div>
          <div style={{ padding: 8, display: "flex", gap: 6, borderTop: "0.5px solid #eee" }}>
            <a href={job.output_urls[0]} download style={{
              flex: 1, padding: 5, background: ACCENT, color: "#fff",
              borderRadius: 6, fontSize: 11, textDecoration: "none", textAlign: "center",
            }}>⬇ Pobierz wszystkie</a>
            <button onClick={() => onLightbox(job.output_urls[0])} style={{
              flex: 1, padding: 5, border: "0.5px solid #ddd",
              borderRadius: 6, fontSize: 11, background: "transparent", cursor: "pointer",
            }}>⤢ Powiększ</button>
          </div>
        </div>
      )}

      {/* Error */}
      {job.status === "failed" && (
        <div style={{
          padding: 16, color: "#ef4444", fontSize: 12,
          textAlign: "center", aspectRatio: "1/1",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {job.error || "Błąd generowania"}
        </div>
      )}
    </div>
  );
}

export default function ImagesPage() {
  const sessionId = useRef(`img-${Date.now()}`).current;

  const [mode, setMode] = useState("idle");
  const [selectedModels, setSelectedModels] = useState([]);
  const [style, setStyle] = useState("Fotorealistyczny");
  const [attachments, setAttachments] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [presetVariables, setPresetVariables] = useState([]);
  const [presetTemplate, setPresetTemplate] = useState("");
  const [aiModel, setAiModel] = useState("claude");
  const [aiInstruction, setAiInstruction] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const pollingRefs = useRef({});

  useEffect(() => {
    return () => { Object.values(pollingRefs.current).forEach(clearInterval); };
  }, []);

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
            j.jobId === jobId
              ? { ...j, status: job.status, output_urls: job.output_urls || [] }
              : j
          );
          if (updated.every(j => (j.status === "done" && j.output_urls?.length > 0) || j.status === "failed")) {
            setMode("done");
          }
          return updated;
        });
        if (job.status === "done" && job.output_urls?.length > 0) {
          clearInterval(pollingRefs.current[jobId]);
          delete pollingRefs.current[jobId];
        } else if (job.status === "failed") {
          clearInterval(pollingRefs.current[jobId]);
          delete pollingRefs.current[jobId];
          showToast("Błąd: " + (job.error_message || "Nieznany błąd"), "error");
        } else if (job.status === "done" && !job.output_urls?.length) {
          // done ale brak URL — polluj jeszcze przez chwilę
          console.log('Job done but no output_urls yet, continuing poll...');
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 5000);
    pollingRefs.current[jobId] = iv;
  }

  function handlePresetApply(preset) {
    if (preset.params?.style) setStyle(preset.params.style);
    setPresetTemplate(preset.prompt_template || "");
    setPresetVariables(preset.variables || []);
    if (!preset.variables?.length) setPrompt(preset.prompt_template || "");
  }

  function getCurrentConfig() {
    return {
      model_id: selectedModels[0]?.model?.model_id,
      params: selectedModels[0]?.params,
      prompt_template: prompt,
    };
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
          context: { jobType: "image", selectedModel: selectedModels[0]?.model?.model_id, params: selectedModels[0]?.params },
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
      selectedModels.map(async ({ model, params }) => {
        try {
          const res = await fetch("/api/brand-media/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model_id: model.model_id,
              prompt,
              params: { ...params, style },
              attachment_ids: attachments.map(a => a.id),
              estimated_cost: (parseFloat(model.price_per_unit) * (parseInt(params.variants) || 1)).toFixed(2),
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          return { jobId: data.job_id ?? data.id, modelId: model.model_id, modelName: model.model_name, status: "queued", output_urls: [] };
        } catch (err) {
          return { jobId: null, modelId: model.model_id, modelName: model.model_name, status: "failed", output_urls: [], error: err.message };
        }
      })
    );
    setActiveJobs(jobs);
    jobs.filter(j => j.jobId).forEach(j => startPolling(j.jobId));
    if (jobs.every(j => !j.jobId)) setMode("idle");
  }

  async function handleGenerate() {
    if (!selectedModels.length || !prompt.trim()) return;
    setMode("generating");
    setAlternatives([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await generateAll();
  }

  async function handleRerun() {
    Object.values(pollingRefs.current).forEach(clearInterval);
    pollingRefs.current = {};
    setMode("generating");
    await generateAll();
  }

  async function handleEnhanceAndEdit() {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/brand-media/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: aiModel, context: { jobType: "image" } }),
      });
      const data = await res.json();
      if (data.enhanced) setPrompt(data.enhanced);
      setMode("idle");
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
    } catch (err) {
      showToast("Błąd: " + err.message, "error");
      setMode("idle");
    } finally {
      setEnhancing(false);
    }
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
    setMode("idle");
    setActiveJobs([]);
    setPrompt("");
  }

  const totalCost = selectedModels.reduce(
    (sum, { model, params }) => sum + parseFloat(model.price_per_unit) * (parseInt(params.variants) || 1),
    0
  ).toFixed(2);

  const canGenerate = selectedModels.length > 0 && prompt.trim().length > 0;
  const cols = Math.max(activeJobs.length, 1);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f6", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <Nav current="/tools/brand-media-studio" />

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

      <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
          <Link href="/tools/brand-media-studio" style={{ color: "#aaa", textDecoration: "none" }}>Brand Media Studio</Link>
          {" / "}
          <span style={{ color: "#555" }}>Generowanie obrazów</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "#1a1a1a" }}>🎨 Generowanie obrazów</h1>
          <div style={{ display: "flex", gap: 6 }}>
            <Link href="/tools/brand-media-studio?tab=queue" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid #e5e5e5", background: "#fff", color: "#555", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>📋 Kolejka</Link>
            <Link href="/tools/brand-media-studio?tab=library" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid #e5e5e5", background: "#fff", color: "#555", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>🖼 Biblioteka</Link>
          </div>
        </div>

        {/* ── TRYB: generating ── */}
        {mode === "generating" && (
          <div style={{ marginBottom: 32 }}>
            <style>{`@keyframes bmsPixel { 0%{opacity:0.3} 100%{opacity:1} }`}</style>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(180px, 1fr))`,
              gap: 12, marginBottom: 12,
            }}>
              {activeJobs.map(job => (
                <JobCard key={job.jobId || job.modelId} job={job} onLightbox={setLightboxUrl} />
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <button onClick={handleCancel} style={{
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: 12, color: "#aaa", textDecoration: "underline",
              }}>Anuluj</button>
            </div>
          </div>
        )}

        {/* ── TRYB: done ── */}
        {mode === "done" && activeJobs.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <style>{`@keyframes bmsPixel { 0%{opacity:0.3} 100%{opacity:1} }`}</style>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(180px, 1fr))`,
              gap: 12, marginBottom: 16,
            }}>
              {activeJobs.map(job => (
                <JobCard key={job.jobId || job.modelId} job={job} onLightbox={setLightboxUrl} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button onClick={handleRerun} style={{
                padding: "8px 16px", border: "0.5px solid #ddd",
                borderRadius: 8, fontSize: 13, background: "transparent",
                cursor: "pointer", color: "#1a1a1a",
              }}>↺ Re-run wszystkich</button>
              <button
                onClick={handleEnhanceAndEdit}
                disabled={enhancing}
                style={{
                  padding: "8px 16px", border: `0.5px solid ${enhancing ? "#ddd" : ACCENT}`,
                  borderRadius: 8, fontSize: 13, background: "transparent",
                  cursor: enhancing ? "not-allowed" : "pointer", color: enhancing ? "#aaa" : ACCENT,
                }}
              >{enhancing ? "Ulepszam..." : "✦ Ulepsz prompt"}</button>
              <button onClick={handleReset} style={{
                flex: 1, padding: "8px 16px", border: "0.5px solid #ddd",
                borderRadius: 8, fontSize: 13, background: "transparent",
                cursor: "pointer", color: "#888",
              }}>← Zacznij od nowa</button>
            </div>
          </div>
        )}

        {/* ── TRYB: idle — formularz ── */}
        <div style={{ opacity: mode === "idle" ? 1 : 0.35, pointerEvents: mode === "idle" ? "auto" : "none", transition: "opacity 0.2s" }}>
          <Section title="Presety">
            <PresetPanel jobType="image" onApply={handlePresetApply} currentConfig={getCurrentConfig()} />
          </Section>

          {presetVariables.length > 0 && (
            <PresetVariables
              variables={presetVariables}
              promptTemplate={presetTemplate}
              onPromptChange={setPrompt}
            />
          )}

          <Section title="Materiały źródłowe">
            <AttachmentPanel sessionId={sessionId} onChange={setAttachments} maxFiles={20} />
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>
              Wgrane pliki zostaną przekazane modelowi jako referencja wizualna
            </div>
          </Section>

          <Section>
            <ModelSelector
              category="image"
              selectedModels={selectedModels}
              onModelsChange={setSelectedModels}
            />
          </Section>

          <Section title="Styl wizualny">
            <ToggleGroup options={STYLE_OPTIONS} value={style} onChange={setStyle} />
          </Section>

          <Section title="Prompt">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Opisz grafikę którą chcesz wygenerować..."
              style={{
                width: "100%", minHeight: 140, padding: "12px 14px",
                border: `1.5px solid ${ACCENT}`, borderRadius: 8, fontSize: 14,
                resize: "vertical", boxSizing: "border-box", outline: "none",
                fontFamily: "inherit", lineHeight: 1.6, marginBottom: 16,
                background: "#fdf8f3",
              }}
            />

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 500 }}>Model AI do ulepszania</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { id: "claude", label: "Claude Sonnet" },
                  { id: "gpt-4o", label: "GPT-4o" },
                  { id: "gpt-4.1", label: "GPT-4.1" },
                  { id: "o3", label: "o3" },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setAiModel(m.id)}
                    style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                      background: aiModel === m.id ? ACCENT : "transparent",
                      color: aiModel === m.id ? "#fff" : "#666",
                      border: aiModel === m.id ? `1px solid ${ACCENT}` : "1px solid #ddd",
                      fontWeight: aiModel === m.id ? 500 : 400,
                    }}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 500 }}>Instrukcja dla AI (opcjonalna)</div>
              <textarea
                value={aiInstruction}
                onChange={e => setAiInstruction(e.target.value)}
                placeholder="np. 'zaproponuj 3 warianty stylistyczne'"
                style={{
                  width: "100%", minHeight: 50, padding: "8px 10px",
                  border: "1px solid #ddd", borderRadius: 8,
                  fontSize: 13, resize: "vertical", fontFamily: "inherit",
                  boxSizing: "border-box", outline: "none",
                }}
              />
            </div>

            <button
              onClick={handleEnhancePrompt}
              disabled={enhancing || !prompt.trim()}
              style={{
                padding: "8px 16px", fontSize: 13, borderRadius: 6,
                border: `1px solid ${ACCENT}`, background: "#fff",
                color: enhancing ? "#ccc" : ACCENT,
                cursor: enhancing || !prompt.trim() ? "not-allowed" : "pointer",
              }}
            >{enhancing ? "Generuję..." : "✦ Ulepsz prompt"}</button>

            {alternatives.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>Propozycje AI — kliknij aby użyć:</div>
                {alternatives.map((alt, i) => (
                  <div
                    key={i}
                    onClick={() => setPrompt(alt)}
                    style={{
                      padding: "10px 14px",
                      border: prompt === alt ? `1.5px solid ${ACCENT}` : "1px solid #eee",
                      borderRadius: 8, fontSize: 13, lineHeight: 1.5,
                      cursor: "pointer", background: prompt === alt ? "#fdf6ee" : "#fff", color: "#333",
                    }}
                  >
                    <div style={{ fontSize: 10, color: ACCENT, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Wariant {i + 1}
                    </div>
                    {alt}
                  </div>
                ))}
              </div>
            )}

            {selectedModels.length > 0 && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
                {selectedModels.map(({ model, params }) => (
                  <span key={model.model_id} style={{ marginRight: 12 }}>
                    {model.model_name}: ~${(parseFloat(model.price_per_unit) * (parseInt(params.variants) || 1)).toFixed(2)}
                  </span>
                ))}
                {selectedModels.length > 1 && (
                  <strong style={{ color: ACCENT }}>Łącznie: ~${totalCost}</strong>
                )}
              </div>
            )}
          </Section>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              width: "100%", padding: "14px 20px", fontSize: 15, fontWeight: 600,
              background: !canGenerate ? "#f0e8df" : ACCENT,
              border: "none", borderRadius: 12, color: "#fff",
              cursor: !canGenerate ? "not-allowed" : "pointer",
              marginBottom: 32, letterSpacing: "0.02em",
            }}
          >
            {!selectedModels.length ? "Wybierz co najmniej 1 model powyżej" : "🎨 Generuj grafikę"}
          </button>
        </div>
      </div>

      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <img
              src={lightboxUrl}
              style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, display: "block" }}
            />
            <div style={{ position: "absolute", bottom: -48, left: 0, right: 0, display: "flex", gap: 8, justifyContent: "center" }}>
              <a href={lightboxUrl} download style={{ padding: "8px 20px", background: ACCENT, color: "#fff", borderRadius: 8, fontSize: 13, textDecoration: "none" }}>⬇ Pobierz</a>
              <button onClick={() => setLightboxUrl(null)} style={{ padding: "8px 20px", background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 8, fontSize: 13, border: "none", cursor: "pointer" }}>Zamknij</button>
            </div>
          </div>
          <button
            onClick={() => setLightboxUrl(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>
      )}
    </div>
  );
}
