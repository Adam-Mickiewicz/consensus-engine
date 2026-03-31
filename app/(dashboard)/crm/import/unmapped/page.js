"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDarkMode } from "../../../../hooks/useDarkMode";

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

const SHEETS_URL = "https://docs.google.com/spreadsheets";

function fmtPLN(n) {
  return Number(n).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";
}

function SortIcon({ col, current, order }) {
  if (col !== current) return <span style={{ opacity: 0.25, marginLeft: 4 }}>↕</span>;
  return <span style={{ marginLeft: 4 }}>{order === "asc" ? "↑" : "↓"}</span>;
}

export default function UnmappedPage() {
  const { isDark: dark } = useDarkMode();
  const t = dark ? DARK : LIGHT;

  const [rows, setRows]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("all");   // all | matched | unmatched
  const [sort, setSort]         = useState("klientow");
  const [order, setOrder]       = useState("desc");
  const [page, setPage]         = useState(1);

  const debounceRef = useRef(null);

  const fetchData = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        search: params.search,
        status: params.status,
        sort:   params.sort,
        order:  params.order,
        page:   params.page,
        limit:  50,
      });
      const res = await fetch(`/api/crm/import/unmapped?${qs}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Błąd ${res.status}`);
      }
      const data = await res.json();
      setRows(data.rows ?? []);
      setStats(data.stats ?? null);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on param changes
  useEffect(() => {
    fetchData({ search, status, sort, order, page });
  }, [status, sort, order, page, fetchData]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData({ search, status, sort, order, page: 1 });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSort(col) {
    if (sort === col) {
      setOrder(o => o === "desc" ? "asc" : "desc");
    } else {
      setSort(col);
      setOrder("desc");
    }
    setPage(1);
  }

  function handleStatusTab(s) {
    setStatus(s);
    setPage(1);
  }

  function exportCSV() {
    const unmatchedRows = status === "matched"
      ? rows
      : rows.filter(r => r.matched_ean == null);
    if (unmatchedRows.length === 0) return;
    const header = "product_name;klientow;zakupow;wartosc";
    const body = unmatchedRows.map(r =>
      [
        `"${(r.product_name || "").replace(/"/g, '""')}"`,
        r.klientow,
        r.zakupow,
        String(r.wartosc).replace(".", ","),
      ].join(";")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "unmapped_products.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const thStyle = (col) => ({
    padding: "9px 14px", textAlign: col === "klientow" || col === "zakupow" || col === "wartosc" ? "right" : "left",
    fontWeight: 500, fontSize: 11, letterSpacing: "0.05em", color: t.textSub,
    borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap",
    cursor: "pointer", userSelect: "none",
    background: sort === col ? (dark ? "#1a1a1a" : "#f5f3f0") : "transparent",
  });
  const tdStyle = (align = "left") => ({
    padding: "10px 14px", borderBottom: `1px solid ${t.border}`,
    color: t.text, fontSize: 13, textAlign: align,
    verticalAlign: "middle",
  });

  return (
    <>
      <style>{`
        .um-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 1100px; }
        .um-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .um-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 20px; }
        .um-kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .um-kpi { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 10px; padding: 12px 18px; min-width: 140px; }
        .um-kpi-val { font-family: var(--font-dm-serif), serif; font-size: 22px; color: ${t.text}; }
        .um-kpi-label { font-size: 11px; color: ${t.textSub}; margin-top: 2px; }
        .um-match-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; font-size: 13px; }
        .um-match-ok  { color: #34d399; font-weight: 600; }
        .um-match-bad { color: #f87171; font-weight: 600; }
        .um-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
        .um-search { flex: 1; min-width: 220px; padding: 8px 12px; border-radius: 8px; border: 1px solid ${t.border}; background: ${t.surface}; color: ${t.text}; font-size: 13px; outline: none; font-family: var(--font-geist-sans); }
        .um-search:focus { border-color: ${t.accent}; }
        .um-tabs { display: flex; gap: 4px; }
        .um-tab { padding: 7px 14px; border-radius: 8px; border: 1px solid ${t.border}; background: transparent; color: ${t.textSub}; font-size: 12px; cursor: pointer; font-family: var(--font-geist-sans); transition: all 0.1s; }
        .um-tab:hover { background: ${t.hover}; color: ${t.text}; }
        .um-tab.active { background: ${t.accent}; color: #fff; border-color: ${t.accent}; font-weight: 600; }
        .um-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid ${t.border}; background: transparent; color: ${t.textSub}; font-size: 12px; cursor: pointer; font-family: var(--font-geist-sans); white-space: nowrap; transition: all 0.1s; }
        .um-btn:hover { background: ${t.hover}; color: ${t.text}; }
        .um-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .um-table { width: 100%; border-collapse: collapse; }
        .um-table tr:last-child td { border-bottom: none; }
        .um-table tr:hover td { background: ${t.hover}; }
        .um-chip-ok  { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #34d39920; color: #34d399; white-space: nowrap; max-width: 340px; overflow: hidden; text-overflow: ellipsis; }
        .um-chip-bad { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #f8717120; color: #f87171; }
        .um-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid ${t.accent}44; border-top-color: ${t.accent}; border-radius: 50%; animation: um-spin 0.7s linear infinite; }
        @keyframes um-spin { to { transform: rotate(360deg); } }
        .um-pagination { display: flex; align-items: center; gap: 8px; padding: 14px 16px; border-top: 1px solid ${t.border}; font-size: 12px; color: ${t.textSub}; }
        .um-page-btn { padding: 5px 11px; border-radius: 6px; border: 1px solid ${t.border}; background: transparent; color: ${t.textSub}; font-size: 12px; cursor: pointer; font-family: var(--font-geist-sans); }
        .um-page-btn:hover:not(:disabled) { background: ${t.hover}; color: ${t.text}; }
        .um-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .um-page-current { padding: 5px 11px; border-radius: 6px; background: ${t.accent}; color: #fff; font-size: 12px; font-weight: 600; }
        .um-empty { padding: 40px; text-align: center; color: ${t.textSub}; font-size: 13px; }
        .um-error { padding: 14px 18px; background: #f8717111; border: 1px solid #f8717144; border-radius: 8px; color: #f87171; font-size: 13px; margin-bottom: 16px; }
      `}</style>

      <div className="um-wrap">
        <h1 className="um-title">Produkty bez taksonomii</h1>
        <p className="um-sub">
          Eventy zakupowe bez dopasowania EAN w tabeli products — pogrupowane po nazwie produktu
        </p>

        {/* KPI row */}
        {stats && (
          <>
            <div className="um-kpi-row">
              <div className="um-kpi">
                <div className="um-kpi-val">{stats.total.toLocaleString("pl-PL")}</div>
                <div className="um-kpi-label">unikalnych produktów</div>
              </div>
              <div className="um-kpi">
                <div className="um-kpi-val">{stats.zakupow.toLocaleString("pl-PL")}</div>
                <div className="um-kpi-label">zakupów łącznie</div>
              </div>
              <div className="um-kpi">
                <div className="um-kpi-val">{fmtPLN(stats.wartosc)}</div>
                <div className="um-kpi-label">wartość łącznie</div>
              </div>
            </div>
            <div className="um-match-row">
              <span className="um-match-ok">
                ✅ {stats.matched.toLocaleString("pl-PL")} zmatchowanych po nazwie
              </span>
              <span className="um-match-bad">
                ❌ {stats.unmatched.toLocaleString("pl-PL")} całkowicie bez taksonomii
              </span>
            </div>
          </>
        )}

        {error && <div className="um-error">⚠ {error}</div>}

        {/* Toolbar */}
        <div className="um-toolbar">
          <input
            className="um-search"
            placeholder="Szukaj po nazwie produktu…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="um-tabs">
            {[
              { key: "all",       label: "Wszystkie" },
              { key: "matched",   label: "✅ Zmatchowane" },
              { key: "unmatched", label: "❌ Brak taksonomii" },
            ].map(tab => (
              <button
                key={tab.key}
                className={`um-tab${status === tab.key ? " active" : ""}`}
                onClick={() => handleStatusTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            className="um-btn"
            onClick={() => window.open(SHEETS_URL, "_blank")}
          >
            Otwórz Sheets ↗
          </button>

          <button className="um-btn" onClick={exportCSV}>
            Eksportuj CSV ❌
          </button>
        </div>

        {/* Table */}
        <div className="um-card">
          {loading ? (
            <div className="um-empty">
              <span className="um-spinner" style={{ marginRight: 10 }} />
              Ładowanie…
            </div>
          ) : rows.length === 0 ? (
            <div className="um-empty">Brak wyników</div>
          ) : (
            <table className="um-table">
              <thead>
                <tr>
                  <th style={thStyle("name")} onClick={() => handleSort("name")}>
                    Nazwa produktu <SortIcon col="name" current={sort} order={order} />
                  </th>
                  <th style={thStyle("status")} onClick={() => handleSort("status")}>
                    Status <SortIcon col="status" current={sort} order={order} />
                  </th>
                  <th style={thStyle("klientow")} onClick={() => handleSort("klientow")}>
                    Klientów <SortIcon col="klientow" current={sort} order={order} />
                  </th>
                  <th style={thStyle("zakupow")} onClick={() => handleSort("zakupow")}>
                    Zakupów <SortIcon col="zakupow" current={sort} order={order} />
                  </th>
                  <th style={thStyle("wartosc")} onClick={() => handleSort("wartosc")}>
                    Wartość <SortIcon col="wartosc" current={sort} order={order} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.product_name}-${i}`}>
                    <td style={{ ...tdStyle(), maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span title={r.product_name} style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12 }}>
                        {r.product_name}
                      </span>
                    </td>
                    <td style={tdStyle()}>
                      {r.matched_ean != null ? (
                        <span className="um-chip-ok" title={`EAN: ${r.matched_ean}`}>
                          Match: {r.matched_name}
                        </span>
                      ) : (
                        <span className="um-chip-bad">Brak</span>
                      )}
                    </td>
                    <td style={tdStyle("right")}>
                      {Number(r.klientow).toLocaleString("pl-PL")}
                    </td>
                    <td style={tdStyle("right")}>
                      {Number(r.zakupow).toLocaleString("pl-PL")}
                    </td>
                    <td style={{ ...tdStyle("right"), fontVariantNumeric: "tabular-nums" }}>
                      {fmtPLN(r.wartosc)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="um-pagination">
              <button
                className="um-page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Poprzednia
              </button>
              <span className="um-page-current">{page}</span>
              <span>z {totalPages}</span>
              <button
                className="um-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Następna →
              </button>
              <span style={{ marginLeft: "auto" }}>
                {total.toLocaleString("pl-PL")} wyników
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
