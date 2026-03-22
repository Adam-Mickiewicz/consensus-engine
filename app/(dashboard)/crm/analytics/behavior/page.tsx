export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getServiceClient } from "@/lib/supabase/server";
import BehaviorView from "./BehaviorView";

export default async function BehaviorPage() {
  const supabase = getServiceClient();

  const [segmentsRes, occasionsRes] = await Promise.all([
    supabase.from("crm_behavior_segments").select("*"),
    supabase
      .from("crm_occasions")
      .select("*")
      .order("client_count", { ascending: false })
      .limit(10),
  ]);

  if (segmentsRes.error && occasionsRes.error) {
    return <BehaviorView data={null} />;
  }

  const segments = segmentsRes.data ?? [];
  const occasions = occasionsRes.data ?? [];

  if (segments.length === 0) {
    return <BehaviorView data={null} />;
  }

  const totalCustomers = segments.reduce((s, r) => s + Number(r.count), 0);

  const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];

  const ordersPerYear = segOrder
    .map(seg => {
      const row = segments.find(r => r.legacy_segment === seg);
      if (!row) return null;
      return {
        segment: seg,
        avgOrdersPerYear: Math.round(Number(row.avg_frequency) * 10) / 10,
      };
    })
    .filter(Boolean) as { segment: string; avgOrdersPerYear: number }[];

  const retentionBySegment = segOrder
    .map(seg => {
      const row = segments.find(r => r.legacy_segment === seg);
      if (!row) return null;
      const total = Number(row.count);
      const repeat = Number(row.repeat_count);
      return {
        segment: seg,
        total,
        repeat,
        rate: Math.round((repeat / total) * 100),
      };
    })
    .filter(Boolean) as { segment: string; total: number; repeat: number; rate: number }[];

  const totalEvents = occasions.reduce((s, r) => s + Number(r.event_count), 0) || 1;
  const topSeasons = occasions.map(r => ({
    season: r.season,
    count: Number(r.event_count),
    pct: Math.round((Number(r.event_count) / totalEvents) * 100),
  }));

  return (
    <BehaviorView
      data={{ totalCustomers, ordersPerYear, retentionBySegment, topSeasons }}
    />
  );
}
