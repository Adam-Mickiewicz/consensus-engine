import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PUT(request, context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, description, params, prompt_template, is_shared } = body;

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('bms_presets')
      .update({ name, description, params, prompt_template, is_shared, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[brand-media/presets/[id]] PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    const sb = getServiceClient();

    const { error } = await sb
      .from('bms_presets')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[brand-media/presets/[id]] DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
