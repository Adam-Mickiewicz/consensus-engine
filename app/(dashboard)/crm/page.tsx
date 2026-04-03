"use client";
import Link from "next/link";

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
    label: "Executive Dashboard",
    icon: "📊",
    desc: "KPI strategiczne, Value×Risk matrix, Revenue trend, Alerty",
    badge: null,
  },
  {
    href: "/crm/clients",
    label: "Klienci 360°",
    icon: "👤",
    desc: "Lista klientów, filtry, profil z barometrem i adnotacjami",
    badge: null,
  },
  {
    href: "/crm/cohorts",
    label: "Kohorty & Retencja",
    icon: "🔁",
    desc: "Heatmapa kohort, czas do 2. zamówienia, jakość pozyskania",
    badge: null,
  },
  {
    href: "/crm/lifecycle",
    label: "Lifecycle & Segmenty",
    icon: "🔄",
    desc: "Funnel, RFM scoring, Customer Journey, Migracja segmentów",
    badge: null,
  },
  {
    href: "/crm/products",
    label: "Produkty & Światy",
    icon: "📦",
    desc: "Performance produktów, światy, sezonowość, cross-sell, launch monitor",
    badge: null,
  },
  {
    href: "/crm/promotions",
    label: "Promocje",
    icon: "🏷️",
    desc: "Scorecard, promo dependency, kalendarz okazji",
    badge: null,
  },
  {
    href: "/crm/actions",
    label: "Akcje CRM",
    icon: "⚡",
    desc: "Opportunity queue, lead scoring, gift analysis",
    badge: null,
  },
  {
    href: "/crm/compare",
    label: "Porównanie grup",
    icon: "⚖️",
    desc: "A vs B porównanie dowolnych segmentów",
    badge: null,
  },
  {
    href: "/crm/traffic",
    label: "Ruch & Pozyskanie",
    icon: "📈",
    desc: "GA4: sesje, źródła, funnel, produkty, geo",
    badge: null,
  },
  {
    href: "/crm/import",
    label: "Import / ETL",
    icon: "📥",
    desc: "Sync danych, przegląd, braki EAN",
    badge: "admin",
  },
];

export default function CrmPage() {
  const dark = false;
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
      `}</style>

      <h1 className="crm-title">CRM Klientów</h1>
      <p className="crm-sub">Platforma analityki klientów Nadwyraz.com — 151 167 rekordów, 10 modułów analitycznych</p>

      <div className="crm-grid">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="crm-card">
            {m.badge && <span className="crm-badge">{m.badge}</span>}
            <span className="crm-icon">{m.icon}</span>
            <span className="crm-label">{m.label}</span>
            <span className="crm-desc">{m.desc}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
