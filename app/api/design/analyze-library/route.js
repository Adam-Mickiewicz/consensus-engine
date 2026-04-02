import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: items, error } = await supabase
      .from("design_library")
      .select("title, description, category, product_type, target_audience, style_tags")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    if (!items || items.length === 0) {
      return Response.json({ success: false, error: "Biblioteka jest pusta" }, { status: 400 });
    }

    const goodItems = items.filter(i => i.category === "good");
    const badItems = items.filter(i => i.category === "bad");

    function formatItem(item) {
      const parts = [`- "${item.title}"`];
      if (item.product_type) parts.push(`typ: ${item.product_type}`);
      if (item.target_audience) parts.push(`odbiorca: ${item.target_audience}`);
      if (Array.isArray(item.style_tags) && item.style_tags.length > 0) parts.push(`styl: ${item.style_tags.join(", ")}`);
      if (item.description) parts.push(`opis: ${item.description}`);
      return parts.join(" | ");
    }

    const libraryText = [
      goodItems.length > 0 ? `DOBRE PROJEKTY (${goodItems.length}):\n${goodItems.map(formatItem).join("\n")}` : "",
      badItems.length > 0 ? `ZŁE PROJEKTY (${badItems.length}):\n${badItems.map(formatItem).join("\n")}` : "",
    ].filter(Boolean).join("\n\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: "Jesteś ekspertem od projektowania graficznego. Przeanalizuj poniższe przykłady z biblioteki projektów i stwórz zwięzłe notatki analityczne, które pomogą oceniać nowe projekty. Skup się na wzorcach: co sprawia że dobre projekty są dobre, co psuje złe, jakie cechy powtarzają się. Pisz po polsku, konkretnie i użytecznie.",
        messages: [{
          role: "user",
          content: `Przeanalizuj te przykłady z biblioteki projektów i napisz notatki analityczne (max 800 słów) do wykorzystania przy ocenie nowych projektów:\n\n${libraryText}`,
        }],
      }),
    });

    const data = await response.json();
    const analysis = data.content?.[0]?.text || "";
    if (!analysis) throw new Error("Brak odpowiedzi od Claude");

    // Save to Supabase
    await supabase.from("library_analysis").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { data: saved, error: saveError } = await supabase
      .from("library_analysis")
      .insert([{ analysis, item_count: items.length, updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (saveError) throw new Error(saveError.message);

    return Response.json({ success: true, analysis, itemCount: items.length, updatedAt: saved.updated_at });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
