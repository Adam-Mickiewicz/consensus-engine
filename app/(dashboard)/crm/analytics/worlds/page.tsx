export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getServiceClient } from "@/lib/supabase/server";
import WorldsView from "./WorldsView";

export default async function WorldsPage() {
  const supabase = getServiceClient();

  const [granResult, domResult, filarResult, worldsResult, segWorldsResult, segmentsResult] =
    await Promise.all([
      supabase
        .from("crm_tag_stats")
        .select("tag, client_count")
        .eq("tag_type", "granularne")
        .order("client_count", { ascending: false }),
      supabase
        .from("crm_tag_stats")
        .select("tag, client_count")
        .eq("tag_type", "domenowe")
        .order("client_count", { ascending: false }),
      supabase
        .from("crm_tag_stats")
        .select("tag, client_count")
        .eq("tag_type", "filary")
        .order("client_count", { ascending: false }),
      supabase
        .from("crm_worlds")
        .select("*")
        .order("count", { ascending: false })
        .limit(10),
      supabase.from("crm_segment_worlds").select("*"),
      supabase.from("crm_segments").select("legacy_segment, count"),
    ]);

  if (granResult.error || !granResult.data?.length) {
    return <WorldsView data={null} />;
  }

  const worldsRaw     = worldsResult.data ?? [];
  const segWorlds     = segWorldsResult.data ?? [];
  const segmentCounts = segmentsResult.data ?? [];

  // Top 20 granular tags
  const topTags = (granResult.data ?? [])
    .slice(0, 20)
    .map(r => ({ tag: r.tag, count: Number(r.client_count) }));

  // Brand pillars
  const pillarRows = filarResult.data ?? [];
  const totalPillarCount = pillarRows.reduce((s, r) => s + Number(r.client_count), 0) || 1;
  const pillarStats = pillarRows.map(r => ({
    pillar: r.tag,
    count:  Number(r.client_count),
    pct:    Math.round((Number(r.client_count) / totalPillarCount) * 100),
  }));

  // Top 10 domain tags
  const domRows = domResult.data ?? [];
  const totalDomainCount = domRows.reduce((s, r) => s + Number(r.client_count), 0) || 1;
  const topDomains = domRows
    .slice(0, 10)
    .map(r => ({
      domain: r.tag,
      count:  Number(r.client_count),
      pct:    Math.round((Number(r.client_count) / totalDomainCount) * 100),
    }));

  // Top worlds list z widoku crm_worlds
  const topWorldsList = worldsRaw.map(w => w.ulubiony_swiat);

  // Mapa: segment → łączna liczba klientów (z crm_segments)
  const segTotalMap = new Map(segmentCounts.map(s => [s.legacy_segment, Number(s.count)]));

  // Heatmap: segment × świat z crm_segment_worlds
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
