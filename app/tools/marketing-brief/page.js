"use client";
import { useState, useEffect, useCallback } from "react";

// ─── STAŁE ───────────────────────────────────────────────────────────────────

const ACCENT = "#b8763a";
const NAV = [
  { href: "/", label: "⚡ Consensus Engine" },
  { href: "/newsletter-builder", label: "📧 Newsletter Builder" },
  { href: "/sock-designer", label: "🧦 Sock Designer" },
  { href: "/design-judge", label: "🎨 Design Judge" },
  { href: "/tools/countdown", label: "⏱ Generator odliczania" },
  { href: "/tools/marketing-brief", label: "📋 Akcje marketingowe", active: true },
  { href: "/tools/brand-settings", label: "🏷️ Ustawienia marki" },
];

const CHANNELS = [
  {
    id: "organic_social", label: "📱 Kanały własne (organic)",
    formats: ["Post kwadrat 1080×1080", "Post pionowy 1080×1350", "Stories 1080×1920", "Reels cover 1080×1920"],
    types: ["Grafika", "Zdjęcie", "Wideo", "Animacja"],
    slidesLabel: "Liczba kart w karuzeli", slidesNote: "dotyczy tylko karuzeli",
  },
  {
    id: "meta_ads", label: "🎯 Meta Ads",
    formats: ["Kwadrat 1080×1080", "Pionowy 1080×1920", "Poziomy 1200×628", "Pionowy 1080×1350", "Collection Ad"],
    types: ["Grafika statyczna", "Zdjęcie", "Wideo", "Animacja", "Karuzela"],
    slidesLabel: "Liczba ekranów / kart",
  },
  {
    id: "google_ads", label: "🔍 Google Ads",
    formats: ["Leaderboard 728×90", "Medium Rectangle 300×250", "Large Rectangle 336×280", "Billboard 970×250", "Half Page 300×600", "Responsive Display"],
    types: ["Grafika statyczna", "Animacja HTML5", "Responsive (tekst+grafika)"],
    slidesLabel: "Liczba wariantów kreacji",
  },
  {
    id: "email", label: "📧 Email / Newsletter",
    formats: ["Nagłówek 600×200", "Baner produktowy 600×300", "Full-width 600px"],
    types: ["Grafika statyczna", "Animacja GIF"],
    slidesLabel: "Liczba banerów w mailu",
  },
  {
    id: "slider_main", label: "🖥️ Slider strona główna",
    formats: ["1920×600", "1440×500", "Mobile 768×400"],
    types: ["Grafika statyczna", "Animacja"],
    slidesLabel: "Liczba slajdów",
  },
  {
    id: "slider_category", label: "🗂️ Slider mini kategoria",
    formats: ["800×300", "600×250"],
    types: ["Grafika statyczna"],
    slidesLabel: "Liczba slajdów",
  },
  {
    id: "popup", label: "💬 Pop-up grafika",
    formats: ["Kwadrat 600×600", "Pionowy 600×800", "Poziomy 800×500"],
    types: ["Grafika statyczna", "Animacja GIF"],
    slidesLabel: "Liczba wariantów",
  },
  {
    id: "listing_banner", label: "🏷️ Baner na listingu",
    formats: ["1200×200", "1000×200", "800×150"],
    types: ["Grafika statyczna"],
    slidesLabel: "Liczba wariantów",
  },
];

const CTA_OPTIONS = ["Kup teraz", "Sprawdź", "Dowiedz się więcej", "Zobacz ofertę", "Skorzystaj", "Zamów", "Odkryj", "Inne"];
const PRIORITY_OPTIONS = ["PROMOCJA", "PRODUKT", "BENEFIT", "CENA", "NOWOŚĆ", "KOLEKCJA", "WYDARZENIE"];
const VISIBLE_OPTIONS = ["Produkt", "Cena", "Rabat", "Kod rabatowy", "Data promocji", "Logo", "Packshot", "Twarz twórcy", "Claim/hasło", "Timer odliczania"];

const defaultChannel = () => ({
  active: false,
  selectedFormats: [],
  selectedTypes: [],
  slides: "1",
  cta: false,
  ctaText: "Kup teraz",
  ctaCustom: "",
  visible: [],
  hierarchy: ["", "", ""],
  notes: "",
});

const defaultBrief = () => ({
  name: "",
  dateStart: "",
  dateEnd: "",
  deadlineCreative: "",
  goal: "",
  headline: "",
  headlinePriority: "",
  discount: "",
  promoCode: "",
  budget: "",
  targetAudience: "",
  brandNotes: "",
  references: { links: [], files: [] },
  chatHistory: [],
  channels: Object.fromEntries(CHANNELS.map(c => [c.id, defaultChannel()])),
});

// ─── UI KOMPONENTY ─────────────────────────────────────────────────────────

function Label({ children }) {
  return <div style={{ fontSize: "10px", fontWeight: 700, color: "#888", letterSpacing: 1.2, marginBottom: 5, textTransform: "uppercase", fontFamily: "monospace" }}>{children}</div>;
}

function Input({ value, onChange, placeholder, type = "text", style }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width: "100%", background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#1a1a1a", fontFamily: "inherit", boxSizing: "border-box", ...style }} />;
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width: "100%", background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#1a1a1a", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />;
}

function Field({ label, children, style }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}><Label>{label}</Label>{children}</div>;
}

function Section({ title, children, accent }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "10px 16px", background: accent ? ACCENT : "#f9f7f5", borderBottom: "1px solid #e0dbd4" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: accent ? "#fff" : "#555", fontFamily: "monospace", letterSpacing: 0.5 }}>{title}</div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function CheckPill({ label, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      style={{ padding: "5px 10px", borderRadius: 20, border: `1px solid ${checked ? ACCENT : "#ddd"}`, background: checked ? ACCENT + "15" : "#f9f9f9", color: checked ? ACCENT : "#888", fontSize: 11, cursor: "pointer", fontFamily: "monospace", fontWeight: checked ? 700 : 400 }}>
      {label}
    </button>
  );
}

function ChannelPanel({ channel, cfg, onChange }) {
  const toggle = (key, val, arr) => {
    const cur = cfg[arr] || [];
    onChange({ ...cfg, [arr]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Formaty">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {channel.formats.map(f => <CheckPill key={f} label={f} checked={(cfg.selectedFormats || []).includes(f)} onChange={() => toggle("selectedFormats", f, "selectedFormats")} />)}
        </div>
      </Field>
      <Field label="Typ materiału">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {channel.types.map(t => <CheckPill key={t} label={t} checked={(cfg.selectedTypes || []).includes(t)} onChange={() => toggle("selectedTypes", t, "selectedTypes")} />)}
        </div>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={channel.slidesLabel || "Liczba slajdów / ekranów"}>
          <select value={cfg.slides || "1"} onChange={e => onChange({ ...cfg, slides: e.target.value })}
            style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#1a1a1a", fontFamily: "inherit" }}>
            {["1","2","3","4","5","6+"].map(n => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="CTA">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={cfg.cta || false} onChange={e => onChange({ ...cfg, cta: e.target.checked })}
              style={{ accentColor: ACCENT, width: 16, height: 16 }} />
            {cfg.cta && (
              <select value={cfg.ctaText || "Kup teraz"} onChange={e => onChange({ ...cfg, ctaText: e.target.value })}
                style={{ flex: 1, background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "7px 8px", fontSize: 12, fontFamily: "inherit" }}>
                {CTA_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            )}
          </div>
          {cfg.cta && cfg.ctaText === "Inne" && (
            <Input value={cfg.ctaCustom || ""} onChange={v => onChange({ ...cfg, ctaCustom: v })} placeholder="Wpisz własny CTA..." style={{ marginTop: 6 }} />
          )}
        </Field>
      </div>
      <Field label="Co ma być widoczne na grafice">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {VISIBLE_OPTIONS.map(v => <CheckPill key={v} label={v} checked={(cfg.visible || []).includes(v)} onChange={() => toggle("visible", v, "visible")} />)}
        </div>
      </Field>
      <Field label="Hierarchia informacji (od najważniejszego)">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#aaa", width: 20, textAlign: "center" }}>{i + 1}.</span>
              <Input value={(cfg.hierarchy || ["", "", ""])[i] || ""} onChange={v => { const h = [...(cfg.hierarchy || ["", "", ""])]; h[i] = v; onChange({ ...cfg, hierarchy: h }); }} placeholder={["Najważniejsze", "Drugie", "Trzecie"][i]} />
            </div>
          ))}
        </div>
      </Field>
      <Field label="Uwagi dodatkowe">
        <Textarea value={cfg.notes || ""} onChange={v => onChange({ ...cfg, notes: v })} placeholder="Specyficzne wymagania dla tego kanału..." rows={2} />
      </Field>
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

// ─── MARKDOWN RENDERER ───────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  const FONT = "-apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blok kodu ```
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      const codeText = codeLines.join("\n");
      elements.push(
        <div key={i} style={{ margin: "10px 0", borderRadius: 8, overflow: "hidden", border: "1px solid #e0dbd4" }}>
          {lang && <div style={{ background: "#f0ece6", padding: "3px 10px", fontSize: 10, color: "#888", fontFamily: "monospace", borderBottom: "1px solid #e0dbd4" }}>{lang}</div>}
          <pre style={{ margin: 0, padding: "10px 12px", background: "#fafaf8", fontSize: 11.5, fontFamily: "'SF Mono', 'Fira Code', monospace", overflowX: "auto", lineHeight: 1.6, color: "#1a1a1a", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{codeText}</pre>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<div key={i} style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 4, fontFamily: FONT }}>{line.slice(4)}</div>);
    } else if (line.startsWith("## ")) {
      elements.push(<div key={i} style={{ fontSize: 14, fontWeight: 700, color: "#b8763a", marginTop: 18, marginBottom: 6, paddingBottom: 5, borderBottom: "1px solid #f0e8df", fontFamily: FONT }}>{line.slice(3)}</div>);
    } else if (line.startsWith("# ")) {
      elements.push(<div key={i} style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginTop: 18, marginBottom: 8, fontFamily: FONT }}>{line.slice(2)}</div>);
    } else if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ")) {
      const txt = line.replace(/^[-•*] /, "");
      elements.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4, fontFamily: FONT, fontSize: 13, lineHeight: 1.6 }}><span style={{ color: "#b8763a", flexShrink: 0, marginTop: 1 }}>•</span><span>{parseBold(txt)}</span></div>);
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)[1];
      const txt = line.replace(/^\d+\. /, "");
      elements.push(<div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4, fontFamily: FONT, fontSize: 13, lineHeight: 1.6 }}><span style={{ color: "#b8763a", fontWeight: 600, flexShrink: 0, minWidth: 18 }}>{num}.</span><span>{parseBold(txt)}</span></div>);
    } else if (line.startsWith("---") || line.startsWith("===")) {
      elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #e8e0d8", margin: "12px 0" }} />);
    } else if (line.startsWith("> ")) {
      elements.push(<div key={i} style={{ borderLeft: "3px solid #b8763a", color: "#555", fontStyle: "italic", margin: "8px 0", background: "#fdf8f3", borderRadius: "0 6px 6px 0", padding: "6px 12px", fontFamily: FONT, fontSize: 13 }}>{parseBold(line.slice(2))}</div>);
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
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ color: "#1a1a1a" }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ background: "#f0ece6", borderRadius: 3, padding: "1px 5px", fontSize: "0.9em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function MarketingBrief() {
  const [briefs, setBriefs] = useState([]);
  const [view, setView] = useState("list"); // list | form
  const [editId, setEditId] = useState(null);
  const [brief, setBrief] = useState(defaultBrief());
  const [activeChannel, setActiveChannel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [chatModel, setChatModel] = useState("claude-sonnet-4-20250514");
  const [chatInput, setChatInput] = useState("");
  const [chatExpanded, setChatExpanded] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [deepResearch, setDeepResearch] = useState(false);
  const [brandSettings, setBrandSettings] = useState(null);
  const [brandContext, setBrandContextState] = useState({
    brand_description: true,
    tone_of_voice: true,
    target_audiences: true,
    campaign_examples: true,
    reference_links: true,
    uploaded_files: true,
  });
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [synthesis, setSynthesis] = useState(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [fillingBrief, setFillingBrief] = useState(false);
  const [copyFromModal, setCopyFromModal] = useState(null); // id kanału docelowego
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const set = (key, val) => setBrief(prev => ({ ...prev, [key]: val }));
  const setChannel = (id, val) => setBrief(prev => ({ ...prev, channels: { ...prev.channels, [id]: val } }));
  const toggleChannel = (id) => setChannel(id, { ...brief.channels[id], active: !brief.channels[id].active });

  const uploadFile = async (file) => {
    setUploadingFile(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dayrmhsdpcgakbsfjkyp.supabase.co";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const fileName = `${Date.now()}-${file.name}`;
      const res = await fetch(`${supabaseUrl}/storage/v1/object/brief-references/${fileName}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${supabaseKey}`, "Content-Type": file.type },
        body: file,
      });
      if (res.ok) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/brief-references/${fileName}`;
        const prev = brief.references || { links: [], files: [] };
        setBrief(b => ({ ...b, references: { ...prev, files: [...(prev.files || []), { name: file.name, url: publicUrl }] } }));
      } else {
        alert("Błąd uploadu pliku");
      }
    } catch(e) { alert("Błąd: " + e.message); }
    setUploadingFile(false);
  };

  const addLink = (url) => {
    if (!url.trim()) return;
    const prev = brief.references || { links: [], files: [] };
    setBrief(b => ({ ...b, references: { ...prev, links: [...(prev.links || []), { url: url.trim(), note: "" }] } }));
  };

  const removeRef = (type, idx) => {
    const prev = brief.references || { links: [], files: [] };
    setBrief(b => ({ ...b, references: { ...prev, [type]: prev[type].filter((_, i) => i !== idx) } }));
  };

  const copyFromChannel = (sourceId, targetId) => {
    const src = brief.channels[sourceId];
    const tgt = brief.channels[targetId];
    setChannel(targetId, {
      ...tgt,
      selectedTypes: src.selectedTypes,
      cta: src.cta,
      ctaText: src.ctaText,
      ctaCustom: src.ctaCustom,
      visible: src.visible,
      hierarchy: src.hierarchy,
      notes: src.notes,
    });
    setCopyFromModal(null);
  };

  const loadBriefs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/marketing-briefs");
    const data = await res.json();
    setBriefs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadBriefs(); }, [loadBriefs]);

  const save = async () => {
    if (!brief.name.trim()) { setSaveMsg("Wpisz nazwę akcji!"); return; }
    setSaving(true);
    const payload = { title: brief.name, data: brief };
    const res = editId
      ? await fetch("/api/marketing-briefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...payload }) })
      : await fetch("/api/marketing-briefs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const row = await res.json();
    setSaving(false);
    if (row.id) {
      setSaveMsg("✅ Zapisano!");
      setEditId(row.id);
      loadBriefs();
      setTimeout(() => setSaveMsg(""), 3000);
    } else {
      setSaveMsg("❌ Błąd zapisu");
    }
  };

  const openNew = () => { setBrief(defaultBrief()); setEditId(null); setActiveChannel(null); setView("form"); };
  const openEdit = (b) => { setBrief(b.data); setEditId(b.id); setActiveChannel(null); setView("form"); };

  const deleteBrief = async (id) => {
    if (!confirm("Usunąć brief?")) return;
    await fetch(`/api/marketing-briefs?id=${id}`, { method: "DELETE" });
    loadBriefs();
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput.trim(), model: chatModel, ts: Date.now() };
    const newHistory = [...(brief.chatHistory || []), userMsg];
    setBrief(b => ({ ...b, chatHistory: newHistory }));
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: chatModel,
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          briefContext: { name: brief.name, goal: brief.goal, headline: brief.headline, headlinePriority: brief.headlinePriority, discount: brief.discount, dateStart: brief.dateStart, dateEnd: brief.dateEnd, targetAudience: brief.targetAudience, channels: Object.fromEntries(Object.entries(brief.channels).filter(([,v]) => v.active).map(([k,v]) => [CHANNELS_LABELS[k], { formats: v.selectedFormats, types: v.selectedTypes, hierarchy: v.hierarchy, cta: v.ctaText }])) },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const aiMsg = { role: "assistant", content: data.content, model: chatModel, ts: Date.now() };
      const finalHistory = [...newHistory, aiMsg];
      setBrief(b => ({ ...b, chatHistory: finalHistory }));
      // Autozapis czatu jeśli brief już zapisany
      if (editId) {
        await fetch("/api/marketing-briefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, title: brief.name, data: { ...brief, chatHistory: finalHistory } }) });
      }
    } catch(e) {
      const errMsg = { role: "assistant", content: "❌ Błąd: " + e.message, model: chatModel, ts: Date.now() };
      setBrief(b => ({ ...b, chatHistory: [...newHistory, errMsg] }));
    }
    setChatLoading(false);
  };

  const clearChat = () => { if (confirm("Wyczyścić historię czatu?")) setBrief(b => ({ ...b, chatHistory: [] })); };

  const generateSynthesis = async () => {
    if (!brief.chatHistory?.length) return;
    setSynthesizing(true);
    setSynthesis(null);
    try {
      const summaryPrompt = `Na podstawie poniższej rozmowy przygotuj zwięzłą syntezę w formacie:

## PODSUMOWANIE ROZMOWY
[2-3 zdania o czym była rozmowa]

## KLUCZOWE USTALENIA
[lista najważniejszych wniosków i decyzji]

## PROPOZYCJE COPY I NAGŁÓWKÓW
[wszystkie propozycje haseł, nagłówków, copy które padły w rozmowie — zebrać w jednym miejscu]

## REKOMENDACJE
[konkretne kolejne kroki lub rekomendacje które wynikają z rozmowy]

Bądź konkretny. Wyciągaj dosłowne propozycje copy z rozmowy, nie parafrazuj.`;

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: chatModel,
          messages: [
            ...brief.chatHistory.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: summaryPrompt }
          ],
          briefContext: { name: brief.name, goal: brief.goal, headline: brief.headline },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const synthesisMsg = { role: "synthesis", content: data.content, model: chatModel, ts: Date.now() };
      setBrief(b => ({ ...b, chatHistory: [...(b.chatHistory || []), synthesisMsg] }));
      setSynthesis(data.content);
    } catch(e) {
      const errMsg = { role: "synthesis", content: "❌ Błąd syntezy: " + e.message, model: chatModel, ts: Date.now() };
      setBrief(b => ({ ...b, chatHistory: [...(b.chatHistory || []), errMsg] }));
    }
    setSynthesizing(false);
  };

  const copySynthesis = () => {
    if (synthesis) { navigator.clipboard.writeText(synthesis); }
  };

  const fillBriefFromSynthesis = async (synthesisText) => {
    const textToUse = synthesisText || synthesis;
    if (!textToUse) return;
    setFillingBrief(true);
    try {
      const prompt = `Na podstawie poniższej syntezy rozmowy, wypełnij pola briefu marketingowego.
Zwróć TYLKO czysty JSON (bez markdown, bez \`\`\`, bez komentarzy) z następującymi polami (pomiń pola których nie możesz wypełnić):
{
  "name": "nazwa akcji",
  "goal": "cel kampanii",
  "headline": "główne hasło",
  "discount": "zniżka/promocja",
  "dateStart": "YYYY-MM-DD HH:MM lub pusty string",
  "dateEnd": "YYYY-MM-DD HH:MM lub pusty string",
  "targetAudience": "grupy docelowe",
  "brandNotes": "dodatkowe uwagi"
}

SYNTEZA:
${textToUse}`;

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: chatModel,
          messages: [{ role: "user", content: prompt }],
          briefContext: null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Wyczyść odpowiedź z markdown
      let raw = data.content.trim();
      raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(raw);

      // Wypełnij pola briefu - tylko te które AI zwróciło
      setBrief(prev => ({ ...prev, ...Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v && v !== "")) }));
      setSynthesis(null);
      alert("✅ Brief wypełniony! Sprawdź i popraw co chcesz.");
    } catch(e) {
      alert("❌ Błąd: " + e.message + "\nSpróbuj ponownie.");
    }
    setFillingBrief(false);
  };

  const CHANNELS_LABELS = {
    organic_social: "Kanały własne (organic)", meta_ads: "Meta Ads", google_ads: "Google Ads",
    email: "Email / Newsletter", slider_main: "Slider strona główna", slider_category: "Slider mini kategoria",
    popup: "Pop-up grafika", listing_banner: "Baner na listingu",
  };

  const exportDocx = async () => {
    setExportingDocx(true);
    try {
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
              HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType } = await import("docx");

      const border = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
      const borders = { top: border, bottom: border, left: border, right: border };
      const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
      const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

      const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, bold: true, size: 28, font: "Arial", color: "B8763A" })] });
      const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true, size: 22, font: "Arial", color: "333333" })] });
      const p = (text, opts = {}) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, font: "Arial", size: 20, ...opts })] });
      const kv = (key, val) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: key + ": ", bold: true, font: "Arial", size: 20 }), new TextRun({ text: val || "—", font: "Arial", size: 20 })] });
      const spacer = () => new Paragraph({ spacing: { after: 160 }, children: [] });

      const children = [
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "BRIEF MARKETINGOWY", bold: true, size: 36, font: "Arial", color: "B8763A" })] }),
        new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: brief.name || "Bez nazwy", size: 28, font: "Arial", color: "555555" })] }),
        h1("CZĘŚĆ OGÓLNA"),
        kv("Data startu", brief.dateStart), kv("Data końca", brief.dateEnd),
        kv("Deadline kreatywny", brief.deadlineCreative),
        kv("Cel kampanii", brief.goal), kv("Hasło główne", brief.headline),
        kv("Priorytet hasła", brief.headlinePriority), kv("Rabat", brief.discount),
        kv("Kod rabatowy", brief.promoCode), kv("Budżet mediowy", brief.budget),
        kv("Grupa docelowa", brief.targetAudience), kv("Uwagi brandowe", brief.brandNotes),
        spacer(),
      ];

      const activeChannels = Object.entries(brief.channels || {}).filter(([, v]) => v.active);
      if (activeChannels.length > 0) {
        children.push(h1(`KANAŁY KOMUNIKACJI (${activeChannels.length})`));
        for (const [id, cfg] of activeChannels) {
          children.push(h2(CHANNELS_LABELS[id] || id));
          if (cfg.selectedFormats?.length) children.push(kv("Formaty", cfg.selectedFormats.join(", ")));
          if (cfg.selectedTypes?.length) children.push(kv("Typ materiału", cfg.selectedTypes.join(", ")));
          children.push(kv("Liczba slajdów", cfg.slides || "1"));
          children.push(kv("CTA", cfg.cta ? (cfg.ctaText === "Inne" ? cfg.ctaCustom : cfg.ctaText) : "Nie"));
          if (cfg.visible?.length) children.push(kv("Co widoczne na grafice", cfg.visible.join(", ")));
          const hier = (cfg.hierarchy || []).filter(h => h);
          if (hier.length) children.push(kv("Hierarchia", hier.map((h, i) => `${i+1}. ${h}`).join(" | ")));
          if (cfg.notes) children.push(kv("Uwagi", cfg.notes));
          children.push(spacer());
        }
      }

      const doc = new Document({
        styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
        sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
      });

      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `brief-${brief.name || "export"}.docx`; a.click();
    } catch (e) { console.error(e); alert("Błąd eksportu DOCX: " + e.message); }
    setExportingDocx(false);
  };

  const exportXlsx = async () => {
    setExportingXlsx(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Arkusz 1: Ogólne
      const general = [
        ["BRIEF MARKETINGOWY", ""],
        ["Nazwa akcji", brief.name || ""],
        ["Data startu", brief.dateStart || ""],
        ["Data końca", brief.dateEnd || ""],
        ["Deadline kreatywny", brief.deadlineCreative || ""],
        ["Cel kampanii", brief.goal || ""],
        ["Hasło główne", brief.headline || ""],
        ["Priorytet hasła", brief.headlinePriority || ""],
        ["Rabat", brief.discount || ""],
        ["Kod rabatowy", brief.promoCode || ""],
        ["Budżet mediowy", brief.budget || ""],
        ["Grupa docelowa", brief.targetAudience || ""],
        ["Uwagi brandowe", brief.brandNotes || ""],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(general);
      ws1["!cols"] = [{ wch: 25 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, ws1, "Ogólne");

      // Arkusz 2: Kanały
      const headers = ["Kanał", "Aktywny", "Formaty", "Typ materiału", "Liczba slajdów", "CTA", "Co widoczne", "Hierarchia 1", "Hierarchia 2", "Hierarchia 3", "Uwagi"];
      const rows = [headers, ...Object.entries(brief.channels || {}).map(([id, cfg]) => [
        CHANNELS_LABELS[id] || id,
        cfg.active ? "TAK" : "NIE",
        (cfg.selectedFormats || []).join(", "),
        (cfg.selectedTypes || []).join(", "),
        cfg.slides || "1",
        cfg.cta ? (cfg.ctaText === "Inne" ? cfg.ctaCustom : cfg.ctaText) : "NIE",
        (cfg.visible || []).join(", "),
        cfg.hierarchy?.[0] || "",
        cfg.hierarchy?.[1] || "",
        cfg.hierarchy?.[2] || "",
        cfg.notes || "",
      ])];
      const ws2 = XLSX.utils.aoa_to_sheet(rows);
      ws2["!cols"] = [{ wch: 28 }, { wch: 8 }, { wch: 35 }, { wch: 25 }, { wch: 16 }, { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Kanały");

      const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([xlsxBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `brief-${brief.name || "export"}.xlsx`; a.click();
    } catch (e) { console.error(e); alert("Błąd eksportu XLSX: " + e.message); }
    setExportingXlsx(false);
  };

  const activeChannels = CHANNELS.filter(c => brief.channels[c.id]?.active);

  const panelStyle = { background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, overflow: "hidden", marginBottom: 16 };
  const panelHead = { padding: "10px 16px", background: "#f9f7f5", borderBottom: "1px solid #e0dbd4", fontSize: 11, color: "#555", fontFamily: "monospace", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" };

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
          <a key={item.href} href={item.href} style={{ display: "block", padding: "9px 12px", borderRadius: 8, fontSize: 11, fontWeight: item.active ? 700 : 400, background: item.active ? ACCENT + "20" : "none", border: item.active ? `1px solid ${ACCENT}40` : "1px solid transparent", color: item.active ? ACCENT : "#666", textDecoration: "none" }}>{item.label}</a>
        ))}
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ─── LISTA BRIEFÓW ─── */}
        {view === "list" && (
          <div style={{ padding: 32, maxWidth: 900 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>📋 Akcje marketingowe</div>
                <div style={{ fontSize: 12, color: "#888" }}>Historia briefów dla zespołu kreatywnego</div>
              </div>
              <button onClick={openNew} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                + Nowy brief
              </button>
            </div>

            {loading && <div style={{ color: "#aaa", fontSize: 13 }}>Ładowanie...</div>}
            {!loading && briefs.length === 0 && (
              <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, padding: 40, textAlign: "center", color: "#aaa" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>Brak briefów</div>
                <div style={{ fontSize: 12 }}>Kliknij "+ Nowy brief" aby zacząć</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {briefs.map(b => (
                <div key={b.id} style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", marginBottom: 4 }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>
                      {b.data?.dateStart && b.data?.dateEnd ? `${b.data.dateStart} → ${b.data.dateEnd}` : "Brak dat"}
                      {" · "}
                      {CHANNELS.filter(c => b.data?.channels?.[c.id]?.active).length} kanałów
                      {" · "}
                      {new Date(b.updated_at).toLocaleDateString("pl-PL")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openEdit(b)} style={{ background: ACCENT + "15", color: ACCENT, border: `1px solid ${ACCENT}40`, borderRadius: 6, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Edytuj</button>
                    <button onClick={() => deleteBrief(b.id)} style={{ background: "none", color: "#ccc", border: "1px solid #eee", borderRadius: 6, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Usuń</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── FORMULARZ BRIEFU ─── */}
        {view === "form" && (
          <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
          <div style={{ flex: 1, padding: 32, maxWidth: 860, overflowY: "auto" }}>
            {/* Nagłówek */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 8, padding: 0 }}>← Lista briefów</button>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{editId ? "Edytuj brief" : "Nowy brief"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith("✅") ? "#2d7a4f" : "#cc0000" }}>{saveMsg}</span>}
                <button onClick={exportDocx} disabled={exportingDocx} style={{ background: "#1a5ca8", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  {exportingDocx ? "..." : "⬇ DOCX"}
                </button>
                <button onClick={exportXlsx} disabled={exportingXlsx} style={{ background: "#1a7a3a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  {exportingXlsx ? "..." : "⬇ XLSX"}
                </button>
                <button onClick={openNew} style={{ background: "none", color: "#888", border: "1px solid #ddd", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  + Nowy brief
                </button>
                <button onClick={save} disabled={saving} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {saving ? "Zapisuję..." : "💾 Zapisz"}
                </button>
              </div>
            </div>

            {/* CZĘŚĆ OGÓLNA */}
            <Section title="CZĘŚĆ OGÓLNA">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Nazwa akcji / kampanii">
                  <Input value={brief.name} onChange={v => set("name", v)} placeholder="np. Wyprzedaż wiosenna 2026" />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Data startu akcji"><Input type="date" value={brief.dateStart} onChange={v => set("dateStart", v)} /></Field>
                  <Field label="Data końca akcji"><Input type="date" value={brief.dateEnd} onChange={v => set("dateEnd", v)} /></Field>
                  <Field label="Deadline kreatywny"><Input type="date" value={brief.deadlineCreative} onChange={v => set("deadlineCreative", v)} /></Field>
                </div>
                <Field label="Cel kampanii">
                  <Textarea value={brief.goal} onChange={v => set("goal", v)} placeholder="Co chcemy osiągnąć? Sprzedaż, świadomość, zapis na newsletter..." rows={2} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Hasło główne / claim">
                    <Input value={brief.headline} onChange={v => set("headline", v)} placeholder='np. "Wiosna zaczyna się od skarpet"' />
                  </Field>
                  <Field label="Priorytet hasła">
                    <select value={brief.headlinePriority} onChange={e => set("headlinePriority", e.target.value)}
                      style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#1a1a1a", fontFamily: "inherit" }}>
                      <option value="">— wybierz —</option>
                      {PRIORITY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Rabat / wartość promocji"><Input value={brief.discount} onChange={v => set("discount", v)} placeholder="np. -30% lub darmowa dostawa" /></Field>
                  <Field label="Kod rabatowy"><Input value={brief.promoCode} onChange={v => set("promoCode", v)} placeholder="np. WIOSNA30" /></Field>
                  <Field label="Budżet mediowy (opcjonalnie)"><Input value={brief.budget} onChange={v => set("budget", v)} placeholder="np. 5 000 PLN" /></Field>
                </div>
                <Field label="Grupa docelowa">
                  <Textarea value={brief.targetAudience} onChange={v => set("targetAudience", v)} placeholder="Kto jest odbiorcą? Wiek, zainteresowania, zachowania..." rows={2} />
                </Field>
                <Field label="Uwagi brandowe / wytyczne">
                  <Textarea value={brief.brandNotes} onChange={v => set("brandNotes", v)} placeholder="Fonty, kolory, elementy obowiązkowe, czego unikać..." rows={2} />
                </Field>
              </div>
            </Section>

            {/* REFERENCJE GRAFICZNE */}
            <Section title="REFERENCJE GRAFICZNE">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Dodaj link (np. Dropbox, Drive, Pinterest)">
                  <div style={{ display: "flex", gap: 8 }}>
                    <input id="ref-link-input" type="url" placeholder="https://..." onKeyDown={e => { if(e.key==="Enter"){ addLink(e.target.value); e.target.value=""; }}}
                      style={{ flex: 1, background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }} />
                    <button onClick={() => { const el = document.getElementById("ref-link-input"); addLink(el.value); el.value=""; }}
                      style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>+ Dodaj</button>
                  </div>
                </Field>
                {(brief.references?.links || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {brief.references.links.map((link, i) => (
                      <div key={i} style={{ background: "#f9f7f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <a href={typeof link === "object" ? link.url : link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12, color: "#1a5ca8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{typeof link === "object" ? link.url : link}</a>
                          <button onClick={() => removeRef("links", i)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                        </div>
                        <input type="text" placeholder="Notatka (opcjonalnie)..." value={typeof link === "object" ? (link.note || "") : ""}
                          onChange={e => { const refs = [...brief.references.links]; refs[i] = { url: typeof link === "object" ? link.url : link, note: e.target.value }; setBrief(b => ({ ...b, references: { ...b.references, links: refs } })); }}
                          style={{ width: "100%", background: "#fff", border: "1px solid #eee", borderRadius: 4, padding: "4px 8px", fontSize: 11, color: "#555", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
                <Field label="Upload grafik referencyjnych">
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f9f7f5", border: "2px dashed #ddd", borderRadius: 8, padding: "12px 20px", cursor: "pointer", fontSize: 12, color: "#888" }}>
                    <input type="file" multiple accept="image/*,.pdf" onChange={e => Array.from(e.target.files).forEach(uploadFile)} style={{ display: "none" }} />
                    {uploadingFile ? "⏳ Uploading..." : "📎 Kliknij lub przeciągnij pliki (JPG, PNG, PDF)"}
                  </label>
                </Field>
                {(brief.references?.files || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {brief.references.files.map((f, i) => (
                      <div key={i} style={{ background: "#f0f7ff", border: "1px solid #c8e0f8", borderRadius: 6, padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 11, color: "#1a5ca8" }}>📄 {f.name}</a>
                          <button onClick={() => removeRef("files", i)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                        </div>
                        <input type="text" placeholder="Notatka (opcjonalnie)..." value={f.note || ""}
                          onChange={e => { const files = [...brief.references.files]; files[i] = { ...f, note: e.target.value }; setBrief(b => ({ ...b, references: { ...b.references, files } })); }}
                          style={{ width: "100%", background: "#fff", border: "1px solid #c8e0f8", borderRadius: 4, padding: "4px 8px", fontSize: 11, color: "#555", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* WYBÓR KANAŁÓW */}
            <Section title="KANAŁY KOMUNIKACJI — wybierz aktywne">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {CHANNELS.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, border: `1px solid ${brief.channels[c.id]?.active ? ACCENT : "#e0dbd4"}`, background: brief.channels[c.id]?.active ? ACCENT + "08" : "#fafafa", cursor: "pointer" }}
                    onClick={() => toggleChannel(c.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" checked={brief.channels[c.id]?.active || false} onChange={() => {}} style={{ accentColor: ACCENT, width: 16, height: 16, pointerEvents: "none" }} />
                      <span style={{ fontSize: 13, fontWeight: brief.channels[c.id]?.active ? 700 : 400, color: brief.channels[c.id]?.active ? "#1a1a1a" : "#888" }}>{c.label}</span>
                    </div>
                    {brief.channels[c.id]?.active && (
                      <button onClick={e => { e.stopPropagation(); setActiveChannel(activeChannel === c.id ? null : c.id); }}
                        style={{ background: activeChannel === c.id ? ACCENT : "none", color: activeChannel === c.id ? "#fff" : ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                        {activeChannel === c.id ? "Zwiń ▲" : "Konfiguruj ▼"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {/* KONFIGURACJA AKTYWNYCH KANAŁÓW */}
            {/* MODAL kopiowania */}
            {copyFromModal && (
              <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => setCopyFromModal(null)}>
                <div style={{ background: "#fff", borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "#1a1a1a" }}>Kopiuj ustawienia z kanału:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {CHANNELS.filter(c => c.id !== copyFromModal && brief.channels[c.id]?.active).map(c => (
                      <button key={c.id} onClick={() => copyFromChannel(c.id, copyFromModal)}
                        style={{ textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0dbd4", background: "#f9f7f5", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#333" }}>
                        {c.label}
                      </button>
                    ))}
                    {CHANNELS.filter(c => c.id !== copyFromModal && brief.channels[c.id]?.active).length === 0 && (
                      <div style={{ color: "#aaa", fontSize: 12 }}>Brak innych aktywnych kanałów</div>
                    )}
                  </div>
                  <button onClick={() => setCopyFromModal(null)} style={{ marginTop: 16, width: "100%", background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "8px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#888" }}>Anuluj</button>
                </div>
              </div>
            )}

            {activeChannels.map(c => (
              <div key={c.id} style={{ display: activeChannel === c.id ? "block" : "none" }}>
                <div style={{ background: ACCENT, borderRadius: "10px 10px 0 0", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>KONFIGURACJA: {c.label}</div>
                  <button onClick={() => setCopyFromModal(c.id)}
                    style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    📋 Kopiuj z innego kanału
                  </button>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: "0 0 10px 10px", padding: 16, marginBottom: 16 }}>
                  <ChannelPanel channel={c} cfg={brief.channels[c.id]} onChange={val => setChannel(c.id, val)} />
                </div>
              </div>
            ))}

            {/* PODGLĄD AKTYWNYCH KANAŁÓW */}
            {activeChannels.length > 0 && (
              <Section title={`PODSUMOWANIE KANAŁÓW (${activeChannels.length})`}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeChannels.map(c => {
                    const cfg = brief.channels[c.id];
                    return (
                      <div key={c.id} style={{ padding: "10px 14px", borderRadius: 8, background: "#f9f7f5", border: "1px solid #e0dbd4" }}>
                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{c.label}</div>
                        <div style={{ fontSize: 11, color: "#666", display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {cfg.selectedFormats?.length > 0 && <span>📐 {cfg.selectedFormats.join(", ")}</span>}
                          {cfg.selectedTypes?.length > 0 && <span>🎨 {cfg.selectedTypes.join(", ")}</span>}
                          {cfg.slides && <span>📄 {cfg.slides} slajd(ów)</span>}
                          {cfg.cta && <span>👆 CTA: {cfg.ctaText === "Inne" ? cfg.ctaCustom : cfg.ctaText}</span>}
                          {cfg.visible?.length > 0 && <span>👁 {cfg.visible.join(", ")}</span>}
                        </div>
                        {cfg.hierarchy?.some(h => h) && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
                            Hierarchia: {cfg.hierarchy.filter(h => h).map((h, i) => `${i + 1}. ${h}`).join(" → ")}
                          </div>
                        )}
                        {cfg.notes && <div style={{ marginTop: 6, fontSize: 11, color: "#aaa", fontStyle: "italic" }}>{cfg.notes}</div>}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* DOLNY PASEK ZAPISU */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, paddingBottom: 32 }}>
              {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith("✅") ? "#2d7a4f" : "#cc0000", alignSelf: "center" }}>{saveMsg}</span>}
              <button onClick={exportDocx} disabled={exportingDocx} style={{ background: "#1a5ca8", color: "#fff", border: "none", borderRadius: 6, padding: "10px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {exportingDocx ? "Generuję..." : "⬇ Pobierz DOCX"}
              </button>
              <button onClick={exportXlsx} disabled={exportingXlsx} style={{ background: "#1a7a3a", color: "#fff", border: "none", borderRadius: 6, padding: "10px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {exportingXlsx ? "Generuję..." : "⬇ Pobierz XLSX"}
              </button>
              <button onClick={save} disabled={saving} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Zapisuję..." : "💾 Zapisz brief"}
              </button>
            </div>
          </div>

          {/* ─── PANEL CZATU AI ─── */}
          <div style={{ width: chatExpanded ? "100vw" : chatOpen ? 380 : 48, minWidth: chatExpanded ? "100vw" : chatOpen ? 380 : 48, borderLeft: "1px solid #e0dbd4", background: "#fff", display: "flex", flexDirection: "column", height: "100vh", position: chatExpanded ? "fixed" : "sticky", top: 0, right: chatExpanded ? 0 : "auto", zIndex: chatExpanded ? 100 : "auto", transition: "width 0.2s, min-width 0.2s", overflow: "hidden" }}>
            {/* Toggle button */}
            <button onClick={() => setChatOpen(o => !o)}
              style={{ position: "absolute", top: 16, left: chatOpen ? 12 : 8, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#aaa", zIndex: 10, padding: 4 }}>
              {chatOpen ? "→" : "←"}
            </button>

            {chatOpen && (<>
              {/* Header */}
              <div style={{ padding: "12px 16px 12px 40px", borderBottom: "1px solid #e0dbd4", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", fontFamily: "monospace" }}>🤖 Doradca AI</div>
                  <button onClick={clearChat} style={{ padding: "2px 8px", borderRadius: 20, border: "1px solid #eee", background: "none", color: "#ccc", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>Wyczyść</button>
                </div>
                {/* Wybór providera */}
                {(() => {
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
                  const activeProvider = chatModel.startsWith("claude") ? "claude" : chatModel.startsWith("gemini") ? "gemini" : "openai";
                  const activeColor = PROVIDERS.find(p => p.id === activeProvider)?.color || ACCENT;
                  const activeModelInfo = Object.values(MODELS).flat().find(m => m.id === chatModel);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {/* Provider tabs */}
                      <div style={{ display: "flex", gap: 4 }}>
                        {PROVIDERS.map(p => (
                          <button key={p.id} onClick={() => setChatModel(MODELS[p.id][0].id)}
                            style={{ flex: 1, padding: "4px 6px", borderRadius: 6, border: `1px solid ${activeProvider === p.id ? p.color : "#ddd"}`, background: activeProvider === p.id ? p.color + "15" : "#f9f9f9", color: activeProvider === p.id ? p.color : "#aaa", fontSize: 10, fontWeight: activeProvider === p.id ? 700 : 400, cursor: "pointer", fontFamily: "monospace" }}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {/* Model buttons */}
                      <div style={{ display: "flex", gap: 4 }}>
                        {MODELS[activeProvider].map(m => (
                          <button key={m.id} onClick={() => setChatModel(m.id)} title={`${m.tip} ${m.price}`}
                            style={{ flex: 1, padding: "4px 4px", borderRadius: 6, border: `1px solid ${chatModel === m.id ? activeColor : "#ddd"}`, background: chatModel === m.id ? activeColor + "15" : "#fafafa", color: chatModel === m.id ? activeColor : "#888", fontSize: 10, fontWeight: chatModel === m.id ? 700 : 400, cursor: "pointer", fontFamily: "monospace" }}>
                            {m.short}
                          </button>
                        ))}
                      </div>
                      {/* Info o modelu */}
                      {activeModelInfo && (
                        <div style={{ fontSize: 10, color: "#888", background: "#f9f7f5", borderRadius: 4, padding: "3px 8px", lineHeight: 1.4 }}>
                          ℹ️ {activeModelInfo.tip} <span style={{ color: activeColor, fontWeight: 700 }}>{activeModelInfo.price} tokenów</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* SYNTEZA */}
              {(synthesis || synthesizing) && (
                <div style={{ margin: "0 12px 0", background: "#fffbf5", border: `1px solid ${ACCENT}40`, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                  <div style={{ padding: "8px 12px", background: ACCENT + "15", borderBottom: `1px solid ${ACCENT}30`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, fontFamily: "monospace" }}>✨ Synteza rozmowy</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {synthesis && (
                        <>
                        <button onClick={copySynthesis} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: `1px solid ${ACCENT}40`, background: "none", color: ACCENT, cursor: "pointer", fontFamily: "monospace" }}>Kopiuj</button>
                        <button onClick={fillBriefFromSynthesis} style={{ fontSize: 10, padding: "2px 10px", borderRadius: 4, border: "1px solid " + ACCENT, background: ACCENT, color: "#fff", cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}>
                          {fillingBrief ? "⏳ Wypełniam..." : "📋 Wypełnij brief"}
                        </button>
                        </>
                      )}
                      <button onClick={() => setSynthesis(null)} style={{ fontSize: 14, background: "none", border: "none", color: "#ccc", cursor: "pointer", lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                  <div style={{ padding: 12, maxHeight: 300, overflowY: "auto" }}>
                    {synthesizing && <div style={{ color: "#aaa", fontSize: 12 }}>⏳ Generuję syntezę...</div>}
                    {synthesis && (
                      <div style={{ fontSize: 12, color: "#333", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                        {synthesis.split("\n").map((line, i) => {
                          if (line.startsWith('## ')) return <div key={i} style={{ fontWeight: 700, color: ACCENT, marginTop: i > 0 ? 12 : 0, marginBottom: 4, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{line.replace('## ', '')}</div>;
                          if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }}>• {line.replace(/^[-•] /, '')}</div>;
                          if (line.trim() === '') return <div key={i} style={{ height: 4 }} />;
                          return <div key={i} style={{ marginBottom: 2 }}>{line}</div>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wiadomości */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
                ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
                {(brief.chatHistory || []).length === 0 && brandSettings && (
                  <div style={{ background: "#fffbf5", border: "1px solid " + ACCENT + "40", borderRadius: 12, padding: 16, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, fontFamily: "monospace", marginBottom: 12 }}>🏷️ KONTEKST MARKI DLA TEJ ROZMOWY</div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>Wybierz co AI ma brać pod uwagę:</div>
                    {[
                      { key: "brand_description", label: "Opis marki", icon: "🏢", hasData: !!brandSettings.brand_description },
                      { key: "tone_of_voice", label: "Tone of voice", icon: "🗣️", hasData: !!brandSettings.tone_of_voice },
                      { key: "target_audiences", label: "Grupy docelowe", icon: "👥", hasData: (brandSettings.target_audiences || []).length > 0 },
                      { key: "campaign_examples", label: "Przykłady kampanii", icon: "📣", hasData: (brandSettings.campaign_examples || []).length > 0 },
                      { key: "reference_links", label: "Linki do materiałów", icon: "🔗", hasData: (brandSettings.reference_links || []).length > 0 },
                      { key: "uploaded_files", label: "Pliki (PDF, grafiki)", icon: "📄", hasData: (brandSettings.uploaded_files || []).length > 0 },
                    ].map(item => (
                      <div key={item.key} onClick={() => item.hasData && setBrandContextState(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 4, cursor: item.hasData ? "pointer" : "default", background: brandContext[item.key] && item.hasData ? ACCENT + "10" : "transparent", opacity: item.hasData ? 1 : 0.35 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid " + (brandContext[item.key] && item.hasData ? ACCENT : "#ccc"), background: brandContext[item.key] && item.hasData ? ACCENT : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {brandContext[item.key] && item.hasData && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 11 }}>{item.icon} {item.label}</span>
                        {!item.hasData && <span style={{ fontSize: 10, color: "#bbb", marginLeft: "auto" }}>brak danych</span>}
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: "#bbb", marginTop: 10, fontStyle: "italic" }}>Panel zniknie po wysłaniu pierwszej wiadomości</div>
                  </div>
                )}

                {(brief.chatHistory || []).length === 0 && (
                  <div style={{ textAlign: "center", color: "#ccc", fontSize: 12, marginTop: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                    <div>Zapytaj AI o nazwę akcji,<br/>strategię, copy lub ocenę briefu</div>
                  </div>
                )}
                {(brief.chatHistory || []).map((msg, i) => {
                  const modelColor = msg.model?.startsWith("claude") ? "#b8763a" : msg.model?.startsWith("gemini") ? "#4285f4" : "#10a37f";
                  const modelColors = { [msg.model]: modelColor };
                  const modelLabels = { [msg.model]: msg.model };
                  const isUser = msg.role === "user";
                  const msgTime = msg.ts ? new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                      {!isUser && <div style={{ fontSize: 9, color: modelColors[msg.model] || "#aaa", marginBottom: 3, fontFamily: "monospace", fontWeight: 700 }}>{msg.model}</div>}
                      <div style={{ maxWidth: "90%", padding: isUser ? "8px 12px" : "12px 16px", borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: isUser ? ACCENT : "#fff", color: isUser ? "#fff" : "#1a1a1a", fontSize: 12, lineHeight: 1.6, wordBreak: "break-word", border: isUser ? "none" : "1px solid #e8e0d8", boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
                        {isUser ? (
                          <div style={{ whiteSpace: "pre-wrap", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13, lineHeight: 1.6 }}>
                            {msg.content}
                            {msg.attachments?.length > 0 && (
                              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {msg.attachments.map((a, ai) => (
                                  <span key={ai} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "2px 6px", fontSize: 10 }}>📎 {a.name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>{renderMarkdown(msg.content)}</div>
                        )}
                      </div>
                      {msgTime && <div style={{ fontSize: 9, color: "#bbb", marginTop: 3, fontFamily: "monospace" }}>{msgTime}</div>}
                    </div>
                  );
                })}
                {chatLoading && (
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 4px", background: "#f5f2ee", fontSize: 12, color: "#aaa" }}>⏳ Myślę...</div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: 12, borderTop: "1px solid #e0dbd4", flexShrink: 0 }}>
                {/* Załączniki preview */}
                {attachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {attachments.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#f0ece6", border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", fontSize: 11 }}>
                        <span>{a.type.startsWith("image/") ? "🖼️" : "📄"} {a.name}</span>
                        <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Toolbar: załącznik + deep research */}
                <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#888", padding: "3px 8px", border: "1px solid #e0dbd4", borderRadius: 6, background: "#fafafa" }}>
                    <input type="file" multiple accept="image/*,.pdf,.txt,.md" onChange={async e => {
                      const files = Array.from(e.target.files);
                      const loaded = await Promise.all(files.map(f => new Promise(resolve => {
                        const reader = new FileReader();
                        if (f.type.startsWith("image/")) {
                          reader.onload = ev => resolve({ name: f.name, type: f.type, data: ev.target.result.split(",")[1] });
                          reader.readAsDataURL(f);
                        } else {
                          reader.onload = ev => resolve({ name: f.name, type: f.type, textContent: ev.target.result });
                          reader.readAsText(f);
                        }
                      })));
                      setAttachments(prev => [...prev, ...loaded]);
                      e.target.value = "";
                    }} style={{ display: "none" }} />
                    📎 Załącz
                  </label>
                  {(chatModel.startsWith("gemini") || chatModel.startsWith("gpt")) && (
                    <button onClick={() => setDeepResearch(d => !d)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${deepResearch ? "#4285f4" : "#e0dbd4"}`, background: deepResearch ? "#e8f0fe" : "#fafafa", color: deepResearch ? "#4285f4" : "#888", cursor: "pointer", fontFamily: "inherit", fontWeight: deepResearch ? 700 : 400 }}>
                      🔬 Deep Research {deepResearch ? "ON" : "OFF"}
                    </button>
                  )}
                  <button onClick={generateSynthesis} disabled={synthesizing || !(brief.chatHistory?.length)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${ACCENT}`, background: ACCENT + "15", color: ACCENT, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, opacity: !(brief.chatHistory?.length) ? 0.4 : 1 }}>
                    {synthesizing ? "⏳" : "✨ Synteza"}
                  </button>
                  <button onClick={() => setChatExpanded(e => !e)} style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #e0dbd4", background: "#fafafa", color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
                    {chatExpanded ? "⟩ Zwiń" : "⟨ Rozszerz"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Napisz wiadomość... (Enter = wyślij, Shift+Enter = nowa linia)"
                    rows={2}
                    onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"; }}
                    style={{ flex: 1, background: "#f9f7f5", border: "1px solid #ddd", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", resize: "none", outline: "none", minHeight: 42, maxHeight: 200, overflowY: "auto", lineHeight: 1.6, color: "#1a1a1a" }} />
                  <button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()}
                    style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontSize: 16, cursor: chatLoading ? "not-allowed" : "pointer", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>
                    ↑
                  </button>
                </div>
                <div style={{ fontSize: 10, color: "#ccc", marginTop: 6, textAlign: "center" }}>Shift+Enter = nowa linia • czat zapisywany z briefem</div>
              </div>
            </>)}
          </div>

          </div>
        )}
      </div>
    </div>
  );
}
