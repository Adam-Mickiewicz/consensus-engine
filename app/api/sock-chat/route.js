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
  "201 L": { hex: "#E8A870", name: "łososiowy" },
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
  "30225 D": { hex: "#E85870", name: "jasna fuksja" },
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

const SYSTEM_PROMPT = `Jesteś doświadczonym projektantem skarpetek dla Nadwyraz.com — polskiej marki tworzącej narracyjne, płaskie wzory skarpetek z przędzą LEGS.

Prowadzisz rozmowę z projektantem/klientem. Pomagasz wypracować brief kolekcji krok po kroku. Możesz iterować: zmieniać kolory, elementy, układ, styl na prośbę rozmówcy.

SPECYFIKACJA TECHNICZNA (zawsze obowiązuje):
- Wymiary: 168px szerokość × 480px wysokość (41-46) lub 168px × 435px (36-40)
- Maks. 6 kolorów, WYŁĄCZNIE z palety LEGS poniżej
- Styl: 100% płaska ilustracja 2D, zero gradientów, zero 3D
- Kontury: opcjonalne
- Wzór wypełnia całe płótno (maks. 1px margines)
- Lewa ≠ Prawa — zawsze dwie różne kompozycje

PALETA LEGS — TYLKO TE KOLORY:
${buildPaletteString()}

DNA NADWYRAZ:
- Lewa skarpetka: szeroka scena panoramiczna (pejzaż, miasto, ilustracja narracyjna)
- Prawa skarpetka: rozproszone ikony/motywy na jednolitym tle
- Mocne storytelling — każda kolekcja opowiada konkretną historię
- Typografia: nazwy miast, slogany, krótkie słowa wplecione w wzór
- Mocne jednolite tła bez wzorków

ZASADY PROWADZENIA ROZMOWY:
- Odpowiadaj po polsku, naturalnie i konkretnie
- Kiedy masz wystarczająco informacji — generuj pełny brief
- Możesz iterować na prośbę rozmówcy
- Bądź kreatywny ale trzymaj się tego co możliwe produkcyjnie

KIEDY GENERUJESZ BRIEF:
Najpierw napisz naturalny opis kolekcji (2-4 zdania). Następnie dodaj blok JSON między znacznikami:

<<<BRIEF_START>>>
{
  "collection_name": "2-3 słowa po polsku",
  "concept": "1-2 zdania po polsku",
  "left_sock": {
    "description": "szczegółowy opis sceny",
    "layout": "panoramic",
    "key_elements": ["el1", "el2", "el3"],
    "text_element": "tekst lub null",
    "background": { "legs_code": "KOD", "hex": "#HEX", "name": "nazwa" }
  },
  "right_sock": {
    "description": "szczegółowy opis sceny",
    "layout": "scattered",
    "key_elements": ["el1", "el2"],
    "text_element": "tekst lub null",
    "background": { "legs_code": "KOD", "hex": "#HEX", "name": "nazwa" }
  },
  "are_socks_different": true,
  "palette": [
    { "legs_code": "KOD", "hex": "#HEX", "name": "nazwa", "usage": "gdzie użyty" }
  ],
  "dalle_prompt_left": "VERTICAL PORTRAIT flat 2D textile pattern. Tall narrow 1:3 ratio. Pure 2D ONLY. NO isometric. NO 3D. NO perspective. NO gradients. NO anti-aliasing. Solid color fills. Pattern fills entire canvas edge to edge, zero margins. [SZCZEGÓŁOWY OPIS SCENY]. Background: #HEX. Max 6 flat colors.",
  "dalle_prompt_right": "VERTICAL PORTRAIT flat 2D textile pattern. Tall narrow 1:3 ratio. Pure 2D ONLY. NO isometric. NO 3D. NO perspective. NO gradients. NO anti-aliasing. Solid color fills. Pattern fills entire canvas edge to edge, zero margins. [SZCZEGÓŁOWY OPIS SCENY]. Background: #HEX. Max 6 flat colors.",
  "gemini_prompt_left": "Flat 2D textile sock pattern. Tall vertical 9:16. Fills entire canvas edge to edge, zero margins. Solid flat colors only. NO gradients. NO shading. NO 3D. Pixel-art bitmap style. [SZCZEGÓŁOWY OPIS SCENY]. Background: #HEX. Max 6 colors.",
  "gemini_prompt_right": "Flat 2D textile sock pattern. Tall vertical 9:16. Fills entire canvas edge to edge, zero margins. Solid flat colors only. NO gradients. NO shading. NO 3D. Pixel-art bitmap style. [SZCZEGÓŁOWY OPIS SCENY]. Background: #HEX. Max 6 colors.",
  "technical_spec": { "size_small": "168x435px", "size_large": "168x480px", "color_count": 5 },
  "designer_notes": "praktyczne uwagi dla grafika"
}
<<<BRIEF_END>>>`;

export const maxDuration = 60;

export async function POST(request) {
  const { messages } = await request.json();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = "";
        const anthropicStream = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages,
        });
        for await (const chunk of anthropicStream) {
          if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
            fullText += chunk.delta.text;
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: "delta", text: chunk.delta.text })}\n\n`
            ));
          }
        }
        const briefMatch = fullText.match(/<<<BRIEF_START>>>([\s\S]*?)<<<BRIEF_END>>>/);
        if (briefMatch) {
          try {
            const brief = JSON.parse(briefMatch[1].trim());
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: "brief", brief })}\n\n`
            ));
          } catch (e) { console.error("Brief parse error:", e.message); }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (e) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: "error", error: e.message })}\n\n`
        ));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
