import { getServiceClient } from "@/lib/supabase/server";
import OccasionsView from "./OccasionsView";

const MONTH_LABELS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

export default async function OccasionsPage() {
  const supabase = getServiceClient();

  const { data: events, error } = await supabase
    .from("client_product_events")
    .select("client_id, season, order_date")
    .not("season", "is", null);

  if (error || !events || events.length === 0) {
    return <OccasionsView data={null} />;
  }

  // Top occasions: count distinct clients per season
  const seasonClientMap = new Map<string, Set<string>>();
  const seasonOrderMap = new Map<string, number>();
  for (const e of events) {
    if (!e.season) continue;
    if (!seasonClientMap.has(e.season)) seasonClientMap.set(e.season, new Set());
    seasonClientMap.get(e.season)!.add(e.client_id);
    seasonOrderMap.set(e.season, (seasonOrderMap.get(e.season) ?? 0) + 1);
  }
  const topOccasions = [...seasonClientMap.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .map(([occasion, clients]) => ({
      occasion,
      orderCount: seasonOrderMap.get(occasion) ?? 0,
      customerCount: clients.size,
    }));

  // Monthly heatmap: count orders per month across all years
  const monthCounts = new Array(12).fill(0);
  for (const e of events) {
    if (!e.order_date) continue;
    const month = new Date(e.order_date).getMonth(); // 0-based
    if (month >= 0 && month < 12) monthCounts[month]++;
  }
  const totalOrders = monthCounts.reduce((s, v) => s + v, 0) || 1;
  const heatmapMonths = MONTH_LABELS.map((month, i) => ({
    month,
    orders: monthCounts[i],
    pct: Math.round((monthCounts[i] / totalOrders) * 100),
  }));

  // Cyclic customers: same season in 2+ different years
  // Build: client_id → season → Set<year>
  const clientSeasonYears = new Map<string, Map<string, Set<number>>>();
  for (const e of events) {
    if (!e.client_id || !e.season || !e.order_date) continue;
    const year = new Date(e.order_date).getFullYear();
    if (!clientSeasonYears.has(e.client_id))
      clientSeasonYears.set(e.client_id, new Map());
    const seasonMap = clientSeasonYears.get(e.client_id)!;
    if (!seasonMap.has(e.season)) seasonMap.set(e.season, new Set());
    seasonMap.get(e.season)!.add(year);
  }

  // Count cyclic clients per occasion (bought same occasion in 2+ different years)
  const cyclicBySeason = new Map<string, number>();
  for (const [, seasonMap] of clientSeasonYears) {
    for (const [season, years] of seasonMap) {
      if (years.size >= 2) {
        cyclicBySeason.set(season, (cyclicBySeason.get(season) ?? 0) + 1);
      }
    }
  }

  const cyclicRows = topOccasions.slice(0, 8).map(occ => {
    const cyclic = cyclicBySeason.get(occ.occasion) ?? 0;
    const pct = occ.customerCount > 0 ? Math.round((cyclic / occ.customerCount) * 100) : 0;
    return { occasion: occ.occasion, customerCount: occ.customerCount, cyclic, cyclicPct: pct };
  });

  // Special: clients buying DZIEN_MATKI every year (2+ years)
  const dzieMatkiEveryYear = cyclicBySeason.get("DZIEN_MATKI") ?? 0;

  return (
    <OccasionsView
      data={{ topOccasions, heatmapMonths, cyclicRows, dzieMatkiEveryYear }}
    />
  );
}
