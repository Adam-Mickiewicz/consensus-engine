import { NextResponse } from "next/server";

const FEED_URL = "https://cloud.appstore.mamezi.pl/feeds/shop2086e7a916aa828cd5910d21e8b0abab2662fea1/googleproductsearch-pl_PL.xml";

export async function GET() {
  try {
    const res = await fetch(FEED_URL, {
      headers: { "Accept": "application/xml, text/xml, */*" },
    });
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
    const xml = await res.text();
    // zwróć pierwsze 2000 znaków żeby zobaczyć strukturę
    return NextResponse.json({ preview: xml.substring(0, 2000) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
