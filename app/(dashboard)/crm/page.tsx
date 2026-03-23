"use client";
import Link from "next/link";
import { useDarkMode } from "../../hooks/useDarkMode";

const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", badge: "#f0e8de",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", badge: "#2a1f14",
};

const MODULES = [
  {
    href: "/crm/analytics",
    label: "Overview 360°",
    icon: "📊",
    desc: "KPI, segmenty, risk levels, top światy",
    badge: null,
  },
  {
    href: "/crm/analytics/worlds",
    label: "Mapa Zainteresowań",
    icon: "🗺️",
    desc: "Tagi granularne, filary marki, heatmapa segment × świat",
    badge: null,
  },
  {
    href: "/crm/analytics/behavior",
    label: "Zachowania Zakupowe",
    icon: "🛍️",
    desc: "Promo vs full price, Early Adopters, Promo Hunters, Occasion Buyers",
    badge: null,
  },
  {
    href: "/crm/analytics/occasions",
    label: "Kalendarz Okazji",
    icon: "📅",
    desc: "Sezonowość, okazje cykliczne, kampanie personalizowane",
    badge: null,
  },
  {
    href: "/crm/analytics/cohorts",
    label: "Kohorty Retencji",
    icon: "🔁",
    desc: "Macierz kohort, czas do 2. zakupu, retention per segment",
    badge: null,
  },
  {
    href: "/crm/clients/NZ-DEMO001",
    label: "Profil Klienta",
    icon: "👤",
    desc: "DNA taksonomiczne, timeline zakupów, Next Best Action",
    badge: "demo",
  },
  {
    href: "/crm/analytics/predictive",
    label: "Predykcje AI",
    icon: "🔮",
    desc: "Przewidywany LTV, kolejny zakup, kalendarz przychodów",
    badge: null,
  },
  {
    href: "/crm/winback",
    label: "Winback",
    icon: "⚡",
    desc: "Kampanie reaktywacyjne dla VIP Lost / HighRisk",
    badge: null,
  },
  {
    href: "/crm/import",
    label: "Import / ETL",
    icon: "📥",
    desc: "Import danych z arkuszy i zewnętrznych źródeł",
    badge: "admin",
  },
  {
    href: "https://subiekt-sync-buddy.lovable.app/",
    label: "CRM Produktowy",
    icon: "📦",
    desc: "Synchronizacja produktów i zarządzanie katalogiem w Subiekcie",
    badge: null,
    external: true,
  },
];

export default function CrmPage() {
  const [dark] = useDarkMode();
  const t = dark ? DARK : LIGHT;

  return (
    <>
      <style>{`
        .crm-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .crm-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .crm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
        .crm-card { display: flex; flex-direction: column; gap: 7px; padding: 20px; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; text-decoration: none; transition: border-color 0.15s, box-shadow 0.15s; position: relative; }
        .crm-card:hover { border-color: ${t.accent}; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .crm-icon { font-size: 24px; }
        .crm-label { font-size: 14px; font-weight: 700; color: ${t.text}; }
        .crm-desc { font-size: 12px; color: ${t.textSub}; line-height: 1.5; }
        .crm-badge { position: absolute; top: 14px; right: 14px; font-size: 9px; padding: 2px 7px; border-radius: 4px; background: ${t.badge}; color: ${t.accent}; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .crm-divider { grid-column: 1 / -1; border-top: 1px solid ${t.border}; margin: 4px 0; }
      `}</style>

      <h1 className="crm-title">CRM Klientów</h1>
      <p className="crm-sub">Platforma analityki klientów Nadwyraz.com — 1 200 rekordów, 6 modułów analitycznych</p>

      <div className="crm-grid">
        {MODULES.map((m) =>
          m.external ? (
            <a
              key={m.href}
              href={m.href}
              target="_blank"
              rel="noopener noreferrer"
              className="crm-card"
            >
              {m.badge && <span className="crm-badge">{m.badge}</span>}
              <span className="crm-icon">{m.icon}</span>
              <span className="crm-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {m.label}
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                  <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7" />
                  <path d="M8 1h3v3" />
                  <path d="M11 1 5.5 6.5" />
                </svg>
              </span>
              <span className="crm-desc">{m.desc}</span>
            </a>
          ) : (
            <Link key={m.href} href={m.href} className="crm-card">
              {m.badge && <span className="crm-badge">{m.badge}</span>}
              <span className="crm-icon">{m.icon}</span>
              <span className="crm-label">{m.label}</span>
              <span className="crm-desc">{m.desc}</span>
            </Link>
          )
        )}
      </div>
    </>
  );
}
