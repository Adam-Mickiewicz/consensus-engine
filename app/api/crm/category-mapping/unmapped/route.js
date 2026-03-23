export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = getServiceClient();

  // Pobierz distinct product_name gdzie price_category_id IS NULL (max 200, posortowane po count desc)
  // PostgREST nie obsługuje GROUP BY, więc pobieramy wszystkie null-category events i grupujemy w JS
  const PAGE = 1000;
  const allRows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("client_product_events")
      .select("product_name, ean")
      .is("price_category_id", null)
      .not("product_name", "is", null)
      .range(from, from + PAGE - 1);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Grupuj po product_name
  const grouped = {};
  for (const row of allRows) {
    const name = row.product_name;
    if (!grouped[name]) {
      grouped[name] = { product_name: name, count: 0, ean: row.ean ?? null };
    }
    grouped[name].count++;
    if (!grouped[name].ean && row.ean) grouped[name].ean = row.ean;
  }

  const rows = Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .slice(0, 200);

  return Response.json(
    { rows, total: rows.length },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
