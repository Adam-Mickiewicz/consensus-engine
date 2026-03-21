import { getServiceClient } from "@/lib/supabase/server";
import CohortsView from "./CohortsView";

export default async function CohortsPage() {
  const supabase = getServiceClient();

  const { data: clients, error } = await supabase
    .from("clients_360")
    .select("client_id, first_order, last_order, orders_count, legacy_segment")
    .not("first_order", "is", null);

  if (error || !clients || clients.length === 0) {
    return <CohortsView data={null} />;
  }

  const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];

  // Retention by segment
  const retentionBySegment = segOrder
    .map(seg => {
      const segClients = clients.filter(c => c.legacy_segment === seg);
      if (segClients.length === 0) return null;
      const repeat = segClients.filter(c => (c.orders_count ?? 0) >= 2).length;
      return {
        segment: seg,
        total: segClients.length,
        repeat,
        rate: Math.round((repeat / segClients.length) * 100),
      };
    })
    .filter(Boolean) as { segment: string; total: number; repeat: number; rate: number }[];

  // Avg time to second purchase — approximate from (last_order - first_order) / (orders_count - 1)
  // Only meaningful for clients with orders_count >= 2
  const avgTimeToSecond = segOrder
    .map(seg => {
      const segClients = clients.filter(
        c => c.legacy_segment === seg && (c.orders_count ?? 0) >= 2 && c.first_order && c.last_order
      );
      if (segClients.length === 0) return { segment: seg, days: null };
      const avgDays =
        segClients.reduce((sum, c) => {
          const span =
            (new Date(c.last_order!).getTime() - new Date(c.first_order!).getTime()) /
            (86400 * 1000);
          const intervals = (c.orders_count ?? 2) - 1;
          return sum + (intervals > 0 ? span / intervals : span);
        }, 0) / segClients.length;
      return { segment: seg, days: Math.round(avgDays) };
    })
    .filter(Boolean) as { segment: string; days: number | null }[];

  // Cohort matrix: group by first_order month → YYYY-MM
  const cohortMap = new Map<string, { total: number; repeat: number }>();
  for (const c of clients) {
    if (!c.first_order) continue;
    const key = c.first_order.slice(0, 7); // "YYYY-MM"
    const cur = cohortMap.get(key) ?? { total: 0, repeat: 0 };
    cur.total++;
    if ((c.orders_count ?? 0) >= 2) cur.repeat++;
    cohortMap.set(key, cur);
  }

  const matrix = [...cohortMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cohort, { total, repeat }]) => ({
      cohort,
      size: total,
      m1ret: total > 0 ? Math.round((repeat / total) * 100) : 0,
    }));

  return (
    <CohortsView data={{ matrix, avgTimeToSecond, retentionBySegment }} />
  );
}
