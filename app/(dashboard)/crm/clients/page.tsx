export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Suspense } from "react";
import { getServiceClient } from "@/lib/supabase/server";
import ClientsView from "./ClientsView";

const PAGE_SIZE = 30;

export default async function CrmClientsPage({
  searchParams,
}: {
  searchParams: { search?: string; segment?: string; risk?: string; page?: string };
}) {
  const search = searchParams.search ?? "";
  const segment = searchParams.segment ?? "All";
  const risk = searchParams.risk ?? "All";
  const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = getServiceClient();

  let query = supabase
    .from("clients_360")
    .select(
      "client_id, legacy_segment, risk_level, ltv, ulubiony_swiat, last_order",
      { count: "exact" }
    )
    .order("ltv", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (segment !== "All") query = query.eq("legacy_segment", segment);
  if (risk !== "All") query = query.eq("risk_level", risk);
  if (search) query = query.ilike("client_id", `%${search}%`);

  const { data, count, error } = await query;

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Suspense>
      <ClientsView
        clients={data ?? []}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        segment={segment}
        risk={risk}
      />
    </Suspense>
  );
}
