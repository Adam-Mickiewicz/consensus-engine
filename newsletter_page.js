"use client";
import React, { useState, useCallback } from "react";

function generateTextBlockHTML(text) {
  const bodyLines = text.body.split("\n").map(line =>
    line.trim() === ""
      ? `  <p style="margin: 0 0 10px 0;">&nbsp;</p>`
      : `  <p style="margin: 0 0 10px 0;">${line}</p>`
  ).join("\n");
  return `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@700&display=swap" rel="stylesheet">
<div style="font-family: 'Playfair Display', serif; font-size: 14px; line-height: 1.5; color: #000; text-align: center;">
  <p style="font-weight: 700; font-size: 18px; line-height: 1.2; margin: 0 0 16px 0;">${text.headline}</p>
${bodyLines}
</div>
<div style="text-align: center; padding-bottom: 24px;">
  <a href="${text.buttonLink}" style="display: inline-block; background-color: #ffffff; color: #000000; font-family: 'Open Sans', sans-serif; font-weight: 700; font-size: 14px; padding: 12px 48px; border-radius: 12px; border: 1px solid #000000; text-decoration: none;">${text.buttonText}</a>
</div>`;
}

function generateProductsHTML(products) {
  const productsHTML = products.map((p, i) => {
    const isLast = i === products.length - 1;
    const marginRight = isLast ? "" : "margin-right:13px;";
    const priceColor = p.isPromo ? "#cc0000" : "#000000";
    const promoLine = p.isPromo && p.oldPrice
      ? `\n            <p style="margin:0;"><span style="font-family:'Open Sans',sans-serif; font-size:11px; color:#666; text-decoration:line-through;">${p.oldPrice}</span> <span style="font-family:'Open Sans',sans-serif; font-size:11px; color:#cc0000; font-weight:700;">${p.discount}</span></p>`
      : "";
    const msoSep = isLast ? "" : `\n      <!--[if (gte mso 9)|(IE)]></td><td width="150" valign="top"><![endif]-->`;
    return `      <table class="prod" border="0" cellpadding="0" cellspacing="0" width="150" align="left" style="width:150px; max-width:150px; display:inline-block; vertical-align:top; ${marginRight}margin-bottom:8px;">
        <tr><td style="padding:0;">
          <a href="${p.link}"><img src="${p.imageUrl}" width="100%" style="display:block; max-width:100%; height:auto; border-radius:5px 5px 0 0;" alt=""></a>
          <div style="background:#ffffff; border-radius:0 0 5px 5px; padding:6px 6px 8px 6px;">
            <p style="font-family:'Playfair Display',serif; font-size:12px; color:#000; margin:0 0 4px 0;">${p.name}</p>
            <p style="font-family:'Open Sans',sans-serif; font-size:13px; font-weight:700; color:${priceColor}; margin:0 0 2px 0;">${p.price}</p>${promoLine}
          </div>
        </td></tr>
      </table>${msoSep}`;
  }).join("\n");
  return `<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&family=Playfair+Display:wght@400&display=swap" rel="stylesheet">
<style>
  @media screen and (max-width: 600px) { .prod { width: 50% !important; max-width: 50% !important; } }
</style>
<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
  <tr><td align="center" style="padding:0;">
      <!--[if (gte mso 9)|(IE)]><table width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td width="150" valign="top"><![endif]-->
${productsHTML}
      <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
  </td></tr>
</table>`;
}

function generateEdroneCSSOverride(s) {
  const fontImport = s.fontFamily.includes("Playfair")
    ? `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">`
    : s.fontFamily.includes("Open Sans")
    ? `<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap" rel="stylesheet">`
    : "";

  // Use ID selector if provided — beats edrone's own #id rules
  const id = s.blockId ? `#${s.blockId.trim()}` : "";
  const sel = id ? `${id}` : "";
  const eSel = sel ? `${sel} ` : "";

  return `${fontImport}
<style>
  /* ── Nadwyraz edrone override ── */

  ${eSel}.e-row.e-stack, ${eSel}.edrone-box {
    background-color: ${s.bgColor} !important;
  }

  ${eSel}.e-col, ${eSel}.edrone-col {
    padding: ${s.colPadding}px !important;
    vertical-align: top !important;
  }

  ${eSel}.product-image {
    border-radius: ${s.imgRadius}px !important;
    padding-bottom: ${s.imgPaddingBottom}px !important;
  }

  ${eSel}.product-title {
    height: auto !important;
    overflow: visible !important;
    background-color: ${s.cardBg} !important;
    border-radius: 0 0 ${s.cardRadius}px ${s.cardRadius}px !important;
    padding: ${s.titlePadding}px !important;
  }

  ${eSel}.product-title p,
  ${eSel}.product-title p a,
  ${eSel}.e-stack .e-col .product-title p,
  ${eSel}.e-stack .e-col .product-title p a {
    font-family: ${s.fontFamily} !important;
    font-size: ${s.fontSize}px !important;
    color: ${s.titleColor} !important;
    font-weight: ${s.fontWeight} !important;
    letter-spacing: ${s.letterSpacing}px !important;
    text-align: ${s.textAlign} !important;
    line-height: ${s.lineHeight} !important;
    text-decoration: ${s.linkDecoration} !important;
  }

  ${eSel}.e-col + .e-col {
    border-left: ${s.colBorder}px solid ${s.colBorderColor} !important;
  }

  @media only screen and (max-width: 620px) {
    ${eSel}.e-col { display: block !important; width: 100% !important; max-width: 100% !important; }
    ${eSel}.e-col + .e-col { border-left: none !important; border-top: ${s.colBorder}px solid ${s.colBorderColor} !important; }
  }
</style>`;
}

function generateEdronePreviewHTML(s) {
  const colCount = parseInt(s.colCount) || 3;
  const sampleProducts = [
    { title: "ŻE TĘ / kubek różowy z uchem", img: "https://nadwyraz.com/userdata/public/gfx/13746/Kubek-Ze-te-nadwyrazcom-1.jpg" },
    { title: "CZASEM PRZESADZAM / skarpety", img: "https://nadwyraz.com/userdata/public/gfx/10882/Skarpety_Czasem_przesadzam_nadwyrazcom_3.jpg" },
    { title: "CZASEM PRZESADZAM / torba bawełniana / zielona", img: "https://nadwyraz.com/userdata/public/gfx/10898/Torba_Czasem_przesadzam_5.jpg" },
    { title: "ABECADŁO / koszulka dziecięca", img: "https://nadwyraz.com/userdata/public/gfx/17598/Koszulka-dziecieca-Abecadlo-Tuwim-nadwyrazcom-1.jpg" },
  ].slice(0, colCount);

  const fontImport = s.fontFamily.includes("Playfair")
    ? `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">`
    : s.fontFamily.includes("Open Sans")
    ? `<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap" rel="stylesheet">`
    : "";

  const pct = colCount === 2 ? "50" : colCount === 4 ? "25" : "33.33";

  return `${fontImport}
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:${s.bgColor}; max-width:720px;">
  <tr>
    ${sampleProducts.map((col, i) => `
    <td width="${pct}%" valign="top" style="padding:${s.colPadding}px; ${i > 0 && parseInt(s.colBorder) > 0 ? `border-left:${s.colBorder}px solid ${s.colBorderColor};` : ""}">
      <a href="#"><img src="${col.img}" class="product-image" width="100%" style="display:block; border-radius:${s.imgRadius}px; padding-bottom:${s.imgPaddingBottom}px;" /></a>
      <div class="product-title" style="background:${s.cardBg}; border-radius:0 0 ${s.cardRadius}px ${s.cardRadius}px; padding:${s.titlePadding}px; height:auto; overflow:visible;">
        <p style="font-family:${s.fontFamily}; font-size:${s.fontSize}px; color:${s.titleColor}; font-weight:${s.fontWeight}; letter-spacing:${s.letterSpacing}px; text-align:${s.textAlign}; line-height:${s.lineHeight}; margin:0;"><a href="#" style="color:${s.titleColor}; text-decoration:${s.linkDecoration};">${col.title}</a></p>
      </div>
    </td>`).join("")}
  </tr>
</table>`;
}

function PreviewFrame({ html, title, width = 360 }) {
  const [mobile, setMobile] = React.useState(false);
  const mobileWidth = 375;
  const activeWidth = mobile ? mobileWidth : width;
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#e8e4de;}*{box-sizing:border-box;}.wrapper{max-width:${activeWidth}px;margin:0 auto;background:#fff;padding:16px;}</style></head><body><div class="wrapper">${html}</div></body></html>`;
  return (
    <div style={{ border: "1px solid #e8e4de", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", background: "#f5f2ee", borderBottom: "1px solid #e8e4de", fontSize: "11px", color: "#888", fontFamily: "sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>📧 Podgląd — {title}</span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ color: "#bbb", marginRight: 4 }}>{mobile ? `${mobileWidth}px` : `${width}px`}</span>
          <button onClick={() => setMobile(false)} style={{ background: mobile ? "transparent" : "#1a1a1a", color: mobile ? "#aaa" : "#fff", border: "1px solid #ddd", borderRadius: "5px", padding: "3px 10px", fontSize: "11px", cursor: "pointer" }}>🖥 Desktop</button>
          <button onClick={() => setMobile(true)} style={{ background: mobile ? "#1a1a1a" : "transparent", color: mobile ? "#fff" : "#aaa", border: "1px solid #ddd", borderRadius: "5px", padding: "3px 10px", fontSize: "11px", cursor: "pointer" }}>📱 Mobile</button>
        </div>
      </div>
      <div style={{ padding: "16px", background: "#e8e4de", display: "flex", justifyContent: "center" }}>
        <iframe srcDoc={fullHtml} style={{ width: `${activeWidth}px`, maxWidth: "100%", height: "400px", border: "none", display: "block", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} title={title} />
      </div>
    </div>
  );
}

const defaultText = {
  headline: "Nowa kolekcja – Nadwyraz.com x Wydawnictwo Literackie 📚",
  body: "Słowa poetek nie tracą aktualności.\nZmienia się tylko to, gdzie je spotykamy.\n\nCzasem na kartkach książek.\nA czasem na koszulce. 👕\n\nDlatego wspólnie z Wydawnictwem Literackim stworzyliśmy kolekcję inspirowaną...",
  buttonText: "Odkryj teraz ➔",
  buttonLink: "#",
};

const defaultProducts = [
  { id: 1, name: "Nadwyraz", imageUrl: "https://nadwyraz.com/userdata/public/gfx/23739/skarpetki_frotte_klonom-rece-opadly_nadwyrazcom_2.webp", price: "133,00 zł", oldPrice: "222,00 zł", discount: "-40%", isPromo: true, link: "#" },
  { id: 2, name: "Nadwyraz", imageUrl: "https://nadwyraz.com/userdata/public/gfx/23720/koszulka_nie-jestem-zadna-swiatynia_nadwyrazcom_1.jpg", price: "201,00 zł", oldPrice: "402,00 zł", discount: "-50%", isPromo: true, link: "#" },
  { id: 3, name: "Nadwyraz", imageUrl: "https://nadwyraz.com/userdata/public/gfx/23725/koszulka_dyktando_nadwyrazcom_1.jpg", price: "165,00 zł", oldPrice: "", discount: "", isPromo: false, link: "#" },
  { id: 4, name: "Nadwyraz", imageUrl: "https://nadwyraz.com/userdata/public/gfx/23712/koszulka_klonom-rece-opadly_nadwyrazcom_3.jpg", price: "165,00 zł", oldPrice: "", discount: "", isPromo: false, link: "#" },
];

const defaultEdroneStyle = {
  blockId: "u_content_custom_bestsellers_4",
  colCount: "3",
  bgColor: "#ffffff",
  cardBg: "#ffffff",
  cardRadius: "0",
  colPadding: "8",
  colBorder: "0",
  colBorderColor: "#e8e4de",
  imgRadius: "0",
  imgPaddingBottom: "8",
  fontFamily: "'Playfair Display', serif",
  fontSize: "13",
  titleColor: "#1a1a1a",
  fontWeight: "400",
  letterSpacing: "0",
  textAlign: "center",
  lineHeight: "1.4",
  linkDecoration: "none",
  titlePadding: "10",
};

const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #e8e4de", borderRadius: "7px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", outline: "none", background: "#fafaf8" };

function Label({ children, color }) {
  return <label style={{ fontSize: "11px", color: color || "#888", display: "block", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</label>;
}

function CopyButton({ html }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(html); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: copied ? "#2d7a4f" : "#cc0000", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 20px", fontSize: "12px", fontFamily: "sans-serif", fontWeight: 600, cursor: "pointer" }}>
      {copied ? "✓ Skopiowano!" : "Kopiuj HTML"}
    </button>
  );
}

function Section({ title, number, html, previewTitle, previewWidth, children }) {
  const [showCode, setShowCode] = useState(false);
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: "14px", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0ece6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafaf8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#1a1a1a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>{number}</div>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "15px", fontWeight: 600 }}>{title}</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setShowCode(s => !s)} style={{ background: "transparent", border: "1px solid #ddd", color: "#888", borderRadius: "7px", padding: "6px 14px", fontSize: "11px", cursor: "pointer" }}>
            {showCode ? "Ukryj kod" : "Pokaż kod"}
          </button>
          <CopyButton html={html} />
        </div>
      </div>
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {children}
        <PreviewFrame html={html} title={previewTitle} width={previewWidth || 360} />
        {showCode && (
          <div style={{ background: "#1a1a1a", borderRadius: "8px", overflow: "hidden" }}>
            <pre style={{ margin: 0, padding: "14px", color: "#a8d8a8", fontSize: "11px", lineHeight: 1.6, overflow: "auto", maxHeight: "200px", fontFamily: "monospace" }}>{html}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ColorInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: "32px", height: "32px", border: "1px solid #e8e4de", borderRadius: "6px", cursor: "pointer", padding: "1px" }} />
      <input value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SliderInput({ value, onChange, min, max, step = 1, unit = "px" }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, cursor: "pointer" }} />
      <span style={{ fontSize: "12px", color: "#666", fontFamily: "monospace", minWidth: "40px", textAlign: "right" }}>{value}{unit}</span>
    </div>
  );
}

function StyleField({ label, children, flex = 1 }) {
  return (
    <div style={{ flex, minWidth: "120px" }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StyleRow({ children }) {
  return <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>{children}</div>;
}

function StyleGroup({ title, children }) {
  return (
    <div style={{ background: "#fafaf8", border: "1px solid #e8e4de", borderRadius: "10px", padding: "14px" }}>
      <div style={{ fontSize: "11px", color: "#888", fontFamily: "sans-serif", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>{title}</div>
      {children}
    </div>
  );
}

function ProductCard({ product, index, onChange }) {
  return (
    <div style={{ background: "#fafaf8", border: "1px solid #e8e4de", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: "#888" }}>Produkt {index + 1}</span>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <div onClick={() => onChange({ ...product, isPromo: !product.isPromo })} style={{ width: "34px", height: "18px", borderRadius: "9px", background: product.isPromo ? "#cc0000" : "#ddd", position: "relative", cursor: "pointer" }}>
            <div style={{ position: "absolute", top: "1px", left: product.isPromo ? "17px" : "1px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </div>
          <span style={{ fontSize: "11px", color: product.isPromo ? "#cc0000" : "#999", fontWeight: 600 }}>{product.isPromo ? "PROMO" : "Regularna"}</span>
        </label>
      </div>
      {product.imageUrl && <img src={product.imageUrl} alt="" style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "6px" }} />}
      {[
        { label: "URL zdjęcia", key: "imageUrl", placeholder: "https://..." },
        { label: "Nazwa", key: "name", placeholder: "Nadwyraz" },
        { label: "Link", key: "link", placeholder: "https://nadwyraz.com/..." },
        { label: "Cena", key: "price", placeholder: "133,00 zł" },
      ].map(field => (
        <div key={field.key}>
          <Label>{field.label}</Label>
          <input value={product[field.key]} onChange={e => onChange({ ...product, [field.key]: e.target.value })} placeholder={field.placeholder} style={inputStyle} />
        </div>
      ))}
      {product.isPromo && (
        <div style={{ display: "flex", gap: "8px" }}>
          {[{ label: "Stara cena", key: "oldPrice", placeholder: "222,00 zł" }, { label: "Rabat", key: "discount", placeholder: "-40%" }].map(field => (
            <div key={field.key} style={{ flex: 1 }}>
              <Label color="#cc0000">{field.label}</Label>
              <input value={product[field.key]} onChange={e => onChange({ ...product, [field.key]: e.target.value })} placeholder={field.placeholder} style={{ ...inputStyle, border: "1px solid #f5c0c0", background: "#fff8f8" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewsletterBuilder() {
  const [text, setText] = useState(defaultText);
  const [products, setProducts] = useState(defaultProducts);
  const [es, setEs] = useState(defaultEdroneStyle);
  const [showEdroneCode, setShowEdroneCode] = useState(false);

  const handleProductChange = useCallback((i, updated) => setProducts(prev => prev.map((p, idx) => idx === i ? updated : p)), []);
  const setStyle = useCallback((key, value) => setEs(prev => ({ ...prev, [key]: value })), []);

  const cssHtml = generateEdroneCSSOverride(es);
  const previewHtml = generateEdronePreviewHTML(es);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ee", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1a1a1a", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#fff", fontSize: "18px", fontFamily: "Georgia, serif", fontWeight: 700 }}>Nadwyraz</div>
          <div style={{ color: "#666", fontSize: "11px", fontFamily: "sans-serif" }}>Newsletter Builder</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="/" style={{ color: "#666", fontSize: "11px", fontFamily: "sans-serif", textDecoration: "none" }}>← Consensus Engine</a>
          <div style={{ fontSize: "12px", color: "#555", fontFamily: "sans-serif" }}>Każdy blok = osobny HTML → wklej do ESP</div>
        </div>
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* BLOK 1 */}
        <Section title="Blok tekstowy + przycisk" number="1" html={generateTextBlockHTML(text)} previewTitle="Blok tekstowy">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div><Label>Nagłówek</Label><input value={text.headline} onChange={e => setText({ ...text, headline: e.target.value })} style={inputStyle} /></div>
            <div><Label>Treść (pusta linia = odstęp)</Label><textarea value={text.body} onChange={e => setText({ ...text, body: e.target.value })} rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} /></div>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}><Label>Tekst przycisku</Label><input value={text.buttonText} onChange={e => setText({ ...text, buttonText: e.target.value })} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><Label>Link przycisku</Label><input value={text.buttonLink} onChange={e => setText({ ...text, buttonLink: e.target.value })} style={inputStyle} /></div>
            </div>
          </div>
        </Section>

        {/* BLOK 2 */}
        <Section title="Blok produktów (ręczny)" number="2" html={generateProductsHTML(products)} previewTitle="Blok produktów" previewWidth={720}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} onChange={updated => handleProductChange(i, updated)} />)}
          </div>
        </Section>

        {/* BLOK 3 — edrone CSS override */}
        <div style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0ece6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafaf8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#1a1a1a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>3</div>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "15px", fontWeight: 600 }}>Dynamiczne produkty edrone — styl</span>
              <span style={{ background: "#e8f4fd", color: "#0066cc", fontSize: "10px", fontFamily: "sans-serif", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", border: "1px solid #b8d4f0" }}>CSS override</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowEdroneCode(s => !s)} style={{ background: "transparent", border: "1px solid #ddd", color: "#888", borderRadius: "7px", padding: "6px 14px", fontSize: "11px", cursor: "pointer" }}>
                {showEdroneCode ? "Ukryj kod" : "Pokaż kod"}
              </button>
              <CopyButton html={cssHtml} />
            </div>
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Info */}
            <div style={{ background: "#f0f7ff", border: "1px solid #c8e0f8", borderRadius: "8px", padding: "12px 16px", fontSize: "12px", color: "#444", fontFamily: "sans-serif", lineHeight: 1.6 }}>
              <strong style={{ color: "#0066cc" }}>Jak używać:</strong> Kliknij <strong>Kopiuj HTML</strong> i wklej jako blok HTML <strong>przed</strong> blokiem dynamicznym w edrone. Twój CSS nadpisze ich domyślne style. Podgląd poniżej symuluje efekt.
            </div>

            {/* Kontrolki */}
            <StyleGroup title="ID bloku edrone">
              <div style={{ fontSize: "12px", color: "#666", fontFamily: "sans-serif", marginBottom: "8px", lineHeight: 1.6 }}>
                Otwórz źródło HTML w edrone, znajdź <code style={{ background: "#f0f0f0", padding: "1px 5px", borderRadius: "3px" }}>id="u_content_custom_bestsellers_X"</code> przy bloku dynamicznym i wklej tutaj. Dzięki temu nasz CSS będzie miał wyższy priorytet niż style edrone.
              </div>
              <StyleRow>
                <StyleField label="ID bloku (np. u_content_custom_bestsellers_4)" flex={1}>
                  <input
                    value={es.blockId}
                    onChange={e => setStyle("blockId", e.target.value)}
                    placeholder="u_content_custom_bestsellers_4"
                    style={{ ...inputStyle, fontFamily: "monospace", fontSize: "12px" }}
                  />
                </StyleField>
              </StyleRow>
            </StyleGroup>

            <StyleGroup title="Układ">
              <StyleRow>
                <StyleField label="Liczba kolumn" flex={1}>
                  <Select value={es.colCount} onChange={v => setStyle("colCount", v)} options={[
                    { value: "2", label: "2 kolumny" },
                    { value: "3", label: "3 kolumny" },
                    { value: "4", label: "4 kolumny" },
                  ]} />
                </StyleField>
                <StyleField label="Padding kolumny" flex={2}>
                  <SliderInput value={es.colPadding} onChange={v => setStyle("colPadding", v)} min={0} max={32} />
                </StyleField>
                <StyleField label="Separator (grubość)" flex={2}>
                  <SliderInput value={es.colBorder} onChange={v => setStyle("colBorder", v)} min={0} max={4} />
                </StyleField>
                <StyleField label="Kolor separatora" flex={2}>
                  <ColorInput value={es.colBorderColor} onChange={v => setStyle("colBorderColor", v)} />
                </StyleField>
              </StyleRow>
            </StyleGroup>

            <StyleGroup title="Tło i karta">
              <StyleRow>
                <StyleField label="Tło bloku" flex={2}>
                  <ColorInput value={es.bgColor} onChange={v => setStyle("bgColor", v)} />
                </StyleField>
                <StyleField label="Tło pod tytułem" flex={2}>
                  <ColorInput value={es.cardBg} onChange={v => setStyle("cardBg", v)} />
                </StyleField>
                <StyleField label="Zaokrąglenie karty" flex={2}>
                  <SliderInput value={es.cardRadius} onChange={v => setStyle("cardRadius", v)} min={0} max={20} />
                </StyleField>
              </StyleRow>
            </StyleGroup>

            <StyleGroup title="Zdjęcie">
              <StyleRow>
                <StyleField label="Zaokrąglenie zdjęcia" flex={2}>
                  <SliderInput value={es.imgRadius} onChange={v => setStyle("imgRadius", v)} min={0} max={20} />
                </StyleField>
                <StyleField label="Odstęp pod zdjęciem" flex={2}>
                  <SliderInput value={es.imgPaddingBottom} onChange={v => setStyle("imgPaddingBottom", v)} min={0} max={24} />
                </StyleField>
              </StyleRow>
            </StyleGroup>

            <StyleGroup title="Typografia tytułu">
              <StyleRow>
                <StyleField label="Font" flex={3}>
                  <Select value={es.fontFamily} onChange={v => setStyle("fontFamily", v)} options={[
                    { value: "'Playfair Display', serif", label: "Playfair Display" },
                    { value: "'Open Sans', sans-serif", label: "Open Sans" },
                    { value: "Georgia, serif", label: "Georgia" },
                    { value: "arial, helvetica, sans-serif", label: "Arial" },
                    { value: "'Times New Roman', serif", label: "Times New Roman" },
                  ]} />
                </StyleField>
                <StyleField label="Rozmiar" flex={2}>
                  <SliderInput value={es.fontSize} onChange={v => setStyle("fontSize", v)} min={10} max={20} />
                </StyleField>
                <StyleField label="Grubość" flex={2}>
                  <Select value={es.fontWeight} onChange={v => setStyle("fontWeight", v)} options={[
                    { value: "300", label: "Light" },
                    { value: "400", label: "Regular" },
                    { value: "600", label: "SemiBold" },
                    { value: "700", label: "Bold" },
                  ]} />
                </StyleField>
              </StyleRow>
              <StyleRow>
                <StyleField label="Kolor tytułu" flex={3}>
                  <ColorInput value={es.titleColor} onChange={v => setStyle("titleColor", v)} />
                </StyleField>
                <StyleField label="Wyrównanie" flex={2}>
                  <Select value={es.textAlign} onChange={v => setStyle("textAlign", v)} options={[
                    { value: "left", label: "Lewo" },
                    { value: "center", label: "Środek" },
                    { value: "right", label: "Prawo" },
                  ]} />
                </StyleField>
                <StyleField label="Letter spacing" flex={2}>
                  <SliderInput value={es.letterSpacing} onChange={v => setStyle("letterSpacing", v)} min={-1} max={5} step={0.5} />
                </StyleField>
                <StyleField label="Line height" flex={2}>
                  <SliderInput value={es.lineHeight} onChange={v => setStyle("lineHeight", v)} min={1} max={2.5} step={0.1} unit="" />
                </StyleField>
              </StyleRow>
              <StyleRow>
                <StyleField label="Padding tytułu" flex={2}>
                  <SliderInput value={es.titlePadding} onChange={v => setStyle("titlePadding", v)} min={0} max={24} />
                </StyleField>
                <StyleField label="Podkreślenie linku" flex={2}>
                  <Select value={es.linkDecoration} onChange={v => setStyle("linkDecoration", v)} options={[
                    { value: "none", label: "Brak" },
                    { value: "underline", label: "Podkreślony" },
                  ]} />
                </StyleField>
              </StyleRow>
            </StyleGroup>

            {/* Live preview */}
            <div style={{ border: "1px solid #e8e4de", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "#f5f2ee", borderBottom: "1px solid #e8e4de", fontSize: "11px", color: "#888", fontFamily: "sans-serif", display: "flex", justifyContent: "space-between" }}>
                <span>📧 Podgląd — symulacja edrone dynamic block</span>
                <span style={{ color: "#bbb" }}>720px</span>
              </div>
              <div style={{ padding: "16px", background: "#e8e4de", display: "flex", justifyContent: "center" }}>
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:16px;background:#fff;">${previewHtml}</body></html>`}
                  style={{ width: "720px", maxWidth: "100%", height: "340px", border: "none", display: "block", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                  title="edrone preview"
                />
              </div>
            </div>

            {showEdroneCode && (
              <div style={{ background: "#1a1a1a", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ padding: "8px 14px", background: "#111", borderBottom: "1px solid #333" }}>
                  <span style={{ color: "#666", fontSize: "11px", fontFamily: "monospace" }}>CSS override — wklej do edrone jako blok HTML przed blokiem dynamicznym</span>
                </div>
                <pre style={{ margin: 0, padding: "14px", color: "#a8d8a8", fontSize: "11px", lineHeight: 1.6, overflow: "auto", maxHeight: "300px", fontFamily: "monospace" }}>{cssHtml}</pre>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
