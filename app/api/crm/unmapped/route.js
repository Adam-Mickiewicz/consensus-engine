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

  // Use SQL view that does GROUP BY in DB — avoids PostgREST 1000-row default limit
  const { data, error } = await supabase
    .from("unmapped_products")
    .select("product_name, purchase_count");

  console.log('[unmapped] count:', data?.length ?? 0, 'error=', error?.message ?? null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map(r => ({ product_name: r.product_name, count: r.purchase_count }));

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

  return NextResponse.json({ rows, total: rows.length }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
    },
  });
}
