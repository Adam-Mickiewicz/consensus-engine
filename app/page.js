"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import useUserPermissions from "./hooks/useUserPermissions";

const CATEGORIES = [
  { href: "/crm",      toolId: "crm",         icon: "👥", label: "CRM klientów",   desc: "Analityka 360°, baza klientów, winback i import danych." },
  { href: "/products", toolId: "crm",         icon: "📦", label: "CRM produktowy", desc: "Katalog produktów, oferty i zarządzanie asortymentem." },
  { href: "/b2b",      toolId: "b2b",         icon: "🤝", label: "B2B",            desc: "Partnerzy handlowi, kontrakty i współpraca B2B." },
  { href: "/tools",    toolId: null,          icon: "🔧", label: "Narzędzia",      desc: "Newsletter Builder, Sock Designer i inne narzędzia." },
  { href: "/reports",  toolId: "raporty",     icon: "📊", label: "Raporty",        desc: "Analizy, zestawienia sprzedaży i eksporty danych." },
  { href: "/admin",    toolId: "admin-panel", icon: "⚙️", label: "Admin",          desc: "Zarządzanie dostępem i ustawienia systemu." },
];

const TOOLS = [
  {
    href: "/debate",
    icon: "⚡",
    label: "Core",
    name: "Consensus Engine",
    desc: "Multi-agent AI debate — Anthropic, OpenAI i Gemini z cross-review, analizą krytyczną i finalną syntezą.",
    wide: true,
  },
  {
    href: "/sock-designer",
    icon: "🧦",
    label: "Nadwyraz",
    name: "Sock Designer",
    desc: "Generator briefów kolekcji skarpetek z paletą LEGS i motywami narracyjnymi.",
  },
  {
    href: "/newsletter-builder",
    icon: "📧",
    label: "Nadwyraz",
    name: "Newsletter Builder",
    desc: "Builder HTML emaili — bloki produktowe, Gmail-safe, eksport gotowy do ESP.",
  },
  {
    href: "/design-judge",
    icon: "🎨",
    label: "AI Vision",
    name: "Design Judge",
    desc: "Ocena projektów graficznych przez Claude Vision z historią i biblioteką wzorców.",
  },
  {
    href: "/tools/countdown",
    icon: "⏱",
    label: "Narzędzie",
    name: "Generator odliczania",
    desc: "Timer / countdown do kampanii i akcji marketingowych.",
  },
  {
    href: "/tools/marketing-brief",
    icon: "📋",
    label: "Narzędzie",
    name: "Akcje marketingowe",
    desc: "Brief akcji marketingowych — struktura kampanii i harmonogram.",
  },
  {
    href: "/tools/brand-settings",
    icon: "🏷️",
    label: "Ustawienia",
    name: "Ustawienia marki",
    desc: "Konfiguracja tonu, kolorów i parametrów marki dla pozostałych narzędzi.",
  },
  {
    href: "/tools/znakowanie",
    icon: "👕",
    label: "Przewodnik",
    name: "Znakowanie odzieży",
    desc: "Kompletny przewodnik po technikach znakowania — sitodruk, haft, DTG/DTF, sublimacja, flex.",
  },
  {
    href: "/tools/brand-media-studio",
    icon: "🎬",
    label: "Beta",
    name: "Brand Media Studio",
    desc: "Generuj wideo i obrazy produktowe za pomocą Veo 3, Sora, Imagen 3 i DALL-E. Repurpose formatów jednym kliknięciem.",
  },
];

const TOOL_IDS = {
  '/debate':                   'debate',
  '/sock-designer':            'sock-designer',
  '/newsletter-builder':       'newsletter-builder',
  '/design-judge':             'design-judge',
  '/tools/countdown':          'countdown',
  '/tools/marketing-brief':    'marketing-brief',
  '/tools/brand-settings':     'brand-settings',
  '/tools/znakowanie':         'znakowanie',
  '/tools/brand-media-studio': 'brand-media-studio',
  '/crm':                      'crm',
  '/crm/clients':              'crm',
  '/crm/products':             'crm',
  '/products':                 'crm',
  '/b2b':                      'b2b',
  '/reports':                  'raporty',
  '/admin':                    'admin-panel',
  '/admin/users':              'admin-panel',
  '/stock-research':           'stock-research',
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const { canAccess } = useUserPermissions();

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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Open+Sans:wght@400;500;600&display=swap');
        @keyframes drift0{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(12px,-8px) scale(1.06);}}
        @keyframes drift1{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(-10px,12px) scale(1.04);}}
        @keyframes drift2{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(14px,6px) scale(1.07);}}
        @keyframes drift3{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(-12px,-6px) scale(1.03);}}
        @keyframes drift4{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(8px,10px) scale(1.05);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
        .ce-page{min-height:100vh;background:#f5f2ec;font-family:'Open Sans',system-ui,sans-serif;position:relative;overflow-x:hidden;}
        .ce-bg{position:fixed;inset:0;z-index:0;pointer-events:none;}
        .ce-wrap{position:relative;z-index:1;max-width:960px;margin:0 auto;padding:0 24px;}
        .ce-topbar{display:flex;justify-content:flex-end;padding:14px 0;border-bottom:1px solid #e8e4de;}
        .ce-auth-in{background:#f0faf4;border:1px solid #a8dbb8;border-radius:6px;padding:4px 12px;font-size:11px;color:#2d7a4f;cursor:pointer;font-family:inherit;font-weight:600;display:flex;align-items:center;gap:5px;}
        .ce-auth-out{background:#fdf2f2;border:1px solid #f0b8b8;border-radius:6px;padding:4px 12px;font-size:11px;color:#b83020;text-decoration:none;font-weight:600;display:flex;align-items:center;gap:5px;}
        .ce-hero{padding:52px 0 40px;}
        .ce-hero h1{font-family:'DM Serif Display',serif;font-size:clamp(32px,5vw,52px);font-weight:400;color:#1a1814;line-height:1.1;letter-spacing:-0.01em;margin:0 0 14px;}
        .ce-hero p{font-size:15px;color:#7a7570;max-width:480px;line-height:1.7;margin:0;font-family:'Open Sans',sans-serif;}
        .ce-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-bottom:52px;}
        .ce-tile{display:block;text-decoration:none;background:#fff;border:1px solid #e8e4de;border-radius:14px;padding:24px;position:relative;overflow:hidden;opacity:0;transition:border-color 0.15s,transform 0.15s,box-shadow 0.15s;}
        .ce-tile.on{animation:fadeUp 0.5s ease both;}
        .ce-tile:hover{border-color:#c8c4bc;transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,0.06);}
        .ce-tile::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:#b8763a;transform:scaleX(0);transform-origin:left;transition:transform 0.2s;}
        .ce-tile:hover::after{transform:scaleX(1);}
        .ce-wide{grid-column:span 2;}
        .ce-arrow{position:absolute;top:20px;right:18px;font-size:13px;color:#ddd9d2;transition:color 0.15s,transform 0.15s;}
        .ce-tile:hover .ce-arrow{color:#b8763a;transform:translate(2px,-2px);}
        .ce-tile-label{font-size:9px;color:#b8763a;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;margin-bottom:6px;}
        .ce-tile-name{font-family:'DM Serif Display',serif;font-size:17px;color:#1a1814;margin-bottom:6px;line-height:1.25;}
        .ce-wide .ce-tile-name{font-size:22px;}
        .ce-tile-desc{font-size:12px;color:#7a7570;line-height:1.65;}
        @media(max-width:640px){.ce-grid{grid-template-columns:1fr;}.ce-wide{grid-column:span 1;}}
        .ce-section-label{font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#b8763a;font-weight:600;margin:0 0 14px;}
        .ce-cat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:40px;}
        .ce-cat-tile{display:flex;flex-direction:column;gap:6px;padding:18px;background:#fff;border:1px solid #e8e4de;border-radius:12px;text-decoration:none;transition:border-color 0.15s,transform 0.15s;}
        .ce-cat-tile:hover{border-color:#b8763a;transform:translateY(-1px);}
        .ce-cat-icon{font-size:20px;}
        .ce-cat-name{font-family:'DM Serif Display',serif;font-size:15px;color:#1a1814;}
        .ce-cat-desc{font-size:11px;color:#7a7570;line-height:1.55;}
        .ce-divider{height:1px;background:#e8e4de;margin:0 0 40px;}
        @media(max-width:640px){.ce-cat-grid{grid-template-columns:1fr 1fr;}}
      `}</style>

      <div className="ce-page">

        {/* Animowane tło pod całością */}
        <svg className="ce-bg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="200" cy="150" rx="320" ry="220" fill="#e8c99a" fillOpacity="0.20" style={{animation:"drift0 10s ease-in-out infinite"}}/>
          <ellipse cx="900" cy="600" rx="380" ry="200" fill="#c8b89a" fillOpacity="0.15" style={{animation:"drift1 13s ease-in-out infinite"}}/>
          <ellipse cx="1050" cy="120" rx="260" ry="180" fill="#d4c4a8" fillOpacity="0.16" style={{animation:"drift2 11s ease-in-out infinite"}}/>
          <ellipse cx="400" cy="700" rx="300" ry="140" fill="#e0d0b8" fillOpacity="0.14" style={{animation:"drift3 14s ease-in-out infinite"}}/>
          <ellipse cx="650" cy="350" rx="200" ry="160" fill="#ead8c0" fillOpacity="0.10" style={{animation:"drift4 9s ease-in-out infinite"}}/>
        </svg>

        <div className="ce-wrap">

          {/* Topbar */}
          <div className="ce-topbar">
            {user ? (
              <button className="ce-auth-in" onClick={handleSignOut}>
                <span style={{fontSize:13}}>●</span> Zalogowany
              </button>
            ) : (
              <Link href="/auth" className="ce-auth-out">
                <span style={{fontSize:13}}>●</span> Niezalogowany
              </Link>
            )}
          </div>

          {/* Hero */}
          <div className="ce-hero">
            <h1>Platforma narzędzi<br /><em>Nadwyraz.com</em></h1>
            <p>Narzędzia dla Nadwyraz.com i projektów towarzyszących — analityka, debaty, projekty, newslettery i więcej.</p>
          </div>

          {/* Kategorie platformy */}
          <div className="ce-section-label">Platforma</div>
          <div className="ce-cat-grid">
            {CATEGORIES.filter(c => canAccess(c.toolId)).map((c) => (
              <Link key={c.href} href={c.href} className="ce-cat-tile">
                <span className="ce-cat-icon">{c.icon}</span>
                <span className="ce-cat-name">{c.label}</span>
                <span className="ce-cat-desc">{c.desc}</span>
              </Link>
            ))}
          </div>

          <div className="ce-divider" />

          {/* Narzędzia AI */}
          <div className="ce-section-label">Narzędzia AI</div>
          <div className="ce-grid">
            {TOOLS.filter(tool => !TOOL_IDS[tool.href] || canAccess(TOOL_IDS[tool.href])).map((tool, i) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`ce-tile${tool.wide ? " ce-wide" : ""}${mounted ? " on" : ""}`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <span className="ce-arrow">↗</span>
                <div style={{fontSize: tool.wide ? 26 : 20, marginBottom: 14}}>{tool.icon}</div>
                <div className="ce-tile-label">{tool.label}</div>
                <div className="ce-tile-name">{tool.name}</div>
                <p className="ce-tile-desc">{tool.desc}</p>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
