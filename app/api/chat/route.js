import Anthropic from "@anthropic-ai/sdk";

export async function POST(request) {
  try {
    const body = await request.text();
    const { provider, systemPrompt, userMessage, pdfBase64, useWebSearch, aiModel, openaiModel, geminiModel } = JSON.parse(body);

    let rawText = "";

    // OPENAI
    if (provider === "openai") {
      const model = openaiModel || "gpt-4o-mini";
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ];
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model, messages, ...(model.startsWith("gpt-5") ? { max_completion_tokens: 8000 } : { max_tokens: 2000 }) })
      });
      const data = await res.json();
      if (data.error) throw new Error("OpenAI: " + data.error.message);
      rawText = data.choices?.[0]?.message?.content || "";
      if (!rawText) throw new Error("OpenAI returned empty response");

    // GEMINI
    } else if (provider === "gemini") {
      const model = geminiModel || "gemini-2.5-flash";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userMessage }] }]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error("Gemini: " + data.error.message);
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // CLAUDE - streaming
    } else {
      const claudeModel = aiModel || "claude-haiku-4-5-20251001";
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

      const stream = await client.messages.stream({
        model: claudeModel,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      });

      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
          rawText += chunk.delta.text;
        }
      }
    }

    // Czyszczenie
    let clean = rawText
      .replace(/`{1,3}json\s*/gi, "")
      .replace(/`{1,3}\s*/gi, "")
      .trim();

    // Napraw niezescapowane newliny wewnątrz JSON stringów
    clean = clean.replace(/"((?:[^"\\]|\\.)*)"/gs, (match) => {
      return match.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
    });

    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");

    if (start === -1 || end === -1) {
      return Response.json({ success: false, error: "Model did not return valid JSON" }, { status: 500 });
    }

    const jsonText = clean.slice(start, end + 1);

    try {
      JSON.parse(jsonText);
    } catch (e) {
      return Response.json({ success: true, text: JSON.stringify({ proposed_solution: jsonText, confidence: 50 }), citations: [] });
    }

    return Response.json({ success: true, text: jsonText, citations: [] });

  } catch (error) {
    console.error("API Error:", provider, error.message, error.stack?.slice(0,200));
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
