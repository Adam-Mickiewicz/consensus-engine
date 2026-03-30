import { getServiceClient } from '../../../../../lib/supabase/server';

export async function POST(request) {
  const supabase = getServiceClient();
  const photos = await request.json();
  if (!photos?.length) return Response.json([]);

  const { data, error } = await supabase
    .from('znakowanie_photos')
    .insert(photos)
    .select();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
