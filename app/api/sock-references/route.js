import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pairs = parseInt(searchParams.get("pairs") || "2");

    const { data: files, error } = await supabase.storage
      .from("sock-references")
      .list("", { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } });

    if (error) return NextResponse.json({ success: false, error: error.message });
    if (!files || files.length === 0) return NextResponse.json({ success: true, pairs: [] });

    const imageFiles = files.filter(f => f.name && !f.name.startsWith("."));

    const pairMap = {};
    for (const f of imageFiles) {
      const nameLower = f.name.toLowerCase();
      let side = null;
      let base = nameLower;

      if (nameLower.includes("lewa")) {
        side = "left";
        base = nameLower.replace(/lewa/g, "X").replace(/[-_\s]+/g, "_");
      } else if (nameLower.includes("prawa")) {
        side = "right";
        base = nameLower.replace(/prawa/g, "X").replace(/[-_\s]+/g, "_");
      } else {
        continue;
      }

      if (!pairMap[base]) pairMap[base] = { collection: f.name.split(/[-_ ]/)[0], left: null, right: null };
      pairMap[base][side] = f.name;
    }

    const completePairs = Object.values(pairMap).filter(p => p.left && p.right);
    const shuffled = completePairs.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(pairs, shuffled.length));

    // Zwróć publiczne URL-e zamiast base64
    const result = selected.map(pair => ({
      collection: pair.collection,
      left: {
        filename: pair.left,
        url: `${SUPABASE_URL}/storage/v1/object/public/sock-references/${encodeURIComponent(pair.left)}`
      },
      right: {
        filename: pair.right,
        url: `${SUPABASE_URL}/storage/v1/object/public/sock-references/${encodeURIComponent(pair.right)}`
      }
    }));

    return NextResponse.json({ success: true, pairs: result, total: completePairs.length });

  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
