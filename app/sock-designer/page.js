"use client";
import { useState, useRef } from "react";

const accent = "#b8763a";

const SOCK_SYSTEM_PROMPT = `You are a specialist sock pattern designer for Nadwyraz.com, a Polish sock and accessories brand known for bold, illustrative, narrative-driven sock designs.

NADWYRAZ DESIGN DNA (based on existing collection):
- Flat illustration style, bold outlines, no gradients
- Rich storytelling — each sock tells a scene or concept
- Max 5-6 solid colors per design (production constraint)
- Left and right sock are OFTEN different from each other — they complement but aren't identical. Left might be a wide scenic view, right shows individual iconic elements from the same theme scattered on solid background
- Typography often embedded in design (city names, words, slogans)
- Strong backgrounds (solid color fills like sky blue, dark teal, orange, charcoal)
- Motifs: Polish cities, winter sports, nature, animals, travel, culture, humor
- Production format: bitmap, 168px wide × 480px tall (size 41-46) or 168px × 435px (size 36-40)

EXISTING PROJECTS STYLE REFERENCE:
- "Białe Szaleństwo" (skiing): left=panoramic ski slope scene (white bg, skier, pines, mountains), right=scattered icons on blue bg (ski goggles, cable car, snowflake, skier silhouette)
- "Warszawa": left=city skyline at sunset (charcoal + orange + magenta), right=scattered W logos on dark bg + PKiN building
- "Maluch": dark background with Fiat 126p motifs
- "Ryby": dark teal background, fish motifs, max 6 muted green/teal tones

YOUR TASK:
Generate a complete sock design brief. The user will provide a theme/concept and optional attachments.

Respond ONLY in valid JSON:
{
  "collection_name": "short Polish or English name, 2-3 words max",
  "concept": "1-2 sentence concept description in Polish",
  "left_sock": {
    "description": "detailed scene description for left sock",
    "background_color": "#HEXCODE",
    "background_color_name": "color name in Polish",
    "layout": "panoramic / scattered / zonal",
    "key_elements": ["element1", "element2", "element3"],
    "text_element": "optional text/word on sock or null"
  },
  "right_sock": {
    "description": "detailed scene description for right sock",
    "background_color": "#HEXCODE",
    "background_color_name": "color name in Polish",
    "layout": "panoramic / scattered / zonal",
    "key_elements": ["element1", "element2", "element3"],
    "text_element": "optional text/word on sock or null"
  },
  "are_socks_different": true,
  "palette": [
    {"hex": "#HEXCODE", "name": "Polish color name", "usage": "where used"},
    {"hex": "#HEXCODE", "name": "Polish color name", "usage": "where used"},
    {"hex": "#HEXCODE", "name": "Polish color name", "usage": "where used"},
    {"hex": "#HEXCODE", "name": "Polish color name", "usage": "where used"},
    {"hex": "#HEXCODE", "name": "Polish color name", "usage": "where used"}
  ],
  "dalle_prompt_left": "DALL-E prompt for left sock. Flat 2D illustration of a TALL VERTICAL sock pattern unrolled flat, portrait orientation (narrow and tall like 1:3 ratio), bold outlines, solid color fills, no gradients, no 3D effects, no perspective. White background. Max 5 colors. [DESCRIBE scene]",
  "dalle_prompt_right": "DALL-E prompt for right sock. Same rules, portrait orientation. [DESCRIBE scene]",
  "gemini_prompt_left": "Nano Banana prompt for left sock. Flat 2D textile pattern design, tall vertical format (9:16 aspect ratio), like a sock fabric layout unrolled flat. Bold outlines, solid color fills only, no gradients, no shading, max 5-6 colors, bitmap/pixel art aesthetic. Background color: [HEX]. [DESCRIBE scene in detail]",
  "gemini_prompt_right": "Nano Banana prompt for right sock. Same rules. Background color: [HEX]. [DESCRIBE scene in detail]",
  "technical_spec": {
    "size_small": "168 × 435 px",
    "size_large": "168 × 480 px",
    "color_count": 5,
    "style": "flat bitmap illustration"
  },
  "designer_notes": "practical notes for the graphic designer in Polish"
}`;

const SIZES = [
  { id: "both", label: "Oba rozmiary", desc: "36-40 i 41-46" },
  { id: "small", label: "36-40", desc: "435px wysokość" },
  { id: "large", label: "41-46", desc: "480px wysokość" },
];

const SOCK_VARIANTS = [
  { id: "different", label: "Różne od siebie", desc: "Lewa i prawa różne" },
  { id: "same", label: "Identyczne", desc: "Lewa = prawa" },
  { id: "ai_decide", label: "AI decyduje", desc: "AI dobiera sam" },
];

function ColorSwatch({ color }) {
  const [copied, setCopied] = useState(false);
  return (
    <div onClick={() => { navigator.clipboard.writeText(color.hex); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "#f9f7f4", border: "1px solid #ede9e3", marginBottom: 6 }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: color.hex, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "#1a1814" }}>{color.name}</div>
        <div style={{ fontSize: 10, color: "#999", fontFamily: "monospace" }}>{color.hex}</div>
        <div style={{ fontSize: 10, color: "#bbb" }}>{color.usage}</div>
      </div>
      <div style={{ fontSize: 10, color: copied ? "#0d9e6e" : "#bbb" }}>{copied ? "✓" : "kopiuj"}</div>
    </div>
  );
}

function ImageCompare({ dalleUrl, geminiUrl, dalleLoading, geminiLoading, bgColor }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {/* DALL-E */}
      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #ede9e3" }}>
        <div style={{ background: "#f0ede8", padding: "5px 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#555" }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: "#666" }}>DALL-E 3</div>
        </div>
        <div style={{ background: bgColor || "#f0ede8", minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {dalleLoading ? (
            <div style={{ textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>generuję...</div>
            </div>
          ) : dalleUrl ? (
            <img src={dalleUrl} style={{ width: "100%", display: "block", maxHeight: 240, objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 16 }}>czeka na start</div>
          )}
        </div>
      </div>
      {/* Nano Banana */}
      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #ede9e3" }}>
        <div style={{ background: "#f0ede8", padding: "5px 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0d9e6e" }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: "#666" }}>Nano Banana 🍌</div>
        </div>
        <div style={{ background: bgColor || "#f0ede8", minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {geminiLoading ? (
            <div style={{ textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🍌</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>generuję...</div>
            </div>
          ) : geminiUrl ? (
            <img src={geminiUrl} style={{ width: "100%", display: "block", maxHeight: 240, objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 16 }}>czeka na start</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SockCard({ title, data, images }) {
  if (!data) return null;
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ede9e3", overflow: "hidden" }}>
      <div style={{ background: data.background_color || "#f0ede8", height: 8 }} />
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1814" }}>{title}</div>
          <div style={{ fontSize: 10, color: "#bbb", background: "#f5f3ef", borderRadius: 6, padding: "3px 8px" }}>{data.layout}</div>
        </div>

        <ImageCompare
          dalleUrl={images?.dalle}
          geminiUrl={images?.gemini}
          dalleLoading={images?.dalleLoading}
          geminiLoading={images?.geminiLoading}
          bgColor={data.background_color}
        />

        <div style={{ marginTop: 14, marginBottom: 10 }}>
          <div style={{ color: "#999", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>OPIS SCENY</div>
          <p style={{ color: "#444", fontSize: 12, lineHeight: 1.7, margin: 0 }}>{data.description}</p>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ color: "#999", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ELEMENTY</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(data.key_elements || []).map((el, i) => (
              <span key={i} style={{ background: "#f5f3ef", border: "1px solid #ede9e3", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#666" }}>{el}</span>
            ))}
          </div>
        </div>

        {data.text_element && (
          <div style={{ padding: "8px 12px", background: "#f5f3ef", borderRadius: 8, border: "1px solid #ede9e3" }}>
            <div style={{ color: "#999", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>TEKST</div>
            <div style={{ color: accent, fontWeight: 800, fontSize: 14, fontFamily: "monospace", letterSpacing: 2 }}>"{data.text_element}"</div>
          </div>
        )}

        <div style={{ marginTop: 10, padding: "8px 12px", background: (data.background_color || "#f5f3ef") + "22", borderRadius: 8, border: "1px solid " + (data.background_color || "#ede9e3") + "55", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: data.background_color, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#444" }}>Tło: {data.background_color_name} <span style={{ color: "#bbb", fontFamily: "monospace", fontWeight: 400 }}>{data.background_color}</span></div>
        </div>
      </div>
    </div>
  );
}

export default function SockDesigner() {
  const [description, setDescription] = useState("");
  const [sockVariant, setSockVariant] = useState("ai_decide");
  const [size, setSize] = useState("both");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [images, setImages] = useState({ leftDalle: null, rightDalle: null, leftGemini: null, rightGemini: null, leftDalleLoading: false, rightDalleLoading: false, leftGeminiLoading: false, rightGeminiLoading: false });
  const fileRef = useRef(null);

  async function handleAttachment(e) {
    const files = Array.from(e.target.files);
    const results = [];
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const base64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(file); });
        results.push({ name: file.name, type: "image", base64, preview: URL.createObjectURL(file) });
      } else {
        const text = await file.text().catch(() => "");
        results.push({ name: file.name, type: "text", content: text.slice(0, 4000) });
      }
    }
    setAttachments(prev => [...prev, ...results]);
  }

  async function generateDesign() {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setImages({ leftDalle: null, rightDalle: null, leftGemini: null, rightGemini: null, leftDalleLoading: false, rightDalleLoading: false, leftGeminiLoading: false, rightGeminiLoading: false });

    try {
      let prompt = `Zaprojektuj skarpetki: "${description}"\n`;
      prompt += `Wariant: ${sockVariant === "different" ? "LEWA I PRAWA RÓŻNE" : sockVariant === "same" ? "IDENTYCZNE" : "AI decyduje"}\n`;
      prompt += `Rozmiary: ${size === "both" ? "36-40 i 41-46" : size === "small" ? "36-40" : "41-46"}\n`;
      for (const att of attachments.filter(a => a.type === "text")) prompt += `\n--- ${att.name} ---\n${att.content}`;
      if (attachments.some(a => a.type === "image")) prompt += "\nZałączone obrazy to inspiracje wizualne.";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "claude", systemPrompt: SOCK_SYSTEM_PROMPT, userMessage: prompt, aiModel: "claude-sonnet-4-5" }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      let parsed;
      try { parsed = JSON.parse(data.text); }
      catch { const m = data.text.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error("Błąd parsowania"); }

      setResult(parsed);
      setLoading(false);

      // Start all 4 image generations in parallel
      setImages(i => ({ ...i, leftDalleLoading: true, rightDalleLoading: true, leftGeminiLoading: true, rightGeminiLoading: true }));

      const [ld, rd, lg, rg] = await Promise.allSettled([
        generateDalle(parsed.dalle_prompt_left),
        generateDalle(parsed.dalle_prompt_right || parsed.dalle_prompt_left),
        generateGemini(parsed.gemini_prompt_left),
        generateGemini(parsed.gemini_prompt_right || parsed.gemini_prompt_left),
      ]);

      setImages({
        leftDalle: ld.status === "fulfilled" ? ld.value : null,
        rightDalle: rd.status === "fulfilled" ? rd.value : null,
        leftGemini: lg.status === "fulfilled" ? lg.value : null,
        rightGemini: rg.status === "fulfilled" ? rg.value : null,
        leftDalleLoading: false, rightDalleLoading: false,
        leftGeminiLoading: false, rightGeminiLoading: false,
      });

    } catch (e) {
      setError(e.message);
      setLoading(false);
      setImages(i => ({ ...i, leftDalleLoading: false, rightDalleLoading: false, leftGeminiLoading: false, rightGeminiLoading: false }));
    }
  }

  async function generateDalle(prompt) {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem: "sock design", consensus: prompt }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.imageUrl;
  }

  async function generateGemini(prompt) {
    const res = await fetch("/api/image-gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.imageUrl;
  }

  const s = {
    page: { minHeight: "100vh", background: "#f5f3ef", fontFamily: "'IBM Plex Mono', monospace", padding: 24 },
    card: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #ede9e3", marginBottom: 16 },
    label: { color: "#999", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8, display: "block" },
    btn: (active) => ({ background: active ? accent : "#fff", color: active ? "#fff" : "#888", border: `1px solid ${active ? accent : "#ddd"}`, borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }),
  };

  return (
    <div style={s.page}>
      <div style={{ marginBottom: 28 }}>
        <a href="/" style={{ color: "#bbb", fontSize: 11, textDecoration: "none" }}>← Consensus Engine</a>
        <div style={{ color: accent, fontWeight: 800, fontSize: 20, letterSpacing: 2, marginTop: 8, marginBottom: 4 }}>SOCK DESIGNER</div>
        <div style={{ color: "#bbb", fontSize: 12 }}>Generator projektów skarpetek · Nadwyraz.com · 168px bitmap · DALL-E 3 + Nano Banana 🍌</div>
      </div>

      <div style={s.card}>
        <label style={s.label}>OPIS / TEMAT KOLEKCJI</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="np. Góry Tatry, klimat zimowy, narty, śnieg, schronisko..."
          style={{ width: "100%", minHeight: 100, padding: "12px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div>
            <label style={s.label}>LEWA / PRAWA</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SOCK_VARIANTS.map(v => (
                <button key={v.id} onClick={() => setSockVariant(v.id)} style={{ ...s.btn(sockVariant === v.id), textAlign: "left", padding: "9px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{v.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{v.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={s.label}>ROZMIAR</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SIZES.map(sz => (
                <button key={sz.id} onClick={() => setSize(sz.id)} style={{ ...s.btn(size === sz.id), textAlign: "left", padding: "9px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{sz.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{sz.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={s.label}>INSPIRACJE (opcjonalnie)</label>
          <div onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed #ddd", borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: "#fdfcfa" }}>
            <span style={{ fontSize: 18 }}>📎</span>
            <div style={{ color: "#888", fontSize: 12 }}>Zdjęcia, moodboard, PDF — <span style={{ color: "#bbb", fontSize: 10 }}>PNG, JPG, PDF, TXT</span></div>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt,.md" style={{ display: "none" }} onChange={handleAttachment} />
          </div>
          {attachments.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {attachments.map((att, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "#f5f3ef", borderRadius: 8, border: "1px solid #ede9e3" }}>
                  {att.preview && <img src={att.preview} alt="" style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 3 }} />}
                  <span style={{ fontSize: 11, color: "#666" }}>{att.name}</span>
                  <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 14, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={generateDesign} disabled={!description.trim() || loading}
          style={{ marginTop: 16, width: "100%", background: description.trim() && !loading ? accent : "#ddd", color: description.trim() && !loading ? "#fff" : "#aaa", border: "none", borderRadius: 10, padding: "14px", fontSize: 13, fontWeight: 800, cursor: description.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "inherit", boxShadow: description.trim() && !loading ? `0 4px 16px ${accent}38` : "none" }}>
          {loading ? "🧦 Projektuję..." : "▶ GENERUJ — DALL-E 3 + Nano Banana 🍌"}
        </button>
      </div>

      {error && <div style={{ padding: 14, background: "#fff0ee", borderRadius: 10, border: "1px solid #f5c5bc", color: "#b83020", fontSize: 12, marginBottom: 16 }}>❌ {error}</div>}

      {result && (
        <div>
          <div style={{ ...s.card, background: accent, border: "none", marginBottom: 16 }}>
            <div style={{ color: "#fff9", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>KOLEKCJA</div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 24, letterSpacing: 1, marginBottom: 6 }}>{result.collection_name}</div>
            <p style={{ color: "#ffffffcc", fontSize: 13, lineHeight: 1.7, margin: "0 0 10px" }}>{result.concept}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>{result.are_socks_different ? "🔄 Lewa ≠ Prawa" : "= Identyczne"}</span>
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>🎨 {result.palette?.length} kolorów</span>
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>📐 168×480 / 168×435 px</span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12, padding: "10px 14px", background: "#fff", borderRadius: 10, border: "1px solid #ede9e3" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#555" }} />
              <span style={{ fontSize: 11, color: "#666" }}>DALL-E 3 (poziomy, poglądowy)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0d9e6e" }} />
              <span style={{ fontSize: 11, color: "#666" }}>Nano Banana 🍌 (9:16, pionowy)</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <SockCard title="🧦 LEWA" data={result.left_sock}
              images={{ dalle: images.leftDalle, gemini: images.leftGemini, dalleLoading: images.leftDalleLoading, geminiLoading: images.leftGeminiLoading }} />
            <SockCard title="🧦 PRAWA" data={result.right_sock}
              images={{ dalle: images.rightDalle, gemini: images.rightGemini, dalleLoading: images.rightDalleLoading, geminiLoading: images.rightGeminiLoading }} />
          </div>

          <div style={s.card}>
            <label style={s.label}>PALETA ({result.palette?.length} kolorów)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {(result.palette || []).map((color, i) => <ColorSwatch key={i} color={color} />)}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Format","BMP bitmap"],["Szerokość","168 px"],["41-46","168 × 480 px"],["36-40","168 × 435 px"],["Maks. kolorów","5-6"],["Styl","Flat, bez gradientów"]].map(([k,v]) => (
                <div key={k} style={{ padding: "8px 12px", background: "#fff", borderRadius: 8, border: "1px solid #ede9e3" }}>
                  <div style={{ color: "#bbb", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{k}</div>
                  <div style={{ color: "#444", fontSize: 12, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={generateDesign}
            style={{ width: "100%", background: "none", border: `1px solid ${accent}`, color: accent, borderRadius: 10, padding: "12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 24 }}>
            ↺ Generuj ponownie
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
