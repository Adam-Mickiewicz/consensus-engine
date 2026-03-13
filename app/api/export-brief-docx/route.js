import { NextResponse } from "next/server";

const CHANNELS_META = {
  organic_social: "📱 Kanały własne (organic)",
  meta_ads: "🎯 Meta Ads",
  google_ads: "🔍 Google Ads",
  email: "📧 Email / Newsletter",
  slider_main: "🖥️ Slider strona główna",
  slider_category: "🗂️ Slider mini kategoria",
  popup: "💬 Pop-up grafika",
  listing_banner: "🏷️ Baner na listingu",
};

export async function POST(req) {
  const brief = await req.json();

  // Budujemy HTML który konwertujemy do DOCX po stronie klienta
  // Tu zwracamy JSON z danymi do generacji po stronie klienta
  return NextResponse.json({ brief, meta: CHANNELS_META });
}
