// SQL to create the table (run once in Supabase dashboard):
//
// CREATE TABLE znakowanie_photos (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   section text NOT NULL,
//   url text NOT NULL,
//   alt text NOT NULL DEFAULT '',
//   sort_order integer DEFAULT 0,
//   created_at timestamptz DEFAULT now()
// );

import { getServiceClient } from '../../../../lib/supabase/server';

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('znakowanie_photos')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return Response.json({});

  const grouped = {};
  for (const photo of data || []) {
    if (!grouped[photo.section]) grouped[photo.section] = [];
    grouped[photo.section].push(photo);
  }
  return Response.json(grouped);
}

export async function POST(request) {
  const supabase = getServiceClient();
  const { section, url, alt, description = '', sort_order = 0 } = await request.json();

  const { data, error } = await supabase
    .from('znakowanie_photos')
    .insert([{ section, url, alt: alt || url, description, sort_order }])
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
