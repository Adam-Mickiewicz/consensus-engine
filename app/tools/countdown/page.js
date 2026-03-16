"use client";
import { useState, useEffect } from "react";
import Nav from "../../components/Nav";
import { useDarkMode } from "../../hooks/useDarkMode";

const TEMPLATES = {
  classic: {
    name: "Klasyczny", desc: "Kwadratowe bloki, mocny kolor",
    digitStyle: (cfg) => ({ background: cfg.bg, color: cfg.text, textAlign: "center", padding: "10px 6px", fontSize: "clamp(28px,5vw,54px)", lineHeight: 1, borderRadius: cfg.radius + "px", border: cfg.border ? `2px solid ${cfg.borderColor}` : "none", minWidth: "52px" }),
    labelStyle: (cfg) => ({ color: cfg.labelText, textAlign: "center", fontSize: "13px", padding: "5px 4px", textTransform: "uppercase", letterSpacing: "1px" }),
    sepStyle: (cfg) => ({ fontSize: "42px", fontWeight: 700, color: cfg.bg, marginTop: "-16px", padding: "0 2px" }),
    wrapEach: false,
  },
  split: {
    name: "Split (każda cyfra osobno)", desc: "Każda cyfra w osobnym boksie",
    digitStyle: (cfg) => ({ background: cfg.bg, color: cfg.text, textAlign: "center", padding: "8px 10px", fontSize: "clamp(24px,4vw,48px)", lineHeight: 1, borderRadius: cfg.radius + "px", border: cfg.border ? `2px solid ${cfg.borderColor}` : "none", minWidth: "36px", display: "inline-block", margin: "0 2px" }),
    labelStyle: (cfg) => ({ color: cfg.labelText, textAlign: "center", fontSize: "11px", padding: "4px 0", textTransform: "uppercase", letterSpacing: "1px" }),
    sepStyle: (cfg) => ({ fontSize: "36px", fontWeight: 700, color: cfg.bg, marginTop: "-14px", padding: "0 2px" }),
    wrapEach: true,
  },
  minimal: {
    name: "Minimalny", desc: "Bez tła, tylko cyfry",
    digitStyle: (cfg) => ({ background: "transparent", color: cfg.bg, textAlign: "center", padding: "4px 2px", fontSize: "clamp(32px,6vw,60px)", lineHeight: 1, fontWeight: 700, borderBottom: `3px solid ${cfg.bg}`, minWidth: "52px" }),
    labelStyle: (cfg) => ({ color: cfg.labelText, textAlign: "center", fontSize: "11px", padding: "4px 0", textTransform: "uppercase", letterSpacing: "2px" }),
    sepStyle: (cfg) => ({ fontSize: "42px", fontWeight: 300, color: cfg.bg, marginTop: "-20px", padding: "0 4px", opacity: 0.5 }),
    wrapEach: false,
  },
  pill: {
    name: "Pill / zaokrąglony", desc: "Duże zaokrąglenia, nowoczesny wygląd",
    digitStyle: (cfg) => ({ background: cfg.bg, color: cfg.text, textAlign: "center", padding: "12px 8px", fontSize: "clamp(26px,4vw,50px)", lineHeight: 1, borderRadius: "999px", border: cfg.border ? `2px solid ${cfg.borderColor}` : "none", minWidth: "56px" }),
    labelStyle: (cfg) => ({ color: cfg.labelText, textAlign: "center", fontSize: "11px", padding: "6px 0", textTransform: "uppercase", letterSpacing: "1px" }),
    sepStyle: (cfg) => ({ fontSize: "38px", fontWeight: 700, color: cfg.bg, marginTop: "-16px", padding: "0 2px" }),
    wrapEach: false,
  },
};

const BTN_STYLES = {
  "btn--red": { bg: "#cc0000", color: "#fff", border: "none", borderRadius: "4px" },
  "btn--custom3": { bg: "#1a1a1a", color: "#fff", border: "none", borderRadius: "4px" },
};

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
  const sepCSS = `display:flex;align-items:center;font-size:clamp(22px,4vw,42px);font-weight:700;color:${cfg.bg};margin-top:-16px;padding:0 2px;`;
  const digitItem = (unit, label) => tpl === "split"
    ? `<div style="display:flex;flex-direction:column;align-items:center;max-width:90px;flex:1"><div style="display:flex;justify-content:center"><div class="nwz-digits" data-unit="${unit}-d1" style="${digitCSS}">0</div><div class="nwz-digits" data-unit="${unit}-d2" style="${digitCSS}">0</div></div><div style="${labelCSS}">${label}</div></div>`
    : `<div style="display:flex;flex-direction:column;max-width:90px;flex:1"><div class="nwz-digits" data-unit="${unit}" style="${digitCSS}">00</div><div style="${labelCSS}">${label}</div></div>`;
  return `<div id="promo-countdown" data-deadline="${deadline}" data-template="${tpl}" data-bg="${cfg.bg}" data-text="${cfg.text}" data-label-text="${cfg.labelText}">
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
    ${isSplit ? `var vals={days:pad(d),hours:pad(h),minutes:pad(m),seconds:pad(s)};
    ["days","hours","minutes","seconds"].forEach(function(u){
      var el1=c.querySelector('[data-unit="'+u+'-d1"]');
      var el2=c.querySelector('[data-unit="'+u+'-d2"]');
      if(el1)el1.textContent=vals[u][0];
      if(el2)el2.textContent=vals[u][1];
    });` : `var els={days:c.querySelector('[data-unit="days"]'),hours:c.querySelector('[data-unit="hours"]'),minutes:c.querySelector('[data-unit="minutes"]'),seconds:c.querySelector('[data-unit="seconds"]')};
    if(els.days)els.days.textContent=pad(d);
    if(els.hours)els.hours.textContent=pad(h);
    if(els.minutes)els.minutes.textContent=pad(m);
    if(els.seconds)els.seconds.textContent=pad(s);`}
  }
  update();
  setInterval(update,1000);
})();`;
}

function buildSliderHTML(s) {
  const timerHTML = s.useTimer ? `
          <p style="color:${s.timerTextColor};"><b>${s.timerCopy}</b></p>
          ${buildHTML(s.timerDeadline, { bg: s.timerBg, text: s.timerText, labelText: s.timerLabelText, radius: Number(s.timerRadius), border: s.timerBorder, borderColor: s.timerBorderColor }, s.timerTemplate)}
          <script>${buildJS(s.timerTemplate)}<\/script>` : "";
  const dateAttrs = (s.dateStart || s.dateEnd) ? ` data-start="${s.dateStart || ""}" data-end="${s.dateEnd || ""}"` : "";
  return `<!--poczatek-slide-->
    <li class="slide"${dateAttrs}>
      <div class="columns">
        <!--kolumna-z-grafika-->
        <a href="${s.link}" class="column column--1" style="background-color:${s.bgColor};">
          <div class="image__wrapper">
            <img src="${s.image1}" alt="hero image"/>
          </div>
        </a>
        <!--koniec-kolumny-z-grafika-->
        <!--kolumna-z-tekstem-->
        <div class="column column--2" style="background-color:${s.bgColor};">
          <div class="content">
            <img src="${s.image2}" alt="hero image"/>${timerHTML}
            <br><br>
            <a href="${s.link}">
              <button class="btn btn--custom ${s.btnClass}">${s.btnText}</button>
            </a>
          </div>
        </div>
        <!--koniec-kolumny-z-tekstem-->
      </div>
    </li>
    <!--koniec-slide-->`;
}

// ─── UI KOMPONENTY ────────────────────────────────────────────────────────────

function ColorInput({ value, onChange, inputBg, inputBorder, textColor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "36px", height: "32px", border: `1px solid ${inputBorder || "#2a2a2a"}`, borderRadius: "6px", padding: "2px", cursor: "pointer", background: "none" }} />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, background: inputBg || "#1a1a1a", border: `1px solid ${inputBorder || "#2a2a2a"}`, borderRadius: "6px", padding: "5px 8px", color: textColor || "#ccc", fontSize: "12px", fontFamily: "monospace" }} />
    </div>
  );
}

function Label({ children, color }) {
  return <div style={{ fontSize: "10px", fontWeight: 700, color: color || "#888", letterSpacing: 1.2, fontFamily: "monospace", marginBottom: "6px", textTransform: "uppercase" }}>{children}</div>;
}

function Field({ label, children, labelColor }) {
  return (
    <div>
      <Label color={labelColor}>{label}</Label>
      {children}
    </div>
  );
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: copied ? "#2d7a4f" : "#b8763a", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 14px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>
      {copied ? "✓ Skopiowano" : label}
    </button>
  );
}

function CountdownPreview({ cfg, tplKey, deadline }) {
  const [time, setTime] = useState({ d: "05", h: "12", m: "34", s: "56" });
  const tpl = TEMPLATES[tplKey];
  useEffect(() => {
    function update() {
      const diff = Math.max(0, new Date(deadline).getTime() - Date.now());
      const p = n => String(n).padStart(2, "0");
      setTime({ d: p(Math.floor(diff/86400000)), h: p(Math.floor(diff/3600000)%24), m: p(Math.floor(diff/60000)%60), s: p(Math.floor(diff/1000)%60) });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  const ds = tpl.digitStyle(cfg);
  const ls = tpl.labelStyle(cfg);
  const ss = tpl.sepStyle(cfg);
  const unit = (val, label) => tplKey === "split"
    ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "90px", flex: 1 }}><div style={{ display: "flex", justifyContent: "center" }}><div style={ds}>{val[0]}</div><div style={ds}>{val[1]}</div></div><div style={ls}>{label}</div></div>
    : <div style={{ display: "flex", flexDirection: "column", maxWidth: "90px", flex: 1 }}><div style={ds}>{val}</div><div style={ls}>{label}</div></div>;
  const sep = <div style={ss}>:</div>;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "Arial,sans-serif", width: "100%" }}>
      {unit(time.d, "DNI")}{sep}{unit(time.h, "GODZIN")}{sep}{unit(time.m, "MINUT")}{sep}{unit(time.s, "SEKUND")}
    </div>
  );
}

function SliderPreview({ s, t }) {
  const [mobile, setMobile] = useState(false);
  const btnStyle = BTN_STYLES[s.btnClass] || BTN_STYLES["btn--red"];
  const previewHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:${s.bgColor};}
    .columns{display:grid;grid-template-columns:${mobile ? "1fr" : "1fr 1fr"};align-items:center;height:${mobile ? "auto" : "380px"};width:100%;}
    .column--1{background:${s.bgColor};overflow:hidden;height:${mobile ? "220px" : "380px"};}
    .column--1 .image__wrapper{width:100%;height:100%;}
    .column--1 .image__wrapper img{width:100%;height:100%;object-fit:cover;display:block;}
    .column--2{background:${s.bgColor};display:flex;align-items:center;justify-content:center;padding:${mobile ? "20px 16px" : "32px 40px"};}
    .content{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;max-width:420px;width:100%;}
    .content img{max-width:100%;height:auto;display:block;}
    .btn--custom{display:inline-block;padding:12px 32px;font-size:14px;font-weight:700;cursor:pointer;text-transform:uppercase;border:none;border-radius:3px;font-family:inherit;}
    .btn--red{background:#cc0000;color:#fff;}
    .btn--custom3{background:#1a1a1a;color:#fff;}
    p{line-height:1.6;margin:4px 0;}
  </style></head><body>
  <div class="columns">
    <div class="column--1">${s.image1 ? `<img src="${s.image1}" alt=""/>` : `<div style="width:200px;height:200px;background:#ddd;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;">Grafika 1</div>`}</div>
    <div class="column--2"><div class="content">
      ${s.image2 ? `<img src="${s.image2}" alt=""/>` : `<div style="width:180px;height:60px;background:#ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;">Nagłówek</div>`}
      ${s.useTimer ? `<p style="color:${s.timerTextColor};font-weight:700;">${s.timerCopy}</p><div style="padding:8px 0">[Timer: ${s.timerTemplate}]</div>` : ""}
      <a href="${s.link}"><button class="btn">${s.btnText}</button></a>
    </div></div>
  </div>
  </body></html>`;

  return (
    <div style={{ background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, fontSize: "11px", color: t.textSub, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Podgląd slidera</span>
        <div style={{ display: "flex", gap: "6px" }}>
          <span style={{ color: t.textMuted, fontSize: "11px", marginRight: 4 }}>{mobile ? "375px" : "900px"}</span>
          <button onClick={() => setMobile(false)} style={{ background: !mobile ? "#1a1a1a" : "transparent", color: !mobile ? "#fff" : t.textSub, border: `1px solid ${t.border}`, borderRadius: "5px", padding: "3px 10px", fontSize: "11px", cursor: "pointer" }}>🖥 Desktop</button>
          <button onClick={() => setMobile(true)} style={{ background: mobile ? "#1a1a1a" : "transparent", color: mobile ? "#fff" : t.textSub, border: `1px solid ${t.border}`, borderRadius: "5px", padding: "3px 10px", fontSize: "11px", cursor: "pointer" }}>📱 Mobile</button>
        </div>
      </div>
      <div style={{ padding: "16px", background: t.bgPanel2, display: "flex", justifyContent: "center", overflowX: "auto" }}>
        <iframe srcDoc={previewHTML} style={{ width: mobile ? "375px" : "100%", height: mobile ? "500px" : "360px", border: "none", borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", display: "block" }} title="Podgląd slidera" />
      </div>
    </div>
  );
}

function TimerPanel({ s, set, t, inputStyle }) {
  const timerCfg = { bg: s.timerBg, text: s.timerText, labelText: s.timerLabelText, radius: Number(s.timerRadius || 4), border: s.timerBorder || false, borderColor: s.timerBorderColor || "#fff" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <Field label="Tekst przed timerem" labelColor={t.textSub}>
        <input value={s.timerCopy} onChange={e => set("timerCopy", e.target.value)} style={inputStyle} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Kolor tekstu" labelColor={t.textSub}><ColorInput value={s.timerTextColor} onChange={v => set("timerTextColor", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} /></Field>
        <Field label="Data końca timera" labelColor={t.textSub}>
          <input type="datetime-local" value={s.timerDeadline.slice(0,16)} onChange={e => set("timerDeadline", e.target.value + ":59")} style={inputStyle} />
        </Field>
      </div>
      <div style={{ background: t.bgPanel2, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "12px" }}>
        <div style={{ fontSize: "10px", color: t.textSub, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px" }}>Wybierz szablon timera</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <button key={key} onClick={() => set("timerTemplate", key)}
              style={{ textAlign: "left", padding: "10px", borderRadius: "8px", border: s.timerTemplate === key ? "1px solid #b8763a" : `1px solid ${t.border}`, background: s.timerTemplate === key ? "#b8763a10" : t.bgPanel, cursor: "pointer", color: s.timerTemplate === key ? "#b8763a" : t.textSub }}>
              <div style={{ fontWeight: 700, fontSize: "11px", marginBottom: "2px" }}>{tpl.name}</div>
              <div style={{ fontSize: "10px", opacity: 0.7 }}>{tpl.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Kolor tła cyfr" labelColor={t.textSub}><ColorInput value={s.timerBg} onChange={v => set("timerBg", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} /></Field>
          <Field label="Kolor cyfr" labelColor={t.textSub}><ColorInput value={s.timerText} onChange={v => set("timerText", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} /></Field>
          <Field label="Kolor etykiet" labelColor={t.textSub}><ColorInput value={s.timerLabelText} onChange={v => set("timerLabelText", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} /></Field>
          {s.timerTemplate !== "minimal" && (
            <>
              <Field label={`Zaokrąglenie: ${s.timerRadius || 4}px`} labelColor={t.textSub}>
                <input type="range" min="0" max="50" value={s.timerRadius || 4} onChange={e => set("timerRadius", Number(e.target.value))} style={{ width: "100%", accentColor: "#b8763a" }} />
              </Field>
              <Field label="Obramowanie" labelColor={t.textSub}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input type="checkbox" checked={s.timerBorder || false} onChange={e => set("timerBorder", e.target.checked)} style={{ accentColor: "#b8763a", width: "16px", height: "16px" }} />
                  {s.timerBorder && <ColorInput value={s.timerBorderColor || "#fff"} onChange={v => set("timerBorderColor", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} />}
                </div>
              </Field>
            </>
          )}
        </div>
        <div style={{ marginTop: "14px", background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", display: "flex", justifyContent: "center" }}>
          <CountdownPreview cfg={timerCfg} tplKey={s.timerTemplate} deadline={s.timerDeadline} />
        </div>
      </div>
    </div>
  );
}

function SliderGenerator({ t, tplKey, deadline }) {
  const [s, setS] = useState({
    image1: "", image2: "", link: "https://nadwyraz.com/", bgColor: "#E5BF8E",
    dateStart: "", dateEnd: "", btnText: "Sprawdź! >", btnClass: "btn--red",
    useTimer: false, timerCopy: "Oferta kończy się za:", timerTextColor: "#1a1a1a",
    timerDeadline: deadline, timerBg: "#b63b2f", timerText: "#ffffff", timerLabelText: "#5b5b5b",
    timerTemplate: tplKey, timerRadius: 4, timerBorder: false, timerBorderColor: "#ffffff",
  });
  const set = (k, v) => setS(prev => ({ ...prev, [k]: v }));
  const html = buildSliderHTML(s);
  const inputStyle = { background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: "6px", padding: "7px 10px", color: t.text, fontSize: "13px", fontFamily: "monospace", width: "100%", boxSizing: "border-box" };
  const panelStyle = { background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", marginBottom: "20px" };
  const panelHead = { padding: "10px 16px", borderBottom: `1px solid ${t.border}`, fontSize: "11px", color: t.textSub, display: "flex", justifyContent: "space-between", alignItems: "center" };
  const btnStyle = BTN_STYLES[s.btnClass] || BTN_STYLES["btn--red"];

  return (
    <div>
      {/* GRAFIKI I LINK */}
      <div style={panelStyle}>
        <div style={panelHead}><span>Grafiki i link</span></div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <Field label="Grafika 1 — zdjęcie produktu (URL)" labelColor={t.textSub}>
            <input value={s.image1} onChange={e => set("image1", e.target.value)} placeholder="/userdata/public/assets/..." style={inputStyle} />
          </Field>
          <Field label="Grafika 2 — nagłówek (URL)" labelColor={t.textSub}>
            <input value={s.image2} onChange={e => set("image2", e.target.value)} placeholder="/userdata/public/assets/..." style={inputStyle} />
          </Field>
          <Field label="Link (href)" labelColor={t.textSub}>
            <input value={s.link} onChange={e => set("link", e.target.value)} placeholder="https://nadwyraz.com/..." style={inputStyle} />
          </Field>
          <Field label="Kolor tła" labelColor={t.textSub}>
            <ColorInput value={s.bgColor} onChange={v => set("bgColor", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} />
          </Field>
        </div>
      </div>

      {/* DATY WIDOCZNOŚCI */}
      <div style={panelStyle}>
        <div style={panelHead}><span>Daty widoczności (opcjonalne)</span></div>
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Data rozpoczęcia" labelColor={t.textSub}>
            <input type="datetime-local" value={s.dateStart} onChange={e => set("dateStart", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Data zakończenia" labelColor={t.textSub}>
            <input type="datetime-local" value={s.dateEnd} onChange={e => set("dateEnd", e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>

      {/* PRZYCISK */}
      <div style={panelStyle}>
        <div style={panelHead}><span>Przycisk</span></div>
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "start" }}>
          <Field label="Tekst przycisku" labelColor={t.textSub}>
            <input value={s.btnText} onChange={e => set("btnText", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Styl przycisku" labelColor={t.textSub}>
            <select value={s.btnClass} onChange={e => set("btnClass", e.target.value)} style={inputStyle}>
              <option value="btn--red">btn--red (czerwony)</option>
              <option value="btn--custom3">btn--custom3 (czarny)</option>
            </select>
          </Field>
          <div />
          <div style={{ paddingTop: "4px" }}>
            <Label color={t.textSub}>Podgląd przycisku</Label>
            <div style={{ padding: "12px", background: s.bgColor, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button style={{ padding: "10px 24px", fontSize: "14px", fontWeight: 700, cursor: "default", background: btnStyle.bg, color: btnStyle.color, border: btnStyle.border, borderRadius: btnStyle.borderRadius }}>
                {s.btnText || "Przycisk"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TIMER */}
      <div style={{ ...panelStyle, border: s.useTimer ? "1px solid #b8763a" : `1px solid ${t.border}` }}>
        <div style={{ ...panelHead, borderBottom: s.useTimer ? "1px solid #b8763a" : `1px solid ${t.border}` }}>
          <span>Timer odliczania (opcjonalny)</span>
          <div onClick={() => set("useTimer", !s.useTimer)} style={{ width: "34px", height: "18px", borderRadius: "9px", background: s.useTimer ? "#b8763a" : "#888", position: "relative", cursor: "pointer" }}>
            <div style={{ position: "absolute", top: "1px", left: s.useTimer ? "17px" : "1px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
        </div>
        {s.useTimer && (
          <div style={{ padding: "16px" }}>
            <TimerPanel s={s} set={set} t={t} inputStyle={inputStyle} />
          </div>
        )}
      </div>

      {/* PODGLĄD */}
      <SliderPreview s={s} t={t} />

      {/* KOD HTML */}
      <div style={panelStyle}>
        <div style={panelHead}>
          <span>Gotowy kod HTML slidera</span>
          <CopyBtn text={html} label="Kopiuj HTML" />
        </div>
        <pre style={{ margin: 0, padding: "16px", background: t.codeBg, color: t.code, fontSize: "11px", lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{html}</pre>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function CountdownGenerator() {
  const [deadline, setDeadline] = useState("2026-04-01T23:59:59");
  const [tplKey, setTplKey] = useState("classic");
  const [cfg, setCfg] = useState({ bg: "#b63b2f", text: "#ffffff", labelText: "#5b5b5b", separator: "#ffffff", radius: 4, border: false, borderColor: "#ffffff" });
  const [dark, toggleDark] = useDarkMode();
  const [activeTab, setActiveTab] = useState("slider");
  const [jsModified, setJsModified] = useState(false);
  const [customJs, setCustomJs] = useState("");

  const set = (key, val) => setCfg(prev => ({ ...prev, [key]: val }));
  const t = {
    bg: dark ? "#0a0a0a" : "#f5f2ee", bgPanel: dark ? "#111" : "#ffffff", bgPanel2: dark ? "#0a0a0a" : "#f9f7f5",
    border: dark ? "#1a1a1a" : "#e0dbd4", text: dark ? "#ccc" : "#1a1a1a", textSub: dark ? "#555" : "#888",
    textMuted: dark ? "#444" : "#aaa", accent: "#b8763a", input: dark ? "#1a1a1a" : "#ffffff",
    inputBorder: dark ? "#2a2a2a" : "#ddd", code: dark ? "#a8d8a8" : "#2d6a2d", codeBg: dark ? "#0a0a0a" : "#f0f7f0",
  };
  const defaultJs = buildJS(tplKey);
  const jsCode = customJs || defaultJs;
  const html = buildHTML(deadline, cfg, tplKey);
  const panelStyle = { background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", marginBottom: "20px" };
  const panelHead = { padding: "10px 16px", borderBottom: `1px solid ${t.border}`, fontSize: "11px", color: t.textSub, display: "flex", justifyContent: "space-between", alignItems: "center" };
  const inputStyle = { background: t.input, border: `1px solid ${t.inputBorder}`, borderRadius: "6px", padding: "7px 10px", color: t.text, fontSize: "13px", fontFamily: "monospace", width: "100%", boxSizing: "border-box" };

  return (
    <>
    <Nav current="/tools/countdown" />
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "monospace", display: "flex", transition: "background 0.2s" }}>
      <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        <div style={{ maxWidth: "820px" }}>
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontSize: 28, fontWeight: 400, color: dark ? "#f0ece6" : "#1a1814", marginBottom: 4, lineHeight: 1.2 }}>⏱ Narzędzia sliderów</div>
            <div style={{ fontSize: "12px", color: t.textSub }}>Generator sliderów i timer odliczania dla Shopera</div>
          </div>

          {/* ZAKŁADKI */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "24px", background: t.bgPanel, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "4px" }}>
            {[{ id: "slider", label: "🖼 Generator sliderów" }, { id: "countdown", label: "⏱ Countdown" }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ flex: 1, padding: "8px 16px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "monospace", background: activeTab === tab.id ? "#b8763a" : "transparent", color: activeTab === tab.id ? "#fff" : t.textSub, transition: "all 0.15s" }}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "slider" && <SliderGenerator t={t} tplKey={tplKey} deadline={deadline} />}

          {activeTab === "countdown" && <div>
            {/* WYBÓR SZABLONU */}
            <div style={panelStyle}>
              <div style={panelHead}><span>Wybierz szablon</span></div>
              <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                  <button key={key} onClick={() => { setTplKey(key); setCustomJs(""); setJsModified(false); }}
                    style={{ textAlign: "left", padding: "12px", borderRadius: "8px", border: tplKey === key ? "1px solid #b8763a" : `1px solid ${t.border}`, background: tplKey === key ? "#b8763a10" : t.bgPanel2, cursor: "pointer", color: tplKey === key ? "#b8763a" : t.textSub }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", marginBottom: "2px" }}>{tpl.name}</div>
                    <div style={{ fontSize: "10px", opacity: 0.7 }}>{tpl.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            {/* KONFIGURACJA */}
            <div style={panelStyle}>
              <div style={panelHead}><span>Konfiguracja</span></div>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <Field label="Data i godzina końca promocji" labelColor={t.textSub}>
                  <input type="datetime-local" value={deadline.slice(0, 16)} onChange={e => setDeadline(e.target.value + ":59")}
                    style={inputStyle} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <Field label="Kolor tła cyfr" labelColor={t.textSub}><ColorInput value={cfg.bg} onChange={v => set("bg", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} /></Field>
                  <Field label="Kolor cyfr" labelColor={t.textSub}><ColorInput value={cfg.text} onChange={v => set("text", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} /></Field>
                  <Field label="Kolor etykiet" labelColor={t.textSub}><ColorInput value={cfg.labelText} onChange={v => set("labelText", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} /></Field>
                </div>
                {tplKey !== "minimal" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <Field label={`Zaokrąglenie narożników: ${cfg.radius}px`} labelColor={t.textSub}>
                      <input type="range" min="0" max="50" value={cfg.radius} onChange={e => set("radius", Number(e.target.value))} style={{ width: "100%", accentColor: "#b8763a" }} />
                    </Field>
                    <Field label="Obramowanie" labelColor={t.textSub}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" checked={cfg.border} onChange={e => set("border", e.target.checked)} style={{ accentColor: "#b8763a", width: "16px", height: "16px" }} />
                        {cfg.border && <ColorInput value={cfg.borderColor} onChange={v => set("borderColor", v)} inputBg={t.input} inputBorder={t.inputBorder} textColor={t.text} />}
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
                <span>{jsModified ? "Kod JS — ZMIENIONY — zaktualizuj w Shoperze!" : "Kod JS — bez zmian"}</span>
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
                Kod JS został zmieniony — pamiętaj zaktualizować plik JS w Shoperze przed użyciem nowego HTML!
              </div>
            )}
          </div>}
        </div>
      </div>
    </div>
    </>
  );
}
