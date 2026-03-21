"use client";
import { useDarkMode } from "../../hooks/useDarkMode";

export default function ToolsPage() {
  const [dark] = useDarkMode();
  const text = dark ? "#e0ddd8" : "#1a1814";
  const sub = dark ? "#6a6560" : "#7a7570";
  return (
    <div style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 24, color: text, margin: "0 0 8px" }}>Narzędzia</h1>
      <p style={{ fontSize: 14, color: sub }}>Placeholder — sekcja w budowie.</p>
    </div>
  );
}
