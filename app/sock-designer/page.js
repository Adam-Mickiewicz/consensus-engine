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

Respond ONLY in valid JSON with this exact structure:
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
  "dalle_prompt_left": "Detailed DALL-E prompt for left sock pattern. Flat illustration style, bold outlines, no gradients, like a bitmap sock design unrolled flat, 168x480 pixels proportions, solid color fills only, max 5 colors. [DESCRIBE EXACTLY what to draw]",
  "dalle_prompt_right": "Detailed DALL-E prompt for right sock pattern. Same style rules. [DESCRIBE EXACTLY what to draw]",
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
  { id: "different", label: "Różne od siebie", desc: "Lewa i prawa różne (typowe dla Nadwyraz)" },
  { id: "same", label: "Identyczne", desc: "Lewa = prawa" },
  { id: "ai_decide", label: "AI decyduje", desc: "AI dobiera sam co pasuje do tematu" },
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
        <div style={{ fontSize: 10, color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{color.usage}</div>
      </div>
      <div style={{ fontSize: 10, color: copied ? "#0d9e6e" : "#bbb" }}>{copied ? "✓" : "kopiuj"}</div>
    </div>
  );
}

function SockCard({ title, data, imageUrl, imageLoading }) {
  if (!data) return null;
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ede9e3", overflow: "hidden" }}>
      <div style={{ background: data.background_color || "#f0ede8", height: 8 }} />
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1814" }}>{title}</div>
          <div style={{ fontSize: 10, color: "#bbb", background: "#f5f3ef", borderRadius: 6, padding: "3px 8px" }}>{data.layout}</div>
        </div>
        <div style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden", background: data.background_color || "#f0ede8", minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {imageLoading ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🎨</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Generuję wizualizację...</div>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={title} style={{ width: "100%", display: "block", maxHeight: 300, objectFit: "contain" }} />
          ) : (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🧦</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Wizualizacja pojawi się tu</div>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#999", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>OPIS SCENY</div>
          <p style={{ color: "#444", fontSize: 12, lineHeight: 1.7, margin: 0 }}>{data.description}</p>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#999", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>KLUCZOWE ELEMENTY</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(data.key_elements || []).map((el, i) => (
              <span key={i} style={{ background: "#f5f3ef", border: "1px solid #ede9e3", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#666" }}>{el}</span>
            ))}
          </div>
        </div>
        {data.text_element && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f5f3ef", borderRadius: 8, border: "1px solid #ede9e3" }}>
            <div style={{ color: "#999", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>TEKST NA SKARPETKACH</div>
            <div style={{ color: accent, fontWeight: 800, fontSize: 14, fontFamily: "monospace", letterSpacing: 2 }}>"{data.text_element}"</div>
          </div>
        )}
        <div style={{ padding: "10px 12px", background: (data.background_color || "#f5f3ef") + "22", borderRadius: 8, border: "1px solid " + (data.background_color || "#ede9e3") + "44", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: data.background_color, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#444" }}>Tło: {data.background_color_name}</div>
            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "monospace" }}>{data.background_color}</div>
          </div>
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
  const [leftImageUrl, setLeftImageUrl] = useState(null);
  const [rightImageUrl, setRightImageUrl] = useState(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const fileRef = useRef(null);

  async function handleAttachment(e) {
    const files = Array.from(e.target.files);
    const results = [];
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const base64 = await new Promise(res => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.readAsDataURL(file);
        });
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
    setLeftImageUrl(null);
    setRightImageUrl(null);

    try {
      let prompt = `Zaprojektuj skarpetki na podstawie tego opisu: "${description}"\n\n`;
      prompt += `Wariant skarpetek: ${sockVariant === "different" ? "LEWA I PRAWA RÓŻNE OD SIEBIE" : sockVariant === "same" ? "LEWA I PRAWA IDENTYCZNE" : "AI decyduje co pasuje do tematu"}\n`;
      prompt += `Rozmiary: ${size === "both" ? "oba (36-40 i 41-46)" : size === "small" ? "36-40 (435px)" : "41-46 (480px)"}\n\n`;
      for (const att of attachments.filter(a => a.type === "text")) {
        prompt += `--- Załącznik: ${att.name} ---\n${att.content}\n\n`;
      }
      if (attachments.some(a => a.type === "image")) {
        prompt += "Załączone obrazy to inspiracje/referencje — uwzględnij je przy projektowaniu.";
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "claude",
          systemPrompt: SOCK_SYSTEM_PROMPT,
          userMessage: prompt,
          aiModel: "claude-sonnet-4-5",
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      let parsed;
      try {
        parsed = JSON.parse(data.text);
      } catch {
        const match = data.text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error("Nie udało się sparsować odpowiedzi AI");
      }

      setResult(parsed);
      setLoading(false);

      setImagesLoading(true);
      await Promise.all([
        generateImage(parsed.dalle_prompt_left, "left"),
        generateImage(parsed.dalle_prompt_right || parsed.dalle_prompt_left, "right"),
      ]);
      setImagesLoading(false);

    } catch (e) {
      setError(e.message);
      setLoading(false);
      setImagesLoading(false);
    }
  }

  async function generateImage(prompt, side) {
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: "sock design", consensus: prompt }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        if (side === "left") setLeftImageUrl(data.imageUrl);
        else setRightImageUrl(data.imageUrl);
      }
    } catch (e) {
      console.error("Image gen error:", e);
    }
  }

  const s = {
    page: { minHeight: "100vh", background: "#f5f3ef", fontFamily: "'IBM Plex Mono', monospace", padding: 24 },
    card: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #ede9e3", marginBottom: 16 },
    label: { color: "#999", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8, display: "block" },
    btn: (active) => ({ background: active ? accent : "#fff", color: active ? "#fff" : "#888", border: `1px solid ${active ? accent : "#ddd"}`, borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, transition: "all 0.15s" }),
  };

  return (
    <div style={s.page}>
      <div style={{ marginBottom: 28 }}>
        <a href="/" style={{ color: "#bbb", fontSize: 11, textDecoration: "none" }}>← Consensus Engine</a>
        <div style={{ color: accent, fontWeight: 800, fontSize: 20, letterSpacing: 2, marginTop: 8, marginBottom: 4 }}>SOCK DESIGNER</div>
        <div style={{ color: "#bbb", fontSize: 12 }}>Generator projektów skarpetek · Nadwyraz.com · 168px bitmap</div>
      </div>

      <div style={s.card}>
        <label style={s.label}>OPIS PROJEKTU / TEMAT KOLEKCJI</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="np. Góry Tatry, klimat zimowy, narty, śnieg, schronisko. Dla miłośników gór i aktywnego wypoczynku."
          style={{ width: "100%", minHeight: 100, padding: "12px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div>
            <label style={s.label}>LEWA / PRAWA SKARPETKA</label>
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
          <label style={s.label}>INSPIRACJE / ZAŁĄCZNIKI (opcjonalnie)</label>
          <div onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed #ddd", borderRadius: 10, padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: "#fdfcfa" }}>
            <span style={{ fontSize: 20 }}>📎</span>
            <div>
              <div style={{ color: "#888", fontSize: 12, fontWeight: 600 }}>Dodaj zdjęcia, moodboard, PDF od klienta</div>
              <div style={{ color: "#bbb", fontSize: 10, marginTop: 2 }}>PNG, JPG, PDF, TXT...</div>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt,.md" style={{ display: "none" }} onChange={handleAttachment} />
          </div>
          {attachments.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {attachments.map((att, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#f5f3ef", borderRadius: 8, border: "1px solid #ede9e3" }}>
                  {att.preview && <img src={att.preview} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4 }} />}
                  <span style={{ fontSize: 11, color: "#666" }}>{att.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 14, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={generateDesign} disabled={!description.trim() || loading}
          style={{ marginTop: 16, width: "100%", background: description.trim() && !loading ? accent : "#ddd", color: description.trim() && !loading ? "#fff" : "#aaa", border: "none", borderRadius: 10, padding: "14px", fontSize: 13, fontWeight: 800, cursor: description.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: 0.5, boxShadow: description.trim() && !loading ? `0 4px 16px ${accent}38` : "none" }}>
          {loading ? "🧦 Projektuję..." : "▶ GENERUJ PROJEKT"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 14, background: "#fff0ee", borderRadius: 10, border: "1px solid #f5c5bc", color: "#b83020", fontSize: 12, marginBottom: 16 }}>❌ {error}</div>
      )}

      {result && (
        <div>
          <div style={{ ...s.card, background: accent, border: "none" }}>
            <div style={{ color: "#fff9", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>KOLEKCJA</div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 24, letterSpacing: 1, marginBottom: 8 }}>{result.collection_name}</div>
            <p style={{ color: "#ffffffcc", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{result.concept}</p>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>{result.are_socks_different ? "🔄 Lewa ≠ Prawa" : "= Identyczne"}</span>
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>📐 {result.technical_spec?.size_large} / {result.technical_spec?.size_small}</span>
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 10, color: "#fff" }}>🎨 {result.palette?.length} kolorów</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <SockCard title="🧦 LEWA" data={result.left_sock} imageUrl={leftImageUrl} imageLoading={imagesLoading && !leftImageUrl} />
            <SockCard title="🧦 PRAWA" data={result.right_sock} imageUrl={rightImageUrl} imageLoading={imagesLoading && !rightImageUrl} />
          </div>

          <div style={s.card}>
            <label style={s.label}>PALETA PRODUKCYJNA ({result.palette?.length} kolorów)</label>
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
              {[["Format","BMP bitmap"],["Szerokość","168 px"],["Rozmiar 41-46","168 × 480 px"],["Rozmiar 36-40","168 × 435 px"],["Maks. kolorów",`${result.technical_spec?.color_count || 5}`],["Styl","Flat illustration, bez gradientów"]].map(([k,v]) => (
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
