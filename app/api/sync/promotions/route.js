import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function parseBoolean(val) {
  if (typeof val === "boolean") return val;
  return val === "PRAWDA" || val === "TRUE" || val === "true";
}

function parseCsvArray(val) {
  if (!val || val === "") return [];
  if (Array.isArray(val)) return val;
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function mapRow(row) {
  return {
    ...(row.id !== undefined && { id: Number(row.id) }),
    promo_name:     row.promo_name      ?? row["Nazwa promocji"] ?? "",
    promo_type:     parseCsvArray(row.promo_type     ?? row["Typ promocji"]),
    discount_type:  row.discount_type   ?? row["Typ rabatu"]   ?? null,
    discount_min:   row.discount_min    ?? row["Rabat min"]    ?? null,
    discount_max:   row.discount_max    ?? row["Rabat max"]    ?? null,
    category_list:  row.category_list   ?? row["Kategorie"]    ?? null,
    product_list:   row.product_list    ?? row["Produkty"]     ?? null,
    requires_code:  parseBoolean(row.requires_code  ?? row["Wymaga kodu"]),
    code_name:      row.code_name       ?? row["Kod"]          ?? null,
    free_shipping:  parseBoolean(row.free_shipping  ?? row["Darmowa dostawa"]),
    start_date:     row.start_date      ?? row["Data od"]      ?? null,
    end_date:       row.end_date        ?? row["Data do"]      ?? null,
    season:         parseCsvArray(row.season         ?? row["Sezon"]),
    notes:          row.notes           ?? row["Uwagi"]        ?? null,
  };
}

export async function POST(request) {
  // Auth check
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
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: "Missing or empty rows array" }, { status: 400 });
  }

  try {
    const mapped = rows.map(mapRow);

    const { error } = await supabase
      .from("promotions")
      .upsert(mapped, { onConflict: "promo_name,start_date", ignoreDuplicates: true });

    if (error) throw error;

    await supabase.from("sync_log").insert({
      source: "promotions",
      status: "success",
      rows_upserted: mapped.length,
    });

    return Response.json({ ok: true, upserted: mapped.length });
  } catch (err) {
    try {
      await supabase.from("sync_log").insert({
        source: "promotions",
        status: "error",
        rows_upserted: 0,
        error_message: err?.message ?? String(err),
      });
    } catch (_) {}

    return Response.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
