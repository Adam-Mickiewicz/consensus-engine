import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  try {
    const body = await request.text();
    const { provider, systemPrompt, userMessage, pdfBase64, useWebSearch } = JSON.parse(body);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let content;
    if (pdfBase64) {
      content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
        { type: "text", text: userMessage },
      ];
    } else {
      content = userMessage;
    }

    let rawText = "";
    let citations = [];

    if (useWebSearch) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      });
      rawText = response.content.filter(b => b.type === "text").map(b => b.text || "").join("");
    } else {
      const response = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      });
      rawText = response.content.filter(b => b.type === "text").map(b => b.text || "").join("");
    }

    // Agresywne czyszczenie
    let clean = rawText
      .replace(/\`\`\`json\s*/gi, "")
      .replace(/\`\`\`\s*/gi, "")
      .replace(/^[\s]*\`+/gm, "")
      .replace(/\`+[\s]*$/gm, "")
      .trim();

    // Znajdź pierwszy { i ostatni }
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
console.log("RAW RESPONSE:", clean.slice(0, 500));
    if (start === -1 || end === -1) {
      return Response.json({ success: false, error: "Model did not return valid JSON" }, { status: 500 });
    }

    const jsonText = clean.slice(start, end + 1);

    // Walidacja
    try {
      JSON.parse(jsonText);
    } catch (e) {
      return Response.json({ success: false, error: "Invalid JSON: " + e.message }, { status: 500 });
    }

    return Response.json({ success: true, text: jsonText, citations });

  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}


