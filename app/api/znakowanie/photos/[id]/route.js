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

export async function PATCH(request, context) {
  const { id } = await context.params;
  const { description } = await request.json();
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('znakowanie_photos')
    .update({ description })
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
