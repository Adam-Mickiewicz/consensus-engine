"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "../../components/Nav";
import JobQueue from "./components/JobQueue";

const ACCENT = "#b8763a";

const MODULES = [
  {
    href: "/tools/brand-media-studio/video",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    ),
    title: "Generowanie wideo",
    desc: "Generuj materiały wideo produktów i brand stories za pomocą Veo 3 i Sora.",
    status: "Beta",
    statusColor: { bg: "#fff8e1", text: "#f57f17" },
  },
  {
    href: "/tools/brand-media-studio/images",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    title: "Generowanie obrazów",
    desc: "Twórz zdjęcia produktowe i grafiki marketingowe za pomocą Imagen 3 i DALL-E 3.",
    status: "Gotowy",
    statusColor: { bg: "#e8f5e9", text: "#2e7d32" },
  },
  {
    href: "/tools/brand-media-studio/repurpose",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    ),
    title: "Repurpose formatów",
    desc: "Automatycznie dostosuj obrazy do różnych formatów (1:1, 9:16, 16:9 itd.) za pomocą Sharp.js.",
    status: "Gotowy",
    statusColor: { bg: "#e8f5e9", text: "#2e7d32" },
  },
  {
    href: null,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: "Warianty reklam",
    desc: "Generuj warianty kreacji reklamowych dostosowane do różnych kanałów i grup odbiorców.",
    status: "Wkrótce",
    statusColor: { bg: "#f5f5f5", text: "#9e9e9e" },
  },
  {
    href: null,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: "Tłumaczenia copy",
    desc: "Tłumacz i lokalizuj opisy produktów oraz teksty marketingowe na wiele języków.",
    status: "Wkrótce",
    statusColor: { bg: "#f5f5f5", text: "#9e9e9e" },
  },
];

const TABS = ["Moduły", "Kolejka jobów", "Historia", "Ustawienia API"];

export default function BrandMediaStudioPage() {
  const [activeTab, setActiveTab] = useState("Moduły");
  const [apiSettings, setApiSettings] = useState({
    googleAiKey: "",
    vertexProject: "",
    vertexLocation: "us-central1",
    openaiKey: "",
  });
  const [savedSettings, setSavedSettings] = useState(false);

  // Allow navigating to queue via URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "queue") setActiveTab("Kolejka jobów");
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f6", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <Nav current="/tools/brand-media-studio" />

      <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 500, margin: 0, color: "#1a1a1a" }}>
              Brand Media Studio
            </h1>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#fff8e1", color: "#f57f17" }}>
              Beta
            </span>
          </div>
          <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
            Generuj i przetwarzaj materiały wizualne marki Nadwyraz.com
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #eee" }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px", fontSize: 14, cursor: "pointer", border: "none",
                background: "transparent", color: activeTab === tab ? ACCENT : "#666",
                borderBottom: `2px solid ${activeTab === tab ? ACCENT : "transparent"}`,
                marginBottom: -1, fontWeight: activeTab === tab ? 500 : 400,
                fontFamily: "inherit", transition: "color 0.15s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Moduły */}
        {activeTab === "Moduły" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {MODULES.map((mod, i) => {
              const card = (
                <div
                  key={i}
                  style={{
                    background: "#fff", border: "1px solid #eee", borderRadius: 12,
                    padding: 20, display: "block", transition: "border-color 0.15s, box-shadow 0.15s",
                    opacity: mod.href ? 1 : 0.65,
                    cursor: mod.href ? "pointer" : "default",
                  }}
                  onMouseEnter={e => { if (mod.href) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = "0 4px 16px rgba(184,118,58,0.12)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#eee"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ color: ACCENT, marginBottom: 12 }}>{mod.icon}</div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontWeight: 500, fontSize: 15, color: "#1a1a1a" }}>{mod.title}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10,
                      background: mod.statusColor.bg, color: mod.statusColor.text, whiteSpace: "nowrap", marginLeft: 8,
                    }}>
                      {mod.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{mod.desc}</div>
                </div>
              );

              return mod.href ? (
                <Link key={i} href={mod.href} style={{ textDecoration: "none" }}>
                  {card}
                </Link>
              ) : (
                <div key={i}>{card}</div>
              );
            })}
          </div>
        )}

        {/* Kolejka jobów */}
        {activeTab === "Kolejka jobów" && (
          <JobQueue autoRefresh={true} />
        )}

        {/* Historia */}
        {activeTab === "Historia" && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#aaa" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 14 }}>Historia jest dostępna w zakładce Kolejka jobów (wszystkie joby).</div>
          </div>
        )}

        {/* Ustawienia API */}
        {activeTab === "Ustawienia API" && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.6 }}>
              Klucze API są konfigurowane przez zmienne środowiskowe Vercel. Pola poniżej służą wyłącznie do podglądu aktualnej konfiguracji.
            </div>

            {[
              { key: "GOOGLE_AI_API_KEY", label: "Google AI API Key (Gemini / Imagen)" },
              { key: "GOOGLE_VERTEX_PROJECT", label: "Google Vertex Project ID" },
              { key: "GOOGLE_VERTEX_LOCATION", label: "Google Vertex Location" },
              { key: "OPENAI_API_KEY", label: "OpenAI API Key" },
              { key: "ANTHROPIC_API_KEY", label: "Anthropic API Key" },
            ].map(item => (
              <div key={item.key} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 12, fontFamily: "monospace", padding: "8px 12px", background: "#f5f5f5", borderRadius: 6, color: "#555" }}>
                  {item.key}
                </div>
              </div>
            ))}

            <div style={{ fontSize: 12, color: "#aaa", marginTop: 8, background: "#fff8e1", borderRadius: 6, padding: "10px 12px" }}>
              Aby zaktualizować klucze, ustaw zmienne środowiskowe w panelu Vercel lub w pliku .env.local.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
