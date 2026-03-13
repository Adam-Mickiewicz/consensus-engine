"use client";
import { useState, useRef, useEffect } from "react";

const accent = "#b8763a";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

function ColorSwatch({ color }) {
  const [copied, setCopied] = useState(false);
  return (
    <div onClick={() => { navigator.clipboard.writeText(color.hex); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, background: "#f9f7f4", border: "1px solid #ede9e3", marginBottom: 3 }}>
      <div style={{ width: 20, height: 20, borderRadius: 3, background: color.hex, border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 10, color: "#1a1814" }}>{color.legs_code}</div>
        <div style={{ fontSize: 9, color: "#999", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{color.name} · {color.hex}</div>
        {color.usage && <div style={{ fontSize: 9, color: "#bbb", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{color.usage}</div>}
      </div>
      <div style={{ fontSize: 9, color: copied ? "#0d9e6e" : "#ddd", flexShrink: 0 }}>{copied ? "✓" : "⎘"}</div>
    </div>
  );
}

function PromptEditor({ label, engine, value, onChange, onGenerate, loading, imageUrl, bgColor }) {
  const engineColor = engine === "dalle" ? "#1a1814" : "#0d9e6e";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: engineColor, marginRight: 5 }} />
          {engine === "dalle" ? "DALL-E 3" : "Nano Banana 🍌"} — {label}
        </span>
        <button onClick={onGenerate} disabled={loading || !value.trim()}
          style={{ background: loading ? "#eee" : engineColor, color: loading ? "#aaa" : "#fff", border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {loading ? "⏳" : "▶"}
        </button>
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", minHeight: 65, padding: "8px 10px", borderRadius: 6, border: `1px solid ${engineColor}44`, fontSize: 10, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#fdfcfa", color: "#333" }} />
      {imageUrl && <div style={{ marginTop: 5, borderRadius: 6, overflow: "hidden", border: "1px solid #ede9e3" }}><img src={imageUrl} style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "contain", background: bgColor || "#f0ede8" }} /></div>}
      {loading && !imageUrl && <div style={{ marginTop: 5, padding: 12, background: "#f5f3ef", borderRadius: 6, textAlign: "center", color: "#aaa", fontSize: 10 }}>generuję...</div>}
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  // Usuń blok JSON z wyświetlanego tekstu
  const displayText = msg.content.replace(/<<<BRIEF_START>>>[\s\S]*?<<<BRIEF_END>>>/g, "").trim();
  const hasBrief = msg.brief != null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      <div style={{
        maxWidth: "85%", padding: "10px 14px", borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
        background: isUser ? accent : "#fff", color: isUser ? "#fff" : "#1a1814",
        border: isUser ? "none" : "1px solid #ede9e3", fontSize: 13, lineHeight: 1.7,
        whiteSpace: "pre-wrap"
      }}>
        {displayText}
      </div>
      {hasBrief && !isUser && (
        <div style={{ fontSize: 10, color: "#0d9e6e", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span>✓</span> Brief zaktualizowany w panelu →
        </div>
      )}
    </div>
  );
}

export default function SockDesigner() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [brief, setBrief] = useState(null);
  const [prompts, setPrompts] = useState({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
  const [imgs, setImgs] = useState({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
  const [loadings, setLoadings] = useState({ dalleLeft: false, dalleRight: false, geminiLeft: false, geminiRight: false });
  const [sideTab, setSideTab] = useState("prompts");
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);

  async function loadSessions() {
    try {
      const data = await sbFetch("/sock_chats?select=id,title,updated_at&order=updated_at.desc&limit=20");
      setSessions(data || []);
    } catch (e) { console.error("loadSessions:", e); }
  }

  async function newSession() {
    try {
      const data = await sbFetch("/sock_chats", {
        method: "POST",
        body: JSON.stringify({ title: "Nowy projekt", messages: [], last_brief: null }),
      });
      const session = Array.isArray(data) ? data[0] : data;
      setSessions(prev => [session, ...prev]);
      setCurrentSessionId(session.id);
      setMessages([]);
      setBrief(null);
      setPrompts({ dalleLeft: "", dalleRight: "", geminiLeft: "", geminiRight: "" });
      setImgs({ dalleLeft: null, dalleRight: null, geminiLeft: null, geminiRight: null });
    } catch (e) { console.error("newSession:", e); }
  }

  async function loadSession(id) {
    try {
      const data = await sbFetch(`/sock_chats?id=eq.${id}&select=*`);
      const session = data[0];
      setCurrentSessionId(id);
      setMessages(session.messages || []);
      if (session.last_brief) {
        setBrief(session.last_brief);
        setPrompts({
          dalleLeft: session.last_brief.dalle_prompt_left || "",
          dalleRight: session.last_brief.dalle_prompt_right || "",
          geminiLeft: session.last_brief.gemini_prompt_left || "",
          geminiRight: session.last_brief.gemini_prompt_right || "",
        });
      }
      setSessionsOpen(false);
    } catch (e) { console.error("loadSession:", e); }
  }

  async function saveSession(msgs, lastBrief, title) {
    if (!currentSessionId) return;
    try {
      await sbFetch(`/sock_chats?id=eq.${currentSessionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          messages: msgs,
          last_brief: lastBrief || null,
          title: title || "Projekt",
          updated_at: new Date().toISOString(),
        }),
        prefer: "return=minimal",
      });
      loadSessions();
    } catch (e) { console.error("saveSession:", e); }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    // Utwórz sesję jeśli nie ma
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const data = await sbFetch("/sock_chats", {
          method: "POST",
          body: JSON.stringify({ title: text.slice(0, 40), messages: [], last_brief: null }),
        });
        const session = Array.isArray(data) ? data[0] : data;
        sessionId = session.id;
        setCurrentSessionId(sessionId);
        setSessions(prev => [session, ...prev]);
      } catch (e) { console.error("create session:", e); return; }
    }

    const newUserMsg = { role: "user", content: text };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    // Przygotuj wiadomości dla API (bez pola brief)
    const apiMessages = newMessages.map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/sock-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let latestBrief = brief;

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
            setStreamingText(fullText.replace(/<<<BRIEF_START>>>[\s\S]*?<<<BRIEF_END>>>/g, "").trim());
          }
          if (msg.type === "brief") {
            latestBrief = msg.brief;
            setBrief(msg.brief);
            setPrompts({
              dalleLeft: msg.brief.dalle_prompt_left || "",
              dalleRight: msg.brief.dalle_prompt_right || "",
              geminiLeft: msg.brief.gemini_prompt_left || "",
              geminiRight: msg.brief.gemini_prompt_right || "",
            });
            setSideTab("prompts");
          }
        }
      }

      const assistantMsg = { role: "assistant", content: fullText, brief: latestBrief !== brief ? latestBrief : null };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setStreamingText("");

      // Zapisz do Supabase
      const title = latestBrief?.collection_name || text.slice(0, 40);
      await saveSession(finalMessages.map(({ role, content }) => ({ role, content })), latestBrief, title);

    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Błąd: ${e.message}` }]);
      setStreamingText("");
    }
    setStreaming(false);
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
    } catch (e) { console.error("generateImage:", e); }
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

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f3ef", fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* HEADER */}
      <div style={{ background: "#1a1814", padding: "10px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <a href="/" style={{ color: "#666", fontSize: 11, textDecoration: "none" }}>←</a>
        <div style={{ color: accent, fontWeight: 800, fontSize: 14, letterSpacing: 2 }}>SOCK DESIGNER</div>
        <div style={{ color: "#444", fontSize: 10 }}>Nadwyraz · LEGS palette · DALL-E 3 + Nano Banana</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setSessionsOpen(o => !o)}
          style={{ background: "#2a2520", color: "#aaa", border: "1px solid #333", borderRadius: 6, padding: "5px 12px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
          📁 Historia ({sessions.length})
        </button>
        <button onClick={newSession}
          style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          + Nowy
        </button>
      </div>

      {/* SESSIONS DRAWER */}
      {sessionsOpen && (
        <div style={{ position: "absolute", top: 44, right: 20, width: 280, background: "#1a1814", border: "1px solid #333", borderRadius: 10, zIndex: 100, maxHeight: 400, overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          {sessions.length === 0 ? (
            <div style={{ padding: 16, color: "#666", fontSize: 11, textAlign: "center" }}>Brak zapisanych projektów</div>
          ) : sessions.map(s => (
            <div key={s.id} onClick={() => loadSession(s.id)}
              style={{ padding: "10px 14px", borderBottom: "1px solid #222", cursor: "pointer", background: s.id === currentSessionId ? "#2a2520" : "transparent" }}>
              <div style={{ color: s.id === currentSessionId ? accent : "#ddd", fontSize: 12, fontWeight: 700 }}>{s.title}</div>
              <div style={{ color: "#555", fontSize: 10 }}>{new Date(s.updated_at).toLocaleDateString("pl-PL")}</div>
            </div>
          ))}
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 420px", overflow: "hidden" }}>

        {/* CHAT */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #ede9e3" }}>

          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: "20px 20px 8px" }}>
            {messages.length === 0 && !streaming && (
              <div style={{ textAlign: "center", paddingTop: 60, color: "#bbb" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🧦</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 8 }}>Opisz kolekcję skarpetek</div>
                <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.7 }}>
                  np. "Fiat 126p Maluch, PRL, serduszka"<br />
                  "Warszawa nocą, neon, deszcz"<br />
                  "Góry Tatry, szlaki, niedźwiedź"
                </div>
              </div>
            )}
            {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
            {streaming && streamingText && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
                <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "#fff", border: "1px solid #ede9e3", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#1a1814" }}>
                  {streamingText}
                  <span style={{ display: "inline-block", width: 2, height: 14, background: accent, marginLeft: 2, animation: "blink 1s infinite", verticalAlign: "middle" }} />
                </div>
              </div>
            )}
            {streaming && !streamingText && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
                <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "#fff", border: "1px solid #ede9e3", color: "#bbb", fontSize: 13 }}>
                  ⏳ myślę...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #ede9e3", background: "#fff" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Opisz kolekcję… (Enter = wyślij, Shift+Enter = nowa linia)"
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", lineHeight: 1.6, resize: "none", outline: "none", minHeight: 44, maxHeight: 120, background: "#fdfcfa" }}
                rows={1}
              />
              <button onClick={sendMessage} disabled={!input.trim() || streaming}
                style={{ background: input.trim() && !streaming ? accent : "#eee", color: input.trim() && !streaming ? "#fff" : "#bbb", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 16, cursor: input.trim() && !streaming ? "pointer" : "not-allowed", fontFamily: "inherit", flexShrink: 0 }}>
                ↑
              </button>
            </div>
          </div>
        </div>

        {/* PANEL PRAWY */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "#fdfcfa" }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #ede9e3", flexShrink: 0 }}>
            {[["prompts", "Prompty"], ["palette", "Paleta"], ["spec", "Spec"]].map(([id, label]) => (
              <button key={id} onClick={() => setSideTab(id)}
                style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: sideTab === id ? `2px solid ${accent}` : "2px solid transparent", color: sideTab === id ? accent : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 14 }}>

            {/* TAB: PROMPTY */}
            {sideTab === "prompts" && (
              <div>
                {!brief ? (
                  <div style={{ textAlign: "center", paddingTop: 40, color: "#ccc", fontSize: 12 }}>
                    Prompty pojawią się po wygenerowaniu briefu w chacie
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 12, color: accent }}>{brief.collection_name}</div>
                      <button onClick={generateAll} disabled={anyImageLoading}
                        style={{ background: anyImageLoading ? "#eee" : "#1a1814", color: anyImageLoading ? "#aaa" : "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: anyImageLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                        {anyImageLoading ? "⏳" : "▶▶ Wszystkie 4"}
                      </button>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 8, color: "#555", borderBottom: "1px solid #ede9e3", paddingBottom: 4 }}>🧦 LEWA</div>
                    <PromptEditor label="lewa" engine="dalle"
                      value={prompts.dalleLeft} onChange={v => setPrompts(p => ({ ...p, dalleLeft: v }))}
                      onGenerate={() => generateImage("dalleLeft", "dalle", prompts.dalleLeft)}
                      loading={loadings.dalleLeft} imageUrl={imgs.dalleLeft} bgColor={brief?.left_sock?.background?.hex} />
                    <PromptEditor label="lewa" engine="gemini"
                      value={prompts.geminiLeft} onChange={v => setPrompts(p => ({ ...p, geminiLeft: v }))}
                      onGenerate={() => generateImage("geminiLeft", "gemini", prompts.geminiLeft)}
                      loading={loadings.geminiLeft} imageUrl={imgs.geminiLeft} bgColor={brief?.left_sock?.background?.hex} />

                    <div style={{ fontWeight: 800, fontSize: 11, margin: "12px 0 8px", color: "#555", borderBottom: "1px solid #ede9e3", paddingBottom: 4 }}>🧦 PRAWA</div>
                    <PromptEditor label="prawa" engine="dalle"
                      value={prompts.dalleRight} onChange={v => setPrompts(p => ({ ...p, dalleRight: v }))}
                      onGenerate={() => generateImage("dalleRight", "dalle", prompts.dalleRight)}
                      loading={loadings.dalleRight} imageUrl={imgs.dalleRight} bgColor={brief?.right_sock?.background?.hex} />
                    <PromptEditor label="prawa" engine="gemini"
                      value={prompts.geminiRight} onChange={v => setPrompts(p => ({ ...p, geminiRight: v }))}
                      onGenerate={() => generateImage("geminiRight", "gemini", prompts.geminiRight)}
                      loading={loadings.geminiRight} imageUrl={imgs.geminiRight} bgColor={brief?.right_sock?.background?.hex} />
                  </>
                )}
              </div>
            )}

            {/* TAB: PALETA */}
            {sideTab === "palette" && (
              <div>
                {!brief ? (
                  <div style={{ textAlign: "center", paddingTop: 40, color: "#ccc", fontSize: 12 }}>Paleta pojawi się po wygenerowaniu briefu</div>
                ) : (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 10, color: "#888" }}>KOLORY KOLEKCJI</div>
                    {(brief.palette || []).map((c, i) => <ColorSwatch key={i} color={c} />)}
                    <div style={{ marginTop: 14, padding: "8px 10px", background: "#f5f3ef", borderRadius: 8 }}>
                      <div style={{ fontSize: 9, color: "#bbb", fontWeight: 700, marginBottom: 6 }}>TŁA</div>
                      {[brief.left_sock?.background, brief.right_sock?.background].filter(Boolean).map((bg, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 3, background: bg.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                          <span style={{ fontSize: 10, color: "#666" }}>{i === 0 ? "Lewa" : "Prawa"}: LEGS {bg.legs_code} {bg.hex}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: SPEC */}
            {sideTab === "spec" && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 10, color: "#888" }}>SPECYFIKACJA TECHNICZNA</div>
                {[
                  ["Format", "BMP bitmap"],
                  ["Szerokość", "168 px"],
                  ["Rozmiary 41-46", "168 × 480 px"],
                  ["Rozmiary 36-40", "168 × 435 px"],
                  ["Maks. kolorów", "6 (LEGS)"],
                  ["Styl", "Flat 2D"],
                  ["Gradienty", "❌ zero"],
                  ["Margines", "max 1px"],
                  ["Lewa = Prawa", "❌ zawsze różne"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f0ede8", fontSize: 11 }}>
                    <span style={{ color: "#999" }}>{k}</span>
                    <span style={{ fontWeight: 700, color: "#1a1814" }}>{v}</span>
                  </div>
                ))}
                {brief?.designer_notes && (
                  <div style={{ marginTop: 14, padding: "10px 12px", background: "#fff8f0", borderRadius: 8, border: `1px solid ${accent}33` }}>
                    <div style={{ fontSize: 9, color: accent, fontWeight: 700, marginBottom: 6 }}>NOTATKI DLA GRAFIKA</div>
                    <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7 }}>{brief.designer_notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        textarea { overflow: hidden; }
        textarea:focus { border-color: ${accent} !important; }
      `}</style>
    </div>
  );
}
