export const dynamic = 'force-dynamic'

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const supabase = getServiceClient();

  // Fetch all unmapped product events (ean IS NULL)
  // We need to count occurrences per product_name
  const { data, error } = await supabase
    .from("client_product_events")
    .select("product_name")
    .is("ean", null)
    .not("product_name", "is", null);

  console.log('[unmapped] query result: rows=', data?.length ?? 0, 'error=', error?.message ?? null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate counts
  const freq = new Map();
  for (const row of data ?? []) {
    if (!row.product_name) continue;
    freq.set(row.product_name, (freq.get(row.product_name) ?? 0) + 1);
  }

  const rows = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([product_name, count]) => ({ product_name, count }));

  if (format === "csv") {
    const header = "product_name,count,suggested_world\n";
    const lines = rows
      .map(r => `"${r.product_name.replace(/"/g, '""')}",${r.count},`)
      .join("\n");
    const csv = header + lines;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="unmapped_products.csv"',
      },
    });
  }

  return NextResponse.json({ rows, total: rows.length });
}
