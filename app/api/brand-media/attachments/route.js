import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = {
  'image/jpeg':       { type: 'image', maxBytes: 50 * 1024 * 1024 },
  'image/png':        { type: 'image', maxBytes: 50 * 1024 * 1024 },
  'image/webp':       { type: 'image', maxBytes: 50 * 1024 * 1024 },
  'image/svg+xml':    { type: 'svg',   maxBytes: 50 * 1024 * 1024 },
  'application/pdf':  { type: 'pdf',   maxBytes: 100 * 1024 * 1024 },
  'video/mp4':        { type: 'video', maxBytes: 500 * 1024 * 1024 },
  'video/quicktime':  { type: 'video', maxBytes: 500 * 1024 * 1024 },
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const sessionId = formData.get('session_id');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: 'Brak session_id' }, { status: 400 });
    }

    const mimeInfo = ALLOWED_MIME[file.type];
    if (!mimeInfo) {
      return NextResponse.json({ error: `Nieobsługiwany typ pliku: ${file.type}` }, { status: 400 });
    }
    if (file.size > mimeInfo.maxBytes) {
      const maxMB = mimeInfo.maxBytes / (1024 * 1024);
      return NextResponse.json({ error: `Plik za duży (max ${maxMB}MB dla ${mimeInfo.type})` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split('.').pop() || 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `sessions/${sessionId}/${Date.now()}_${safeName}`;

    const sb = getServiceClient();

    const { error: uploadError } = await sb.storage
      .from('bms-references')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = sb.storage
      .from('bms-references')
      .getPublicUrl(storagePath);

    const url = urlData.publicUrl;

    const { data: record, error: insertError } = await sb
      .from('bms_attachments')
      .insert([{
        session_id: sessionId,
        file_name: file.name,
        file_type: mimeInfo.type,
        mime_type: file.type,
        storage_path: storagePath,
        url,
        size_bytes: file.size,
      }])
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({
      id: record.id,
      url: record.url,
      file_name: record.file_name,
      file_type: record.file_type,
      mime_type: record.mime_type,
      size_bytes: record.size_bytes,
    });
  } catch (err) {
    console.error('[brand-media/attachments] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Brak id' }, { status: 400 });

    const sb = getServiceClient();

    const { data: record, error: fetchError } = await sb
      .from('bms_attachments')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    await sb.storage.from('bms-references').remove([record.storage_path]);

    const { error: deleteError } = await sb
      .from('bms_attachments')
      .delete()
      .eq('id', id);

    if (deleteError) throw new Error(deleteError.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[brand-media/attachments] DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return NextResponse.json({ attachments: [] });

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('bms_attachments')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ attachments: data || [] });
  } catch (err) {
    console.error('[brand-media/attachments] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
