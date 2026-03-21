import { getServiceClient } from "@/lib/supabase/server";
import OverviewView from "./OverviewView";

export default async function CrmAnalyticsPage() {
  const supabase = getServiceClient();

  const [overviewRes, segmentsRes, riskRes, worldsRes] = await Promise.all([
    supabase.from("crm_overview").select("*").single(),
    supabase.from("crm_segments").select("*"),
    supabase.from("crm_risk").select("*"),
    supabase.from("crm_worlds").select("*").order("count", { ascending: false }).limit(10),
  ]);

  if (overviewRes.error || !overviewRes.data) {
    return <OverviewView data={null} />;
  }

  const ov = overviewRes.data;
  const totalCustomers = Number(ov.total_clients);
  const totalLtv = Math.round(Number(ov.total_ltv));
  const avgLtv = Math.round(Number(ov.avg_ltv));
  const vipReanimacja = Number(ov.vip_count);

  const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];
  const segRaw = segmentsRes.data ?? [];
  const bySegment = segOrder
    .map(s => {
      const row = segRaw.find(r => r.legacy_segment === s);
      if (!row) return null;
      const count = Number(row.count);
      const sumLtv = Math.round(Number(row.sum_ltv));
      return {
        segment: s,
        count,
        sumLtv,
        avgLtv: Math.round(Number(row.avg_ltv)),
        pct: Math.round((count / totalCustomers) * 100),
      };
    })
    .filter(Boolean) as { segment: string; count: number; sumLtv: number; avgLtv: number; pct: number }[];

  const riskOrder = ["OK", "Risk", "HighRisk", "Lost"];
  const riskRaw = riskRes.data ?? [];
  const byRisk = riskOrder
    .map(r => {
      const row = riskRaw.find(x => x.risk_level === r);
      if (!row) return null;
      const count = Number(row.count);
      return {
        risk_level: r,
        count,
        pct: Math.round((count / totalCustomers) * 100),
      };
    })
    .filter(Boolean) as { risk_level: string; count: number; pct: number }[];

  const worldsRaw = worldsRes.data ?? [];
  const topWorlds = worldsRaw.map(w => ({
    world: w.ulubiony_swiat,
    count: Number(w.count),
    pct: Math.round((Number(w.count) / totalCustomers) * 100),
  }));

  return (
    <OverviewView
      data={{ totalCustomers, totalLtv, avgLtv, vipReanimacja, bySegment, byRisk, topWorlds }}
    />
  );
}
