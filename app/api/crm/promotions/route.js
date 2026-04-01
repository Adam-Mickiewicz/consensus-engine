import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const [scorecardRes, dependencyRes, seasonsRes] = await Promise.all([
      supabase.from('crm_promo_scorecard').select('*').order('start_date', { ascending: false }),
      supabase.from('crm_promo_dependency').select('*'),
      supabase.from('crm_season_performance').select('*').order('season').order('year'),
    ]);

    return Response.json({
      scorecard: scorecardRes.data || [],
      dependency: dependencyRes.data || [],
      seasons: seasonsRes.data || [],
      errors: [scorecardRes.error, dependencyRes.error, seasonsRes.error]
        .filter(Boolean)
        .map((e) => e.message),
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
