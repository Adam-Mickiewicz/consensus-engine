export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from "react";
import { getServiceClient } from "@/lib/supabase/server";
import OverviewView from "./OverviewView";
import GlobalCRMFilters from "@/components/crm/GlobalCRMFilters";

type SP = Record<string, string | string[] | undefined>;

function str(v: SP[string]) { return typeof v === "string" ? v : undefined; }

export default async function CrmAnalyticsPage({ searchParams }: { searchParams: SP }) {
  const supabase = getServiceClient();

  const date_from = str(searchParams.date_from) ?? null;
  const date_to   = str(searchParams.date_to)   ?? null;
  const segment   = str(searchParams.segment)   ?? null;
  const risk      = str(searchParams.risk)       ?? null;
  const world     = str(searchParams.world)      ?? null;
  const occasion  = str(searchParams.occasion)   ?? null;

  const hasFilters = !!(date_from || date_to || segment || risk || world || occasion);

  let data: Parameters<typeof OverviewView>[0]["data"] = null;

  if (hasFilters) {
    const { data: rpc, error } = await supabase.rpc("get_crm_overview", {
      p_date_from: date_from,
      p_date_to:   date_to,
      p_segment:   segment,
      p_risk:      risk,
      p_world:     world,
      p_occasion:  occasion,
    });

    if (!error && rpc) {
      const totalCustomers = Number(rpc.total_clients);
      const totalLtv       = Math.round(Number(rpc.total_ltv));
      const avgLtv         = Math.round(Number(rpc.avg_ltv));
      const vipReanimacja  = Number(rpc.vip_count);

      const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];
      const bySegment = segOrder.map(s => {
        const row = (rpc.segments ?? []).find((r: { legacy_segment: string }) => r.legacy_segment === s);
        if (!row) return null;
        const count = Number(row.count);
        return {
          segment: s,
          count,
          sumLtv:  Math.round(Number(row.sum_ltv)),
          avgLtv:  Math.round(Number(row.avg_ltv)),
          pct:     totalCustomers ? Math.round((count / totalCustomers) * 100) : 0,
        };
      }).filter(Boolean) as { segment: string; count: number; sumLtv: number; avgLtv: number; pct: number }[];

      const riskOrder = ["OK", "Risk", "HighRisk", "Lost"];
      const byRisk = riskOrder.map(r => {
        const row = (rpc.risk ?? []).find((x: { risk_level: string }) => x.risk_level === r);
        if (!row) return null;
        const count = Number(row.count);
        return { risk_level: r, count, pct: totalCustomers ? Math.round((count / totalCustomers) * 100) : 0 };
      }).filter(Boolean) as { risk_level: string; count: number; pct: number }[];

      const topWorlds = (rpc.worlds ?? []).map((w: { ulubiony_swiat: string; count: number }) => ({
        world: w.ulubiony_swiat,
        count: Number(w.count),
        pct:   totalCustomers ? Math.round((Number(w.count) / totalCustomers) * 100) : 0,
      }));

      data = { totalCustomers, totalLtv, avgLtv, vipReanimacja, bySegment, byRisk, topWorlds };
    }
  } else {
    // Fast path: materialized views
    const [overviewRes, segmentsRes, riskRes, worldsRes] = await Promise.all([
      supabase.from("crm_overview").select("*").single(),
      supabase.from("crm_segments").select("*"),
      supabase.from("crm_risk").select("*"),
      supabase.from("crm_worlds").select("*").order("count", { ascending: false }).limit(10),
    ]);

    if (!overviewRes.error && overviewRes.data) {
      const ov = overviewRes.data;
      const totalCustomers = Number(ov.total_clients);
      const totalLtv       = Math.round(Number(ov.total_ltv));
      const avgLtv         = Math.round(Number(ov.avg_ltv));
      const vipReanimacja  = Number(ov.vip_count);

      const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];
      const segRaw   = segmentsRes.data ?? [];
      const bySegment = segOrder.map(s => {
        const row = segRaw.find(r => r.legacy_segment === s);
        if (!row) return null;
        const count = Number(row.count);
        return { segment: s, count, sumLtv: Math.round(Number(row.sum_ltv)), avgLtv: Math.round(Number(row.avg_ltv)), pct: Math.round((count / totalCustomers) * 100) };
      }).filter(Boolean) as { segment: string; count: number; sumLtv: number; avgLtv: number; pct: number }[];

      const riskOrder = ["OK", "Risk", "HighRisk", "Lost"];
      const riskRaw   = riskRes.data ?? [];
      const byRisk = riskOrder.map(r => {
        const row = riskRaw.find(x => x.risk_level === r);
        if (!row) return null;
        const count = Number(row.count);
        return { risk_level: r, count, pct: Math.round((count / totalCustomers) * 100) };
      }).filter(Boolean) as { risk_level: string; count: number; pct: number }[];

      const topWorlds = (worldsRes.data ?? []).map(w => ({
        world: w.ulubiony_swiat, count: Number(w.count),
        pct:   Math.round((Number(w.count) / totalCustomers) * 100),
      }));

      data = { totalCustomers, totalLtv, avgLtv, vipReanimacja, bySegment, byRisk, topWorlds };
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <GlobalCRMFilters />
      </Suspense>
      <OverviewView data={data} />
    </>
  );
}
