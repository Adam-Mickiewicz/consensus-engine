import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [journeyRes, transRes] = await Promise.all([
      supabase.from('crm_customer_journey').select('*'),
      supabase.from('crm_journey_transitions').select('*').order('transition_count', { ascending: false }).limit(100),
    ]);

    return Response.json({
      journey: journeyRes.data || [],
      transitions: transRes.data || [],
      errors: [journeyRes.error, transRes.error].filter(Boolean).map(e => e.message),
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
