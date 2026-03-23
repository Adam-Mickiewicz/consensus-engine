"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDarkMode } from "@/app/hooks/useDarkMode";

const LIGHT = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", badge: "#f0e8de",
};
const DARK = {
  bg: "#0a0a0a", surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", badge: "#2a1f14",
};

const SEGMENTS = ["Diamond", "Platinum", "Gold", "Returning", "New"];
const RISKS    = ["OK", "Risk", "HighRisk", "Lost"];
const FILTER_KEYS = ["date_from", "date_to", "segment", "risk", "world", "occasion"];

export default function GlobalCRMFilters() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const [darkRaw]   = useDarkMode();
  const t = (darkRaw ? DARK : LIGHT);

  const [worlds,    setWorlds]    = useState([]);
  const [occasions, setOccasions] = useState([]);
  // Local state for date inputs (applied on blur / Enter)
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo,   setDateTo]   = useState(searchParams.get("date_to")   || "");

  // Sync local date state when URL changes
  useEffect(() => {
    setDateFrom(searchParams.get("date_from") || "");
    setDateTo(searchParams.get("date_to") || "");
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/crm/filter-options")
      .then(r => r.json())
      .then(d => {
        setWorlds(d.worlds || []);
        setOccasions(d.occasions || []);
      })
      .catch(() => {});
  }, []);

  function setParam(key, value) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }

  function applyDates() {
    const p = new URLSearchParams(searchParams.toString());
    if (dateFrom) p.set("date_from", dateFrom); else p.delete("date_from");
    if (dateTo)   p.set("date_to",   dateTo);   else p.delete("date_to");
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }

  function reset() {
    setDateFrom(""); setDateTo("");
    const p = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach(k => p.delete(k));
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }

  const activeCount = FILTER_KEYS.filter(k => searchParams.get(k)).length;
  const segment  = searchParams.get("segment")  || "";
  const risk     = searchParams.get("risk")     || "";
  const world    = searchParams.get("world")    || "";
  const occasion = searchParams.get("occasion") || "";

  const sel = {
    padding: "6px 9px", border: `1px solid ${t.border}`, borderRadius: 6,
    background: t.surface, color: t.text, fontSize: 12,
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    outline: "none", cursor: "pointer",
  };
  const dateInput = {
    ...sel, width: 120, cursor: "text",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8,
      padding: "10px 14px",
      background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10,
      marginBottom: 16,
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    }}>

      {/* Date range */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em" }}>Od</span>
        <input
          type="date" value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          onBlur={applyDates}
          onKeyDown={e => e.key === "Enter" && applyDates()}
          style={dateInput}
        />
        <span style={{ fontSize: 10, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.07em" }}>Do</span>
        <input
          type="date" value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          onBlur={applyDates}
          onKeyDown={e => e.key === "Enter" && applyDates()}
          style={dateInput}
        />
      </div>

      {/* Segment */}
      <select value={segment} onChange={e => setParam("segment", e.target.value)} style={sel}>
        <option value="">Segment: wszystkie</option>
        {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Risk */}
      <select value={risk} onChange={e => setParam("risk", e.target.value)} style={sel}>
        <option value="">Risk: wszystkie</option>
        {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      {/* World */}
      {worlds.length > 0 && (
        <select value={world} onChange={e => setParam("world", e.target.value)} style={sel}>
          <option value="">Świat: wszystkie</option>
          {worlds.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      )}

      {/* Occasion */}
      {occasions.length > 0 && (
        <select value={occasion} onChange={e => setParam("occasion", e.target.value)} style={sel}>
          <option value="">Okazja: wszystkie</option>
          {occasions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}

      {/* Active count badge */}
      {activeCount > 0 && (
        <span style={{
          padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
          background: t.badge, color: t.accent,
        }}>
          Filtry: {activeCount}
        </span>
      )}

      {/* Reset */}
      {activeCount > 0 && (
        <button
          onClick={reset}
          style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
            background: "none", border: `1px solid ${t.border}`, color: t.textSub,
          }}
        >
          Resetuj
        </button>
      )}
    </div>
  );
}
