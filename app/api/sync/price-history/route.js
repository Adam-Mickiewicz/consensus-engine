import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function parseNumeric(val) {
  const n = parseFloat(String(val ?? "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function mapRow(row) {
  return {
    category_id: String(row.category_id ?? "").trim(),
    date_from:   row.date_from ?? null,
    date_to:     row.date_to   ?? null,
    avg_price:   parseNumeric(row.avg_price),
  };
}

export async function POST(request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token || token !== process.env.SYNC_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rows = body?.rows;
  if (!Array.isArray(rows)) {
    return Response.json({ error: "Missing rows array" }, { status: 400 });
  }

  try {
    // TRUNCATE + INSERT (jak promotions — pełna wymiana matrycy)
    const { error: truncErr } = await supabase.rpc("truncate_price_history");
    if (truncErr) {
      // Fallback: delete all rows if RPC not available
      await supabase.from("price_history").delete().gte("id", 0);
    }

    let inserted = 0;
    if (rows.length > 0) {
      const mapped = rows.map(mapRow).filter((r) => r.category_id && r.date_from && r.avg_price !== null);
      const BATCH = 200;
      for (let i = 0; i < mapped.length; i += BATCH) {
        const batch = mapped.slice(i, i + BATCH);
        const { error } = await supabase.from("price_history").insert(batch);
        if (error) throw error;
      }
      inserted = mapped.length;
    }

    await supabase.from("sync_log").insert({
      source: "price_history",
      status: "success",
      rows_upserted: inserted,
    });

    return Response.json({ success: true, rows: inserted });
  } catch (err) {
    try {
      await supabase.from("sync_log").insert({
        source: "price_history",
        status: "error",
        rows_upserted: 0,
        error_message: err?.message ?? String(err),
      });
    } catch (_) {}

    return Response.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
