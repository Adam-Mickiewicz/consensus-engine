"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Nav from "../../../components/Nav";
import AttachmentPanel from "../components/AttachmentPanel";
import PresetPanel from "../components/PresetPanel";
import PresetVariables from "../components/PresetVariables";

const ACCENT = "#b8763a";

const RESOLUTION_LABELS = {
  "1024x1024": "1K (1024px)",
  "2048x2048": "2K (2048px)",
  "4096x4096": "4K (4096px)",
  "1792x1024": "16:9 HD",
  "1024x1792": "9:16 HD",
  "1536x1024": "16:9",
  "1024x1536": "9:16",
  "auto": "Auto",
};

const QUALITY_LABELS = {
  "low": "Szybka",
  "medium": "Standardowa",
  "high": "Wysoka",
  "hd": "HD",
  "standard": "Standard",
  "auto": "Auto",
};

const STYLE_OPTIONS = [
  "Fotorealistyczny", "Ilustracja", "Fotografia produktowa",
  "Cinematic", "Animowany", "Minimalistyczny", "Vintage", "Szkic",
];

const BADGE_COLORS = {
  green:  { bg: "#e8f5e9", text: "#2e7d32" },
  purple: { bg: "#f3e5f5", text: "#7b1fa2" },
  amber:  { bg: "#fff8e1", text: "#f57f17" },
  red:    { bg: "#fce4ec", text: "#c62828" },
};

function ToggleGroup({ options, value, onChange, labelFn }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "6px 14px", fontSize: 12,
            border: `1px solid ${value === opt ? ACCENT : "#ddd"}`,
            borderRadius: 6,
            background: value === opt ? "#fdf7f2" : "#fff",
            color: value === opt ? ACCENT : "#555",
            cursor: "pointer",
            fontWeight: value === opt ? 600 : 400,
            transition: "all 0.15s",
          }}
        >
          {labelFn ? labelFn(opt) : opt}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function calculateCost(model, params) {
  if (!model) return "0.00";
  const variants = parseInt(params?.variants) || 1;
  return (parseFloat(model.price_per_unit) * variants).toFixed(2);
}

export default function ImagesPage() {
  const sessionId = useRef(`img-${Date.now()}`).current;

  const [mode, setMode] = useState("idle"); // 'idle' | 'generating' | 'done'
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [attachments, setAttachments] = useState([]);

  const [params, setParams] = useState({
    orientation: "1:1",
    resolution: "",
    style: "Fotorealistyczny",
    quality: "",
    variants: "1",
  });

  const [prompt, setPrompt] = useState("");
  const [presetVariables, setPresetVariables] = useState([]);
  const [presetTemplate, setPresetTemplate] = useState("");
  const [aiModel, setAiModel] = useState("claude");
  const [aiInstruction, setAiInstruction] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function startPolling(jobId) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/brand-media/jobs/${jobId}`);
        const data = await res.json();
        const job = data.job ?? data;
        setActiveJob(job);
        if (job.status === "done") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setMode("done");
        }
        if (job.status === "failed") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setMode("idle");
          showToast("Błąd: " + (job.error_message || "Nieznany błąd"), "error");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 5000);
  }

  function setParam(key, val) {
    setParams(p => ({ ...p, [key]: val }));
  }

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/brand-media/models?category=image");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = data.models || [];
        setModels(list);
        if (list.length) handleModelChange(list[0]);
      } catch (err) {
        console.error("Models fetch error:", err);
      } finally {
        setModelsLoading(false);
      }
    }
    fetchModels();
  }, []);

  function handleModelChange(model) {
    setSelectedModel(model);
    const cap = model.capabilities || {};
    setParams(prev => ({
      ...prev,
      resolution: cap.resolutions?.[0] || "",
      quality: cap.quality?.[0] || "",
      orientation: cap.orientations?.[0] || "1:1",
    }));
    setAlternatives([]);
  }

  function handlePresetApply(preset) {
    if (preset.model_id) {
      const model = models.find(m => m.model_id === preset.model_id);
      if (model) handleModelChange(model);
    }
    if (preset.params) setParams(p => ({ ...p, ...preset.params }));
    setPresetTemplate(preset.prompt_template || "");
    setPresetVariables(preset.variables || []);
    if (!preset.variables?.length) {
      setPrompt(preset.prompt_template || "");
    }
  }

  function getCurrentConfig() {
    return { model_id: selectedModel?.model_id, params, prompt_template: prompt };
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
          prompt,
          instruction: aiInstruction,
          model: aiModel,
          context: { jobType: "image", selectedModel: selectedModel?.model_id, params },
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

  async function submitGeneration() {
    const res = await fetch("/api/brand-media/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model_id: selectedModel.model_id,
        prompt,
        params: { ...params },
        attachment_ids: attachments.map(a => a.id),
        estimated_cost: parseFloat(calculateCost(selectedModel, params)),
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function handleGenerate() {
    if (!selectedModel) { showToast("Wybierz model", "error"); return; }
    if (!prompt.trim()) { showToast("Wpisz prompt", "error"); return; }
    setMode("generating");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const data = await submitGeneration();
      const jobId = data.job_id ?? data.id;
      if (jobId) {
        setActiveJob({ id: jobId, status: "queued", output_urls: [] });
        startPolling(jobId);
      } else {
        setMode("idle");
        showToast("Grafika dodana do kolejki!");
      }
      setAlternatives([]);
    } catch (err) {
      setMode("idle");
      showToast("Błąd: " + err.message, "error");
    }
  }

  async function handleRerun() {
    setMode("generating");
    try {
      const data = await submitGeneration();
      const jobId = data.job_id ?? data.id;
      if (jobId) {
        setActiveJob({ id: jobId, status: "queued", output_urls: [] });
        startPolling(jobId);
      } else {
        setMode("idle");
      }
    } catch (err) {
      setMode("idle");
      showToast("Błąd: " + err.message, "error");
    }
  }

  async function handleEnhanceAndEdit() {
    if (!prompt.trim()) return;
    try {
      const enhRes = await fetch("/api/brand-media/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: aiModel,
          context: { jobType: "image", selectedModel: selectedModel?.model_id, params },
        }),
      });
      const enhData = await enhRes.json();
      if (enhData.enhanced) setPrompt(enhData.enhanced);
      setMode("idle");
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
    } catch (err) {
      showToast("Błąd ulepszania: " + err.message, "error");
      setMode("idle");
    }
  }

  function handleCancel() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setMode("idle");
    setActiveJob(null);
  }

  function handleReset() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setMode("idle");
    setActiveJob(null);
    setPrompt("");
  }

  const cap = selectedModel?.capabilities || {};
  const availableOrientations = cap.orientations || ["1:1", "16:9", "9:16"];
  const availableResolutions = cap.resolutions || [];
  const availableQuality = cap.quality || [];
  const costLabel = calculateCost(selectedModel, params);

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

      <div style={{ padding: "28px 32px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
          <Link href="/tools/brand-media-studio" style={{ color: "#aaa", textDecoration: "none" }}>Brand Media Studio</Link>
          {" / "}
          <span style={{ color: "#555" }}>Generowanie obrazów</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 24px", color: "#1a1a1a" }}>
          🎨 Generowanie obrazów
        </h1>

        {/* ── TRYB: generating ── */}
        {mode === "generating" && (
          <div style={{ marginBottom: 32 }}>
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
              @keyframes bmsBar { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }
              @keyframes borderHue { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
            `}</style>

            <div style={{
              width: "100%", aspectRatio: "1/1", maxWidth: 500, margin: "0 auto",
              borderRadius: 18, position: "relative",
            }}>
              {/* Animated rainbow border */}
              <div style={{
                position: "absolute", inset: 0, borderRadius: 18,
                background: "conic-gradient(from 0deg, #ff6bb5, #b86bff, #ffd700, #6bdbff, #ff8c42, #a8ff6b, #ff6bb5)",
                animation: "borderHue 3s linear infinite",
              }} />

              <div style={{
                position: "absolute", inset: 3, borderRadius: 16, overflow: "hidden",
                background: "linear-gradient(135deg, #fdf4ff 0%, #fff8f0 50%, #f0f8ff 100%)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 16,
              }}>
              {/* Sparkle particles */}
              <div style={{ position: "relative", width: 160, height: 160 }}>
                {[
                  { color: "#ff6bb5", anim: "fly0", dur: 1.0, delay: 0.0,  size: 10 },
                  { color: "#b86bff", anim: "fly1", dur: 1.2, delay: 0.15, size: 8  },
                  { color: "#ffd700", anim: "fly2", dur: 0.9, delay: 0.3,  size: 12 },
                  { color: "#6bdbff", anim: "fly3", dur: 1.1, delay: 0.0,  size: 7  },
                  { color: "#ff8c42", anim: "fly4", dur: 1.0, delay: 0.45, size: 9  },
                  { color: "#a8ff6b", anim: "fly5", dur: 0.8, delay: 0.6,  size: 11 },
                  { color: "#ff6b6b", anim: "fly6", dur: 1.3, delay: 0.1,  size: 8  },
                  { color: "#6bffd4", anim: "fly7", dur: 1.0, delay: 0.75, size: 10 },
                  { color: "#ff6bb5", anim: "fly2", dur: 1.1, delay: 0.9,  size: 6  },
                  { color: "#ffd700", anim: "fly0", dur: 0.9, delay: 0.5,  size: 13 },
                  { color: "#b86bff", anim: "fly3", dur: 1.2, delay: 0.25, size: 7  },
                  { color: "#ff8c42", anim: "fly6", dur: 1.0, delay: 0.7,  size: 9  },
                ].map((p, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    left: "50%", top: "60%",
                    width: p.size, height: p.size,
                    borderRadius: "50%",
                    background: p.color,
                    marginLeft: -p.size / 2,
                    marginTop: -p.size / 2,
                    animation: `${p.anim} ${p.dur}s ease-out infinite`,
                    animationDelay: `${p.delay}s`,
                    boxShadow: `0 0 6px ${p.color}`,
                  }} />
                ))}

                {/* Unicorn */}
                <div style={{
                  position: "absolute", left: "50%", top: "55%",
                  fontSize: 72, lineHeight: 1,
                  animation: "unicornFloat 1.4s ease-in-out infinite alternate",
                  userSelect: "none",
                }}>🦄</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a", marginBottom: 4 }}>
                  {activeJob?.status === "queued" ? "Przygotowuję generowanie..." : "Generuję grafikę..."}
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  {selectedModel?.model_name} · ~{costLabel} USD
                </div>
              </div>

              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                height: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: "40%",
                  background: "linear-gradient(90deg, #ff6bb5, #b86bff, #ffd700)",
                  animation: "bmsBar 1.5s ease-in-out infinite",
                }} />
              </div>
              </div>{/* /inner content */}
            </div>{/* /outer wrapper */}

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={handleCancel} style={{
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: 12, color: "#aaa", textDecoration: "underline",
              }}>Anuluj</button>
            </div>
          </div>
        )}

        {/* ── TRYB: done ── */}
        {mode === "done" && activeJob && (
          <div style={{ maxWidth: 500, margin: "0 auto 32px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: activeJob.output_urls?.length > 1 ? "repeat(2, 1fr)" : "1fr",
              gap: 8, marginBottom: 16,
            }}>
              {activeJob.output_urls?.map((url, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: "hidden", background: "#000" }}>
                  <img src={url} alt={`Wariant ${i + 1}`} style={{ width: "100%", display: "block" }} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {activeJob.output_urls?.[0] && (
                <a href={activeJob.output_urls[0]} download style={{
                  padding: "8px 16px", background: ACCENT, color: "#fff",
                  borderRadius: 8, fontSize: 13, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>⬇ Pobierz</a>
              )}

              <button onClick={handleRerun} style={{
                padding: "8px 16px", border: "0.5px solid var(--color-border-secondary, #ddd)",
                borderRadius: 8, fontSize: 13, background: "transparent",
                cursor: "pointer", color: "var(--color-text-primary, #1a1a1a)",
              }}>↺ Re-run</button>

              <button onClick={handleEnhanceAndEdit} style={{
                padding: "8px 16px", border: `0.5px solid ${ACCENT}`,
                borderRadius: 8, fontSize: 13, background: "transparent",
                cursor: "pointer", color: ACCENT,
              }}>✦ Ulepsz prompt</button>
            </div>

            <button onClick={handleReset} style={{
              width: "100%", padding: 10,
              border: "0.5px solid var(--color-border-tertiary, #ddd)",
              borderRadius: 8, fontSize: 13,
              background: "transparent", cursor: "pointer",
              color: "var(--color-text-secondary, #888)",
            }}>← Zacznij od nowa</button>
          </div>
        )}

        {/* ── TRYB: idle — formularz ── */}
        <div style={{
          opacity: mode === "idle" ? 1 : 0.35,
          pointerEvents: mode === "idle" ? "auto" : "none",
          transition: "opacity 0.2s",
        }}>
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

          <Section title="Model">
            {modelsLoading ? (
              <div style={{ fontSize: 13, color: "#888" }}>Ładowanie modeli...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {models.map(model => {
                  const isSelected = model.model_id === selectedModel?.model_id;
                  const badgeStyle = BADGE_COLORS[model.badge_color] || BADGE_COLORS.amber;
                  return (
                    <div
                      key={model.model_id}
                      onClick={() => handleModelChange(model)}
                      style={{
                        border: `${isSelected ? "1.5px" : "1px"} solid ${isSelected ? ACCENT : "#eee"}`,
                        borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                        background: isSelected ? "#fdf7f2" : "#fff",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>{model.model_name}</span>
                        {model.badge && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10,
                            background: badgeStyle.bg, color: badgeStyle.text,
                          }}>
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: ACCENT, fontWeight: 500, marginBottom: 4 }}>
                        ${parseFloat(model.price_per_unit).toFixed(2)} / {model.unit_label}
                      </div>
                      <div style={{ fontSize: 11, color: "#999" }}>
                        {model.capabilities?.resolutions?.slice(0, 3).map(r => RESOLUTION_LABELS[r] || r).join(" · ")}
                      </div>
                      <div style={{ fontSize: 10, color: "#bbb", marginTop: 2, textTransform: "capitalize" }}>
                        {model.provider}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {selectedModel && (
            <Section title="Parametry">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 500 }}>Orientacja / proporcje</div>
                <ToggleGroup options={availableOrientations} value={params.orientation} onChange={v => setParam("orientation", v)} />
              </div>

              {availableResolutions.length > 1 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 500 }}>Rozdzielczość</div>
                  <ToggleGroup
                    options={availableResolutions}
                    value={params.resolution}
                    onChange={v => setParam("resolution", v)}
                    labelFn={r => RESOLUTION_LABELS[r] || r}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 500 }}>Styl wizualny</div>
                <select
                  value={params.style}
                  onChange={e => setParam("style", e.target.value)}
                  style={{ padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", cursor: "pointer" }}
                >
                  {STYLE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {availableQuality.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 500 }}>Jakość</div>
                  <ToggleGroup
                    options={availableQuality}
                    value={params.quality}
                    onChange={v => setParam("quality", v)}
                    labelFn={q => QUALITY_LABELS[q] || q}
                  />
                </div>
              )}

              <div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 500 }}>Liczba wariantów</div>
                <ToggleGroup options={["1", "2", "4"]} value={params.variants} onChange={v => setParam("variants", v)} />
              </div>
            </Section>
          )}

          <Section title="Prompt">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Opisz grafikę którą chcesz wygenerować..."
              style={{
                width: "100%", minHeight: 140, padding: "12px 14px",
                border: "1px solid #ddd", borderRadius: 8, fontSize: 14,
                resize: "vertical", boxSizing: "border-box", outline: "none",
                fontFamily: "inherit", lineHeight: 1.6, marginBottom: 16,
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
                  >
                    {m.label}
                  </button>
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
            >
              {enhancing ? "Generuję..." : "✦ Ulepsz prompt"}
            </button>

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
                      cursor: "pointer", background: prompt === alt ? "#fdf6ee" : "#fff",
                      color: "#333",
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

            {selectedModel && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
                Szacowany koszt:{" "}
                <strong style={{ color: ACCENT }}>~${costLabel}</strong>
                <span style={{ color: "#bbb", marginLeft: 4 }}>
                  ({selectedModel.model_name} · {params.variants} wariant)
                </span>
              </div>
            )}
          </Section>

          <button
            onClick={handleGenerate}
            disabled={!selectedModel || !prompt.trim()}
            style={{
              width: "100%", padding: "14px 20px", fontSize: 15, fontWeight: 600,
              background: !selectedModel || !prompt.trim() ? "#f0e8df" : ACCENT,
              border: "none", borderRadius: 12, color: "#fff",
              cursor: !selectedModel || !prompt.trim() ? "not-allowed" : "pointer",
              marginBottom: 32, letterSpacing: "0.02em",
            }}
          >
            🎨 Generuj grafikę
          </button>
        </div>
      </div>
    </div>
  );
}
