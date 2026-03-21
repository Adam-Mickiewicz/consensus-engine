import { getServiceClient } from "@/lib/supabase/server";
import WorldsView from "./WorldsView";

export default async function WorldsPage() {
  const supabase = getServiceClient();

  const [taxonomyResult, clientsResult] = await Promise.all([
    supabase
      .from("client_taxonomy_summary")
      .select("client_id, top_tags_granularne, top_tags_domenowe, top_filary_marki"),
    supabase
      .from("clients_360")
      .select("client_id, legacy_segment, ulubiony_swiat"),
  ]);

  if (
    (taxonomyResult.error && clientsResult.error) ||
    (!taxonomyResult.data?.length && !clientsResult.data?.length)
  ) {
    return <WorldsView data={null} />;
  }

  const taxonomy = taxonomyResult.data ?? [];
  const clients = clientsResult.data ?? [];

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

  // Build a map: client_id → segment
  const segmentMap = new Map(clients.map(c => [c.client_id, c.legacy_segment]));

  // Top 10 worlds from clients_360.ulubiony_swiat
  const worldFreqAll = new Map<string, number>();
  for (const c of clients) {
    if (c.ulubiony_swiat)
      worldFreqAll.set(c.ulubiony_swiat, (worldFreqAll.get(c.ulubiony_swiat) ?? 0) + 1);
  }
  const topWorldsList = [...worldFreqAll.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);

  // Heatmap: segment × world
  const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];
  const heatmap = segOrder
    .map(seg => {
      const segClients = clients.filter(c => c.legacy_segment === seg);
      const segTotal = segClients.length || 1;
      const worldCountInSeg = new Map<string, number>();
      for (const c of segClients) {
        if (c.ulubiony_swiat)
          worldCountInSeg.set(c.ulubiony_swiat, (worldCountInSeg.get(c.ulubiony_swiat) ?? 0) + 1);
      }
      return {
        segment: seg,
        topWorlds: topWorldsList.map(w => ({
          world: w,
          pct: Math.round(((worldCountInSeg.get(w) ?? 0) / segTotal) * 100),
        })),
      };
    })
    .filter(row => {
      const segClients = clients.filter(c => c.legacy_segment === row.segment);
      return segClients.length > 0;
    });

  return (
    <WorldsView
      data={{ topTags, pillarStats, topDomains, heatmap, topWorldsList }}
    />
  );
}
