import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SOCK_SYSTEM_PROMPT = `You are a specialist sock pattern designer for Nadwyraz.com, a Polish sock and accessories brand known for bold, illustrative, narrative-driven sock designs.

NADWYRAZ DESIGN DNA:
- Flat illustration style, bold outlines, no gradients
- Rich storytelling — each sock tells a scene or concept
- Max 5-6 solid colors per design (production constraint)
- Left and right sock are OFTEN different — left: wide scenic view, right: scattered icons on solid bg
- Typography often embedded (city names, words, slogans)
- Strong solid color backgrounds (sky blue, dark teal, orange, charcoal, red, yellow)
- Production format: bitmap, 168px wide x 480px tall (41-46) or 168px x 435px (36-40)

DALLE PROMPT RULES:
- Start: "VERTICAL PORTRAIT sock textile pattern. Tall narrow format (1:3 ratio). Pure 2D flat illustration, side view only, NO isometric, NO 3D perspective, NO gradients."
- Add: "Bold black outlines, solid color fills only. Pattern fills entire canvas edge to edge, no white margins."
- Describe scene, end with: "Max 5 colors. Background: [HEX]."

GEMINI PROMPT RULES:
- Start: "Flat 2D textile sock pattern, tall vertical 9:16 format, fills entire canvas edge to edge, bold black outlines, solid flat colors only, no gradients, no 3D."
- Describe scene, end with: "Max 6 colors, pixel-art bitmap aesthetic. Background: [HEX]."

CRITICAL: The user's description is THE ONLY SOURCE OF TRUTH for the theme. If user says "Fiat 126p" — design is about Fiat 126p. If user says "cats" — design is about cats. NEVER invent a different theme. The user's description is the PRIMARY brief. References show style only — never copy their theme.

Respond ONLY in valid JSON:
{
  "collection_name": "2-3 words",
  "concept": "1-2 sentences in Polish",
  "left_sock": { "description": "Polish", "background_color": "#HEX", "background_color_name": "Polish", "layout": "panoramic/scattered/zonal", "key_elements": [], "text_element": null },
  "right_sock": { "description": "Polish", "background_color": "#HEX", "background_color_name": "Polish", "layout": "panoramic/scattered/zonal", "key_elements": [], "text_element": null },
  "are_socks_different": true,
  "palette": [{"hex": "#HEX", "name": "Polish", "usage": "where"}],
  "dalle_prompt_left": "...",
  "dalle_prompt_right": "...",
  "gemini_prompt_left": "...",
  "gemini_prompt_right": "...",
  "technical_spec": {"size_small": "168x435px", "size_large": "168x480px", "color_count": 5},
  "designer_notes": "Polish"
}`;

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { description, sockVariant, size, attachments } = await request.json();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const contentParts = [];

    // 1. BRIEF UŻYTKOWNIKA — PIERWSZY, najważniejszy
    contentParts.push({ type: "text", text: `ZAPROJEKTUJ SKARPETKI DOKŁADNIE NA TEN TEMAT (nie zmieniaj tematu, nie interpretuj kreatywnie, trzymaj się tego co napisał użytkownik):\n"${description}"\nWariant: ${sockVariant === "different" ? "LEWA I PRAWA RÓŻNE" : sockVariant === "same" ? "IDENTYCZNE" : "AI decyduje"}\nRozmiary: ${size === "both" ? "oba" : size}` });

    // 2. Załączniki użytkownika
    if (attachments?.length > 0) {
      contentParts.push({ type: "text", text: "INSPIRACJE OD KLIENTA:" });
      for (const att of attachments) {
        if (att.type === "image") {
          contentParts.push({ type: "text", text: `Inspiracja wizualna: ${att.name}` });
          contentParts.push({ type: "image", source: { type: "base64", media_type: att.mediaType || "image/jpeg", data: att.base64 } });
        } else {
          contentParts.push({ type: "text", text: `${att.name}:\n${att.content}` });
        }
      }
    }

    // 3. Referencje STYLISTYCZNE — na końcu, żeby nie zdominowały tematu
    try {
      const { data: files } = await supabase.storage
        .from("sock-references")
        .list("", { limit: 100 });

      if (files && files.length > 0) {
        const imageFiles = files.filter(f => f.name && !f.name.startsWith("."));
        const pairMap = {};
        for (const f of imageFiles) {
          const nl = f.name.toLowerCase();
          const side = nl.includes("lewa") ? "left" : nl.includes("prawa") ? "right" : null;
          if (!side) continue;
          const base = nl.replace(/lewa|prawa/g, "X").replace(/[-_\s]+/g, "_");
          if (!pairMap[base]) pairMap[base] = { collection: f.name.split(/[-_ ]/)[0], left: null, right: null };
          pairMap[base][side] = f.name;
        }
        const pairs = Object.values(pairMap).filter(p => p.left && p.right);
        const selected = [];// DISABLED

        if (selected.length > 0) {
          contentParts.push({ type: "text", text: `REFERENCJE STYLISTYCZNE NADWYRAZ (${selected.length} pary) — użyj ich TYLKO jako wzorzec stylu, skali elementów i liczby kolorów. NIE kopiuj ich tematu:` });
          for (const pair of selected) {
            for (const [side, filename] of [["LEWA", pair.left], ["PRAWA", pair.right]]) {
              const { data } = await supabase.storage.from("sock-references").download(filename);
              if (!data) continue;
              const buf = Buffer.from(await data.arrayBuffer());
              const png = await sharp(buf).png().toBuffer();
              contentParts.push({ type: "text", text: `${pair.collection} ${side}:` });
              contentParts.push({ type: "image", source: { type: "base64", media_type: "image/png", data: png.toString("base64") } });
            }
          }
        }
      }
    } catch(e) {
      console.warn("Referencje niedostępne:", e.message);
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: SOCK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: contentParts }],
    });

    let rawText = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    let clean = rawText.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const start = clean.indexOf("{");
    if (start > 0) clean = clean.slice(start);

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch { const m = clean.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error("Nie udało się sparsować JSON"); }

    return Response.json({ success: true, result: parsed });

  } catch(e) {
    console.error("sock-brief error:", e.message);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
