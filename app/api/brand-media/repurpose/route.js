import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const FORMAT_DIMENSIONS = {
  '1:1':  { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '3:4':  { width: 1080, height: 1440 },
  '16:9': { width: 1920, height: 1080 },
  '4:3':  { width: 1440, height: 1080 },
};

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      image_url,
      formats = ['1:1', '9:16', '3:4', '16:9'],
      background_color = '#ffffff',
    } = body;

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    // Fetch source image
    const imgResponse = await fetch(image_url);
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image: ${imgResponse.status}`);
    }
    const imageBuffer = Buffer.from(await imgResponse.arrayBuffer());

    const sb = getServiceClient();
    const outputs = [];

    for (const format of formats) {
      const dims = FORMAT_DIMENSIONS[format];
      if (!dims) continue;

      // Parse background color (hex → rgb)
      const hex = background_color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 255;
      const g = parseInt(hex.substring(2, 4), 16) || 255;
      const b = parseInt(hex.substring(4, 6), 16) || 255;

      const outputBuffer = await sharp(imageBuffer)
        .resize(dims.width, dims.height, {
          fit: 'contain',
          background: { r, g, b, alpha: 1 },
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Upload to Supabase Storage
      const filename = `repurpose_${Date.now()}_${format.replace(':', 'x')}.jpg`;
      const { error: uploadError } = await sb.storage
        .from('bms-outputs')
        .upload(filename, outputBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error(`Upload error for ${format}:`, uploadError);
        continue;
      }

      const { data: urlData } = sb.storage
        .from('bms-outputs')
        .getPublicUrl(filename);

      outputs.push({
        format,
        url: urlData.publicUrl,
        width: dims.width,
        height: dims.height,
        filename,
      });
    }

    return NextResponse.json({ outputs });
  } catch (err) {
    console.error('[brand-media/repurpose] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
