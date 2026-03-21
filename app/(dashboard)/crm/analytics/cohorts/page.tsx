import { getServiceClient } from "@/lib/supabase/server";
import CohortsView from "./CohortsView";

export default async function CohortsPage() {
  const supabase = getServiceClient();

  const { data: rows, error } = await supabase
    .from("crm_cohorts")
    .select("*")
    .order("cohort");

  if (error || !rows || rows.length === 0) {
    return <CohortsView data={null} />;
  }

  const segOrder = ["Diamond", "Platinum", "Gold", "Returning", "New"];

  // Agreguj per segment (suma po wszystkich kohortach)
  const segMap = new Map<string, { total: number; repeat: number; weightedDays: number; weightedCount: number }>();
  for (const r of rows) {
    const seg = r.legacy_segment ?? "Unknown";
    const cur = segMap.get(seg) ?? { total: 0, repeat: 0, weightedDays: 0, weightedCount: 0 };
    cur.total += Number(r.total);
    cur.repeat += Number(r.repeat_count);
    if (r.avg_days_to_second != null) {
      cur.weightedDays += Number(r.avg_days_to_second) * Number(r.repeat_count);
      cur.weightedCount += Number(r.repeat_count);
    }
    segMap.set(seg, cur);
  }

  const retentionBySegment = segOrder
    .map(seg => {
      const d = segMap.get(seg);
      if (!d) return null;
      return {
        segment: seg,
        total: d.total,
        repeat: d.repeat,
        rate: Math.round((d.repeat / d.total) * 100),
      };
    })
    .filter(Boolean) as { segment: string; total: number; repeat: number; rate: number }[];

  const avgTimeToSecond = segOrder
    .map(seg => {
      const d = segMap.get(seg);
      if (!d || d.weightedCount === 0) return { segment: seg, days: null };
      return { segment: seg, days: Math.round(d.weightedDays / d.weightedCount) };
    })
    .filter(Boolean) as { segment: string; days: number | null }[];

  // Agreguj per kohortę (suma po wszystkich segmentach)
  const cohortMap = new Map<string, { total: number; repeat: number }>();
  for (const r of rows) {
    const c = cohortMap.get(r.cohort) ?? { total: 0, repeat: 0 };
    c.total += Number(r.total);
    c.repeat += Number(r.repeat_count);
    cohortMap.set(r.cohort, c);
  }

  const matrix = [...cohortMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cohort, { total, repeat }]) => ({
      cohort,
      size: total,
      m1ret: total > 0 ? Math.round((repeat / total) * 100) : 0,
    }));

  return <CohortsView data={{ matrix, avgTimeToSecond, retentionBySegment }} />;
}
