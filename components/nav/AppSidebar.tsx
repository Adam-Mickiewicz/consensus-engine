"use client";
import Link from "next/link";
import { useDarkMode } from "../../app/hooks/useDarkMode";

const LIGHT = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  toggleBg: "#eeecea",
};
const DARK = {
  bg: "#0a0a0a", surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  toggleBg: "#1a1a1a",
};

const CATEGORIES = [
  {
    href: "/crm", label: "CRM", icon: "👥",
    sub: [
      { href: "/crm/analytics", label: "Analityka" },
      { href: "/crm/clients", label: "Klienci" },
      { href: "/crm/winback", label: "Winback" },
      { href: "/crm/import", label: "Import" },
    ],
  },
  { href: "/products", label: "Produkty", icon: "📦" },
  { href: "/b2b", label: "B2B", icon: "🤝" },
  { href: "/tools", label: "Narzędzia", icon: "🔧" },
  { href: "/reports", label: "Raporty", icon: "📊" },
  { href: "/admin", label: "Admin", icon: "⚙️" },
];

export default function AppSidebar({ current }: { current?: string }) {
  const [dark] = useDarkMode();
  const t = dark ? DARK : LIGHT;

  return (
    <>
      <style>{`
        .as-sidebar { width: 220px; min-height: 100vh; background: ${t.surface}; border-right: 1px solid ${t.border}; padding: 8px 0; flex-shrink: 0; font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .as-header { padding: 10px 20px 6px; font-size: 10px; color: ${t.textSub}; letter-spacing: 0.12em; text-transform: uppercase; }
        .as-sep { height: 1px; background: ${t.border}; margin: 6px 0; }
        .as-item { display: flex; align-items: center; gap: 10px; padding: 9px 20px; text-decoration: none; color: ${t.textSub}; font-size: 13px; transition: background 0.1s; border-left: 2px solid transparent; }
        .as-item:hover { background: ${t.toggleBg}; color: ${t.text}; }
        .as-item.active { color: ${t.accent}; border-left-color: ${t.accent}; background: ${t.toggleBg}; }
        .as-subitem { display: flex; align-items: center; padding: 7px 20px 7px 46px; text-decoration: none; color: ${t.textSub}; font-size: 12px; transition: background 0.1s; border-left: 2px solid transparent; }
        .as-subitem:hover { background: ${t.toggleBg}; color: ${t.text}; }
        .as-subitem.active { color: ${t.accent}; border-left-color: ${t.accent}; background: ${t.toggleBg}; }
        @media (max-width: 768px) { .as-sidebar { display: none; } }
      `}</style>
      <nav className="as-sidebar">
        <div className="as-header">Menu</div>
        <div className="as-sep" />
        {CATEGORIES.map((cat) => (
          <div key={cat.href}>
            <Link
              href={cat.href}
              className={"as-item" + (current === cat.href ? " active" : "")}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{cat.icon}</span>
              {cat.label}
            </Link>
            {cat.sub && current?.startsWith(cat.href) && cat.sub.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={"as-subitem" + (current === s.href ? " active" : "")}
              >
                {s.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}
