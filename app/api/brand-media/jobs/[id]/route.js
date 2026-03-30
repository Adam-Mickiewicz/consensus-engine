import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    const sb = getServiceClient();

    const { error } = await sb
      .from('bms_jobs')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[brand-media/jobs/[id]] DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const sb = getServiceClient();

    const { data, error } = await sb
      .from('bms_jobs')
      .select(`
        *, bms_model_config ( model_name, provider, category )
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ job: data });
  } catch (err) {
    console.error('[brand-media/jobs/[id]] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
