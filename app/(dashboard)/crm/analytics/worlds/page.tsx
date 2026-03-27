export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getServiceClient } from "@/lib/supabase/server";
import WorldsView from "./WorldsView";

export default async function WorldsPage() {
  const supabase = getServiceClient();

  const [taxonomyResult, worldsResult, segWorldsResult, segmentsResult] = await Promise.all([
    supabase
      .from("client_taxonomy_summary")
      .select("top_tags_granularne, top_tags_domenowe, top_filary_marki")
      .range(0, 199999),
    supabase
      .from("crm_worlds")
      .select("*")
      .order("count", { ascending: false })
      .limit(10),
    supabase.from("crm_segment_worlds").select("*"),
    supabase.from("crm_segments").select("legacy_segment, count"),
  ]);

  if (taxonomyResult.error && worldsResult.error) {
    return <WorldsView data={null} />;
  }

  const taxonomy = taxonomyResult.data ?? [];
  const worldsRaw = worldsResult.data ?? [];
  const segWorlds = segWorldsResult.data ?? [];
  const segmentCounts = segmentsResult.data ?? [];

  if (taxonomy.length === 0) {
    return <WorldsView data={null} />;
  }

  // Top granular tags — flatten all arrays and count
  const granFreq = new Map<string, number>();
  for (const row of taxonomy) {
    for (const tag of row.top_tags_granularne ?? []) {
      granFreq.set(tag, (granFreq.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...granFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  // Pillar stats
  const pillarFreq = new Map<string, number>();
  for (const row of taxonomy) {
    for (const tag of row.top_filary_marki ?? []) {
      pillarFreq.set(tag, (pillarFreq.get(tag) ?? 0) + 1);
    }
  }
  const totalPillarCount = [...pillarFreq.values()].reduce((s, v) => s + v, 0) || 1;
  const pillarStats = [...pillarFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pillar, count]) => ({
      pillar,
      count,
      pct: Math.round((count / totalPillarCount) * 100),
    }));

  // Top domain tags
  const domainFreq = new Map<string, number>();
  for (const row of taxonomy) {
    for (const tag of row.top_tags_domenowe ?? []) {
      domainFreq.set(tag, (domainFreq.get(tag) ?? 0) + 1);
    }
  }
  const totalDomainCount = taxonomy.length || 1;
  const topDomains = [...domainFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({
      domain,
      count,
      pct: Math.round((count / totalDomainCount) * 100),
    }));

  // Top worlds list z widoku crm_worlds
  const topWorldsList = worldsRaw.map(w => w.ulubiony_swiat);

  // Mapa: segment → łączna liczba klientów (z crm_segments)
  const segTotalMap = new Map(segmentCounts.map(s => [s.legacy_segment, Number(s.count)]));

  // Heatmap: segment × świat z crm_segment_worlds (bez ładowania wszystkich rekordów)
  const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];
  const heatmap = segOrder
    .map(seg => {
      const segTotal = segTotalMap.get(seg);
      if (!segTotal) return null;
      const worldCountInSeg = new Map<string, number>();
      for (const sw of segWorlds) {
        if (sw.legacy_segment === seg) {
          worldCountInSeg.set(sw.ulubiony_swiat, Number(sw.count));
        }
      }
      return {
        segment: seg,
        topWorlds: topWorldsList.map(w => ({
          world: w,
          pct: Math.round(((worldCountInSeg.get(w) ?? 0) / segTotal) * 100),
        })),
      };
    })
    .filter(Boolean) as { segment: string; topWorlds: { world: string; pct: number }[] }[];

  return (
    <WorldsView
      data={{ topTags, pillarStats, topDomains, heatmap, topWorldsList }}
    />
  );
}
