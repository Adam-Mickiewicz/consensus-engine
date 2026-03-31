"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useDarkMode } from "../hooks/useDarkMode";

const TOOLS = [
  { href: "/debate", label: "Consensus Engine", icon: "⚡" },
  { href: "/sock-designer", label: "Sock Designer", icon: "🧦" },
  { href: "/newsletter-builder", label: "Newsletter Builder", icon: "📧" },
  { href: "/design-judge", label: "Design Judge", icon: "🎨" },
  { href: "/tools/countdown", label: "Generator odliczania", icon: "⏱" },
  { href: "/tools/marketing-brief", label: "Akcje marketingowe", icon: "📋" },
  { href: "/tools/brand-settings", label: "Ustawienia marki", icon: "🏷️" },
  { href: "/tools/znakowanie", label: "Znakowanie odzieży", icon: "👕" },
  { href: "/tools/brand-media-studio", label: "Brand Media Studio", icon: "🎬", badge: "Beta" },
];

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

export default function Nav({ current }) {
  const [open, setOpen] = useState(false);
  const { isDark, toggleTheme } = useDarkMode();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user || null;
      setUser(u);
      if (u) {
        supabase.from("user_roles").select("role").eq("user_id", u.id).maybeSingle()
          .then(({ data: r }) => setIsAdmin(r?.role === "admin"));
      }
    });
    supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        supabase.from("user_roles").select("role").eq("user_id", u.id).maybeSingle()
          .then(({ data: r }) => setIsAdmin(r?.role === "admin"));
      } else {
        setIsAdmin(false);
      }
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const t = isDark ? DARK : LIGHT;

  return (
    <>
      <style>{`
        .ce-nav-bar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; height: 44px; background: ${t.bg}; border-bottom: 1px solid ${t.border}; font-family: var(--font-geist-sans), system-ui, sans-serif; transition: background 0.2s; }
        .ce-nav-left { display: flex; align-items: center; gap: 8px; }
        .ce-nav-right { display: flex; align-items: center; gap: 8px; }
        .ce-nav-burger { background: none; border: 1px solid ${t.border}; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 0; transition: border-color 0.15s; }
        .ce-nav-burger span { display: block; width: 14px; height: 1.5px; background: ${t.textSub}; border-radius: 2px; transition: transform 0.2s, opacity 0.2s; }
        .ce-nav-burger.open span:nth-child(1) { transform: rotate(45deg) translate(4px, 4px); }
        .ce-nav-burger.open span:nth-child(2) { opacity: 0; }
        .ce-nav-burger.open span:nth-child(3) { transform: rotate(-45deg) translate(4px, -4px); }
        .ce-nav-back { font-size: 12px; color: ${t.textSub}; text-decoration: none; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; transition: background 0.1s, color 0.1s; font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .ce-nav-back:hover { background: ${t.toggleBg}; color: ${t.text}; }
        .ce-nav-theme { background: ${t.toggleBg}; border: 1px solid ${t.border}; color: ${t.textSub}; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: inherit; transition: border-color 0.15s; }
        .ce-nav-theme:hover { border-color: ${t.accent}; }
        .ce-nav-overlay { position: fixed; inset: 44px 0 0 0; z-index: 99; display: flex; justify-content: flex-start; }
        .ce-nav-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.15); }
        .ce-nav-menu { position: relative; width: 240px; background: ${t.surface}; border-right: 1px solid ${t.border}; overflow-y: auto; padding: 8px 0; box-shadow: 4px 0 24px rgba(0,0,0,0.08); }
        .ce-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; text-decoration: none; color: ${t.textSub}; font-size: 13px; transition: background 0.1s; border-left: 2px solid transparent; font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .ce-nav-item:hover { background: ${t.toggleBg}; color: ${t.text}; }
        .ce-nav-item.active { color: ${t.accent}; border-left-color: ${t.accent}; background: ${t.toggleBg}; }
        .ce-nav-sep { height: 1px; background: ${t.border}; margin: 6px 0; }
        .ce-nav-menu-header { padding: 10px 20px 6px; font-size: 10px; color: ${t.textSub}; letter-spacing: 0.12em; text-transform: uppercase; }
        @media (max-width: 480px) { .ce-nav-menu { width: 100%; } }
      `}</style>

      <div className="ce-nav-bar">
        <div className="ce-nav-left">
          <button
            className={"ce-nav-burger" + (open ? " open" : "")}
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
          <Link href="/" className="ce-nav-back">
            ← Powrót
          </Link>
        </div>
        <div className="ce-nav-right">
          <button className="ce-nav-theme" onClick={toggleTheme}>
            {isDark ? "☀ Jasny" : "☾ Ciemny"}
          </button>
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
      </div>

      {open && (
        <div className="ce-nav-overlay">
          <div className="ce-nav-backdrop" onClick={() => setOpen(false)} />
          <div className="ce-nav-menu">
            <div className="ce-nav-menu-header">Narzędzia</div>
            <div className="ce-nav-sep" />
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={"ce-nav-item" + (current === tool.href ? " active" : "")}
                onClick={() => setOpen(false)}
              >
                <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{tool.icon}</span>
                {tool.label}
                {tool.badge && (
                  <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: "#fff8e1", color: "#f57f17", letterSpacing: "0.04em" }}>
                    {tool.badge}
                  </span>
                )}
              </Link>
            ))}
            {isAdmin && (
              <>
                <div className="ce-nav-sep" />
                <div className="ce-nav-menu-header">Administracja</div>
                <Link
                  href="/admin/users"
                  className={"ce-nav-item" + (current === "/admin/users" ? " active" : "")}
                  onClick={() => setOpen(false)}
                >
                  <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>🛡️</span>
                  Panel admina
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
