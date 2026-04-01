"use client";
import { useState, type ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useUserPermissions from "../../app/hooks/useUserPermissions";

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

interface SubItem {
  href: string;
  label: string;
  admin?: boolean;
}

const SUBCATEGORIES: Record<string, SubItem[]> = {
  crm: [
    { href: "/crm/analytics",   label: "Executive Dashboard" },
    { href: "/crm/clients",     label: "Klienci" },
    { href: "/crm/cohorts",     label: "Kohorty & Retencja" },
    { href: "/crm/lifecycle",   label: "Lifecycle & Segmenty" },
    { href: "/crm/products",    label: "Produkty & Światy" },
    { href: "/crm/promotions",  label: "Promocje" },
    { href: "/crm/actions",     label: "Akcje CRM" },
    { href: "/crm/compare",    label: "Porównanie grup" },
    { href: "/crm/import",      label: "Import / ETL", admin: true },
  ],
  products: [],
  b2b: [],
  tools: [
    { href: "/newsletter-builder", label: "Newsletter Builder" },
    { href: "/sock-designer",      label: "Sock Designer" },
  ],
  reports: [],
  admin: [
    { href: "/admin/ai-monitoring", label: "Monitoring AI" },
    { href: "/admin/users",         label: "Użytkownicy",   admin: true },
    { href: "/admin/security",      label: "Bezpieczeństwo", admin: true },
    { href: "/admin/2fa-setup",     label: "Konfiguracja 2FA" },
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  crm:      "CRM klientów",
  products: "CRM produktowy",
  b2b:      "B2B",
  tools:    "Narzędzia",
  reports:  "Raporty",
  admin:    "Admin",
};

// SVG icons
const Icons: Record<string, ReactElement> = {
  chevronLeft: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

const SIDEBAR_TOOL_IDS: Record<string, string> = {
  '/newsletter-builder': 'newsletter-builder',
  '/sock-designer':      'sock-designer',
};

export default function AppSidebar() {
  const pathname = usePathname();
  const t = LIGHT;
  const { canAccess, loading: permsLoading } = useUserPermissions();

  // Detect active root segment
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const subs = SUBCATEGORIES[segment] ?? null;

  // Hide entirely on home or unknown segment
  if (!segment || subs === null) return null;

  const categoryLabel = CATEGORY_LABELS[segment] ?? segment;

  return (
    <>
      <style>{`
        .as-wrap { width: 220px; min-height: 100%; background: ${t.surface}; border-right: 1px solid ${t.border}; display: flex; flex-direction: column; font-family: var(--font-geist-sans), system-ui, sans-serif; flex-shrink: 0; }
        .as-back { display: flex; align-items: center; gap: 6px; padding: 12px 14px 10px; font-size: 11px; color: ${t.textSub}; text-decoration: none; transition: color 0.1s; border-bottom: 1px solid ${t.border}; }
        .as-back:hover { color: ${t.accent}; }
        .as-section-label { padding: 14px 14px 6px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; }
        .as-sep { height: 1px; background: ${t.border}; margin: 2px 0 4px; }
        .as-item { display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; text-decoration: none; color: ${t.textSub}; font-size: 13px; border-left: 2px solid transparent; transition: background 0.1s, color 0.1s; }
        .as-item:hover { background: ${t.hover}; color: ${t.text}; }
        .as-item.active { color: ${t.accent}; border-left-color: ${t.accent}; background: ${t.hover}; }
        .as-badge { font-size: 9px; padding: 1px 5px; border-radius: 4px; background: ${t.badge}; color: ${t.accent}; letter-spacing: 0.04em; text-transform: uppercase; }
        .as-empty { padding: 14px; font-size: 12px; color: ${t.textSub}; }
        .as-footer { margin-top: auto; border-top: 1px solid ${t.border}; padding: 12px 14px; display: flex; align-items: center; gap: 9px; color: ${t.textSub}; font-size: 12px; }
        .as-footer-avatar { width: 26px; height: 26px; border-radius: 50%; background: ${t.hover}; border: 1px solid ${t.border}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        @media (max-width: 768px) { .as-wrap { display: none; } }
      `}</style>

      <aside className="as-wrap">
        <Link href="/" className="as-back">
          {Icons.chevronLeft} Wszystkie kategorie
        </Link>

        <div className="as-section-label">{categoryLabel}</div>
        <div className="as-sep" />

        {subs.length === 0 ? (
          <div className="as-empty">Brak podkategorii</div>
        ) : (
          subs
            .filter(s => permsLoading || !SIDEBAR_TOOL_IDS[s.href] || canAccess(SIDEBAR_TOOL_IDS[s.href]))
            .map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={"as-item" + (pathname === s.href || (s.href !== "/crm/analytics" && pathname.startsWith(s.href)) ? " active" : "")}
              >
                <span>{s.label}</span>
                {s.admin && <span className="as-badge">admin</span>}
              </Link>
            ))
        )}

        <div className="as-footer">
          <div className="as-footer-avatar">{Icons.user}</div>
          <span>Użytkownik</span>
        </div>
      </aside>
    </>
  );
}
