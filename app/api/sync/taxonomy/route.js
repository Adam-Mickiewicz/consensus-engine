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
  return val === "TAK" || val === "TRUE" || val === "true" || val === true;
}

function parseCsvArray(val) {
  if (!val || val === "") return [];
  if (Array.isArray(val)) return val;
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function sanitizeStr(val) {
  if (val == null) return null;
  const s = String(val)
    .replace(/[\n\r\t]/g, " ")
    .replace(/[\x00-\x1F]/g, "")
    .trim();
  return s === "" ? null : s;
}

function parseDate(val) {
  if (!val || val === "") return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

function mapRow(row) {
  return {
    ean:                Number(row.ean              ?? row["KodEAN"]),
    name:               sanitizeStr(row.name                   ?? row["Towar"])               ?? "",
    variant:            sanitizeStr(row.variant                ?? row["Wariant"]),
    collection:         sanitizeStr(row.collection             ?? row["Kolekcja"]),
    product_group:      sanitizeStr(row.product_group          ?? row["Kategoria produktowa"] ?? row["Grupa"]),
    tags_granularne:    parseCsvArray(row.tags_granularne  ?? row["TAGS_GRANULARNE"]),
    tags_domenowe:      parseCsvArray(row.tags_domenowe    ?? row["TAGS_DOMENOWE"]),
    filary_marki:       parseCsvArray(row.filary_marki     ?? row["FILARY_MARKI"]),
    okazje:             parseCsvArray(row.okazje           ?? row["OKAZJE"]),
    segment_prezentowy: sanitizeStr(row.segment_prezentowy     ?? row["SEGMENT_PREZENTOWY"]),
    launch_date:        parseDate(row.launch_date  ?? row["DATA URUCHOMIENIA"]),
    evergreen:          parseBoolean(row.evergreen ?? row["EVERGREEN"]),
    price_avg:          row.price_avg != null ? Number(row.price_avg) : null,
    available:          row.available !== undefined ? parseBoolean(row.available) : true,
    updated_at:         new Date().toISOString(),
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
      .from("products")
      .upsert(mapped, { onConflict: "ean" });

    if (error) throw error;

    await supabase.from("sync_log").insert({
      source: "taxonomy",
      status: "success",
      rows_upserted: mapped.length,
    });

    return Response.json({ ok: true, upserted: mapped.length });
  } catch (err) {
    await supabase.from("sync_log").insert({
      source: "taxonomy",
      status: "error",
      rows_upserted: 0,
      error_message: err?.message ?? String(err),
    }).catch(() => {});

    return Response.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
