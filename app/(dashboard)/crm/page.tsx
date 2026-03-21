"use client";
import Link from "next/link";
import { useDarkMode } from "../../hooks/useDarkMode";

const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
};

const SECTIONS = [
  { href: "/crm/analytics", label: "Analityka", icon: "📈", desc: "Statystyki i trendy klientów" },
  { href: "/crm/clients", label: "Klienci", icon: "👤", desc: "Baza klientów i historia zamówień" },
  { href: "/crm/winback", label: "Winback", icon: "🔄", desc: "Kampanie reaktywacyjne" },
  { href: "/crm/import", label: "Import", icon: "📥", desc: "Import danych (tylko admin)" },
];

export default function CrmPage() {
  const [dark] = useDarkMode();
  const t = dark ? DARK : LIGHT;

  return (
    <>
      <style>{`
        .crm-title { font-family: var(--font-dm-serif), serif; font-size: 24px; color: ${t.text}; margin: 0 0 20px; }
        .crm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .crm-card { display: flex; flex-direction: column; gap: 6px; padding: 18px; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; text-decoration: none; transition: border-color 0.15s; }
        .crm-card:hover { border-color: ${t.accent}; }
        .crm-icon { font-size: 22px; }
        .crm-label { font-size: 14px; font-weight: 600; color: ${t.text}; }
        .crm-desc { font-size: 12px; color: ${t.textSub}; }
      `}</style>

      <h1 className="crm-title">CRM</h1>
      <div className="crm-grid">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="crm-card">
            <span className="crm-icon">{s.icon}</span>
            <span className="crm-label">{s.label}</span>
            <span className="crm-desc">{s.desc}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
