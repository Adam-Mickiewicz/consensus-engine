import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pairs = parseInt(searchParams.get("pairs") || "2");

    const { data: files, error } = await supabase.storage
      .from("sock-references")
      .list("", { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ success: true, pairs: [], debug: "bucket empty", raw: files });
    }

    // Loguj wszystkie pliki bez filtrowania
    const allNames = files.map(f => f.name);

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

      if (!pairMap[base]) pairMap[base] = { collection: f.name.split(/[-_]/)[0], left: null, right: null };
      pairMap[base][side] = f.name;
    }

    const completePairs = Object.values(pairMap).filter(p => p.left && p.right);

    if (completePairs.length === 0) {
      return NextResponse.json({ 
        success: true, pairs: [], 
        debug: `found ${imageFiles.length} files, 0 pairs`,
        allNames
      });
    }

    const shuffled = completePairs.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(pairs, shuffled.length));

    const downloadFile = async (filename) => {
      const { data, error } = await supabase.storage
        .from("sock-references")
        .download(filename);
      if (error || !data) return null;
      const buffer = await data.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return { filename, base64, mediaType: "image/bmp" };
    };

    const result = await Promise.all(
      selected.map(async (pair) => {
        const [left, right] = await Promise.all([
          downloadFile(pair.left),
          downloadFile(pair.right),
        ]);
        return { collection: pair.collection, left, right };
      })
    );

    const valid = result.filter(p => p.left && p.right);
    return NextResponse.json({ success: true, pairs: valid, total: completePairs.length });

  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
