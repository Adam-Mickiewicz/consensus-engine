import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let scorecardQuery = supabase.from('crm_promo_scorecard').select('*').order('start_date', { ascending: false });
    if (dateFrom) scorecardQuery = scorecardQuery.gte('start_date', dateFrom);
    if (dateTo) scorecardQuery = scorecardQuery.lte('end_date', dateTo);

    // Also fetch raw promotions for calendar
    let promoQuery = supabase.from('promotions').select('id,promo_name,discount_type,discount_min,free_shipping,start_date,end_date,season,code_name').order('start_date', { ascending: false });

    const dependencyQuery = (dateFrom && dateTo)
      ? supabase.rpc('get_promo_dependency_for_range', { p_from: dateFrom, p_to: dateTo })
      : supabase.from('crm_promo_dependency').select('*');

    const [scorecardRes, dependencyRes, seasonsRes, promoListRes] = await Promise.all([
      scorecardQuery,
      dependencyQuery,
      supabase.from('crm_season_performance').select('*').order('season').order('year'),
      promoQuery,
    ]);

    return Response.json({
      scorecard: scorecardRes.data || [],
      dependency: dependencyRes.data || [],
      seasons: seasonsRes.data || [],
      promotions: promoListRes.data || [],
      errors: [scorecardRes.error, dependencyRes.error, seasonsRes.error, promoListRes.error]
        .filter(Boolean)
        .map((e) => e.message),
    }, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.promo_name?.trim()) return Response.json({ error: 'promo_name is required' }, { status: 400 });
    if (!body.start_date || !body.end_date) return Response.json({ error: 'start_date and end_date are required' }, { status: 400 });

    const { data, error } = await supabase
      .from('promotions')
      .insert({
        promo_name: body.promo_name.trim(),
        discount_type: body.discount_type || 'ŻADNE',
        discount_min: body.discount_value ? parseFloat(body.discount_value) : null,
        free_shipping: body.free_shipping || false,
        start_date: body.start_date,
        end_date: body.end_date,
        season: body.season ? [body.season] : [],
        code_name: body.code_name || null,
        requires_code: !!body.code_name,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ promotion: data });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Błąd serwera' }, { status: 500 });
  }
}
