export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getServiceClient } from "@/lib/supabase/server";
import WorldsView from "./WorldsView";

export default async function WorldsPage() {
  const supabase = getServiceClient();

  const [granResult, domResult, filarResult, segmentsResult] =
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
      supabase.from("crm_segments").select("legacy_segment, count"),
    ]);

  if (granResult.error || !granResult.data?.length) {
    return <WorldsView data={null} />;
  }

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

  const topWorldsList: string[] = [];
  const heatmap: { segment: string; topWorlds: { world: string; pct: number }[] }[] = [];

  return (
    <WorldsView
      data={{ topTags, pillarStats, topDomains, heatmap, topWorldsList }}
    />
  );
}
