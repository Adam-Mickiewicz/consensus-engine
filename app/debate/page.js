"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/Nav";
import { useDarkMode } from "../hooks/useDarkMode";
import { supabase } from "../../lib/supabase";
import { saveConversation, loadConversations, loadConversation, deleteConversation } from "../../lib/supabase";

const ACCENT = "#b8763a";

const MODELS = {
  claude: {
    id: "claude", label: "Claude", emoji: "🔍", color: "#b8763a",
    options: [
      { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", desc: "Błyskawiczny do prostych pytań", price: "$0.25/1M" },
      { id: "claude-sonnet-4-5", label: "Sonnet 4.5", desc: "Inteligentny, dobry balans", price: "$3/1M" },
      { id: "claude-sonnet-4-6", label: "Sonnet 4.6", desc: "Nowy domyślny, prawie poziom Opus", price: "$3/1M" },
      { id: "claude-opus-4-6", label: "Opus 4.6", desc: "Najlepszy Claude, 1M kontekst", price: "$15/1M" },
    ],
    default: "claude-sonnet-4-6",
  },
  openai: {
    id: "openai", label: "GPT", emoji: "⚡", color: "#0d9e6e",
    options: [
      { id: "gpt-4o-mini", label: "GPT-4o mini", desc: "Sprawdzony, szybki i tani", price: "$0.15/1M" },
      { id: "gpt-5-mini", label: "GPT-5 mini", desc: "Tani wariant z rozumowaniem", price: "$1.1/1M" },
      { id: "gpt-5.2", label: "GPT-5.2", desc: "Poprzedni flagship, szybszy", price: "$3/1M" },
      { id: "gpt-5.4", label: "GPT-5.4", desc: "Flagowy OpenAI, kodowanie + agenty", price: "$15/1M" },
    ],
    default: "gpt-5-mini",
  },
  gemini: {
    id: "gemini", label: "Gemini", emoji: "🌐", color: "#2563eb",
    options: [
      { id: "gemini-2.0-flash", label: "2.0 Flash", desc: "Sprawdzony i tani", price: "$0.10/1M" },
      { id: "gemini-2.5-flash", label: "2.5 Flash", desc: "Hybrid reasoning, 1M kontekst", price: "$0.30/1M" },
      { id: "gemini-2.5-pro", label: "2.5 Pro", desc: "Stabilny, świetny do kodowania", price: "$1.25/1M" },
      { id: "gemini-3-flash-preview", label: "3 Flash", desc: "Szybki Gemini 3 z myśleniem", price: "$0.50/1M" },
      { id: "gemini-3-pro-preview", label: "3 Pro", desc: "Najnowszy Google, multimodal", price: "$2/1M" },
    ],
    default: "gemini-2.5-flash",
  },
};

const SYSTEM_PROMPT = (webSearch, expertMode) =>
  expertMode
    ? `Jesteś doświadczonym strategiem i ekspertem marketingowym w systemie multi-agentowym. Specjalizujesz się w e-commerce, brandingu, strategii cenowej i kampaniach cyfrowych. Odpowiadaj konkretnie, używaj danych i przykładów z rynku. Używaj markdown. ${webSearch ? "Masz dostęp do web search — używaj go gdy potrzebujesz aktualnych danych." : ""} Odpowiadaj w języku użytkownika.`
    : `Jesteś asystentem AI. ${webSearch ? "Masz dostęp do web search — używaj go gdy potrzebujesz aktualnych danych." : ""} Odpowiadaj w języku użytkownika. Używaj markdown.`;

const CROSS_PROMPT = (myLabel, otherResponses) =>
  `Jesteś ${myLabel}. Przeczytaj odpowiedzi innych modeli AI na to samo pytanie i skomentuj je krótko — z czym się zgadzasz, co byś dodał lub zakwestionował.\n\nOdpowiedzi innych:\n${otherResponses}\n\nTwój komentarz (max 150 słów):`;

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const els = [];
  let i = 0;
  const parseBold = (t) => {
    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p);
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) els.push(<div key={i} style={{ fontWeight: 700, fontSize: 13, color: ACCENT, marginTop: 10, marginBottom: 4 }}>{line.slice(3)}</div>);
    else if (line.startsWith("# ")) els.push(<div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{line.slice(2)}</div>);
    else if (line.startsWith("- ") || line.startsWith("• ")) els.push(<div key={i} style={{ display: "flex", gap: 6, marginBottom: 2, fontSize: 12 }}><span style={{ color: ACCENT }}>•</span><span>{parseBold(line.slice(2))}</span></div>);
    else if (line.trim()) els.push(<div key={i} style={{ marginBottom: 3, fontSize: 12, lineHeight: 1.6 }}>{parseBold(line)}</div>);
    i++;
  }
  return els;
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "przed chwilą";
  if (diff < 3600) return `${Math.floor(diff/60)} min temu`;
  if (diff < 86400) return `${Math.floor(diff/3600)} godz. temu`;
  return `${Math.floor(diff/86400)} dni temu`;
}

export default function DebatePage() {
  const router = useRouter();
  const [dark, toggleDark] = useDarkMode();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [crossLoading, setCrossLoading] = useState(false);
  const [activeModels, setActiveModels] = useState({ claude: true, openai: true, gemini: true });
  const [modelVersions, setModelVersions] = useState({ claude: "claude-sonnet-4-6", openai: "gpt-5-mini", gemini: "gemini-2.5-flash" });
  const [webSearch, setWebSearch] = useState(false);
  const [expertMode, setExpertMode] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [showModelPicker, setShowModelPicker] = useState(null);
  const [pendingCross, setPendingCross] = useState(null);
  const [convId, setConvId] = useState(null);
  const [convTitle, setConvTitle] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const saveTimeout = useRef(null);

  useEffect(() => {
    // Sprawdź czy jest ID do załadowania z sessionStorage
    const loadId = sessionStorage.getItem("ce-load-conversation");
    if (loadId) {
      sessionStorage.removeItem("ce-load-conversation");
      loadConversation(loadId).then(conv => {
        if (conv) {
          setMessages(conv.messages || []);
          setConvId(conv.id);
          setConvTitle(conv.title || "");
          if (conv.settings) {
            if (conv.settings.activeModels) setActiveModels(conv.settings.activeModels);
            if (conv.settings.modelVersions) setModelVersions(conv.settings.modelVersions);
            if (conv.settings.webSearch !== undefined) setWebSearch(conv.settings.webSearch);
            if (conv.settings.expertMode !== undefined) setExpertMode(conv.settings.expertMode);
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, crossLoading]);

  // Auto-save po każdej zmianie wiadomości
  useEffect(() => {
    if (messages.length === 0) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => autoSave(messages), 1500);
    return () => clearTimeout(saveTimeout.current);
  }, [messages]);

  const autoSave = async (msgs) => {
    const title = convTitle || (msgs.find(m => m.role === "user")?.content?.slice(0, 60) + "..." || "Nowa rozmowa");
    const settings = { activeModels, modelVersions, webSearch, expertMode };
    const saved = await saveConversation({ id: convId, title, messages: msgs, settings });
    if (saved) {
      setConvId(saved.id);
      setConvTitle(title);
      // Aktualizuj URL bez przeładowania
      window.history.replaceState(null, "", `/debate/${saved.id}`);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const data = await loadConversations();
    setHistory(data);
    setHistoryLoading(false);
  };

  const openHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  const loadConv = async (id) => {
    const conv = await loadConversation(id);
    if (conv) {
      setMessages(conv.messages || []);
      setConvId(conv.id);
      setConvTitle(conv.title || "");
      if (conv.settings?.activeModels) setActiveModels(conv.settings.activeModels);
      if (conv.settings?.modelVersions) setModelVersions(conv.settings.modelVersions);
      if (conv.settings?.webSearch !== undefined) setWebSearch(conv.settings.webSearch);
      if (conv.settings?.expertMode !== undefined) setExpertMode(conv.settings.expertMode);
      window.history.replaceState(null, "", `/debate/${id}`);
      setShowHistory(false);
      setPendingCross(null);
    }
  };

  const deleteConv = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Usunąć tę rozmowę?")) return;
    await deleteConversation(id);
    setHistory(prev => prev.filter(h => h.id !== id));
    if (convId === id) newConversation();
  };

  const newConversation = () => {
    setMessages([]);
    setConvId(null);
    setConvTitle("");
    setPendingCross(null);
    window.history.replaceState(null, "", "/debate");
    setShowHistory(false);
  };

  const t = {
    bg: dark ? "#0a0a0a" : "#f5f2ec",
    surface: dark ? "#0f0f0f" : "#ffffff",
    border: dark ? "#1e1e1e" : "#e8e4de",
    text: dark ? "#e0ddd8" : "#1a1814",
    textSub: dark ? "#6a6560" : "#7a7570",
    inputBg: dark ? "#111" : "#f9f8f6",
    userBubble: dark ? "#2a2520" : "#1a1814",
    aiBubble: dark ? "#141414" : "#ffffff",
    historyBg: dark ? "#0d0d0d" : "#fafaf8",
  };

  const activeList = Object.keys(activeModels).filter(k => activeModels[k]);

  const callModel = async (provider, model, msgs, systemPrompt) => {
    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, systemPrompt, messages: msgs, webSearch }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Błąd API");
    return data.content;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || activeList.length === 0) return;
    const userMsg = { role: "user", content: input.trim(), ts: Date.now(), attachments };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setAttachments([]);
    setLoading(true);
    setPendingCross(null);

    const history = [...messages, userMsg].map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
    const targeted = input.match(/@(claude|gpt|gemini)/i)?.[1]?.toLowerCase();
    const toQuery = targeted ? activeList.filter(m => m === targeted || (targeted === "gpt" && m === "openai")) : activeList;

    const responses = {};
    await Promise.all(toQuery.map(async (provider) => {
      try {
        responses[provider] = await callModel(provider, modelVersions[provider], history, SYSTEM_PROMPT(webSearch, expertMode));
      } catch (e) {
        responses[provider] = "❌ Błąd: " + e.message;
      }
    }));

    const aiMessages = toQuery.map(provider => ({ role: "assistant", provider, content: responses[provider], ts: Date.now() }));
    setMessages(prev => [...prev, ...aiMessages]);
    setLoading(false);
    if (toQuery.length > 1) setPendingCross({ responses, providers: toQuery });
  };

  const requestCrossReaction = async () => {
    if (!pendingCross) return;
    setCrossLoading(true);
    setPendingCross(null);
    const { responses, providers } = pendingCross;
    const crossResponses = {};
    await Promise.all(providers.map(async (provider) => {
      const others = providers.filter(p => p !== provider).map(p => `${MODELS[p].label}: ${responses[p]}`).join("\n\n");
      try {
        crossResponses[provider] = await callModel(provider, modelVersions[provider], [{ role: "user", content: CROSS_PROMPT(MODELS[provider].label, others) }], SYSTEM_PROMPT(false, expertMode));
      } catch (e) {
        crossResponses[provider] = "❌ " + e.message;
      }
    }));
    const crossMsgs = providers.map(provider => ({ role: "cross", provider, content: crossResponses[provider], ts: Date.now() }));
    setMessages(prev => [...prev, ...crossMsgs]);
    setCrossLoading(false);
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const toggleModel = (m) => {
    setActiveModels(prev => {
      const active = Object.keys(prev).filter(k => prev[k]);
      if (prev[m] && active.length === 1) return prev;
      return { ...prev, [m]: !prev[m] };
    });
  };

  return (
    <>
      <Nav current="/debate" />
      <div style={{ height: "calc(100vh - 44px)", background: t.bg, display: "flex", flexDirection: "column", fontFamily: "var(--font-open-sans), system-ui, sans-serif" }}>

        {/* Topbar */}
        <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontSize: 18, color: t.text, marginRight: 4 }}>⚡ Consensus</div>

          {Object.values(MODELS).map(m => {
            const activeOpt = m.options.find(o => o.id === modelVersions[m.id]);
            const isActive = activeModels[m.id];
            return (
              <div key={m.id} style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", border: `1px solid ${isActive ? m.color + "50" : t.border}`, borderRadius: 8, overflow: "hidden", background: isActive ? m.color + "08" : "none" }}>
                  <button onClick={() => toggleModel(m.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", background: "none", border: "none", cursor: "pointer", color: isActive ? m.color : t.textSub, fontWeight: 600, fontSize: 11, fontFamily: "inherit" }}>
                    <span>{m.emoji}</span><span>{m.label}</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? m.color : t.border, display: "inline-block" }} />
                  </button>
                  <button onClick={() => setShowModelPicker(showModelPicker === m.id ? null : m.id)} style={{ padding: "5px 7px", background: "none", border: "none", borderLeft: `1px solid ${isActive ? m.color + "30" : t.border}`, cursor: "pointer", color: isActive ? m.color : t.textSub, fontSize: 10, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{activeOpt?.label}</span><span>▾</span>
                  </button>
                </div>
                {showModelPicker === m.id && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 6, zIndex: 200, minWidth: 220, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                    <div style={{ fontSize: 9, color: t.textSub, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 8px 6px", fontWeight: 600 }}>{m.label} — wybierz model</div>
                    {m.options.map(opt => {
                      const isSel = modelVersions[m.id] === opt.id;
                      return (
                        <div key={opt.id} onClick={() => { setModelVersions(prev => ({ ...prev, [m.id]: opt.id })); setShowModelPicker(null); }}
                          style={{ padding: "8px 10px", borderRadius: 7, cursor: "pointer", background: isSel ? m.color + "15" : "none", marginBottom: 2, border: `1px solid ${isSel ? m.color + "40" : "transparent"}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: isSel ? m.color : t.text }}>{opt.label}</span>
                            <span style={{ fontSize: 10, color: isSel ? m.color : t.textSub, background: isSel ? m.color + "15" : (dark ? "#1a1a1a" : "#f5f2ec"), borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{opt.price}</span>
                          </div>
                          <div style={{ fontSize: 11, color: t.textSub, lineHeight: 1.4 }}>{opt.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setExpertMode(e => !e)}
              style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${expertMode ? ACCENT + "60" : t.border}`, background: expertMode ? ACCENT + "12" : "none", color: expertMode ? ACCENT : t.textSub, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              🎯 {expertMode ? "Ekspert ON" : "Ekspert OFF"}
            </button>
            <button onClick={() => setWebSearch(w => !w)}
              style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${webSearch ? "#2563eb60" : t.border}`, background: webSearch ? "#2563eb12" : "none", color: webSearch ? "#2563eb" : t.textSub, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              🌐 {webSearch ? "Web ON" : "Web OFF"}
            </button>
            <button onClick={newConversation}
              style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: "none", color: t.textSub, cursor: "pointer", fontFamily: "inherit" }}>
              + Nowa
            </button>
            <button onClick={openHistory}
              style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: showHistory ? t.border : "none", color: t.textSub, cursor: "pointer", fontFamily: "inherit" }}>
              📋 Historia
            </button>
            {convId && (
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: "none", color: t.textSub, cursor: "pointer", fontFamily: "inherit" }}
                title="Skopiuj link do tej rozmowy">
                🔗 Kopiuj link
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Panel historii */}
          {showHistory && (
            <div style={{ width: 280, minWidth: 280, background: t.historyBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Historia rozmów</span>
                <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
                {historyLoading && <div style={{ color: t.textSub, fontSize: 12, padding: 12, textAlign: "center" }}>Ładowanie...</div>}
                {!historyLoading && history.length === 0 && <div style={{ color: t.textSub, fontSize: 12, padding: 12, textAlign: "center" }}>Brak zapisanych rozmów</div>}
                {history.map(h => (
                  <div key={h.id} onClick={() => loadConv(h.id)}
                    style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: convId === h.id ? ACCENT + "12" : "none", border: `1px solid ${convId === h.id ? ACCENT + "40" : "transparent"}`, transition: "background 0.1s" }}
                    onMouseEnter={e => { if (convId !== h.id) e.currentTarget.style.background = dark ? "#1a1a1a" : "#f0ece6"; }}
                    onMouseLeave={e => { if (convId !== h.id) e.currentTarget.style.background = "none"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                      <div style={{ fontSize: 12, color: convId === h.id ? ACCENT : t.text, fontWeight: convId === h.id ? 600 : 400, lineHeight: 1.4, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.title || "Bez tytułu"}
                      </div>
                      <button onClick={e => deleteConv(h.id, e)} style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontSize: 13, opacity: 0.5, flexShrink: 0, padding: 0 }}>×</button>
                    </div>
                    <div style={{ fontSize: 10, color: t.textSub, marginTop: 3 }}>
                      {(h.messages?.length || 0)} wiad. · {timeAgo(h.updated_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>

            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: t.textSub, fontSize: 13, marginTop: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
                <div style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 22, color: t.text, marginBottom: 8 }}>Okrągły stół AI</div>
                <div style={{ fontSize: 13, color: t.textSub, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                  Zadaj pytanie — {activeList.length} {activeList.length === 1 ? "model" : "modele"} odpowiedzą równolegle.<br />
                  Użyj <strong>@claude</strong>, <strong>@gpt</strong> lub <strong>@gemini</strong> żeby zaadresować konkretny model.
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isCross = msg.role === "cross";
              const model = msg.provider ? MODELS[msg.provider] : null;
              const msgTime = msg.ts ? new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  {!isUser && model && (
                    <div style={{ fontSize: 10, color: model.color, marginBottom: 3, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      {model.emoji} {model.label}
                      {isCross && <span style={{ background: model.color + "20", borderRadius: 4, padding: "1px 5px", fontSize: 9 }}>komentarz</span>}
                      <span style={{ color: t.textSub, fontWeight: 400 }}>{msgTime}</span>
                    </div>
                  )}
                  <div style={{ maxWidth: "88%", padding: isUser ? "9px 14px" : "12px 16px", borderRadius: isUser ? "14px 14px 4px 14px" : "4px 14px 14px 14px", background: isUser ? t.userBubble : t.aiBubble, color: isUser ? "#fff" : t.text, fontSize: 13, lineHeight: 1.6, wordBreak: "break-word", border: isUser ? "none" : `1px solid ${isCross ? (model?.color + "40" || t.border) : t.border}`, boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.05)" }}>
                    {isUser ? <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div> : <div>{renderMarkdown(msg.content)}</div>}
                  </div>
                  {isUser && <div style={{ fontSize: 9, color: t.textSub, marginTop: 2 }}>{msgTime}</div>}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: "flex", gap: 8 }}>
                {activeList.map(provider => (
                  <div key={provider} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, background: t.aiBubble, border: `1px solid ${t.border}`, fontSize: 12, color: MODELS[provider].color }}>
                    {MODELS[provider].emoji} <span style={{ color: t.textSub }}>pisze...</span>
                  </div>
                ))}
              </div>
            )}

            {pendingCross && !crossLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: dark ? "#1a1510" : "#fffbf5", border: `1px solid ${ACCENT}40`, borderRadius: 10, fontSize: 12, color: t.textSub }}>
                <span>💬 Modele nie widziały odpowiedzi innych —</span>
                <button onClick={requestCrossReaction} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Poproś o wzajemny komentarz →
                </button>
              </div>
            )}

            {crossLoading && (
              <div style={{ fontSize: 12, color: t.textSub }}>
                <span style={{ color: ACCENT }}>💬</span> Modele czytają swoje odpowiedzi...
              </div>
            )}

            {convId && (
              <div style={{ fontSize: 10, color: t.textSub, textAlign: "center", marginTop: 8, opacity: 0.6 }}>
                Rozmowa zapisana · <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => { navigator.clipboard.writeText(window.location.href); }}>skopiuj link</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ background: t.surface, borderTop: `1px solid ${t.border}`, padding: "12px 20px" }}>
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {attachments.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: dark ? "#1a1a1a" : "#f0ece6", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: t.text }}>
                  <span>{a.type?.startsWith("image/") ? "🖼️" : "📄"} {a.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: t.textSub, cursor: "pointer", fontSize: 14 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Napisz wiadomość... lub użyj @claude @gpt @gemini"
              rows={1}
              style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", minHeight: 42, maxHeight: 140, overflowY: "auto", lineHeight: 1.5, color: t.text }}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
            />
            <label style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "10px 12px", border: `1px solid ${t.border}`, borderRadius: 10, background: t.inputBg, color: t.textSub, fontSize: 13 }}>
              <input type="file" multiple accept="image/*,.pdf,.txt,.md" onChange={async e => {
                const files = Array.from(e.target.files);
                const loaded = await Promise.all(files.map(f => new Promise(resolve => {
                  const reader = new FileReader();
                  if (f.type.startsWith("image/")) { reader.onload = ev => resolve({ name: f.name, type: f.type, data: ev.target.result.split(",")[1] }); reader.readAsDataURL(f); }
                  else { reader.onload = ev => resolve({ name: f.name, type: f.type, textContent: ev.target.result }); reader.readAsText(f); }
                })));
                setAttachments(prev => [...prev, ...loaded]);
                e.target.value = "";
              }} style={{ display: "none" }} />
              📎
            </label>
            <button onClick={sendMessage} disabled={loading || !input.trim() || activeList.length === 0}
              style={{ background: loading || !input.trim() ? t.border : "#1a1814", color: loading || !input.trim() ? t.textSub : "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {loading ? "..." : "Wyślij →"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {["@claude", "@gpt", "@gemini"].map(hint => (
              <span key={hint} onClick={() => setInput(prev => prev + hint + " ")}
                style={{ fontSize: 10, color: t.textSub, background: dark ? "#1a1a1a" : "#f5f2ec", border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 7px", cursor: "pointer" }}>
                {hint}
              </span>
            ))}
            <span style={{ fontSize: 10, color: t.textSub, marginLeft: 4 }}>Enter = wyślij · Shift+Enter = nowa linia</span>
          </div>
        </div>

      </div>
    </>
  );
}
