"use client";
import { useState } from "react";
import Nav from "../../components/Nav";
import { useDarkMode } from "../../hooks/useDarkMode";

// ─── SZABLONY TIMERÓW ────────────────────────────────────────────────────────

const TEMPLATES = {
  classic: {
    name: "Klasyczny",
    desc: "Kwadratowe bloki, mocny kolor",
    digitStyle: (cfg) => ({
      background: cfg.bg,
      color: cfg.text,
      textAlign: "center",
      padding: "10px 6px",
      fontSize: "clamp(28px,5vw,54px)",
      lineHeight: 1,
      borderRadius: cfg.radius + "px",
      border: cfg.border ? `2px solid ${cfg.borderColor}` : "none",
      minWidth: "52px",
    }),
    labelStyle: (cfg) => ({
      color: cfg.labelText,
      textAlign: "center",
      fontSize: "13px",
      padding: "5px 4px",
      textTransform: "uppercase",
      letterSpacing: "1px",
    }),
    sepStyle: (cfg) => ({
      fontSize: "42px",
      fontWeight: 700,
      color: cfg.bg,
      marginTop: "-16px",
      padding: "0 2px",
    }),
    wrapEach: false,
  },
  split: {
    name: "Split (każda cyfra osobno)",
    desc: "Każda cyfra w osobnym boksie",
    digitStyle: (cfg) => ({
      background: cfg.bg,
      color: cfg.text,
      textAlign: "center",
      padding: "8px 10px",
      fontSize: "clamp(24px,4vw,48px)",
      lineHeight: 1,
      borderRadius: cfg.radius + "px",
      border: cfg.border ? `2px solid ${cfg.borderColor}` : "none",
      minWidth: "36px",
      display: "inline-block",
      margin: "0 2px",
    }),
    labelStyle: (cfg) => ({
      color: cfg.labelText,
      textAlign: "center",
      fontSize: "11px",
      padding: "4px 0",
      textTransform: "uppercase",
      letterSpacing: "1px",
    }),
    sepStyle: (cfg) => ({
      fontSize: "36px",
      fontWeight: 700,
      color: cfg.bg,
      marginTop: "-14px",
      padding: "0 2px",
    }),
    wrapEach: true,
  },
  minimal: {
    name: "Minimalny",
    desc: "Bez tła, tylko cyfry",
    digitStyle: (cfg) => ({
      background: "transparent",
      color: cfg.bg,
      textAlign: "center",
      padding: "4px 2px",
      fontSize: "clamp(32px,6vw,60px)",
      lineHeight: 1,
      fontWeight: 700,
      borderBottom: `3px solid ${cfg.bg}`,
      minWidth: "52px",
    }),
    labelStyle: (cfg) => ({
      color: cfg.labelText,
      textAlign: "center",
      fontSize: "11px",
      padding: "4px 0",
      textTransform: "uppercase",
      letterSpacing: "2px",
    }),
    sepStyle: (cfg) => ({
      fontSize: "42px",
      fontWeight: 300,
      color: cfg.bg,
      marginTop: "-20px",
      padding: "0 4px",
      opacity: 0.5,
    }),
    wrapEach: false,
  },
  pill: {
    name: "Pill / zaokrąglony",
    desc: "Duże zaokrąglenia, nowoczesny wygląd",
    digitStyle: (cfg) => ({
      background: cfg.bg,
      color: cfg.text,
      textAlign: "center",
      padding: "12px 8px",
      fontSize: "clamp(26px,4vw,50px)",
      lineHeight: 1,
      borderRadius: "999px",
      border: cfg.border ? `2px solid ${cfg.borderColor}` : "none",
      minWidth: "56px",
    }),
    labelStyle: (cfg) => ({
      color: cfg.labelText,
      textAlign: "center",
      fontSize: "11px",
      padding: "6px 0",
      textTransform: "uppercase",
      letterSpacing: "1px",
    }),
    sepStyle: (cfg) => ({
      fontSize: "38px",
      fontWeight: 700,
      color: cfg.bg,
      marginTop: "-16px",
      padding: "0 2px",
    }),
    wrapEach: false,
  },
};

// ─── GENEROWANIE HTML ────────────────────────────────────────────────────────

function buildHTML(deadline, cfg, tpl) {
  const r = cfg.radius;
  const borderCSS = cfg.border ? `border:2px solid ${cfg.borderColor};` : "";

  const digitCSS = tpl === "split"
    ? `background:${cfg.bg};color:${cfg.text};text-align:center;padding:8px 10px;font-size:clamp(24px,4vw,48px);line-height:1;border-radius:${r}px;${borderCSS}min-width:36px;display:inline-block;margin:0 2px;`
    : tpl === "minimal"
    ? `background:transparent;color:${cfg.bg};text-align:center;padding:4px 2px;font-size:clamp(32px,6vw,60px);line-height:1;font-weight:700;border-bottom:3px solid ${cfg.bg};min-width:52px;`
    : tpl === "pill"
    ? `background:${cfg.bg};color:${cfg.text};text-align:center;padding:12px 8px;font-size:clamp(26px,4vw,50px);line-height:1;border-radius:999px;${borderCSS}min-width:56px;`
    : `background:${cfg.bg};color:${cfg.text};text-align:center;padding:10px 6px;font-size:clamp(28px,5vw,54px);line-height:1;border-radius:${r}px;${borderCSS}min-width:52px;`;

  const labelCSS = `color:${cfg.labelText};text-align:center;font-size:13px;padding:5px 4px;text-transform:uppercase;letter-spacing:1px;`;
  const sepColor = tpl === "minimal" ? cfg.bg : cfg.bg;
  const sepCSS = `display:flex;align-items:center;font-size:clamp(22px,4vw,42px);font-weight:700;color:${sepColor};margin-top:-16px;padding:0 2px;`;

  const digitItem = (unit, label) => tpl === "split"
    ? `<div style="display:flex;flex-direction:column;align-items:center;max-width:90px;flex:1">
        <div style="display:flex;justify-content:center">
          <div class="nwz-digits" data-unit="${unit}-d1" style="${digitCSS}">0</div>
          <div class="nwz-digits" data-unit="${unit}-d2" style="${digitCSS}">0</div>
        </div>
        <div style="${labelCSS}">${label}</div>
      </div>`
    : `<div style="display:flex;flex-direction:column;max-width:90px;flex:1">
        <div class="nwz-digits" data-unit="${unit}" style="${digitCSS}">00</div>
        <div style="${labelCSS}">${label}</div>
      </div>`;

  return `<div id="promo-countdown" data-deadline="${deadline}" data-template="${tpl}" data-bg="${cfg.bg}" data-text="${cfg.text}" data-label-text="${cfg.labelText}" data-separator="${cfg.separator}">
  <div style="display:flex;align-items:center;justify-content:center;gap:8px;font-family:Arial,sans-serif;width:100%;">
    ${digitItem("days","DNI")}
    <div style="${sepCSS}">:</div>
    ${digitItem("hours","GODZIN")}
    <div style="${sepCSS}">:</div>
    ${digitItem("minutes","MINUT")}
    <div style="${sepCSS}">:</div>
    ${digitItem("seconds","SEKUND")}
  </div>
</div>`;
}

function buildJS(tpl) {
  const isSplit = tpl === "split";
  return `(function(){
  var c=document.getElementById("promo-countdown");
  if(!c)return;
  var deadline=new Date(c.dataset.deadline).getTime();
  if(isNaN(deadline))return;
  function pad(n){return String(n).padStart(2,"0");}
  function update(){
    var diff=deadline-Date.now();
    if(diff<0)diff=0;
    var d=Math.floor(diff/86400000);
    var h=Math.floor(diff/3600000)%24;
    var m=Math.floor(diff/60000)%60;
    var s=Math.floor(diff/1000)%60;
    ${isSplit ? `
    var vals={days:pad(d),hours:pad(h),minutes:pad(m),seconds:pad(s)};
    ["days","hours","minutes","seconds"].forEach(function(u){
      var el1=c.querySelector('[data-unit="'+u+'-d1"]');
      var el2=c.querySelector('[data-unit="'+u+'-d2"]');
      if(el1)el1.textContent=vals[u][0];
      if(el2)el2.textContent=vals[u][1];
    });` : `
    var els={days:c.querySelector('[data-unit="days"]'),hours:c.querySelector('[data-unit="hours"]'),minutes:c.querySelector('[data-unit="minutes"]'),seconds:c.querySelector('[data-unit="seconds"]')};
    if(els.days)els.days.textContent=pad(d);
    if(els.hours)els.hours.textContent=pad(h);
    if(els.minutes)els.minutes.textContent=pad(m);
    if(els.seconds)els.seconds.textContent=pad(s);`}
  }
  update();
  setInterval(update,1000);
})();`;
}

// ─── UI KOMPONENTY ────────────────────────────────────────────────────────────

function ColorInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "36px", height: "28px", border: "none", padding: 0, cursor: "pointer", background: "none" }} />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "5px 8px", color: "#ccc", fontSize: "12px", fontFamily: "monospace" }} />
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: "10px", fontWeight: 700, color: "#888", letterSpacing: 1.2, fontFamily: "monospace", marginBottom: "6px", textTransform: "uppercase" }}>{children}</div>;
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{ background: copied ? "#2d7a4f" : "#b8763a", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 14px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>
      {copied ? "✓ Skopiowano" : label}
    </button>
  );
}

// ─── PODGLĄD LIVE ─────────────────────────────────────────────────────────────

function CountdownPreview({ cfg, tplKey, deadline }) {
  const [time, setTime] = useState({ d: "05", h: "12", m: "34", s: "56" });
  const tpl = TEMPLATES[tplKey];

  useState(() => {
    function update() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) return;
      const p = n => String(n).padStart(2, "0");
      setTime({
        d: p(Math.floor(diff / 86400000)),
        h: p(Math.floor(diff / 3600000) % 24),
        m: p(Math.floor(diff / 60000) % 60),
        s: p(Math.floor(diff / 1000) % 60),
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  });

  const ds = tpl.digitStyle(cfg);
  const ls = tpl.labelStyle(cfg);
  const ss = tpl.sepStyle(cfg);

  const unit = (val, label) => {
    if (tplKey === "split") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "90px", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={ds}>{val[0]}</div>
            <div style={ds}>{val[1]}</div>
          </div>
          <div style={ls}>{label}</div>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "90px", flex: 1 }}>
        <div style={ds}>{val}</div>
        <div style={ls}>{label}</div>
      </div>
    );
  };

  const sep = <div style={ss}>:</div>;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "Arial,sans-serif", width: "100%" }}>
      {unit(time.d, "DNI")}{sep}{unit(time.h, "GODZIN")}{sep}{unit(time.m, "MINUT")}{sep}{unit(time.s, "SEKUND")}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function CountdownGenerator() {
  const [deadline, setDeadline] = useState("2026-04-01T23:59:59");
  const [tplKey, setTplKey] = useState("classic");
  const [cfg, setCfg] = useState({
    bg: "#b63b2f",
    text: "#ffffff",
    labelText: "#5b5b5b",
    separator: "#ffffff",
    radius: 4,
    border: false,
    borderColor: "#ffffff",
  });
  const [dark, toggleDark] = useDarkMode();
  const [jsModified, setJsModified] = useState(false);
  const [customJs, setCustomJs] = useState("");

  const set = (key, val) => setCfg(prev => ({ ...prev, [key]: val }));
  const t = {
    bg: dark ? "#0a0a0a" : "#f5f2ee",
    bgPanel: dark ? "#111" : "#ffffff",
    bgPanel2: dark ? "#0a0a0a" : "#f9f7f5",
    border: dark ? "#1a1a1a" : "#e0dbd4",
    text: dark ? "#ccc" : "#1a1a1a",
    textSub: dark ? "#555" : "#888",
    textMuted: dark ? "#444" : "#aaa",
    accent: "#b8763a",
    input: dark ? "#1a1a1a" : "#ffffff",
    inputBorder: dark ? "#2a2a2a" : "#ddd",
    code: dark ? "#a8d8a8" : "#2d6a2d",
    codeBg: dark ? "#0a0a0a" : "#f0f7f0",
  };
  const defaultJs = buildJS(tplKey);
  const jsCode = customJs || defaultJs;
  const html = buildHTML(deadline, cfg, tplKey);


  const panelStyle = { background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", marginBottom: "20px" };
  const panelHead = { padding: "10px 16px", borderBottom: `1px solid ${t.border}`, fontSize: "11px", color: t.textSub, display: "flex", justifyContent: "space-between", alignItems: "center" };

  return (
    <>
    <Nav current="/tools/countdown" />
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "monospace", display: "flex", transition: "background 0.2s" }}>

      {/* SIDEBAR */}

      {/* MAIN */}
      <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        <div style={{ maxWidth: "820px" }}>
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontSize: 28, fontWeight: 400, color: "#1a1814", marginBottom: 4, lineHeight: 1.2 }}>⏱ Generator odliczania</div>
            <div style={{ fontSize: "12px", color: t.textSub }}>Wybierz szablon, skonfiguruj kolory i skopiuj gotowy HTML + JS</div>
          </div>

          {/* WYBÓR SZABLONU */}
          <div style={panelStyle}>
            <div style={panelHead}><span>Wybierz szablon</span></div>
            <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button key={key} onClick={() => { setTplKey(key); setCustomJs(""); setJsModified(false); }}
                  style={{ textAlign: "left", padding: "12px", borderRadius: "8px", border: tplKey === key ? "1px solid #b8763a" : `1px solid ${t.border}`, background: tplKey === key ? "#b8763a10" : t.bgPanel2, cursor: "pointer", color: tplKey === key ? "#b8763a" : t.textSub }}>
                  <div style={{ fontWeight: 700, fontSize: "12px", marginBottom: "2px" }}>{t.name}</div>
                  <div style={{ fontSize: "10px", opacity: 0.7 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* KONFIGURACJA */}
          <div style={panelStyle}>
            <div style={panelHead}><span>Konfiguracja</span></div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <Field label="Data i godzina końca promocji">
                <input type="datetime-local" value={deadline.slice(0, 16)} onChange={e => setDeadline(e.target.value + ":59")}
                  style={{ background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: "6px", padding: "8px 10px", color: t.text, fontSize: "13px", fontFamily: "monospace" }} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label="Kolor tła cyfr"><ColorInput value={cfg.bg} onChange={v => set("bg", v)} /></Field>
                <Field label="Kolor cyfr"><ColorInput value={cfg.text} onChange={v => set("text", v)} /></Field>
                <Field label="Kolor etykiet"><ColorInput value={cfg.labelText} onChange={v => set("labelText", v)} /></Field>
              </div>
              {tplKey !== "minimal" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <Field label={`Zaokrąglenie narożników: ${cfg.radius}px`}>
                    <input type="range" min="0" max="50" value={cfg.radius} onChange={e => set("radius", Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#b8763a" }} />
                  </Field>
                  <Field label="Obramowanie">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="checkbox" checked={cfg.border} onChange={e => set("border", e.target.checked)} style={{ accentColor: "#b8763a", width: "16px", height: "16px" }} />
                      {cfg.border && <ColorInput value={cfg.borderColor} onChange={v => set("borderColor", v)} />}
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* PODGLĄD */}
          <div style={panelStyle}>
            <div style={panelHead}><span>Podgląd live</span></div>
            <div style={{ padding: "32px", background: dark ? "#1a1a1a" : "#f5f2ee", display: "flex", justifyContent: "center" }}>
              <CountdownPreview cfg={cfg} tplKey={tplKey} deadline={deadline} />
            </div>
          </div>

          {/* KOD HTML */}
          <div style={panelStyle}>
            <div style={panelHead}>
              <span>Kod HTML — wklej do slidera</span>
              <CopyBtn text={html} label="Kopiuj HTML" />
            </div>
            <pre style={{ margin: 0, padding: "16px", background: t.codeBg, color: t.code, fontSize: "11px", lineHeight: 1.6, overflowX: "auto" }}>{html}</pre>
          </div>

          {/* KOD JS */}
          <div style={{ ...panelStyle, border: jsModified ? "1px solid #cc4400" : `1px solid ${t.border}` }}>
            <div style={{ ...panelHead, borderBottom: jsModified ? "1px solid #cc4400" : `1px solid ${t.border}`, color: jsModified ? "#ff6633" : t.textSub }}>
              <span>{jsModified ? "⚠️ Kod JS — ZMIENIONY — zaktualizuj w Shoperze!" : "Kod JS — bez zmian"}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                {jsModified && (
                  <button onClick={() => { setCustomJs(""); setJsModified(false); }}
                    style={{ background: "none", color: "#666", border: "1px solid #333", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>
                    Przywróć oryginał
                  </button>
                )}
                <CopyBtn text={jsCode} label="Kopiuj JS" />
              </div>
            </div>
            <textarea value={jsCode} onChange={e => { setCustomJs(e.target.value); setJsModified(e.target.value !== defaultJs); }}
              style={{ width: "100%", minHeight: "180px", background: t.codeBg, color: jsModified ? "#cc4400" : t.code, border: "none", padding: "16px", fontSize: "11px", fontFamily: "monospace", lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", outline: "none" }} />
          </div>

          {jsModified && (
            <div style={{ background: "#3a1a0a", border: "1px solid #cc4400", borderRadius: "8px", padding: "14px 16px", fontSize: "12px", color: "#ff6633", lineHeight: 1.6, fontWeight: 700, marginBottom: "20px" }}>
              ⚠️ Kod JS został zmieniony — pamiętaj zaktualizować plik JS w Shoperze przed użyciem nowego HTML!
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
