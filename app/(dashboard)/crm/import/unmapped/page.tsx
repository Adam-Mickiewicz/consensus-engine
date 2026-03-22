export const dynamic = 'force-dynamic'
export const revalidate = 0

import { headers } from 'next/headers'
import { getServiceClient } from "@/lib/supabase/server";
import UnmappedView from "./UnmappedView";

export default async function UnmappedPage() {
  headers() // wymusza dynamic rendering, blokuje CDN cache
  const supabase = getServiceClient();

  // Use SQL view that does GROUP BY in DB — avoids PostgREST 1000-row default limit
  const { data, error } = await supabase
    .from("unmapped_products")
    .select("product_name, purchase_count");

  if (error) {
    return <UnmappedView rows={[]} error={error.message} />;
  }

  const rows = (data ?? []).map(r => ({ product_name: r.product_name, count: r.purchase_count }));

  return <UnmappedView rows={rows} />;
}
