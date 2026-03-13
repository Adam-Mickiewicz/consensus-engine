"use client";
import { useState, useRef } from "react";

const accent = "#b8763a";

const SIZES = [
  { id: "both", label: "Oba rozmiary", desc: "36-40 i 41-46" },
  { id: "small", label: "36-40", desc: "435px" },
  { id: "large", label: "41-46", desc: "480px" },
];
const SOCK_VARIANTS = [
  { id: "different", label: "Różne", desc: "Lewa ≠ Prawa" },
  { id: "same", label: "Identyczne", desc: "Lewa = Prawa" },
  { id: "ai_decide", label: "AI decyduje", desc: "AI dobiera" },
];

function ColorSwatch({ color }) {
  const [copied, setCopied] = useState(false);
  return (
    <div onClick={() => { navigator.clipboard.writeText(color.hex); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#f9f7f4", border: "1px solid #ede9e3", marginBottom: 4 }}>
      <div style={{ width: 24, height: 24, borderRadius: 4, background: color.hex, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 10, color: "#1a1814" }}>{color.legs_code}</div>
        <div style={{ fontSize: 10, color: "#999" }}>{color.name} · {color.hex}</div>
        {color.usage && <div style={{ fontSize: 9, color: "#bbb", fontStyle: "italic" }}>{color.usage}</div>}
      </div>
      <div style={{ fontSize: 9, color: copied ? "#0d9e6e" : "#ccc" }}>{copied ? "✓" : "kopiuj"}</div>
    </div>
  );
}

function PromptEditor({ label, engine, value, onChange, onGenerate, loading, imageUrl, bgColor }) {
  const engineColor = engine === "dalle" ? "#1a1814" : "#0d9e6e";
  const engineLabel = engine === "dalle" ? "DALL-E 3" : "Nano Banana 🍌";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: engineColor }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#666" }}>{engineLabel} — {label}</span>
        </div>
        <button onClick={onGenerate} disabled={loading || !value.trim()}
          style={{ background: loading ? "#eee" : engineColor, color: loading ? "#aaa" : "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 10, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {loading ? "⏳" : "▶ Generuj"}
        </button>
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", minHeight: 75, padding: "9px 11px", borderRadius: 7, border: `1px solid ${engineColor}44`, fontSize: 11, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa", color: "#333" }} />
      {imageUrl && (
        <div style={{ marginTop: 6, borderRadius: 7, overflow: "hidden", background: bgColor || "#f0ede8", border: "1px solid #ede9e3" }}>
          <img src={imageUrl} style={{ width: "100%", display: "block", maxHeight: 300, objectFit: "contain" }} />
        </div>
      )}
      {loading && !imageUrl && (
        <div style={{ marginTop: 6, padding: 16, background: (bgColor || "#333") + "22", borderRadius: 7, textAlign: "center", color: "#888", fontSize: 11 }}>
          {engine === "dalle" ? "⏳ DALL-E generuje..." : "🍌 Nano Banana generuje..."}
        </div>
      )}
    </div>
  );
}

export default function SockDesigner() {
  const [description, setDescription] = useState("");
  const [sockVariant, setSockVariant] = useState("ai_decide");
  const [size, setSize] = useState("both");
  const [attachments, setAttachments] = useState([]);
  const [briefLoading, setBriefLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const [prompts, setPrompts] = useState({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
  const [imgs, setImgs] = useState({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
  const [loadings, setLoadings] = useState({ dalleLeft: false, dalleRight: false, geminiLeft: false, geminiRight: false });

  async function handleAttachment(e) {
    const files = Array.from(e.target.files);
    const results = [];
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const base64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(file); });
        results.push({ name: file.name, type: "image", base64, mediaType: file.type, preview: URL.createObjectURL(file) });
      } else {
        const text = await file.text().catch(() => "");
        results.push({ name: file.name, type: "text", content: text.slice(0, 4000) });
      }
    }
    setAttachments(prev => [...prev, ...results]);
  }

  async function generateBrief() {
    if (!description.trim()) return;
    setBriefLoading(true);
    setError(null);
    setResult(null);
    setImgs({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
    try {
      const res = await fetch("/api/sock-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, sockVariant, size, attachments }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const msg = JSON.parse(line.slice(6));
          if (msg.type === "error") throw new Error(msg.error);
          if (msg.type === "result") {
            const r = msg.result;
            setResult(r);
            setPrompts({
              dalleLeft: r.dalle_prompt_left || "",
              dalleRight: r.dalle_prompt_right || r.dalle_prompt_left || "",
              geminiLeft: r.gemini_prompt_left || "",
              geminiRight: r.gemini_prompt_right || r.gemini_prompt_left || "",
            });
          }
        }
      }
    } catch (e) {
      setError(e.message);
    }
    setBriefLoading(false);
  }

  async function generateSingleImage(key, engine, promptText) {
    setLoadings(l => ({ ...l, [key]: true }));
    setImgs(i => ({ ...i, [key]: null }));
    try {
      if (engine === "dalle") {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ problem: "sock design", consensus: promptText }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setImgs(i => ({ ...i, [key]: data.imageUrl }));
      } else {
        const res = await fetch("/api/image-gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setImgs(i => ({ ...i, [key]: data.imageUrl }));
      }
    } catch (e) {
      setError(`Błąd (${key}): ${e.message}`);
    }
    setLoadings(l => ({ ...l, [key]: false }));
  }

  async function generateAllImages() {
    await Promise.all([
      generateSingleImage("dalleLeft", "dalle", prompts.dalleLeft),
      generateSingleImage("dalleRight", "dalle", prompts.dalleRight),
      generateSingleImage("geminiLeft", "gemini", prompts.geminiLeft),
      generateSingleImage("geminiRight", "gemini", prompts.geminiRight),
    ]);
  }

  const s = {
    page: { minHeight: "100vh", background: "#f5f3ef", fontFamily: "'IBM Plex Mono', monospace", padding: 24 },
    card: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #ede9e3", marginBottom: 16 },
    label: { color: "#999", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8, display: "block" },
    btn: (active) => ({ background: active ? accent : "#fff", color: active ? "#fff" : "#888", border: `1px solid ${active ? accent : "#ddd"}`, borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }),
  };

  const anyLoading = Object.values(loadings).some(Boolean);

  return (
    <div style={s.page}>
      <div style={{ marginBottom: 24 }}>
        <a href="/" style={{ color: "#bbb", fontSize: 11, textDecoration: "none" }}>← Consensus Engine</a>
        <div style={{ color: accent, fontWeight: 800, fontSize: 20, letterSpacing: 2, marginTop: 8, marginBottom: 2 }}>SOCK DESIGNER</div>
        <div style={{ color: "#bbb", fontSize: 11 }}>Nadwyraz.com · 168px bitmap · LEGS palette · DALL-E 3 + Nano Banana 🍌</div>
      </div>

      <div style={s.card}>
        <label style={s.label}>OPIS / TEMAT KOLEKCJI</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="np. Fiat 126p Maluch, kultowy polski samochód, PRL, serduszka z drogi"
          style={{ width: "100%", minHeight: 90, padding: "12px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
          <div>
            <label style={s.label}>LEWA / PRAWA</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {SOCK_VARIANTS.map(v => (
                <button key={v.id} onClick={() => setSockVariant(v.id)} style={{ ...s.btn(sockVariant === v.id), textAlign: "left" }}>
                  <span style={{ fontWeight: 700 }}>{v.label}</span> <span style={{ opacity: 0.6, fontSize: 10 }}>— {v.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={s.label}>ROZMIAR</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {SIZES.map(sz => (
                <button key={sz.id} onClick={() => setSize(sz.id)} style={{ ...s.btn(size === sz.id), textAlign: "left" }}>
                  <span style={{ fontWeight: 700 }}>{sz.label}</span> <span style={{ opacity: 0.6, fontSize: 10 }}>— {sz.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={s.label}>INSPIRACJE (opcjonalnie)</label>
          <div onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed #ddd", borderRadius: 10, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: "#fdfcfa" }}>
            <span>📎</span>
            <span style={{ color: "#888", fontSize: 12 }}>Zdjęcia, moodboard, PDF</span>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt,.md" style={{ display: "none" }} onChange={handleAttachment} />
          </div>
          {attachments.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {attachments.map((att, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "#f5f3ef", borderRadius: 6, border: "1px solid #ede9e3" }}>
                  {att.preview && <img src={att.preview} alt="" style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 3 }} />}
                  <span style={{ fontSize: 11, color: "#666" }}>{att.name}</span>
                  <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 13, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={generateBrief} disabled={!description.trim() || briefLoading}
          style={{ marginTop: 14, width: "100%", background: description.trim() && !briefLoading ? accent : "#ddd", color: description.trim() && !briefLoading ? "#fff" : "#aaa", border: "none", borderRadius: 10, padding: "13px", fontSize: 13, fontWeight: 800, cursor: description.trim() && !briefLoading ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
          {briefLoading ? "⏳ Generuję brief..." : `► KROK 1 — GENERUJ BRIEF`}
        </button>
      </div>

      {error && <div style={{ padding: 12, background: "#fff0ee", borderRadius: 10, border: "1px solid #f5c5bc", color: "#b83020", fontSize: 12, marginBottom: 16 }}>❌ {error}</div>}

      {result && (
        <div>
          <div style={{ ...s.card, background: accent, border: "none" }}>
            <div style={{ color: "#fff9", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>KOLEKCJA</div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 22, letterSpacing: 1, marginBottom: 6 }}>{result.collection_name}</div>
            <p style={{ color: "#ffffffcc", fontSize: 13, lineHeight: 1.7, margin: "0 0 10px" }}>{result.concept}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>{result.are_socks_different ? "🔄 Lewa ≠ Prawa" : "= Identyczne"}</span>
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>🎨 {result.palette?.length} kolorów LEGS</span>
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>📐 {result.technical_spec?.size_large}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[["🧦 LEWA", result.left_sock], ["🧦 PRAWA", result.right_sock]].map(([title, sock]) => sock && (
              <div key={title} style={{ ...s.card, marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
                  <span style={{ fontSize: 10, color: "#bbb", background: "#f5f3ef", borderRadius: 5, padding: "2px 7px" }}>{sock.layout}</span>
                </div>
                <p style={{ color: "#555", fontSize: 12, lineHeight: 1.6, margin: "0 0 8px" }}>{sock.description}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                  {(sock.key_elements || []).map((el, i) => (
                    <span key={i} style={{ background: "#f5f3ef", border: "1px solid #ede9e3", borderRadius: 20, padding: "2px 8px", fontSize: 10, color: "#666" }}>{el}</span>
                  ))}
                </div>
                {sock.text_element && (
                  <div style={{ padding: "5px 9px", background: "#f5f3ef", borderRadius: 6, marginBottom: 6 }}>
                    <span style={{ color: "#999", fontSize: 9, fontWeight: 700 }}>TEKST </span>
                    <span style={{ color: accent, fontWeight: 800, fontFamily: "monospace" }}>"{sock.text_element}"</span>
                  </div>
                )}
                {sock.background && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 9px", background: sock.background.hex + "22", borderRadius: 6, border: "1px solid " + sock.background.hex + "44" }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: sock.background.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                    <span style={{ fontSize: 10, fontWeight: 700 }}>LEGS {sock.background.legs_code}</span>
                    <span style={{ fontSize: 10, color: "#999", fontFamily: "monospace" }}>{sock.background.hex}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={s.card}>
            <label style={s.label}>PALETA LEGS ({result.palette?.length} kolorów)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {(result.palette || []).map((color, i) => <ColorSwatch key={i} color={color} />)}
            </div>
          </div>

          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div>
                <label style={{ ...s.label, marginBottom: 2 }}>KROK 2 — EDYTUJ PROMPTY I GENERUJ</label>
                <div style={{ color: "#bbb", fontSize: 10, marginBottom: 12 }}>Podkręć prompt przed wysłaniem · generuj osobno lub wszystkie naraz</div>
              </div>
              <button onClick={generateAllImages} disabled={anyLoading}
                style={{ background: anyLoading ? "#eee" : "#1a1814", color: anyLoading ? "#aaa" : "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 11, fontWeight: 800, cursor: anyLoading ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
                {anyLoading ? "⏳ Generuję..." : "▶▶ Wszystkie 4"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 16, padding: "8px 12px", background: "#f9f7f4", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a1814" }} />
                <span style={{ fontSize: 10, color: "#666" }}>DALL-E 3 — sceny narracyjne</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0d9e6e" }} />
                <span style={{ fontSize: 10, color: "#666" }}>Nano Banana 🍌 — scattered patterns</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #ede9e3" }}>🧦 LEWA</div>
                <PromptEditor label="lewa" engine="dalle"
                  value={prompts.dalleLeft} onChange={v => setPrompts(p => ({ ...p, dalleLeft: v }))}
                  onGenerate={() => generateSingleImage("dalleLeft", "dalle", prompts.dalleLeft)}
                  loading={loadings.dalleLeft} imageUrl={imgs.dalleLeft} bgColor={result?.left_sock?.background?.hex} />
                <PromptEditor label="lewa" engine="gemini"
                  value={prompts.geminiLeft} onChange={v => setPrompts(p => ({ ...p, geminiLeft: v }))}
                  onGenerate={() => generateSingleImage("geminiLeft", "gemini", prompts.geminiLeft)}
                  loading={loadings.geminiLeft} imageUrl={imgs.geminiLeft} bgColor={result?.left_sock?.background?.hex} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #ede9e3" }}>🧦 PRAWA</div>
                <PromptEditor label="prawa" engine="dalle"
                  value={prompts.dalleRight} onChange={v => setPrompts(p => ({ ...p, dalleRight: v }))}
                  onGenerate={() => generateSingleImage("dalleRight", "dalle", prompts.dalleRight)}
                  loading={loadings.dalleRight} imageUrl={imgs.dalleRight} bgColor={result?.right_sock?.background?.hex} />
                <PromptEditor label="prawa" engine="gemini"
                  value={prompts.geminiRight} onChange={v => setPrompts(p => ({ ...p, geminiRight: v }))}
                  onGenerate={() => generateSingleImage("geminiRight", "gemini", prompts.geminiRight)}
                  loading={loadings.geminiRight} imageUrl={imgs.geminiRight} bgColor={result?.right_sock?.background?.hex} />
              </div>
            </div>
          </div>

          {result.designer_notes && (
            <div style={s.card}>
              <label style={s.label}>NOTATKI DLA GRAFIKA</label>
              <p style={{ color: "#555", fontSize: 13, lineHeight: 1.75, margin: 0 }}>{result.designer_notes}</p>
            </div>
          )}

          <div style={{ ...s.card, background: "#f9f7f4" }}>
            <label style={s.label}>SPECYFIKACJA TECHNICZNA</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[["Format","BMP bitmap"],["Szerokość","168 px"],["41-46","168×480 px"],["36-40","168×435 px"],["Maks. kolorów","5-6 LEGS"],["Styl","Flat 2D, bez gradientów"]].map(([k,v]) => (
                <div key={k} style={{ padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid #ede9e3" }}>
                  <div style={{ color: "#bbb", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{k}</div>
                  <div style={{ color: "#444", fontSize: 11, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={generateBrief}
            style={{ width: "100%", background: "none", border: `1px solid ${accent}`, color: accent, borderRadius: 10, padding: "11px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 24 }}>
            ↺ Generuj nowy brief
          </button>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
