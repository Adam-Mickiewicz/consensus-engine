"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const TOOLS = [
  {
    href: "/debate",
    icon: "⚡",
    label: "Core",
    name: "Consensus Engine",
    desc: "Multi-agent AI debate — Anthropic, OpenAI, Gemini z cross-review i podsumowaniem",
    wide: true,
  },
  {
    href: "/sock-designer",
    icon: "🧦",
    label: "Nadwyraz",
    name: "Sock Designer",
    desc: "Generator briefów kolekcji skarpetek z paletą LEGS i motywami narracyjnymi",
  },
  {
    href: "/newsletter-builder",
    icon: "📧",
    label: "Nadwyraz",
    name: "Newsletter Builder",
    desc: "Builder HTML emaili — bloki produktowe, Gmail-safe, eksport gotowy do ESP",
  },
  {
    href: "/design-judge",
    icon: "🎨",
    label: "AI Vision",
    name: "Design Judge",
    desc: "Ocena projektów graficznych przez Claude Vision z historią i biblioteką wzorców",
  },
  {
    href: "/tools/countdown",
    icon: "⏱",
    label: "Narzędzie",
    name: "Generator odliczania",
    desc: "Timer / countdown do kampanii i akcji marketingowych",
  },
  {
    href: "/tools/marketing-brief",
    icon: "📋",
    label: "Narzędzie",
    name: "Akcje marketingowe",
    desc: "Brief akcji marketingowych — struktura kampanii i harmonogram",
  },
  {
    href: "/tools/brand-settings",
    icon: "🏷️",
    label: "Ustawienia",
    name: "Ustawienia marki",
    desc: "Konfiguracja tonu, kolorów i parametrów marki dla pozostałych narzędzi",
  },
];

const LIGHT = {
  bg: "#f5f4f0",
  surface: "#ffffff",
  surfaceHover: "#faf9f7",
  border: "#ddd9d2",
  borderHover: "#c8c4bc",
  text: "#1a1814",
  textSub: "#7a7570",
  textMuted: "#b0aca6",
  accent: "#b8763a",
  label: "#9a9590",
  gridLine: "#e8e4de",
  toggleBg: "#eeecea",
};

const DARK = {
  bg: "#0a0a0a",
  surface: "#0f0f0f",
  surfaceHover: "#141414",
  border: "#1e1e1e",
  borderHover: "#2a2a2a",
  text: "#e0ddd8",
  textSub: "#6a6560",
  textMuted: "#3a3530",
  accent: "#b8763a",
  label: "#4a4540",
  gridLine: "#1a1a1a",
  toggleBg: "#1a1a1a",
};

export default function Home() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ce-theme");
    if (saved === "dark") setDark(true);
  }, []);

  const toggle = () => {
    setDark((d) => {
      localStorage.setItem("ce-theme", d ? "light" : "dark");
      return !d;
    });
  };

  const t = dark ? DARK : LIGHT;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "var(--font-geist-sans), system-ui, sans-serif", transition: "background 0.2s, color 0.2s" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ce-tile { display: block; text-decoration: none; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 12px; padding: 28px 24px; position: relative; transition: border-color 0.15s, background 0.15s, box-shadow 0.15s; cursor: pointer; }
        .ce-tile:hover { background: ${t.surfaceHover}; border-color: ${t.borderHover}; box-shadow: 0 2px 12px rgba(0,0,0,${dark ? "0.3" : "0.06"}); }
        .ce-tile-arrow { position: absolute; top: 24px; right: 20px; font-size: 13px; color: ${t.border}; transition: color 0.15s, transform 0.15s; }
        .ce-tile:hover .ce-tile-arrow { color: ${t.accent}; transform: translate(1px, -1px); }
        .ce-wide { grid-column: span 2; }
        .ce-toggle { background: ${t.toggleBg}; border: 1px solid ${t.border}; color: ${t.textSub}; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-family: inherit; transition: border-color 0.15s; }
        .ce-toggle:hover { border-color: ${t.borderHover}; }
        @media (max-width: 720px) {
          .ce-grid { grid-template-columns: 1fr !important; }
          .ce-wide { grid-column: span 1 !important; }
          .ce-header-inner { flex-direction: column; align-items: flex-start !important; gap: 16px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ padding: "48px 0 32px", borderBottom: `1px solid ${t.border}`, marginBottom: 32 }}>
          <div className="ce-header-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: t.accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>
                Consensus Engine
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 600, color: t.text, lineHeight: 1.2 }}>
                Narzędzia
              </h1>
              <p style={{ fontSize: 13, color: t.textSub, marginTop: 6, lineHeight: 1.5 }}>
                Platforma narzędzi AI — Nadwyraz & projekty towarzyszące
              </p>
            </div>
            <button className="ce-toggle" onClick={toggle}>
              {dark ? "☀ Jasny" : "☾ Ciemny"}
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="ce-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 48 }}>
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className={`ce-tile${tool.wide ? " ce-wide" : ""}`}>
              <span className="ce-tile-arrow">↗</span>
              <div style={{ fontSize: 22, marginBottom: 14 }}>{tool.icon}</div>
              <div style={{ fontSize: 10, color: t.accent, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6, fontWeight: 500 }}>
                {tool.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 6, lineHeight: 1.35 }}>
                {tool.name}
              </div>
              <p style={{ fontSize: 12, color: t.textSub, lineHeight: 1.65 }}>
                {tool.desc}
              </p>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${t.border}`, padding: "16px 0 32px" }}>
          <div style={{ fontSize: 11, color: t.textMuted }}>
            consensus-engine-chi.vercel.app
          </div>
        </div>

      </div>
    </div>
  );
}
