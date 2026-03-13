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
    { id: "claude-sonnet-4-6", short: "Sonnet 4.6", tip: "Domyślny. Szybki i mocny.", price: "$3/1M" },
    { id: "claude-opus-4-6", short: "Opus 4.6", tip: "Najlepszy Claude.", price: "$15/1M" },
    { id: "claude-haiku-4-5-20251001", short: "Haiku 4.5", tip: "Błyskawiczny.", price: "$0.25/1M" },
  ],
  openai: [
    { id: "gpt-5.4", short: "GPT-5.4", tip: "Flagowy OpenAI.", price: "$15/1M" },
    { id: "gpt-5.3", short: "GPT-5.3", tip: "Szybki i mocny.", price: "$5/1M" },
    { id: "gpt-5-mini", short: "GPT-5 mini", tip: "Tani z rozumowaniem.", price: "$1.1/1M" },
  ],
  gemini: [
    { id: "gemini-2.5-pro", short: "2.5 Pro", tip: "Stabilny, świetny.", price: "$1.25/1M" },
    { id: "gemini-2.5-flash", short: "2.5 Flash", tip: "Hybrid reasoning.", price: "$0.30/1M" },
    { id: "gemini-2.0-flash", short: "2.0 Flash", tip: "Sprawdzony i tani.", price: "$0.10/1M" },
  ],
};

const PROVIDERS = [
  { id: "claude", label: "Claude", color: "#b8763a" },
  { id: "openai", label: "OpenAI", color: "#10a37f" },
  { id: "gemini", label: "Gemini", color: "#4285f4" },
];

const SOCK_SYSTEM_PROMPT = `Jesteś doświadczonym projektantem skarpetek dla Nadwyraz.com — polskiej marki tworzącej narracyjne, płaskie wzory skarpetek z przędzą LEGS.

Prowadzisz rozmowę z projektantem. Pomagasz wypracować brief kolekcji krok po kroku. Odpowiadaj po polsku.

SPECYFIKACJA TECHNICZNA:
- Wymiary: 168px × 480px (41-46) lub 168px × 435px (36-40)
- Maks. 6 kolorów LEGS
- Styl: 100% płaska ilustracja 2D, zero gradientów
- Lewa ≠ Prawa — zawsze dwie różne kompozycje

DNA NADWYRAZ:
- Lewa: szeroka scena panoramiczna
- Prawa: rozproszone ikony na jednolitym tle
- Mocne storytelling, typografia wpleciona w wzór

Kiedy masz wystarczająco informacji, wygeneruj pełny brief w formacie:

<<<BRIEF_START>>>
{
  "collection_name": "nazwa",
  "concept": "opis",
  "left_sock": { "description": "opis", "layout": "panoramic", "key_elements": [], "text_element": null, "background": { "legs_code": "KOD", "hex": "#HEX", "name": "nazwa" } },
  "right_sock": { "description": "opis", "layout": "scattered", "key_elements": [], "text_element": null, "background": { "legs_code": "KOD", "hex": "#HEX", "name": "nazwa" } },
  "palette": [{ "legs_code": "KOD", "hex": "#HEX", "name": "nazwa", "usage": "gdzie" }],
  "dalle_prompt_left": "VERTICAL PORTRAIT flat 2D textile pattern. Tall narrow 1:3 ratio. Pure 2D ONLY. NO 3D. NO gradients. Solid fills. Edge to edge. [OPIS]. Background: #HEX. Max 6 colors.",
  "dalle_prompt_right": "VERTICAL PORTRAIT flat 2D textile pattern. Tall narrow 1:3 ratio. Pure 2D ONLY. NO 3D. NO gradients. Solid fills. Edge to edge. [OPIS]. Background: #HEX. Max 6 colors.",
  "gemini_prompt_left": "Flat 2D textile sock pattern. 9:16. Edge to edge. NO gradients. NO 3D. Pixel-art. [OPIS]. Background: #HEX. Max 6 colors.",
  "gemini_prompt_right": "Flat 2D textile sock pattern. 9:16. Edge to edge. NO gradients. NO 3D. Pixel-art. [OPIS]. Background: #HEX. Max 6 colors.",
  "designer_notes": "uwagi"
}
<<<BRIEF_END>>>`;

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
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatModel, setChatModel] = useState("claude-sonnet-4-6");
  const [brief, setBrief] = useState(null);
  const [briefText, setBriefText] = useState("");
  const [briefEditing, setBriefEditing] = useState(false);
  const [prompts, setPrompts] = useState({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
  const [imgs, setImgs] = useState({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
  const [loadings, setLoadings] = useState({ dalleLeft: false, dalleRight: false, geminiLeft: false, geminiRight: false });
  const [sideTab, setSideTab] = useState("prompts");
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
    try {
      const data = await sbFetch("/sock_chats", { method: "POST", body: JSON.stringify({ title: "Nowy projekt", messages: [], last_brief: null }) });
      const s = Array.isArray(data) ? data[0] : data;
      setSessions(prev => [s, ...prev]);
      setCurrentSessionId(s.id);
      setChatHistory([]);
      setBrief(null);
      setBriefText("");
      setPrompts({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
      setImgs({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
      setSynthesis(null);
    } catch (e) { console.error(e); }
  }

  async function loadSession(id) {
    try {
      const data = await sbFetch("/sock_chats?id=eq." + id + "&select=*");
      const s = data[0];
      setCurrentSessionId(id);
      setChatHistory(s.messages || []);
      if (s.last_brief) {
        setBrief(s.last_brief);
        setBriefText(formatBriefText(s.last_brief));
        setPrompts({
          dalleLeft: s.last_brief.dalle_prompt_left || "",
          dalleRight: s.last_brief.dalle_prompt_right || "",
          geminiLeft: s.last_brief.gemini_prompt_left || "",
          geminiRight: s.last_brief.gemini_prompt_right || "",
        });
      }
    } catch (e) { console.error(e); }
  }

  function formatBriefText(b) {
    if (!b) return "";
    return [
      "KOLEKCJA: " + (b.collection_name || ""),
      "KONCEPT: " + (b.concept || ""),
      "",
      "LEWA SKARPETKA:",
      b.left_sock?.description || "",
      "Elementy: " + (b.left_sock?.key_elements || []).join(", "),
      b.left_sock?.text_element ? "Tekst: " + b.left_sock.text_element : "",
      "Tło: LEGS " + (b.left_sock?.background?.legs_code || "") + " " + (b.left_sock?.background?.hex || ""),
      "",
      "PRAWA SKARPETKA:",
      b.right_sock?.description || "",
      "Elementy: " + (b.right_sock?.key_elements || []).join(", "),
      b.right_sock?.text_element ? "Tekst: " + b.right_sock.text_element : "",
      "Tło: LEGS " + (b.right_sock?.background?.legs_code || "") + " " + (b.right_sock?.background?.hex || ""),
      "",
      "PALETA: " + (b.palette || []).map(c => c.legs_code + " " + c.hex).join(", "),
      "",
      b.designer_notes ? "NOTATKI: " + b.designer_notes : "",
    ].filter(l => l !== undefined).join("\n");
  }

  async function saveSession(msgs, lastBrief, title) {
    if (!currentSessionId) return;
    try {
      await sbFetch("/sock_chats?id=eq." + currentSessionId, {
        method: "PATCH",
        body: JSON.stringify({ messages: msgs, last_brief: lastBrief || null, title: title || "Projekt", updated_at: new Date().toISOString() }),
        prefer: "return=minimal",
      });
      loadSessions();
    } catch (e) { console.error(e); }
  }

  async function sendMessage() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const data = await sbFetch("/sock_chats", { method: "POST", body: JSON.stringify({ title: text.slice(0, 50), messages: [], last_brief: null }) });
        const s = Array.isArray(data) ? data[0] : data;
        sessionId = s.id;
        setCurrentSessionId(sessionId);
        setSessions(prev => [s, ...prev]);
      } catch (e) { console.error(e); return; }
    }

    const userMsg = { role: "user", content: text, model: chatModel, ts: Date.now() };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput("");
    setChatLoading(true);

    try {
      const isClaudeModel = chatModel.startsWith("claude");

      if (isClaudeModel) {
        // Streaming przez sock-chat
        const res = await fetch("/api/sock-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newHistory.map(({ role, content }) => ({ role, content })), model: chatModel }),
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let latestBrief = brief;
        const streamingMsg = { role: "assistant", content: "", model: chatModel, ts: Date.now() };
        setChatHistory(prev => [...prev, streamingMsg]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
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
              setBriefText(formatBriefText(msg.brief));
              setPrompts({ dalleLeft: msg.brief.dalle_prompt_left || "", dalleRight: msg.brief.dalle_prompt_right || "", geminiLeft: msg.brief.gemini_prompt_left || "", geminiRight: msg.brief.gemini_prompt_right || "" });
            }
          }
        }

        const display = fullText.replace(/<<<BRIEF_START>>>[\s\S]*?<<<BRIEF_END>>>/g, "").trim();
        const finalMsg = { role: "assistant", content: display, model: chatModel, hasBrief: !!latestBrief, ts: Date.now() };
        const finalHistory = [...newHistory, finalMsg];
        setChatHistory(finalHistory);
        await saveSession(finalHistory.map(({ role, content }) => ({ role, content })), latestBrief, latestBrief?.collection_name || text.slice(0, 50));
        if (latestBrief) { setSaveMsg("✅ Brief zapisany"); setTimeout(() => setSaveMsg(""), 3000); }

      } else {
        // Inne modele przez ai-chat
        const aiRes = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: chatModel,
            messages: [{ role: "system", content: SOCK_SYSTEM_PROMPT }, ...newHistory.map(({ role, content }) => ({ role, content }))],
            briefContext: null,
          }),
        });
        const aiData = await aiRes.json();
        if (aiData.error) throw new Error(aiData.error);
        const aiMsg = { role: "assistant", content: aiData.content, model: chatModel, ts: Date.now() };
        const finalHistory = [...newHistory, aiMsg];
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
    const prompt = "Zrób syntezę tej rozmowy:\n\n## PODSUMOWANIE\n[2-3 zdania]\n\n## KLUCZOWE USTALENIA\n[lista decyzji]\n\n## PALETA KOLORÓW LEGS\n[kolory z rozmowy]\n\n## PROMPTY DO GENEROWANIA\n[gotowe prompty dla DALL-E]\n\n## REKOMENDACJE\n[kolejne kroki]";
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

  function transferSynthesisToPanel() {
    if (!synthesis) return;
    setBriefText(synthesis);
    setBriefEditing(true);
    setSideTab("brief");
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

  async function generateAll() {
    await Promise.all([
      generateImage("dalleLeft", "dalle", prompts.dalleLeft),
      generateImage("dalleRight", "dalle", prompts.dalleRight),
      generateImage("geminiLeft", "gemini", prompts.geminiLeft),
      generateImage("geminiRight", "gemini", prompts.geminiRight),
    ]);
  }

  const anyImageLoading = Object.values(loadings).some(Boolean);

  const TABS = [["prompts", "🎨 Prompty"], ["palette", "🎨 Paleta"], ["brief", "📋 Brief"], ["spec", "📐 Spec"]];

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

        {/* LEWA — panel projektu */}
        <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>🧦 Sock Designer</div>
              <div style={{ fontSize: 12, color: "#888" }}>Generator briefów · LEGS palette · DALL-E 3 + Nano Banana</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saveMsg && <span style={{ fontSize: 12, color: "#2d7a4f" }}>{saveMsg}</span>}
              <button onClick={newSession} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Nowy projekt</button>
            </div>
          </div>

          {sessions.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ padding: "10px 16px", background: "#f9f7f5", borderBottom: "1px solid #e0dbd4", fontSize: 11, fontWeight: 700, color: "#555", fontFamily: "monospace" }}>HISTORIA PROJEKTÓW</div>
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
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

          {brief && (
            <>
              <div style={{ background: ACCENT, borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>KOLEKCJA</div>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 20, marginBottom: 6 }}>{brief.collection_name}</div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.7 }}>{brief.concept}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                {[["🧦 LEWA", brief.left_sock], ["🧦 PRAWA", brief.right_sock]].map(([title, sock]) => sock && (
                  <div key={title} style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
                      <span style={{ fontSize: 10, color: "#bbb", background: "#f5f3ef", borderRadius: 5, padding: "2px 7px" }}>{sock.layout}</span>
                    </div>
                    <p style={{ color: "#555", fontSize: 12, lineHeight: 1.6, margin: "0 0 8px" }}>{sock.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {(sock.key_elements || []).map((el, ei) => (
                        <span key={ei} style={{ background: "#f5f3ef", border: "1px solid #ede9e3", borderRadius: 20, padding: "2px 8px", fontSize: 10, color: "#666" }}>{el}</span>
                      ))}
                    </div>
                    {sock.background && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: sock.background.hex + "22", borderRadius: 5, border: "1px solid " + sock.background.hex + "44" }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: sock.background.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                        <span style={{ fontSize: 10, fontWeight: 700 }}>LEGS {sock.background.legs_code}</span>
                        <span style={{ fontSize: 10, color: "#999", fontFamily: "monospace" }}>{sock.background.hex}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {(brief || briefText) && (
            <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", borderBottom: "1px solid #e0dbd4" }}>
                {TABS.map(([id, label]) => (
                  <button key={id} onClick={() => setSideTab(id)}
                    style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: sideTab === id ? "2px solid " + ACCENT : "2px solid transparent", color: sideTab === id ? ACCENT : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ padding: 16 }}>

                {sideTab === "prompts" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#888" }}>Edytuj i generuj obrazy</div>
                      <button onClick={generateAll} disabled={anyImageLoading}
                        style={{ background: anyImageLoading ? "#eee" : "#1a1814", color: anyImageLoading ? "#aaa" : "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        {anyImageLoading ? "⏳" : "▶▶ Wszystkie 4"}
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 10, color: "#555", paddingBottom: 4, borderBottom: "1px solid #ede9e3" }}>🧦 LEWA</div>
                        <PromptEditor label="lewa" engine="dalle" value={prompts.dalleLeft} onChange={v => setPrompts(p => ({ ...p, dalleLeft: v }))} onGenerate={() => generateImage("dalleLeft", "dalle", prompts.dalleLeft)} loading={loadings.dalleLeft} imageUrl={imgs.dalleLeft} bgColor={brief?.left_sock?.background?.hex} />
                        <PromptEditor label="lewa" engine="gemini" value={prompts.geminiLeft} onChange={v => setPrompts(p => ({ ...p, geminiLeft: v }))} onGenerate={() => generateImage("geminiLeft", "gemini", prompts.geminiLeft)} loading={loadings.geminiLeft} imageUrl={imgs.geminiLeft} bgColor={brief?.left_sock?.background?.hex} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 10, color: "#555", paddingBottom: 4, borderBottom: "1px solid #ede9e3" }}>🧦 PRAWA</div>
                        <PromptEditor label="prawa" engine="dalle" value={prompts.dalleRight} onChange={v => setPrompts(p => ({ ...p, dalleRight: v }))} onGenerate={() => generateImage("dalleRight", "dalle", prompts.dalleRight)} loading={loadings.dalleRight} imageUrl={imgs.dalleRight} bgColor={brief?.right_sock?.background?.hex} />
                        <PromptEditor label="prawa" engine="gemini" value={prompts.geminiRight} onChange={v => setPrompts(p => ({ ...p, geminiRight: v }))} onGenerate={() => generateImage("geminiRight", "gemini", prompts.geminiRight)} loading={loadings.geminiRight} imageUrl={imgs.geminiRight} bgColor={brief?.right_sock?.background?.hex} />
                      </div>
                    </div>
                  </>
                )}

                {sideTab === "palette" && brief && (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 10, color: "#888" }}>KOLORY KOLEKCJI ({brief.palette?.length})</div>
                    {(brief.palette || []).map((c, ci) => <ColorSwatch key={ci} color={c} />)}
                    <div style={{ marginTop: 12, padding: "8px 10px", background: "#f5f3ef", borderRadius: 8 }}>
                      <div style={{ fontSize: 9, color: "#bbb", fontWeight: 700, marginBottom: 6 }}>TŁA</div>
                      {[["Lewa", brief.left_sock?.background], ["Prawa", brief.right_sock?.background]].filter(([, bg]) => bg).map(([label, bg]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 14, height: 14, borderRadius: 3, background: bg.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                          <span style={{ fontSize: 10, color: "#666" }}>{label}: LEGS {bg.legs_code} {bg.hex}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {sideTab === "brief" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: "#888" }}>Edytowalny brief tekstowy</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => navigator.clipboard.writeText(briefText)}
                          style={{ fontSize: 10, padding: "3px 10px", borderRadius: 5, border: "1px solid #ddd", background: "#fafafa", color: "#666", cursor: "pointer", fontFamily: "inherit" }}>
                          📋 Kopiuj
                        </button>
                        <button onClick={() => setBriefEditing(e => !e)}
                          style={{ fontSize: 10, padding: "3px 10px", borderRadius: 5, border: "1px solid " + ACCENT, background: briefEditing ? ACCENT : "none", color: briefEditing ? "#fff" : ACCENT, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                          {briefEditing ? "✓ Gotowe" : "✏️ Edytuj"}
                        </button>
                      </div>
                    </div>
                    {briefEditing
                      ? <textarea value={briefText} onChange={e => setBriefText(e.target.value)}
                          style={{ width: "100%", minHeight: 300, padding: "10px 12px", borderRadius: 8, border: "1px solid " + ACCENT + "44", fontSize: 12, fontFamily: "inherit", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa", color: "#333" }} />
                      : <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.7, color: "#333", fontFamily: "inherit", margin: 0 }}>{briefText}</pre>
                    }
                  </>
                )}

                {sideTab === "spec" && (
                  <>
                    {[["Format","BMP bitmap"],["Szerokość","168 px"],["41-46","168 × 480 px"],["36-40","168 × 435 px"],["Maks. kolorów","6 (tylko LEGS)"],["Styl","Flat 2D, zero gradientów"],["Margines","max 1px"],["Lewa = Prawa","❌ zawsze różne"]].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0ede8", fontSize: 11 }}>
                        <span style={{ color: "#999" }}>{k}</span>
                        <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{v}</span>
                      </div>
                    ))}
                    {brief?.designer_notes && (
                      <div style={{ marginTop: 14, padding: "10px 12px", background: "#fff8f0", borderRadius: 8, border: "1px solid " + ACCENT + "33" }}>
                        <div style={{ fontSize: 9, color: ACCENT, fontWeight: 700, marginBottom: 6 }}>NOTATKI DLA GRAFIKA</div>
                        <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7 }}>{brief.designer_notes}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {!brief && !briefText && sessions.length === 0 && (
            <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, padding: 40, textAlign: "center", color: "#aaa" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧦</div>
              <div style={{ fontSize: 14, marginBottom: 8, color: "#888" }}>Opisz kolekcję w czacie →</div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>np. "Fiat 126p Maluch, PRL"<br />"Warszawa nocą, neon"<br />"Tatry, szlaki, niedźwiedź"</div>
            </div>
          )}
        </div>

        {/* PRAWA — panel czatu (1:1 marketing-brief) */}
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
                {/* Provider tabs */}
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setChatModel(MODELS[p.id][0].id)}
                      style={{ flex: 1, padding: "4px 6px", borderRadius: 6, border: "1px solid " + (activeProvider === p.id ? p.color : "#ddd"), background: activeProvider === p.id ? p.color + "15" : "#f9f9f9", color: activeProvider === p.id ? p.color : "#aaa", fontSize: 10, fontWeight: activeProvider === p.id ? 700 : 400, cursor: "pointer", fontFamily: "monospace" }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {/* Model buttons */}
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
                          <button onClick={transferSynthesisToPanel}
                            style={{ fontSize: 10, padding: "2px 10px", borderRadius: 4, border: "1px solid " + ACCENT, background: ACCENT, color: "#fff", cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}>
                            📋 Przenieś do panelu
                          </button>
                        </>
                      )}
                      <button onClick={() => setSynthesis(null)} style={{ fontSize: 14, background: "none", border: "none", color: "#ccc", cursor: "pointer" }}>×</button>
                    </div>
                  </div>
                  <div style={{ padding: 12, maxHeight: 280, overflowY: "auto", fontSize: 12, color: "#333", lineHeight: 1.7 }}>
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
                    <div>Opisz kolekcję skarpetek.<br />AI wygeneruje brief i prompty.</div>
                  </div>
                )}
                {chatHistory.map((msg, i) => {
                  const isUser = msg.role === "user";
                  const msgTime = msg.ts ? new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";
                  const modelColor = msg.model?.startsWith("claude") ? "#b8763a" : msg.model?.startsWith("gemini") ? "#4285f4" : "#10a37f";
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                      {!isUser && <div style={{ fontSize: 9, color: modelColor, marginBottom: 3, fontFamily: "monospace", fontWeight: 700 }}>{msg.model || "AI"}</div>}
                      <div style={{ maxWidth: "90%", padding: isUser ? "8px 12px" : "12px 16px", borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: isUser ? ACCENT : "#fff", color: isUser ? "#fff" : "#1a1a1a", fontSize: 13, lineHeight: 1.6, wordBreak: "break-word", border: isUser ? "none" : "1px solid #e8e0d8", boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
                        {isUser
                          ? <div style={{ whiteSpace: "pre-wrap", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{msg.content}</div>
                          : <div>{renderMarkdown(msg.content)}</div>
                        }
                      </div>
                      {msg.hasBrief && <div style={{ fontSize: 9, color: "#0d9e6e", marginTop: 3 }}>✓ Brief zaktualizowany w panelu</div>}
                      {msgTime && <div style={{ fontSize: 9, color: "#bbb", marginTop: 3, fontFamily: "monospace" }}>{msgTime}</div>}
                    </div>
                  );
                })}
                {chatLoading && (
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 4px", background: "#f5f2ee", fontSize: 12, color: "#aaa" }}>⏳ Myślę...</div>
                  </div>
                )}
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
                    placeholder="Opisz kolekcję... (Enter = wyślij)"
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
