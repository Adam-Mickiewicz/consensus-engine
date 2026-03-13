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

const MODELS = {
  claude: [
    { id: "claude-sonnet-4-6", short: "Sonnet 4.6", tip: "Nowy domyślny. Prawie poziom Opus, szybszy.", price: "$3/1M" },
    { id: "claude-opus-4-6", short: "Opus 4.6", tip: "Najlepszy Claude. 1M kontekst, top kodowanie.", price: "$15/1M" },
    { id: "claude-haiku-4-5-20251001", short: "Haiku 4.5", tip: "Błyskawiczny do prostych pytań.", price: "$0.25/1M" },
  ],
  openai: [
    { id: "gpt-5.4", short: "GPT-5.4", tip: "Flagowy OpenAI. Kodowanie + agenty.", price: "$15/1M" },
    { id: "gpt-5.2", short: "GPT-5.2", tip: "Poprzedni flagship, szybszy i tańszy.", price: "$3/1M" },
    { id: "gpt-5-mini", short: "GPT-5 mini", tip: "Tani wariant z rozumowaniem.", price: "$1.1/1M" },
  ],
  gemini: [
    { id: "gemini-3-pro-preview", short: "3 Pro", tip: "Najnowszy Google. Multimodal + agenty.", price: "$2/1M" },
    { id: "gemini-3-flash-preview", short: "3 Flash", tip: "Szybki Gemini 3 z myśleniem.", price: "$0.50/1M" },
    { id: "gemini-2.5-pro", short: "2.5 Pro", tip: "Stabilny, świetny do kodowania.", price: "$1.25/1M" },
    { id: "gemini-2.5-flash", short: "2.5 Flash", tip: "Hybrid reasoning, 1M kontekst.", price: "$0.30/1M" },
    { id: "gemini-2.0-flash", short: "2.0 Flash", tip: "Sprawdzony i tani.", price: "$0.10/1M" },
  ],
};

const PROVIDERS = [
  { id: "claude", label: "Claude", color: "#b8763a" },
  { id: "openai", label: "OpenAI", color: "#10a37f" },
  { id: "gemini", label: "Gemini", color: "#4285f4" },
];

const SOCK_SYSTEM_PROMPT = `Jesteś doświadczonym projektantem skarpetek dla Nadwyraz.com — polskiej marki tworzącej narracyjne, płaskie wzory skarpetek z przędzą LEGS.

Prowadzisz rozmowę z projektantem. Pomagasz iterować brief kolekcji. Odpowiadaj po polsku, konkretnie.

SPECYFIKACJA TECHNICZNA:
- Wymiary: 168px × 480px (41-46) lub 168px × 435px (36-40)
- Maks. 6 kolorów LEGS
- Styl: 100% płaska ilustracja 2D, zero gradientów
- Lewa = panorama narracyjna, Prawa = rozsypane ikony na jednolitym tle

Gdy generujesz brief, użyj znaczników <<<BRIEF_START>>> i <<<BRIEF_END>>> z JSON wewnątrz.
Format JSON:
{
  "collection_name": "...",
  "concept": "...",
  "left_sock": { "description": "...", "layout": "panoramic", "key_elements": [], "text_element": null, "background": { "legs_code": "...", "hex": "#...", "name": "..." } },
  "right_sock": { "description": "...", "layout": "scattered", "key_elements": [], "text_element": null, "background": { "legs_code": "...", "hex": "#...", "name": "..." } },
  "palette": [{ "legs_code": "...", "hex": "#...", "name": "...", "usage": "..." }],
  "dalle_prompt_left": "VERTICAL PORTRAIT flat 2D textile pattern. Tall narrow 1:3 ratio. Pure 2D ONLY. NO 3D. NO gradients. Solid fills. Edge to edge. [OPIS]. Background: #HEX. Max 6 colors.",
  "dalle_prompt_right": "VERTICAL PORTRAIT flat 2D textile pattern. Tall narrow 1:3 ratio. Pure 2D ONLY. NO 3D. NO gradients. Solid fills. Edge to edge. [OPIS]. Background: #HEX. Max 6 colors.",
  "gemini_prompt_left": "Flat 2D textile sock pattern. 9:16. Edge to edge. NO gradients. NO 3D. Pixel-art. [OPIS]. Background: #HEX. Max 6 colors.",
  "gemini_prompt_right": "Flat 2D textile sock pattern. 9:16. Edge to edge. NO gradients. NO 3D. Pixel-art. [OPIS]. Background: #HEX. Max 6 colors.",
  "designer_notes": "..."
}`;

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": opts.prefer || "return=representation",
      ...(opts.headers || {}),
    },
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
    if (line.startsWith("### ")) {
      elements.push(<div key={i} style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 4, fontFamily: FONT }}>{line.slice(4)}</div>);
    } else if (line.startsWith("## ")) {
      elements.push(<div key={i} style={{ fontSize: 14, fontWeight: 700, color: ACCENT, marginTop: 18, marginBottom: 6, paddingBottom: 5, borderBottom: "1px solid #f0e8df", fontFamily: FONT }}>{line.slice(3)}</div>);
    } else if (line.startsWith("# ")) {
      elements.push(<div key={i} style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginTop: 18, marginBottom: 8, fontFamily: FONT }}>{line.slice(2)}</div>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const txt = line.replace(/^[-*] /, "");
      elements.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4, fontFamily: FONT, fontSize: 13, lineHeight: 1.6 }}><span style={{ color: ACCENT, flexShrink: 0 }}>•</span><span>{parseBold(txt)}</span></div>);
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)[1];
      const txt = line.replace(/^\d+\. /, "");
      elements.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, fontFamily: FONT, fontSize: 13, lineHeight: 1.6 }}><span style={{ color: ACCENT, fontWeight: 600, minWidth: 18 }}>{num}.</span><span>{parseBold(txt)}</span></div>);
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #e8e0d8", margin: "12px 0" }} />);
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(<div key={i} style={{ marginBottom: 3, lineHeight: 1.7, fontFamily: FONT, fontSize: 13, color: "#1a1a1a" }}>{parseBold(line)}</div>);
    }
    i++;
  }
  return elements;
}

function parseBold(text) {
  if (!text.includes("**") && !text.includes("`")) return text;
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={idx}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={idx} style={{ background: "#f0ece6", borderRadius: 3, padding: "1px 5px", fontSize: "0.9em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function ImageSlot({ title, engine, prompt, onPromptChange, onGenerate, loading, imageUrl, bgColor }) {
  const engineColor = engine === "dalle" ? "#1a1814" : "#0d9e6e";
  const engineLabel = engine === "dalle" ? "DALL-E 3" : "Nano Banana 🍌";
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Nagłówek slotu */}
      <div style={{ padding: "10px 14px", background: "#f9f7f5", borderBottom: "1px solid #e0dbd4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#1a1a1a" }}>{title}</div>
          <div style={{ fontSize: 10, color: engineColor, fontWeight: 700, marginTop: 1 }}>
            <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: engineColor, marginRight: 4, verticalAlign: "middle" }} />
            {engineLabel}
          </div>
        </div>
        <button onClick={onGenerate} disabled={loading || !prompt.trim()}
          style={{ background: loading ? "#eee" : engineColor, color: loading ? "#aaa" : "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {loading ? "⏳" : "▶ Generuj"}
        </button>
      </div>

      {/* Obraz */}
      <div style={{ aspectRatio: "1/1.8", background: bgColor ? bgColor + "33" : "#f5f3ef", position: "relative", overflow: "hidden" }}>
        {imageUrl
          ? <img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#ccc" }}>
              {loading
                ? <><div style={{ fontSize: 24 }}>⏳</div><div style={{ fontSize: 11 }}>generuję...</div></>
                : <><div style={{ fontSize: 24 }}>🖼️</div><div style={{ fontSize: 11 }}>brak obrazu</div></>
              }
            </div>
        }
      </div>

      {/* Prompt */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid #e0dbd4" }}>
        <textarea value={prompt} onChange={e => onPromptChange(e.target.value)}
          placeholder="Prompt do generowania..."
          style={{ width: "100%", minHeight: 60, padding: "7px 9px", borderRadius: 6, border: "1px solid " + engineColor + "33", fontSize: 10, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa", color: "#444" }} />
      </div>
    </div>
  );
}

export default function SockDesigner() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [prompts, setPrompts] = useState({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
  const [imgs, setImgs] = useState({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
  const [loadings, setLoadings] = useState({ dalleLeft: false, dalleRight: false, geminiLeft: false, geminiRight: false });
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatModel, setChatModel] = useState("claude-sonnet-4-6");
  const [synthesis, setSynthesis] = useState(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const activeProvider = chatModel.startsWith("claude") ? "claude" : chatModel.startsWith("gemini") ? "gemini" : "openai";
  const activeColor = PROVIDERS.find(p => p.id === activeProvider)?.color || ACCENT;
  const activeModelInfo = Object.values(MODELS).flat().find(m => m.id === chatModel);

  const loadSessions = useCallback(async () => {
    try {
      const data = await sbFetch("/sock_chats?select=id,title,updated_at&order=updated_at.desc&limit=30");
      setSessions(data || []);
    } catch (e) { console.error(e); }
  }, []);

  async function newSession() {
    setBrief(null);
    setPrompts({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
    setImgs({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
    setChatHistory([]);
    setSynthesis(null);
    setCurrentSessionId(null);
    setBriefOpen(false);
  }

  async function loadSession(id) {
    try {
      const data = await sbFetch("/sock_chats?id=eq." + id + "&select=*");
      const s = data[0];
      setCurrentSessionId(id);
      setChatHistory(s.messages || []);
      if (s.last_brief) {
        setBrief(s.last_brief);
        setPrompts({
          dalleLeft: s.last_brief.dalle_prompt_left || "",
          dalleRight: s.last_brief.dalle_prompt_right || "",
          geminiLeft: s.last_brief.gemini_prompt_left || "",
          geminiRight: s.last_brief.gemini_prompt_right || "",
        });
      }
    } catch (e) { console.error(e); }
  }

  async function saveSession(msgs, lastBrief, title) {
    try {
      if (!currentSessionId) {
        const data = await sbFetch("/sock_chats", {
          method: "POST",
          body: JSON.stringify({ title: title || "Projekt", messages: msgs, last_brief: lastBrief || null }),
        });
        const s = Array.isArray(data) ? data[0] : data;
        setCurrentSessionId(s.id);
        setSessions(prev => [s, ...prev.filter(x => x.id !== s.id)]);
      } else {
        await sbFetch("/sock_chats?id=eq." + currentSessionId, {
          method: "PATCH",
          body: JSON.stringify({ messages: msgs, last_brief: lastBrief || null, title: title || "Projekt", updated_at: new Date().toISOString() }),
          prefer: "return=minimal",
        });
        loadSessions();
      }
    } catch (e) { console.error(e); }
  }

  async function generateImage(key, engine, promptText) {
    setLoadings(l => ({ ...l, [key]: true }));
    setImgs(i => ({ ...i, [key]: null }));
    try {
      if (engine === "dalle") {
        const res = await fetch("/api/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem: "sock design", consensus: promptText }) });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setImgs(i => ({ ...i, [key]: data.imageUrl }));
      } else {
        const res = await fetch("/api/image-gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: promptText }) });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setImgs(i => ({ ...i, [key]: data.imageUrl }));
      }
    } catch (e) { console.error(e); }
    setLoadings(l => ({ ...l, [key]: false }));
  }

  function generateAll() {
    generateImage("dalleLeft", "dalle", prompts.dalleLeft);
    generateImage("dalleRight", "dalle", prompts.dalleRight);
    generateImage("geminiLeft", "gemini", prompts.geminiLeft);
    generateImage("geminiRight", "gemini", prompts.geminiRight);
  }

  async function sendMessage() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg = { role: "user", content: text, model: chatModel, ts: Date.now() };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput("");
    setChatLoading(true);
    try {
      if (chatModel.startsWith("claude")) {
        const res = await fetch("/api/sock-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newHistory.map(({ role, content }) => ({ role, content })), model: chatModel }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "", fullText = "", latestBrief = brief;
        const streamingMsg = { role: "assistant", content: "", model: chatModel, ts: Date.now() };
        setChatHistory(prev => [...prev, streamingMsg]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n"); buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const msg = JSON.parse(line.slice(6));
            if (msg.type === "delta") {
              fullText += msg.text;
              const display = fullText.replace(/<<<BRIEF_START>>>[\s\S]*?<<<BRIEF_END>>>/g, "").trim();
              setChatHistory(prev => { const u = [...prev]; u[u.length - 1] = { ...streamingMsg, content: display }; return u; });
            }
            if (msg.type === "brief") {
              latestBrief = msg.brief;
              setBrief(msg.brief);
              setPrompts({ dalleLeft: msg.brief.dalle_prompt_left || "", dalleRight: msg.brief.dalle_prompt_right || "", geminiLeft: msg.brief.gemini_prompt_left || "", geminiRight: msg.brief.gemini_prompt_right || "" });
              setBriefOpen(false);
              setSaveMsg("✅ Brief gotowy"); setTimeout(() => setSaveMsg(""), 3000);
            }
          }
        }
        const display = fullText.replace(/<<<BRIEF_START>>>[\s\S]*?<<<BRIEF_END>>>/g, "").trim();
        const finalMsg = { role: "assistant", content: display, model: chatModel, hasBrief: latestBrief !== brief, ts: Date.now() };
        const finalHistory = [...newHistory, finalMsg];
        setChatHistory(finalHistory);
        await saveSession(finalHistory.map(({ role, content }) => ({ role, content })), latestBrief, latestBrief?.collection_name || text.slice(0, 50));
      } else {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: chatModel, messages: [{ role: "system", content: SOCK_SYSTEM_PROMPT }, ...newHistory.map(({ role, content }) => ({ role, content }))], briefContext: null }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const finalMsg = { role: "assistant", content: data.content, model: chatModel, ts: Date.now() };
        const finalHistory = [...newHistory, finalMsg];
        setChatHistory(finalHistory);
        await saveSession(finalHistory.map(({ role, content }) => ({ role, content })), brief, brief?.collection_name || text.slice(0, 50));
      }
    } catch (e) {
      setChatHistory(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "Błąd: " + e.message, model: chatModel, ts: Date.now() }; return u; });
    }
    setChatLoading(false);
  }

  async function generateSynthesis() {
    if (!chatHistory.length) return;
    setSynthesizing(true);
    setSynthesis(null);
    const prompt = `Zrób syntezę tej rozmowy. Wyciągnij kluczowe decyzje projektowe i zapisz gotowe prompty w formacie:

## PODSUMOWANIE
[2-3 zdania]

## KLUCZOWE DECYZJE
[lista]

## PROMPTY
DALLE_LEFT: [gotowy prompt]
DALLE_RIGHT: [gotowy prompt]
GEMINI_LEFT: [gotowy prompt]
GEMINI_RIGHT: [gotowy prompt]`;
    try {
      if (chatModel.startsWith("claude")) {
        const res = await fetch("/api/sock-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...chatHistory.map(({ role, content }) => ({ role, content })), { role: "user", content: prompt }], model: chatModel }) });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "", fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n"); buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const msg = JSON.parse(line.slice(6));
            if (msg.type === "delta") fullText += msg.text;
          }
        }
        setSynthesis(fullText.replace(/<<<BRIEF_START>>>[\s\S]*?<<<BRIEF_END>>>/g, "").trim());
      } else {
        const res = await fetch("/api/ai-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: chatModel, messages: [...chatHistory.map(({ role, content }) => ({ role, content })), { role: "user", content: prompt }], briefContext: null }) });
        const data = await res.json();
        setSynthesis(data.content || "Błąd");
      }
    } catch (e) { setSynthesis("Błąd: " + e.message); }
    setSynthesizing(false);
  }

  function transferSynthesisToPrompts() {
    if (!synthesis) return;
    const dL = synthesis.match(/DALLE_LEFT:\s*(.+)/)?.[1]?.trim() || "";
    const dR = synthesis.match(/DALLE_RIGHT:\s*(.+)/)?.[1]?.trim() || "";
    const gL = synthesis.match(/GEMINI_LEFT:\s*(.+)/)?.[1]?.trim() || "";
    const gR = synthesis.match(/GEMINI_RIGHT:\s*(.+)/)?.[1]?.trim() || "";
    if (dL || dR || gL || gR) {
      setPrompts({ dalleLeft: dL, dalleRight: dR, geminiLeft: gL, geminiRight: gR });
      setSynthesis(null);
      setSaveMsg("✅ Prompty zaktualizowane"); setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  const anyLoading = Object.values(loadings).some(Boolean);

  const SLOTS = [
    { key: "dalleLeft", title: "🧦 Lewa — DALL-E 3", engine: "dalle", bgColor: brief?.left_sock?.background?.hex },
    { key: "dalleRight", title: "🧦 Prawa — DALL-E 3", engine: "dalle", bgColor: brief?.right_sock?.background?.hex },
    { key: "geminiLeft", title: "🧦 Lewa — Nano Banana 🍌", engine: "gemini", bgColor: brief?.left_sock?.background?.hex },
    { key: "geminiRight", title: "🧦 Prawa — Nano Banana 🍌", engine: "gemini", bgColor: brief?.right_sock?.background?.hex },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ee", fontFamily: "'IBM Plex Mono', monospace", display: "flex" }}>

      {/* SIDEBAR */}
      <div style={{ width: 220, minWidth: 220, background: "#0f0f0f", borderRight: "1px solid #1a1a1a", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 8, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: ACCENT, fontWeight: 800, fontSize: 13, letterSpacing: 2 }}>CONSENSUS</div>
          <div style={{ color: "#444", fontSize: 10, letterSpacing: 1 }}>ENGINE v1.0</div>
        </div>
        <div style={{ color: "#444", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>NAWIGACJA</div>
        {NAV.map(item => (
          <a key={item.href} href={item.href} style={{ display: "block", padding: "9px 12px", borderRadius: 8, fontSize: 11, fontWeight: item.active ? 700 : 400, background: item.active ? ACCENT + "20" : "none", border: item.active ? "1px solid " + ACCENT + "40" : "1px solid transparent", color: item.active ? ACCENT : "#666", textDecoration: "none" }}>{item.label}</a>
        ))}
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", height: "100vh", overflow: "hidden" }}>

        {/* LEWA — studio */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

          {/* Nagłówek */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>🧦 Sock Designer</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Opisz kolekcję w czacie → brief wypełni prompty → generuj obrazy</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saveMsg && <span style={{ fontSize: 11, color: "#2d7a4f" }}>{saveMsg}</span>}
              <button onClick={newSession} style={{ background: "none", color: "#888", border: "1px solid #ddd", borderRadius: 7, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>+ Nowy</button>
            </div>
          </div>

          {/* Pasek kolekcji — gdy brief gotowy */}
          {brief && (
            <div style={{ background: ACCENT, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 700, letterSpacing: 1.5 }}>KOLEKCJA</div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>{brief.collection_name}</div>
                </div>
                {/* Paleta */}
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {(brief.palette || []).slice(0, 6).map((c, i) => (
                    <div key={i} title={c.legs_code + " " + c.hex}
                      style={{ width: 20, height: 20, borderRadius: 4, background: c.hex, border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer" }}
                      onClick={() => navigator.clipboard.writeText(c.hex)} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={generateAll} disabled={anyLoading}
                  style={{ background: anyLoading ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 7, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {anyLoading ? "⏳ Generuję..." : "▶▶ Generuj wszystkie"}
                </button>
                <button onClick={() => setBriefOpen(o => !o)}
                  style={{ background: "none", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  {briefOpen ? "▲ Zwiń brief" : "▼ Rozwiń brief"}
                </button>
              </div>
            </div>
          )}

          {/* Accordion — brief */}
          {brief && briefOpen && (
            <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
                {[["🧦 LEWA — " + (brief.left_sock?.layout || ""), brief.left_sock], ["🧦 PRAWA — " + (brief.right_sock?.layout || ""), brief.right_sock]].map(([title, sock]) => sock && (
                  <div key={title} style={{ background: "#f9f7f5", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6, color: "#333" }}>{title}</div>
                    <p style={{ color: "#555", fontSize: 11, lineHeight: 1.6, margin: "0 0 8px" }}>{sock.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      {(sock.key_elements || []).map((el, ei) => (
                        <span key={ei} style={{ background: "#fff", border: "1px solid #ede9e3", borderRadius: 20, padding: "1px 7px", fontSize: 10, color: "#666" }}>{el}</span>
                      ))}
                    </div>
                    {sock.text_element && <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700 }}>"{sock.text_element}"</div>}
                    {sock.background && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: sock.background.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                        <span style={{ fontSize: 10, color: "#888" }}>LEGS {sock.background.legs_code} {sock.background.hex}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {brief.designer_notes && (
                <div style={{ padding: "8px 12px", background: "#fff8f0", borderRadius: 7, border: "1px solid " + ACCENT + "33", fontSize: 11, color: "#555", lineHeight: 1.6 }}>
                  <span style={{ color: ACCENT, fontWeight: 700, fontSize: 9 }}>NOTATKI </span>{brief.designer_notes}
                </div>
              )}
            </div>
          )}

          {/* Historia */}
          {!brief && sessions.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "9px 14px", background: "#f9f7f5", borderBottom: "1px solid #e0dbd4", fontSize: 10, fontWeight: 700, color: "#888", fontFamily: "monospace" }}>HISTORIA PROJEKTÓW</div>
              <div style={{ maxHeight: 150, overflowY: "auto" }}>
                {sessions.map(s => (
                  <div key={s.id} onClick={() => loadSession(s.id)}
                    style={{ padding: "9px 14px", borderBottom: "1px solid #f0ece8", cursor: "pointer", background: s.id === currentSessionId ? ACCENT + "10" : "transparent", display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: s.id === currentSessionId ? 700 : 400, fontSize: 12, color: s.id === currentSessionId ? ACCENT : "#333" }}>{s.title}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{new Date(s.updated_at).toLocaleDateString("pl-PL")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder gdy brak briefu */}
          {!brief && (
            <div style={{ background: "#fff", border: "2px dashed #e0dbd4", borderRadius: 12, padding: 32, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧦</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#888", marginBottom: 6 }}>Opisz kolekcję w czacie →</div>
              <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.7 }}>
                AI wygeneruje brief i automatycznie<br />wypełni prompty w galerii poniżej
              </div>
            </div>
          )}

          {/* GALERIA 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {SLOTS.map(slot => (
              <ImageSlot
                key={slot.key}
                title={slot.title}
                engine={slot.engine}
                prompt={prompts[slot.key]}
                onPromptChange={v => setPrompts(p => ({ ...p, [slot.key]: v }))}
                onGenerate={() => generateImage(slot.key, slot.engine, prompts[slot.key])}
                loading={loadings[slot.key]}
                imageUrl={imgs[slot.key]}
                bgColor={slot.bgColor}
              />
            ))}
          </div>

        </div>

        {/* PRAWA — panel czatu */}
        <div style={{ width: chatExpanded ? "100vw" : chatOpen ? 380 : 48, minWidth: chatExpanded ? "100vw" : chatOpen ? 380 : 48, borderLeft: "1px solid #e0dbd4", background: "#fff", display: "flex", flexDirection: "column", height: "100vh", position: chatExpanded ? "fixed" : "sticky", top: 0, right: chatExpanded ? 0 : "auto", zIndex: chatExpanded ? 100 : "auto", transition: "width 0.2s, min-width 0.2s", overflow: "hidden" }}>

          <button onClick={() => setChatOpen(o => !o)}
            style={{ position: "absolute", top: 16, left: chatOpen ? 12 : 8, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#aaa", zIndex: 10, padding: 4 }}>
            {chatOpen ? "→" : "←"}
          </button>

          {chatOpen && (
            <>
              {/* Header z wyborem modelu */}
              <div style={{ padding: "12px 16px 12px 40px", borderBottom: "1px solid #e0dbd4", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", fontFamily: "monospace" }}>🤖 Projektant AI</div>
                  <button onClick={() => { if (confirm("Wyczyścić historię czatu?")) setChatHistory([]); }}
                    style={{ padding: "2px 8px", borderRadius: 20, border: "1px solid #eee", background: "none", color: "#ccc", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>Wyczyść</button>
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setChatModel(MODELS[p.id][0].id)}
                      style={{ flex: 1, padding: "4px 6px", borderRadius: 6, border: "1px solid " + (activeProvider === p.id ? p.color : "#ddd"), background: activeProvider === p.id ? p.color + "15" : "#f9f9f9", color: activeProvider === p.id ? p.color : "#aaa", fontSize: 10, fontWeight: activeProvider === p.id ? 700 : 400, cursor: "pointer", fontFamily: "monospace" }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {MODELS[activeProvider].map(m => (
                    <button key={m.id} onClick={() => setChatModel(m.id)} title={m.tip + " " + m.price}
                      style={{ flex: 1, padding: "4px 4px", borderRadius: 6, border: "1px solid " + (chatModel === m.id ? activeColor : "#ddd"), background: chatModel === m.id ? activeColor + "15" : "#fafafa", color: chatModel === m.id ? activeColor : "#888", fontSize: 10, fontWeight: chatModel === m.id ? 700 : 400, cursor: "pointer", fontFamily: "monospace" }}>
                      {m.short}
                    </button>
                  ))}
                </div>
                {activeModelInfo && (
                  <div style={{ fontSize: 10, color: "#888", background: "#f9f7f5", borderRadius: 4, padding: "3px 8px", lineHeight: 1.4 }}>
                    ℹ️ {activeModelInfo.tip} <span style={{ color: activeColor, fontWeight: 700 }}>{activeModelInfo.price} tokenów</span>
                  </div>
                )}
              </div>

              {/* Synteza */}
              {(synthesis || synthesizing) && (
                <div style={{ margin: "12px 12px 0", background: "#fffbf5", border: "1px solid " + ACCENT + "40", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                  <div style={{ padding: "8px 12px", background: ACCENT + "15", borderBottom: "1px solid " + ACCENT + "30", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, fontFamily: "monospace" }}>✨ Synteza rozmowy</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {synthesis && (
                        <>
                          <button onClick={() => navigator.clipboard.writeText(synthesis)}
                            style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "1px solid " + ACCENT + "40", background: "none", color: ACCENT, cursor: "pointer", fontFamily: "monospace" }}>Kopiuj</button>
                          <button onClick={transferSynthesisToPrompts}
                            style={{ fontSize: 10, padding: "2px 10px", borderRadius: 4, border: "1px solid " + ACCENT, background: ACCENT, color: "#fff", cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}>
                            ▶ Wgraj prompty
                          </button>
                        </>
                      )}
                      <button onClick={() => setSynthesis(null)} style={{ fontSize: 14, background: "none", border: "none", color: "#ccc", cursor: "pointer" }}>×</button>
                    </div>
                  </div>
                  <div style={{ padding: 12, maxHeight: 260, overflowY: "auto", fontSize: 12, color: "#333", lineHeight: 1.7 }}>
                    {synthesizing && <div style={{ color: "#aaa" }}>⏳ Generuję syntezę...</div>}
                    {synthesis && renderMarkdown(synthesis)}
                  </div>
                </div>
              )}

              {/* Wiadomości */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
                ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
                {chatHistory.length === 0 && (
                  <div style={{ textAlign: "center", color: "#ccc", fontSize: 12, marginTop: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                    <div>Opisz kolekcję skarpetek.<br />AI wygeneruje brief i wypełni<br />prompty w galerii.</div>
                  </div>
                )}
                {chatHistory.map((msg, i) => {
                  const isUser = msg.role === "user";
                  const modelColor = msg.model?.startsWith("claude") ? "#b8763a" : msg.model?.startsWith("gemini") ? "#4285f4" : "#10a37f";
                  const msgTime = msg.ts ? new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                      {!isUser && <div style={{ fontSize: 9, color: modelColor, marginBottom: 3, fontFamily: "monospace", fontWeight: 700 }}>{msg.model || "AI"}</div>}
                      <div style={{ maxWidth: "90%", padding: isUser ? "8px 12px" : "12px 16px", borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: isUser ? ACCENT : "#fff", color: isUser ? "#fff" : "#1a1a1a", fontSize: 13, lineHeight: 1.6, wordBreak: "break-word", border: isUser ? "none" : "1px solid #e8e0d8", boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
                        {isUser ? <div style={{ whiteSpace: "pre-wrap", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{msg.content}</div> : <div>{renderMarkdown(msg.content)}</div>}
                      </div>
                      {msg.hasBrief && <div style={{ fontSize: 9, color: "#0d9e6e", marginTop: 3 }}>✓ Prompty zaktualizowane w galerii</div>}
                      {msgTime && <div style={{ fontSize: 9, color: "#bbb", marginTop: 3, fontFamily: "monospace" }}>{msgTime}</div>}
                    </div>
                  );
                })}
                {chatLoading && <div style={{ display: "flex" }}><div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 4px", background: "#f5f2ee", fontSize: 12, color: "#aaa" }}>⏳ Myślę...</div></div>}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: 12, borderTop: "1px solid #e0dbd4", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <button onClick={generateSynthesis} disabled={synthesizing || !chatHistory.length}
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid " + ACCENT, background: ACCENT + "15", color: ACCENT, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, opacity: !chatHistory.length ? 0.4 : 1 }}>
                    {synthesizing ? "⏳" : "✨ Synteza"}
                  </button>
                  <button onClick={() => setChatExpanded(e => !e)}
                    style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #e0dbd4", background: "#fafafa", color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
                    {chatExpanded ? "⟩ Zwiń" : "⟨ Rozszerz"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Opisz kolekcję lub iteruj brief..."
                    rows={2}
                    onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"; }}
                    style={{ flex: 1, background: "#f9f7f5", border: "1px solid #ddd", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", resize: "none", outline: "none", minHeight: 42, maxHeight: 200, lineHeight: 1.6, color: "#1a1a1a" }} />
                  <button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()}
                    style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontSize: 16, cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>↑</button>
                </div>
                <div style={{ fontSize: 10, color: "#ccc", marginTop: 6, textAlign: "center" }}>Shift+Enter = nowa linia · zapisywane automatycznie</div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
