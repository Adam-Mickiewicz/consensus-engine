"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import Nav from "../components/Nav";

function generateHeadingHTML(h) {
  const fontImport = h.fontFamily.includes("Playfair")
    ? `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">`
    : h.fontFamily.includes("DM Serif")
    ? `<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" rel="stylesheet">`
    : h.fontFamily.includes("Open Sans")
    ? `<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap" rel="stylesheet">`
    : "";
  const subtextHTML = h.subtext ? `\n<p style="font-family: ${h.fontFamily}; font-size: ${h.subtextFontSize}px; font-weight: ${h.subtextFontWeight}; color: ${h.subtextColor}; text-align: ${h.textAlign}; line-height: 1.5; padding: ${h.subtextMarginTop}px ${h.paddingH}px ${h.paddingBottom}px ${h.paddingH}px; margin: 0;">${h.subtext}</p>` : "";
  return `${fontImport}
<p style="font-family: ${h.fontFamily}; font-size: ${h.fontSize}px; font-weight: ${h.fontWeight}; color: ${h.color}; text-align: ${h.textAlign}; line-height: ${h.lineHeight}; letter-spacing: ${h.letterSpacing}px; padding: ${h.paddingTop}px ${h.paddingH}px 0px ${h.paddingH}px; margin: 0 0 ${h.marginBottom}px 0;">${h.text}</p>${subtextHTML}`;
}

const defaultHeading = {
  text: "Nowa kolekcja – Nadwyraz.com x Wydawnictwo Literackie 📚",
  subtext: "",
  subtextFontSize: 16,
  subtextFontWeight: "400",
  subtextColor: "#000000",
  subtextMarginTop: 8,
  fontFamily: "'Playfair Display', serif",
  fontSize: 28,
  fontWeight: "700",
  color: "#000000",
  textAlign: "center",
  lineHeight: 1.3,
  letterSpacing: 0,
  paddingTop: 16,
  paddingBottom: 16,
  paddingH: 24,
  marginBottom: 0,
};

function generateTextBlockHTML(text) {
  const bodyLines = text.body.split("\n").map(line =>
    line.trim() === ""
      ? `  <p style="margin: 0 0 4px 0;">&nbsp;</p>`
      : `  <p style="margin: 0 0 2px 0;">${line}</p>`
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
    const priceColor = p.isPromo ? "#cc0000" : "#000000";
    const promoLine = p.isPromo && p.oldPrice
      ? `<p style="margin:0;"><span style="font-family:'Open Sans',sans-serif;font-size:11px;color:#666;text-decoration:line-through;">${p.oldPrice}</span> <span style="font-family:'Open Sans',sans-serif;font-size:11px;color:#cc0000;font-weight:700;">${p.discount}</span></p>`
      : "";
    const name = p.name.length > 30 ? p.name.substring(0, 30) + '...' : p.name;
    const formatPrice = (pr) => pr ? pr.replace('.', ',') : pr;
    return `<table class="prod" border="0" cellpadding="0" cellspacing="0" width="150" align="left" style="width:150px; max-width:150px; display:inline-block; vertical-align:top; ${isLast ? '' : 'margin-right:13px;'}margin-bottom:8px;">
        <tr><td style="padding:0;">
          <a href="${p.link}"><img src="${p.imageUrl}" width="100%" style="display:block; max-width:100%; height:auto; border-radius:5px 5px 0 0;" alt=""></a>
          <div style="background:#ffffff; border-radius:0 0 5px 5px; padding:6px 6px 8px 6px;">
            <p style="font-family:'Playfair Display',serif; font-size:12px; color:#000; margin:0 0 4px 0; line-height:1.4;">${name}</p>
            <div style="min-height:48px;">
              <p style="font-family:'Open Sans',sans-serif; font-size:11px; font-weight:${p.isPromo ? '700' : '400'}; color:${priceColor}; margin:0 0 2px 0;">${formatPrice(p.price)}</p>${promoLine}
            </div>
          </div>
        </td></tr>
      </table>`;
  }).join('\n      ');
  return `<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&family=Playfair+Display:wght@400&display=swap" rel="stylesheet">
<style>
  @media screen and (max-width: 600px) { .prod { width: 50% !important; max-width: 50% !important; } }
</style>
<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" align="center" style="text-align:center;">
  <tr><td align="center" style="padding:0;text-align:center;">
      <!--[if (gte mso 9)|(IE)]><table width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td width="150" valign="top"><![endif]-->
<center>      ${productsHTML}</center>
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
  return `${fontImport}
<style>
  /* ── Nadwyraz edrone override ── */
  .e-row.e-stack, .edrone-box { background-color: ${s.bgColor} !important; }
  .e-col, .edrone-col { padding: ${s.colPadding}px !important; vertical-align: top !important; }
  .product-image { border-radius: ${s.imgRadius}px !important; padding-bottom: ${s.imgPaddingBottom}px !important; }
  .product-title { height: auto !important; overflow: visible !important; background-color: ${s.cardBg} !important; border-radius: 0 0 ${s.cardRadius}px ${s.cardRadius}px !important; padding: ${s.titlePadding}px !important; }
  .product-title p, .product-title p a { font-family: ${s.fontFamily} !important; font-size: ${s.fontSize}px !important; color: ${s.titleColor} !important; font-weight: ${s.fontWeight} !important; letter-spacing: ${s.letterSpacing}px !important; text-align: ${s.textAlign} !important; line-height: ${s.lineHeight} !important; text-decoration: ${s.linkDecoration} !important; }
  .e-col + .e-col { border-left: ${s.colBorder}px solid ${s.colBorderColor} !important; }
  @media only screen and (max-width: 620px) {
    .e-col { display: block !important; width: 100% !important; max-width: 100% !important; }
    .e-col + .e-col { border-left: none !important; border-top: ${s.colBorder}px solid ${s.colBorderColor} !important; }
  }
</style>`;
}

function generateEdronePreviewHTML(s) {
  const colCount = parseInt(s.colCount) || 3;
  const sampleProducts = [
    { title: "ŻE TĘ / kubek różowy z uchem", img: "https://nadwyraz.com/userdata/public/gfx/13746/Kubek-Ze-te-nadwyrazcom-1.jpg" },
    { title: "CZASEM PRZESADZAM / skarpety", img: "https://nadwyraz.com/userdata/public/gfx/10882/Skarpety_Czasem_przesadzam_nadwyrazcom_3.jpg" },
    { title: "CZASEM PRZESADZAM / torba bawełniana", img: "https://nadwyraz.com/userdata/public/gfx/10898/Torba_Czasem_przesadzam_5.jpg" },
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
      <a href="#"><img src="${col.img}" width="100%" style="display:block; border-radius:${s.imgRadius}px; padding-bottom:${s.imgPaddingBottom}px;" /></a>
      <div style="background:${s.cardBg}; border-radius:0 0 ${s.cardRadius}px ${s.cardRadius}px; padding:${s.titlePadding}px;">
        <p style="font-family:${s.fontFamily}; font-size:${s.fontSize}px; color:${s.titleColor}; font-weight:${s.fontWeight}; text-align:${s.textAlign}; line-height:${s.lineHeight}; margin:0;">${col.title}</p>
      </div>
    </td>`).join("")}
  </tr>
</table>`;
}

function PreviewFrame({ html, title, width = 360 }) {
  const [mobile, setMobile] = React.useState(false);
  const activeWidth = mobile ? 375 : width;
  const mobileStyle = mobile ? `<style>table.prod { width: 46% !important; max-width: 46% !important; margin-right: 2% !important; margin-bottom: 8px !important; } </style>` : "";
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#e8e4de;}*{box-sizing:border-box;}.wrapper{max-width:${activeWidth}px;margin:0 auto;background:#fff;padding:16px;}@media only screen and (max-width:400px){.prod{width:50% !important;max-width:50% !important;}}@media only screen and (max-width:400px){.prod{width:50% !important;max-width:50% !important;}}</style>${mobileStyle}</head><body><div class="wrapper">${html}</div></body></html>`;
  return (
    <div style={{ border: "1px solid #e8e4de", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", background: "#f5f2ee", borderBottom: "1px solid #e8e4de", fontSize: "11px", color: "#888", fontFamily: "sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>📧 Podgląd — {title}</span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ color: "#bbb", marginRight: 4 }}>{mobile ? "375px" : `${width}px`}</span>
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
  colCount: "3", bgColor: "#ffffff", cardBg: "#ffffff", cardRadius: "0",
  colPadding: "8", colBorder: "0", colBorderColor: "#e8e4de",
  imgRadius: "0", imgPaddingBottom: "8",
  fontFamily: "'Playfair Display', serif", fontSize: "13", titleColor: "#1a1a1a",
  fontWeight: "400", letterSpacing: "0", textAlign: "center",
  lineHeight: "1.4", linkDecoration: "none", titlePadding: "10",
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

// ─── BLOK 4 ──────────────────────────────────────────────────────────────────

function FeedProductTile({ product, selected, onToggle }) {
  return (
    <div onClick={onToggle} style={{
      border: selected ? "2px solid #1a1a1a" : "2px solid #e8e4de",
      borderRadius: "10px", overflow: "hidden", cursor: "pointer",
      background: selected ? "#f5f2ee" : "#fff",
      transition: "border-color 0.15s, background 0.15s",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: "7px", right: "7px", zIndex: 2,
        width: "20px", height: "20px", borderRadius: "50%",
        background: selected ? "#1a1a1a" : "rgba(255,255,255,0.92)",
        border: selected ? "2px solid #1a1a1a" : "2px solid #ccc",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "11px", color: "#fff", fontWeight: 700,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      }}>{selected ? "✓" : ""}</div>

      {product.isPromo && (
        <div style={{
          position: "absolute", top: "7px", left: "7px", zIndex: 2,
          background: "#cc0000", color: "#fff", fontSize: "9px", fontWeight: 700,
          padding: "2px 6px", borderRadius: "4px", fontFamily: "sans-serif",
        }}>PROMO</div>
      )}

      <img src={product.imageUrl} alt={product.name}
        style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
        onError={e => { e.target.style.background = "#f0ece6"; e.target.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="; }}
      />
      <div style={{ padding: "8px 9px 10px" }}>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "#1a1a1a", margin: "0 0 4px 0", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.name}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "sans-serif", fontSize: "12px", fontWeight: 700, color: product.isPromo ? "#cc0000" : "#1a1a1a" }}>{product.price}</span>
          {product.isPromo && product.oldPrice && (
            <span style={{ fontFamily: "sans-serif", fontSize: "10px", color: "#bbb", textDecoration: "line-through" }}>{product.oldPrice}</span>
          )}
        </div>
        {product.category && (
          <p style={{ fontFamily: "sans-serif", fontSize: "9px", color: "#bbb", margin: "3px 0 0 0", textTransform: "uppercase", letterSpacing: "0.4px" }}>{product.category}</p>
        )}
      </div>
    </div>
  );
}

function Block4FeedBrowser({ onAddToNewsletter }) {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPromo, setFilterPromo] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const PER_PAGE = 24;

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error(`Błąd ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAllProducts(data.products || []);
      setLoaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    return [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
  }, [allProducts]);

  const filtered = useMemo(() => {
    let list = allProducts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }
    if (filterCategory !== "all") list = list.filter(p => p.category === filterCategory);
    if (filterPromo) list = list.filter(p => p.isPromo);
    if (sortBy === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "pl"));
    if (sortBy === "price_asc") list = [...list].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    if (sortBy === "price_desc") list = [...list].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    if (sortBy === "promo") list = [...list].sort((a, b) => (b.isPromo ? 1 : 0) - (a.isPromo ? 1 : 0));
    return list;
  }, [allProducts, search, filterCategory, filterPromo, sortBy]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const selectedProducts = allProducts.filter(p => selected.has(p.id));

  useEffect(() => setPage(1), [search, filterCategory, filterPromo, sortBy]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (!selectedProducts.length) return;
    onAddToNewsletter(selectedProducts);
    setSelected(new Set());
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: "14px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0ece6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafaf8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#1a1a1a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>4</div>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "15px", fontWeight: 600 }}>Przeglądarka produktów</span>
          <span style={{ background: "#e8f8ee", color: "#2d7a4f", fontSize: "10px", fontFamily: "sans-serif", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", border: "1px solid #a8d8b8" }}>Live feed</span>
          {loaded && <span style={{ fontSize: "11px", color: "#aaa", fontFamily: "sans-serif" }}>{allProducts.length} produktów</span>}
        </div>
        {selected.size > 0 && (
          <button onClick={handleAdd} style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 18px", fontSize: "12px", fontFamily: "sans-serif", fontWeight: 700, cursor: "pointer" }}>
            ✓ Dodaj {selected.size} do Bloku 2
          </button>
        )}
      </div>

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Stan: nie załadowano */}
        {!loaded && !loading && !error && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🛍️</div>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: "#333", margin: "0 0 6px 0" }}>Pobierz produkty z Nadwyraz.com</p>
            <p style={{ fontFamily: "sans-serif", fontSize: "12px", color: "#999", margin: "0 0 24px 0" }}>Aktualny katalog z feedu — przeglądaj cały asortyment i wybierz produkty do newslettera</p>
            <button onClick={loadFeed} style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "10px", padding: "13px 36px", fontSize: "14px", fontFamily: "sans-serif", fontWeight: 700, cursor: "pointer" }}>
              Pobierz produkty →
            </button>
          </div>
        )}

        {/* Ładowanie */}
        {loading && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <p style={{ fontFamily: "sans-serif", fontSize: "13px", color: "#888" }}>Ładowanie feedu produktowego…</p>
          </div>
        )}

        {/* Błąd */}
        {error && (
          <div style={{ background: "#fff8f8", border: "1px solid #f5c0c0", borderRadius: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "sans-serif", fontSize: "12px", color: "#cc0000", margin: "0 0 3px 0", fontWeight: 700 }}>Błąd ładowania feedu</p>
              <p style={{ fontFamily: "sans-serif", fontSize: "11px", color: "#888", margin: 0 }}>{error}</p>
            </div>
            <button onClick={loadFeed} style={{ background: "#cc0000", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: "11px", cursor: "pointer" }}>Spróbuj ponownie</button>
          </div>
        )}

        {/* Załadowano */}
        {loaded && !loading && (
          <>
            {/* Filtry */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Szukaj po nazwie…" style={{ ...inputStyle, flex: "2", minWidth: "160px" }} />
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...inputStyle, flex: "1", minWidth: "140px" }}>
                <option value="all">Wszystkie kategorie</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle, flex: "1", minWidth: "140px" }}>
                <option value="default">Kolejność z feedu</option>
                <option value="name">Alfabetycznie</option>
                <option value="promo">Promocje pierwsze</option>
                <option value="price_asc">Cena: rosnąco</option>
                <option value="price_desc">Cena: malejąco</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontFamily: "sans-serif", fontSize: "12px", color: "#666", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={filterPromo} onChange={e => setFilterPromo(e.target.checked)} />
                Tylko promo
              </label>
              <button onClick={loadFeed} title="Odśwież feed" style={{ background: "transparent", border: "1px solid #ddd", color: "#888", borderRadius: "7px", padding: "7px 12px", fontSize: "12px", cursor: "pointer" }}>↻</button>
            </div>

            {/* Licznik */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#aaa", fontFamily: "sans-serif" }}>
              <span>{filtered.length} produktów{(search || filterCategory !== "all" || filterPromo) ? " (filtrowane)" : ""} · strona {page} z {totalPages}</span>
              {selected.size > 0 && (
                <span style={{ color: "#1a1a1a", fontWeight: 700 }}>
                  Zaznaczono: {selected.size}
                  <button onClick={() => setSelected(new Set())} style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "11px", marginLeft: "8px" }}>✕ wyczyść</button>
                </span>
              )}
            </div>

            {/* Siatka */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(138px, 1fr))", gap: "10px" }}>
              {paginated.map(product => (
                <FeedProductTile key={product.id} product={product} selected={selected.has(product.id)} onToggle={() => toggleSelect(product.id)} />
              ))}
            </div>

            {/* Paginacja */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "5px" }}>
                {[
                  { label: "«", action: () => setPage(1), disabled: page === 1 },
                  { label: "‹", action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action} disabled={btn.disabled} style={{ background: "none", border: "1px solid #ddd", borderRadius: "6px", padding: "5px 9px", fontSize: "11px", cursor: btn.disabled ? "default" : "pointer", color: btn.disabled ? "#ddd" : "#666" }}>{btn.label}</button>
                ))}
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                  return <button key={p} onClick={() => setPage(p)} style={{ background: p === page ? "#1a1a1a" : "none", color: p === page ? "#fff" : "#666", border: "1px solid #ddd", borderRadius: "6px", padding: "5px 9px", fontSize: "11px", cursor: "pointer", fontWeight: p === page ? 700 : 400 }}>{p}</button>;
                })}
                {[
                  { label: "›", action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages },
                  { label: "»", action: () => setPage(totalPages), disabled: page === totalPages },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action} disabled={btn.disabled} style={{ background: "none", border: "1px solid #ddd", borderRadius: "6px", padding: "5px 9px", fontSize: "11px", cursor: btn.disabled ? "default" : "pointer", color: btn.disabled ? "#ddd" : "#666" }}>{btn.label}</button>
                ))}
              </div>
            )}

            {/* Pasek wybranych */}
            {selectedProducts.length > 0 && (
              <div style={{ background: "#f5f2ee", border: "1px solid #e8e4de", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontFamily: "sans-serif", fontSize: "12px", fontWeight: 700, color: "#444" }}>Wybrane ({selectedProducts.length})</span>
                  <button onClick={handleAdd} style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 20px", fontSize: "12px", fontFamily: "sans-serif", fontWeight: 700, cursor: "pointer" }}>
                    ✓ Przenieś do Bloku 2 →
                  </button>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {selectedProducts.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "5px", background: "#fff", border: "1px solid #e0ddd8", borderRadius: "6px", padding: "3px 7px 3px 3px" }}>
                      <img src={p.imageUrl} alt="" style={{ width: "26px", height: "26px", objectFit: "cover", borderRadius: "3px" }} />
                      <span style={{ fontFamily: "sans-serif", fontSize: "11px", color: "#444", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      <button onClick={e => { e.stopPropagation(); toggleSelect(p.id); }} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "11px", lineHeight: 1, padding: "0 0 0 2px" }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


const defaultDuo = {
  left: { url: "", link: "", alt: "" },
  right: { url: "", link: "", alt: "" },
  gap: 12,
  borderRadius: 0,
  paddingTop: 16,
  paddingBottom: 16,
  paddingH: 0,
  bgColor: "#ffffff",
};

function generateDuoImageHTML(duo) {
  const gap = duo.gap;
  const radius = duo.borderRadius;
  const paddingTop = duo.paddingTop;
  const paddingBottom = duo.paddingBottom;
  const paddingH = duo.paddingH;
  const bgColor = duo.bgColor;
  const makeCell = (img) => {
    const imgTag = `<img src="${img.url || 'https://via.placeholder.com/300x200/f5f2ee/888888?text=Grafika'}" width="100%" style="display:block;width:100%;height:auto;border-radius:${radius}px;" alt="${img.alt || ''}" />`;
    const inner = img.link
      ? `<a href="${img.link}" style="display:block;text-decoration:none;">${imgTag}</a>`
      : imgTag;
    return `<td width="50%" valign="top" style="width:50%;padding:0 ${gap/2}px;">${inner}</td>`;
  };
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background:${bgColor};padding:${paddingTop}px ${paddingH}px ${paddingBottom}px ${paddingH}px;box-sizing:border-box;"><tr>${makeCell(duo.left)}${makeCell(duo.right)}</tr></table>`;
}

const SUPABASE_URL = "https://dayrmhsdpcgakbsfjkyp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRheXJtaHNkcGNnYWtic2Zqa3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MzMyMDIsImV4cCI6MjA4ODQwOTIwMn0.BpZe7KvxdwTQkWLpQtzBfD4VxOQZQ5yxwjPZXuW6dl4";

function ImageUploadField({ side, image, onChange }) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState(null);
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const ext = file.name.split(".").pop();
      const filename = `duo-${side}-${Date.now()}.${ext}`;
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/newsletter-images/${filename}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": file.type,
            "x-upsert": "true",
          },
          body: file,
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/newsletter-images/${filename}`;
      onChange({ ...image, url: publicUrl });
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "#fafaf8", border: "1px solid #e8e4de", borderRadius: "10px", padding: "12px" }}>
      <div style={{ fontSize: "11px", color: "#b8763a", fontFamily: "sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>
        {side === "left" ? "◧ Lewa grafika" : "◨ Prawa grafika"}
      </div>
      {image.url && (
        <img src={image.url} alt="" style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e4de" }} />
      )}
      <div>
        <Label>Wgraj z dysku</Label>
        <label style={{ display: "block", cursor: uploading ? "wait" : "pointer" }}>
          <div style={{ border: "2px dashed #e8e4de", borderRadius: "8px", padding: "10px", textAlign: "center", fontSize: "12px", color: uploading ? "#b8763a" : "#aaa", fontFamily: "sans-serif", background: uploading ? "#fdf6ee" : "#fff", transition: "all 0.15s" }}>
            {uploading ? "Uploading do Supabase…" : "Kliknij aby wybrać plik"}
          </div>
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        </label>
        {uploadError && <p style={{ fontSize: "11px", color: "#cc0000", margin: "4px 0 0 0", fontFamily: "sans-serif" }}>Blad: {uploadError}</p>}
      </div>
      <div>
        <Label>lub wklej URL</Label>
        <input value={image.url} onChange={e => onChange({ ...image, url: e.target.value })} placeholder="https://..." style={inputStyle} />
      </div>
      <div>
        <Label>Link (opcjonalnie)</Label>
        <input value={image.link} onChange={e => onChange({ ...image, link: e.target.value })} placeholder="https://nadwyraz.com/..." style={inputStyle} />
      </div>
      <div>
        <Label>Alt text</Label>
        <input value={image.alt} onChange={e => onChange({ ...image, alt: e.target.value })} placeholder="Opis grafiki" style={inputStyle} />
      </div>
    </div>
  );
}

function Block5DuoImages({ duo, setDuo }) {
  const setD = (key, value) => setDuo(prev => ({ ...prev, [key]: value }));
  return (
    <Section title="Dwie grafiki obok siebie" number="5" html={generateDuoImageHTML(duo)} previewTitle="Duo grafiki" previewWidth={720}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ background: "#fff8f8", border: "2px solid #cc0000", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#cc0000", fontFamily: "sans-serif", lineHeight: 1.6 }}>
          <strong>Uwaga:</strong> Wgrywanie zdjec tutaj sluzy wylacznie do podgladu. Docelowo grafiki musza zostac wgrane bezposrednio w narzedziu ESP (np. edrone), z ktorego wysylasz maila — tylko wtedy beda widoczne dla odbiorcow.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <ImageUploadField side="left" image={duo.left} onChange={img => setD("left", img)} />
          <ImageUploadField side="right" image={duo.right} onChange={img => setD("right", img)} />
        </div>
        <StyleGroup title="Odstepy i tlo">
          <StyleRow>
            <StyleField label="Odstep miedzy grafikami">
              <SliderInput value={duo.gap} onChange={v => setD("gap", Number(v))} min={0} max={40} />
            </StyleField>
            <StyleField label="Padding gora">
              <SliderInput value={duo.paddingTop} onChange={v => setD("paddingTop", Number(v))} min={0} max={80} />
            </StyleField>
          </StyleRow>
          <StyleRow>
            <StyleField label="Padding dol">
              <SliderInput value={duo.paddingBottom} onChange={v => setD("paddingBottom", Number(v))} min={0} max={80} />
            </StyleField>
            <StyleField label="Padding boki">
              <SliderInput value={duo.paddingH} onChange={v => setD("paddingH", Number(v))} min={0} max={60} />
            </StyleField>
          </StyleRow>
          <StyleRow>
            <StyleField label="Kolor tla">
              <ColorInput value={duo.bgColor} onChange={v => setD("bgColor", v)} />
            </StyleField>
          </StyleRow>
        </StyleGroup>
        <StyleGroup title="Grafiki">
          <StyleRow>
            <StyleField label="Zaokraglenie rogow">
              <SliderInput value={duo.borderRadius} onChange={v => setD("borderRadius", Number(v))} min={0} max={40} />
            </StyleField>
          </StyleRow>
        </StyleGroup>
      </div>
    </Section>
  );
}


// ─── BLOK 6 — BLOK PROMO ────────────────────────────────────────────────────

const defaultPromo = {
  badge: "+Promo",
  badgeShow: true,
  badgeBg: "#1a1a1a",
  badgeColor: "#ffffff",
  badgeRadius: 20,
  headline: "15% extra na początek wiosny 🌸",
  headlineFontFamily: "'Playfair Display', serif",
  headlineFontSize: 26,
  headlineFontWeight: "700",
  headlineColor: "#1a1a1a",
  subtitle: "Przy zamówieniu za min 200 zł",
  subtitleShow: true,
  subtitleFontFamily: "'Open Sans', sans-serif",
  subtitleFontSize: 15,
  subtitleColor: "#444444",
  promoCodeShow: true,
  promoCodeLabel: "z kodem*:",
  promoCode: "WIOSNA15",
  promoCodeFontSize: 22,
  promoCodeFontWeight: "700",
  promoCodeColor: "#1a1a1a",
  promoCodeLabelColor: "#888888",
  buttonShow: true,
  buttonText: "Skorzystaj →",
  buttonLink: "https://nadwyraz.com/",
  buttonColor: "#1a1a1a",
  buttonFontFamily: "'Open Sans', sans-serif",
  buttonFontSize: 14,
  menuShow: true,
  menuItems: [
    { label: "Koszulki", link: "https://nadwyraz.com/" },
    { label: "Skarpety", link: "https://nadwyraz.com/" },
    { label: "Bluzy", link: "https://nadwyraz.com/" },
    { label: "Akcesoria", link: "https://nadwyraz.com/" },
  ],
  menuColor: "#1a1a1a",
  menuFontSize: 13,
  menuBorderColor: "#e0dbd4",
  paddingTop: 24,
  paddingBottom: 24,
  paddingH: 24,
  bgColor: "#ffffff",
  disclaimerShow: false,
  disclaimer: "*Promocja ważna do odwołania. Nie łączy się z innymi ofertami.",
  disclaimerFontSize: 11,
  disclaimerColor: "#888888",
};

function generatePromoHTML(p) {
  const fontImports = [
    p.headlineFontFamily.includes("Playfair") ? "Playfair+Display:wght@400;700" : null,
    p.headlineFontFamily.includes("DM Serif") ? "DM+Serif+Display" : null,
    p.subtitleFontFamily.includes("Open Sans") || p.buttonFontFamily.includes("Open Sans") ? "Open+Sans:wght@400;700" : null,
  ].filter(Boolean);
  const fontLink = fontImports.length ? `<link href="https://fonts.googleapis.com/css2?family=${fontImports.join("&family=")}&display=swap" rel="stylesheet">` : "";

  const badgeHTML = p.badgeShow ? `<p style="display:inline-block;background:${p.badgeBg};color:${p.badgeColor};font-family:'Open Sans',sans-serif;font-size:11px;font-weight:700;padding:3px 10px;border-radius:${p.badgeRadius}px;margin:0 0 10px 0;">${p.badge}</p>` : "";

  const headlineHTML = `<p style="font-family:${p.headlineFontFamily};font-size:${p.headlineFontSize}px;font-weight:${p.headlineFontWeight};color:${p.headlineColor};margin:0 0 6px 0;line-height:1.3;">${p.headline}</p>`;

  const subtitleHTML = p.subtitleShow ? `<p style="font-family:${p.subtitleFontFamily};font-size:${p.subtitleFontSize}px;color:${p.subtitleColor};margin:0 0 14px 0;line-height:1.5;">${p.subtitle}</p>` : "";

  const promoHTML = p.promoCodeShow ? `<p style="font-family:'Open Sans',sans-serif;font-size:12px;color:${p.promoCodeLabelColor};margin:0 0 4px 0;">${p.promoCodeLabel}</p>
<p style="font-family:'Open Sans',sans-serif;font-size:${p.promoCodeFontSize}px;font-weight:${p.promoCodeFontWeight};color:${p.promoCodeColor};margin:0 0 16px 0;letter-spacing:1px;">${p.promoCode}</p>` : "";

  const buttonHTML = p.buttonShow ? `<p style="margin:0 0 0 0;"><a href="${p.buttonLink}" style="font-family:${p.buttonFontFamily};font-size:${p.buttonFontSize}px;font-weight:700;color:${p.buttonColor};text-decoration:none;">${p.buttonText}</a></p>` : "";

  const menuHTML = p.menuShow && p.menuItems.length ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;border-top:1px solid ${p.menuBorderColor};">
  ${p.menuItems.map((item, i) => `<tr>
    <td width="50%" style="padding:10px 0;border-bottom:1px solid ${p.menuBorderColor};${i % 2 === 1 ? `border-left:1px solid ${p.menuBorderColor};padding-left:16px;` : ""}">
      <a href="${item.link}" style="font-family:'Open Sans',sans-serif;font-size:${p.menuFontSize}px;color:${p.menuColor};text-decoration:none;font-weight:400;">${item.label} ›</a>
    </td>
    ${i % 2 === 0 && p.menuItems[i+1] ? "" : ""}`).filter((_, i) => i % 2 === 0).map((_, i) => {
      const left = p.menuItems[i*2];
      const right = p.menuItems[i*2+1];
      return `<tr>
    <td width="50%" style="padding:10px 0;border-bottom:1px solid ${p.menuBorderColor};"><a href="${left.link}" style="font-family:'Open Sans',sans-serif;font-size:${p.menuFontSize}px;color:${p.menuColor};text-decoration:none;">${left.label} ›</a></td>
    ${right ? `<td width="50%" style="padding:10px 0 10px 16px;border-bottom:1px solid ${p.menuBorderColor};border-left:1px solid ${p.menuBorderColor};"><a href="${right.link}" style="font-family:'Open Sans',sans-serif;font-size:${p.menuFontSize}px;color:${p.menuColor};text-decoration:none;">${right.label} ›</a></td>` : "<td></td>"}
  </tr>`}).join("\n")}
</table>` : "";

  const disclaimerHTML = p.disclaimerShow ? `<p style="font-family:'Open Sans',sans-serif;font-size:${p.disclaimerFontSize}px;color:${p.disclaimerColor};margin:16px 0 0 0;line-height:1.5;">${p.disclaimer}</p>` : "";
  return `${fontLink}
<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background:${p.bgColor};">
  <tr><td style="padding:${p.paddingTop}px ${p.paddingH}px ${p.paddingBottom}px ${p.paddingH}px;">
    ${badgeHTML}
    ${headlineHTML}
    ${subtitleHTML}
    ${promoHTML}
    ${buttonHTML}
    ${menuHTML}
    ${disclaimerHTML}
  </td></tr>
</table>`;
}

function MenuItemEditor({ items, onChange, inputStyle, t }) {
  const add = () => onChange([...items, { label: "Nowa kategoria", link: "https://nadwyraz.com/" }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, key, val) => onChange(items.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input value={item.label} onChange={e => update(i, "label", e.target.value)} placeholder="Nazwa" style={{ ...inputStyle, flex: 1 }} />
          <input value={item.link} onChange={e => update(i, "link", e.target.value)} placeholder="Link" style={{ ...inputStyle, flex: 2 }} />
          <button onClick={() => remove(i)} style={{ background: "none", border: "1px solid #f5c0c0", borderRadius: "6px", color: "#cc0000", cursor: "pointer", padding: "6px 10px", fontSize: "11px" }}>✕</button>
        </div>
      ))}
      <button onClick={add} style={{ background: "none", border: "1px solid #e8e4de", borderRadius: "6px", padding: "7px", fontSize: "11px", cursor: "pointer", color: "#888" }}>+ Dodaj pozycję menu</button>
    </div>
  );
}

function Block6Promo({ promo, setPromo }) {
  const set = (key, val) => setPromo(prev => ({ ...prev, [key]: val }));
  const html = generatePromoHTML(promo);

  return (
    <Section title="Blok promo" number="6" html={html} previewTitle="Blok promo" previewWidth={720}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* BADGE */}
        <StyleGroup title="Etykieta / Badge">
          <StyleRow>
            <StyleField label="Pokaż badge" flex={1}>
              <div onClick={() => set("badgeShow", !promo.badgeShow)} style={{ width: "34px", height: "18px", borderRadius: "9px", background: promo.badgeShow ? "#b8763a" : "#ddd", position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: "1px", left: promo.badgeShow ? "17px" : "1px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </StyleField>
          </StyleRow>
          {promo.badgeShow && <StyleRow>
            <StyleField label="Tekst badge" flex={3}><input value={promo.badge} onChange={e => set("badge", e.target.value)} style={inputStyle} /></StyleField>
            <StyleField label="Tło badge" flex={2}><ColorInput value={promo.badgeBg} onChange={v => set("badgeBg", v)} /></StyleField>
            <StyleField label="Kolor tekstu" flex={2}><ColorInput value={promo.badgeColor} onChange={v => set("badgeColor", v)} /></StyleField>
            <StyleField label="Zaokrąglenie" flex={2}><SliderInput value={promo.badgeRadius} onChange={v => set("badgeRadius", Number(v))} min={0} max={30} /></StyleField>
          </StyleRow>}
        </StyleGroup>

        {/* NAGŁÓWEK */}
        <StyleGroup title="Nagłówek">
          <StyleRow>
            <StyleField label="Tekst" flex={4}><input value={promo.headline} onChange={e => set("headline", e.target.value)} style={inputStyle} /></StyleField>
          </StyleRow>
          <StyleRow>
            <StyleField label="Font" flex={3}>
              <Select value={promo.headlineFontFamily} onChange={v => set("headlineFontFamily", v)} options={[
                { value: "'Playfair Display', serif", label: "Playfair Display" },
                { value: "'DM Serif Display', serif", label: "DM Serif Display" },
                { value: "'Open Sans', sans-serif", label: "Open Sans" },
                { value: "Georgia, serif", label: "Georgia" },
                { value: "arial, helvetica, sans-serif", label: "Arial" },
              ]} />
            </StyleField>
            <StyleField label="Rozmiar" flex={2}><SliderInput value={promo.headlineFontSize} onChange={v => set("headlineFontSize", Number(v))} min={14} max={48} /></StyleField>
            <StyleField label="Grubość" flex={2}>
              <Select value={promo.headlineFontWeight} onChange={v => set("headlineFontWeight", v)} options={[{ value: "400", label: "Regular" }, { value: "700", label: "Bold" }]} />
            </StyleField>
            <StyleField label="Kolor" flex={2}><ColorInput value={promo.headlineColor} onChange={v => set("headlineColor", v)} /></StyleField>
          </StyleRow>
        </StyleGroup>

        {/* PODTYTUŁ */}
        <StyleGroup title="Podtytuł">
          <StyleRow>
            <StyleField label="Pokaż" flex={1}>
              <div onClick={() => set("subtitleShow", !promo.subtitleShow)} style={{ width: "34px", height: "18px", borderRadius: "9px", background: promo.subtitleShow ? "#b8763a" : "#ddd", position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: "1px", left: promo.subtitleShow ? "17px" : "1px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </StyleField>
          </StyleRow>
          {promo.subtitleShow && <StyleRow>
            <StyleField label="Tekst" flex={4}><input value={promo.subtitle} onChange={e => set("subtitle", e.target.value)} style={inputStyle} /></StyleField>
            <StyleField label="Rozmiar" flex={2}><SliderInput value={promo.subtitleFontSize} onChange={v => set("subtitleFontSize", Number(v))} min={11} max={24} /></StyleField>
            <StyleField label="Kolor" flex={2}><ColorInput value={promo.subtitleColor} onChange={v => set("subtitleColor", v)} /></StyleField>
          </StyleRow>}
        </StyleGroup>

        {/* KOD PROMO */}
        <StyleGroup title="Kod promocyjny">
          <StyleRow>
            <StyleField label="Pokaż" flex={1}>
              <div onClick={() => set("promoCodeShow", !promo.promoCodeShow)} style={{ width: "34px", height: "18px", borderRadius: "9px", background: promo.promoCodeShow ? "#b8763a" : "#ddd", position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: "1px", left: promo.promoCodeShow ? "17px" : "1px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </StyleField>
          </StyleRow>
          {promo.promoCodeShow && <>
            <StyleRow>
              <StyleField label="Label przed kodem" flex={3}><input value={promo.promoCodeLabel} onChange={e => set("promoCodeLabel", e.target.value)} style={inputStyle} /></StyleField>
              <StyleField label="Kolor labela" flex={2}><ColorInput value={promo.promoCodeLabelColor} onChange={v => set("promoCodeLabelColor", v)} /></StyleField>
            </StyleRow>
            <StyleRow>
              <StyleField label="Kod" flex={3}><input value={promo.promoCode} onChange={e => set("promoCode", e.target.value)} style={inputStyle} /></StyleField>
              <StyleField label="Rozmiar" flex={2}><SliderInput value={promo.promoCodeFontSize} onChange={v => set("promoCodeFontSize", Number(v))} min={14} max={36} /></StyleField>
              <StyleField label="Kolor" flex={2}><ColorInput value={promo.promoCodeColor} onChange={v => set("promoCodeColor", v)} /></StyleField>
            </StyleRow>
          </>}
        </StyleGroup>

        {/* PRZYCISK */}
        <StyleGroup title="Przycisk / Link">
          <StyleRow>
            <StyleField label="Pokaż" flex={1}>
              <div onClick={() => set("buttonShow", !promo.buttonShow)} style={{ width: "34px", height: "18px", borderRadius: "9px", background: promo.buttonShow ? "#b8763a" : "#ddd", position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: "1px", left: promo.buttonShow ? "17px" : "1px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </StyleField>
          </StyleRow>
          {promo.buttonShow && <StyleRow>
            <StyleField label="Tekst" flex={3}><input value={promo.buttonText} onChange={e => set("buttonText", e.target.value)} style={inputStyle} /></StyleField>
            <StyleField label="Link" flex={3}><input value={promo.buttonLink} onChange={e => set("buttonLink", e.target.value)} style={inputStyle} /></StyleField>
            <StyleField label="Kolor" flex={2}><ColorInput value={promo.buttonColor} onChange={v => set("buttonColor", v)} /></StyleField>
          </StyleRow>}
        </StyleGroup>

        {/* MENU */}
        <StyleGroup title="Menu kategorii">
          <StyleRow>
            <StyleField label="Pokaż menu" flex={1}>
              <div onClick={() => set("menuShow", !promo.menuShow)} style={{ width: "34px", height: "18px", borderRadius: "9px", background: promo.menuShow ? "#b8763a" : "#ddd", position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: "1px", left: promo.menuShow ? "17px" : "1px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </StyleField>
            <StyleField label="Kolor tekstu" flex={2}><ColorInput value={promo.menuColor} onChange={v => set("menuColor", v)} /></StyleField>
            <StyleField label="Kolor linii" flex={2}><ColorInput value={promo.menuBorderColor} onChange={v => set("menuBorderColor", v)} /></StyleField>
            <StyleField label="Rozmiar" flex={2}><SliderInput value={promo.menuFontSize} onChange={v => set("menuFontSize", Number(v))} min={10} max={18} /></StyleField>
          </StyleRow>
          {promo.menuShow && <MenuItemEditor items={promo.menuItems} onChange={v => set("menuItems", v)} inputStyle={inputStyle} />}
        </StyleGroup>

        {/* DISCLAIMER */}
        <StyleGroup title="Disclaimer">
          <StyleRow>
            <StyleField label="Pokaż disclaimer" flex={1}>
              <div onClick={() => set("disclaimerShow", !promo.disclaimerShow)} style={{ width: "34px", height: "18px", borderRadius: "9px", background: promo.disclaimerShow ? "#b8763a" : "#ddd", position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: "1px", left: promo.disclaimerShow ? "17px" : "1px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </StyleField>
          </StyleRow>
          {promo.disclaimerShow && <>
            <StyleRow>
              <StyleField label="Treść" flex={4}><textarea value={promo.disclaimer} onChange={e => set("disclaimer", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} /></StyleField>
            </StyleRow>
            <StyleRow>
              <StyleField label="Rozmiar" flex={2}><SliderInput value={promo.disclaimerFontSize} onChange={v => set("disclaimerFontSize", Number(v))} min={9} max={16} /></StyleField>
              <StyleField label="Kolor" flex={2}><ColorInput value={promo.disclaimerColor} onChange={v => set("disclaimerColor", v)} /></StyleField>
            </StyleRow>
          </>}
        </StyleGroup>

        {/* PADDING */}
        <StyleGroup title="Odstępy">
          <StyleRow>
            <StyleField label="Padding góra"><SliderInput value={promo.paddingTop} onChange={v => set("paddingTop", Number(v))} min={0} max={80} /></StyleField>
            <StyleField label="Padding dół"><SliderInput value={promo.paddingBottom} onChange={v => set("paddingBottom", Number(v))} min={0} max={80} /></StyleField>
            <StyleField label="Padding boki"><SliderInput value={promo.paddingH} onChange={v => set("paddingH", Number(v))} min={0} max={60} /></StyleField>
          </StyleRow>
        </StyleGroup>

      </div>
    </Section>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function NewsletterBuilder() {
  const [heading, setHeading] = useState(defaultHeading);
  const [text, setText] = useState(defaultText);
  const [products, setProducts] = useState(defaultProducts);

  const [duo, setDuo] = useState(defaultDuo);
  const [promo, setPromo] = useState(defaultPromo);
  const [activeBlock, setActiveBlock] = useState("0");
  const setH = useCallback((key, value) => setHeading(prev => ({ ...prev, [key]: value })), []);
  const handleProductChange = useCallback((i, updated) => setProducts(prev => prev.map((p, idx) => idx === i ? updated : p)), []);

  const handleAddFromFeed = useCallback((feedProducts) => {
    setProducts(feedProducts.map((fp, i) => ({
      id: Date.now() + i,
      name: fp.name,
      imageUrl: fp.imageUrl,
      price: fp.price,
      oldPrice: fp.oldPrice || "",
      discount: fp.discount || "",
      isPromo: fp.isPromo,
      link: fp.link,
    })));
    setTimeout(() => document.getElementById("blok2")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);


  return (
    <>
    <Nav current="/newsletter-builder" />
    <div style={{ minHeight: "100vh", background: "#f5f2ee", fontFamily: "var(--font-open-sans), system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid #e8e4de", background: "#f5f2ee" }}>
        <h1 style={{ fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", fontSize: 28, fontWeight: 400, color: "#1a1814", margin: "0 0 4px", lineHeight: 1.2 }}>📧 Newsletter Builder</h1>
        <p style={{ fontSize: 13, color: "#7a7570", margin: 0, fontFamily: "var(--font-open-sans), system-ui, sans-serif" }}>Buduj emaile blok po bloku — Gmail-safe HTML gotowy do wklejenia w ESP.</p>
      </div>
      <div style={{ display: "flex", flex: 1 }}>

      {/* SIDEBAR */}
      <div style={{ width: 180, minWidth: 180, background: "#ffffff", borderRight: "1px solid #e0dbd4", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 0, height: "100vh", overflowY: "auto", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
        <div style={{ fontSize: 10, color: "#9a9590", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>Bloki</div>
        {[
          { id: "0", label: "Nagłówek" },
          { id: "1", label: "Blok tekstowy" },
          { id: "2", label: "Produkty" },
          { id: "5", label: "Duo grafiki" },
          { id: "6", label: "Blok promo" },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveBlock(item.id)}
            style={{ display: "block", width: "100%", textAlign: "left", background: activeBlock === item.id ? "#b8763a14" : "none", border: activeBlock === item.id ? "1px solid #b8763a40" : "1px solid transparent", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontFamily: "inherit", color: activeBlock === item.id ? "#b8763a" : "#7a7570", fontSize: 12, fontWeight: activeBlock === item.id ? 600 : 400 }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }}>

        {activeBlock === "0" && <Section title="Nagłówek" number="0" html={generateHeadingHTML(heading)} previewTitle="Nagłówek" previewWidth={720}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div><Label>Tekst nagłówka</Label><input value={heading.text} onChange={e => setH("text", e.target.value)} style={inputStyle} /></div>
            <div><Label>Copy pod nagłówkiem (opcjonalne)</Label><input value={heading.subtext} onChange={e => setH("subtext", e.target.value)} style={inputStyle} placeholder="np. Odkryj wyjątkowe produkty..." /></div>
            {heading.subtext && <StyleRow>
              <StyleField label="Rozmiar copy" flex={2}><SliderInput value={heading.subtextFontSize} onChange={v => setH("subtextFontSize", v)} min={10} max={30} /></StyleField>
              <StyleField label="Grubość copy" flex={2}>
                <Select value={heading.subtextFontWeight} onChange={v => setH("subtextFontWeight", v)} options={[{ value: "300", label: "Light" }, { value: "400", label: "Regular" }, { value: "700", label: "Bold" }]} />
              </StyleField>
              <StyleField label="Kolor copy" flex={2}><ColorInput value={heading.subtextColor} onChange={v => setH("subtextColor", v)} /></StyleField>
              <StyleField label="Odstęp od nagłówka" flex={2}><SliderInput value={heading.subtextMarginTop} onChange={v => setH("subtextMarginTop", v)} min={0} max={40} /></StyleField>
            </StyleRow>}
            <StyleRow>
              <StyleField label="Font" flex={3}>
                <Select value={heading.fontFamily} onChange={v => setH("fontFamily", v)} options={[
                  { value: "'Playfair Display', serif", label: "Playfair Display" },
                  { value: "'DM Serif Display', serif", label: "DM Serif Display" },
                  { value: "'Open Sans', sans-serif", label: "Open Sans" },
                  { value: "Georgia, serif", label: "Georgia" },
                  { value: "arial, helvetica, sans-serif", label: "Arial" },
                ]} />
              </StyleField>
              <StyleField label="Rozmiar" flex={2}><SliderInput value={heading.fontSize} onChange={v => setH("fontSize", v)} min={14} max={60} /></StyleField>
              <StyleField label="Grubość" flex={2}>
                <Select value={heading.fontWeight} onChange={v => setH("fontWeight", v)} options={[{ value: "300", label: "Light" }, { value: "400", label: "Regular" }, { value: "700", label: "Bold" }]} />
              </StyleField>
            </StyleRow>
            <StyleRow>
              <StyleField label="Kolor" flex={2}><ColorInput value={heading.color} onChange={v => setH("color", v)} /></StyleField>
              <StyleField label="Wyrównanie" flex={2}>
                <Select value={heading.textAlign} onChange={v => setH("textAlign", v)} options={[{ value: "left", label: "Lewo" }, { value: "center", label: "Środek" }, { value: "right", label: "Prawo" }]} />
              </StyleField>
              <StyleField label="Letter spacing" flex={2}><SliderInput value={heading.letterSpacing} onChange={v => setH("letterSpacing", v)} min={-2} max={10} step={0.5} /></StyleField>
              <StyleField label="Line height" flex={2}><SliderInput value={heading.lineHeight} onChange={v => setH("lineHeight", v)} min={1} max={3} step={0.1} unit="" /></StyleField>
            </StyleRow>
            <StyleRow>
              <StyleField label="Padding góra" flex={2}><SliderInput value={heading.paddingTop} onChange={v => setH("paddingTop", v)} min={0} max={60} /></StyleField>
              <StyleField label="Padding dół" flex={2}><SliderInput value={heading.paddingBottom} onChange={v => setH("paddingBottom", v)} min={0} max={60} /></StyleField>
              <StyleField label="Padding boki" flex={2}><SliderInput value={heading.paddingH} onChange={v => setH("paddingH", v)} min={0} max={60} /></StyleField>
              <StyleField label="Margin dół" flex={2}><SliderInput value={heading.marginBottom} onChange={v => setH("marginBottom", v)} min={-40} max={40} /></StyleField>
            </StyleRow>
          </div>
        </Section>}

        {activeBlock === "1" && <Section title="Blok tekstowy + przycisk" number="1" html={generateTextBlockHTML(text)} previewTitle="Blok tekstowy">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div><Label>Nagłówek</Label><input value={text.headline} onChange={e => setText({ ...text, headline: e.target.value })} style={inputStyle} /></div>
            <div><Label>Treść (pusta linia = odstęp)</Label><textarea value={text.body} onChange={e => setText({ ...text, body: e.target.value })} rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} /></div>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}><Label>Tekst przycisku</Label><input value={text.buttonText} onChange={e => setText({ ...text, buttonText: e.target.value })} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><Label>Link przycisku</Label><input value={text.buttonLink} onChange={e => setText({ ...text, buttonLink: e.target.value })} style={inputStyle} /></div>
            </div>
          </div>
        </Section>}

        {activeBlock === "2" && (
          <>
            <Block4FeedBrowser onAddToNewsletter={handleAddFromFeed} />
            <div id="blok2">
              <Section title="Blok produktów (ręczny)" number="2" html={generateProductsHTML(products)} previewTitle="Blok produktów" previewWidth={720}>
                <div style={{ background: "#f0f7ff", border: "1px solid #c8e0f8", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#555", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                  💡 Wybierz produkty w Bloku 4 powyżej — trafią tutaj automatycznie. Możesz też edytować ręcznie.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} onChange={updated => handleProductChange(i, updated)} />)}
                </div>
              </Section>
            </div>
          </>
        )}

        {activeBlock === "5" && <Block5DuoImages duo={duo} setDuo={setDuo} />}
        {activeBlock === "6" && <Block6Promo promo={promo} setPromo={setPromo} />}

      </div>
      </div>
    </div>
    </>
  );
}
