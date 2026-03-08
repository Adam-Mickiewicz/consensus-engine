"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { saveDebate, loadDebates } from "../lib/supabase";

function useWindowSize() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

const THEMES = {
  light: {
    bg: "#f5f4f0", bgPanel: "#eeecea", bgCenter: "#f5f4f0",
    border: "#ddd9d2", text: "#1a1814", textSub: "#7a7570",
    textMuted: "#b0aca6", textLabel: "#9a9590",
    cardBg: "#fff", cardBorder: "#e0ddd6",
    inputBg: "#fff", inputBorder: "#d0ccc4",
    modeBtnBg: "#fff", logTime: "#c0bcb6", logText: "#6a6560",
    pendingDot: "#d8d4cc", pendingText: "#b0aca6",
    scrollTrack: "#eeecea", scrollThumb: "#d0ccc4",
    shadowCard: "0 1px 4px rgba(0,0,0,0.06)",
    dropzone: "#f0ede8", dropzoneBorder: "#c8c4bc", dropzoneHover: "#e8e4de",
    attachBg: "#f0ede8", attachBorder: "#d4d0c8",
    mdCode: "#f0ede8", mdCodeBorder: "#d4d0c8",
  },
  dark: {
    bg: "#0a0a0a", bgPanel: "#0a0a0a", bgCenter: "#0a0a0a",
    border: "#1a1a1a", text: "#e0e0e0", textSub: "#777",
    textMuted: "#444", textLabel: "#555",
    cardBg: "#0f0f0f", cardBorder: "#222",
    inputBg: "#0f0f0f", inputBorder: "#222",
    modeBtnBg: "transparent", logTime: "#333", logText: "#666",
    pendingDot: "#222", pendingText: "#444",
    scrollTrack: "#0a0a0a", scrollThumb: "#222",
    shadowCard: "none",
    dropzone: "#111", dropzoneBorder: "#2a2a2a", dropzoneHover: "#161616",
    attachBg: "#111", attachBorder: "#2a2a2a",
    mdCode: "#1a1a1a", mdCodeBorder: "#2a2a2a",
  },
};

const PROVIDERS = {
  openai: { name: "GPT-4o", color: "#0d9e6e", role: "Synthesizer", emoji: "⚡" },
  claude: { name: "Claude", color: "#b8763a", role: "Critical Analyst", emoji: "🔍" },
  gemini: { name: "Gemini", color: "#2563eb", role: "Wide-Angle Thinker", emoji: "🌐" },
};

const FOLLOWUP_TARGETS = [
  { id: "all", label: "Wszyscy 3", emoji: "🔄", desc: "Mini-debata wszystkich modeli" },
  { id: "openai", label: "GPT-4o", emoji: "⚡", desc: "Tylko Synthesizer" },
  { id: "claude", label: "Claude", emoji: "🔍", desc: "Tylko Critical Analyst" },
  { id: "gemini", label: "Gemini", emoji: "🌐", desc: "Tylko Wide-Angle Thinker" },
];

const MODES = [
  { id: "consensus", label: "Consensus", desc: "Pełna debata → jeden wynik", tooltip: "5 rund · modele analizują, krytykują i budują wspólną rekomendację · najdokładniejszy · ~3 min" },
  { id: "debate", label: "Debate", desc: "Wzajemna polemika modeli", tooltip: "3 rundy · modele ścierają się ze sobą bez finalnego konsensusu · dobry gdy chcesz zobaczyć różne perspektywy · ~2 min" },
  { id: "compare", label: "Compare", desc: "3 odpowiedzi obok siebie", tooltip: "1 runda · każdy model odpowiada niezależnie · szybki i tani · idealny do porównania podejść · ~30 sek" },
];

const DETAIL_LEVELS = [
  { id: "short", label: "Krótka", instruction: "Be concise. Maximum 150 words per field." },
  { id: "standard", label: "Standardowa", instruction: "Be thorough. Around 300 words per field." },
  { id: "detailed", label: "Szczegółowa", instruction: "Be very comprehensive and detailed. Minimum 500 words per field. Include examples, edge cases, and nuanced analysis." },
];

const OPENAI_MODELS = [
  { id: "gpt-5-mini", label: "GPT-5 mini", desc: "Nowy · tani · $0.03/debata" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", desc: "Sprawdzony · tani · $0.02/debata" },
  { id: "gpt-5.4", label: "GPT-5.4", desc: "Najmocniejszy · $0.15/debata" },
];

const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "2.5 Flash", desc: "Najlepszy balans · $0.02/debata" },
  { id: "gemini-2.5-pro", label: "2.5 Pro", desc: "Najmocniejszy · $0.20/debata" },
];

const AI_MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku", desc: "Szybki · ~$0.03/debata" },
  { id: "claude-sonnet-4-5", label: "Sonnet", desc: "Inteligentny · ~$0.50/debata" },
];

const ROUND_LABELS = {
  0: "Normalizacja problemu", 1: "Niezależna analiza",
  2: "Cross-review", 3: "Poprawiona propozycja",
  4: "Propozycja konsensusu", 5: "Finalna synteza",
};

const LANG = "Always respond in the same language as the user's question. If the question is in Polish, respond entirely in Polish. If in English, respond in English.";

const SYSTEM_PROMPTS = {
  openai: (detail, webSearch) => `You are a synthesizer AI expert in a multi-agent consensus system. Your role is to synthesize competing viewpoints into one practical, coherent, decision-ready recommendation. ${webSearch ? "You have access to web search — use it to find current, accurate information and cite your sources." : ""} ${detail} Use markdown formatting with **bold**, bullet points, and headers where appropriate. Respond ONLY in valid JSON with these exact fields: problem_definition (string), assumptions (string), proposed_solution (string), risks (string), tradeoffs (string), recommended_next_steps (string), confidence (number 0-100). ${LANG}`,
  claude: (detail, webSearch) => `You are a critical analyst AI in a multi-agent consensus system. Your role is to identify logical weaknesses, hidden assumptions, implementation risks, and ambiguities. ${webSearch ? "You have access to web search — use it to verify claims." : ""} ${detail} OUTPUT RULES: Respond with a single-line JSON object. Do NOT use newlines or line breaks inside any string value — use a space instead. No markdown headers inside values. Fields: problem_definition, assumptions, proposed_solution, risks, tradeoffs, recommended_next_steps, confidence (0-100). ${LANG}`,
  gemini: (detail, webSearch) => `You are a wide-angle thinker AI in a multi-agent consensus system. Your role is to broaden the perspective, identify alternatives, edge cases, and non-obvious opportunities. ${webSearch ? "You have access to web search — use it to discover recent developments, alternatives, and real-world examples. Cite sources." : ""} ${detail} Use markdown formatting with **bold**, bullet points, and headers where appropriate. Respond ONLY in valid JSON with these exact fields: problem_definition (string), assumptions (string), proposed_solution (string), risks (string), tradeoffs (string), recommended_next_steps (string), confidence (number 0-100). ${LANG}`,
};

const CROSS_REVIEW_PROMPT = (myRole, summaries, detail) => `You are the ${myRole}. Review these summaries and provide critical cross-review. ${summaries} ${detail} OUTPUT RULES: Single-line JSON object, no newlines inside values, ALL fields must be plain strings (no arrays). Fields: agreed_with (string), weaknesses_found (string), missing_elements (string), suggested_changes (string), my_revised_position (string). ${LANG}`;
const REVISED_PROMPT = (myRole, reviews, detail) => `You are the ${myRole}. Based on cross-reviews, create revised proposal. ${reviews} ${detail} OUTPUT RULES: Single-line JSON, no newlines inside string values. Fields: retained_points, changed_points, rejected_points, revised_solution, updated_risks, confidence (0-100). ${LANG}`;
const CONSENSUS_PROMPT = (all, detail) => `You are the Consensus Builder. Here are revised proposals from three AI experts: ${all} Build the BEST POSSIBLE consensus. CRITICAL: Start final_recommendation with YES, NO, or CONDITIONAL. ${detail} OUTPUT RULES: Single-line JSON, no newlines inside string values. Fields: final_recommendation, rationale, agreed_points (array), disputed_but_resolved_points (array), unresolved_questions (array), action_plan (array), confidence_score (0-100). ${LANG}`;
const SINGLE_FOLLOWUP_PROMPT = (role, consensus, question, detail) => `You are the ${role} in a multi-agent AI system. The previous consensus was: ${consensus} The user asks: ${question} ${detail} Respond from your unique perspective. Use markdown. Respond ONLY in valid JSON: final_recommendation (string), rationale (string), agreed_points (array of strings), disputed_but_resolved_points (array of strings), unresolved_questions (array of strings), action_plan (array of strings), confidence_score (number 0-100). ${LANG}`;
const ALL_FOLLOWUP_PROMPT = (consensus, question, detail) => `You are the Consensus Builder. Previous consensus: ${consensus} New question from user: ${question} Re-engage all perspectives and build updated consensus. ${detail} Use rich markdown. Respond ONLY in valid JSON: final_recommendation (string), rationale (string), agreed_points (array of strings), disputed_but_resolved_points (array of strings), unresolved_questions (array of strings), action_plan (array of strings), confidence_score (number 0-100). ${LANG}`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function toStr(val) {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) return val.join("\n");
  if (typeof val === "object") return Object.values(val).filter(v => typeof v === "string").join("\n\n");
  const s = String(val)
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"");
  // Jeśli to surowy JSON - sparsuj i wyciągnij wartości
  if (s.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(s);
      return Object.values(parsed).filter(v => typeof v === "string" || Array.isArray(v)).map(v => Array.isArray(v) ? v.join("\n") : v).join("\n\n");
    } catch(e) {
      // Wyciągnij wartości regexem
      const vals = [];
      const re = /"\w+"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let m;
      while ((m = re.exec(s)) !== null) vals.push(m[1].replace(/\\n/g, "\n"));
      if (vals.length > 0) return vals.join("\n\n");
    }
  }
  return s;
}

async function callAPI(provider, systemPrompt, userMessage, pdfBase64 = null, useWebSearch = false) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, systemPrompt, userMessage, pdfBase64, useWebSearch, aiModel: window.__aiModel || "claude-haiku-4-5-20251001", openaiModel: window.__openaiModel || "gpt-5-mini", geminiModel: window.__geminiModel || "gemini-2.5-flash" }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`[${provider.toUpperCase()}] ${data.error}`);
  try {
    const parsed = JSON.parse(data.text);
    if (data.citations?.length) parsed._citations = data.citations;
    return parsed;
  } catch {
    return { raw: data.text, proposed_solution: data.text, _citations: data.citations || [] };
  }
}

function summarize(obj) {
  if (!obj) return "";
  if (obj.proposed_solution) return `Solution: ${toStr(obj.proposed_solution)}\nRisks: ${toStr(obj.risks)}`;
  if (obj.revised_solution) return `Revised: ${toStr(obj.revised_solution)}`;
  return JSON.stringify(obj).slice(0, 400);
}

function buildPrompt(problem, contextText, attachments) {
  let full = problem.trim();
  if (contextText.trim()) full += `\n\n--- KONTEKST ---\n${contextText.trim()}`;
  for (const att of attachments.filter(a => typeof a.content === "string"))
    full += `\n\n--- ZAŁĄCZNIK: ${att.name} ---\n${att.content.slice(0, 8000)}`;
  return full;
}

async function extractText(file) {
  const name = file.name.toLowerCase();
  if (/\.(txt|md|csv|json|js|ts|py|html)$/.test(name)) return await file.text();
  if (name.endsWith(".pdf")) {
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ isPDF: true, base64: r.result.split(",")[1], name: file.name });
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  throw new Error("Nieobsługiwany format");
}

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1a1814", color: "#fff", fontSize: 11, padding: "5px 10px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 999, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", pointerEvents: "none" }}>
          {text}
        </span>
      )}
    </span>
  );
}

function MD({ content, t }) {
  if (!content) return null;
  return (
    <div style={{ fontSize: 12, lineHeight: 1.7, color: t.text }}>
      <ReactMarkdown components={{
        p: ({ children }) => <p style={{ margin: "0 0 8px", opacity: 0.85 }}>{children}</p>,
        strong: ({ children }) => <strong style={{ fontWeight: 700, color: t.text }}>{children}</strong>,
        ul: ({ children }) => <ul style={{ margin: "4px 0 8px", paddingLeft: 18 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: "4px 0 8px", paddingLeft: 18 }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: 3, opacity: 0.85 }}>{children}</li>,
        h1: ({ children }) => <div style={{ fontWeight: 800, fontSize: 13, color: t.text, margin: "10px 0 4px" }}>{children}</div>,
        h2: ({ children }) => <div style={{ fontWeight: 700, fontSize: 12, color: t.text, margin: "8px 0 4px" }}>{children}</div>,
        h3: ({ children }) => <div style={{ fontWeight: 700, fontSize: 12, color: t.textSub, margin: "6px 0 3px" }}>{children}</div>,
        code: ({ children }) => <code style={{ background: t.mdCode, border: `1px solid ${t.mdCodeBorder}`, borderRadius: 4, padding: "1px 5px", fontSize: 11, fontFamily: "monospace" }}>{children}</code>,
        blockquote: ({ children }) => <div style={{ borderLeft: "3px solid #b8763a", paddingLeft: 10, margin: "6px 0", opacity: 0.8 }}>{children}</div>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#b8763a", textDecoration: "underline" }}>{children}</a>,
      }}>{content}</ReactMarkdown>
    </div>
  );
}

function Citations({ citations, t }) {
  if (!citations?.length) return null;
  return (
    <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(37,99,235,0.05)", borderRadius: 8, border: "1px solid rgba(37,99,235,0.15)" }}>
      <div style={{ color: "#2563eb", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>🔗 ŹRÓDŁA WEB</div>
      {citations.map((c, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontSize: 11, textDecoration: "none", opacity: 0.85 }}>
            [{i + 1}] {c.title || c.url}
          </a>
        </div>
      ))}
    </div>
  );
}

function WebSearchToggle({ value, onChange, t, small = false }) {
  return (
    <div onClick={() => onChange(!value)} style={{ display: "flex", alignItems: "center", gap: small ? 8 : 10, padding: small ? "8px 12px" : "10px 14px", borderRadius: small ? 8 : 10, border: `1px solid ${value ? "#2563eb55" : t.border}`, background: value ? "rgba(37,99,235,0.06)" : t.modeBtnBg, cursor: "pointer", userSelect: "none" }}>
      <div style={{ width: small ? 28 : 36, height: small ? 16 : 20, borderRadius: 10, background: value ? "#2563eb" : t.pendingDot, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 2, left: value ? (small ? 14 : 18) : 2, width: small ? 12 : 16, height: small ? 12 : 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </div>
      <div>
        <div style={{ color: value ? "#2563eb" : t.textSub, fontSize: small ? 11 : 12, fontWeight: 700 }}>🌐 Web Search</div>
        {!small && <div style={{ color: t.textMuted, fontSize: 10 }}>{value ? "Modele przeszukują internet i cytują źródła" : "Modele korzystają tylko z wiedzy treningowej"}</div>}
      </div>
    </div>
  );
}

function ThemeToggle({ dark, onToggle, t }) {
  return (
    <button onClick={onToggle} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 20, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, color: t.textSub, display: "flex", alignItems: "center", gap: 5 }}>
      <span>{dark ? "☀️" : "🌙"}</span><span>{dark ? "Jasny" : "Ciemny"}</span>
    </button>
  );
}

function RoundBadge({ n, status, t }) {
  const color = status === "done" ? "#0d9e6e" : status === "active" ? "#b8763a" : t.pendingDot;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: status === "pending" ? t.textMuted : "#fff", transition: "background 0.4s", boxShadow: status === "active" ? "0 0 10px #b8763a60" : "none" }}>{n}</div>
      <span style={{ fontSize: 12, color: status === "pending" ? t.pendingText : t.textSub }}>{ROUND_LABELS[n]}</span>
    </div>
  );
}

function ModelCard({ id, data, t }) {
  const [expanded, setExpanded] = useState(false);
  const p = PROVIDERS[id];
  if (!data) return (
    <div style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: 16, opacity: 0.45, background: t.cardBg }}>
      <div style={{ color: p.color, fontWeight: 700, fontSize: 13 }}>{p.emoji} {p.name}</div>
      <div style={{ color: t.textMuted, fontSize: 12, marginTop: 6 }}>Oczekuje...</div>
    </div>
  );
  const main = toStr(data.proposed_solution || data.revised_solution || data.final_recommendation || data.my_revised_position || data.raw || "");
  const confidence = data.confidence ?? data.confidence_score;
  const citations = data._citations || [];
  return (
    <div style={{ border: `1px solid ${p.color}30`, borderRadius: 12, padding: 16, background: t.cardBg, boxShadow: t.shadowCard }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ color: p.color, fontWeight: 700, fontSize: 13 }}>
          {p.emoji} {p.name}
          {citations.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, color: "#2563eb" }}>🌐 {citations.length}</span>}
        </div>
        {confidence != null && (
          <Tooltip text="Poziom pewności modelu co do swojej odpowiedzi (0–100%)">
            <div style={{ background: `${p.color}16`, color: p.color, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700, cursor: "help" }}>{confidence}% ℹ</div>
          </Tooltip>
        )}
      </div>
      <div style={{ maxHeight: expanded ? "none" : 120, overflow: "hidden", position: "relative" }}>
        <MD content={main} t={t} />
        {!expanded && main.length > 300 && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: `linear-gradient(transparent, ${t.cardBg})` }} />}
      </div>
      {main.length > 300 && (
        <button onClick={() => setExpanded(!expanded)} style={{ marginTop: 8, background: "none", border: `1px solid ${p.color}30`, color: p.color, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
          {expanded ? "Zwiń" : "Rozwiń"}
        </button>
      )}
      {expanded && data.risks && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(200,60,30,0.05)", borderRadius: 8, border: "1px solid rgba(200,60,30,0.15)" }}>
          <div style={{ color: "#b83020", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚠ Ryzyka</div>
          <MD content={toStr(data.risks)} t={t} />
        </div>
      )}
      {expanded && <Citations citations={citations} t={t} />}
    </div>
  );
}

function ImageGenerator({ problem, consensus, t }) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [error, setError] = useState(null);
  const accent = "#b8763a";

  async function generate() {
    setLoading(true);
    setError(null);
    setImageUrl(null);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, consensus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setImageUrl(data.imageUrl);
      setImagePrompt(data.imagePrompt);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ marginTop: 16, padding: "16px 20px", background: "rgba(184,118,58,0.05)", borderRadius: 12, border: `1px solid rgba(184,118,58,0.2)` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🎨</span>
          <div>
            <div style={{ color: accent, fontWeight: 700, fontSize: 12 }}>Generuj wizualizację</div>
            <div style={{ color: t.textMuted, fontSize: 10 }}>DALL-E 3 · Claude opisuje, AI rysuje</div>
          </div>
        </div>
        <button onClick={generate} disabled={loading} style={{ background: loading ? t.cardBorder : accent, color: loading ? t.textMuted : "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 11, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {loading ? "⏳ Generuję..." : imageUrl ? "↺ Ponownie" : "▶ Generuj"}
        </button>
      </div>
      {error && <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(200,60,30,0.08)", borderRadius: 8, color: "#b83020", fontSize: 11 }}>❌ {error}</div>}
      {imageUrl && (
        <div style={{ marginTop: 14 }}>
          <img src={imageUrl} alt="AI visualization" style={{ width: "100%", borderRadius: 10, border: `1px solid ${t.border}`, display: "block" }} />
          {imagePrompt && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: t.bg, borderRadius: 8, border: `1px solid ${t.border}` }}>
              <div style={{ color: t.textLabel, fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>PROMPT DALL-E</div>
              <div style={{ color: t.textMuted, fontSize: 10, lineHeight: 1.6 }}>{imagePrompt}</div>
            </div>
          )}
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, color: accent, fontSize: 11, textDecoration: "none" }}>↗ Otwórz pełny rozmiar</a>
        </div>
      )}
    </div>
  );
}

function FollowupSection({ t, onFollowup, followupLoading }) {
  const [question, setQuestion] = useState("");
  const [target, setTarget] = useState("all");
  const [localWebSearch, setLocalWebSearch] = useState(false);
  const accent = "#b8763a";
  return (
    <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 20, marginTop: 16 }}>
      <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10 }}>POGŁĘB ANALIZĘ</div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: t.textSub, fontSize: 11, marginBottom: 8 }}>Kto ma odpowiedzieć?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          {FOLLOWUP_TARGETS.map(ft => (
            <Tooltip key={ft.id} text={ft.desc}>
              <button onClick={() => setTarget(ft.id)} style={{ width: "100%", background: target === ft.id ? `${ft.id === "all" ? accent : PROVIDERS[ft.id]?.color || accent}14` : t.modeBtnBg, border: `1px solid ${target === ft.id ? (ft.id === "all" ? accent : PROVIDERS[ft.id]?.color || accent) : t.border}`, borderRadius: 8, padding: "7px 4px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
                <div style={{ fontSize: 14 }}>{ft.emoji}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: target === ft.id ? (ft.id === "all" ? accent : PROVIDERS[ft.id]?.color || accent) : t.textSub, marginTop: 2 }}>{ft.label}</div>
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <WebSearchToggle value={localWebSearch} onChange={setLocalWebSearch} t={t} small={true} />
      </div>
      <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="np. Jakie są konkretne koszty wdrożenia? Co gdyby budżet był 2x mniejszy?" style={{ width: "100%", minHeight: 80, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: 12, color: t.text, fontSize: 12, fontFamily: "inherit", lineHeight: 1.65, resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
      <button onClick={() => { if (question.trim()) { onFollowup(question, target, localWebSearch); setQuestion(""); } }} disabled={!question.trim() || followupLoading} style={{ background: question.trim() && !followupLoading ? accent : t.cardBorder, color: question.trim() && !followupLoading ? "#fff" : t.textMuted, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: question.trim() && !followupLoading ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
        {followupLoading ? "⏳ Trwa analiza..." : `↩ Zapytaj ${FOLLOWUP_TARGETS.find(f => f.id === target)?.label}${localWebSearch ? " 🌐" : ""}`}
      </button>
    </div>
  );
}

function ConsensusView({ data, t, onFollowup, followupLoading, followupResponses, problem, debateId }) {
  if (!data) return null;
  const agreedPoints = Array.isArray(data.agreed_points) ? data.agreed_points : [];
  const resolvedPoints = Array.isArray(data.disputed_but_resolved_points) ? data.disputed_but_resolved_points : [];
  const actionPlan = Array.isArray(data.action_plan) ? data.action_plan : [];
  const unresolved = Array.isArray(data.unresolved_questions) ? data.unresolved_questions : [];
  const citations = data._citations || [];
  const [linkCopied, setLinkCopied] = useState(false);

  function copyLink() {
    if (debateId) {
      navigator.clipboard.writeText(`${window.location.origin}/debate/${debateId}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  return (
    <div style={{ border: "1px solid rgba(13,158,110,0.28)", borderRadius: 16, padding: 24, background: t.cardBg, boxShadow: t.shadowCard, marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ color: "#0d9e6e", fontWeight: 800, fontSize: 17 }}>
              Finalny Konsensus
              {citations.length > 0 && <span style={{ marginLeft: 10, fontSize: 11, color: "#2563eb", fontWeight: 400 }}>🌐 {citations.length} źródeł</span>}
            </div>
            {data.confidence_score != null && (
              <Tooltip text="Ogólny poziom pewności konsensusu wszystkich modeli (0–100%)">
                <span style={{ color: t.textSub, fontSize: 12, cursor: "help" }}>Pewność: {data.confidence_score}% ℹ</span>
              </Tooltip>
            )}
          </div>
        </div>
        {debateId && (
          <button onClick={copyLink} style={{ background: linkCopied ? "#0d9e6e" : "none", color: linkCopied ? "#fff" : "#2563eb", border: `1px solid ${linkCopied ? "#0d9e6e" : "#2563eb"}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, transition: "all 0.2s" }}>
            {linkCopied ? "✓ Skopiowano!" : "🔗 Kopiuj link"}
          </button>
        )}
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>FINALNA REKOMENDACJA</div>
        <MD content={toStr(data.final_recommendation)} t={t} />
      </div>

      {data.rationale && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>UZASADNIENIE</div>
          <MD content={toStr(data.rationale)} t={t} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        {agreedPoints.length > 0 && (
          <div style={{ background: "rgba(13,158,110,0.07)", borderRadius: 10, padding: 14, border: "1px solid rgba(13,158,110,0.16)" }}>
            <div style={{ color: "#0d9e6e", fontWeight: 700, marginBottom: 8, fontSize: 12 }}>✓ Punkty zgodne</div>
            {agreedPoints.map((pt, i) => <div key={i} style={{ color: t.textSub, fontSize: 11, marginBottom: 4 }}>• {toStr(pt)}</div>)}
          </div>
        )}
        {resolvedPoints.length > 0 && (
          <div style={{ background: "rgba(184,118,58,0.07)", borderRadius: 10, padding: 14, border: "1px solid rgba(184,118,58,0.18)" }}>
            <div style={{ color: "#b8763a", fontWeight: 700, marginBottom: 8, fontSize: 12 }}>⟳ Rozwiązane spory</div>
            {resolvedPoints.map((pt, i) => <div key={i} style={{ color: t.textSub, fontSize: 11, marginBottom: 4 }}>• {toStr(pt)}</div>)}
          </div>
        )}
      </div>

      {unresolved.length > 0 && (
        <div style={{ marginBottom: 18, padding: "12px 14px", background: "rgba(200,60,30,0.05)", borderRadius: 10, border: "1px solid rgba(200,60,30,0.12)" }}>
          <div style={{ color: "#b83020", fontWeight: 700, marginBottom: 8, fontSize: 12 }}>❓ Nierozwiązane pytania</div>
          {unresolved.map((q, i) => <div key={i} style={{ color: t.textSub, fontSize: 11, marginBottom: 4 }}>• {toStr(q)}</div>)}
        </div>
      )}

      {actionPlan.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10 }}>PLAN DZIAŁAŃ</div>
          {actionPlan.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <div style={{ minWidth: 20, height: 20, borderRadius: "50%", background: "#0d9e6e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ color: t.text, fontSize: 12, paddingTop: 2 }}>{toStr(step)}</div>
            </div>
          ))}
        </div>
      )}

      <Citations citations={citations} t={t} />
      <ImageGenerator problem={problem} consensus={toStr(data.final_recommendation)} t={t} />

      {followupResponses.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {followupResponses.map((fr, i) => (
            <div key={i} style={{ marginBottom: 16, padding: 16, background: t.bg, borderRadius: 12, border: `1px solid ${t.border}` }}>
              <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>ODPOWIEDŹ #{i + 1}</div>
              <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 10, fontStyle: "italic" }}>
                "{fr.question.slice(0, 80)}{fr.question.length > 80 ? "…" : ""}" → {fr.target === "all" ? "Wszyscy 3" : PROVIDERS[fr.target]?.name}
                {fr.webSearch && <span style={{ color: "#2563eb", marginLeft: 6 }}>🌐</span>}
              </div>
              <MD content={toStr(fr.data?.final_recommendation || fr.data?.proposed_solution)} t={t} />
              <Citations citations={fr.data?._citations || []} t={t} />
            </div>
          ))}
        </div>
      )}

      <FollowupSection t={t} onFollowup={onFollowup} followupLoading={followupLoading} />
    </div>
  );
}

function FileDropzone({ attachments, setAttachments, t, accent }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
  async function processFiles(files) {
    setLoading(true);
    const results = [];
    for (const file of Array.from(files)) {
      try {
        const content = await extractText(file);
        results.push({ name: file.name, size: file.size, content, error: null });
      } catch (e) {
        results.push({ name: file.name, size: file.size, content: null, error: e.message });
      }
    }
    setAttachments(prev => [...prev, ...results]);
    setLoading(false);
  }
  return (
    <div>
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }} onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${dragging ? accent : t.dropzoneBorder}`, borderRadius: 10, padding: "14px 20px", background: dragging ? t.dropzoneHover : t.dropzone, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>{loading ? "⏳" : "📎"}</span>
        <div>
          <div style={{ color: t.textSub, fontSize: 12, fontWeight: 600 }}>{loading ? "Ekstrahuję tekst..." : "Przeciągnij plik lub kliknij"}</div>
          <div style={{ color: t.textMuted, fontSize: 10, marginTop: 2 }}>PDF, TXT, MD, CSV, JSON, JS, PY…</div>
        </div>
        <input ref={fileRef} type="file" multiple accept=".txt,.md,.csv,.json,.pdf,.js,.ts,.py,.html" style={{ display: "none" }} onChange={e => processFiles(e.target.files)} />
      </div>
      {attachments.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {attachments.map((att, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: t.attachBg, border: `1px solid ${att.error ? "#c0392b44" : t.attachBorder}` }}>
              <span style={{ fontSize: 14 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: att.error ? "#c0392b" : t.text, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                <div style={{ color: t.textMuted, fontSize: 10 }}>{att.error ? `❌ ${att.error}` : att.content?.isPDF ? "PDF · wysyłany jako dokument" : `${typeof att.content === "string" ? att.content.length.toLocaleString() + " znaków" : ""}`}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); setAttachments(prev => prev.filter((_, j) => j !== i)); }} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 16 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContextField({ value, onChange, t, accent }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, color: t.textSub, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{open ? "▾" : "▸"}</span>
        <span>Wklej kontekst / treść dokumentu</span>
        {value.trim() && <span style={{ background: `${accent}20`, color: accent, borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{value.length.toLocaleString()} znaków</span>}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <textarea value={value} onChange={e => onChange(e.target.value)} placeholder="Wklej tutaj treść dokumentu, umowę, dane..." style={{ width: "100%", minHeight: 120, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 10, padding: 14, color: t.text, fontSize: 12, fontFamily: "inherit", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          {value.trim() && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}><button onClick={() => onChange("")} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 11, fontFamily: "inherit" }}>Wyczyść ×</button></div>}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ debates, onLoad, t, accent }) {
  if (debates.length === 0) return (
    <div style={{ color: t.textMuted, fontSize: 11, textAlign: "center", padding: "20px 0" }}>Brak historii debat</div>
  );
  return (
    <div>
      {debates.map((d) => (
        <div key={d.id} onClick={() => onLoad(d)} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}`, marginBottom: 6, cursor: "pointer", background: t.modeBtnBg }} onMouseEnter={e => e.currentTarget.style.borderColor = accent} onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
          <div style={{ color: t.text, fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{d.problem.slice(0, 60)}{d.problem.length > 60 ? "…" : ""}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: t.textMuted, fontSize: 10 }}>{new Date(d.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            <span style={{ background: `${accent}20`, color: accent, fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 5px" }}>{d.mode}</span>
            {d.web_search && <span style={{ color: "#2563eb", fontSize: 10 }}>🌐</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConsensusEngine() {
  const [dark, setDark] = useState(false);
  const t = THEMES[dark ? "dark" : "light"];
  const accent = "#b8763a";
  const width = useWindowSize();
  const isMobile = width < 768;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [contextText, setContextText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [mode, setMode] = useState("consensus");
  const [detailLevel, setDetailLevel] = useState("standard");
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [phase, setPhase] = useState("input");
  const [currentRound, setCurrentRound] = useState(0);
  const [rounds, setRounds] = useState({});
  const [consensus, setConsensus] = useState(null);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followupResponses, setFollowupResponses] = useState([]);
  const [log, setLog] = useState([]);
  const [debates, setDebates] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentDebateId, setCurrentDebateId] = useState(null);
  const [aiModel, setAiModel] = useState("claude-haiku-4-5-20251001");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeProviders, setActiveProviders] = useState(["openai", "claude", "gemini"]);
  const [selectedOpenaiModel, setSelectedOpenaiModel] = useState("gpt-4o-mini");
  const [selectedGeminiModel, setSelectedGeminiModel] = useState("gemini-2.5-flash");
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);
  useEffect(() => { if (typeof window !== "undefined") window.__aiModel = aiModel; }, [aiModel]);
  useEffect(() => { if (typeof window !== "undefined") window.__openaiModel = selectedOpenaiModel; }, [selectedOpenaiModel]);
  useEffect(() => { if (typeof window !== "undefined") window.__geminiModel = selectedGeminiModel; }, [selectedGeminiModel]);

  useEffect(() => {
    loadDebates().then(setDebates).catch(console.error);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("loadDebate");
      if (saved) {
        sessionStorage.removeItem("loadDebate");
        try {
          const d = JSON.parse(saved);
          handleLoadDebate(d);
        } catch {}
      }
    }
  }, []);

  function addLog(msg) { setLog(l => [...l, { time: new Date().toLocaleTimeString(), msg }]); }
  const detail = DETAIL_LEVELS.find(d => d.id === detailLevel)?.instruction || "";

  function handleLoadDebate(d) {
    setProblem(d.problem);
    setMode(d.mode || "consensus");
    setDetailLevel(d.detail_level || "standard");
    setUseWebSearch(d.web_search || false);
    setRounds(d.rounds || {});
    setConsensus(d.consensus || null);
    setFollowupResponses(d.followup_responses || []);
    setCurrentDebateId(d.id || null);
    setPhase("done");
    setShowHistory(false);
    setLog([{ time: new Date().toLocaleTimeString(), msg: "📂 Załadowano z historii" }]);
  }

  async function run() {
    if (!problem.trim()) return;
    setPhase("running"); setRounds({}); setConsensus(null); setLog([]); setCurrentRound(0); setFollowupResponses([]); setCurrentDebateId(null);
    const fullPrompt = buildPrompt(problem, contextText, attachments);
    const pdfAtt = attachments.find(a => a.content?.isPDF);
    let finalRounds = {};
    let finalConsensus = null;
    try {
      setCurrentRound(1);
      addLog(`Runda 1: Niezależna analiza${useWebSearch ? " 🌐" : ""}...`);
      const r1 = {};
      await Promise.all(activeProviders.map(async (id) => {
        addLog(`  ${PROVIDERS[id].emoji} ${PROVIDERS[id].name} analizuje...`);
        try {
          const res = await callAPI(id, SYSTEM_PROMPTS[id](detail, useWebSearch), fullPrompt, pdfAtt?.content?.base64, useWebSearch);
          r1[id] = res;
          addLog(`  ${PROVIDERS[id].emoji} gotowy (${res.confidence ?? "?"}%)`);
        } catch(e) {
          addLog(`  ${PROVIDERS[id].emoji} ❌ ${PROVIDERS[id].name} błąd: ${e.message.slice(0,80)}`);
          r1[id] = { proposed_solution: "Błąd modelu: " + e.message, confidence: 0 };
        }
      }));
      setRounds(prev => ({ ...prev, 1: r1 }));
      finalRounds = { 1: r1 };
      if (mode === "compare") {
        const saved = await saveDebate({ problem, mode, detailLevel, webSearch: useWebSearch, rounds: finalRounds, consensus: null, followupResponses: [] }).catch(console.error);
        if (saved?.id) setCurrentDebateId(saved.id);
        loadDebates().then(setDebates).catch(console.error);
        setPhase("done"); return;
      }

      addLog("⏳ Pauza 30s...");
      await sleep(10000);
      setCurrentRound(2);
      addLog("Runda 2: Cross-review...");
      const r2 = {};
      await Promise.all(activeProviders.map(async (id) => {
        const others = Object.entries(r1).filter(([k]) => k !== id).map(([k, v]) => `${PROVIDERS[k].name}: ${summarize(v)}`).join("\n\n");
        r2[id] = await callAPI(id, `You are the ${PROVIDERS[id].role}.`, CROSS_REVIEW_PROMPT(PROVIDERS[id].role, others, detail), null, false);
        addLog(`  ${PROVIDERS[id].emoji} cross-review gotowy`);
      }));
      setRounds(prev => ({ ...prev, 2: r2 }));
      finalRounds = { ...finalRounds, 2: r2 };

      addLog("⏳ Pauza 30s...");
      await sleep(10000);
      setCurrentRound(3);
      addLog("Runda 3: Poprawione propozycje...");
      const r3 = {};
      await Promise.all(activeProviders.map(async (id) => {
        const reviews = Object.entries(r2).filter(([k]) => k !== id).map(([k, v]) => `${PROVIDERS[k].name}: ${summarize(v)}`).join("\n\n");
        r3[id] = await callAPI(id, `You are the ${PROVIDERS[id].role}.`, REVISED_PROMPT(PROVIDERS[id].role, reviews, detail), null, false);
        addLog(`  ${PROVIDERS[id].emoji} propozycja poprawiona`);
      }));
      setRounds(prev => ({ ...prev, 3: r3 }));
      finalRounds = { ...finalRounds, 3: r3 };
      if (mode === "debate") {
        const saved = await saveDebate({ problem, mode, detailLevel, webSearch: useWebSearch, rounds: finalRounds, consensus: null, followupResponses: [] }).catch(console.error);
        if (saved?.id) setCurrentDebateId(saved.id);
        loadDebates().then(setDebates).catch(console.error);
        setPhase("done"); return;
      }

      addLog("⏳ Pauza 30s...");
      await sleep(10000);
      setCurrentRound(4);
      addLog("Runda 4→5: Budowanie konsensusu...");
      const allRevised = Object.entries(r3).map(([k, v]) => `${PROVIDERS[k].name}: ${summarize(v)}`).join("\n\n");
      const fin = await callAPI("claude", "You are the Consensus Builder.", CONSENSUS_PROMPT(allRevised, detail), null, false);
      setConsensus(fin);
      finalConsensus = fin;
      setCurrentRound(5);
      addLog("✅ Konsensus gotowy!");
      const saved = await saveDebate({ problem, mode, detailLevel, webSearch: useWebSearch, rounds: finalRounds, consensus: finalConsensus, followupResponses: [] }).catch(console.error);
      if (saved?.id) setCurrentDebateId(saved.id);
      loadDebates().then(setDebates).catch(console.error);
    } catch (e) {
      addLog("❌ Błąd: " + e.message);
    }
    setPhase("done");
  }

  async function handleFollowup(question, target, webSearch = false) {
    setFollowupLoading(true);
    const targetLabel = FOLLOWUP_TARGETS.find(f => f.id === target)?.label;
    addLog(`❓ [${targetLabel}${webSearch ? " 🌐" : ""}]: ${question.slice(0, 50)}...`);
    try {
      const consensusSummary = toStr(consensus?.final_recommendation || "").slice(0, 800);
      let data;
      if (target === "all") {
        data = await callAPI("claude", "You are the Consensus Builder.", ALL_FOLLOWUP_PROMPT(consensusSummary, question, detail), null, webSearch);
      } else {
        const p = PROVIDERS[target];
        data = await callAPI(target, SYSTEM_PROMPTS[target](detail, webSearch), SINGLE_FOLLOWUP_PROMPT(p.role, consensusSummary, question, detail), null, webSearch);
      }
      addLog("✅ Odpowiedź gotowa!");
      setFollowupResponses(prev => [...prev, { question, target, webSearch, data }]);
    } catch (e) {
      addLog("❌ Błąd: " + e.message);
    }
    setFollowupLoading(false);
  }

  const roundStatuses = Array.from({ length: 6 }, (_, i) => phase === "input" ? "pending" : i < currentRound ? "done" : i === currentRound ? "active" : "pending");

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'IBM Plex Mono', 'Courier New', monospace", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "260px 1fr 300px", transition: "background 0.3s", position: "relative" }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 998 }} />
      )}
      <div style={{ borderRight: `1px solid ${t.border}`, padding: 24, overflowY: "auto", background: t.bgPanel, ...(isMobile ? { position: "fixed", top: 0, left: sidebarOpen ? 0 : "-280px", width: 260, height: "100vh", zIndex: 999, transition: "left 0.3s", boxShadow: sidebarOpen ? "4px 0 20px rgba(0,0,0,0.2)" : "none" } : {}) }}>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><div style={{ color: accent, fontWeight: 800, fontSize: 15, letterSpacing: 2 }}>CONSENSUS</div><div style={{ color: t.textMuted, fontSize: 11, letterSpacing: 1 }}>ENGINE v1.0</div></div>
          <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)} t={t} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <button onClick={() => { setPhase("input"); setRounds({}); setConsensus(null); setLog([]); setCurrentRound(0); setFollowupResponses([]); setCurrentDebateId(null); }} style={{ display: "block", width: "100%", background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 12px", marginBottom: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
            + Nowa debata
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2 }}>HISTORIA ({debates.length})</div>
            <button onClick={() => setShowHistory(h => !h)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textSub, fontSize: 11, fontFamily: "inherit" }}>{showHistory ? "▴ ukryj" : "▾ pokaż"}</button>
          </div>
          {showHistory && <HistoryPanel debates={debates} onLoad={handleLoadDebate} t={t} accent={accent} />}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10 }}>TRYB PRACY</div>
          {MODES.map(m => (
            <Tooltip key={m.id} text={m.tooltip}>
              <button onClick={() => setMode(m.id)} style={{ display: "block", width: "100%", textAlign: "left", background: mode === m.id ? `${accent}12` : t.modeBtnBg, border: `1px solid ${mode === m.id ? `${accent}38` : t.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 6, cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ color: mode === m.id ? accent : t.textSub, fontSize: 12, fontWeight: 700 }}>{m.label} ℹ</div>
                <div style={{ color: t.textMuted, fontSize: 10, marginTop: 1 }}>{m.desc}</div>
              </button>
            </Tooltip>
          ))}
        </div>
        <div style={{ marginBottom: 24 }}>
          <Tooltip text="Określa jak szczegółowe mają być odpowiedzi modeli">
            <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10, cursor: "help" }}>SZCZEGÓŁOWOŚĆ ℹ</div>
          </Tooltip>
          <div style={{ display: "flex", gap: 6 }}>
            {DETAIL_LEVELS.map(d => (
              <button key={d.id} onClick={() => setDetailLevel(d.id)} style={{ flex: 1, background: detailLevel === d.id ? `${accent}12` : t.modeBtnBg, border: `1px solid ${detailLevel === d.id ? `${accent}38` : t.border}`, borderRadius: 8, padding: "6px 4px", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ color: detailLevel === d.id ? accent : t.textSub, fontSize: 10, fontWeight: 700, textAlign: "center" }}>{d.label}</div>
              </button>
            ))}
          </div>
        </div>


        <div>
          <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10 }}>RUNDY</div>
          {Array.from({ length: 6 }, (_, i) => <RoundBadge key={i} n={i} status={roundStatuses[i]} t={t} />)}
        </div>
      </div>

      <div style={{ padding: 36, overflowY: "auto", background: t.bgCenter }}>
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: t.text, fontSize: 18, fontFamily: "inherit" }}>☰</button>
            <div style={{ color: accent, fontWeight: 800, fontSize: 13, letterSpacing: 2 }}>CONSENSUS ENGINE</div>
            <div style={{ width: 40 }} />
          </div>
        )}
        {phase === "input" && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: t.text, margin: "0 0 6px", letterSpacing: -0.8 }}>Multi-Agent Consensus Engine</h1>
              <p style={{ color: t.textSub, fontSize: 13, margin: 0 }}>3 modele AI · strukturalna debata · jeden finalny wynik</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>PROBLEM / PYTANIE</div>
              <textarea value={problem} onChange={e => setProblem(e.target.value)} placeholder="Opisz problem lub pytanie..." style={{ width: "100%", minHeight: 140, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 12, padding: 16, color: t.text, fontSize: 13, fontFamily: "inherit", lineHeight: 1.75, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>ZAŁĄCZNIKI</div>
              <FileDropzone attachments={attachments} setAttachments={setAttachments} t={t} accent={accent} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <ContextField value={contextText} onChange={setContextText} t={t} accent={accent} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <WebSearchToggle value={useWebSearch} onChange={setUseWebSearch} t={t} />
            </div>
            <button onClick={() => problem.trim() && setShowDetailModal(true)} disabled={!problem.trim()} style={{ background: problem.trim() ? accent : t.cardBorder, color: problem.trim() ? "#fff" : t.textMuted, border: "none", borderRadius: 10, padding: "13px 30px", fontSize: 13, fontWeight: 800, cursor: problem.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: 0.8, boxShadow: problem.trim() ? `0 4px 18px ${accent}38` : "none" }}>
              ▶ URUCHOM DEBATĘ{useWebSearch ? " 🌐" : ""}
            </button>

            {showDetailModal && (
              <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: t.cardBg, borderRadius: 16, padding: 32, width: 480, border: "1px solid " + t.border, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
                  <div style={{ color: t.text, fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Ustaw debatę</div>
                  <div style={{ color: t.textMuted, fontSize: 12, marginBottom: 24 }}>Skonfiguruj przed startem</div>

                  <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>1. TRYB PRACY</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                    {MODES.map(m => (
                      <button key={m.id} onClick={() => setMode(m.id)} style={{ textAlign: "left", padding: "10px 14px", borderRadius: 10, border: "1px solid " + (mode === m.id ? accent : t.border), background: mode === m.id ? accent + "12" : t.modeBtnBg, cursor: "pointer", fontFamily: "inherit" }}>
                        <div style={{ color: mode === m.id ? accent : t.text, fontWeight: 700, fontSize: 12 }}>{m.label}</div>
                        <div style={{ color: t.textMuted, fontSize: 10, marginTop: 2 }}>{m.tooltip}</div>
                      </button>
                    ))}
                  </div>

                  <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>2. SZCZEGÓŁOWOŚĆ</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                    {DETAIL_LEVELS.map(d => (
                      <button key={d.id} onClick={() => setDetailLevel(d.id)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: "1px solid " + (detailLevel === d.id ? accent : t.border), background: detailLevel === d.id ? accent + "12" : t.modeBtnBg, cursor: "pointer", fontFamily: "inherit" }}>
                        <div style={{ color: detailLevel === d.id ? accent : t.text, fontWeight: 700, fontSize: 12, textAlign: "center" }}>{d.label}</div>
                        <div style={{ color: t.textMuted, fontSize: 9, textAlign: "center", marginTop: 3 }}>{d.id === "short" ? "~150 słów" : d.id === "standard" ? "~300 słów" : "500+ słów"}</div>
                      </button>
                    ))}
                  </div>

                  <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>2. WEB SEARCH</div>
                  <div onClick={() => setUseWebSearch(w => !w)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, border: "1px solid " + (useWebSearch ? "#2563eb55" : t.border), background: useWebSearch ? "rgba(37,99,235,0.06)" : t.modeBtnBg, cursor: "pointer", userSelect: "none", marginBottom: 20 }}>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: useWebSearch ? "#2563eb" : t.pendingDot, position: "relative", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, left: useWebSearch ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                    <div>
                      <div style={{ color: useWebSearch ? "#2563eb" : t.textSub, fontSize: 12, fontWeight: 700 }}>Wyszukiwanie w internecie</div>
                      <div style={{ color: t.textMuted, fontSize: 10 }}>{useWebSearch ? "Modele przeszukują internet i cytują źródła" : "Tylko wiedza treningowa modeli"}</div>
                    </div>
                  </div>

                  <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>3. KTÓRE AI BIORĄ UDZIAŁ</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 6 }}>
                    {Object.entries(PROVIDERS).map(([id, p]) => {
                      const active = activeProviders.includes(id);
                      return (
                        <div key={id} style={{ border: "1px solid " + (active ? p.color : t.border), borderRadius: 10, padding: "10px 12px", background: active ? p.color + "08" : t.modeBtnBg }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: active ? 10 : 0 }}>
                            <button onClick={() => setActiveProviders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flex: 1, fontFamily: "inherit", padding: 0 }}>
                              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (active ? p.color : t.border), background: active ? p.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {active && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />}
                              </div>
                              <span style={{ fontSize: 16 }}>{p.emoji}</span>
                              <div style={{ textAlign: "left" }}>
                                <div style={{ color: active ? p.color : t.textSub, fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                                <div style={{ color: t.textMuted, fontSize: 9 }}>{p.role}</div>
                              </div>
                            </button>
                          </div>
                          {active && id === "openai" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              {OPENAI_MODELS.map(m => (
                                <button key={m.id} onClick={() => setSelectedOpenaiModel(m.id)} style={{ flex: 1, padding: "6px 4px", borderRadius: 8, border: "1px solid " + (selectedOpenaiModel === m.id ? p.color : t.border), background: selectedOpenaiModel === m.id ? p.color + "14" : t.modeBtnBg, cursor: "pointer", fontFamily: "inherit" }}>
                                  <div style={{ color: selectedOpenaiModel === m.id ? p.color : t.textSub, fontSize: 10, fontWeight: 700, textAlign: "center" }}>{m.label}</div>
                                  <div style={{ color: t.textSub, fontSize: 10, textAlign: "center", marginTop: 2 }}>{m.desc}</div>
                                </button>
                              ))}
                            </div>
                          )}
                          {active && id === "claude" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              {AI_MODELS.map(m => (
                                <button key={m.id} onClick={() => setAiModel(m.id)} style={{ flex: 1, padding: "6px 4px", borderRadius: 8, border: "1px solid " + (aiModel === m.id ? p.color : t.border), background: aiModel === m.id ? p.color + "14" : t.modeBtnBg, cursor: "pointer", fontFamily: "inherit" }}>
                                  <div style={{ color: aiModel === m.id ? p.color : t.textSub, fontSize: 10, fontWeight: 700, textAlign: "center" }}>{m.label}</div>
                                  <div style={{ color: t.textSub, fontSize: 10, textAlign: "center", marginTop: 2 }}>{m.desc}</div>
                                </button>
                              ))}
                            </div>
                          )}
                          {active && id === "gemini" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              {GEMINI_MODELS.map(m => (
                                <button key={m.id} onClick={() => setSelectedGeminiModel(m.id)} style={{ flex: 1, padding: "6px 4px", borderRadius: 8, border: "1px solid " + (selectedGeminiModel === m.id ? p.color : t.border), background: selectedGeminiModel === m.id ? p.color + "14" : t.modeBtnBg, cursor: "pointer", fontFamily: "inherit" }}>
                                  <div style={{ color: selectedGeminiModel === m.id ? p.color : t.textSub, fontSize: 10, fontWeight: 700, textAlign: "center" }}>{m.label}</div>
                                  <div style={{ color: t.textSub, fontSize: 10, textAlign: "center", marginTop: 2 }}>{m.desc}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {activeProviders.length === 0 && <div style={{ color: "#b83020", fontSize: 11, marginBottom: 8 }}>Wybierz co najmniej 1 model</div>}

                  <button onClick={() => { if (activeProviders.length > 0) { setShowDetailModal(false); run(); } }} disabled={activeProviders.length === 0} style={{ marginTop: 20, width: "100%", background: activeProviders.length > 0 ? accent : t.cardBorder, color: activeProviders.length > 0 ? "#fff" : t.textMuted, border: "none", borderRadius: 10, padding: "13px", fontSize: 13, fontWeight: 800, cursor: activeProviders.length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                    Start debaty
                  </button>
                  <button onClick={() => setShowDetailModal(false)} style={{ marginTop: 8, background: "none", border: "none", color: t.textMuted, cursor: "pointer", fontFamily: "inherit", fontSize: 12, width: "100%", textAlign: "center" }}>Anuluj</button>
                </div>
              </div>
            )}
          </div>
        )}

        {(phase === "running" || phase === "done") && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8 }}>PROBLEM</div>
              <p style={{ color: t.text, fontSize: 13, lineHeight: 1.65, margin: 0, opacity: 0.8, padding: "12px 16px", background: t.cardBg, borderRadius: 10, border: `1px solid ${t.cardBorder}` }}>
                {problem.slice(0, 200)}{problem.length > 200 ? "…" : ""}
                {useWebSearch && <span style={{ marginLeft: 8, color: "#2563eb", fontSize: 11 }}>🌐 Web Search</span>}
              </p>
            </div>
            {rounds[1] && <div style={{ marginBottom: 28 }}><div style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 14 }}>RUNDA 1 — NIEZALEŻNA ANALIZA</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>{activeProviders.map(id => <ModelCard key={id} id={id} data={rounds[1][id]} t={t} />)}</div></div>}
            {rounds[2] && <div style={{ marginBottom: 28 }}><div style={{ color: "#2563eb", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 14 }}>RUNDA 2 — CROSS-REVIEW</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>{activeProviders.map(id => <ModelCard key={id} id={id} data={rounds[2][id]} t={t} />)}</div></div>}
            {rounds[3] && <div style={{ marginBottom: 28 }}><div style={{ color: "#0d9e6e", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 14 }}>RUNDA 3 — POPRAWIONE PROPOZYCJE</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>{activeProviders.map(id => <ModelCard key={id} id={id} data={rounds[3][id]} t={t} />)}</div></div>}
            {consensus && <ConsensusView data={consensus} t={t} onFollowup={handleFollowup} followupLoading={followupLoading} followupResponses={followupResponses} problem={problem} debateId={currentDebateId} />}
            {phase === "done" && (
              <button onClick={() => { setPhase("input"); setRounds({}); setConsensus(null); setLog([]); setCurrentRound(0); setFollowupResponses([]); setCurrentDebateId(null); }} style={{ marginTop: 24, background: "none", border: `1px solid ${t.border}`, color: t.textSub, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>← Nowa debata</button>
            )}
          </div>
        )}
      </div>

      {!isMobile && <div style={{ borderLeft: `1px solid ${t.border}`, padding: 24, overflowY: "auto", background: t.bgPanel }}>
        <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 14 }}>LOG PROCESU</div>
        <div ref={logRef} style={{ fontFamily: "monospace", fontSize: 11 }}>
          {log.length === 0 && <div style={{ color: t.textMuted }}>Uruchom debatę, aby zobaczyć log...</div>}
          {log.map((l, i) => (
            <div key={i} style={{ marginBottom: 6, lineHeight: 1.55 }}>
              <span style={{ color: t.logTime }}>{l.time} </span>
              <span style={{ color: l.msg.startsWith("✅") ? "#0d9e6e" : l.msg.startsWith("❌") ? "#c0392b" : l.msg.startsWith("❓") ? accent : l.msg.startsWith("⏳") ? "#2563eb" : l.msg.startsWith("  ") ? t.logText : t.textSub }}>{l.msg}</span>
            </div>
          ))}
          {(phase === "running" || followupLoading) && <div style={{ color: accent, animation: "blink 1s infinite" }}>▋</div>}
        </div>
        {phase !== "input" && (
          <div style={{ marginTop: 24, borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
            <div style={{ color: t.textLabel, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10 }}>STATUS RUND</div>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: roundStatuses[i] === "done" ? "#0d9e6e" : roundStatuses[i] === "active" ? accent : t.pendingDot, transition: "all 0.3s" }} />
                <span style={{ fontSize: 11, color: roundStatuses[i] === "pending" ? t.pendingText : t.textSub }}>{ROUND_LABELS[i]}</span>
              </div>
            ))}
          </div>
        )}
      </div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${t.scrollTrack}; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 4px; }
      `}</style>
    </div>
  );
}


