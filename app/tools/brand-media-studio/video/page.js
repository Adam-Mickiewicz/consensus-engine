"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../../../components/Nav";
import ModelSelector from "../components/ModelSelector";
import MusicPanel from "../components/MusicPanel";
import PresetPanel from "../components/PresetPanel";
import PresetVariables from "../components/PresetVariables";

const ACCENT = "#b8763a";

const CAMERA_MOVES = ["Statyczny", "Powolny zoom in", "Powolny zoom out", "Pan lewo → prawo", "Orbit (obrót produktu)", "Dolly forward"];
const VISUAL_STYLES = ["Product hero (studyjny)", "Lifestyle", "Cinematic", "Animowany / motion", "Dokumentalny"];
const LIGHTINGS = ["Naturalne (studio)", "Ciepłe (złata godzina)", "Zimne (minimalistyczne)", "Dramatyczne", "Soft (rozmyte tło)"];
const ORIENTATION_OPTIONS = ["16:9", "9:16", "1:1"];
const VARIANT_OPTIONS = ["1", "2", "4"];
const STEP_LABELS = ["Model", "Parametry", "Prompt", "Generuj"];

function calculateCost(model, params) {
  if (!model) return "0.00";
  const duration = parseInt(params?.duration) || 4;
  const variants = parseInt(params?.variants) || 1;
  const pricePerSec = params?.resolution === "4K" && model.capabilities?.price_4k
    ? parseFloat(model.capabilities.price_4k)
    : parseFloat(model.price_per_unit);
  return (pricePerSec * duration * variants).toFixed(2);
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
        >
          {opt}
        </button>
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

export default function VideoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [selectedModel, setSelectedModel] = useState(null);
  const [params, setParams] = useState({
    orientation: "9:16",
    duration: "4s",
    resolution: "",
    camera_move: "Statyczny",
    visual_style: "Product hero (studyjny)",
    lighting: "Naturalne (studio)",
    variants: "1",
  });
  const [prompt, setPrompt] = useState("");
  const [presetVariables, setPresetVariables] = useState([]);
  const [presetTemplate, setPresetTemplate] = useState("");
  const [baseImages, setBaseImages] = useState([]);
  const [musicConfig, setMusicConfig] = useState({ mode: "none" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [aiModel, setAiModel] = useState("claude");
  const [aiInstruction, setAiInstruction] = useState("");

  function setParam(key, val) {
    setParams(p => ({ ...p, [key]: val }));
  }

  function handleModelChange(model) {
    setSelectedModel(model);
    if (model?.capabilities?.resolutions?.[0]) {
      setParam("resolution", model.capabilities.resolutions[0]);
    }
  }

  useEffect(() => {
    if (!selectedModel) return;
    const cap = selectedModel.capabilities || {};
    const durations = cap.durations || [];
    const defaultDur = durations.length > 0 ? durations[0] : (cap.max_duration || 4);
    setParams(prev => ({ ...prev, duration: `${defaultDur}s` }));
  }, [selectedModel]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function getCurrentConfig() {
    return { model_id: selectedModel?.model_id, params, prompt_template: prompt };
  }

  function handlePresetApply(preset) {
    if (preset.params) setParams(p => ({ ...p, ...preset.params }));
    setPresetTemplate(preset.prompt_template || '');
    setPresetVariables(preset.variables || []);
    if (!preset.variables?.length) {
      setPrompt(preset.prompt_template || '');
    }
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
          context: { selectedModel: selectedModel?.model_id, params, jobType: "video" },
        }),
      });
      const data = await res.json();
      if (data.enhanced) setPrompt(data.enhanced);
      if (data.alternatives?.length) setAlternatives(data.alternatives);
    } catch (err) {
      showToast("Błąd ulepszania promptu", "error");
    } finally {
      setEnhancing(false);
    }
  }

  async function handleSubmit() {
    if (!selectedModel || !prompt.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        model_id: selectedModel.model_id,
        prompt,
        music_mode: musicConfig.mode,
        music_brief: musicConfig.mode === "brief"
          ? `${musicConfig.genre} / ${musicConfig.tempo}${musicConfig.description ? " / " + musicConfig.description : ""}`
          : null,
        params: { ...params, base_images: baseImages.map(b => b.url) },
        estimated_cost: parseFloat(calculateCost(selectedModel, params)),
      };

      const res = await fetch("/api/brand-media/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `HTTP ${res.status}`);
      }

      showToast("Job dodany do kolejki");
      setTimeout(() => router.push("/tools/brand-media-studio?tab=queue"), 1000);
    } catch (err) {
      showToast("Błąd: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const cap = selectedModel?.capabilities || {};
  const availableDurations = cap.durations || [];
  const availableOrientations = cap.orientations || ORIENTATION_OPTIONS;
  const availableResolutions = cap.resolutions || [];
  const estimatedCost = calculateCost(selectedModel, params);

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

      <div style={{ padding: "28px 32px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
          <Link href="/tools/brand-media-studio" style={{ color: "#aaa", textDecoration: "none" }}>Brand Media Studio</Link>
          {" / "}
          <span style={{ color: "#555" }}>Generowanie wideo</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 28px", color: "#1a1a1a" }}>
          🎬 Generowanie wideo
        </h1>

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
              selectedModelId={selectedModel?.model_id}
              onModelChange={handleModelChange}
            />
          </div>
        )}

        {/* KROK 2 — Parametry */}
        {step === 2 && (
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Parametry wideo
            </div>

            <ParamRow label="Orientacja">
              <ToggleGroup options={availableOrientations} value={params.orientation} onChange={v => setParam("orientation", v)} />
            </ParamRow>

            <ParamRow label="Długość">
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {availableDurations.length > 0
                    ? availableDurations.map(d => (
                      <button
                        key={d}
                        onClick={() => setParam("duration", `${d}s`)}
                        style={{
                          padding: "7px 14px", fontSize: 12,
                          border: `1px solid ${params.duration === `${d}s` ? ACCENT : "#ddd"}`,
                          borderRadius: 6,
                          background: params.duration === `${d}s` ? "#fdf7f2" : "#fff",
                          color: params.duration === `${d}s` ? ACCENT : "#555",
                          cursor: "pointer", fontWeight: params.duration === `${d}s` ? 600 : 400,
                        }}
                      >
                        {d}s
                      </button>
                    ))
                    : <span style={{ fontSize: 12, color: "#aaa" }}>Brak danych</span>
                  }
                </div>
                {cap.extend && (
                  <div style={{ fontSize: 11, color: "#888", marginTop: 6, padding: "6px 10px", background: "#fafafa", borderRadius: 6, borderLeft: `2px solid #e8ddd0` }}>
                    Extend do <strong>{cap.extend_max_seconds}s</strong> dostępny po wygenerowaniu.
                  </div>
                )}
              </div>
            </ParamRow>

            {availableResolutions.length > 1 && (
              <ParamRow label="Rozdzielczość">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {availableResolutions.map(res => (
                      <button
                        key={res}
                        onClick={() => setParam("resolution", res)}
                        style={{
                          flex: 1, padding: "5px 8px",
                          border: params.resolution === res ? `1.5px solid ${ACCENT}` : "1px solid #ddd",
                          borderRadius: 6, fontSize: 12, cursor: "pointer",
                          background: params.resolution === res ? "#fdf7f2" : "#fff",
                          color: params.resolution === res ? ACCENT : "#666",
                          fontWeight: params.resolution === res ? 500 : 400,
                        }}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                  {params.resolution === "4K" && selectedModel?.capabilities?.price_4k && (
                    <div style={{
                      fontSize: 11, color: ACCENT, marginTop: 4,
                      padding: "4px 8px", background: "#fdf7f2", borderRadius: 4,
                    }}>
                      4K: ${selectedModel.capabilities.price_4k}/sek. (vs ${selectedModel.price_per_unit}/sek. dla 1080p)
                    </div>
                  )}
                </div>
              </ParamRow>
            )}

            <ParamRow label="Ruch kamery">
              <Select value={params.camera_move} onChange={v => setParam("camera_move", v)} options={CAMERA_MOVES} />
            </ParamRow>
            <ParamRow label="Styl wizualny">
              <Select value={params.visual_style} onChange={v => setParam("visual_style", v)} options={VISUAL_STYLES} />
            </ParamRow>
            <ParamRow label="Oświetlenie">
              <Select value={params.lighting} onChange={v => setParam("lighting", v)} options={LIGHTINGS} />
            </ParamRow>
            <ParamRow label="Warianty">
              <ToggleGroup options={VARIANT_OPTIONS} value={params.variants} onChange={v => setParam("variants", v)} small />
            </ParamRow>

            <ParamRow label="Muzyka">
              <MusicPanel modelCapabilities={cap} onMusicChange={setMusicConfig} />
            </ParamRow>

            {selectedModel?.max_ref_images > 0 && (
              <ParamRow label="Zdjęcia bazowe">
                <div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>Max {selectedModel.max_ref_images} zdjęć</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {Array.from({ length: selectedModel.max_ref_images }).map((_, i) => {
                      const img = baseImages[i];
                      return (
                        <div key={i}
                          style={{
                            width: 64, height: 64, border: `2px dashed ${img ? ACCENT : "#ddd"}`,
                            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", overflow: "hidden", background: img ? "transparent" : "#fafafa",
                          }}
                          onClick={() => {
                            if (img) {
                              setBaseImages(prev => prev.filter((_, pi) => pi !== i));
                            } else {
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
              <PresetVariables
                variables={presetVariables}
                promptTemplate={presetTemplate}
                onPromptChange={setPrompt}
              />
            )}

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Opisz co ma się dziać w wideo... np. skarpety leżą na drewnianym blacie, delikatny wiatr porusza tkaniną"
              style={{
                width: "100%", minHeight: 200, padding: "12px 14px",
                border: "1px solid #ddd", borderRadius: 8, fontSize: 14,
                resize: "vertical", boxSizing: "border-box", outline: "none",
                fontFamily: "inherit", lineHeight: 1.6, marginBottom: 16,
              }}
            />

            {/* Model AI */}
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

            {/* Instrukcja dla AI */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 500 }}>Instrukcja dla AI (opcjonalna)</div>
              <textarea
                value={aiInstruction}
                onChange={e => setAiInstruction(e.target.value)}
                placeholder="np. 'zaproponuj 3 warianty — minimalistyczny, narracyjny i energiczny' lub 'skup się na produkcie, styl lifestyle'"
                style={{
                  width: "100%", minHeight: 60, padding: 10,
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
              {enhancing ? "Generuję..." : "✦ Ulepsz prompt (AI)"}
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
                      color: "#333", transition: "border-color 0.15s",
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

            <div style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
              Szacowany koszt generowania wideo:{" "}
              <strong style={{ color: ACCENT }}>~${calculateCost(selectedModel, params)}</strong>
              <span style={{ color: "#bbb", marginLeft: 4 }}>
                ({selectedModel?.model_name} · {params?.duration} · {params?.variants || 1} wariant)
              </span>
            </div>
          </div>
        )}

        {/* KROK 4 — Generuj */}
        {step === 4 && (
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Podsumowanie i generowanie
            </div>

            <div style={{
              background: "#fafafa", border: "1px solid #eee", borderRadius: 8,
              padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#555",
              display: "flex", gap: 16, flexWrap: "wrap",
            }}>
              <span><strong>Model:</strong> {selectedModel?.model_name || selectedModel?.model_id}</span>
              <span><strong>Format:</strong> {params.orientation} · {params.duration}</span>
              <span><strong>Warianty:</strong> {params.variants}</span>
              <span style={{ color: ACCENT }}><strong>Koszt:</strong> ~${estimatedCost}</span>
            </div>

            <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Prompt (możesz edytować):</div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              style={{
                width: "100%", minHeight: 140, padding: "12px 14px",
                border: "1px solid #ddd", borderRadius: 8, fontSize: 14,
                resize: "vertical", boxSizing: "border-box", outline: "none",
                fontFamily: "inherit", lineHeight: 1.6, marginBottom: 20,
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={submitting || !prompt.trim()}
              style={{
                width: "100%", padding: "14px 20px", fontSize: 15, fontWeight: 600,
                background: submitting ? "#f0e8df" : ACCENT,
                border: "none", borderRadius: 8, color: "#fff",
                cursor: submitting ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {submitting ? "Dodaję do kolejki..." : "🎬 Generuj wideo"}
            </button>
          </div>
        )}

        {/* Nawigacja */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            style={{
              padding: "9px 20px", fontSize: 13, borderRadius: 6,
              border: "1px solid #ddd", background: "#fff", color: step === 1 ? "#ccc" : "#555",
              cursor: step === 1 ? "not-allowed" : "pointer",
            }}
          >
            ← Wstecz
          </button>

          {step < totalSteps && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !selectedModel}
              style={{
                padding: "9px 20px", fontSize: 13, fontWeight: 600, borderRadius: 6,
                background: (step === 1 && !selectedModel) ? "#f0e8df" : ACCENT,
                border: "none", color: "#fff",
                cursor: (step === 1 && !selectedModel) ? "not-allowed" : "pointer",
              }}
            >
              Dalej →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
