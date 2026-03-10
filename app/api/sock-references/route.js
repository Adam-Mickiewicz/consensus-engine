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
      .list("", { limit: 100 });

    if (error) throw error;
    if (!files || files.length === 0) {
      return NextResponse.json({ success: true, pairs: [] });
    }

    const imageFiles = files.filter(f => f.name.match(/\.(bmp|png|jpg|jpeg)$/i));

    const pairMap = {};
    for (const f of imageFiles) {
      const name = f.name.toLowerCase();
      let side = null;
      let base = null;

      if (name.includes("lewa")) {
        side = "left";
        base = name.replace(/[-_]?lewa[-_]?/g, "_").replace(/_{2,}/g, "_");
      } else if (name.includes("prawa")) {
        side = "right";
        base = name.replace(/[-_]?prawa[-_]?/g, "_").replace(/_{2,}/g, "_");
      } else {
        continue;
      }

      const collectionMatch = f.name.match(/^([^-_]+(?:[-_][^-_]+)?)/);
      const collection = collectionMatch ? collectionMatch[0].replace(/[-_]/g, " ").trim() : f.name;

      if (!pairMap[base]) pairMap[base] = { collection, left: null, right: null };
      pairMap[base][side] = f.name;
    }

    const completePairs = Object.values(pairMap).filter(p => p.left && p.right);
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
