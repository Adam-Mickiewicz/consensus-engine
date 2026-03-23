"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useDarkMode } from "../../../../hooks/useDarkMode";

const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", kpi: "#faf9f7", error: "#f87171",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", kpi: "#0d0d0c", error: "#f87171",
};

export default function PriceMappingPage() {
  const [dark] = useDarkMode();
  const t = dark ? DARK : LIGHT;

  // --- Stan sekcji A: Produkty bez kategorii ---
  const [unmapped, setUnmapped] = useState([]);
  const [unmappedLoading, setUnmappedLoading] = useState(true);
  const [unmappedError, setUnmappedError] = useState(null);
  const [pendingCategory, setPendingCategory] = useState({}); // product_name → input value
  const [savingRow, setSavingRow] = useState(null);           // product_name w trakcie zapisu

  // --- Stan sekcji B: Słownik mapowania ---
  const [mappings, setMappings] = useState([]);
  const [mappingsLoading, setMappingsLoading] = useState(true);
  const [mappingsError, setMappingsError] = useState(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  const fetchUnmapped = useCallback(async () => {
    setUnmappedLoading(true);
    setUnmappedError(null);
    try {
      const res = await fetch("/api/crm/category-mapping/unmapped");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setUnmapped(json.rows ?? []);
    } catch (e) {
      setUnmappedError(e.message);
    } finally {
      setUnmappedLoading(false);
    }
  }, []);

  const fetchMappings = useCallback(async () => {
    setMappingsLoading(true);
    setMappingsError(null);
    try {
      const res = await fetch("/api/crm/category-mapping");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMappings(json.rows ?? []);
    } catch (e) {
      setMappingsError(e.message);
    } finally {
      setMappingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnmapped();
    fetchMappings();
  }, [fetchUnmapped, fetchMappings]);

  async function handleSaveMapping(productName) {
    const categoryId = (pendingCategory[productName] ?? "").trim().toUpperCase();
    if (!categoryId) return;
    setSavingRow(productName);
    try {
      const res = await fetch("/api/crm/category-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: productName, category_id: categoryId }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      // Usuń z listy unmapped i odśwież słownik
      setUnmapped((prev) => prev.filter((r) => r.product_name !== productName));
      await fetchMappings();
    } catch (e) {
      alert("Błąd: " + e.message);
    } finally {
      setSavingRow(null);
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch("/api/crm/category-mapping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMappings((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert("Błąd: " + e.message);
    }
  }

  async function handleAddMapping(e) {
    e.preventDefault();
    const keyword = newKeyword.trim().toLowerCase();
    const category_id = newCategoryId.trim().toUpperCase();
    if (!keyword || !category_id) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/crm/category-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, category_id }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setNewKeyword("");
      setNewCategoryId("");
      await fetchMappings();
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .pm-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 980px; }
        .pm-title { font-family: var(--font-dm-serif), serif; font-size: 26px; color: ${t.text}; margin: 0 0 4px; }
        .pm-sub { font-size: 13px; color: ${t.textSub}; margin: 0 0 28px; }
        .pm-section-title { font-size: 15px; font-weight: 600; color: ${t.text}; margin: 0 0 4px; }
        .pm-section-sub { font-size: 12px; color: ${t.textSub}; margin: 0 0 14px; }
        .pm-section { margin-bottom: 40px; }
        .pm-hint { padding: 10px 14px; background: ${t.accent}11; border: 1px solid ${t.accent}33; border-radius: 8px; font-size: 12px; color: ${t.textSub}; margin-bottom: 14px; line-height: 1.6; }
        .pm-error { padding: 12px 16px; background: #f8717111; border: 1px solid #f8717144; border-radius: 8px; color: ${t.error}; font-size: 13px; margin-bottom: 14px; }
        .pm-count { font-size: 13px; color: ${t.textSub}; margin-bottom: 12px; }
        .pm-table-wrap { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; overflow-x: auto; margin-bottom: 10px; }
        .pm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pm-table th { padding: 8px 14px; color: ${t.textSub}; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid ${t.border}; text-align: left; }
        .pm-table td { padding: 9px 14px; border-bottom: 1px solid ${t.border}; color: ${t.text}; vertical-align: middle; }
        .pm-table tr:last-child td { border-bottom: none; }
        .pm-table tr:hover td { background: ${t.hover}; }
        .pm-rank { color: ${t.textSub}; font-size: 11px; }
        .pm-count-badge { font-family: var(--font-dm-serif), serif; font-size: 15px; color: ${t.accent}; }
        .pm-ean { font-family: monospace; font-size: 11px; color: ${t.textSub}; }
        .pm-input { padding: 5px 10px; border: 1px solid ${t.border}; border-radius: 6px; font-size: 12px; background: ${t.surface}; color: ${t.text}; font-family: var(--font-geist-sans); width: 160px; outline: none; }
        .pm-input:focus { border-color: ${t.accent}; }
        .pm-btn { padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; font-family: var(--font-geist-sans); }
        .pm-btn-save { background: ${t.accent}; color: #fff; }
        .pm-btn-save:hover { opacity: 0.85; }
        .pm-btn-save:disabled { opacity: 0.5; cursor: default; }
        .pm-btn-del { background: transparent; color: ${t.error}; border: 1px solid #f8717144; padding: 4px 10px; }
        .pm-btn-del:hover { background: #f8717111; }
        .pm-empty { padding: 50px 0; text-align: center; color: ${t.textSub}; font-size: 14px; }
        .pm-loading { padding: 30px 0; text-align: center; color: ${t.textSub}; font-size: 13px; }
        .pm-add-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 12px 14px; border-top: 1px solid ${t.border}; background: ${t.kpi}; }
        .pm-add-label { font-size: 11px; color: ${t.textSub}; }
        .pm-add-btn { background: ${t.accent}; color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font-geist-sans); }
        .pm-add-btn:hover { opacity: 0.85; }
        .pm-add-btn:disabled { opacity: 0.5; cursor: default; }
        .pm-add-error { font-size: 12px; color: ${t.error}; }
        .pm-product-name { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
      `}</style>

      <div className="pm-wrap">
        <h1 className="pm-title">Matryca cen — mapowanie kategorii</h1>
        <p className="pm-sub">Przypisz kategorie cenowe do produktów, aby ETL mógł uzupełnić cenę z matrycy price_history</p>

        {/* ── SEKCJA A: Produkty bez kategorii ── */}
        <div className="pm-section">
          <div className="pm-section-title">Produkty bez kategorii cenowej</div>
          <div className="pm-section-sub">Produkty z zamówień klientów, które nie mają jeszcze przypisanej kategorii cenowej</div>

          {unmappedError && <div className="pm-error">⚠ {unmappedError}</div>}

          {unmappedLoading ? (
            <div className="pm-loading">Ładowanie…</div>
          ) : unmapped.length === 0 ? (
            <div className="pm-empty">
              Wszystkie produkty mają przypisaną kategorię cenową.
            </div>
          ) : (
            <>
              <div className="pm-count">{unmapped.length} produktów czeka na mapowanie</div>
              <div className="pm-hint">
                Wpisz kategorię cenową (np. <strong>SKARPETY</strong>, <strong>KUBEK_500ML</strong>) i kliknij <strong>Zapisz</strong>. Wiersz zniknie z listy po zapisaniu. Kategoria zostanie dodana do słownika i użyta przy kolejnym ETL.
              </div>
              <div className="pm-table-wrap">
                <table className="pm-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nazwa produktu</th>
                      <th style={{ textAlign: "right" }}>Zakupów</th>
                      <th>EAN</th>
                      <th>Kategoria cenowa</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmapped.map((row, i) => (
                      <tr key={row.product_name}>
                        <td className="pm-rank">{i + 1}</td>
                        <td>
                          <div className="pm-product-name" title={row.product_name}>
                            {row.product_name}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="pm-count-badge">{row.count.toLocaleString("pl-PL")}</span>
                        </td>
                        <td>
                          <span className="pm-ean">{row.ean ?? "—"}</span>
                        </td>
                        <td>
                          <input
                            className="pm-input"
                            placeholder="np. SKARPETY"
                            value={pendingCategory[row.product_name] ?? ""}
                            onChange={(e) =>
                              setPendingCategory((prev) => ({
                                ...prev,
                                [row.product_name]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveMapping(row.product_name);
                            }}
                          />
                        </td>
                        <td>
                          <button
                            className="pm-btn pm-btn-save"
                            disabled={!pendingCategory[row.product_name]?.trim() || savingRow === row.product_name}
                            onClick={() => handleSaveMapping(row.product_name)}
                          >
                            {savingRow === row.product_name ? "…" : "Zapisz"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ── SEKCJA B: Słownik mapowania ── */}
        <div className="pm-section">
          <div className="pm-section-title">Słownik mapowania</div>
          <div className="pm-section-sub">Wszystkie reguły mapowania nazw produktów na kategorie cenowe (keyword → category_id)</div>

          {mappingsError && <div className="pm-error">⚠ {mappingsError}</div>}

          {mappingsLoading ? (
            <div className="pm-loading">Ładowanie…</div>
          ) : (
            <div className="pm-table-wrap">
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Keyword (fragment nazwy produktu)</th>
                    <th>Category ID</th>
                    <th>Dodano</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "30px 0", color: t.textSub }}>
                        Brak wpisów w słowniku
                      </td>
                    </tr>
                  ) : (
                    mappings.map((row, i) => (
                      <tr key={row.id}>
                        <td className="pm-rank">{i + 1}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{row.keyword}</td>
                        <td style={{ fontWeight: 600, color: t.accent }}>{row.category_id}</td>
                        <td style={{ color: t.textSub, fontSize: 11 }}>
                          {row.created_at ? new Date(row.created_at).toLocaleDateString("pl-PL") : "—"}
                        </td>
                        <td>
                          <button
                            className="pm-btn pm-btn-del"
                            onClick={() => handleDelete(row.id)}
                          >
                            Usuń
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Formularz dodawania */}
              <form className="pm-add-form" onSubmit={handleAddMapping}>
                <span className="pm-add-label">Dodaj regułę:</span>
                <input
                  className="pm-input"
                  placeholder="keyword (fragment nazwy)"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  required
                />
                <input
                  className="pm-input"
                  placeholder="CATEGORY_ID"
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  required
                />
                <button className="pm-add-btn" type="submit" disabled={addLoading}>
                  {addLoading ? "…" : "Dodaj"}
                </button>
                {addError && <span className="pm-add-error">⚠ {addError}</span>}
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
