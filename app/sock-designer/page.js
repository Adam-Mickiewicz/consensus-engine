"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const ACCENT = "#b8763a";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const NAV = [
  { href: "/", label: "⚡ Consensus Engine" },
  { href: "/newsletter-builder", label: "📧 Newsletter Builder" },
  { href: "/sock-designer", label: "🧦 Sock Designer", active: true },
  { href: "/design-judge", label: "🎨 Design Judge" },
  { href: "/tools/countdown", label: "⏱ Generator odliczania" },
  { href: "/tools/marketing-brief", label: "📋 Akcje marketingowe" },
  { href: "/tools/brand-settings", label: "🏷️ Ustawienia marki" },
];

const SOCK_SYSTEM_PROMPT = `Jesteś doświadczonym projektantem skarpetek dla Nadwyraz.com — polskiej marki tworzącej narracyjne, płaskie wzory skarpetek z przędzą LEGS.

Prowadzisz rozmowę z projektantem. Pomagasz iterować brief kolekcji krok po kroku. Odpowiadaj po polsku, konkretnie i kreatywnie.

SPECYFIKACJA TECHNICZNA (zawsze obowiązuje):
- Wymiary: 168px szerokość × 480px wysokość (rozmiary 41-46) lub 168px × 435px (36-40)
- Maks. 6 kolorów, WYŁĄCZNIE z palety LEGS
- Styl: 100% płaska ilustracja 2D, zero gradientów, zero 3D
- Kontury: opcjonalne
- Wzór wypełnia całe płótno (maks. 1px margines)
- Lewa ≠ Prawa — zawsze dwie różne kompozycje

PALETA LEGS (używaj TYLKO tych kodów):
BIELE/KREMOWE: 2029/1530W=#F5F5F2, 114 L=#F0EFEC, 0065/1005L=#EAD4C6, 101 L=#EDE8E0, 115 L=#F0EDE0
ŻÓŁTE/ZŁOTE: 103 M=#FFE04A, 0006 L=#F5D060, 10179 M=#F0B030, 10182 D=#E8A020, 126 D=#E8C000, 2012 KM=#C87000
POMARAŃCZOWE: 202 M=#E07830, 201 L=#E8A870, 259 L=#D8704A, 6012 D=#D05018, 203 D=#D04020
CZERWONE: 00001 D=#CC0000, 0002 D=#8B0000, 30217 M=#8B2020, 6017 D=#9A1820, 30203 D=#5A1018
RÓŻOWE/MALINA: 0005 L=#F0D0D8, 366 L=#DDB0C0, 303 L=#B05070, 368 M=#921840, 30205 D=#A83050, 403 M=#D85070, 401 D=#CC3865, 466 M=#C04875
FIOLETOWE: 4939 D=#883B6A, 438 D=#712E57, 407 D=#703146, 4044 M=#A698B8, 467 D=#704E80, 408 D=#575994, 406 D=#413359, 416 D=#3A1A50
NIEBIESKIE: 703 L=#79A2BE, 704 M=#4878A0, 706 D=#4870A8, 707 D=#3065A0, 0786 KS=#1E3154, 2297 D=#5878B0, 2213 M=#6DAFC3, 779 M=#383945
TURKUSOWE/TEAL: 618 M=#52B1C0, 602 M=#069BBC, 604 D=#2A8BAD, 624 D=#118294, 605 KS=#256E8A, 50401 KS=#11897F, 50396 KS=#1D6564
ZIELONE: 50064 M=#C7C745, 503 L=#ACC483, 50057 D=#5A915C, 50061 KS=#378C3E, 507 D=#4D6C46, 50399 D=#5D7849, 558 KS=#2F7957, 50400 KS=#1F684B, 541 KS=#1A622F
SZARE: 903 L=#A8B0B8, 904 M=#909098, 8006 M=#606068, 906 M=#565962, 8008 D=#2C2B31
BRĄZOWE: 806 M=#907870, 808 D=#534C47, 829 M=#A85A40, 815 D=#935E46, 838 D=#54413F, 2332 D=#3C2D2E
CZARNE: 2999 D=#0D0D0D, 9934 D=#282A2E

DNA NADWYRAZ:
- Lewa skarpetka: szeroka scena panoramiczna (pejzaż, miasto, pełna ilustracja narracyjna)
- Prawa skarpetka: rozproszone ikony/motywy na jednolitym tle
- Mocne storytelling, typografia często wpleciona

Gdy generujesz brief, dodaj blok JSON między znacznikami <<<BRIEF_START>>> i <<<BRIEF_END>>>:
{
  "collection_name": "2-3 słowa",
  "concept": "1-2 zdania",
  "left_sock": { "description": "opis", "layout": "panoramic", "key_elements": [], "text_element": null, "background": { "legs_code": "KOD LEGS", "hex": "#HEX", "name": "nazwa" } },
  "right_sock": { "description": "opis", "layout": "scattered", "key_elements": [], "text_element": null, "background": { "legs_code": "KOD LEGS", "hex": "#HEX", "name": "nazwa" } },
  "palette": [{ "legs_code": "KOD LEGS", "hex": "#HEX", "name": "nazwa", "usage": "gdzie" }],
  "dalle_prompt_left": "VERTICAL PORTRAIT flat 2D textile pattern. Tall narrow 1:3 ratio. Pure 2D ONLY. NO 3D. NO gradients. Solid fills edge to edge. [OPIS]. Background: #HEX. Max 6 flat colors.",
  "dalle_prompt_right": "VERTICAL PORTRAIT flat 2D textile pattern. Tall narrow 1:3 ratio. Pure 2D ONLY. NO 3D. NO gradients. Solid fills edge to edge. [OPIS]. Background: #HEX. Max 6 flat colors.",
  "gemini_prompt_left": "Flat 2D textile sock pattern. 9:16 vertical. Edge to edge. NO gradients. NO 3D. Pixel-art bitmap. [OPIS]. Background: #HEX. Max 6 colors.",
  "gemini_prompt_right": "Flat 2D textile sock pattern. 9:16 vertical. Edge to edge. NO gradients. NO 3D. Pixel-art bitmap. [OPIS]. Background: #HEX. Max 6 colors.",
  "designer_notes": "uwagi"
}`;

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Prefer": opts.prefer || "return=representation", ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function renderMarkdown(text) {
  if (!text) return null;
  text = text.replace(/<<<BRIEF_START>>>[\s\S]*?<<<BRIEF_END>>>/g, "").replace(/<<<BRIEF_START>>>[\s\S]*/g, "").trim();
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim(); const codeLines = []; i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      elements.push(<div key={i} style={{ margin: "10px 0", borderRadius: 8, overflow: "hidden", border: "1px solid #e0dbd4" }}>{lang && <div style={{ background: "#f0ece6", padding: "3px 10px", fontSize: 10, color: "#888", fontFamily: "monospace", borderBottom: "1px solid #e0dbd4" }}>{lang}</div>}<pre style={{ margin: 0, padding: "10px 12px", background: "#fafaf8", fontSize: 11.5, fontFamily: "'SF Mono','Fira Code',monospace", overflowX: "auto", lineHeight: 1.6, color: "#1a1a1a", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{codeLines.join("\n")}</pre></div>);
      i++; continue;
    }
    if (line.startsWith("### ")) { elements.push(<div key={i} style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 4, fontFamily: FONT }}>{line.slice(4)}</div>); }
    else if (line.startsWith("## ")) { elements.push(<div key={i} style={{ fontSize: 14, fontWeight: 700, color: ACCENT, marginTop: 18, marginBottom: 6, paddingBottom: 5, borderBottom: "1px solid #f0e8df", fontFamily: FONT }}>{line.slice(3)}</div>); }
    else if (line.startsWith("# ")) { elements.push(<div key={i} style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginTop: 18, marginBottom: 8, fontFamily: FONT }}>{line.slice(2)}</div>); }
    else if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ")) { const txt = line.replace(/^[-•*] /, ""); elements.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4, fontFamily: FONT, fontSize: 13, lineHeight: 1.6 }}><span style={{ color: ACCENT, flexShrink: 0, marginTop: 1 }}>•</span><span>{parseBold(txt)}</span></div>); }
    else if (/^\d+\. /.test(line)) { const num = line.match(/^(\d+)\. /)[1]; const txt = line.replace(/^\d+\. /, ""); elements.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4, fontFamily: FONT, fontSize: 13, lineHeight: 1.6 }}><span style={{ color: ACCENT, fontWeight: 600, flexShrink: 0, minWidth: 18 }}>{num}.</span><span>{parseBold(txt)}</span></div>); }
    else if (line.startsWith("---") || line.startsWith("===")) { elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #e8e0d8", margin: "12px 0" }} />); }
    else if (line.startsWith("> ")) { elements.push(<div key={i} style={{ borderLeft: "3px solid " + ACCENT, color: "#555", fontStyle: "italic", margin: "8px 0", background: "#fdf8f3", borderRadius: "0 6px 6px 0", padding: "6px 12px", fontFamily: FONT, fontSize: 13 }}>{parseBold(line.slice(2))}</div>); }
    else if (line.trim() === "") { elements.push(<div key={i} style={{ height: 8 }} />); }
    else { elements.push(<div key={i} style={{ marginBottom: 3, lineHeight: 1.7, fontFamily: FONT, fontSize: 13, color: "#1a1a1a" }}>{parseBold(line)}</div>); }
    i++;
  }
  return elements;
}

function parseBold(text) {
  if (!text.includes("**") && !text.includes("`")) return text;
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ color: "#1a1a1a" }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ background: "#f0ece6", borderRadius: 3, padding: "1px 5px", fontSize: "0.9em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function ImageSlot({ title, engine, prompt, onPromptChange, onGenerate, loading, imageUrl, bgColor }) {
  const engineColor = engine === "dalle" ? "#1a1814" : "#0d9e6e";
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 14px", background: "#f9f7f5", borderBottom: "1px solid #e0dbd4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#1a1a1a" }}>{title}</div>
          <div style={{ fontSize: 10, color: engineColor, fontWeight: 700, marginTop: 1 }}><span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: engineColor, marginRight: 4, verticalAlign: "middle" }} />{engine === "dalle" ? "DALL-E 3" : "Nano Banana 🍌"}</div>
        </div>
        <button onClick={onGenerate} disabled={loading || !prompt.trim()} style={{ background: loading ? "#eee" : engineColor, color: loading ? "#aaa" : "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{loading ? "⏳" : "▶ Generuj"}</button>
      </div>
      <div style={{ aspectRatio: "1/1.8", background: bgColor ? bgColor + "22" : "#f5f3ef", position: "relative", overflow: "hidden" }}>
        {imageUrl ? <img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#ccc" }}>{loading ? <><div style={{ fontSize: 28 }}>⏳</div><div style={{ fontSize: 11 }}>generuję...</div></> : <><div style={{ fontSize: 28 }}>🖼️</div><div style={{ fontSize: 11 }}>brak obrazu</div></>}</div>}
      </div>
      <div style={{ padding: "10px 12px", borderTop: "1px solid #e0dbd4" }}>
        <textarea value={prompt} onChange={e => onPromptChange(e.target.value)} placeholder="Prompt do generowania..." style={{ width: "100%", minHeight: 65, padding: "7px 9px", borderRadius: 6, border: "1px solid " + engineColor + "33", fontSize: 10, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa", color: "#444" }} />
      </div>
    </div>
  );
}

export default function SockDesigner() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [brief, setBrief] = useState(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [prompts, setPrompts] = useState({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
  const [imgs, setImgs] = useState({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
  const [loadings, setLoadings] = useState({ dalleLeft: false, dalleRight: false, geminiLeft: false, geminiRight: false });
  const [chatModel, setChatModel] = useState("claude-sonnet-4-6");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthLength, setSynthLength] = useState("medium");
  const [attachments, setAttachments] = useState([]);
  const [deepResearch, setDeepResearch] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const chatScrollRef = useRef(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [chatHistory, chatLoading]);

  const loadSessions = useCallback(async () => {
    try { const data = await sbFetch("/sock_chats?select=id,title,updated_at&order=updated_at.desc&limit=30"); setSessions(data || []); } catch (e) { console.error(e); }
  }, []);

  async function loadSession(id) {
    try {
      const data = await sbFetch("/sock_chats?id=eq." + id + "&select=*");
      const s = data[0]; setCurrentSessionId(id); setChatHistory(s.messages || []);
      if (s.last_brief) {
        setBrief(s.last_brief);
        setPrompts({ dalleLeft: s.last_brief.dalle_prompt_left || "", dalleRight: s.last_brief.dalle_prompt_right || "", geminiLeft: s.last_brief.gemini_prompt_left || "", geminiRight: s.last_brief.gemini_prompt_right || "" });
      }
      if (s.generated_images) setImgs(s.generated_images);
    } catch (e) { console.error(e); }
  }

  async function saveSession(msgs, lastBrief, title, currentImgs) {
    try {
      if (!currentSessionId) {
        const data = await sbFetch("/sock_chats", { method: "POST", body: JSON.stringify({ title: title || "Projekt", messages: msgs, last_brief: lastBrief || null, generated_images: currentImgs || {} }) });
        const s = Array.isArray(data) ? data[0] : data; setCurrentSessionId(s.id); setSessions(prev => [s, ...prev.filter(x => x.id !== s.id)]);
      } else {
        await sbFetch("/sock_chats?id=eq." + currentSessionId, { method: "PATCH", body: JSON.stringify({ messages: msgs, last_brief: lastBrief || null, title: title || "Projekt", updated_at: new Date().toISOString(), generated_images: currentImgs || {} }), prefer: "return=minimal" });
        loadSessions();
      }
    } catch (e) { console.error(e); }
  }

  function newSession() {
    setBrief(null); setBriefOpen(false);
    setPrompts({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
    setImgs({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
    setChatHistory([]); setCurrentSessionId(null);
  }

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput.trim(), model: chatModel, ts: Date.now() };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory); setChatInput(""); setChatLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: chatModel, messages: newHistory.map(m => ({ role: m.role, content: m.content, model: m.model || null })), briefContext: null, systemOverride: SOCK_SYSTEM_PROMPT, deepResearch }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const content = data.content || "";
      const aiMsg = { role: "assistant", content, model: chatModel, ts: Date.now() };
      const finalHistory = [...newHistory, aiMsg];
      setChatHistory(finalHistory);
      let latestBrief = brief;
      const briefMatch = content.match(/<<<BRIEF_START>>>([\s\S]*?)<<<BRIEF_END>>>/);
      let pendingBrief = null;
      if (briefMatch) {
        try { pendingBrief = JSON.parse(briefMatch[1].trim()); } catch (e) { console.error("Brief parse error:", e); }
      }

      // Jeśli nie ma briefu w odpowiedzi i AI opisało projekt — poproś o JSON
      const seemsLikeBrief = content.length > 200 && (content.includes("lewa") || content.includes("prawa") || content.includes("skarpet") || content.includes("LEGS") || content.includes("tło") || content.includes("kolekcj"));
      if (!pendingBrief && seemsLikeBrief && !chatModel.startsWith("claude")) {
        try {
          const jsonReq = await fetch("/api/ai-chat", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: chatModel,
              messages: [...newHistory.map(m => ({ role: m.role, content: m.content })), { role: "assistant", content }, { role: "user", content: "Na podstawie rozmowy wygeneruj brief. Odpowiedz TYLKO: " + "<<<BRIEF_START>>>" + "\n{json}\n" + "<<<BRIEF_END>>>" }],
              briefContext: null,
              systemOverride: SOCK_SYSTEM_PROMPT,
            }),
          });
          const jsonData = await jsonReq.json();
          if (!jsonData.error) {
            const jsonMatch = jsonData.content.match(/<<<BRIEF_START>>>([\s\S]*?)<<<BRIEF_END>>>/);
            if (jsonMatch) { try { pendingBrief = JSON.parse(jsonMatch[1].trim()); } catch(e) {} }
          }
        } catch(e) { console.error("JSON extraction error:", e); }
      }

      const finalMsgWithBrief = { ...aiMsg, pendingBrief };
      const finalHistoryWithBrief = [...newHistory, finalMsgWithBrief];
      setChatHistory(finalHistoryWithBrief);
      await saveSession(finalHistoryWithBrief.map(({ role, content }) => ({ role, content })), latestBrief, latestBrief?.collection_name || chatInput.slice(0, 50));
    } catch (e) { setChatHistory(prev => [...prev, { role: "assistant", content: "❌ Błąd: " + e.message, model: chatModel, ts: Date.now() }]); }
    setChatLoading(false);
  };

  const clearChat = () => { if (confirm("Wyczyścić historię czatu?")) setChatHistory([]); };

  const generateSynthesis = async () => {
    if (!chatHistory.length) return;
    setSynthesizing(true);
    const lengthInstructions = { short: "Synteza KRÓTKA — max 5-7 punktów.", medium: "Synteza ŚREDNIEJ DŁUGOŚCI — kluczowe wnioski.", long: "Synteza ROZWINIĘTA — pełne omówienie." };
    const summaryPrompt = `Na podstawie tej rozmowy o projekcie skarpetek przygotuj syntezę w markdown.\n${lengthInstructions[synthLength]}\n\nUżyj struktury:\n## PODSUMOWANIE PROJEKTU\n## KLUCZOWE DECYZJE\n## PALETA KOLORÓW LEGS\n## PROMPTY DO GENEROWANIA\n## REKOMENDACJE`;
    try {
      const res = await fetch("/api/ai-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: chatModel, messages: [...chatHistory.map(m => ({ role: m.role, content: m.content })), { role: "user", content: summaryPrompt }], briefContext: null, systemOverride: SOCK_SYSTEM_PROMPT }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatHistory(prev => [...prev, { role: "synthesis", content: data.content, model: chatModel, ts: Date.now() }]);
    } catch (e) { setChatHistory(prev => [...prev, { role: "synthesis", content: "❌ Błąd syntezy: " + e.message, model: chatModel, ts: Date.now() }]); }
    setSynthesizing(false);
  };

  async function generateImage(key, engine, promptText) {
    setLoadings(l => ({ ...l, [key]: true })); setImgs(i => ({ ...i, [key]: null }));
    try {
      let imageUrl = null;
      if (engine === "dalle") {
        const res = await fetch("/api/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem: "sock design", consensus: promptText }) });
        const data = await res.json(); if (!data.success) throw new Error(data.error); imageUrl = data.imageUrl;
      } else {
        const res = await fetch("/api/image-gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: promptText }) });
        const data = await res.json(); if (!data.success) throw new Error(data.error); imageUrl = data.imageUrl;
      }
      if (imageUrl) {
        setImgs(prev => {
          const updated = { ...prev, [key]: imageUrl };
          if (currentSessionId) {
            sbFetch("/sock_chats?id=eq." + currentSessionId, { method: "PATCH", body: JSON.stringify({ generated_images: updated, updated_at: new Date().toISOString() }), prefer: "return=minimal" }).catch(console.error);
          }
          return updated;
        });
      }
    } catch (e) { console.error(e); }
    setLoadings(l => ({ ...l, [key]: false }));
  }

  function generateAll() {
    generateImage("dalleLeft", "dalle", prompts.dalleLeft); generateImage("dalleRight", "dalle", prompts.dalleRight);
    generateImage("geminiLeft", "gemini", prompts.geminiLeft); generateImage("geminiRight", "gemini", prompts.geminiRight);
  }

  const anyLoading = Object.values(loadings).some(Boolean);
  const SLOTS = [
    { key: "dalleLeft", title: "🧦 Lewa", engine: "dalle", bgColor: brief?.left_sock?.background?.hex },
    { key: "dalleRight", title: "🧦 Prawa", engine: "dalle", bgColor: brief?.right_sock?.background?.hex },
    { key: "geminiLeft", title: "🧦 Lewa", engine: "gemini", bgColor: brief?.left_sock?.background?.hex },
    { key: "geminiRight", title: "🧦 Prawa", engine: "gemini", bgColor: brief?.right_sock?.background?.hex },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ee", fontFamily: "'IBM Plex Mono', monospace", display: "flex" }}>
      <div style={{ width: 220, minWidth: 220, background: "#0f0f0f", borderRight: "1px solid #1a1a1a", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 8, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ marginBottom: 20 }}><div style={{ color: ACCENT, fontWeight: 800, fontSize: 13, letterSpacing: 2 }}>CONSENSUS</div><div style={{ color: "#444", fontSize: 10, letterSpacing: 1 }}>ENGINE v1.0</div></div>
        <div style={{ color: "#444", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>NAWIGACJA</div>
        {NAV.map(item => (<a key={item.href} href={item.href} style={{ display: "block", padding: "9px 12px", borderRadius: 8, fontSize: 11, fontWeight: item.active ? 700 : 400, background: item.active ? ACCENT + "20" : "none", border: item.active ? "1px solid " + ACCENT + "40" : "1px solid transparent", color: item.active ? ACCENT : "#666", textDecoration: "none" }}>{item.label}</a>))}
      </div>

      <div style={{ flex: 1, display: "flex", height: "100vh", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div><div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>🧦 Sock Designer</div><div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Opisz kolekcję w czacie → brief wypełni prompty → generuj obrazy</div></div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{saveMsg && <span style={{ fontSize: 11, color: "#2d7a4f" }}>{saveMsg}</span>}<button onClick={newSession} style={{ background: "none", color: "#888", border: "1px solid #ddd", borderRadius: 7, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>+ Nowy</button></div>
          </div>

          {sessions.length > 0 && !brief && (
            <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "9px 14px", background: "#f9f7f5", borderBottom: "1px solid #e0dbd4", fontSize: 10, fontWeight: 700, color: "#888", fontFamily: "monospace" }}>HISTORIA PROJEKTÓW</div>
              <div style={{ maxHeight: 140, overflowY: "auto" }}>
                {sessions.map(s => (<div key={s.id} onClick={() => loadSession(s.id)} style={{ padding: "9px 14px", borderBottom: "1px solid #f0ece8", cursor: "pointer", background: s.id === currentSessionId ? ACCENT + "10" : "transparent", display: "flex", justifyContent: "space-between" }}><div style={{ fontWeight: s.id === currentSessionId ? 700 : 400, fontSize: 12, color: s.id === currentSessionId ? ACCENT : "#333" }}>{s.title}</div><div style={{ fontSize: 10, color: "#aaa" }}>{new Date(s.updated_at).toLocaleDateString("pl-PL")}</div></div>))}
              </div>
            </div>
          )}

          {brief && (
            <div style={{ background: ACCENT, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div><div style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 700, letterSpacing: 1.5 }}>KOLEKCJA</div><div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>{brief.collection_name}</div></div>
                <div style={{ display: "flex", gap: 5 }}>{(brief.palette || []).slice(0, 6).map((c, i) => (<div key={i} title={c.legs_code + " " + c.hex} onClick={() => navigator.clipboard.writeText(c.hex)} style={{ width: 20, height: 20, borderRadius: 4, background: c.hex, border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer" }} />))}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={generateAll} disabled={anyLoading} style={{ background: anyLoading ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 7, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{anyLoading ? "⏳ Generuję..." : "▶▶ Generuj wszystkie"}</button>
                <button onClick={() => setBriefOpen(o => !o)} style={{ background: "none", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{briefOpen ? "▲ Zwiń" : "▼ Brief"}</button>
              </div>
            </div>
          )}

          {brief && briefOpen && (
            <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: brief.designer_notes ? 12 : 0 }}>
                {[["🧦 LEWA", brief.left_sock], ["🧦 PRAWA", brief.right_sock]].map(([title, sock]) => sock && (
                  <div key={title} style={{ background: "#f9f7f5", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>{title} <span style={{ fontWeight: 400, color: "#bbb" }}>· {sock.layout}</span></div>
                    <p style={{ color: "#555", fontSize: 11, lineHeight: 1.6, margin: "0 0 8px" }}>{sock.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>{(sock.key_elements || []).map((el, ei) => <span key={ei} style={{ background: "#fff", border: "1px solid #ede9e3", borderRadius: 20, padding: "1px 7px", fontSize: 10, color: "#666" }}>{el}</span>)}</div>
                    {sock.text_element && <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700 }}>"{sock.text_element}"</div>}
                    {sock.background && <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}><div style={{ width: 12, height: 12, borderRadius: 2, background: sock.background.hex, border: "1px solid rgba(0,0,0,0.1)" }} /><span style={{ fontSize: 10, color: "#888" }}>LEGS {sock.background.legs_code} {sock.background.hex}</span></div>}
                  </div>
                ))}
              </div>
              {brief.designer_notes && <div style={{ padding: "8px 12px", background: "#fff8f0", borderRadius: 7, border: "1px solid " + ACCENT + "33", fontSize: 11, color: "#555", lineHeight: 1.6 }}><span style={{ color: ACCENT, fontWeight: 700, fontSize: 9 }}>NOTATKI </span>{brief.designer_notes}</div>}
            </div>
          )}

          {!brief && <div style={{ background: "#fff", border: "2px dashed #e0dbd4", borderRadius: 12, padding: 28, textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 32, marginBottom: 8 }}>🧦</div><div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 4 }}>Opisz kolekcję w czacie →</div><div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.7 }}>AI wygeneruje brief i automatycznie<br />wypełni prompty w galerii poniżej</div></div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {SLOTS.map(slot => (<ImageSlot key={slot.key} title={slot.title} engine={slot.engine} prompt={prompts[slot.key]} onPromptChange={v => setPrompts(p => ({ ...p, [slot.key]: v }))} onGenerate={() => generateImage(slot.key, slot.engine, prompts[slot.key])} loading={loadings[slot.key]} imageUrl={imgs[slot.key]} bgColor={slot.bgColor} />))}
          </div>
        </div>

        <div style={{ width: chatExpanded ? "100vw" : chatOpen ? "clamp(360px, 35vw, 600px)" : 48, minWidth: chatExpanded ? "100vw" : chatOpen ? "clamp(360px, 35vw, 600px)" : 48, borderLeft: "1px solid #e0dbd4", background: "#fff", display: "flex", flexDirection: "column", height: "100vh", position: chatExpanded ? "fixed" : "sticky", top: 0, right: chatExpanded ? 0 : "auto", zIndex: chatExpanded ? 100 : "auto", transition: "width 0.2s, min-width 0.2s", overflow: "hidden" }}>
          <button onClick={() => setChatOpen(o => !o)} style={{ position: "absolute", top: 16, left: chatOpen ? 12 : 8, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#aaa", zIndex: 10, padding: 4 }}>{chatOpen ? "→" : "←"}</button>

          {chatOpen && (<>
            <div style={{ padding: "12px 16px 12px 40px", borderBottom: "1px solid #e0dbd4", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", fontFamily: "monospace" }}>🤖 Projektant AI</div>
                <button onClick={clearChat} style={{ padding: "2px 8px", borderRadius: 20, border: "1px solid #eee", background: "none", color: "#ccc", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>Wyczyść</button>
              </div>
              {(() => {
                const MODELS = {
                  claude: [{ id: "claude-sonnet-4-6", short: "Sonnet 4.6", tip: "Nowy domyślny. Prawie poziom Opus, szybszy.", price: "$3/1M" }, { id: "claude-opus-4-6", short: "Opus 4.6", tip: "Najlepszy Claude. 1M kontekst, top kodowanie.", price: "$15/1M" }, { id: "claude-haiku-4-5-20251001", short: "Haiku 4.5", tip: "Błyskawiczny do prostych pytań.", price: "$0.25/1M" }],
                  openai: [{ id: "gpt-4o", short: "GPT-4o", tip: "Flagowy OpenAI, sprawdzony.", price: "$5/1M" }, { id: "gpt-4o-mini", short: "4o mini", tip: "Szybki i tani.", price: "$0.15/1M" }, { id: "o3-mini", short: "o3 mini", tip: "Rozumowanie.", price: "$1.1/1M" }],
                  gemini: [{ id: "gemini-3-pro-preview", short: "3 Pro", tip: "Najnowszy Google. Multimodal + agenty.", price: "$2/1M" }, { id: "gemini-3-flash-preview", short: "3 Flash", tip: "Szybki Gemini 3 z myśleniem.", price: "$0.50/1M" }, { id: "gemini-2.5-pro", short: "2.5 Pro", tip: "Stabilny, świetny do kodowania.", price: "$1.25/1M" }, { id: "gemini-2.5-flash", short: "2.5 Flash", tip: "Hybrid reasoning, 1M kontekst.", price: "$0.30/1M" }, { id: "gemini-2.0-flash", short: "2.0 Flash", tip: "Sprawdzony i tani.", price: "$0.10/1M" }],
                };
                const PROVIDERS = [{ id: "claude", label: "Claude", color: "#b8763a" }, { id: "openai", label: "OpenAI", color: "#10a37f" }, { id: "gemini", label: "Gemini", color: "#4285f4" }];
                const activeProvider = chatModel.startsWith("claude") ? "claude" : chatModel.startsWith("gemini") ? "gemini" : "openai";
                const activeColor = PROVIDERS.find(p => p.id === activeProvider)?.color || ACCENT;
                const activeModelInfo = Object.values(MODELS).flat().find(m => m.id === chatModel);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 4 }}>{PROVIDERS.map(p => (<button key={p.id} onClick={() => setChatModel(MODELS[p.id][0].id)} style={{ flex: 1, padding: "4px 6px", borderRadius: 6, border: `1px solid ${activeProvider === p.id ? p.color : "#ddd"}`, background: activeProvider === p.id ? p.color + "15" : "#f9f9f9", color: activeProvider === p.id ? p.color : "#aaa", fontSize: 10, fontWeight: activeProvider === p.id ? 700 : 400, cursor: "pointer", fontFamily: "monospace" }}>{p.label}</button>))}</div>
                    <div style={{ display: "flex", gap: 4 }}>{MODELS[activeProvider].map(m => (<button key={m.id} onClick={() => setChatModel(m.id)} title={`${m.tip} ${m.price}`} style={{ flex: 1, padding: "4px 4px", borderRadius: 6, border: `1px solid ${chatModel === m.id ? activeColor : "#ddd"}`, background: chatModel === m.id ? activeColor + "15" : "#fafafa", color: chatModel === m.id ? activeColor : "#888", fontSize: 10, fontWeight: chatModel === m.id ? 700 : 400, cursor: "pointer", fontFamily: "monospace" }}>{m.short}</button>))}</div>
                    {activeModelInfo && <div style={{ fontSize: 10, color: "#888", background: "#f9f7f5", borderRadius: 4, padding: "3px 8px", lineHeight: 1.4 }}>ℹ️ {activeModelInfo.tip} <span style={{ color: activeColor, fontWeight: 700 }}>{activeModelInfo.price} tokenów</span></div>}
                  </div>
                );
              })()}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }} ref={chatScrollRef}>
              {chatHistory.length === 0 && <div style={{ textAlign: "center", color: "#ccc", fontSize: 12, marginTop: 40 }}><div style={{ fontSize: 32, marginBottom: 8 }}>💬</div><div>Opisz kolekcję skarpetek.<br />AI wygeneruje brief i wypełni<br />prompty w galerii.</div></div>}
              {chatHistory.map((msg, i) => {
                const modelColor = msg.model?.startsWith("claude") ? "#b8763a" : msg.model?.startsWith("gemini") ? "#4285f4" : "#10a37f";
                const isUser = msg.role === "user";
                const msgTime = msg.ts ? new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";
                if (msg.role === "synthesis") return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                    <div style={{ fontSize: 9, color: ACCENT, marginBottom: 4, fontFamily: "monospace", fontWeight: 700 }}>✨ SYNTEZA · {msgTime}</div>
                    <div style={{ width: "100%", background: "#fffdf7", border: "2px solid " + ACCENT, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(184,118,58,0.15)" }}>
                      <div style={{ padding: "10px 14px", borderBottom: "2px solid " + ACCENT + "40", display: "flex", justifyContent: "space-between", alignItems: "center", background: ACCENT + "18" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, fontFamily: "monospace" }}>✨ Synteza rozmowy</span>
                        <button onClick={() => navigator.clipboard.writeText(msg.content)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid " + ACCENT + "60", background: "#fff", color: ACCENT, cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}>Kopiuj</button>
                      </div>
                      <div style={{ padding: "14px 16px" }}>{renderMarkdown(msg.content)}</div>
                    </div>
                  </div>
                );
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                    {!isUser && <div style={{ fontSize: 9, color: modelColor, marginBottom: 3, fontFamily: "monospace", fontWeight: 700 }}>{msg.model}</div>}
                    <div style={{ maxWidth: "90%", padding: isUser ? "8px 12px" : "12px 16px", borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: isUser ? ACCENT : "#fff", color: isUser ? "#fff" : "#1a1a1a", fontSize: 12, lineHeight: 1.6, wordBreak: "break-word", border: isUser ? "none" : "1px solid #e8e0d8", boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
                      {isUser ? <div style={{ whiteSpace: "pre-wrap", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13, lineHeight: 1.6 }}>{msg.content}</div> : <div>{renderMarkdown(msg.content)}</div>}
                    </div>
                    {msg.pendingBrief && (
                      <button onClick={() => {
                        setBrief(msg.pendingBrief);
                        setPrompts({ dalleLeft: msg.pendingBrief.dalle_prompt_left || "", dalleRight: msg.pendingBrief.dalle_prompt_right || "", geminiLeft: msg.pendingBrief.gemini_prompt_left || "", geminiRight: msg.pendingBrief.gemini_prompt_right || "" });
                        setSaveMsg("✅ Brief zastosowany"); setTimeout(() => setSaveMsg(""), 3000);
                      }} style={{ marginTop: 6, background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        ✓ Użyj tego briefu →
                      </button>
                    )}
                    {!msg.pendingBrief && !isUser && msg.content.length > 150 && (
                      <button onClick={async () => {
                        setChatLoading(true);
                        try {
                          const res = await fetch("/api/ai-chat", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              model: chatModel,
                              messages: [...chatHistory.slice(0, i+1).map(m => ({ role: m.role, content: m.content })), { role: "user", content: "Na podstawie naszej rozmowy wygeneruj teraz kompletny brief w wymaganym formacie JSON. Odpowiedz WYŁĄCZNIE blokiem:
{json}
<<<BRIEF_END>>>
Bez żadnego tekstu przed ani po." }],
                              briefContext: null, systemOverride: SOCK_SYSTEM_PROMPT,
                            }),
                          });
                          const data = await res.json();
                          if (!data.error) {
                            const match = data.content.match(/<<<BRIEF_START>>>([\s\S]*?)<<<BRIEF_END>>>/);
                            if (match) {
                              const parsed = JSON.parse(match[1].trim());
                              setBrief(parsed);
                              setPrompts({ dalleLeft: parsed.dalle_prompt_left || "", dalleRight: parsed.dalle_prompt_right || "", geminiLeft: parsed.gemini_prompt_left || "", geminiRight: parsed.gemini_prompt_right || "" });
                              setSaveMsg("✅ Brief gotowy"); setTimeout(() => setSaveMsg(""), 3000);
                            }
                          }
                        } catch(e) { console.error(e); }
                        setChatLoading(false);
                      }} style={{ marginTop: 6, background: "#f5f3ef", color: ACCENT, border: "1px solid " + ACCENT + "44", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        ⬇ Generuj brief JSON
                      </button>
                    )}
                    {msgTime && <div style={{ fontSize: 9, color: "#bbb", marginTop: 3, fontFamily: "monospace" }}>{msgTime}</div>}
                  </div>
                );
              })}
              {chatLoading && <div style={{ display: "flex", alignItems: "flex-start" }}><div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 4px", background: "#f5f2ee", fontSize: 12, color: "#aaa" }}>⏳ Myślę...</div></div>}
            </div>

            <div style={{ padding: 12, borderTop: "1px solid #e0dbd4", flexShrink: 0 }}>
              {attachments.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>{attachments.map((a, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#f0ece6", border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", fontSize: 11 }}><span>{a.type?.startsWith("image/") ? "🖼️" : "📄"} {a.name}</span><button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button></div>))}</div>}
              <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "2px solid " + ACCENT, opacity: !chatHistory.length ? 0.45 : 1 }}>
                  <button onClick={generateSynthesis} disabled={synthesizing || !chatHistory.length} style={{ fontSize: 12, padding: "7px 14px", background: ACCENT, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, border: "none", whiteSpace: "nowrap" }}>{synthesizing ? "⏳ Generuję..." : "✨ Synteza"}</button>
                  <select value={synthLength} onChange={e => setSynthLength(e.target.value)} style={{ fontSize: 11, background: "#fff7f0", color: ACCENT, border: "none", borderLeft: "1px solid " + ACCENT, cursor: "pointer", fontFamily: "inherit", padding: "0 8px", fontWeight: 700, outline: "none" }}><option value="short">Krótka</option><option value="medium">Średnia</option><option value="long">Rozwinięta</option></select>
                </div>
                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#333", padding: "6px 12px", border: "1px solid #bbb", borderRadius: 8, background: "#fff", whiteSpace: "nowrap" }}>
                  <input type="file" multiple accept="image/*,.pdf,.txt,.md" onChange={async e => { const files = Array.from(e.target.files); const loaded = await Promise.all(files.map(f => new Promise(resolve => { const reader = new FileReader(); if (f.type.startsWith("image/")) { reader.onload = ev => resolve({ name: f.name, type: f.type, data: ev.target.result.split(",")[1] }); reader.readAsDataURL(f); } else { reader.onload = ev => resolve({ name: f.name, type: f.type, textContent: ev.target.result }); reader.readAsText(f); } }))); setAttachments(prev => [...prev, ...loaded]); e.target.value = ""; }} style={{ display: "none" }} />
                  📎 Plik
                </label>
                {(chatModel.startsWith("gemini") || chatModel.startsWith("gpt")) && <button onClick={() => setDeepResearch(d => !d)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid " + (deepResearch ? "#1a6fd4" : "#bbb"), background: deepResearch ? "#1a6fd4" : "#fff", color: deepResearch ? "#fff" : "#333", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>{deepResearch ? "🔬 Deep ON" : "🔬 Deep"}</button>}
                <button onClick={() => setChatExpanded(e => !e)} style={{ marginLeft: "auto", fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid #bbb", background: chatExpanded ? "#333" : "#fff", color: chatExpanded ? "#fff" : "#333", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>{chatExpanded ? "↙ Zwiń" : "↗ Rozszerz"}</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Opisz kolekcję skarpetek... (Enter = wyślij, Shift+Enter = nowa linia)" rows={2} onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"; }} style={{ flex: 1, background: "#f9f7f5", border: "1px solid #ddd", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", resize: "none", outline: "none", minHeight: 42, maxHeight: 200, overflowY: "auto", lineHeight: 1.6, color: "#1a1a1a" }} />
                <button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontSize: 16, cursor: chatLoading ? "not-allowed" : "pointer", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>↑</button>
              </div>
              <div style={{ fontSize: 10, color: "#ccc", marginTop: 6, textAlign: "center" }}>Shift+Enter = nowa linia • zapisywane automatycznie</div>
            </div>
          </>)}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
