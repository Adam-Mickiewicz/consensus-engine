import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// Jednorazowy endpoint do upsert modeli wideo w bms_model_config
// GET /api/admin/seed-models?secret=CRON_SECRET

const MODELS = [
  {
    model_id: 'veo31',
    model_name: 'Veo 3.1',
    provider: 'google',
    category: 'video',
    price_per_unit: 0.075,
    unit_label: 'sek',
    badge: 'New',
    badge_color: 'green',
    is_active: true,
    capabilities: {
      orientations: ['9:16', '16:9'],
      durations: [5, 8, 10],
      resolutions: ['720p', '1080p'],
      extend: true,
      extend_max_seconds: 120,
    },
  },
  {
    model_id: 'veo31fast',
    model_name: 'Veo 3.1 Fast',
    provider: 'google',
    category: 'video',
    price_per_unit: 0.04,
    unit_label: 'sek',
    badge: 'Fast',
    badge_color: 'amber',
    is_active: true,
    capabilities: {
      orientations: ['9:16', '16:9'],
      durations: [5, 8, 10],
      resolutions: ['720p', '1080p'],
      extend: true,
      extend_max_seconds: 120,
    },
  },
  // Aktualizuj Sora z flagą extend
  {
    model_id: 'sora2',
    model_name: 'Sora 2',
    provider: 'openai',
    category: 'video',
    price_per_unit: 0.04,
    unit_label: 'sek',
    badge: null,
    badge_color: 'purple',
    is_active: true,
    capabilities: {
      orientations: ['16:9', '9:16', '1:1'],
      durations: [5, 8, 10, 15, 20],
      resolutions: ['720p', '1080p'],
      extend: true,
      extend_max_seconds: 120,
    },
  },
  {
    model_id: 'sora2pro',
    model_name: 'Sora 2 Pro',
    provider: 'openai',
    category: 'video',
    price_per_unit: 0.06,
    unit_label: 'sek',
    badge: 'Pro',
    badge_color: 'purple',
    is_active: true,
    capabilities: {
      orientations: ['16:9', '9:16', '1:1'],
      durations: [5, 8, 10, 15, 20],
      resolutions: ['720p', '1080p'],
      extend: true,
      extend_max_seconds: 120,
    },
  },
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getServiceClient();
  const results = [];

  for (const model of MODELS) {
    const { data, error } = await sb
      .from('bms_model_config')
      .upsert(model, { onConflict: 'model_id' })
      .select()
      .single();

    results.push({ model_id: model.model_id, ok: !error, error: error?.message });
  }

  return NextResponse.json({ results });
}
