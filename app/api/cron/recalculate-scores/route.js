import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [rfm, pred] = await Promise.all([
    supabase.rpc('recalculate_rfm_scores'),
    supabase.rpc('recalculate_predictive_scores'),
  ]);

  // Refresh matviews after scoring
  await supabase.rpc('refresh_view_rfm_distribution');

  return Response.json({
    rfm: rfm.error ? { error: rfm.error.message } : rfm.data,
    predictive: pred.error ? { error: pred.error.message } : pred.data,
    timestamp: new Date().toISOString(),
  });
}
