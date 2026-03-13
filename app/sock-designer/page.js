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
- Lewa = panorama, Prawa = rozsypane ikony na tle

Gdy generujesz brief, użyj znaczników <<<BRIEF_START>>> i <<<BRIEF_END>>> z JSON wewnątrz.`;

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
  text = text.replace(/<<<BRIEF_START>>>[\s\S]*?<<<BRIEF_END>>>/g, "").trim();
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

function ColorSwatch({ color }) {
  const [copied, setCopied] = useState(false);
  return (
    <div onClick={() => { navigator.clipboard.writeText(color.hex); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#f9f7f4", border: "1px solid #ede9e3", marginBottom: 4 }}>
      <div style={{ width: 22, height: 22, borderRadius: 4, background: color.hex, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: "#1a1814" }}>{color.legs_code}</div>
        <div style={{ fontSize: 10, color: "#999" }}>{color.name} · {color.hex}</div>
        {color.usage && <div style={{ fontSize: 9, color: "#bbb", fontStyle: "italic" }}>{color.usage}</div>}
      </div>
      <div style={{ fontSize: 9, color: copied ? "#0d9e6e" : "#ddd" }}>{copied ? "✓" : "⎘"}</div>
    </div>
  );
}

function PromptEditor({ label, engine, value, onChange, onGenerate, loading, imageUrl, bgColor }) {
  const engineColor = engine === "dalle" ? "#1a1814" : "#0d9e6e";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: engineColor, marginRight: 5 }} />
          {engine === "dalle" ? "DALL-E 3" : "Nano Banana 🍌"} — {label}
        </span>
        <button onClick={onGenerate} disabled={loading || !value.trim()}
          style={{ background: loading ? "#eee" : engineColor, color: loading ? "#aaa" : "#fff", border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {loading ? "⏳" : "▶ Generuj"}
        </button>
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", minHeight: 70, padding: "8px 10px", borderRadius: 6, border: "1px solid " + engineColor + "44", fontSize: 10, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa" }} />
      {imageUrl && <div style={{ marginTop: 5, borderRadius: 6, overflow: "hidden", border: "1px solid #ede9e3" }}><img src={imageUrl} style={{ width: "100%", display: "block", maxHeight: 250, objectFit: "contain", background: bgColor || "#f0ede8" }} /></div>}
      {loading && !imageUrl && <div style={{ marginTop: 5, padding: 12, background: "#f5f3ef", borderRadius: 6, textAlign: "center", color: "#aaa", fontSize: 10 }}>generuję...</div>}
    </div>
  );
}

export default function SockDesigner() {
  // Sesje
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  // Brief
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [sockVariant, setSockVariant] = useState("different");
  const [size, setSize] = useState("large");
  // Prompty i obrazy
  const [prompts, setPrompts] = useState({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
  const [imgs, setImgs] = useState({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
  const [loadings, setLoadings] = useState({ dalleLeft: false, dalleRight: false, geminiLeft: false, geminiRight: false });
  const [activeTab, setActiveTab] = useState("brief");
  // Synteza z czatu
  const [synthSection, setSynthSection] = useState(null);
  const [synthPrompts, setSynthPrompts] = useState({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
  const [synthImgs, setSynthImgs] = useState({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
  const [synthLoadings, setSynthLoadings] = useState({ dalleLeft: false, dalleRight: false, geminiLeft: false, geminiRight: false });
  // Chat
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
    setDescription("");
    setPrompts({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
    setImgs({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
    setChatHistory([]);
    setSynthesis(null);
    setSynthSection(null);
    setCurrentSessionId(null);
    setActiveTab("brief");
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
        setActiveTab("prompts");
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

  // Generuj brief przez sock-brief (streaming)
  async function generateBrief() {
    if (!description.trim()) return;
    setBriefLoading(true);
    try {
      const res = await fetch("/api/sock-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, sockVariant, size: size === "large" ? "large" : "small", attachments: [] }),
      });
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
          if (msg.type === "result") {
            const r = msg.result;
            setBrief(r);
            setPrompts({
              dalleLeft: r.dalle_prompt_left || "",
              dalleRight: r.dalle_prompt_right || "",
              geminiLeft: r.gemini_prompt_left || "",
              geminiRight: r.gemini_prompt_right || "",
            });
            setActiveTab("prompts");
            await saveSession([], r, r.collection_name || description.slice(0, 50));
            setSaveMsg("✅ Brief zapisany"); setTimeout(() => setSaveMsg(""), 3000);
          }
          if (msg.type === "error") throw new Error(msg.error);
        }
      }
    } catch (e) { alert("Błąd: " + e.message); }
    setBriefLoading(false);
  }

  async function generateImage(key, engine, promptText, setI, setL) {
    setL(l => ({ ...l, [key]: true }));
    setI(i => ({ ...i, [key]: null }));
    try {
      if (engine === "dalle") {
        const res = await fetch("/api/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem: "sock design", consensus: promptText }) });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setI(i => ({ ...i, [key]: data.imageUrl }));
      } else {
        const res = await fetch("/api/image-gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: promptText }) });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setI(i => ({ ...i, [key]: data.imageUrl }));
      }
    } catch (e) { console.error(e); }
    setL(l => ({ ...l, [key]: false }));
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
        let buffer = "", fullText = "";
        let latestBrief = brief;
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
              setActiveTab("prompts");
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
    const prompt = `Zrób syntezę tej rozmowy o projekcie skarpetek. Wyciągnij:
## PODSUMOWANIE PROJEKTU
## KLUCZOWE DECYZJE PROJEKTOWE
## PALETA KOLORÓW LEGS
## PROMPTY DO GENEROWANIA
Dla sekcji PROMPTY podaj 4 gotowe prompty w formacie:
DALLE_LEFT: [prompt]
DALLE_RIGHT: [prompt]
GEMINI_LEFT: [prompt]
GEMINI_RIGHT: [prompt]`;
    try {
      if (chatModel.startsWith("claude")) {
        const res = await fetch("/api/sock-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...chatHistory.map(({ role, content }) => ({ role, content })), { role: "user", content: prompt }], model: chatModel }),
        });
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
        setSynthesis(data.content || "Błąd syntezy");
      }
    } catch (e) { setSynthesis("Błąd: " + e.message); }
    setSynthesizing(false);
  }

  function transferSynthesisToGenerator() {
    if (!synthesis) return;
    // Wyciągnij prompty z syntezy
    const dalleLeft = synthesis.match(/DALLE_LEFT:\s*(.+)/)?.[1]?.trim() || "";
    const dalleRight = synthesis.match(/DALLE_RIGHT:\s*(.+)/)?.[1]?.trim() || "";
    const geminiLeft = synthesis.match(/GEMINI_LEFT:\s*(.+)/)?.[1]?.trim() || "";
    const geminiRight = synthesis.match(/GEMINI_RIGHT:\s*(.+)/)?.[1]?.trim() || "";
    setSynthSection(synthesis);
    setSynthPrompts({ dalleLeft, dalleRight, geminiLeft, geminiRight });
    setSynthImgs({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
    setSynthesis(null);
  }

  const anyImageLoading = Object.values(loadings).some(Boolean);
  const anySynthLoading = Object.values(synthLoadings).some(Boolean);

  const sec = { background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, overflow: "hidden", marginBottom: 16 };
  const secHead = (accent) => ({ padding: "10px 16px", background: accent ? ACCENT : "#f9f7f5", borderBottom: "1px solid #e0dbd4", fontSize: 11, fontWeight: 700, color: accent ? "#fff" : "#555", fontFamily: "monospace" });

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

        {/* LEWA */}
        <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>

          {/* Nagłówek */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>🧦 Sock Designer</div>
              <div style={{ fontSize: 12, color: "#888" }}>Generator briefów · LEGS palette · DALL-E 3 + Nano Banana</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saveMsg && <span style={{ fontSize: 12, color: "#2d7a4f" }}>{saveMsg}</span>}
              <button onClick={newSession} style={{ background: "none", color: "#888", border: "1px solid #ddd", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Nowy</button>
            </div>
          </div>

          {/* Historia */}
          {sessions.length > 0 && (
            <div style={{ ...sec, marginBottom: 24 }}>
              <div style={secHead(false)}>HISTORIA PROJEKTÓW</div>
              <div style={{ maxHeight: 160, overflowY: "auto" }}>
                {sessions.map(s => (
                  <div key={s.id} onClick={() => loadSession(s.id)}
                    style={{ padding: "10px 16px", borderBottom: "1px solid #f0ece8", cursor: "pointer", background: s.id === currentSessionId ? ACCENT + "10" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: s.id === currentSessionId ? 700 : 400, fontSize: 13, color: s.id === currentSessionId ? ACCENT : "#333" }}>{s.title}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{new Date(s.updated_at).toLocaleDateString("pl-PL")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FORMULARZ — gdy brak briefu */}
          {!brief && (
            <div style={sec}>
              <div style={secHead(true)}>NOWY BRIEF</div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 1.2, marginBottom: 6 }}>OPIS KOLEKCJI</div>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="np. Fiat 126p Maluch, PRL, pixel-art, bloki, droga..."
                  style={{ width: "100%", minHeight: 100, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa", marginBottom: 14 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 1.2, marginBottom: 6 }}>LEWA / PRAWA</div>
                    {[["different", "Różne (L ≠ P)"], ["same", "Identyczne"]].map(([id, label]) => (
                      <button key={id} onClick={() => setSockVariant(id)}
                        style={{ display: "block", width: "100%", marginBottom: 5, padding: "8px 12px", borderRadius: 7, border: "1px solid " + (sockVariant === id ? ACCENT : "#ddd"), background: sockVariant === id ? ACCENT + "15" : "#fafafa", color: sockVariant === id ? ACCENT : "#888", fontSize: 12, fontWeight: sockVariant === id ? 700 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 1.2, marginBottom: 6 }}>ROZMIAR</div>
                    {[["large", "41-46 (168×480px)"], ["small", "36-40 (168×435px)"]].map(([id, label]) => (
                      <button key={id} onClick={() => setSize(id)}
                        style={{ display: "block", width: "100%", marginBottom: 5, padding: "8px 12px", borderRadius: 7, border: "1px solid " + (size === id ? ACCENT : "#ddd"), background: size === id ? ACCENT + "15" : "#fafafa", color: size === id ? ACCENT : "#888", fontSize: 12, fontWeight: size === id ? 700 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={generateBrief} disabled={!description.trim() || briefLoading}
                  style={{ width: "100%", background: description.trim() && !briefLoading ? ACCENT : "#ddd", color: description.trim() && !briefLoading ? "#fff" : "#aaa", border: "none", borderRadius: 10, padding: "13px", fontSize: 13, fontWeight: 800, cursor: description.trim() && !briefLoading ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                  {briefLoading ? "⏳ Generuję brief..." : "► GENERUJ BRIEF"}
                </button>
                <div style={{ marginTop: 12, padding: "10px 12px", background: "#f9f7f5", borderRadius: 8, fontSize: 11, color: "#888", lineHeight: 1.6 }}>
                  💡 Możesz też opisać kolekcję w <strong>czacie →</strong> i iterować z AI przed wygenerowaniem briefu.
                </div>
              </div>
            </div>
          )}

          {/* BRIEF — gdy wygenerowany */}
          {brief && (
            <>
              <div style={{ background: ACCENT, borderRadius: 10, padding: "16px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>KOLEKCJA</div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: 20, marginBottom: 4 }}>{brief.collection_name}</div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 1.6 }}>{brief.concept}</div>
                </div>
                <button onClick={() => { setBrief(null); setActiveTab("brief"); setDescription(""); }}
                  style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, marginLeft: 12 }}>
                  ↺ Nowy brief
                </button>
              </div>

              {/* Zakładki */}
              <div style={{ ...sec }}>
                <div style={{ display: "flex", borderBottom: "1px solid #e0dbd4" }}>
                  {[["prompts", "🎨 Prompty + obrazy"], ["cards", "📋 Karty skarpetek"], ["palette", "🎨 Paleta"]].map(([id, label]) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                      style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: activeTab === id ? "2px solid " + ACCENT : "2px solid transparent", color: activeTab === id ? ACCENT : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ padding: 16 }}>

                  {activeTab === "prompts" && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: "#888" }}>Edytuj prompty i generuj obrazy</div>
                        <button onClick={() => Promise.all([
                          generateImage("dalleLeft", "dalle", prompts.dalleLeft, setImgs, setLoadings),
                          generateImage("dalleRight", "dalle", prompts.dalleRight, setImgs, setLoadings),
                          generateImage("geminiLeft", "gemini", prompts.geminiLeft, setImgs, setLoadings),
                          generateImage("geminiRight", "gemini", prompts.geminiRight, setImgs, setLoadings),
                        ])} disabled={anyImageLoading}
                          style={{ background: anyImageLoading ? "#eee" : "#1a1814", color: anyImageLoading ? "#aaa" : "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          {anyImageLoading ? "⏳" : "▶▶ Wszystkie 4"}
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 10, color: "#555", paddingBottom: 4, borderBottom: "1px solid #ede9e3" }}>🧦 LEWA</div>
                          <PromptEditor label="lewa" engine="dalle" value={prompts.dalleLeft} onChange={v => setPrompts(p => ({ ...p, dalleLeft: v }))} onGenerate={() => generateImage("dalleLeft", "dalle", prompts.dalleLeft, setImgs, setLoadings)} loading={loadings.dalleLeft} imageUrl={imgs.dalleLeft} bgColor={brief?.left_sock?.background?.hex} />
                          <PromptEditor label="lewa" engine="gemini" value={prompts.geminiLeft} onChange={v => setPrompts(p => ({ ...p, geminiLeft: v }))} onGenerate={() => generateImage("geminiLeft", "gemini", prompts.geminiLeft, setImgs, setLoadings)} loading={loadings.geminiLeft} imageUrl={imgs.geminiLeft} bgColor={brief?.left_sock?.background?.hex} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 10, color: "#555", paddingBottom: 4, borderBottom: "1px solid #ede9e3" }}>🧦 PRAWA</div>
                          <PromptEditor label="prawa" engine="dalle" value={prompts.dalleRight} onChange={v => setPrompts(p => ({ ...p, dalleRight: v }))} onGenerate={() => generateImage("dalleRight", "dalle", prompts.dalleRight, setImgs, setLoadings)} loading={loadings.dalleRight} imageUrl={imgs.dalleRight} bgColor={brief?.right_sock?.background?.hex} />
                          <PromptEditor label="prawa" engine="gemini" value={prompts.geminiRight} onChange={v => setPrompts(p => ({ ...p, geminiRight: v }))} onGenerate={() => generateImage("geminiRight", "gemini", prompts.geminiRight, setImgs, setLoadings)} loading={loadings.geminiRight} imageUrl={imgs.geminiRight} bgColor={brief?.right_sock?.background?.hex} />
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "cards" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      {[["🧦 LEWA", brief.left_sock], ["🧦 PRAWA", brief.right_sock]].map(([title, sock]) => sock && (
                        <div key={title} style={{ background: "#f9f7f5", borderRadius: 8, padding: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
                            <span style={{ fontSize: 10, color: "#bbb", background: "#fff", borderRadius: 5, padding: "2px 7px", border: "1px solid #ede9e3" }}>{sock.layout}</span>
                          </div>
                          <p style={{ color: "#555", fontSize: 12, lineHeight: 1.6, margin: "0 0 8px" }}>{sock.description}</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                            {(sock.key_elements || []).map((el, ei) => (
                              <span key={ei} style={{ background: "#fff", border: "1px solid #ede9e3", borderRadius: 20, padding: "2px 8px", fontSize: 10, color: "#666" }}>{el}</span>
                            ))}
                          </div>
                          {sock.text_element && <div style={{ padding: "4px 8px", background: "#fff", borderRadius: 5, marginBottom: 6, fontSize: 11 }}><span style={{ color: "#999", fontSize: 9, fontWeight: 700 }}>TEKST </span><span style={{ color: ACCENT, fontWeight: 800 }}>"{sock.text_element}"</span></div>}
                          {sock.background && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: sock.background.hex + "22", borderRadius: 5 }}>
                              <div style={{ width: 12, height: 12, borderRadius: 2, background: sock.background.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                              <span style={{ fontSize: 10, fontWeight: 700 }}>LEGS {sock.background.legs_code}</span>
                              <span style={{ fontSize: 10, color: "#999", fontFamily: "monospace" }}>{sock.background.hex}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "palette" && (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 10, color: "#888" }}>KOLORY KOLEKCJI ({brief.palette?.length})</div>
                      {(brief.palette || []).map((c, ci) => <ColorSwatch key={ci} color={c} />)}
                      {brief.designer_notes && (
                        <div style={{ marginTop: 14, padding: "10px 12px", background: "#fff8f0", borderRadius: 8, border: "1px solid " + ACCENT + "33" }}>
                          <div style={{ fontSize: 9, color: ACCENT, fontWeight: 700, marginBottom: 4 }}>NOTATKI DLA GRAFIKA</div>
                          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7 }}>{brief.designer_notes}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* SEKCJA SYNTEZY Z CZATU */}
          {synthSection && (
            <div style={{ ...sec, border: "2px solid " + ACCENT }}>
              <div style={{ ...secHead(true), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>✨ GENERUJ Z SYNTEZY CZATU</span>
                <button onClick={() => setSynthSection(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", cursor: "pointer", fontSize: 16, borderRadius: 4, padding: "0 6px" }}>×</button>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7, marginBottom: 16, padding: "10px 12px", background: "#f9f7f5", borderRadius: 8, maxHeight: 150, overflowY: "auto" }}>
                  {renderMarkdown(synthSection)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#888" }}>Prompty wyciągnięte z syntezy — edytuj i generuj</div>
                  <button onClick={() => Promise.all([
                    generateImage("dalleLeft", "dalle", synthPrompts.dalleLeft, setSynthImgs, setSynthLoadings),
                    generateImage("dalleRight", "dalle", synthPrompts.dalleRight, setSynthImgs, setSynthLoadings),
                    generateImage("geminiLeft", "gemini", synthPrompts.geminiLeft, setSynthImgs, setSynthLoadings),
                    generateImage("geminiRight", "gemini", synthPrompts.geminiRight, setSynthImgs, setSynthLoadings),
                  ])} disabled={anySynthLoading}
                    style={{ background: anySynthLoading ? "#eee" : ACCENT, color: anySynthLoading ? "#aaa" : "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {anySynthLoading ? "⏳" : "▶▶ Wszystkie 4"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 10, color: "#555", paddingBottom: 4, borderBottom: "1px solid #ede9e3" }}>🧦 LEWA</div>
                    <PromptEditor label="lewa" engine="dalle" value={synthPrompts.dalleLeft} onChange={v => setSynthPrompts(p => ({ ...p, dalleLeft: v }))} onGenerate={() => generateImage("dalleLeft", "dalle", synthPrompts.dalleLeft, setSynthImgs, setSynthLoadings)} loading={synthLoadings.dalleLeft} imageUrl={synthImgs.dalleLeft} />
                    <PromptEditor label="lewa" engine="gemini" value={synthPrompts.geminiLeft} onChange={v => setSynthPrompts(p => ({ ...p, geminiLeft: v }))} onGenerate={() => generateImage("geminiLeft", "gemini", synthPrompts.geminiLeft, setSynthImgs, setSynthLoadings)} loading={synthLoadings.geminiLeft} imageUrl={synthImgs.geminiLeft} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 10, color: "#555", paddingBottom: 4, borderBottom: "1px solid #ede9e3" }}>🧦 PRAWA</div>
                    <PromptEditor label="prawa" engine="dalle" value={synthPrompts.dalleRight} onChange={v => setSynthPrompts(p => ({ ...p, dalleRight: v }))} onGenerate={() => generateImage("dalleRight", "dalle", synthPrompts.dalleRight, setSynthImgs, setSynthLoadings)} loading={synthLoadings.dalleRight} imageUrl={synthImgs.dalleRight} />
                    <PromptEditor label="prawa" engine="gemini" value={synthPrompts.geminiRight} onChange={v => setSynthPrompts(p => ({ ...p, geminiRight: v }))} onGenerate={() => generateImage("geminiRight", "gemini", synthPrompts.geminiRight, setSynthImgs, setSynthLoadings)} loading={synthLoadings.geminiRight} imageUrl={synthImgs.geminiRight} />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PRAWA — panel czatu */}
        <div style={{ width: chatExpanded ? "100vw" : chatOpen ? 380 : 48, minWidth: chatExpanded ? "100vw" : chatOpen ? 380 : 48, borderLeft: "1px solid #e0dbd4", background: "#fff", display: "flex", flexDirection: "column", height: "100vh", position: chatExpanded ? "fixed" : "sticky", top: 0, right: chatExpanded ? 0 : "auto", zIndex: chatExpanded ? 100 : "auto", transition: "width 0.2s, min-width 0.2s", overflow: "hidden" }}>

          <button onClick={() => setChatOpen(o => !o)}
            style={{ position: "absolute", top: 16, left: chatOpen ? 12 : 8, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#aaa", zIndex: 10, padding: 4 }}>
            {chatOpen ? "→" : "←"}
          </button>

          {chatOpen && (
            <>
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

              {(synthesis || synthesizing) && (
                <div style={{ margin: "12px 12px 0", background: "#fffbf5", border: "1px solid " + ACCENT + "40", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                  <div style={{ padding: "8px 12px", background: ACCENT + "15", borderBottom: "1px solid " + ACCENT + "30", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, fontFamily: "monospace" }}>✨ Synteza rozmowy</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {synthesis && (
                        <>
                          <button onClick={() => navigator.clipboard.writeText(synthesis)}
                            style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "1px solid " + ACCENT + "40", background: "none", color: ACCENT, cursor: "pointer", fontFamily: "monospace" }}>Kopiuj</button>
                          <button onClick={transferSynthesisToGenerator}
                            style={{ fontSize: 10, padding: "2px 10px", borderRadius: 4, border: "1px solid " + ACCENT, background: ACCENT, color: "#fff", cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}>
                            ▶ Generuj obrazy
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

              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
                ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
                {chatHistory.length === 0 && (
                  <div style={{ textAlign: "center", color: "#ccc", fontSize: 12, marginTop: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                    <div>Opisz kolekcję lub<br />iteruj nad istniejącym briefem.</div>
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
                      {msg.hasBrief && <div style={{ fontSize: 9, color: "#0d9e6e", marginTop: 3 }}>✓ Brief zaktualizowany w panelu</div>}
                      {msgTime && <div style={{ fontSize: 9, color: "#bbb", marginTop: 3, fontFamily: "monospace" }}>{msgTime}</div>}
                    </div>
                  );
                })}
                {chatLoading && <div style={{ display: "flex" }}><div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 4px", background: "#f5f2ee", fontSize: 12, color: "#aaa" }}>⏳ Myślę...</div></div>}
                <div ref={chatEndRef} />
              </div>

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
                    placeholder="Opisz kolekcję lub iteruj brief... (Enter = wyślij)"
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
