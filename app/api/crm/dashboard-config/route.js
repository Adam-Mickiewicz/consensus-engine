import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id') || 'default';

  const { data, error } = await supabase
    .from('user_dashboard_config')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .limit(10);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ configs: data || [] });
}

export async function POST(request) {
  const body = await request.json();

  const { data, error } = await supabase
    .from('user_dashboard_config')
    .upsert({
      user_id: body.user_id || 'default',
      config_name: body.config_name || 'Mój dashboard',
      widgets: body.widgets,
      is_default: body.is_default || false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,config_name' })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ config: data });
}
