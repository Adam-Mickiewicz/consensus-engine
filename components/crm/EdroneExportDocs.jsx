"use client";
import { useState } from "react";
import { useDarkMode } from "@/app/hooks/useDarkMode";

const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  kpi: "#faf9f7", headerBg: "#fdf6ee", mono: "#f5f3f0",
  tblHead: "#f5f3f0", tblBorder: "#e8e2da",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  kpi: "#0d0d0c", headerBg: "#1a1208", mono: "#1a1a18",
  tblHead: "#171614", tblBorder: "#252320",
};

const TAG_TABLES = [
  {
    title: "Segment",
    rows: [
      ["Diamond",  "Top 1% LTV"],
      ["Platinum", "Kolejne 2% LTV"],
      ["Gold",     "3+ zamówienia, LTV > 270 zł"],
      ["Returning","2 zamówienia"],
      ["New",      "1 zamówienie"],
    ],
  },
  {
    title: "Aktywność",
    rows: [
      ["Aktywny",       "risk = OK (< 180 dni od zakupu)"],
      ["Ryzyko",        "risk = Risk (180–365 dni)"],
      ["WysokeRyzyko",  "risk = HighRisk (365–730 dni)"],
      ["Utracony",      "risk = Lost (> 730 dni)"],
      ["WinbackVIP",    "Diamond/Platinum + Lost/HighRisk"],
    ],
  },
  {
    title: "Świat",
    rows: [
      ["Swiat_Literatura", "ulubiony_swiat = Literatura"],
      ["Swiat_Koty",       "ulubiony_swiat = Koty"],
      ["Swiat_Polska",     "ulubiony_swiat = Polska"],
      ["…",               "dla każdego świata — spacje → _, bez diakrytyków"],
    ],
  },
  {
    title: "Okazje",
    rows: [
      ["Okazja_DzienMatki",  "kupował na Dzień Matki"],
      ["Okazja_Swieta",      "kupował na Święta"],
      ["Okazja_Urodziny",    "kupował na Urodziny"],
      ["Okazja_BlackWeek",   "kupował na Black Week"],
      ["…",                 "wszystkie okazje z historii zakupów"],
    ],
  },
  {
    title: "Zachowanie",
    rows: [
      ["PromoHunter",  "60%+ zakupów w promocji"],
      ["FullPrice",    "≤ 20% zakupów w promocji"],
      ["Kolekcjoner",  "10+ unikalnych produktów i 5+ zamówień"],
      ["JedenProdukt", "tylko 1 unikalny produkt w historii"],
    ],
  },
  {
    title: "Kategorie produktów",
    rows: [
      ["Kupuje_Skarpety",  "SKARPETY / SKARPETY_STOPKI"],
      ["Kupuje_Koszulki",  "KOSZULKA_DAMSKA / _MESKA / _UNISEX"],
      ["Kupuje_Kubki",     "KUBEK / KUBEK_500ML"],
      ["Kupuje_Torby",     "TORBA / TORBA_NA_KSIAZKI"],
      ["Kupuje_Bluzy",     "BLUZA"],
      ["Kupuje_Czapki",    "CZAPKA"],
      ["Kupuje_Szaliki",   "SZALIK"],
      ["Kupuje_Breloki",   "BRELOK"],
      ["Kupuje_Magnesy",   "MAGNES"],
      ["Kupuje_Kartki",    "KARTKA"],
      ["Kupuje_Kalendarze","KALENDARZ"],
    ],
  },
  {
    title: "LTV",
    rows: [
      ["LTV_Ponizej100",   "LTV < 100 zł"],
      ["LTV_100_500",      "100–500 zł"],
      ["LTV_500_1000",     "500–1000 zł"],
      ["LTV_1000_3000",    "1000–3000 zł"],
      ["LTV_Powyzej3000",  "> 3000 zł"],
    ],
  },
  {
    title: "Ostatni zakup",
    rows: [
      ["OstatniZakup_7dni",       "≤ 7 dni temu"],
      ["OstatniZakup_30dni",      "≤ 30 dni temu"],
      ["OstatniZakup_90dni",      "≤ 90 dni temu"],
      ["OstatniZakup_180dni",     "≤ 180 dni temu"],
      ["OstatniZakup_Powyzej180", "> 180 dni temu"],
    ],
  },
  {
    title: "Rok pierwszego zakupu",
    rows: [
      ["Nowy2022", "first_order w 2022"],
      ["Nowy2023", "first_order w 2023"],
      ["Nowy2024", "first_order w 2024"],
      ["Nowy2025", "first_order w 2025"],
      ["Nowy2026", "first_order w 2026"],
    ],
  },
];

export default function EdroneExportDocs() {
  const [open, setOpen] = useState(false);
  const [dark] = useDarkMode();
  const t = dark ? DARK : LIGHT;

  const sectionStyle = {
    marginBottom: 20,
    background: t.kpi,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    overflow: "hidden",
  };
  const sectionHeader = {
    fontSize: 11,
    fontWeight: 700,
    color: t.accent,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "10px 14px 6px",
    background: t.headerBg,
    borderBottom: `1px solid ${t.tblBorder}`,
  };
  const tblStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  };
  const thStyle = {
    padding: "7px 14px",
    textAlign: "left",
    color: t.textSub,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.05em",
    background: t.tblHead,
    borderBottom: `1px solid ${t.tblBorder}`,
  };
  const tdStyle = {
    padding: "6px 14px",
    borderBottom: `1px solid ${t.tblBorder}`,
    color: t.text,
  };
  const tdLast = { ...tdStyle, borderBottom: "none" };
  const monoStyle = {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: 11,
    background: t.mono,
    padding: "2px 5px",
    borderRadius: 4,
    color: t.accent,
  };

  return (
    <div style={{
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 20,
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: t.headerBg, border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
          ℹ️ Jak działa eksport do edrone?
        </span>
        <span style={{ fontSize: 16, color: t.textSub, lineHeight: 1 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "18px 16px 20px", background: t.surface }}>

          {/* Dlaczego tylko CSV */}
          <div style={sectionStyle}>
            <div style={sectionHeader}>Dlaczego tylko CSV?</div>
            <div style={{ padding: "12px 14px", fontSize: 13, color: t.text, lineHeight: 1.7 }}>
              edrone Trace API obsługuje wyłącznie eventy behawioralne (zakupy, subskrypcje, odsłony)
              — nie ma endpointu do importu kontaktów ani aktualizacji tagów przez API.
              Jedyna droga synchronizacji to <strong>ręczny import CSV w Mission Control edrone</strong>
              (Kontakty → Import). edrone nadpisuje tagi przy każdym imporcie.
            </div>
          </div>

          {/* Jak często */}
          <div style={sectionStyle}>
            <div style={sectionHeader}>Jak często eksportować?</div>
            <div style={{ padding: "12px 14px", fontSize: 13, color: t.text, lineHeight: 1.7 }}>
              <strong>Raz w tygodniu</strong> lub <strong>przed każdą kampanią</strong>.
              Eksport zawsze pobiera aktualne dane z CRM — tagi odzwierciedlają bieżący stan klientów.
            </div>
          </div>

          {/* System tagów */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>
              System tagów
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {TAG_TABLES.map(tbl => (
                <div key={tbl.title} style={sectionStyle}>
                  <div style={sectionHeader}>{tbl.title}</div>
                  <table style={tblStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Tag</th>
                        <th style={thStyle}>Warunek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tbl.rows.map(([tag, cond], i) => (
                        <tr key={i}>
                          <td style={i === tbl.rows.length - 1 ? tdLast : tdStyle}>
                            <span style={tag !== "…" ? monoStyle : { color: t.textSub }}>{tag}</span>
                          </td>
                          <td style={{ ...(i === tbl.rows.length - 1 ? tdLast : tdStyle), color: t.textSub }}>
                            {cond}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          {/* Przykład tagów */}
          <div style={sectionStyle}>
            <div style={sectionHeader}>Przykład tagów dla jednego klienta</div>
            <div style={{ padding: "12px 14px" }}>
              <code style={{
                display: "block",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 12,
                background: t.mono,
                border: `1px solid ${t.tblBorder}`,
                borderRadius: 6,
                padding: "10px 14px",
                color: t.accent,
                lineHeight: 1.8,
                wordBreak: "break-all",
              }}>
                Diamond,WinbackVIP,Swiat_Literatura,Okazja_Swieta,Okazja_DzienMatki,FullPrice,Kolekcjoner,Kupuje_Skarpety,Kupuje_Kubki,LTV_Powyzej3000,OstatniZakup_Powyzej180,Nowy2022
              </code>
            </div>
          </div>

          {/* Jak wgrać do edrone */}
          <div style={sectionStyle}>
            <div style={sectionHeader}>Jak wgrać do edrone — kroki</div>
            <div style={{ padding: "12px 14px" }}>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: t.text, lineHeight: 2 }}>
                <li>Pobierz plik CSV przyciskiem <strong>Eksport do edrone</strong> poniżej</li>
                <li>Zaloguj się do <strong>Mission Control edrone</strong></li>
                <li>Przejdź do: <strong>Kontakty → Import</strong></li>
                <li>Wybierz pobrany plik CSV</li>
                <li>Zmapuj kolumny: <span style={monoStyle}>email→email</span>, <span style={monoStyle}>tags→tagi</span>, <span style={monoStyle}>subscription_date→data subskrypcji</span></li>
                <li>Uruchom import — tagi zostaną <strong>nadpisane</strong> dla wszystkich importowanych kontaktów</li>
              </ol>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
