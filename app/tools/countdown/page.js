"use client";
import { useState } from "react";

const DEFAULT_JS = `(function () {
  const container = document.getElementById("promo-countdown");
  if (!container) return;
  const deadlineValue = container.dataset.deadline || "";
  const bg = container.dataset.bg || "#b63b2f";
  const text = container.dataset.text || "#ffffff";
  const labelBg = container.dataset.labelBg || "#efe7de";
  const labelText = container.dataset.labelText || "#5b5b5b";
  const separator = container.dataset.separator || "#ffffff";
  const style = document.createElement("style");
  style.innerHTML = `
#promo-countdown .nwz-countdown{display:flex;align-items:center;justify-content:center;gap:8px;font-family:Arial,sans-serif;width:100%;}
#promo-countdown .nwz-item{display:flex;flex-direction:column;max-width:90px;flex:1;}
#promo-countdown .nwz-digits{background:${bg};color:${text};text-align:center;padding:10px 6px;font-size:clamp(28px,5vw,54px);line-height:1;}
#promo-countdown .nwz-label{background:transparent;color:${labelText};text-align:center;font-size:15px;padding:6px 4px;text-transform:uppercase;}
#promo-countdown .nwz-sep{display:flex;align-items:center;font-size:clamp(22px,4vw,42px);font-weight:700;color:${bg};margin-top:-16px;}
  `;
  document.head.appendChild(style);
  container.innerHTML = `
    <div class="nwz-countdown">
      <div class="nwz-item"><div class="nwz-digits" data-unit="days">00</div><div class="nwz-label">DNI</div></div>
      <div class="nwz-sep">:</div>
      <div class="nwz-item"><div class="nwz-digits" data-unit="hours">00</div><div class="nwz-label">GODZIN</div></div>
      <div class="nwz-sep">:</div>
      <div class="nwz-item"><div class="nwz-digits" data-unit="minutes">00</div><div class="nwz-label">MINUT</div></div>
      <div class="nwz-sep">:</div>
      <div class="nwz-item"><div class="nwz-digits" data-unit="seconds">00</div><div class="nwz-label">SEKUND</div></div>
    </div>
  `;
  const deadline = new Date(deadlineValue).getTime();
  if (isNaN(deadline)) return;
  const daysEl = container.querySelector('[data-unit="days"]');
  const hoursEl = container.querySelector('[data-unit="hours"]');
  const minutesEl = container.querySelector('[data-unit="minutes"]');
  const secondsEl = container.querySelector('[data-unit="seconds"]');
  function pad(n) { return String(n).padStart(2, "0"); }
  function update() {
    const now = new Date().getTime();
    const diff = deadline - now;
    if (diff <= 0) { daysEl.textContent = hoursEl.textContent = minutesEl.textContent = secondsEl.textContent = "00"; return; }
    daysEl.textContent = pad(Math.floor(diff / (1000*60*60*24)));
    hoursEl.textContent = pad(Math.floor((diff / (1000*60*60)) % 24));
    minutesEl.textContent = pad(Math.floor((diff / (1000*60)) % 60));
    secondsEl.textContent = pad(Math.floor((diff / 1000) % 60));
  }
  update();
  setInterval(update, 1000);
})();`;

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
  return <div style={{ fontSize: "10px", fontWeight: 700, color: "#555", letterSpacing: 1.2, fontFamily: "monospace", marginBottom: "6px", textTransform: "uppercase" }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function CountdownGenerator() {
  const [deadline, setDeadline] = useState("2026-04-01T23:59:59");
  const [bg, setBg] = useState("#b63b2f");
  const [text, setText] = useState("#ffffff");
  const [labelBg, setLabelBg] = useState("#efe7de");
  const [labelText, setLabelText] = useState("#5b5b5b");
  const [separator, setSeparator] = useState("#ffffff");
  const [copied, setCopied] = useState(false);
  const [js, setJs] = useState(DEFAULT_JS);
  const [jsModified, setJsModified] = useState(false);
  const [jsCopied, setJsCopied] = useState(false);

  const handleJsChange = (val) => {
    setJs(val);
    setJsModified(val !== DEFAULT_JS);
  };

  const copyJs = () => {
    navigator.clipboard.writeText(js);
    setJsCopied(true);
    setTimeout(() => setJsCopied(false), 2000);
  };

  const resetJs = () => {
    setJs(DEFAULT_JS);
    setJsModified(false);
  };

  const html = `<div 
  id="promo-countdown"
  data-deadline="${deadline}"
  data-bg="${bg}"
  data-text="${text}"
  data-label-bg="${labelBg}"
  data-label-text="${labelText}"
  data-separator="${separator}">
</div>`;

  const copy = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems = [
    { href: "/", label: "⚡ Consensus Engine" },
    { href: "/newsletter-builder", label: "📧 Newsletter Builder" },
    { href: "/sock-designer", label: "🧦 Sock Designer" },
    { href: "/design-judge", label: "🎨 Design Judge" },
    { href: "/tools/countdown", label: "⏱ Generator odliczania", active: true },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ccc", fontFamily: "monospace", display: "flex" }}>

      {/* SIDEBAR */}
      <div style={{ width: "220px", minWidth: "220px", background: "#0a0a0a", borderRight: "1px solid #1a1a1a", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "8px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ color: "#b8763a", fontWeight: 800, fontSize: "13px", letterSpacing: 2 }}>CONSENSUS</div>
          <div style={{ color: "#444", fontSize: "10px", letterSpacing: 1 }}>ENGINE v1.0</div>
        </div>
        <div style={{ color: "#555", fontSize: "10px", fontWeight: 700, letterSpacing: 1.2, marginBottom: "4px" }}>NAWIGACJA</div>
        {navItems.map(item => (
          <a key={item.href} href={item.href} style={{ display: "block", padding: "9px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: item.active ? 700 : 400, background: item.active ? "#b8763a20" : "none", border: item.active ? "1px solid #b8763a40" : "1px solid transparent", color: item.active ? "#b8763a" : "#666", textDecoration: "none" }}>{item.label}</a>
        ))}
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        <div style={{ maxWidth: "800px" }}>
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>⏱ Generator odliczania</div>
            <div style={{ fontSize: "12px", color: "#555" }}>Skonfiguruj timer i skopiuj gotowy HTML do slidera</div>
          </div>

          {/* FORMULARZ */}
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>

            <Field label="Data i godzina końca promocji">
              <input type="datetime-local" value={deadline.slice(0, 16)} onChange={e => setDeadline(e.target.value + ":59")}
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "8px 10px", color: "#ccc", fontSize: "13px", fontFamily: "monospace" }} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Kolor tła cyfr"><ColorInput value={bg} onChange={setBg} /></Field>
              <Field label="Kolor cyfr"><ColorInput value={text} onChange={setText} /></Field>
              <Field label="Kolor tła etykiet"><ColorInput value={labelBg} onChange={setLabelBg} /></Field>
              <Field label="Kolor etykiet"><ColorInput value={labelText} onChange={setLabelText} /></Field>
              <Field label="Kolor separatora"><ColorInput value={separator} onChange={setSeparator} /></Field>
            </div>
          </div>

          {/* PODGLĄD */}
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1a1a1a", fontSize: "11px", color: "#555" }}>Podgląd</div>
            <div style={{ padding: "24px", background: "#f5f2ee", display: "flex", justifyContent: "center" }}>
              <CountdownPreview bg={bg} text={text} labelText={labelText} separator={separator} deadline={deadline} />
            </div>
          </div>

          {/* KOD HTML */}
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1a1a1a", fontSize: "11px", color: "#555", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Kod HTML — wklej do slidera</span>
              <button onClick={copy} style={{ background: copied ? "#2d7a4f" : "#b8763a", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 14px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>
                {copied ? "✓ Skopiowano" : "Kopiuj HTML"}
              </button>
            </div>
            <pre style={{ margin: 0, padding: "16px", color: "#a8d8a8", fontSize: "12px", lineHeight: 1.6, overflowX: "auto" }}>{html}</pre>
          </div>

          {jsModified && (
            <div style={{ marginTop: "16px", background: "#3a1a0a", border: "1px solid #cc4400", borderRadius: "8px", padding: "12px 16px", fontSize: "12px", color: "#ff6633", lineHeight: 1.6, fontWeight: 700 }}>
              ⚠️ Kod JS został zmieniony — pamiętaj zaktualizować plik JS w Shoperze!
            </div>
          )}
          {!jsModified && (
            <div style={{ marginTop: "16px", background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "12px 16px", fontSize: "11px", color: "#555", lineHeight: 1.6 }}>
              ✅ Kod JS nie był zmieniany — możesz wkleić tylko HTML powyżej.
            </div>
          )}

          {/* EDYTOR JS */}
          <div style={{ background: "#111", border: `1px solid ${jsModified ? "#cc4400" : "#1a1a1a"}`, borderRadius: "12px", overflow: "hidden", marginTop: "24px" }}>
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${jsModified ? "#cc4400" : "#1a1a1a"}`, fontSize: "11px", color: jsModified ? "#ff6633" : "#555", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{jsModified ? "⚠️ Kod JS — ZMIENIONY" : "Kod JS — bez zmian"}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                {jsModified && <button onClick={resetJs} style={{ background: "none", color: "#666", border: "1px solid #333", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>Przywróć oryginał</button>}
                <button onClick={copyJs} style={{ background: jsCopied ? "#2d7a4f" : jsModified ? "#cc4400" : "#333", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 14px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>
                  {jsCopied ? "✓ Skopiowano" : "Kopiuj JS"}
                </button>
              </div>
            </div>
            <textarea value={js} onChange={e => handleJsChange(e.target.value)}
              style={{ width: "100%", minHeight: "200px", background: "#0a0a0a", color: "#a8d8a8", border: "none", padding: "16px", fontSize: "11px", fontFamily: "monospace", lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", outline: "none" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CountdownPreview({ bg, text, labelText, separator, deadline }) {
  const [time, setTime] = useState({ d: "00", h: "00", m: "00", s: "00" });

  useState(() => {
    function update() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) return;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      const p = n => String(n).padStart(2, "0");
      setTime({ d: p(d), h: p(h), m: p(m), s: p(s) });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  });

  const unit = (val, label) => (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: "90px", flex: 1 }}>
      <div style={{ background: bg, color: text, textAlign: "center", padding: "10px 6px", fontSize: "clamp(28px,5vw,54px)", lineHeight: 1 }}>{val}</div>
      <div style={{ color: labelText, textAlign: "center", fontSize: "15px", padding: "6px 4px", textTransform: "uppercase" }}>{label}</div>
    </div>
  );

  const sep = <div style={{ display: "flex", alignItems: "center", fontSize: "42px", fontWeight: 700, color: bg, marginTop: "-16px" }}>:</div>;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "Arial,sans-serif", width: "100%" }}>
      {unit(time.d, "DNI")}{sep}{unit(time.h, "GODZIN")}{sep}{unit(time.m, "MINUT")}{sep}{unit(time.s, "SEKUND")}
    </div>
  );
}
