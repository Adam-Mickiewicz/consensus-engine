import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

  const { data: dates } = await supabase
    .from('segment_snapshots')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(100);

  const uniqueDates = [...new Set((dates || []).map(d => d.snapshot_date))];

  if (uniqueDates.length < 2) {
    return Response.json({
      migration: null,
      availableDates: uniqueDates,
      message: 'Potrzebne minimum 2 snapshoty. Uruchom take_segment_snapshot() codziennie.',
    });
  }

  const actualFrom = fromDate || uniqueDates[uniqueDates.length - 1];
  const actualTo = toDate || uniqueDates[0];

  const { data, error } = await supabase.rpc('get_segment_migration', {
    p_from_date: actualFrom,
    p_to_date: actualTo,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    migration: data,
    fromDate: actualFrom,
    toDate: actualTo,
    availableDates: uniqueDates,
  });
}
