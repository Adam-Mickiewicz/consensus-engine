import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Model ID → Google model string
const MODEL_MAP = {
  'veo31':     'veo-3.1-generate-preview',
  'veo31fast': 'veo-3.1-fast-generate-preview',
  'veo3':      'veo-3.0-generate-001',
  'veo3fast':  'veo-3.0-fast-generate-001',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const {
      model_id,
      prompt,
      music_mode,
      music_brief,
      params,
      reference_urls,
      estimated_cost,
    } = body;

    if (!model_id || !prompt?.trim()) {
      return Response.json({ error: 'model_id i prompt są wymagane' }, { status: 400 });
    }

    if (!MODEL_MAP[model_id]) {
      return Response.json({ error: `Model ${model_id} nie obsługuje Veo API` }, { status: 400 });
    }

    const output_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: job, error: jobError } = await supabase
      .from('bms_jobs')
      .insert({
        job_type: 'video',
        model_id,
        status: 'processing',
        prompt: prompt.trim(),
        music_mode: music_mode || 'none',
        music_brief: music_brief || null,
        params: params || {},
        reference_urls: reference_urls || [],
        output_urls: [],
        estimated_cost: estimated_cost || null,
        output_expires_at,
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Fire-and-forget — nie blokuje odpowiedzi
    generateVideoAsync(job.id, model_id, prompt.trim(), params, reference_urls, music_mode, music_brief, estimated_cost);

    return Response.json({ job_id: job.id, status: 'processing' });
  } catch (error) {
    console.error('[generate-video] POST error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function generateVideoAsync(jobId, modelId, prompt, params, referenceUrls, musicMode, musicBrief, estimatedCost) {
  const supabase = getSupabase();

  try {
    const googleModel = MODEL_MAP[modelId];
    if (!googleModel) throw new Error(`Nieznany model: ${modelId}`);

    // Buduj pełny prompt z briefem muzycznym
    let fullPrompt = prompt;
    if (musicMode === 'brief' && musicBrief) {
      fullPrompt += `\n\nMusic: ${musicBrief}`;
    } else if (musicMode === 'none') {
      fullPrompt += '\n\nNo music, no audio.';
    }

    const aspectRatioMap = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' };
    const aspectRatio = aspectRatioMap[params?.orientation] || '9:16';
    const durationSeconds = parseInt(params?.duration) || 8;
    const numberOfVideos = parseInt(params?.variants) || 1;

    const requestBody = {
      model: googleModel,
      prompt: fullPrompt,
      config: {
        aspect_ratio: aspectRatio,
        number_of_videos: numberOfVideos,
        duration_seconds: durationSeconds,
        enhance_prompt: true,
      },
    };

    // Image-to-video: dołącz pierwsze zdjęcie bazowe jako base64
    if (referenceUrls && referenceUrls.length > 0) {
      try {
        const imageRes = await fetch(referenceUrls[0]);
        const imageBuffer = await imageRes.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString('base64');
        const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
        requestBody.image = { image_bytes: base64, mime_type: mimeType };
      } catch (imgErr) {
        console.warn('[generate-video] Could not fetch reference image:', imgErr.message);
      }
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateVideo?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Veo API error ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const operationName = result.name;
    if (!operationName) throw new Error('Brak operation name w odpowiedzi Veo');

    // Polluj status operacji co 15s, max 40 prób (10 minut)
    let videoData = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 15000));

      const opRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
      );
      const opData = await opRes.json();

      if (opData.done) {
        if (opData.error) throw new Error(`Veo operation error: ${opData.error.message}`);
        videoData = opData.response;
        break;
      }
    }

    if (!videoData) throw new Error('Timeout — Veo nie odpowiedział w ciągu 10 minut');

    // Wyciągnij wygenerowane wideo i uploaduj do Storage
    const generatedVideos = videoData.generatedSamples || videoData.videos || [];
    const outputUrls = [];

    for (let i = 0; i < generatedVideos.length; i++) {
      const video = generatedVideos[i];
      const videoUri = video.video?.uri || video.uri;
      const videoBytes = video.video?.videoBytes || video.videoBytes;
      const fileName = `${jobId}_${i}.mp4`;

      try {
        let buffer;
        if (videoBytes) {
          buffer = Buffer.from(videoBytes, 'base64');
        } else if (videoUri) {
          const videoRes = await fetch(videoUri);
          buffer = Buffer.from(await videoRes.arrayBuffer());
        } else {
          console.warn(`[generate-video] No video data for sample ${i}`);
          continue;
        }

        const { error: uploadError } = await supabase.storage
          .from('bms-outputs')
          .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('bms-outputs')
          .getPublicUrl(fileName);

        outputUrls.push(urlData.publicUrl);
      } catch (uploadErr) {
        console.error(`[generate-video] Upload error for sample ${i}:`, uploadErr.message);
      }
    }

    await supabase
      .from('bms_jobs')
      .update({
        status: 'done',
        output_urls: outputUrls,
        thumbnail_url: outputUrls[0] || null,
        actual_cost: estimatedCost || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

  } catch (error) {
    console.error('[generate-video] generateVideoAsync error:', error);
    await supabase
      .from('bms_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
