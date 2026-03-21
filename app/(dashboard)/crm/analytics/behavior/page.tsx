import { getServiceClient } from "@/lib/supabase/server";
import BehaviorView from "./BehaviorView";

export default async function BehaviorPage() {
  const supabase = getServiceClient();

  const [clientsResult, eventsResult] = await Promise.all([
    supabase
      .from("clients_360")
      .select("legacy_segment, orders_count, purchase_frequency_yearly"),
    supabase
      .from("client_product_events")
      .select("client_id, season")
      .not("season", "is", null),
  ]);

  if (
    (clientsResult.error && eventsResult.error) ||
    (!clientsResult.data?.length && !eventsResult.data?.length)
  ) {
    return <BehaviorView data={null} />;
  }

  const clients = clientsResult.data ?? [];
  const events = eventsResult.data ?? [];

  if (clients.length === 0) {
    return <BehaviorView data={null} />;
  }

  const totalCustomers = clients.length;

  // Orders per year per segment
  const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];
  const ordersPerYear = segOrder
    .map(seg => {
      const segClients = clients.filter(c => c.legacy_segment === seg);
      if (segClients.length === 0) return null;
      const avg =
        segClients.reduce((s, c) => s + (parseFloat(c.purchase_frequency_yearly) || 0), 0) /
        segClients.length;
      return { segment: seg, avgOrdersPerYear: Math.round(avg * 10) / 10 };
    })
    .filter(Boolean) as { segment: string; avgOrdersPerYear: number }[];

  // Retention per segment (orders_count >= 2)
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

  // Top seasons from client_product_events
  const seasonFreq = new Map<string, number>();
  for (const e of events) {
    if (e.season) seasonFreq.set(e.season, (seasonFreq.get(e.season) ?? 0) + 1);
  }
  const totalEvents = events.length || 1;
  const topSeasons = [...seasonFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([season, count]) => ({
      season,
      count,
      pct: Math.round((count / totalEvents) * 100),
    }));

  return (
    <BehaviorView
      data={{ totalCustomers, ordersPerYear, retentionBySegment, topSeasons }}
    />
  );
}
