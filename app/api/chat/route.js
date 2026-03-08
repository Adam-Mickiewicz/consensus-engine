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
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      });
      rawText = response.content.filter(b => b.type === "text").map(b => b.text || "").join("");
      response.content.forEach(block => {
        if (block.type === "text" && block.citations) {
          block.citations.forEach(c => {
            if (c.url && !citations.find(x => x.url === c.url))
              citations.push({ url: c.url, title: c.title || c.url });
          });
        }
      });
    } else {
      // Wymuszamy JSON przez system prompt zamiast prefill
      const response = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        system: systemPrompt + "\n\nCRITICAL: Your response must start with { and end with }. Output ONLY raw JSON, no markdown, no backticks, no explanation.",
        messages: [{ role: "user", content }],
      });
      rawText = response.content.filter(b => b.type === "text").map(b => b.text || "").join("");
    }

    // Agresywne czyszczenie
    let clean = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    // Znajdź pierwszy { i ostatni }
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    
    if (start === -1 || end === -1) {
      console.error("No JSON found in:", clean.slice(0, 200));
      return Response.json({ success: false, error: "Model did not return valid JSON" }, { status: 500 });
    }

    const jsonText = clean.slice(start, end + 1);

    // Walidacja JSON
    try {
      JSON.parse(jsonText);
    } catch (e) {
      console.error("Invalid JSON:", jsonText.slice(0, 200));
      return Response.json({ success: false, error: "Invalid JSON: " + e.message }, { status: 500 });
    }

    return Response.json({ success: true, text: jsonText, citations });

  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

Zapisz. Teraz potrzebujemy też **unikalnych linków** — to wymaga stworzenia nowego pliku `app/debate/[id]/page.js`. W Terminalu:
```
mkdir -p app/debate/\[id\]
touch "app/debate/[id]/page.js"