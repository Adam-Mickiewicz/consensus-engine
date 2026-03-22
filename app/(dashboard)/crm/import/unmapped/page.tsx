export const dynamic = 'force-dynamic'
export const revalidate = 0

import { headers } from 'next/headers'
import { getServiceClient } from "@/lib/supabase/server";
import UnmappedView from "./UnmappedView";

export default async function UnmappedPage() {
  headers() // wymusza dynamic rendering, blokuje CDN cache
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("client_product_events")
    .select("product_name")
    .is("ean", null)
    .not("product_name", "is", null);

  if (error) {
    return <UnmappedView rows={[]} error={error.message} />;
  }

  // Aggregate counts in JS
  const freq = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.product_name) continue;
    freq.set(row.product_name, (freq.get(row.product_name) ?? 0) + 1);
  }

  const rows = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([product_name, count]) => ({ product_name, count }));

  return <UnmappedView rows={rows} />;
}
