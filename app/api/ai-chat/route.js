import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  const { model, messages, briefContext, deepResearch, brandContextFilter } = await req.json();

  const { data: brand } = await supabase.from("brand_settings").select("*").limit(1).single();

  const f = brandContextFilter || {};
  const brandContext = brand ? [
    "=== KONTEKST MARKI (stały) ===",
    f.brand_description !== false && brand.brand_description ? `Opis marki: ${brand.brand_description}` : null,
    f.tone_of_voice !== false && brand.tone_of_voice ? `Tone of voice: ${brand.tone_of_voice}` : null,
    f.target_audiences !== false && (brand.target_audiences || []).length > 0 ? `Grupy docelowe: ${brand.target_audiences.join(" | ")}` : null,
    f.campaign_examples !== false && (brand.campaign_examples || []).length > 0 ? `Przykłady kampanii: ${brand.campaign_examples.map(e => `${e.title}: ${e.description}`).join(" | ")}` : null,
    f.reference_links !== false && (brand.reference_links || []).length > 0 ? `Linki do materiałów: ${brand.reference_links.map(l => `${l.note || l.url}: ${l.url}`).join(" | ")}` : null,
    f.uploaded_files !== false && (brand.uploaded_files || []).length > 0 ? `Pliki w repozytorium (tylko nazwy): ${brand.uploaded_files.map(u => u.name).join(", ")}` : null,
  ].filter(Boolean).join("\n") : "";

  const systemPrompt = `Jesteś ekspertem od marketingu e-commerce i strategii kampanii. Pomagasz zespołowi marketingowemu w budowaniu skutecznych akcji promocyjnych.
${brandContext}
=== KONTEKST BIEŻĄCEGO BRIEFU ===
${briefContext ? JSON.stringify(briefContext, null, 2) : "Brak briefu — rozmawiaj ogólnie o marketingu."}

Odpowiadaj po polsku. Bądź konkretny, praktyczny i kreatywny. Gdy oceniasz pomysły innych AI, zaznacz wyraźnie że to Twoja perspektywa. Bazuj na kontekście marki przy każdej odpowiedzi.`;

  try {
    const isClause = model.startsWith("claude");
    const isGemini = model.startsWith("gemini");
    const isOpenAI = model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3");

    if (isClause) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages: messages.map(m => ({
          role: m.role === "synthesis" ? "assistant" : m.role,
          content: (m.role === "assistant" && m.model && m.model !== model)
            ? `[Odpowiedź wygenerowana przez ${m.model}]:
${m.content}`
            : m.content
        })) }),
      });
      const data = await res.json();
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
      return NextResponse.json({ content: data.content[0].text, model });
    }

    if (isOpenAI) {
      // GPT-5.x używa Responses API
      const isGPT5 = model.startsWith("gpt-5");
      
      if (isGPT5) {
        const inputMessages = [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({
            role: m.role === "synthesis" ? "assistant" : m.role,
            content: (m.role === "assistant" && m.model && m.model !== model)
              ? `[Odpowiedź wygenerowana przez ${m.model}]:
${Array.isArray(m.content) ? m.content.map(c=>c.text||"").join("") : m.content}`
              : (Array.isArray(m.content) ? m.content : m.content)
          }))
        ];
        const body = {
          model,
          input: inputMessages,
          max_output_tokens: 1024,
        };
        if (deepResearch) body.tools = [{ type: "web_search_preview" }];

        const res = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.error) return NextResponse.json({ error: data.error.message || JSON.stringify(data.error) }, { status: 500 });

        // Responses API - próbuj różne struktury
        let text = "";
        if (data.output_text) {
          text = data.output_text;
        } else if (Array.isArray(data.output)) {
          for (const block of data.output) {
            if (block.type === "message" && Array.isArray(block.content)) {
              for (const c of block.content) {
                if (c.type === "output_text" && c.text) { text = c.text; break; }
                if (c.type === "text" && c.text) { text = c.text; break; }
              }
            }
            if (block.type === "text" && block.text) { text = block.text; break; }
            if (text) break;
          }
        } else if (data.choices?.[0]?.message?.content) {
          // fallback - może zwrócić Chat Completions format
          text = data.choices[0].message.content;
        }

        if (!text) {
          console.error("GPT-5 unexpected response:", JSON.stringify(data).slice(0, 500));
          return NextResponse.json({ error: "Pusta odpowiedź GPT-5. Struktura: " + JSON.stringify(Object.keys(data)) }, { status: 500 });
        }
        return NextResponse.json({ content: text, model });
      } else {
        // Stare modele GPT-4o etc - Chat Completions
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))],
            max_completion_tokens: 1024,
          }),
        });
        const data = await res.json();
        if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
        return NextResponse.json({ content: data.choices[0].message.content, model });
      }
    }

    if (isGemini) {
      const geminiBody = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map(m => {
          const isOtherModel = m.role === "assistant" && m.model && m.model !== model;
          const prefix = isOtherModel ? `[Odpowiedź wygenerowana przez ${m.model}]:
` : "";
          const parts = Array.isArray(m.content)
            ? m.content.map(p => p.type === "image" ? { inline_data: { mime_type: p.source.media_type, data: p.source.data } } : { text: (prefix || "") + (p.text||"") })
            : [{ text: prefix + (m.content || " ") }];
          return { role: m.role === "assistant" || m.role === "synthesis" ? "model" : "user", parts };
        }),
      };
      if (deepResearch) geminiBody.tools = [{ google_search: {} }];

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
      const data = await res.json();
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
      return NextResponse.json({ content: data.candidates[0].content.parts[0].text, model });
    }

    return NextResponse.json({ error: "Nieznany model" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
