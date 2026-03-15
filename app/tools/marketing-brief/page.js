"use client";
import React, { useState, useEffect, useCallback } from "react";
import Nav from "../../components/Nav";

// ─── STAŁE ───────────────────────────────────────────────────────────────────

const ACCENT = "#b8763a";
const FORMAT_TYPES = ["Grafika statyczna", "Zdjęcie", "Wideo", "Animacja wideo AI", "Animacja HTML5"];

const CHANNELS = [
  {
    id: "organic_social",
    label: "📱 Social Media Organic",
    tooltip: "Posty organiczne na Instagramie i Facebooku — bez budżetu reklamowego.",
    formats: [
      { id: "organic_1080x1080", label: "Post kwadrat 1080×1080" },
      { id: "organic_1080x1350", label: "Post pionowy 1080×1350" },
      { id: "organic_stories", label: "Stories 1080×1920" },
      { id: "organic_reels", label: "Reels cover 1080×1920" },
      { id: "organic_karuzela", label: "Karuzela (1080×1080)", isCarousel: true },
    ],
  },
  {
    id: "meta_ads",
    label: "🎯 Meta Ads",
    tooltip: "Płatne reklamy na Facebooku i Instagramie.",
    formats: [
      { id: "meta_1080x1080", label: "Kwadrat 1080×1080" },
      { id: "meta_1080x1920", label: "Pionowy 1080×1920" },
      { id: "meta_1200x628", label: "Poziomy 1200×628" },
      { id: "meta_1080x1350", label: "Pionowy 1080×1350" },
      { id: "meta_karuzela", label: "Karuzela (1080×1080)", isCarousel: true },
    ],
  },
  {
    id: "google_ads",
    label: "🔍 Google Ads",
    tooltip: "Reklamy displayowe w sieci Google.",
    formats: [
      { id: "google_728x90", label: "Leaderboard 728×90" },
      { id: "google_300x250", label: "Medium Rectangle 300×250" },
      { id: "google_336x280", label: "Large Rectangle 336×280" },
      { id: "google_970x250", label: "Billboard 970×250" },
      { id: "google_300x600", label: "Half Page 300×600" },
      { id: "google_960x1200", label: "960×1200" },
      { id: "google_1200x628", label: "1200×628" },
      { id: "google_responsive", label: "Responsive Display" },
    ],
  },
  {
    id: "euvic360",
    label: "🌐 Euvic360",
    tooltip: "Kanał płatny Euvic360.",
    formats: [
      { id: "euvic_custom", label: "Format własny" },
    ],
  },
  {
    id: "email",
    label: "📧 Email / Newsletter",
    tooltip: "Grafiki do mailingu.",
    formats: [
      { id: "email_600x600", label: "600×600" },
      { id: "email_500x625", label: "500×625" },
    ],
    hasSketch: true,
  },
  {
    id: "slider_main",
    label: "🖥️ Slider strona główna",
    tooltip: "Baner na sliderze strony głównej. Wymiar: 799×670 px.",
    formats: [
      { id: "slider_main_1", label: "799×670 px" },
    ],
  },
  {
    id: "slider_category",
    label: "🗂️ Slider mini kategoria",
    tooltip: "Slider na stronie kategorii. Wymiar: 385×250 px.",
    formats: [
      { id: "slider_cat_1", label: "385×250 px" },
    ],
  },
  {
    id: "popup",
    label: "💬 Pop-up",
    tooltip: "Grafika pop-up. Wymiar: 500×500 px.",
    formats: [
      { id: "popup_500x500", label: "500×500 px" },
    ],
  },
  {
    id: "listing_banner",
    label: "🏷️ Baner na listingu",
    tooltip: "Baner na listingu produktów. Wymiar: 365×489 px.",
    formats: [
      { id: "listing_365x489", label: "365×489 px" },
    ],
  },
];

const CTA_OPTIONS = ["Kup teraz", "Sprawdź", "Dowiedz się więcej", "Zobacz ofertę", "Skorzystaj", "Zamów", "Odkryj", "Inne"];
const PRIORITY_OPTIONS = ["PROMOCJA", "PRODUKT", "BENEFIT", "CENA", "NOWOŚĆ", "KOLEKCJA", "WYDARZENIE"];
const VISIBLE_OPTIONS = ["Produkt", "Cena", "Rabat", "Kod rabatowy", "Data promocji", "Logo", "Packshot", "Twarz twórcy", "Claim/hasło", "Timer odliczania"];

const defaultChannel = () => ({
  active: false,
  selectedFormats: [],
  selectedTypes: [],
  formatNotes: {},
  slides: "1",
  cta: false,
  ctaText: "Kup teraz",
  ctaCustom: "",
  visible: [],
  hierarchy: ["", "", ""],
  notes: "",
  sketchUrl: "",
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
  draftLink: "",
  keyFindings: "",
  copyProposals: "",
  recommendations: "",
  references: { links: [], files: [] },
  chatHistory: [],
  channels: Object.fromEntries(CHANNELS.map(c => [c.id, defaultChannel()])),
});

// ─── UI KOMPONENTY ─────────────────────────────────────────────────────────

function Label({ children }) {
  return <div style={{ fontSize: "10px", fontWeight: 700, color: "#888", letterSpacing: 1.2, marginBottom: 5, textTransform: "uppercase", fontFamily: "monospace" }}>{children}</div>;
}

function Tooltip({ text, children }) {
  const [show, setShow] = React.useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <span style={{ marginLeft: 4, width: 14, height: 14, borderRadius: "50%", background: "#e0dbd4", color: "#888", fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", flexShrink: 0 }}>?</span>
      {show && (
        <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: "#1a1a1a", color: "#fff", fontSize: 11, padding: "6px 10px", borderRadius: 6, whiteSpace: "nowrap", maxWidth: 280, zIndex: 999, lineHeight: 1.5, fontFamily: "-apple-system, sans-serif", fontWeight: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", pointerEvents: "none" }}
          style2={{ whiteSpace: "normal" }}>
          {text}
        </span>
      )}
    </span>
  );
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
    {/* IMAGE EDITOR MODAL */}
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
  const toggleFormat = (fmtId) => {
    const cur = cfg.selectedFormats || [];
    onChange({ ...cfg, selectedFormats: cur.includes(fmtId) ? cur.filter(x => x !== fmtId) : [...cur, fmtId] });
  };
  const toggleVisible = (val) => {
    const cur = cfg.visible || [];
    onChange({ ...cfg, visible: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] });
  };
  const setFormatData = (fmtId, key, val) => {
    onChange({ ...cfg, formatData: { ...(cfg.formatData || {}), [fmtId]: { ...(cfg.formatData?.[fmtId] || {}), [key]: val } } });
  };
  const getFormatData = (fmtId, key, def = "") => (cfg.formatData?.[fmtId]?.[key] ?? def);

  const selectedFmts = channel.formats.filter(f => (cfg.selectedFormats || []).includes(f.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* WYBÓR FORMATÓW */}
      <Field label="Wybierz formaty">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {channel.formats.map(f => (
            <CheckPill key={f.id} label={f.label} checked={(cfg.selectedFormats || []).includes(f.id)} onChange={() => toggleFormat(f.id)} />
          ))}
        </div>
      </Field>

      {/* SZCZEGÓŁY KAŻDEGO FORMATU */}
      {selectedFmts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedFmts.map(fmt => (
            <div key={fmt.id} style={{ background: "#f9f7f5", border: "1px solid #e0dbd4", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "7px 12px", background: ACCENT + "12", borderBottom: "1px solid #e0dbd4", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, fontFamily: "monospace" }}>{fmt.label}</span>
                {fmt.isCarousel && <span style={{ fontSize: 10, color: "#aaa", fontStyle: "italic" }}>karuzela — opisz całość</span>}
              </div>
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Typ materiału per format */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 5, textTransform: "uppercase", fontFamily: "monospace" }}>Typ materiału</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {FORMAT_TYPES.map(t => {
                      const cur = getFormatData(fmt.id, "types", []);
                      const checked = Array.isArray(cur) ? cur.includes(t) : false;
                      return (
                        <button key={t} onClick={() => {
                          const cur2 = getFormatData(fmt.id, "types", []);
                          const arr = Array.isArray(cur2) ? cur2 : [];
                          setFormatData(fmt.id, "types", checked ? arr.filter(x => x !== t) : [...arr, t]);
                        }} style={{ padding: "4px 9px", borderRadius: 20, border: `1px solid ${checked ? ACCENT : "#ddd"}`, background: checked ? ACCENT + "15" : "#fff", color: checked ? ACCENT : "#888", fontSize: 11, cursor: "pointer", fontFamily: "monospace", fontWeight: checked ? 700 : 400 }}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Opis per typ lub ogólny dla karuzeli */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {fmt.isCarousel ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace" }}>Liczba kart:</span>
                        <select value={getFormatData(fmt.id, "karuzela_cards", "3")} onChange={e => setFormatData(fmt.id, "karuzela_cards", e.target.value)}
                          style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontFamily: "inherit", width: 52 }}>
                          {["2","3","4","5","6","7","8","9","10+"].map(n => <option key={n}>{n}</option>)}
                        </select>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 5, textTransform: "uppercase", fontFamily: "monospace" }}>Opis karuzeli</div>
                      <textarea value={getFormatData(fmt.id, "note_karuzela", "")} onChange={e => setFormatData(fmt.id, "note_karuzela", e.target.value)}
                        placeholder="Co ma być w karuzeli? Motyw, liczba kart, treść poszczególnych slajdów..."
                        rows={2} style={{ width: "100%", background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                    </div>
                  ) : (
                    (() => {
                      const selectedTypes = Array.isArray(getFormatData(fmt.id, "types", [])) ? getFormatData(fmt.id, "types", []) : [];
                      const notesForTypes = selectedTypes.length > 0 ? selectedTypes : ["ogólny"];
                      return notesForTypes.map(typ => (
                        <div key={typ} style={{ background: typ === "ogólny" ? "#fff" : "#f9f7f5", border: "1px solid #e8e0d8", borderRadius: 6, padding: "8px 10px" }}>
                          {typ !== "ogólny" && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#555", fontFamily: "monospace", textTransform: "uppercase" }}>{typ}</span>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: 10, color: "#888" }}>Liczba:</span>
                                <select value={getFormatData(fmt.id, "count_" + typ, "1")} onChange={e => setFormatData(fmt.id, "count_" + typ, e.target.value)}
                                  style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontFamily: "inherit", width: 52 }}>
                                  {["1","2","3","4","5","6","7","8","9","10+"].map(n => <option key={n}>{n}</option>)}
                                </select>
                                {selectedFmts.filter(f2 => f2.id !== fmt.id && !f2.isCarousel).length > 0 && (
                                  <select onChange={e => {
                                    if (!e.target.value) return;
                                    const srcNote = getFormatData(e.target.value, "note_" + typ, "");
                                    const srcCount = getFormatData(e.target.value, "count_" + typ, "1");
                                    if (srcNote) setFormatData(fmt.id, "note_" + typ, srcNote);
                                    if (srcCount) setFormatData(fmt.id, "count_" + typ, srcCount);
                                    e.target.value = "";
                                  }} style={{ fontSize: 10, background: "#fff", border: "1px solid #ddd", borderRadius: 4, padding: "2px 6px", color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
                                    <option value="">📋 Kopiuj z...</option>
                                    {selectedFmts.filter(f2 => f2.id !== fmt.id && !f2.isCarousel).map(f2 => (
                                      <option key={f2.id} value={f2.id}>{f2.label}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          )}
                          <textarea value={getFormatData(fmt.id, typ === "ogólny" ? "note" : "note_" + typ, "")}
                            onChange={e => setFormatData(fmt.id, typ === "ogólny" ? "note" : "note_" + typ, e.target.value)}
                            placeholder={typ === "ogólny" ? "Opis zawartości, co ma być widoczne..." : `Brief dla ${typ} — co ma być widoczne, styl, treść...`}
                            rows={2} style={{ width: "100%", background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SZKIC dla email */}
      {channel.hasSketch && (
        <Field label="Szkic układu newslettera (link do Figma, Drive, zdjęcia)">
          <input type="url" value={cfg.sketchUrl || ""} onChange={e => onChange({ ...cfg, sketchUrl: e.target.value })}
            placeholder="https://..."
            style={{ width: "100%", background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
        </Field>
      )}

      {/* CTA */}
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

      {/* CO WIDOCZNE */}
      <Field label={<Tooltip text="Zaznacz elementy które muszą pojawić się na grafice">Co ma być widoczne na grafice</Tooltip>}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {VISIBLE_OPTIONS.map(v => <CheckPill key={v} label={v} checked={(cfg.visible || []).includes(v)} onChange={() => toggleVisible(v)} />)}
        </div>
      </Field>

      {/* HIERARCHIA */}
      <Field label={<Tooltip text="Kolejność ważności elementów — co przykuwa uwagę w pierwszej kolejności">Hierarchia informacji</Tooltip>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#aaa", width: 20, textAlign: "center" }}>{i + 1}.</span>
              <Input value={(cfg.hierarchy || ["", "", ""])[i] || ""} onChange={v => { const h = [...(cfg.hierarchy || ["", "", ""])]; h[i] = v; onChange({ ...cfg, hierarchy: h }); }} placeholder={["Najważniejsze (np. hasło, rabat)", "Drugie (np. produkt, data)", "Trzecie (np. logo, CTA)"][i]} />
            </div>
          ))}
        </div>
      </Field>

      {/* UWAGI */}
      <Field label="Uwagi dodatkowe do kanału">
        <Textarea value={cfg.notes || ""} onChange={v => onChange({ ...cfg, notes: v })} placeholder="Dodatkowe wymagania, styl, tone of voice dla tego kanału..." rows={2} />
      </Field>
    </div>
  );
}

// ─── IMAGE EDITOR ────────────────────────────────────────────────────────────
function ImageEditor({ src, name, onSave, onClose }) {
  const canvasRef = React.useRef(null);
  const [tool, setTool] = React.useState("pen");
  const [color, setColor] = React.useState("#e63946");
  const [lineWidth, setLineWidth] = React.useState(3);
  const [drawing, setDrawing] = React.useState(false);
  const [startPos, setStartPos] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [text, setText] = React.useState("");
  const [showTextInput, setShowTextInput] = React.useState(false);
  const [textPos, setTextPos] = React.useState(null);
  const imgRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = window.innerWidth * 0.85;
      const maxH = window.innerHeight * 0.75;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      imgRef.current = img;
      saveHistory(ctx, canvas);
    };
    img.src = src;
  }, [src]);

  const saveHistory = (ctx, canvas) => {
    setHistory(h => [...h, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    }
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  };

  const onMouseDown = (e) => {
    const pos = getPos(e);
    if (tool === "text") {
      setTextPos(pos);
      setShowTextInput(true);
      return;
    }
    setDrawing(true);
    setStartPos(pos);
    if (tool === "pen") {
      const ctx = canvasRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const onMouseMove = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    if (tool === "pen") {
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    } else {
      // Dla rect/arrow/line - redraw z historii
      if (history.length > 0) ctx.putImageData(history[history.length - 1], 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      if (tool === "rect") {
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === "arrow" || tool === "line") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        if (tool === "arrow") {
          const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
          const len = 14 + lineWidth * 2;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x - len * Math.cos(angle - 0.4), pos.y - len * Math.sin(angle - 0.4));
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x - len * Math.cos(angle + 0.4), pos.y - len * Math.sin(angle + 0.4));
          ctx.stroke();
        }
      }
    }
  };

  const onMouseUp = (e) => {
    if (!drawing) return;
    setDrawing(false);
    saveHistory(canvasRef.current.getContext("2d"), canvasRef.current);
  };

  const addText = () => {
    if (!text.trim() || !textPos) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.font = `bold ${14 + lineWidth * 2}px -apple-system, sans-serif`;
    ctx.fillStyle = color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeText(text, textPos.x, textPos.y);
    ctx.fillText(text, textPos.x, textPos.y);
    saveHistory(ctx, canvas);
    setText("");
    setShowTextInput(false);
    setTextPos(null);
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (imgRef.current) ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    saveHistory(ctx, canvas);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    canvas.toBlob(blob => {
      const editedName = name.replace(/\.[^/.]+$/, "") + "_edited.png";
      onSave({ name: editedName, type: "image/png", blob, dataUrl: canvas.toDataURL("image/png") });
    }, "image/png");
  };

  const TOOLS = [
    { id: "pen", label: "✏️", title: "Pisak" },
    { id: "line", label: "╱", title: "Linia" },
    { id: "arrow", label: "→", title: "Strzałka" },
    { id: "rect", label: "▭", title: "Prostokąt" },
    { id: "text", label: "T", title: "Tekst" },
  ];
  const COLORS = ["#e63946", "#2196f3", "#4caf50", "#ff9800", "#9c27b0", "#000000", "#ffffff"];
  const WIDTHS = [2, 4, 7, 12];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, background: "#1a1a1a", padding: "10px 16px", borderRadius: 12, flexWrap: "wrap", maxWidth: "90vw" }}>
        {/* Narzędzia */}
        <div style={{ display: "flex", gap: 4 }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} title={t.title}
              style={{ width: 36, height: 36, borderRadius: 8, border: tool === t.id ? "2px solid #b8763a" : "1px solid #333", background: tool === t.id ? "#b8763a20" : "#111", color: tool === t.id ? "#b8763a" : "#aaa", fontSize: t.id === "text" ? 14 : 18, cursor: "pointer", fontWeight: 700 }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 28, background: "#333" }} />
        {/* Kolory */}
        <div style={{ display: "flex", gap: 4 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: color === c ? "3px solid #b8763a" : "2px solid #444", cursor: "pointer" }} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #444", cursor: "pointer", padding: 0 }} />
        </div>
        <div style={{ width: 1, height: 28, background: "#333" }} />
        {/* Grubość */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {WIDTHS.map(w => (
            <button key={w} onClick={() => setLineWidth(w)}
              style={{ width: 32, height: 32, borderRadius: 6, border: lineWidth === w ? "2px solid #b8763a" : "1px solid #333", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <div style={{ width: w * 2, height: w * 2, borderRadius: "50%", background: color, maxWidth: 20, maxHeight: 20 }} />
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 28, background: "#333" }} />
        {/* Akcje */}
        <button onClick={undo} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#aaa", cursor: "pointer", fontSize: 12 }}>↩ Cofnij</button>
        <button onClick={clearAll} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#aaa", cursor: "pointer", fontSize: 12 }}>🗑 Wyczyść</button>
        <button onClick={handleSave} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "#b8763a", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>💾 Zapisz</button>
        <button onClick={onClose} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #555", background: "none", color: "#888", cursor: "pointer", fontSize: 12 }}>✕ Zamknij</button>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative" }}>
        <canvas ref={canvasRef}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          style={{ display: "block", borderRadius: 8, cursor: tool === "text" ? "text" : "crosshair", maxWidth: "85vw", maxHeight: "75vh" }} />
        {showTextInput && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#1a1a1a", padding: 16, borderRadius: 10, display: "flex", gap: 8, flexDirection: "column", border: "1px solid #333" }}>
            <div style={{ fontSize: 11, color: "#888" }}>Wpisz tekst (kliknij na obrazku żeby umieścić)</div>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && addText()}
              autoFocus placeholder="Treść uwagi..."
              style={{ background: "#111", border: "1px solid #333", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 13, fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={addText} style={{ flex: 1, background: "#b8763a", color: "#fff", border: "none", borderRadius: 6, padding: "6px", cursor: "pointer", fontSize: 12 }}>Dodaj</button>
              <button onClick={() => setShowTextInput(false)} style={{ background: "#333", color: "#aaa", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ color: "#555", fontSize: 11, marginTop: 8 }}>Kliknij i przeciągnij aby rysować · Shift+Z = cofnij</div>
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
  const [imageEditor, setImageEditor] = useState(null); // { src, name, type }
  const [synthLength, setSynthLength] = useState("medium");
  const [copyFromModal, setCopyFromModal] = useState(null); // id kanału docelowego
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [summary, setSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const summaryRef = React.useRef(null);

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
          messages: newHistory.map(m => ({ role: m.role, content: m.content, model: m.model || null })),
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
      const lengthInstructions = {
        short: "Synteza ma być KRÓTKA i KOMPAKTOWA — max 5-7 punktów, tylko najważniejsze ustalenia i decyzje. Bez rozwijania.",
        medium: "Synteza ma być ŚREDNIEJ DŁUGOŚCI — kluczowe wnioski, propozycje copy i rekomendacje. Balans między kompletnością a zwięzłością.",
        long: "Synteza ma być ROZWINIĘTA i SZCZEGÓŁOWA — pełne omówienie wszystkich wątków, wszystkie propozycje copy, szczegółowe rekomendacje z uzasadnieniem.",
      };
      const summaryPrompt = `Na podstawie poniższej rozmowy przygotuj syntezę w formacie markdown.
${lengthInstructions[synthLength]}

Użyj struktury:
## PODSUMOWANIE ROZMOWY
## KLUCZOWE USTALENIA
## PROPOZYCJE COPY I NAGŁÓWKÓW
## REKOMENDACJE

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
      const prompt = `Jesteś asystentem który wypełnia formularze. Na podstawie poniższej syntezy rozmowy marketingowej, wyciągnij kluczowe informacje i zwróć JEDYNiE obiekt JSON - zero innych słów, zero wyjaśnień, zero markdown.

Format odpowiedzi (zwróć dokładnie taki JSON, pomiń pola których nie ma w syntezie):
{"name":"nazwa akcji","goal":"cel kampanii","headline":"główne hasło/slogan","discount":"zniżka lub kod rabatowy","dateStart":"YYYY-MM-DD 08:00","dateEnd":"YYYY-MM-DD 23:59","targetAudience":"opis grup docelowych","brandNotes":"dodatkowe uwagi i rekomendacje"}

SYNTEZA DO ANALIZY:
${textToUse}

Odpowiedz WYŁĄCZNIE samym JSON, nic więcej.`;

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

      // Wyczyść odpowiedź z markdown i wyciągnij JSON
      let raw = data.content.trim();
      raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      // Znajdź JSON nawet jeśli jest poprzedzony tekstem
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI nie zwróciło JSON. Odpowiedź: " + raw.slice(0, 100));
      const parsed = JSON.parse(jsonMatch[0]);

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

  const handleEditorSave = ({ name, type, blob, dataUrl }) => {
    // Dodaj do załączników czatu
    const newAttachment = { name, type, data: dataUrl.split(",")[1] };
    setAttachments(prev => [...prev, newAttachment]);

    // Dodaj też do referencji briefu (jako plik)
    const fileEntry = { name, url: dataUrl, note: "Edytowana grafika" };
    setBrief(b => ({ ...b, references: { ...b.references, files: [...(b.references?.files || []), fileEntry] } }));

    setImageEditor(null);
    alert("✅ Zapisano! Grafika dodana do załączników czatu i referencji briefu.");
  };

  const saveAndGenerateSummary = async () => {
    await save();
    setGeneratingSummary(true);
    try {
      const activeChList = CHANNELS.filter(c => brief.channels[c.id]?.active);
      const channelsSummary = activeChList.map(c => {
        const cfg = brief.channels[c.id];
        const fmts = (c.formats || []).filter(f => (cfg.selectedFormats || []).includes(f.id));
        return c.label + ": " + fmts.map(f => f.label).join(", ");
      }).join(" | ");

      const prompt = `Na podstawie poniższego briefu marketingowego napisz BARDZO KRÓTKIE podsumowanie (max 8 zdań / punktów) — samą esencję. Format: krótkie zdania lub bullet pointy. Bez wstępów. Tylko najważniejsze fakty: co za promocja, kiedy, dla kogo, hasło, kanały.

BRIEF:
Nazwa: ${brief.name || "—"}
Daty: ${brief.dateStart || "—"} → ${brief.dateEnd || "—"}
Cel: ${brief.goal || "—"}
Hasło: ${brief.headline || "—"}
Rabat: ${brief.discount || "—"} ${brief.promoCode ? "| Kod: " + brief.promoCode : ""}
Grupa docelowa: ${brief.targetAudience || "—"}
Kanały: ${channelsSummary || "—"}
Kluczowe ustalenia: ${brief.keyFindings || "—"}
Copy: ${brief.copyProposals || "—"}`;

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
      setSummary(data.content);
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch(e) {
      alert("Błąd generowania podsumowania: " + e.message);
    }
    setGeneratingSummary(false);
  };

  const activeChannels = CHANNELS.filter(c => brief.channels[c.id]?.active);

  const panelStyle = { background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, overflow: "hidden", marginBottom: 16 };
  const panelHead = { padding: "10px 16px", background: "#f9f7f5", borderBottom: "1px solid #e0dbd4", fontSize: 11, color: "#555", fontFamily: "monospace", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" };

  return (
    <>
    <Nav current="/tools/marketing-brief" />
    <div style={{ minHeight: "100vh", background: "#f5f2ee", fontFamily: "'IBM Plex Mono', monospace", display: "flex" }}>

      {/* SIDEBAR */}

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ─── LISTA BRIEFÓW ─── */}
        {view === "list" && (
          <div style={{ padding: 32, maxWidth: 900 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>📋 Akcje marketingowe</div>
                  <div style={{ fontSize: 12, color: "#888" }}>Historia briefów dla zespołu kreatywnego</div>
                </div>
                <button onClick={openNew} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  + Nowy brief
                </button>
              </div>
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
          <div style={{ flex: 1, padding: 32, overflowY: "auto", minWidth: 0 }}>
            {/* Nagłówek */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 8, padding: 0 }}>← Lista briefów</button>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{editId ? "Edytuj brief" : "Nowy brief"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith("✅") ? "#2d7a4f" : "#cc0000" }}>{saveMsg}</span>}
                <button onClick={openNew} style={{ background: "none", color: "#555", border: "1px solid #ccc", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  + Nowy brief
                </button>
                {summary && (
                  <button onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    style={{ background: "#1a7a3a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    📋 Sprawdź podsumowanie
                  </button>
                )}
                <div style={{ width: 1, height: 20, background: "#ddd" }} />
                <button onClick={exportDocx} disabled={exportingDocx} style={{ background: "#1a5ca8", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  {exportingDocx ? "..." : "⬇ DOCX"}
                </button>
                <button onClick={exportXlsx} disabled={exportingXlsx} style={{ background: "#1a7a3a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  {exportingXlsx ? "..." : "⬇ XLSX"}
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

            {/* LINK DO DRAFTU + USTALENIA */}
            <Section title="BRIEF ROZSZERZONY">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label={<Tooltip text="Link do rozszerzonego briefu lub draftu komunikacji (Notion, Google Docs, Figma itp.)">Link do rozszerzonego briefu / draftu</Tooltip>}>
                  <Input value={brief.draftLink || ""} onChange={v => set("draftLink", v)} placeholder="https://..." />
                </Field>
                <Field label={<Tooltip text="Kluczowe ustalenia z rozmów, spotkań lub syntezy AI — co zostało zdecydowane">Kluczowe ustalenia</Tooltip>}>
                  <Textarea value={brief.keyFindings || ""} onChange={v => set("keyFindings", v)} placeholder="Co zostało ustalone? Kluczowe decyzje i wnioski..." rows={3} />
                </Field>
                <Field label={<Tooltip text="Propozycje haseł, nagłówków i copy do wykorzystania w kreacjach">Propozycje copy i nagłówków</Tooltip>}>
                  <Textarea value={brief.copyProposals || ""} onChange={v => set("copyProposals", v)} placeholder="Hasła, nagłówki, CTA, treści do grafik..." rows={3} />
                </Field>
                <Field label={<Tooltip text="Rekomendacje strategiczne i kolejne kroki">Rekomendacje</Tooltip>}>
                  <Textarea value={brief.recommendations || ""} onChange={v => set("recommendations", v)} placeholder="Co warto zrobić? Kolejne kroki, sugestie..." rows={3} />
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
                    {brief.references.files.map((f, i) => {
                      const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name) || f.url?.startsWith("data:image");
                      return (
                      <div key={i} style={{ background: "#f0f7ff", border: "1px solid #c8e0f8", borderRadius: 6, padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 11, color: "#1a5ca8" }}>📄 {f.name}</a>
                          {isImg && <button onClick={() => setImageEditor({ src: f.url, name: f.name })} style={{ background: "#e8f0fe", border: "1px solid #c8e0f8", borderRadius: 4, color: "#1a5ca8", cursor: "pointer", fontSize: 10, padding: "2px 7px", fontFamily: "inherit" }}>🖊️ Edytuj</button>}
                          <button onClick={() => removeRef("files", i)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                        </div>
                        <input type="text" placeholder="Notatka (opcjonalnie)..." value={f.note || ""}
                          onChange={e => { const files = [...brief.references.files]; files[i] = { ...f, note: e.target.value }; setBrief(b => ({ ...b, references: { ...b.references, files } })); }}
                          style={{ width: "100%", background: "#fff", border: "1px solid #c8e0f8", borderRadius: 4, padding: "4px 8px", fontSize: 11, color: "#555", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                          );
                    })}
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
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, flexWrap: "wrap" }}>
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
              <button onClick={saveAndGenerateSummary} disabled={generatingSummary || saving}
                style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {generatingSummary ? "⏳ Generuję..." : "✨ Zapisz i generuj podsumowanie"}
              </button>
            </div>

            {/* PIGUŁKA PODSUMOWANIA */}
            {(summary || generatingSummary) && (
              <div ref={summaryRef} style={{ marginTop: 24, marginBottom: 32, background: "#fff", border: "3px solid #1a7a3a", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(26,122,58,0.15)" }}>
                <div style={{ padding: "14px 20px", background: "#1a7a3a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "monospace", letterSpacing: 0.5 }}>📋 PIGUŁKA BRIEFU</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Esencja akcji — do szybkiego podglądu</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => navigator.clipboard.writeText(summary || "")}
                      style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)", background: "none", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Kopiuj</button>
                    <button onClick={() => setSummary(null)}
                      style={{ fontSize: 16, background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", lineHeight: 1 }}>×</button>
                  </div>
                </div>
                <div style={{ padding: "20px 24px", background: "#f0faf4" }}>
                  {generatingSummary && <div style={{ color: "#aaa", fontSize: 13 }}>⏳ Generuję podsumowanie...</div>}
                  {summary && <div style={{ fontSize: 14, lineHeight: 1.8, color: "#1a1a1a", fontFamily: "-apple-system, sans-serif" }}>{renderMarkdown(summary)}</div>}
                </div>
              </div>
            )}
          </div>

          {/* ─── PANEL CZATU AI ─── */}
          <div style={{ width: chatExpanded ? "100vw" : chatOpen ? "clamp(360px, 35vw, 600px)" : 48, minWidth: chatExpanded ? "100vw" : chatOpen ? "clamp(360px, 35vw, 600px)" : 48, borderLeft: "1px solid #e0dbd4", background: "#fff", display: "flex", flexDirection: "column", height: "100vh", position: chatExpanded ? "fixed" : "sticky", top: 0, right: chatExpanded ? 0 : "auto", zIndex: chatExpanded ? 100 : "auto", transition: "width 0.2s, min-width 0.2s", overflow: "hidden" }}>
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
                  const isUser = msg.role === "user";
                  const msgTime = msg.ts ? new Date(msg.ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "";

                  // Dymek syntezy
                  if (msg.role === "synthesis") {
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                        <div style={{ fontSize: 9, color: ACCENT, marginBottom: 4, fontFamily: "monospace", fontWeight: 700 }}>✨ SYNTEZA ROZMOWY · {msgTime}</div>
                        <div style={{ width: "100%", background: "#fffdf7", border: "2px solid " + ACCENT, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(184,118,58,0.15)" }}>
                          <div style={{ padding: "10px 14px", borderBottom: "2px solid " + ACCENT + "40", display: "flex", justifyContent: "space-between", alignItems: "center", background: ACCENT + "18" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, fontFamily: "monospace" }}>✨ Synteza rozmowy</span>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => navigator.clipboard.writeText(msg.content)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid " + ACCENT + "60", background: "#fff", color: ACCENT, cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}>Kopiuj</button>
                              <button onClick={() => fillBriefFromSynthesis(msg.content)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}>
                                {fillingBrief ? "⏳..." : "📋 Wypełnij brief"}
                              </button>
                            </div>
                          </div>
                          <div style={{ padding: "14px 16px" }}>
                            {renderMarkdown(msg.content)}
                          </div>
                        </div>
                      </div>
                    );
                  }

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
                        {a.type.startsWith("image/") && (
                          <button onClick={() => setImageEditor({ src: `data:${a.type};base64,${a.data}`, name: a.name })}
                            style={{ background: "none", border: "1px solid #ccc", borderRadius: 3, color: "#888", cursor: "pointer", fontSize: 10, padding: "1px 5px" }}>🖊️</button>
                        )}
                        <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Toolbar */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Synteza + długość */}
                  <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `2px solid ${ACCENT}`, opacity: !(brief.chatHistory?.length) ? 0.45 : 1 }}>
                    <button onClick={generateSynthesis} disabled={synthesizing || !(brief.chatHistory?.length)}
                      style={{ fontSize: 12, padding: "7px 14px", background: ACCENT, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, border: "none", whiteSpace: "nowrap" }}>
                      {synthesizing ? "⏳ Generuję..." : "✨ Synteza"}
                    </button>
                    <select value={synthLength} onChange={e => setSynthLength(e.target.value)}
                      style={{ fontSize: 11, background: "#fff7f0", color: ACCENT, border: "none", borderLeft: `1px solid ${ACCENT}`, cursor: "pointer", fontFamily: "inherit", padding: "0 8px", fontWeight: 700, outline: "none" }}>
                      <option value="short">Krótka</option>
                      <option value="medium">Średnia</option>
                      <option value="long">Rozwinięta</option>
                    </select>
                  </div>
                  {/* Załącz */}
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#333", padding: "6px 12px", border: "1px solid #bbb", borderRadius: 8, background: "#fff", whiteSpace: "nowrap" }}>
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
                    📎 Plik
                  </label>
                  {/* Deep Research */}
                  {(chatModel.startsWith("gemini") || chatModel.startsWith("gpt")) && (
                    <button onClick={() => setDeepResearch(d => !d)}
                      style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: `1px solid ${deepResearch ? "#1a6fd4" : "#bbb"}`, background: deepResearch ? "#1a6fd4" : "#fff", color: deepResearch ? "#fff" : "#333", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {deepResearch ? "🔬 Deep ON" : "🔬 Deep"}
                    </button>
                  )}
                  {/* Rozszerz */}
                  <button onClick={() => setChatExpanded(e => !e)}
                    style={{ marginLeft: "auto", fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid #bbb", background: chatExpanded ? "#333" : "#fff", color: chatExpanded ? "#fff" : "#333", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {chatExpanded ? "↙ Zwiń" : "↗ Rozszerz"}
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
    {imageEditor && (
      <ImageEditor
        src={imageEditor.src}
        name={imageEditor.name}
        onSave={handleEditorSave}
        onClose={() => setImageEditor(null)}
      />
    )}
    </div>
      </>
  );
}
