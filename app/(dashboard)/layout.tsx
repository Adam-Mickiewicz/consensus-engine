"use client";
import Link from "next/link";
import AppSidebar from "../../components/nav/AppSidebar";
import { useDarkMode } from "../hooks/useDarkMode";

const LIGHT = {
  bg: "#f5f4f0", border: "#ddd9d2", text: "#1a1814",
  textSub: "#7a7570", accent: "#b8763a", toggleBg: "#eeecea",
};
const DARK = {
  bg: "#0a0a0a", border: "#1e1e1e", text: "#e0ddd8",
  textSub: "#6a6560", accent: "#b8763a", toggleBg: "#1a1a1a",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const result = useDarkMode();
  const dark = result[0] as boolean;
  const toggleTheme = result[1] as () => void;
  const t = dark ? DARK : LIGHT;

  return (
    <>
      <style>{`
        .dl-bar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; height: 44px; background: ${t.bg}; border-bottom: 1px solid ${t.border}; font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .dl-logo { font-size: 13px; color: ${t.text}; text-decoration: none; font-weight: 600; }
        .dl-right { display: flex; align-items: center; gap: 8px; }
        .dl-theme { background: ${t.toggleBg}; border: 1px solid ${t.border}; color: ${t.textSub}; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: inherit; }
        .dl-theme:hover { border-color: ${t.accent}; }
        .dl-body { display: flex; min-height: calc(100vh - 44px); background: ${t.bg}; }
        .dl-content { flex: 1; padding: 24px; min-width: 0; }
      `}</style>

      <header className="dl-bar">
        <Link href="/" className="dl-logo">← Powrót</Link>
        <div className="dl-right">
          <button className="dl-theme" onClick={toggleTheme}>
            {dark ? "☀ Jasny" : "☾ Ciemny"}
          </button>
        </div>
      </header>

      <div className="dl-body">
        <AppSidebar />
        <main className="dl-content">{children}</main>
      </div>
    </>
  );
}
