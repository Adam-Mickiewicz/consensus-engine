import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobType = searchParams.get('job_type') || 'all';
    const limit   = parseInt(searchParams.get('limit') || '20');
    const offset  = parseInt(searchParams.get('offset') || '0');
    const search  = searchParams.get('search') || '';
    const tags    = searchParams.get('tags') || '';

    const sb = getServiceClient();

    let query = sb
      .from('bms_library')
      .select('*', { count: 'exact' });

    if (jobType !== 'all') {
      query = query.eq('job_type', jobType);
    }
    if (search) {
      query = query.or(`prompt.ilike.%${search}%,title.ilike.%${search}%`);
    }
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length) {
        query = query.overlaps('tags', tagList);
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      has_more: (offset + limit) < (count || 0),
    });
  } catch (err) {
    console.error('[brand-media/library] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { job_id, title, tags } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'job_id jest wymagany' }, { status: 400 });
    }

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('bms_jobs')
      .update({ title, tags: tags || [] })
      .eq('id', job_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[brand-media/library] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
