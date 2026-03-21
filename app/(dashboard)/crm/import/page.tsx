"use client";
import { useDarkMode } from "../../../hooks/useDarkMode";

export default function CrmImportPage() {
  const [dark] = useDarkMode();
  const text = dark ? "#e0ddd8" : "#1a1814";
  const sub = dark ? "#6a6560" : "#7a7570";
  const accent = "#b8763a";
  return (
    <div style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 24, color: text, margin: "0 0 8px" }}>Import danych</h1>
      <p style={{ fontSize: 14, color: sub }}>
        Placeholder — tylko admin. <span style={{ color: accent, fontSize: 12 }}>🔒 Wymaga roli admin.</span>
      </p>
    </div>
  );
}
