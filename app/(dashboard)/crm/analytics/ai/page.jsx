"use client";
import { useState, useCallback } from "react";
import { useDarkMode } from "../../../../hooks/useDarkMode";

// ── Theme ────────────────────────────────────────────────────────────────────
const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", kpi: "#faf9f7", codeBg: "#f5f3f0",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", kpi: "#0d0d0c", codeBg: "#1a1a18",
};

// ── Model catalogue ──────────────────────────────────────────────────────────
const MODEL_GROUPS = [
  {
    label: "Anthropic",
    models: [
      { value: "claude-sonnet-4-20250514", label: "claude-sonnet-4 ⭐" },
      { value: "claude-opus-4-20250514",   label: "claude-opus-4" },
    ],
  },
  {
    label: "OpenAI",
    models: [
      { value: "gpt-5.4",       label: "gpt-5.4 ⭐" },
      { value: "gpt-5.3-instant", label: "gpt-5.3-instant" },
      { value: "gpt-5.4-mini",  label: "gpt-5.4-mini" },
    ],
  },
  {
    label: "Gemini",
    models: [
      { value: "gemini-3-flash",         label: "gemini-3-flash ⭐" },
      { value: "gemini-3.1-pro-preview", label: "gemini-3.1-pro-preview" },
      { value: "gemini-3.1-flash-lite",  label: "gemini-3.1-flash-lite" },
    ],
  },
];

// ── Simple Markdown Renderer ─────────────────────────────────────────────────
function renderMarkdown(md, t) {
  if (!md) return null;

  const lines = md.split("\n");
  const elements = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={key++} style={{ fontSize: 15, fontWeight: 700, color: t.accent, margin: "18px 0 6px", borderBottom: `1px solid ${t.border}`, paddingBottom: 4 }}>
          {inlineMarkdown(line.slice(3), t)}
        </h3>
      );
      i++; continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={key++} style={{ fontSize: 13, fontWeight: 700, color: t.text, margin: "12px 0 4px" }}>
          {inlineMarkdown(line.slice(4), t)}
        </h4>
      );
      i++; continue;
    }

    if (line.startsWith("#### ")) {
      elements.push(
        <h5 key={key++} style={{ fontSize: 12, fontWeight: 700, color: t.text, margin: "10px 0 3px" }}>
          {inlineMarkdown(line.slice(5), t)}
        </h5>
      );
      i++; continue;
    }

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} style={{ border: "none", borderTop: `1px solid ${t.border}`, margin: "12px 0" }} />);
      i++; continue;
    }

    if (/^[\-\*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[\-\*] /.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: 3 }}>{inlineMarkdown(lines[i].slice(2), t)}</li>);
        i++;
      }
      elements.push(<ul key={key++} style={{ margin: "6px 0 6px 20px", padding: 0, fontSize: 13, color: t.text, lineHeight: 1.6 }}>{items}</ul>);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const text = lines[i].replace(/^\d+\. /, "");
        items.push(<li key={i} style={{ marginBottom: 4 }}>{inlineMarkdown(text, t)}</li>);
        i++;
      }
      elements.push(<ol key={key++} style={{ margin: "6px 0 6px 20px", padding: 0, fontSize: 13, color: t.text, lineHeight: 1.65 }}>{items}</ol>);
      continue;
    }

    elements.push(
      <p key={key++} style={{ fontSize: 13, color: t.text, lineHeight: 1.7, margin: "5px 0" }}>
        {inlineMarkdown(line, t)}
      </p>
    );
    i++;
  }

  return elements;
}

function inlineMarkdown(text, t) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={match.index} style={{ color: t.text, fontWeight: 700 }}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index} style={{ fontStyle: "italic" }}>{match[4]}</em>);
    else if (match[5]) parts.push(<code key={match.index} style={{ fontFamily: "monospace", fontSize: 11, background: t.codeBg, padding: "1px 4px", borderRadius: 3, color: t.accent }}>{match[6]}</code>);
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

// ── Model Select ─────────────────────────────────────────────────────────────
function ModelSelect({ value, onChange, t }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "6px 10px", fontSize: 12, borderRadius: 7,
        border: `1px solid ${t.border}`, background: t.surface,
        color: t.textSub, outline: "none", cursor: "pointer",
        marginBottom: 12,
      }}
    >
      {MODEL_GROUPS.map(g => (
        <optgroup key={g.label} label={g.label}>
          {g.models.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text, t }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "4px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer",
        background: copied ? "#22c55e22" : t.hover,
        border: `1px solid ${copied ? "#22c55e" : t.border}`,
        color: copied ? "#22c55e" : t.textSub,
        transition: "all 0.2s",
      }}
    >
      {copied ? "✓ Skopiowano" : "Kopiuj"}
    </button>
  );
}

// ── Result Box ───────────────────────────────────────────────────────────────
function ResultBox({ text, t }) {
  if (!text) return null;
  return (
    <div style={{ background: t.kpi, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px", marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <CopyButton text={text} t={t} />
      </div>
      <div>{renderMarkdown(text, t)}</div>
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: t.textSub, fontSize: 13, padding: "20px 0" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
        </path>
      </svg>
      Generuję odpowiedź…
    </div>
  );
}

// ── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ num, title, desc, t, children }) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "24px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: `${t.accent}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: t.accent, flexShrink: 0,
        }}>
          {num}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 12, color: t.textSub }}>{desc}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function ActionButton({ onClick, loading, label, t }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "9px 20px", fontSize: 13, fontWeight: 600, borderRadius: 8,
        background: loading ? t.hover : t.accent,
        color: loading ? t.textSub : "#ffffff",
        border: "none", cursor: loading ? "not-allowed" : "pointer",
        transition: "opacity 0.15s",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? "Generowanie…" : label}
    </button>
  );
}

function ClientInput({ value, onChange, t, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? "ID klienta (np. NZ-00001)"}
      style={{
        width: "100%", maxWidth: 320, padding: "8px 12px", fontSize: 13,
        borderRadius: 7, border: `1px solid ${t.border}`, background: t.surface,
        color: t.text, outline: "none", marginBottom: 12, boxSizing: "border-box",
      }}
      onFocus={e => { e.target.style.borderColor = t.accent; }}
      onBlur={e => { e.target.style.borderColor = t.border; }}
    />
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AIInsightsPage() {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT);

  // Tool 1: Base analysis
  const [baseModel, setBaseModel]     = useState("claude-sonnet-4-20250514");
  const [baseLoading, setBaseLoading] = useState(false);
  const [baseText, setBaseText]       = useState("");
  const [baseError, setBaseError]     = useState("");

  // Tool 2: Recommendations
  const [recModel, setRecModel]       = useState("gpt-5.4");
  const [recClientId, setRecClientId] = useState("");
  const [recLoading, setRecLoading]   = useState(false);
  const [recText, setRecText]         = useState("");
  const [recError, setRecError]       = useState("");

  // Tool 3: Winback
  const [wbModel, setWbModel]         = useState("gemini-3-flash");
  const [wbClientId, setWbClientId]   = useState("");
  const [wbLoading, setWbLoading]     = useState(false);
  const [wbText, setWbText]           = useState("");
  const [wbError, setWbError]         = useState("");

  async function analyzeBase() {
    setBaseLoading(true); setBaseError(""); setBaseText("");
    try {
      const res = await fetch("/api/crm/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: baseModel }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBaseText(data.text);
    } catch (e) {
      setBaseError(e.message ?? "Błąd połączenia");
    } finally {
      setBaseLoading(false);
    }
  }

  async function generateRec() {
    if (!recClientId.trim()) { setRecError("Podaj ID klienta"); return; }
    setRecLoading(true); setRecError(""); setRecText("");
    try {
      const params = new URLSearchParams({ client_id: recClientId.trim(), model: recModel });
      const res = await fetch(`/api/crm/ai-insights/recommendations?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecText(data.text);
    } catch (e) {
      setRecError(e.message ?? "Błąd połączenia");
    } finally {
      setRecLoading(false);
    }
  }

  async function analyzeWinback() {
    if (!wbClientId.trim()) { setWbError("Podaj ID klienta"); return; }
    setWbLoading(true); setWbError(""); setWbText("");
    try {
      const params = new URLSearchParams({ client_id: wbClientId.trim(), model: wbModel });
      const res = await fetch(`/api/crm/ai-insights/winback?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWbText(data.text);
    } catch (e) {
      setWbError(e.message ?? "Błąd połączenia");
    } finally {
      setWbLoading(false);
    }
  }

  const errorStyle = { fontSize: 12, color: "#ef4444", marginTop: 8 };

  return (
    <>
      <style>{`
        .ai-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 860px; }
        .ai-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .ai-sub   { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .ai-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; background: ${t.accent}18; border: 1px solid ${t.accent}44; border-radius: 20px; font-size: 11px; color: ${t.accent}; font-weight: 600; margin-bottom: 20px; }
        .ai-model-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .ai-model-label { font-size: 11px; color: ${t.textSub}; }
      `}</style>

      <div className="ai-wrap">
        <h1 className="ai-title">AI Insights</h1>
        <p className="ai-sub">Analityka i rekomendacje napędzane przez AI</p>
        <div className="ai-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill={t.accent}><circle cx="12" cy="12" r="10"/></svg>
          Multi-model · Nadwyraz CRM
        </div>

        {/* ── NARZĘDZIE 1: Analiza bazy ─────────────────────────── */}
        <Section num="1" title="Analiza bazy klientów" desc="AI przeanalizuje segmenty, światy, okazje i zaawansowane metryki — i wskaże co wymaga uwagi." t={t}>
          <div className="ai-model-row">
            <span className="ai-model-label">Model:</span>
            <ModelSelect value={baseModel} onChange={setBaseModel} t={t} />
          </div>
          <ActionButton onClick={analyzeBase} loading={baseLoading} label="Analizuj bazę" t={t} />
          {baseLoading && <Spinner t={t} />}
          {baseError && <div style={errorStyle}>⚠ {baseError}</div>}
          <ResultBox text={baseText} t={t} />
        </Section>

        {/* ── NARZĘDZIE 2: Rekomendacje produktowe ──────────────── */}
        <Section num="2" title="Rekomendacje produktowe" desc="Wpisz ID klienta — AI przeanalizuje jego historię zakupów i zaproponuje następne produkty oraz optymalny moment kontaktu." t={t}>
          <div className="ai-model-row">
            <span className="ai-model-label">Model:</span>
            <ModelSelect value={recModel} onChange={setRecModel} t={t} />
          </div>
          <ClientInput value={recClientId} onChange={setRecClientId} t={t} />
          <ActionButton onClick={generateRec} loading={recLoading} label="Generuj rekomendacje" t={t} />
          {recLoading && <Spinner t={t} />}
          {recError && <div style={errorStyle}>⚠ {recError}</div>}
          <ResultBox text={recText} t={t} />
        </Section>

        {/* ── NARZĘDZIE 3: Analiza winback ──────────────────────── */}
        <Section num="3" title="Najlepszy moment na winback" desc="Wpisz ID klienta — AI przeanalizuje wzorzec zakupów i zaproponuje optymalny czas, temat emaila i kluczowe punkty wiadomości." t={t}>
          <div className="ai-model-row">
            <span className="ai-model-label">Model:</span>
            <ModelSelect value={wbModel} onChange={setWbModel} t={t} />
          </div>
          <ClientInput value={wbClientId} onChange={setWbClientId} t={t} />
          <ActionButton onClick={analyzeWinback} loading={wbLoading} label="Analizuj winback" t={t} />
          {wbLoading && <Spinner t={t} />}
          {wbError && <div style={errorStyle}>⚠ {wbError}</div>}
          <ResultBox text={wbText} t={t} />
        </Section>
      </div>
    </>
  );
}
