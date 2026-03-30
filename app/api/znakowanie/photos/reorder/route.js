import { getServiceClient } from '../../../../../lib/supabase/server';

export async function POST(request) {
  const updates = await request.json(); // [{ id, sort_order }, ...]
  const supabase = getServiceClient();

  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from('znakowanie_photos').update({ sort_order }).eq('id', id)
    )
  );

  return Response.json({ ok: true });
}
