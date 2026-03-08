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

      const response = await client.messages.create({
        model: claudeModel,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      });
      rawText = response.content.filter(b => b.type === "text").map(b => b.text).join("");
      console.log("CLAUDE RAW END:", rawText.slice(-300));
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
    if (start === -1) {
      return Response.json({ success: true, text: JSON.stringify({ proposed_solution: clean, confidence: 50 }), citations: [] });
    }

    let jsonText = clean.slice(start);

    // Próba 1: bezpośredni parse
    try {
      JSON.parse(jsonText);
      return Response.json({ success: true, text: jsonText, citations: [] });
    } catch(e) {}

    // Próba 2: urwany JSON - usun ostatnie niekompletne pole i zamknij
    try {
      let fixed = jsonText
        .replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, "")
        .replace(/,\s*"[^"]*"\s*:\s*$/, "")
        .replace(/,\s*$/, "")
        .trimEnd();
      if (!fixed.endsWith("}")) fixed += "}";
      JSON.parse(fixed);
      return Response.json({ success: true, text: fixed, citations: [] });
    } catch(e) {}

    // Próba 3: wyciagnij pola regexem
    const fields = {};
    const re1 = /"(\w+)"\s*:\s*"((?:[^"\]|\[\s\S])*)"/g;
    const re2 = /"(\w+)"\s*:\s*(\d+)/g;
    let m;
    while ((m = re1.exec(jsonText)) !== null) fields[m[1]] = m[2];
    while ((m = re2.exec(jsonText)) !== null) fields[m[1]] = parseInt(m[2]);
    if (Object.keys(fields).length > 0) {
      return Response.json({ success: true, text: JSON.stringify(fields), citations: [] });
    }

    return Response.json({ success: true, text: JSON.stringify({ proposed_solution: clean.slice(0, 3000), confidence: 50 }), citations: [] });

  } catch (error) {
    console.error("API Error:", provider, error.message, error.stack?.slice(0,200));
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
