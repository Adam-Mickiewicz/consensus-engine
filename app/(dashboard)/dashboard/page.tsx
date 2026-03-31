"use client";
import Link from "next/link";

const LIGHT = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
};
const DARK = {
  bg: "#0a0a0a", surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
};

const CARDS = [
  { href: "/crm",      label: "CRM",       icon: "👥", desc: "Zarządzanie klientami, analityka, winback" },
  { href: "/products", label: "Produkty",  icon: "📦", desc: "Katalog produktów i zarządzanie ofertą" },
  { href: "/b2b",      label: "B2B",       icon: "🤝", desc: "Partnerzy, kontrakty i współpraca B2B" },
  { href: "/tools",    label: "Narzędzia", icon: "🔧", desc: "Narzędzia marketingowe i operacyjne" },
  { href: "/reports",  label: "Raporty",   icon: "📊", desc: "Analizy, zestawienia i eksporty" },
  { href: "/admin",    label: "Admin",     icon: "⚙️", desc: "Ustawienia systemu i zarządzanie dostępem" },
];

export default function DashboardHome() {
  const dark = false;
  const t = dark ? DARK : LIGHT;

  return (
    <>
      <style>{`
        .dh-title { font-family: var(--font-dm-serif), serif; font-size: 28px; color: ${t.text}; margin: 0 0 6px; }
        .dh-sub { font-size: 14px; color: ${t.textSub}; margin: 0 0 28px; }
        .dh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .dh-card { display: flex; flex-direction: column; gap: 8px; padding: 20px; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; text-decoration: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .dh-card:hover { border-color: ${t.accent}; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .dh-icon { font-size: 26px; }
        .dh-label { font-size: 15px; font-weight: 600; color: ${t.text}; }
        .dh-desc { font-size: 12px; color: ${t.textSub}; line-height: 1.5; }
      `}</style>

      <h1 className="dh-title">Dashboard</h1>
      <p className="dh-sub">Wybierz kategorię</p>

      <div className="dh-grid">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="dh-card">
            <span className="dh-icon">{c.icon}</span>
            <span className="dh-label">{c.label}</span>
            <span className="dh-desc">{c.desc}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
