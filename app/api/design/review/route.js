export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const brief = formData.get("brief") || "";

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type;

    const systemPrompt = "You are an expert graphic design judge for Nadwyraz, a Polish design studio. Evaluate: typography, color palette, composition, target audience fit, overall quality. Respond ONLY in valid JSON: score (0-100), verdict (string), strengths (array of 3 strings), weaknesses (array of 3 strings), recommendation (string), nadwyraz_fit (excellent|good|poor|not_suitable). All text in Polish.";

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
