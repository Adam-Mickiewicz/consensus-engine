// app/api/feed/route.js
import { NextResponse } from "next/server";

const FEED_URL = "https://cloud.appstore.mamezi.pl/feeds/shop2086e7a916aa828cd5910d21e8b0abab2662fea1/googleproductsearch-pl_PL.xml";

function extractText(xml, tag) {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdataMatch) return cdataMatch[1].trim();
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

function parseProducts(xml) {
  const items = xml.split(/<entry[\s>]/).slice(1);
  return items.map((item) => {
    const id = extractText(item, "g:id");
    const title = extractText(item, "title");
    const link = extractText(item, "link");
    const imageLink = extractText(item, "g:image_link");
    const price = extractText(item, "g:price");
    const salePrice = extractText(item, "g:sale_price");
    const availability = extractText(item, "g:availability") || "in_stock";
    const category = extractText(item, "g:product_type") || "";

    if (!title || !imageLink) return null;

    const formatPrice = (p) => {
      if (!p) return "";
      return p.replace(/\s*PLN\s*/i, " zł").replace(/\s*pln\s*/i, " zł").trim();
    };

    const finalPrice = formatPrice(salePrice || price);
    const basePrice = salePrice ? formatPrice(price) : "";
    const isPromo = !!(salePrice && salePrice !== price);

    let discount = "";
    if (isPromo && price && salePrice) {
      const base = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
      const sale = parseFloat(salePrice.replace(/[^\d.,]/g, "").replace(",", "."));
      if (base > 0 && sale > 0) {
        const pct = Math.round(((base - sale) / base) * 100);
        discount = `-${pct}%`;
      }
    }

    return {
      id,
      name: title,
      link,
      imageUrl: imageLink,
      price: finalPrice,
      oldPrice: basePrice,
      discount,
      isPromo,
      availability,
      category: category.split(">").pop().trim(),
    };
  }).filter(Boolean);
}

export async function GET() {
  try {
    const res = await fetch(FEED_URL, {
      next: { revalidate: 3600 },
      headers: { "Accept": "application/xml, text/xml, */*" },
    });
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
    const xml = await res.text();
    const products = parseProducts(xml);
    return NextResponse.json({ products, total: products.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
