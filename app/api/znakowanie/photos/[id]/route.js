import { getServiceClient } from '../../../../../lib/supabase/server';

export async function DELETE(request, context) {
  const { id } = await context.params;
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('znakowanie_photos')
    .delete()
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
