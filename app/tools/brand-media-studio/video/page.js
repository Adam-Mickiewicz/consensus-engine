"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../../../components/Nav";
import ModelSelector from "../components/ModelSelector";
import ReferencePanel from "../components/ReferencePanel";
import MusicPanel from "../components/MusicPanel";
import PromptSandbox from "../components/PromptSandbox";
import CostEstimator from "../components/CostEstimator";

const ACCENT = "#b8763a";

const CAMERA_MOVES = ["Statyczny", "Powolny zoom in", "Powolny zoom out", "Pan lewo → prawo", "Orbit (obrót produktu)", "Dolly forward"];
const VISUAL_STYLES = ["Product hero (studyjny)", "Lifestyle", "Cinematic", "Animowany / motion", "Dokumentalny"];
const LIGHTINGS = ["Naturalne (studio)", "Ciepłe (złota godzina)", "Zimne (minimalistyczne)", "Dramatyczne", "Soft (rozmyte tło)"];

const DURATION_OPTIONS = ["5s", "10s", "15s", "30s"];
const ORIENTATION_OPTIONS = ["16:9", "9:16", "1:1"];
const VARIANT_OPTIONS = ["1", "2", "4"];

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

export default function VideoPage() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState(null);
  const [params, setParams] = useState({
    orientation: "9:16",
    duration: "5s",
    resolution: "",
    camera_move: "Statyczny",
    visual_style: "Product hero (studyjny)",
    lighting: "Naturalne (studio)",
    variants: "1",
  });
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState([]);
  const [baseImages, setBaseImages] = useState([]);
  const [musicConfig, setMusicConfig] = useState({ mode: "none" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [toast, setToast] = useState(null);
  const promptRef = useRef("");

  function setParam(key, val) {
    setParams(p => ({ ...p, [key]: val }));
  }

  function handleModelChange(model) {
    setSelectedModel(model);
    // Set default resolution from model capabilities
    if (model?.capabilities?.resolutions?.[0]) {
      setParam("resolution", model.capabilities.resolutions[0]);
    }
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function computeCost() {
    if (!selectedModel) return 0;
    const duration = parseInt(params.duration) || 5;
    const variants = parseInt(params.variants) || 1;
    return (selectedModel.price_per_unit * duration * variants).toFixed(2);
  }

  const maxDuration = selectedModel?.capabilities?.max_duration || 30;
  const availableDurations = DURATION_OPTIONS.filter(d => parseInt(d) <= maxDuration);
  const availableOrientations = selectedModel?.capabilities?.orientations || ORIENTATION_OPTIONS;
  const availableResolutions = selectedModel?.capabilities?.resolutions || [];

  async function handleSubmit() {
    if (!selectedModel) { setSubmitError("Wybierz model."); return; }
    if (!promptRef.current.trim()) { setSubmitError("Wpisz prompt."); return; }

    setSubmitting(true);
    setSubmitError("");

    try {
      const body = {
        model_id: selectedModel.model_id,
        prompt: promptRef.current,
        music_mode: musicConfig.mode,
        music_brief: musicConfig.mode === "brief"
          ? `${musicConfig.genre} / ${musicConfig.tempo}${musicConfig.description ? " / " + musicConfig.description : ""}`
          : null,
        params: {
          ...params,
          base_images: baseImages.map(b => b.url),
        },
        reference_urls: refs.map(r => r.url),
        estimated_cost: parseFloat(computeCost()),
      };

      const res = await fetch("/api/brand-media/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      showToast("Job dodany do kolejki");
      setTimeout(() => router.push("/tools/brand-media-studio?tab=queue"), 1000);
    } catch (err) {
      console.error("generate-video error:", err);
      setSubmitError("Błąd: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f6", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <Nav current="/tools/brand-media-studio" />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 60, right: 20, zIndex: 200,
          background: toast.type === "success" ? "#2e7d32" : "#c62828",
          color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
          <Link href="/tools/brand-media-studio" style={{ color: "#aaa", textDecoration: "none" }}>Brand Media Studio</Link>
          {" / "}
          <span style={{ color: "#555" }}>Generowanie wideo</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 24px", color: "#1a1a1a" }}>
          🎬 Generowanie wideo
        </h1>

        {/* Section wrapper */}
        {[
          {
            title: "1. Wybierz model",
            content: (
              <ModelSelector
                category="video"
                selectedModelId={selectedModel?.model_id}
                onModelChange={handleModelChange}
              />
            ),
          },
          selectedModel && {
            title: "2. Parametry wideo",
            content: (
              <div>
                <ParamRow label="Orientacja">
                  <ToggleGroup options={availableOrientations} value={params.orientation} onChange={v => setParam("orientation", v)} />
                </ParamRow>
                <ParamRow label="Długość">
                  <ToggleGroup options={availableDurations} value={params.duration} onChange={v => setParam("duration", v)} />
                </ParamRow>
                {availableResolutions.length > 0 && (
                  <ParamRow label="Rozdzielczość">
                    <Select value={params.resolution} onChange={v => setParam("resolution", v)} options={availableResolutions} />
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
              </div>
            ),
          },
          selectedModel && {
            title: "3. Zdjęcia bazowe",
            content: selectedModel.max_ref_images === 0 ? (
              <div style={{ fontSize: 13, color: "#aaa", padding: "8px 0" }}>
                Ten model nie obsługuje zdjęć bazowych.
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
                  Max {selectedModel.max_ref_images} zdjęć
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {Array.from({ length: selectedModel.max_ref_images }).map((_, i) => {
                    const img = baseImages[i];
                    return (
                      <div key={i} style={{
                        width: 64, height: 64, border: `2px dashed ${img ? ACCENT : "#ddd"}`,
                        borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", overflow: "hidden", background: img ? "transparent" : "#fafafa",
                        position: "relative",
                      }}
                        onClick={() => {
                          if (img) {
                            setBaseImages(prev => prev.filter((_, pi) => pi !== i));
                          } else {
                            const url = prompt("URL zdjęcia bazowego:");
                            if (url) setBaseImages(prev => {
                              const next = [...prev];
                              next[i] = { url };
                              return next;
                            });
                          }
                        }}
                      >
                        {img ? (
                          <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 20, color: "#ccc" }}>+</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          },
          selectedModel && {
            title: "4. Muzyka",
            content: (
              <MusicPanel
                modelCapabilities={selectedModel.capabilities || {}}
                onMusicChange={setMusicConfig}
              />
            ),
          },
          {
            title: "5. Zdjęcia referencyjne",
            content: (
              <ReferencePanel
                onRefsChange={setRefs}
                maxRefs={4}
              />
            ),
          },
          {
            title: "6. Prompt",
            content: (
              <div>
                <textarea
                  value={prompt}
                  onChange={e => { setPrompt(e.target.value); promptRef.current = e.target.value; }}
                  placeholder="Opisz wideo, które chcesz wygenerować... np. 'A pair of colorful socks resting on an open book beside a steaming cup of tea, soft autumn light, slow zoom in, cinematic mood'"
                  style={{
                    width: "100%", minHeight: 100, padding: "12px 14px",
                    border: "1px solid #ddd", borderRadius: 8, fontSize: 14,
                    resize: "vertical", boxSizing: "border-box", outline: "none",
                    fontFamily: "inherit", lineHeight: 1.6, marginBottom: 12,
                  }}
                />
                <PromptSandbox
                  mainPrompt={prompt}
                  onUsePrompt={p => { setPrompt(p); promptRef.current = p; }}
                  context={{ selectedModel, params }}
                />
              </div>
            ),
          },
        ].filter(Boolean).map((section, i) => (
          <div key={i} style={{ marginBottom: 24, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {section.title}
            </div>
            {section.content}
          </div>
        ))}

        {/* Action bar */}
        <div style={{
          position: "sticky", bottom: 0, background: "#fff", border: "1px solid #eee",
          borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        }}>
          <CostEstimator model={selectedModel} params={params} />

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {submitError && (
              <span style={{ fontSize: 12, color: "#c62828" }}>{submitError}</span>
            )}
            <button
              onClick={() => alert("Szablon zostanie zaimplementowany wkrótce.")}
              style={{ padding: "9px 16px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#555", cursor: "pointer" }}
            >
              Zapisz szablon
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "9px 20px", fontSize: 13, fontWeight: 600,
                background: submitting ? "#f0e8df" : ACCENT,
                border: "none", borderRadius: 6, color: "#fff", cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Dodaję..." : "Generuj wideo →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
