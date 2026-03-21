import { getServiceClient } from "@/lib/supabase/server";
import OverviewView from "./OverviewView";

export default async function CrmAnalyticsPage() {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("clients_360")
    .select("client_id, legacy_segment, risk_level, ltv, ulubiony_swiat, winback_priority");

  if (error || !data || data.length === 0) {
    return <OverviewView data={null} />;
  }

  const totalCustomers = data.length;
  const totalLtv = data.reduce((s, c) => s + (parseFloat(c.ltv) || 0), 0);
  const avgLtv = Math.round(totalLtv / totalCustomers);

  const vipReanimacja = data.filter(
    c =>
      (c.legacy_segment === "Diamond" || c.legacy_segment === "Platinum") &&
      (c.risk_level === "Lost" || c.risk_level === "HighRisk")
  ).length;

  // by segment
  const segMap = new Map<string, { count: number; sumLtv: number }>();
  for (const c of data) {
    const seg = c.legacy_segment ?? "Unknown";
    const cur = segMap.get(seg) ?? { count: 0, sumLtv: 0 };
    cur.count++;
    cur.sumLtv += parseFloat(c.ltv) || 0;
    segMap.set(seg, cur);
  }
  const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];
  const bySegment = segOrder
    .filter(s => segMap.has(s))
    .map(s => {
      const { count, sumLtv } = segMap.get(s)!;
      return {
        segment: s,
        count,
        sumLtv: Math.round(sumLtv),
        avgLtv: Math.round(sumLtv / count),
        pct: Math.round((count / totalCustomers) * 100),
      };
    });

  // by risk
  const riskMap = new Map<string, number>();
  for (const c of data) {
    const r = c.risk_level ?? "Unknown";
    riskMap.set(r, (riskMap.get(r) ?? 0) + 1);
  }
  const riskOrder = ["OK", "Risk", "HighRisk", "Lost"];
  const byRisk = riskOrder
    .filter(r => riskMap.has(r))
    .map(r => ({
      risk_level: r,
      count: riskMap.get(r)!,
      pct: Math.round((riskMap.get(r)! / totalCustomers) * 100),
    }));

  // top worlds
  const worldMap = new Map<string, number>();
  for (const c of data) {
    if (c.ulubiony_swiat)
      worldMap.set(c.ulubiony_swiat, (worldMap.get(c.ulubiony_swiat) ?? 0) + 1);
  }
  const topWorlds = [...worldMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([world, count]) => ({
      world,
      count,
      pct: Math.round((count / totalCustomers) * 100),
    }));

  return (
    <OverviewView
      data={{
        totalCustomers,
        totalLtv: Math.round(totalLtv),
        avgLtv,
        vipReanimacja,
        bySegment,
        byRisk,
        topWorlds,
      }}
    />
  );
}
