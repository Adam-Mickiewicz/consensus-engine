import Anthropic from "@anthropic-ai/sdk";

const LEGS_PALETTE = {
  "2029/1530W": { hex: "#F5F5F2", name: "biały" },
  "114 L": { hex: "#F0EFEC", name: "off-white" },
  "0065/1005L": { hex: "#EAD4C6", name: "kremowy/skin" },
  "101 L": { hex: "#EDE8E0", name: "bardzo jasny krem" },
  "115 L": { hex: "#F0EDE0", name: "krem/masło" },
  "103 M": { hex: "#FFE04A", name: "jasny żółty" },
  "0006 L": { hex: "#F5D060", name: "jasny złoty" },
  "10179 M": { hex: "#F0B030", name: "złoto-żółty" },
  "10182 D": { hex: "#E8A020", name: "ciemne złoto" },
  "126 D": { hex: "#E8C000", name: "żółty złocisty" },
  "2012 KM": { hex: "#C87000", name: "musztarda" },
  "202 M": { hex: "#E07830", name: "pomarańczowy" },
  "201 L": { hex: "#E8A870", name: "łososiowy/brzoskwiniowy" },
  "259 L": { hex: "#D8704A", name: "łososiowy pomarańcz" },
  "6012 D": { hex: "#D05018", name: "ciemny pomarańcz" },
  "203 D": { hex: "#D04020", name: "pomarańczowo-czerwony" },
  "00001 D": { hex: "#CC0000", name: "klasyczna czerwień" },
  "0002 D": { hex: "#8B0000", name: "ciemna burgundia" },
  "30217 M": { hex: "#8B2020", name: "ciemna czerwień" },
  "6017 D": { hex: "#9A1820", name: "głęboka czerwień" },
  "30203 D": { hex: "#5A1018", name: "bardzo ciemna burgundia" },
  "0005 L": { hex: "#F0D0D8", name: "bardzo jasny róż" },
  "366 L": { hex: "#DDB0C0", name: "jasny różowy" },
  "303 L": { hex: "#B05070", name: "ciemniejszy różowy" },
  "368 M": { hex: "#921840", name: "ciemna malina" },
  "30205 D": { hex: "#A83050", name: "malinowy" },
  "403 M": { hex: "#D85070", name: "mocny różowy" },
  "401 D": { hex: "#CC3865", name: "fuksjowy" },
  "466 M": { hex: "#C04875", name: "magenta" },
  "30225 D": { hex: "#E85870", name: "jasna fuksja/koral" },
  "30669 D": { hex: "#E04050", name: "jaskrawa czerwień-różowy" },
  "4939 D": { hex: "#883B6A", name: "śliwkowy" },
  "438 D": { hex: "#712E57", name: "fioletowy" },
  "407 D": { hex: "#703146", name: "ciemna śliwka" },
  "4044 M": { hex: "#A698B8", name: "jasny liliowy" },
  "467 D": { hex: "#704E80", name: "fioletowy średni" },
  "408 D": { hex: "#575994", name: "niebieskofioletowy" },
  "406 D": { hex: "#413359", name: "ciemny fiolet" },
  "40031 D": { hex: "#3F2B58", name: "głęboki fiolet" },
  "416 D": { hex: "#3A1A50", name: "bardzo ciemny fiolet" },
  "703 L": { hex: "#79A2BE", name: "błękitny" },
  "704 M": { hex: "#4878A0", name: "morski niebieski" },
  "706 D": { hex: "#4870A8", name: "niebieski" },
  "707 D": { hex: "#3065A0", name: "ciemny niebieski" },
  "0786 KS": { hex: "#1E3154", name: "ciemny granat" },
  "2297 D": { hex: "#5878B0", name: "średni niebieski" },
  "4007 M": { hex: "#8898B8", name: "stalowobłękitny" },
  "2213 M": { hex: "#6DAFC3", name: "jasny cyan-niebieski" },
  "779 M": { hex: "#383945", name: "antracyt-granat" },
  "70348 D": { hex: "#242A3A", name: "prawie czarny granat" },
  "618 M": { hex: "#52B1C0", name: "turkusowy" },
  "602 M": { hex: "#069BBC", name: "jasny cyan" },
  "604 D": { hex: "#2A8BAD", name: "jasny teal" },
  "624 D": { hex: "#118294", name: "teal" },
  "605 KS": { hex: "#256E8A", name: "ciemny turkus" },
  "50401 KS": { hex: "#11897F", name: "butelkowa zieleń-teal" },
  "50396 KS": { hex: "#1D6564", name: "ciemna butelkowa teal" },
  "623 D": { hex: "#29464E", name: "bardzo ciemny teal" },
  "50064 M": { hex: "#C7C745", name: "jasna limonka" },
  "503 L": { hex: "#ACC483", name: "jasna zieleń" },
  "50057 D": { hex: "#5A915C", name: "zieleń trawna" },
  "50061 KS": { hex: "#378C3E", name: "żywa zieleń" },
  "507 D": { hex: "#4D6C46", name: "ciemna zieleń" },
  "50399 D": { hex: "#5D7849", name: "oliwkowa zieleń" },
  "558 KS": { hex: "#2F7957", name: "butelkowa zieleń" },
  "50400 KS": { hex: "#1F684B", name: "ciemna butelkowa zieleń" },
  "541 KS": { hex: "#1A622F", name: "bardzo ciemna butelkowa" },
  "903 L": { hex: "#A8B0B8", name: "jasny szary" },
  "904 M": { hex: "#909098", name: "średni szary" },
  "8006 M": { hex: "#606068", name: "ciemny szary" },
  "906 M": { hex: "#565962", name: "grafitowy" },
  "8008 D": { hex: "#2C2B31", name: "prawie czarny szary" },
  "806 M": { hex: "#907870", name: "brązowy jasny" },
  "808 D": { hex: "#534C47", name: "ciemny brązowo-szary" },
  "829 M": { hex: "#A85A40", name: "cegła" },
  "815 D": { hex: "#935E46", name: "orzechowy" },
  "838 D": { hex: "#54413F", name: "czekoladowy" },
  "2332 D": { hex: "#3C2D2E", name: "bardzo ciemny brąz" },
  "2999 D": { hex: "#0D0D0D", name: "czarny" },
  "9934 D": { hex: "#282A2E", name: "czarny grafitowy" },
};

function buildPaletteString() {
  const groups = {
    "BIELE/KREMOWE": ["2029/1530W","114 L","0065/1005L","101 L","115 L"],
    "ŻÓŁTE/ZŁOTE":  ["103 M","0006 L","10179 M","10182 D","126 D","2012 KM"],
    "POMARAŃCZOWE": ["202 M","201 L","259 L","6012 D","203 D"],
    "CZERWONE":     ["00001 D","0002 D","30217 M","6017 D","30203 D"],
    "RÓŻOWE/MALINA":["0005 L","366 L","303 L","368 M","30205 D","403 M","401 D","466 M","30225 D","30669 D"],
    "FIOLETOWE":    ["4939 D","438 D","407 D","4044 M","467 D","408 D","406 D","40031 D","416 D"],
    "NIEBIESKIE":   ["703 L","704 M","706 D","707 D","0786 KS","2297 D","4007 M","2213 M","779 M","70348 D"],
    "TURKUSOWE/TEAL":["618 M","602 M","604 D","624 D","605 KS","50401 KS","50396 KS","623 D"],
    "ZIELONE":      ["50064 M","503 L","50057 D","50061 KS","507 D","50399 D","558 KS","50400 KS","541 KS"],
    "SZARE":        ["903 L","904 M","8006 M","906 M","8008 D"],
    "BRĄZOWE":      ["806 M","808 D","829 M","815 D","838 D","2332 D"],
    "CZARNE":       ["2999 D","9934 D"],
  };
  return Object.entries(groups).map(([group, codes]) =>
    `${group}: ` + codes.filter(c => LEGS_PALETTE[c]).map(c =>
      `${c}=${LEGS_PALETTE[c].hex}(${LEGS_PALETTE[c].name})`
    ).join(", ")
  ).join("\n");
}

const SYSTEM_PROMPT = `You are a production sock pattern designer for Nadwyraz.com — a Polish brand known for bold, flat, narrative sock designs.

TECHNICAL PRODUCTION SPEC (mandatory):
- Canvas: 168px wide × 480px tall (sizes 41-46) or 168px wide × 435px tall (sizes 36-40)
- Colors: MAXIMUM 6 colors total, chosen EXCLUSIVELY from the LEGS yarn palette below
- Style: 100% flat 2D illustration, zero gradients, zero anti-aliasing, zero 3D
- Outlines: optional, only if fits the concept
- Fill: edge-to-edge, max 1px margin
- Left sock ≠ Right sock — always two different compositions

LEGS YARN PALETTE — USE ONLY THESE COLORS:
${buildPaletteString()}

NADWYRAZ DESIGN DNA:
- Left sock: wide panoramic scene (landscape, cityscape, full illustration)
- Right sock: scattered icons/motifs on solid background
- Bold storytelling — each collection tells a specific story
- Typography often embedded: city names, slogans, short words
- Strong solid background colors

DALL-E PROMPT RULES — always start with:
"VERTICAL PORTRAIT flat 2D textile pattern. Tall narrow 1:3 ratio. Pure 2D ONLY. NO isometric. NO 3D. NO perspective. NO gradients. NO anti-aliasing. Solid color fills. Pattern fills entire canvas edge to edge, zero margins."

GEMINI PROMPT RULES — always start with:
"Flat 2D textile sock pattern. Tall vertical 9:16. Fills entire canvas edge to edge, zero margins. Solid flat colors only. NO gradients. NO shading. NO 3D. Pixel-art bitmap style."

CRITICAL: User's description is the ONLY source for the theme. Never invent a different theme.

Respond ONLY in valid JSON, no markdown fences, no explanation, no text before or after the JSON object:
{
  "collection_name": "2-3 Polish words",
  "concept": "1-2 sentences in Polish",
  "left_sock": {
    "description": "detailed scene in Polish",
    "layout": "panoramic/scattered/zonal",
    "key_elements": ["el1", "el2", "el3"],
    "text_element": "text or null",
    "background": { "legs_code": "CODE", "hex": "#HEX", "name": "Polish name" }
  },
  "right_sock": {
    "description": "detailed scene in Polish",
    "layout": "panoramic/scattered/zonal",
    "key_elements": ["el1", "el2"],
    "text_element": "text or null",
    "background": { "legs_code": "CODE", "hex": "#HEX", "name": "Polish name" }
  },
  "are_socks_different": true,
  "palette": [
    { "legs_code": "CODE", "hex": "#HEX", "name": "Polish name", "usage": "where used" }
  ],
  "dalle_prompt_left": "...",
  "dalle_prompt_right": "...",
  "gemini_prompt_left": "...",
  "gemini_prompt_right": "...",
  "technical_spec": { "size_small": "168x435px", "size_large": "168x480px", "color_count": 5 },
  "designer_notes": "practical notes in Polish"
}`;

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { description, sockVariant, size, attachments } = await request.json();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const contentParts = [];
    contentParts.push({
      type: "text",
      text: `Zaprojektuj skarpetki na temat: "${description}"
Wariant: ${sockVariant === "different" ? "LEWA I PRAWA RÓŻNE" : sockVariant === "same" ? "IDENTYCZNE" : "AI decyduje"}
Rozmiary: ${size === "both" ? "oba (435px i 480px)" : size === "small" ? "36-40 (435px)" : "41-46 (480px)"}
Zaprojektuj DOKŁADNIE na ten temat. Nie zmieniaj tematu.`
    });

    if (attachments?.length > 0) {
      contentParts.push({ type: "text", text: "INSPIRACJE OD KLIENTA:" });
      for (const att of attachments) {
        if (att.type === "image") {
          contentParts.push({ type: "text", text: `Inspiracja: ${att.name}` });
          contentParts.push({ type: "image", source: { type: "base64", media_type: att.mediaType || "image/jpeg", data: att.base64 } });
        } else {
          contentParts.push({ type: "text", text: `${att.name}:\n${att.content}` });
        }
      }
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: contentParts }],
    });

    const raw = response.content.filter(b => b.type === "text").map(b => b.text).join("");
    
    // Loguj surową odpowiedź żeby zobaczyć co wraca
    console.log("RAW RESPONSE:", raw.slice(0, 500));

    let clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error(`Brak JSON w odpowiedzi. Otrzymano: ${raw.slice(0, 200)}`);
    }
    clean = clean.slice(start, end + 1);

    const parsed = JSON.parse(clean);
    return Response.json({ success: true, result: parsed });

  } catch (e) {
    console.error("sock-brief error:", e.message);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
