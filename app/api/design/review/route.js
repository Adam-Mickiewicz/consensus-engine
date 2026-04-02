import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const formData = await request.formData();
    const file = formData.get("file");
    const brief = formData.get("brief") || "";
    const brandRaw = formData.get("brand") || "{}";
    const brand = JSON.parse(brandRaw);

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type;

    // Brand context block
    const brandLines = [];
    if (brand.name) brandLines.push(`Marka: ${brand.name}`);
    if (brand.values) brandLines.push(`Wartości i filozofia: ${brand.values}`);
    if (brand.target_audience) brandLines.push(`Grupa docelowa: ${brand.target_audience}`);
    if (brand.aesthetics) brandLines.push(`Preferowana estetyka: ${brand.aesthetics}`);
    if (brand.avoid) brandLines.push(`Czego unikamy: ${brand.avoid}`);
    if (brand.notes) brandLines.push(`Dodatkowe uwagi: ${brand.notes}`);
    const brandContext = brandLines.length > 0
      ? `\n\nKONTEKST MARKI:\n${brandLines.join("\n")}\n\nOceniaj projekt przez pryzmat tej marki — czy pasuje do jej wartości, estetyki i grupy docelowej.`
      : "";

    // Library analysis notes
    const { data: libAnalysis } = await supabase
      .from("library_analysis")
      .select("analysis, item_count")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const libraryContext = libAnalysis?.analysis
      ? `\n\nNOTATKI Z BIBLIOTEKI PROJEKTÓW (${libAnalysis.item_count} przykładów):\n${libAnalysis.analysis}\n\nWykorzystaj te notatki jako punkt odniesienia przy ocenie.`
      : "";

    const systemPrompt = `You are an expert graphic design judge for Nadwyraz, a Polish design studio. Evaluate: typography, color palette, composition, target audience fit, overall quality.${brandContext}${libraryContext} Respond ONLY in valid JSON: score (0-100), verdict (string), strengths (array of 3 strings), weaknesses (array of 3 strings), recommendation (string), nadwyraz_fit (excellent|good|poor|not_suitable). All text in Polish.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Oceń ten projekt graficzny." + (brief ? " Kontekst: " + brief : "") }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const verdict = JSON.parse(clean);
    return Response.json({ success: true, verdict });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
