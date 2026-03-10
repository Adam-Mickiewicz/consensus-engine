"use client";
import { useState, useRef, useEffect } from "react";

const accent = "#b8763a";

const SOCK_SYSTEM_PROMPT = `You are a specialist sock pattern designer for Nadwyraz.com, a Polish sock and accessories brand known for bold, illustrative, narrative-driven sock designs.

NADWYRAZ DESIGN DNA:
- Flat illustration style, bold outlines, no gradients
- Rich storytelling — each sock tells a scene or concept
- Max 5-6 solid colors per design (production constraint)
- Left and right sock are OFTEN different — left: wide scenic view, right: scattered icons on solid bg
- Typography often embedded (city names, words, slogans)
- Strong solid color backgrounds (sky blue, dark teal, orange, charcoal, red, yellow)
- Motifs: Polish cities, winter sports, nature, animals, travel, culture, humor
- Production format: bitmap, 168px wide × 480px tall (41-46) or 168px × 435px (36-40)

DALLE PROMPT RULES — always follow these exactly:
- Start with: "VERTICAL PORTRAIT sock textile pattern. Tall narrow format (1:3 ratio). Pure 2D flat illustration, side view only, NO isometric, NO 3D perspective, NO gradients."
- Add: "Bold black outlines, solid color fills only. Pattern fills entire canvas edge to edge, no white margins, no borders."
- Then describe the scene/motifs
- End with: "Max 5 colors. Background: [HEX COLOR]."

GEMINI PROMPT RULES — always follow these exactly:
- Start with: "Flat 2D textile sock pattern, tall vertical 9:16 format, fills entire canvas edge to edge with no margins, bold black outlines, solid flat colors only, no gradients, no shading, no 3D."
- Then describe the scene/motifs with background color
- End with: "Max 6 colors, pixel-art bitmap aesthetic."

Respond ONLY in valid JSON:
{
  "collection_name": "2-3 words max",
  "concept": "1-2 sentences in Polish",
  "left_sock": {
    "description": "detailed scene in Polish",
    "background_color": "#HEXCODE",
    "background_color_name": "Polish name",
    "layout": "panoramic / scattered / zonal",
    "key_elements": ["el1", "el2", "el3"],
    "text_element": "text or null"
  },
  "right_sock": {
    "description": "detailed scene in Polish",
    "background_color": "#HEXCODE",
    "background_color_name": "Polish name",
    "layout": "panoramic / scattered / zonal",
    "key_elements": ["el1", "el2", "el3"],
    "text_element": "text or null"
  },
  "are_socks_different": true,
  "palette": [
    {"hex": "#HEX", "name": "Polish name", "usage": "where used"}
  ],
  "dalle_prompt_left": "VERTICAL PORTRAIT sock textile pattern. Tall narrow format (1:3 ratio). Pure 2D flat illustration, side view only, NO isometric, NO 3D perspective, NO gradients. Bold black outlines, solid color fills only. Pattern fills entire canvas edge to edge, no white margins, no borders. [SCENE]. Max 5 colors. Background: [HEX].",
  "dalle_prompt_right": "VERTICAL PORTRAIT sock textile pattern. Tall narrow format (1:3 ratio). Pure 2D flat illustration, side view only, NO isometric, NO 3D perspective, NO gradients. Bold black outlines, solid color fills only. Pattern fills entire canvas edge to edge, no white margins, no borders. [SCENE]. Max 5 colors. Background: [HEX].",
  "gemini_prompt_left": "Flat 2D textile sock pattern, tall vertical 9:16 format, fills entire canvas edge to edge with no margins, bold black outlines, solid flat colors only, no gradients, no shading, no 3D. Background: [HEX]. [SCENE]. Max 6 colors, pixel-art bitmap aesthetic.",
  "gemini_prompt_right": "Flat 2D textile sock pattern, tall vertical 9:16 format, fills entire canvas edge to edge with no margins, bold black outlines, solid flat colors only, no gradients, no shading, no 3D. Background: [HEX]. [SCENE]. Max 6 colors, pixel-art bitmap aesthetic.",
  "technical_spec": {"size_small": "168 × 435 px", "size_large": "168 × 480 px", "color_count": 5},
  "designer_notes": "practical notes in Polish"
}`;

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
      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, background: "#f9f7f4", border: "1px solid #ede9e3", marginBottom: 5 }}>
      <div style={{ width: 28, height: 28, borderRadius: 5, background: color.hex, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: "#1a1814" }}>{color.name}</div>
        <div style={{ fontSize: 10, color: "#999", fontFamily: "monospace" }}>{color.hex} · {color.usage}</div>
      </div>
      <div style={{ fontSize: 10, color: copied ? "#0d9e6e" : "#ccc" }}>{copied ? "✓" : "kopiuj"}</div>
    </div>
  );
}

function PromptEditor({ label, engine, value, onChange, onGenerate, loading, imageUrl, bgColor }) {
  const engineColor = engine === "dalle" ? "#1a1814" : "#0d9e6e";
  const engineLabel = engine === "dalle" ? "DALL-E 3" : "Nano Banana 🍌";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: engineColor }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#666" }}>{engineLabel} — {label}</span>
        </div>
        <button onClick={onGenerate} disabled={loading || !value.trim()}
          style={{ background: loading ? "#eee" : engineColor, color: loading ? "#aaa" : "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 10, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {loading ? "⏳" : "▶ Generuj"}
        </button>
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 8, border: `1px solid ${engineColor}44`, fontSize: 11, fontFamily: "inherit", lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa", color: "#333" }} />
      {imageUrl && (
        <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", background: bgColor || "#f0ede8", border: "1px solid #ede9e3" }}>
          <img src={imageUrl} style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "contain" }} />
        </div>
      )}
      {loading && !imageUrl && (
        <div style={{ marginTop: 8, padding: 20, background: (bgColor || "#333") + "22", borderRadius: 8, textAlign: "center", color: "#888", fontSize: 11 }}>
          {engine === "dalle" ? "⏳ DALL-E generuje..." : "🍌 Nano Banana generuje..."}
        </div>
      )}
    </div>
  );
}

function ReferenceBadge({ pairs, loading }) {
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#f5f3ef", borderRadius: 8, border: "1px solid #ede9e3" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f0a500" }} />
      <span style={{ fontSize: 10, color: "#999" }}>Ładuję referencje...</span>
    </div>
  );
  if (!pairs || pairs.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#fff8ee", borderRadius: 8, border: "1px solid #f5ddb0" }}>
      <span style={{ fontSize: 10, color: "#b87a20" }}>⚠ Brak referencji w bazie</span>
    </div>
  );
  return (
    <div style={{ padding: "8px 10px", background: "#f0faf5", borderRadius: 8, border: "1px solid #b8e8d0" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#0d9e6e", letterSpacing: 1, marginBottom: 6 }}>REFERENCJE NADWYRAZ ({pairs.length} pary)</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {pairs.map((pair, i) => (
          <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <img src={pair.left.url} style={{ height: 48, width: "auto", borderRadius: 3, border: "1px solid #ccc", imageRendering: "pixelated" }} />
            <img src={pair.right.url} style={{ height: 48, width: "auto", borderRadius: 3, border: "1px solid #ccc", imageRendering: "pixelated" }} />
            <span style={{ fontSize: 9, color: "#666", maxWidth: 60, lineHeight: 1.3 }}>{pair.collection}</span>
          </div>
        ))}
      </div>
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
  const [references, setReferences] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const fileRef = useRef(null);

  const [prompts, setPrompts] = useState({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
  const [imgs, setImgs] = useState({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
  const [loadings, setLoadings] = useState({ dalleLeft: false, dalleRight: false, geminiLeft: false, geminiRight: false });

  useEffect(() => {
    loadReferences();
  }, []);

  async function loadReferences() {
    setRefLoading(true);
    try {
      const res = await fetch("/api/sock-references?pairs=2");
      const data = await res.json();
      if (data.success) setReferences(data.pairs || []);
    } catch (e) { console.warn("Brak referencji:", e); }
    setRefLoading(false);
  }

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
      const contentParts = [];

      // Referencje jako URL-e (Claude obsługuje image URL)
      if (references.length > 0) {
        contentParts.push({
          type: "text",
          text: `REFERENCJE PRODUKCYJNE NADWYRAZ (${references.length} pary gotowych skarpetek 168px):\nZwróć uwagę na: skalę elementów, gęstość wzoru, liczbę kolorów, różnicę lewa/prawa.`
        });
        for (const pair of references) {
          contentParts.push({ type: "text", text: `${pair.collection} — LEWA:` });
          contentParts.push({ type: "image", source: { type: "url", url: pair.left.url } });
          contentParts.push({ type: "text", text: `${pair.collection} — PRAWA:` });
          contentParts.push({ type: "image", source: { type: "url", url: pair.right.url } });
        }
        contentParts.push({ type: "text", text: "---\nZaprojektuj nową kolekcję w tym stylu:" });
      }

      // Załączniki użytkownika
      for (const att of attachments) {
        if (att.type === "image") {
          contentParts.push({ type: "text", text: `Inspiracja: ${att.name}` });
          contentParts.push({ type: "image", source: { type: "base64", media_type: att.mediaType || "image/jpeg", data: att.base64 } });
        } else {
          contentParts.push({ type: "text", text: `--- ${att.name} ---\n${att.content}` });
        }
      }

      // Brief
      let briefText = `Zaprojektuj skarpetki: "${description}"\n`;
      briefText += `Wariant: ${sockVariant === "different" ? "LEWA I PRAWA RÓŻNE" : sockVariant === "same" ? "IDENTYCZNE" : "AI decyduje"}\n`;
      briefText += `Rozmiary: ${size === "both" ? "oba" : size}`;
      contentParts.push({ type: "text", text: briefText });

      const res = await fetch("/api/sock-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "claude",
          systemPrompt: SOCK_SYSTEM_PROMPT,
          userMessage: contentParts,
          aiModel: "claude-sonnet-4-5"
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      let parsed;
      try { parsed = JSON.parse(data.result); }
      catch { const m = data.result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error("Błąd parsowania JSON"); }

      setResult(parsed);
      setPrompts({
        dalleLeft: parsed.dalle_prompt_left || "",
        dalleRight: parsed.dalle_prompt_right || parsed.dalle_prompt_left || "",
        geminiLeft: parsed.gemini_prompt_left || "",
        geminiRight: parsed.gemini_prompt_right || parsed.gemini_prompt_left || "",
      });
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

  const anyImageLoading = Object.values(loadings).some(Boolean);

  return (
    <div style={s.page}>
      <div style={{ marginBottom: 24 }}>
        <a href="/" style={{ color: "#bbb", fontSize: 11, textDecoration: "none" }}>← Consensus Engine</a>
        <div style={{ color: accent, fontWeight: 800, fontSize: 20, letterSpacing: 2, marginTop: 8, marginBottom: 4 }}>SOCK DESIGNER</div>
        <div style={{ color: "#bbb", fontSize: 12 }}>Nadwyraz.com · 168px bitmap · DALL-E 3 + Nano Banana 🍌</div>
      </div>

      <div style={s.card}>
        <label style={s.label}>OPIS / TEMAT KOLEKCJI</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="np. Góry Tatry, klimat zimowy, narty, śnieg, schronisko. Dla miłośników gór."
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

        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ ...s.label, marginBottom: 0 }}>REFERENCJE PRODUKCYJNE</label>
            <button onClick={loadReferences} disabled={refLoading}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 10, fontFamily: "inherit" }}>
              {refLoading ? "⏳" : "↺ losuj inne"}
            </button>
          </div>
          <ReferenceBadge pairs={references} loading={refLoading} />
        </div>

        <button onClick={generateBrief} disabled={!description.trim() || briefLoading}
          style={{ marginTop: 14, width: "100%", background: description.trim() && !briefLoading ? accent : "#ddd", color: description.trim() && !briefLoading ? "#fff" : "#aaa", border: "none", borderRadius: 10, padding: "13px", fontSize: 13, fontWeight: 800, cursor: description.trim() && !briefLoading ? "pointer" : "not-allowed", fontFamily: "inherit", boxShadow: description.trim() && !briefLoading ? `0 4px 16px ${accent}38` : "none" }}>
          {briefLoading ? "🧦 Generuję brief..." : `▶ KROK 1 — GENERUJ BRIEF${references.length > 0 ? ` (${references.length} ref.)` : ""}`}
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
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>🎨 {result.palette?.length} kolorów</span>
              {references.length > 0 && <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>📎 {references.length} ref. Nadwyraz</span>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[["🧦 LEWA", result.left_sock], ["🧦 PRAWA", result.right_sock]].map(([title, sock]) => sock && (
              <div key={title} style={{ ...s.card, marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#1a1814" }}>{title}</div>
                  <span style={{ fontSize: 10, color: "#bbb", background: "#f5f3ef", borderRadius: 5, padding: "2px 7px" }}>{sock.layout}</span>
                </div>
                <p style={{ color: "#555", fontSize: 12, lineHeight: 1.6, margin: "0 0 10px" }}>{sock.description}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                  {(sock.key_elements || []).map((el, i) => (
                    <span key={i} style={{ background: "#f5f3ef", border: "1px solid #ede9e3", borderRadius: 20, padding: "2px 8px", fontSize: 10, color: "#666" }}>{el}</span>
                  ))}
                </div>
                {sock.text_element && (
                  <div style={{ padding: "6px 10px", background: "#f5f3ef", borderRadius: 7, marginBottom: 8 }}>
                    <span style={{ color: "#999", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>TEKST </span>
                    <span style={{ color: accent, fontWeight: 800, fontFamily: "monospace" }}>"{sock.text_element}"</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: (sock.background_color || "#f5f3ef") + "22", borderRadius: 7, border: "1px solid " + (sock.background_color || "#ddd") + "44" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: sock.background_color, border: "1px solid rgba(0,0,0,0.1)" }} />
                  <span style={{ fontSize: 11, color: "#444", fontWeight: 600 }}>Tło: {sock.background_color_name}</span>
                  <span style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace" }}>{sock.background_color}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <label style={s.label}>PALETA ({result.palette?.length} kolorów)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {(result.palette || []).map((color, i) => <ColorSwatch key={i} color={color} />)}
            </div>
          </div>

          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div>
                <label style={{ ...s.label, marginBottom: 2 }}>KROK 2 — EDYTUJ PROMPTY I GENERUJ</label>
                <div style={{ color: "#bbb", fontSize: 10, marginBottom: 14 }}>Podkręć prompt przed wysłaniem · generuj osobno lub wszystkie naraz</div>
              </div>
              <button onClick={generateAllImages} disabled={anyImageLoading}
                style={{ background: anyImageLoading ? "#eee" : "#1a1814", color: anyImageLoading ? "#aaa" : "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 11, fontWeight: 800, cursor: anyImageLoading ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
                {anyImageLoading ? "⏳ Generuję..." : "▶▶ Wszystkie 4"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 16, padding: "8px 12px", background: "#f9f7f4", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a1814" }} />
                <span style={{ fontSize: 10, color: "#666" }}>DALL-E 3 — sceny narracyjne</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0d9e6e" }} />
                <span style={{ fontSize: 10, color: "#666" }}>Nano Banana 🍌 — scattered patterns</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={{ color: "#1a1814", fontWeight: 800, fontSize: 12, marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #ede9e3" }}>🧦 LEWA</div>
                <PromptEditor label="lewa" engine="dalle"
                  value={prompts.dalleLeft} onChange={v => setPrompts(p => ({ ...p, dalleLeft: v }))}
                  onGenerate={() => generateSingleImage("dalleLeft", "dalle", prompts.dalleLeft)}
                  loading={loadings.dalleLeft} imageUrl={imgs.dalleLeft} />
                <PromptEditor label="lewa" engine="gemini"
                  value={prompts.geminiLeft} onChange={v => setPrompts(p => ({ ...p, geminiLeft: v }))}
                  onGenerate={() => generateSingleImage("geminiLeft", "gemini", prompts.geminiLeft)}
                  loading={loadings.geminiLeft} imageUrl={imgs.geminiLeft} />
              </div>
              <div>
                <div style={{ color: "#1a1814", fontWeight: 800, fontSize: 12, marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #ede9e3" }}>🧦 PRAWA</div>
                <PromptEditor label="prawa" engine="dalle"
                  value={prompts.dalleRight} onChange={v => setPrompts(p => ({ ...p, dalleRight: v }))}
                  onGenerate={() => generateSingleImage("dalleRight", "dalle", prompts.dalleRight)}
                  loading={loadings.dalleRight} imageUrl={imgs.dalleRight} />
                <PromptEditor label="prawa" engine="gemini"
                  value={prompts.geminiRight} onChange={v => setPrompts(p => ({ ...p, geminiRight: v }))}
                  onGenerate={() => generateSingleImage("geminiRight", "gemini", prompts.geminiRight)}
                  loading={loadings.geminiRight} imageUrl={imgs.geminiRight} />
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
              {[["Format","BMP bitmap"],["Szerokość","168 px"],["41-46","168 × 480 px"],["36-40","168 × 435 px"],["Maks. kolorów","5-6"],["Styl","Flat, bez gradientów"]].map(([k,v]) => (
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
