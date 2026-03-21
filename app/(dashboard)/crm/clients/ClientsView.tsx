"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDarkMode } from "../../../hooks/useDarkMode";
import { useCallback } from "react";

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

export type ClientRow = {
  client_id: string;
  legacy_segment: string | null;
  risk_level: string | null;
  ltv: number | null;
  ulubiony_swiat: string | null;
  last_order: string | null;
};

export default function ClientsView({
  clients,
  total,
  page,
  totalPages,
  search,
  segment,
  risk,
}: {
  clients: ClientRow[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  segment: string;
  risk: string;
}) {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      params.delete("page"); // reset to page 1 on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  function goPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

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
        .cl-empty { padding: 60px 0; text-align: center; color: ${t.textSub}; font-size: 14px; }
      `}</style>

      <div className="cl-wrap">
        <h1 className="cl-title">Baza Klientów</h1>
        <p className="cl-sub">Przeglądaj i filtruj {total.toLocaleString("pl-PL")} klientów Nadwyraz.com</p>

        {total === 0 && !search && segment === "All" && risk === "All" ? (
          <div className="cl-empty">
            Brak danych — wgraj CSV w zakładce <strong style={{ color: t.text }}>Import</strong>
          </div>
        ) : (
          <>
            <div className="cl-toolbar">
              <input
                className="cl-input"
                placeholder="Szukaj po ID klienta..."
                defaultValue={search}
                onChange={e => updateParams({ search: e.target.value })}
              />
              <select
                className="cl-select"
                value={segment}
                onChange={e => updateParams({ segment: e.target.value })}
              >
                <option value="All">Wszystkie segmenty</option>
                {["Diamond", "Platinum", "Gold", "Returning", "New"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                className="cl-select"
                value={risk}
                onChange={e => updateParams({ risk: e.target.value })}
              >
                <option value="All">Wszystkie ryzyko</option>
                {["OK", "Risk", "HighRisk", "Lost"].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <span className="cl-count">{total} klientów</span>
            </div>

            <div className="cl-table-wrap">
              <table className="cl-table">
                <thead>
                  <tr>
                    <th>ID klienta</th>
                    <th>Segment</th>
                    <th>Ryzyko</th>
                    <th style={{ textAlign: "right" }}>LTV</th>
                    <th>Ulubiony świat</th>
                    <th>Ostatni zakup</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.client_id}>
                      <td style={{ fontWeight: 500, fontSize: 12, letterSpacing: "0.02em" }}>{c.client_id}</td>
                      <td>
                        {c.legacy_segment ? (
                          <span className="cl-badge" style={{
                            background: SEG_COLORS[c.legacy_segment] + "22",
                            color: SEG_COLORS[c.legacy_segment],
                          }}>{c.legacy_segment}</span>
                        ) : "—"}
                      </td>
                      <td>
                        {c.risk_level ? (
                          <span className="cl-risk" style={{ background: RISK_COLORS[c.risk_level] }}>
                            {c.risk_level}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ textAlign: "right", color: t.accent, fontVariantNumeric: "tabular-nums" }}>
                        {c.ltv != null ? `${Number(c.ltv).toLocaleString("pl-PL")} zł` : "—"}
                      </td>
                      <td style={{ color: t.textSub, fontSize: 12 }}>{c.ulubiony_swiat ?? "—"}</td>
                      <td style={{ color: t.textSub, fontSize: 12 }}>
                        {c.last_order ? c.last_order.slice(0, 10) : "—"}
                      </td>
                      <td>
                        <Link href={`/crm/clients/${c.client_id}`} className="cl-link">Profil →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="cl-pagination">
                <button className="cl-page-btn" disabled={page === 1} onClick={() => goPage(page - 1)}>
                  ← Poprzednia
                </button>
                <span style={{ color: t.textSub }}>Strona {page} z {totalPages}</span>
                <button className="cl-page-btn" disabled={page === totalPages} onClick={() => goPage(page + 1)}>
                  Następna →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
