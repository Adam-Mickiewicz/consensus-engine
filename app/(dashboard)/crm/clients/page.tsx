"use client";
import { useState } from "react";
import Link from "next/link";
import { useDarkMode } from "../../../hooks/useDarkMode";
import { customers } from "../../../../lib/crm/mockData";

const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", kpi: "#faf9f7",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", kpi: "#0d0d0c",
};

const SEG_COLORS: Record<string, string> = {
  Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24",
  Returning: "#34d399", New: "#f87171",
};
const RISK_COLORS: Record<string, string> = {
  OK: "#34d399", Risk: "#fbbf24", HighRisk: "#f97316", Lost: "#f87171",
};

const PAGE_SIZE = 30;

export default function CrmClientsPage() {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  const [search, setSearch] = useState("");
  const [segFilter, setSegFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = customers.filter(c => {
    if (segFilter !== "All" && c.segment !== segFilter) return false;
    if (riskFilter !== "All" && c.risk_level !== riskFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const sliced = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilter() { setPage(1); }

  return (
    <>
      <style>{`
        .cl-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; }
        .cl-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .cl-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 20px; }
        .cl-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .cl-input { padding: 7px 12px; border: 1px solid ${t.border}; border-radius: 7px; background: ${t.surface}; color: ${t.text}; font-size: 13px; font-family: var(--font-geist-sans); outline: none; min-width: 220px; }
        .cl-input:focus { border-color: ${t.accent}; }
        .cl-select { padding: 7px 10px; border: 1px solid ${t.border}; border-radius: 7px; background: ${t.surface}; color: ${t.text}; font-size: 13px; font-family: var(--font-geist-sans); outline: none; cursor: pointer; }
        .cl-count { font-size: 12px; color: ${t.textSub}; margin-left: auto; }
        .cl-table-wrap { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; overflow-x: auto; }
        .cl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .cl-table th { padding: 8px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid ${t.border}; text-align: left; white-space: nowrap; }
        .cl-table td { padding: 10px 14px; border-bottom: 1px solid ${t.border}; color: ${t.text}; white-space: nowrap; }
        .cl-table tr:last-child td { border-bottom: none; }
        .cl-table tr:hover td { background: ${t.hover}; }
        .cl-badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .cl-risk { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; color: #fff; }
        .cl-link { color: ${t.accent}; text-decoration: none; font-size: 12px; }
        .cl-link:hover { text-decoration: underline; }
        .cl-pagination { display: flex; align-items: center; gap: 8px; margin-top: 16px; font-size: 13px; }
        .cl-page-btn { padding: 5px 12px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.surface}; color: ${t.text}; cursor: pointer; font-size: 12px; }
        .cl-page-btn:hover { background: ${t.hover}; }
        .cl-page-btn:disabled { opacity: 0.4; cursor: default; }
        .cl-page-btn.active { background: ${t.accent}; color: #fff; border-color: ${t.accent}; }
      `}</style>

      <div className="cl-wrap">
        <h1 className="cl-title">Baza Klientów</h1>
        <p className="cl-sub">Przeglądaj i filtruj {customers.length.toLocaleString('pl-PL')} klientów Nadwyraz.com</p>

        <div className="cl-toolbar">
          <input
            className="cl-input"
            placeholder="Szukaj po nazwie, ID, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); handleFilter(); }}
          />
          <select className="cl-select" value={segFilter} onChange={e => { setSegFilter(e.target.value); handleFilter(); }}>
            <option value="All">Wszystkie segmenty</option>
            {["Diamond", "Platinum", "Gold", "Returning", "New"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="cl-select" value={riskFilter} onChange={e => { setRiskFilter(e.target.value); handleFilter(); }}>
            <option value="All">Wszystkie ryzyko</option>
            {["OK", "Risk", "HighRisk", "Lost"].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <span className="cl-count">{filtered.length} klientów</span>
        </div>

        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Imię i nazwisko</th>
                <th>Segment</th>
                <th>Ryzyko</th>
                <th style={{ textAlign: "right" }}>LTV</th>
                <th>Ulubiony świat</th>
                <th>Ostatni zakup</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sliced.map(c => (
                <tr key={c.id}>
                  <td style={{ color: t.textSub, fontSize: 11 }}>{c.id}</td>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>
                    <span className="cl-badge" style={{
                      background: SEG_COLORS[c.segment] + "22",
                      color: SEG_COLORS[c.segment],
                    }}>{c.segment}</span>
                  </td>
                  <td>
                    <span className="cl-risk" style={{ background: RISK_COLORS[c.risk_level] }}>
                      {c.risk_level}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", color: t.accent, fontVariantNumeric: "tabular-nums" }}>
                    {c.ltv.toLocaleString('pl-PL')} zł
                  </td>
                  <td style={{ color: t.textSub, fontSize: 12 }}>{c.ulubiony_swiat}</td>
                  <td style={{ color: t.textSub, fontSize: 12 }}>{c.last_purchase_date}</td>
                  <td>
                    <Link href={`/crm/clients/${c.id}`} className="cl-link">Profil →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="cl-pagination">
            <button className="cl-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Poprzednia</button>
            <span style={{ color: t.textSub }}>Strona {page} z {totalPages}</span>
            <button className="cl-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Następna →</button>
          </div>
        )}
      </div>
    </>
  );
}
