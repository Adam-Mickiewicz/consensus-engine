import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MODEL_MAP = {
  'veo31':     'veo-3.0-generate-001',
  'veo31fast': 'veo-3.0-fast-generate-001',
  'veo3':      'veo-3.0-generate-001',
  'veo3fast':  'veo-3.0-fast-generate-001',
};

const SORA_MAP = {
  'sora2':    'sora-2',
  'sora2pro': 'sora-2-pro',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Pobierz jeden queued job (najstarszy)
  const { data: job } = await supabase
    .from('bms_jobs')
    .select('*')
    .eq('job_type', 'video')
    .in('status', ['queued', 'processing'])
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!job) {
    return Response.json({ message: 'Brak jobów w kolejce' });
  }

  // Oznacz jako processing (jeśli jeszcze queued)
  if (job.status === 'queued') {
    await supabase
      .from('bms_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', job.id);
  }

  try {
    let outputUrls = [];

    if (SORA_MAP[job.model_id]) {
      // === SORA ===
      const soraModel = SORA_MAP[job.model_id];
      const aspectRatioMap = {
        '16:9': '1280x720',
        '9:16': '720x1280',
        '1:1':  '1280x720',
      };
      const resolution = aspectRatioMap[job.params?.orientation] || '1080x1920';
      const duration = parseInt(job.params?.duration) || 8;

      let fullPrompt = job.prompt || '';
      if (job.music_mode === 'brief' && job.music_brief) {
        fullPrompt += `\n\nBackground music: ${job.music_brief}`;
      }

      const externalJobId = job.params?.external_job_id;

      if (externalJobId) {
        // Polluj istniejący job Sora
        const statusRes = await fetch(
          `https://api.openai.com/v1/videos/${externalJobId}`,
          { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
        );
        const statusData = await statusRes.json();

        if (statusData.status === 'completed') {
          const videos = statusData.data || [];
          for (let i = 0; i < videos.length; i++) {
            const videoUrl = videos[i]?.url;
            if (!videoUrl) continue;
            const videoRes = await fetch(videoUrl);
            const videoBuffer = await videoRes.arrayBuffer();
            const fileName = `${job.id}_${i}.mp4`;
            await supabase.storage
              .from('bms-outputs')
              .upload(fileName, Buffer.from(videoBuffer), { contentType: 'video/mp4', upsert: true });
            const { data: urlData } = supabase.storage
              .from('bms-outputs')
              .getPublicUrl(fileName);
            outputUrls.push(urlData.publicUrl);
          }
          await supabase.from('bms_jobs').update({
            status: 'done',
            output_urls: outputUrls,
            thumbnail_url: outputUrls[0] || null,
            updated_at: new Date().toISOString(),
          }).eq('id', job.id);
          return Response.json({ message: `Job ${job.id} gotowy, outputs: ${outputUrls.length}` });

        } else if (statusData.status === 'failed') {
          throw new Error(`Sora job failed: ${statusData.error || 'unknown'}`);
        } else {
          // Nadal w toku
          return Response.json({ message: `Job ${job.id} w toku (Sora status: ${statusData.status})` });
        }

      } else {
        // Pierwsze wywołanie — uruchom Sora
        const formData = new FormData();
        formData.append('model', soraModel);
        formData.append('prompt', fullPrompt);
        formData.append('size', resolution);
        formData.append('seconds', String(duration));

        if (job.reference_urls && job.reference_urls.length > 0) {
          try {
            const imageRes = await fetch(job.reference_urls[0]);
            const imageBlob = await imageRes.blob();
            formData.append('image', imageBlob, 'reference.jpg');
          } catch (imgErr) {
            console.warn('[cron/sora] Could not fetch reference image:', imgErr.message);
          }
        }

        const createRes = await fetch('https://api.openai.com/v1/videos', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
          body: formData,
        });

        if (!createRes.ok) {
          const err = await createRes.text();
          throw new Error(`Sora API error ${createRes.status}: ${err}`);
        }

        const createData = await createRes.json();
        const soraJobId = createData.id;
        if (!soraJobId) throw new Error('Brak job ID z Sora');

        await supabase.from('bms_jobs').update({
          params: { ...job.params, external_job_id: soraJobId },
          updated_at: new Date().toISOString(),
        }).eq('id', job.id);

        return Response.json({ message: `Job ${job.id} uruchomiony w Sora (${soraJobId})` });
      }

    } else if (MODEL_MAP[job.model_id]) {
      // === VEO ===
      const googleModel = MODEL_MAP[job.model_id];
      const aspectRatioMap = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' };
      const aspectRatio = aspectRatioMap[job.params?.orientation] || '9:16';
      const durationSeconds = parseInt(job.params?.duration) || 8;

      let fullPrompt = job.prompt || '';
      if (job.music_mode === 'brief' && job.music_brief) {
        fullPrompt += `\n\nMusic: ${job.music_brief}`;
      } else if (job.music_mode === 'none') {
        fullPrompt += '\n\nNo music, no audio.';
      }

      const externalJobId = job.params?.external_job_id;

      if (externalJobId) {
        // Polluj istniejącą operację Veo
        const opRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${externalJobId}?key=${process.env.GOOGLE_AI_API_KEY}`
        );
        const opData = await opRes.json();

        if (!opData.done) {
          return Response.json({ message: `Job ${job.id} w toku (Veo czeka...)` });
        }

        if (opData.error) throw new Error(`Veo error: ${opData.error.message}`);

        console.log('Veo operation done, full response:', JSON.stringify(opData.response, null, 2));

        const generatedVideos = opData.response?.videos ||
                                opData.response?.generatedSamples ||
                                opData.response?.predictions ||
                                [];

        console.log('generatedVideos count:', generatedVideos.length);
        console.log('first video keys:', generatedVideos[0] ? Object.keys(generatedVideos[0]) : 'none');
        for (let i = 0; i < generatedVideos.length; i++) {
          const video = generatedVideos[i];
          const videoBytes = video.bytesBase64Encoded || video.video?.bytesBase64Encoded;
          const videoUri = video.uri || video.video?.uri;
          const fileName = `${job.id}_${i}.mp4`;

          let buffer;
          if (videoBytes) {
            buffer = Buffer.from(videoBytes, 'base64');
          } else if (videoUri) {
            const vRes = await fetch(videoUri);
            buffer = Buffer.from(await vRes.arrayBuffer());
          } else {
            console.warn(`[cron/veo] No video data for sample ${i}`);
            continue;
          }

          await supabase.storage
            .from('bms-outputs')
            .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true });
          const { data: urlData } = supabase.storage
            .from('bms-outputs')
            .getPublicUrl(fileName);
          outputUrls.push(urlData.publicUrl);
        }

        await supabase.from('bms_jobs').update({
          status: 'done',
          output_urls: outputUrls,
          thumbnail_url: outputUrls[0] || null,
          updated_at: new Date().toISOString(),
        }).eq('id', job.id);

        return Response.json({ message: `Job ${job.id} gotowy, outputs: ${outputUrls.length}` });

      } else {
        // Pierwsze wywołanie — uruchom Veo
        const requestBody = {
          instances: [{ prompt: fullPrompt }],
          parameters: {
            aspectRatio,
            sampleCount: parseInt(job.params?.variants) || 1,
            durationSeconds,
          },
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:predictLongRunning?key=${process.env.GOOGLE_AI_API_KEY}`;
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
        if (!operationName) throw new Error('Brak operation name z Veo');

        await supabase.from('bms_jobs').update({
          params: { ...job.params, external_job_id: operationName },
          updated_at: new Date().toISOString(),
        }).eq('id', job.id);

        return Response.json({ message: `Job ${job.id} uruchomiony w Veo (${operationName})` });
      }

    } else {
      throw new Error(`Nieznany model: ${job.model_id}`);
    }

  } catch (error) {
    console.error('[cron/process-video-jobs] error:', error);
    await supabase.from('bms_jobs').update({
      status: 'failed',
      error_message: error.message,
      updated_at: new Date().toISOString(),
    }).eq('id', job.id);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
