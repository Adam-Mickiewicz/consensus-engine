"use client";
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

export default function UnmappedView({
  rows,
  error,
}: {
  rows: { product_name: string; count: number }[];
  error?: string;
}) {
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  function handleExport() {
    window.open("/api/crm/unmapped?format=csv", "_blank");
  }

  return (
    <>
      <style>{`
        .um-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 900px; }
        .um-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .um-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 20px; }
        .um-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .um-count { font-size: 13px; color: ${t.textSub}; }
        .um-btn { padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid ${t.border}; background: ${t.surface}; color: ${t.text}; font-family: var(--font-geist-sans); }
        .um-btn:hover { background: ${t.hover}; }
        .um-btn-primary { background: ${t.accent}; color: #fff; border-color: ${t.accent}; }
        .um-btn-primary:hover { opacity: 0.87; }
        .um-table-wrap { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; overflow-x: auto; }
        .um-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .um-table th { padding: 8px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid ${t.border}; text-align: left; }
        .um-table td { padding: 10px 14px; border-bottom: 1px solid ${t.border}; color: ${t.text}; }
        .um-table tr:last-child td { border-bottom: none; }
        .um-table tr:hover td { background: ${t.hover}; }
        .um-rank { color: ${t.textSub}; font-size: 11px; }
        .um-count-badge { font-family: var(--font-dm-serif), serif; font-size: 16px; color: ${t.accent}; }
        .um-empty { padding: 60px 0; text-align: center; color: ${t.textSub}; font-size: 14px; }
        .um-error { padding: 14px 18px; background: #f8717111; border: 1px solid #f8717144; border-radius: 8px; color: #f87171; font-size: 13px; margin-bottom: 16px; }
        .um-hint { padding: 12px 16px; background: ${t.accent}11; border: 1px solid ${t.accent}33; border-radius: 8px; font-size: 12px; color: ${t.textSub}; margin-bottom: 20px; line-height: 1.6; }
      `}</style>

      <div className="um-wrap">
        <h1 className="um-title">Braki w taksonomii</h1>
        <p className="um-sub">Produkty zakupione przez klientów, które nie zostały zmapowane na żaden produkt w bazie</p>

        {error && <div className="um-error">⚠ {error}</div>}

        <div className="um-hint">
          Eksportuj tabelę jako CSV, uzupełnij kolumnę <strong>suggested_world</strong> i dodaj produkty do katalogu w zakładce produktowej.
          Zmapowanie produktów poprawi jakość taksonomii CRM.
        </div>

        {rows.length === 0 && !error ? (
          <div className="um-empty">
            Brak produktów bez mapowania — wszystkie produkty mają przypisany EAN.
          </div>
        ) : (
          <>
            <div className="um-toolbar">
              <span className="um-count">{rows.length.toLocaleString("pl-PL")} unikalnych produktów bez mapowania</span>
              <div style={{ marginLeft: "auto" }}>
                <button className="um-btn um-btn-primary" onClick={handleExport}>
                  Eksportuj CSV ↓
                </button>
              </div>
            </div>

            <div className="um-table-wrap">
              <table className="um-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nazwa produktu</th>
                    <th style={{ textAlign: "right" }}>Liczba zakupów</th>
                    <th>Sugerowany świat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.product_name}>
                      <td className="um-rank">{i + 1}</td>
                      <td style={{ fontWeight: 500, maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.product_name}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="um-count-badge">{row.count.toLocaleString("pl-PL")}</span>
                      </td>
                      <td style={{ color: t.textSub, fontSize: 12 }}>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
