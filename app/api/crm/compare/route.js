import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  const body = await request.json();

  const { data, error } = await supabase.rpc('get_compare_audiences', {
    p_group_a_segments: body.group_a?.segments?.length ? body.group_a.segments : null,
    p_group_a_risks: body.group_a?.risks?.length ? body.group_a.risks : null,
    p_group_a_worlds: body.group_a?.worlds?.length ? body.group_a.worlds : null,
    p_group_b_segments: body.group_b?.segments?.length ? body.group_b.segments : null,
    p_group_b_risks: body.group_b?.risks?.length ? body.group_b.risks : null,
    p_group_b_worlds: body.group_b?.worlds?.length ? body.group_b.worlds : null,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
