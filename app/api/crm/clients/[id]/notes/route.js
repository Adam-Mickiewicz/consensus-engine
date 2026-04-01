import { getServiceClient } from '../../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const sb = getServiceClient();
    const { data, error } = await sb
      .from('client_notes')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      // Tabela może nie istnieć — graceful fallback
      if (error.code === '42P01') return Response.json({ notes: [] });
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ notes: data ?? [] });
  } catch (err) {
    return Response.json({ notes: [] });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.note?.trim()) {
      return Response.json({ error: 'note is required' }, { status: 400 });
    }

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('client_notes')
      .insert({
        client_id: id,
        note: body.note.trim(),
        tags: body.tags || [],
        note_type: body.note_type || 'general',
        created_by: body.created_by || 'admin',
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ note: data });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Błąd serwera' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('note_id');

    if (!noteId) return Response.json({ error: 'note_id required' }, { status: 400 });

    const sb = getServiceClient();
    const { error } = await sb
      .from('client_notes')
      .delete()
      .eq('id', noteId)
      .eq('client_id', id);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Błąd serwera' }, { status: 500 });
  }
}
