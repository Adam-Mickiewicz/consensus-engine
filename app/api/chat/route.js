import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  try {
    const body = await request.text();
    const { provider, systemPrompt, userMessage, pdfBase64, useWebSearch } = JSON.parse(body);

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

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
    } else {
      const response = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      });
      rawText = response.content.filter(b => b.type === "text").map(b => b.text || "").join("");
    }

    console.log("RAW:", rawText.slice(0, 300));

    const clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    const jsonText = start !== -1 && end !== -1 ? clean.slice(start, end + 1) : clean;

    console.log("JSON:", jsonText.slice(0, 300));

    return Response.json({ success: true, text: jsonText, citations });

  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}