"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "../../../components/Nav";
import ModelSelector from "../components/ModelSelector";
import ReferencePanel from "../components/ReferencePanel";
import PromptSandbox from "../components/PromptSandbox";
import CostEstimator from "../components/CostEstimator";

const ACCENT = "#b8763a";
const ORIENTATIONS = ["1:1", "4:3", "3:4", "16:9", "9:16"];
const VARIANT_OPTIONS = ["1", "2", "4"];

function ToggleGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: "7px 14px", fontSize: 12,
          border: `1px solid ${value === opt ? ACCENT : "#ddd"}`,
          borderRadius: 6, background: value === opt ? "#fdf7f2" : "#fff",
          color: value === opt ? ACCENT : "#555", cursor: "pointer",
          fontWeight: value === opt ? 600 : 400, transition: "all 0.15s",
        }}>
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

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function ImagesPage() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState(null);
  const [params, setParams] = useState({ orientation: "1:1", resolution: "", variants: "1" });
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [toast, setToast] = useState(null);
  const promptRef = useRef("");

  function setParam(key, val) { setParams(p => ({ ...p, [key]: val })); }

  function handleModelChange(model) {
    setSelectedModel(model);
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
    return (selectedModel.price_per_unit * (parseInt(params.variants) || 1)).toFixed(2);
  }

  async function handleSubmit() {
    if (!selectedModel) { setSubmitError("Wybierz model."); return; }
    if (!promptRef.current.trim()) { setSubmitError("Wpisz prompt."); return; }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/brand-media/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: selectedModel.model_id,
          prompt: promptRef.current,
          params,
          reference_urls: refs.map(r => r.url),
          estimated_cost: parseFloat(computeCost()),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      showToast("Job dodany do kolejki");
      setTimeout(() => router.push("/tools/brand-media-studio?tab=queue"), 1000);
    } catch (err) {
      console.error("generate-image error:", err);
      setSubmitError("Błąd: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const availableOrientations = selectedModel?.capabilities?.orientations || ORIENTATIONS;
  const availableResolutions = selectedModel?.capabilities?.resolutions || [];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f6", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <Nav current="/tools/brand-media-studio" />

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
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
          <Link href="/tools/brand-media-studio" style={{ color: "#aaa", textDecoration: "none" }}>Brand Media Studio</Link>
          {" / "}
          <span style={{ color: "#555" }}>Generowanie obrazów</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 24px", color: "#1a1a1a" }}>
          🖼 Generowanie obrazów
        </h1>

        <Section title="1. Wybierz model">
          <ModelSelector category="image" selectedModelId={selectedModel?.model_id} onModelChange={handleModelChange} />
        </Section>

        {selectedModel && (
          <Section title="2. Parametry">
            <ParamRow label="Orientacja">
              <ToggleGroup options={availableOrientations} value={params.orientation} onChange={v => setParam("orientation", v)} />
            </ParamRow>
            {availableResolutions.length > 0 && (
              <ParamRow label="Rozdzielczość">
                <select value={params.resolution} onChange={e => setParam("resolution", e.target.value)}
                  style={{ padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none" }}>
                  {availableResolutions.map(r => <option key={r}>{r}</option>)}
                </select>
              </ParamRow>
            )}
            <ParamRow label="Warianty">
              <ToggleGroup options={VARIANT_OPTIONS} value={params.variants} onChange={v => setParam("variants", v)} />
            </ParamRow>
          </Section>
        )}

        <Section title="3. Zdjęcia referencyjne">
          <ReferencePanel onRefsChange={setRefs} maxRefs={selectedModel?.max_ref_images || 4} />
        </Section>

        <Section title="4. Prompt">
          <textarea
            value={prompt}
            onChange={e => { setPrompt(e.target.value); promptRef.current = e.target.value; }}
            placeholder="Opisz obraz, który chcesz wygenerować... np. 'Colorful literary socks arranged on a wooden shelf with books, warm studio lighting, product photography, minimal background'"
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
        </Section>

        {/* Action bar */}
        <div style={{
          position: "sticky", bottom: 0, background: "#fff", border: "1px solid #eee",
          borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        }}>
          <CostEstimator model={selectedModel} params={params} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {submitError && <span style={{ fontSize: 12, color: "#c62828" }}>{submitError}</span>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "9px 20px", fontSize: 13, fontWeight: 600,
                background: submitting ? "#f0e8df" : ACCENT,
                border: "none", borderRadius: 6, color: "#fff", cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Dodaję..." : "Generuj obraz →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
