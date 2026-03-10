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

function PreviewFrame({ html, title, width = 360 }) {
  const [mobile, setMobile] = React.useState(false);
  const mobileWidth = 375;
  const activeWidth = mobile ? mobileWidth : width;
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#e8e4de;font-family:sans-serif;}*{box-sizing:border-box;}.wrapper{max-width:${activeWidth}px;margin:0 auto;background:#fff;padding:16px;}</style></head><body><div class="wrapper">${html}</div></body></html>`;
  return (
    <div style={{ border: "1px solid #e8e4de", borderRadius: "10px", overflow: "hidden", background: "#e8e4de" }}>
      <div style={{ padding: "8px 14px", background: "#f5f2ee", borderBottom: "1px solid #e8e4de", fontSize: "11px", color: "#888", fontFamily: "sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>📧 Podgląd — {title}</span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ color: "#bbb", marginRight: 4 }}>{mobile ? `${mobileWidth}px` : `${width}px`}</span>
          <button onClick={() => setMobile(false)} style={{ background: mobile ? "transparent" : "#1a1a1a", color: mobile ? "#aaa" : "#fff", border: "1px solid #ddd", borderRadius: "5px", padding: "3px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "sans-serif" }}>🖥 Desktop</button>
          <button onClick={() => setMobile(true)} style={{ background: mobile ? "#1a1a1a" : "transparent", color: mobile ? "#fff" : "#aaa", border: "1px solid #ddd", borderRadius: "5px", padding: "3px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "sans-serif" }}>📱 Mobile</button>
        </div>
      </div>
      <div style={{ padding: "16px", background: "#e8e4de", display: "flex", justifyContent: "center" }}>
        <iframe
          srcDoc={fullHtml}
          style={{ width: `${activeWidth}px`, maxWidth: "100%", height: "400px", border: "none", display: "block", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          title={title}
        />
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
  const handleProductChange = useCallback((i, updated) => setProducts(prev => prev.map((p, idx) => idx === i ? updated : p)), []);

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

        <Section title="Blok tekstowy + przycisk" number="1" html={generateTextBlockHTML(text)} previewTitle="Blok tekstowy">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <Label>Nagłówek</Label>
              <input value={text.headline} onChange={e => setText({ ...text, headline: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <Label>Treść (pusta linia = odstęp)</Label>
              <textarea value={text.body} onChange={e => setText({ ...text, body: e.target.value })} rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}><Label>Tekst przycisku</Label><input value={text.buttonText} onChange={e => setText({ ...text, buttonText: e.target.value })} style={inputStyle} /></div>
              <div style={{ flex: 1 }}><Label>Link przycisku</Label><input value={text.buttonLink} onChange={e => setText({ ...text, buttonLink: e.target.value })} style={inputStyle} /></div>
            </div>
          </div>
        </Section>

        <Section title="Blok produktów" number="2" html={generateProductsHTML(products)} previewTitle="Blok produktów" previewWidth={720}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} onChange={updated => handleProductChange(i, updated)} />)}
          </div>
        </Section>

      </div>
    </div>
  );
}
