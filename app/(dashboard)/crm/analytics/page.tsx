export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getServiceClient } from "@/lib/supabase/server";
import OverviewView from "./OverviewView";

export default async function CrmAnalyticsPage() {
  const supabase = getServiceClient();

  const [overviewRes, segmentsRes, riskRes, domainsRes] = await Promise.all([
    supabase.from("crm_overview").select("*").single(),
    supabase.from("crm_segments").select("*"),
    supabase.from("crm_risk").select("*"),
    supabase.from("crm_tag_stats").select("tag, client_count").eq("tag_type", "domenowe").order("client_count", { ascending: false }).limit(10),
  ]);

  let data: Parameters<typeof OverviewView>[0]["data"] = null;

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

    const topDomains = (domainsRes.data ?? []).map(r => ({
      domain: r.tag,
      count: Number(r.client_count),
    }));

    data = { totalCustomers, totalLtv, avgLtv, vipReanimacja, bySegment, byRisk, topDomains };
  }

  return <OverviewView data={data} />;
}
