"use client";
import { useState, useRef } from "react";

const ACCENT = "#b8763a";

const AI_MODELS = [
  { id: "claude", label: "Claude Sonnet 4.5" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "o3", label: "o3" },
];

export default function PromptSandbox({ mainPrompt, onUsePrompt, context = {} }) {
  const [aiModel, setAiModel] = useState("claude");
  const [instruction, setInstruction] = useState("");
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const sandboxPromptRef = useRef(mainPrompt || "");

  async function generateAlternatives() {
    if (!sandboxPromptRef.current.trim() && !instruction.trim()) {
      setError("Wpisz prompt lub instrukcję.");
      return;
    }
    setError("");
    setLoading(true);
    setAlternatives([]);

    try {
      const res = await fetch("/api/brand-media/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: sandboxPromptRef.current,
          instruction: instruction || "Zaproponuj 3 różne warianty — minimalistyczny, narracyjny, energiczny",
          model: aiModel,
          context,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setAlternatives(data.alternatives || []);
    } catch (err) {
      console.error("enhance-prompt error:", err);
      setError("Błąd generowania: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function usePrompt(prompt) {
    onUsePrompt(prompt);
    setHighlightId(prompt);
    setTimeout(() => setHighlightId(null), 1200);
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee" }}>
        <span style={{ fontWeight: 500, fontSize: 14, color: "#1a1a1a" }}>Piaskownica promptów</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {/* Left — main prompt */}
        <div style={{ padding: 16, borderRight: "1px solid #eee" }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Aktywny prompt</div>
          <textarea
            defaultValue={mainPrompt}
            onChange={e => { sandboxPromptRef.current = e.target.value; }}
            placeholder="Wpisz lub wklej prompt do eksperymentowania..."
            style={{
              width: "100%", minHeight: 120, padding: "10px 12px",
              border: "1px solid #ddd", borderRadius: 8, fontSize: 13,
              resize: "vertical", boxSizing: "border-box", outline: "none",
              fontFamily: "inherit", lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => {
              sandboxPromptRef.current = mainPrompt || "";
              generateAlternatives();
            }}
            style={{
              marginTop: 10, padding: "8px 16px", background: "#fdf7f2",
              border: `1px solid ${ACCENT}`, borderRadius: 6, color: ACCENT,
              fontSize: 13, cursor: "pointer", fontWeight: 500,
            }}
          >
            ✦ Generuj w piaskownicy
          </button>
        </div>

        {/* Right — sandbox */}
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Model AI</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {AI_MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setAiModel(m.id)}
                style={{
                  padding: "4px 10px", fontSize: 11, border: `1px solid ${aiModel === m.id ? ACCENT : "#ddd"}`,
                  borderRadius: 12, background: aiModel === m.id ? "#fdf7f2" : "#fff",
                  color: aiModel === m.id ? ACCENT : "#555", cursor: "pointer",
                  fontWeight: aiModel === m.id ? 600 : 400,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Instrukcja dla AI</div>
          <textarea
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            placeholder="np. 'zaproponuj 3 warianty — minimalistyczny, narracyjny, energiczny'"
            style={{
              width: "100%", minHeight: 64, padding: "8px 10px",
              border: "1px solid #ddd", borderRadius: 6, fontSize: 13,
              resize: "vertical", boxSizing: "border-box", outline: "none",
              fontFamily: "inherit",
            }}
          />

          <button
            onClick={generateAlternatives}
            disabled={loading}
            style={{
              marginTop: 10, padding: "8px 16px",
              background: loading ? "#f0e8df" : ACCENT,
              border: "none", borderRadius: 6, color: "#fff",
              fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 500, width: "100%",
            }}
          >
            {loading ? "Generuję..." : "✦ Generuj alternatywy"}
          </button>

          {error && <div style={{ fontSize: 12, color: "#c62828", marginTop: 8 }}>{error}</div>}
        </div>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div style={{ borderTop: "1px solid #eee", padding: 16 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>Alternatywne prompty ({alternatives.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alternatives.map((alt, i) => (
              <div key={i} style={{
                border: `1px solid ${highlightId === alt ? "#4caf50" : "#eee"}`,
                borderRadius: 8, padding: "12px 14px",
                background: highlightId === alt ? "#f0fff4" : "#fafafa",
                transition: "border-color 0.15s, background 0.15s",
              }}>
                <div style={{ fontSize: 13, color: "#333", lineHeight: 1.6, marginBottom: 10 }}>{alt}</div>
                <button
                  onClick={() => usePrompt(alt)}
                  style={{
                    padding: "5px 12px", fontSize: 12, border: `1px solid ${ACCENT}`,
                    borderRadius: 6, background: "transparent", color: ACCENT,
                    cursor: "pointer", fontWeight: 500,
                  }}
                >
                  Użyj tego promptu →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
