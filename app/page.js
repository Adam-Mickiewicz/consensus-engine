"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const TOOLS = [
  {
    href: "/debate",
    icon: "⚡",
    label: "Core",
    name: "Consensus Engine",
    desc: "Multi-agent AI debate — Anthropic, OpenAI i Gemini z cross-review, analizą krytyczną i finalną syntezą.",
    size: "large",
  },
  {
    href: "/sock-designer",
    icon: "🧦",
    label: "Nadwyraz",
    name: "Sock Designer",
    desc: "Generator briefów kolekcji z paletą LEGS.",
    size: "small",
  },
  {
    href: "/newsletter-builder",
    icon: "📧",
    label: "Nadwyraz",
    name: "Newsletter Builder",
    desc: "Builder HTML emaili, Gmail-safe.",
    size: "small",
  },
  {
    href: "/design-judge",
    icon: "🎨",
    label: "AI Vision",
    name: "Design Judge",
    desc: "Ocena projektów graficznych przez Claude Vision z historią i biblioteką wzorców.",
    size: "medium",
  },
  {
    href: "/tools/countdown",
    icon: "⏱",
    label: "Narzędzie",
    name: "Generator odliczania",
    desc: "Timer do kampanii.",
    size: "small",
  },
  {
    href: "/tools/marketing-brief",
    icon: "📋",
    label: "Narzędzie",
    name: "Akcje marketingowe",
    desc: "Brief kampanii i harmonogram.",
    size: "small",
  },
  {
    href: "/tools/brand-settings",
    icon: "🏷️",
    label: "Ustawienia",
    name: "Ustawienia marki",
    desc: "Ton, kolory, parametry marki.",
    size: "small",
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user || null));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ec", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <style>{`
        @keyframes drift0{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(8px,-6px) scale(1.04);}}
        @keyframes drift1{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(-6px,8px) scale(1.03);}}
        @keyframes drift2{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(10px,4px) scale(1.05);}}
        @keyframes drift3{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(-8px,-4px) scale(1.02);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        .ce-tile{display:block;text-decoration:none;background:#fff;border:1px solid #e8e4de;border-radius:16px;padding:24px;cursor:pointer;transition:border-color 0.18s,transform 0.18s;position:relative;overflow:hidden;opacity:0;}
        .ce-tile.visible{animation:fadeUp 0.5s ease both;}
        .ce-tile:hover{border-color:#c8c4bc;transform:translateY(-2px);}
        .ce-tile::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:#b8763a;transform:scaleX(0);transform-origin:left;transition:transform 0.22s;}
        .ce-tile:hover::after{transform:scaleX(1);}
        .ce-arrow{position:absolute;top:20px;right:18px;font-size:13px;color:#ddd9d2;transition:color 0.15s,transform 0.15s;}
        .ce-tile:hover .ce-arrow{color:#b8763a;transform:translate(2px,-2px);}
        @media(max-width:700px){.ce-bento{grid-template-columns:1fr !important;}.ce-large,.ce-medium{grid-column:span 1 !important;grid-row:span 1 !important;}}
      `}</style>

      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "12px 40px", borderBottom: "1px solid #e8e4de", background: "#f5f2ec" }}>
        {user ? (
          <button onClick={handleSignOut} style={{ background: "#f0faf4", border: "1px solid #a8dbb8", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#2d7a4f", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 13 }}>●</span> Zalogowany
          </button>
        ) : (
          <Link href="/auth" style={{ background: "#fdf2f2", border: "1px solid #f0b8b8", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#b83020", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 13 }}>●</span> Niezalogowany
          </Link>
        )}
      </div>

      {/* Hero */}
      <div style={{ padding: "52px 40px 40px", position: "relative", overflow: "hidden" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="120" cy="60" rx="180" ry="120" fill="#e8c99a" fillOpacity="0.18" style={{ animation: "drift0 8s ease-in-out infinite" }} />
          <ellipse cx="500" cy="150" rx="220" ry="100" fill="#c8b89a" fillOpacity="0.13" style={{ animation: "drift1 11s ease-in-out infinite" }} />
          <ellipse cx="720" cy="40" rx="140" ry="90" fill="#d4c4a8" fillOpacity="0.15" style={{ animation: "drift2 9s ease-in-out infinite" }} />
          <ellipse cx="320" cy="180" rx="160" ry="70" fill="#e0d0b8" fillOpacity="0.12" style={{ animation: "drift3 13s ease-in-out infinite" }} />
        </svg>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 300, color: "#1a1814", lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            Platforma narzędzi <strong style={{ fontWeight: 600 }}>Nadwyraz.com</strong>
          </h1>
          <p style={{ fontSize: 14, color: "#7a7570", maxWidth: 480, lineHeight: 1.65, margin: 0 }}>
            Narzędzia dla Nadwyraz.com i projektów towarzyszących — analityka, debaty, projekty, newslettery i więcej.
          </p>
        </div>
      </div>

      {/* Bento grid */}
      <div className="ce-bento" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, padding: "0 40px 48px", maxWidth: 1100 }}>
        {TOOLS.map((tool, i) => (
          <Link
            key={tool.href}
            href={tool.href}
            className={`ce-tile ce-${tool.size}${mounted ? " visible" : ""}`}
            style={{
              gridColumn: tool.size === "large" ? "span 4" : "span 2",
              gridRow: tool.size === "large" ? "span 2" : tool.size === "medium" ? "span 2" : "span 1",
              animationDelay: `${i * 0.06}s`,
            }}
          >
            <span className="ce-arrow">↗</span>
            <span style={{ fontSize: tool.size === "large" ? 30 : 22, marginBottom: tool.size === "large" ? 18 : 14, display: "block" }}>{tool.icon}</span>
            <div style={{ fontSize: 9, color: "#b8763a", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500, marginBottom: 6 }}>{tool.label}</div>
            <div style={{ fontSize: tool.size === "large" ? 20 : 14, fontWeight: 600, color: "#1a1814", marginBottom: 8, lineHeight: 1.3 }}>{tool.name}</div>
            <p style={{ fontSize: tool.size === "large" ? 13 : 12, color: "#7a7570", lineHeight: 1.65, margin: 0, maxWidth: tool.size === "large" ? 360 : "none" }}>{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
