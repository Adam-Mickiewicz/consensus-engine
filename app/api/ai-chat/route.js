import { NextResponse } from "next/server";

export async function POST(req) {
  const { model, messages, briefContext } = await req.json();

  const systemPrompt = `Jesteś ekspertem od marketingu e-commerce i strategii kampanii. Pomagasz zespołowi Nadwyraz.com — polskiej marki produkującej skarpety z wzorami flat-design, dziane z przędzy LEGS.

Kontekst bieżącego briefu marketingowego:
${briefContext ? JSON.stringify(briefContext, null, 2) : "Brak briefu — rozmawiaj ogólnie o marketingu."}

Odpowiadaj po polsku. Bądź konkretny, praktyczny i kreatywny. Gdy oceniasz pomysły innych AI, zaznacz wyraźnie że to Twoja perspektywa.`;

  try {
    if (model === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
      return NextResponse.json({ content: data.content[0].text, model: "claude" });
    }

    if (model === "chatgpt") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "system", content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
      return NextResponse.json({ content: data.choices[0].message.content, model: "chatgpt" });
    }

    if (model === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        }),
      });
      const data = await res.json();
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
      return NextResponse.json({ content: data.candidates[0].content.parts[0].text, model: "gemini" });
    }

    return NextResponse.json({ error: "Nieznany model" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
