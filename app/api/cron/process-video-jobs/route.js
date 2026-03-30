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

        console.log('Sora status response:', JSON.stringify(statusData, null, 2));
        if (statusData.status === 'completed') {
          // Sora nie zwraca URL w status response
          // Trzeba pobrać content bezpośrednio przez osobny endpoint
          const videoId = statusData.id;

          const downloadRes = await fetch(
            `https://api.openai.com/v1/videos/${videoId}/content`,
            { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
          );

          if (!downloadRes.ok) {
            // Spróbuj alternatywnego endpointu
            const downloadRes2 = await fetch(
              `https://api.openai.com/v1/videos/${videoId}`,
              { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
            );
            const data2 = await downloadRes2.json();
            console.log('Sora video full data:', JSON.stringify(data2, null, 2));
            throw new Error(`Sora download failed: ${downloadRes.status}`);
          }

          const videoBuffer = await downloadRes.arrayBuffer();
          console.log('Sora video buffer size:', videoBuffer.byteLength);

          const fileName = `${job.id}_0.mp4`;
          await supabase.storage
            .from('bms-outputs')
            .upload(fileName, Buffer.from(videoBuffer), { contentType: 'video/mp4', upsert: true });

          const { data: urlData } = supabase.storage
            .from('bms-outputs')
            .getPublicUrl(fileName);

          outputUrls.push(urlData.publicUrl);

          await supabase.from('bms_jobs').update({
            status: 'done',
            output_urls: outputUrls,
            thumbnail_url: outputUrls[0] || null,
            updated_at: new Date().toISOString(),
          }).eq('id', job.id);
          return Response.json({ message: `Job ${job.id} gotowy, outputs: ${outputUrls.length}` });

        } else if (statusData.status === 'failed') {
          const errMsg = typeof statusData.error === 'object'
            ? JSON.stringify(statusData.error)
            : (statusData.error || 'unknown');
          throw new Error(`Sora job failed: ${errMsg}`);
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
        console.log('response keys:', Object.keys(opData.response || {}));
        console.log('generateVideoResponse:', JSON.stringify(opData.response?.generateVideoResponse, null, 2));

        const generatedVideos = opData.response?.generateVideoResponse?.generatedSamples ||
                                opData.response?.generatedSamples ||
                                opData.response?.videos ||
                                [];

        console.log('generatedVideos array:', JSON.stringify(generatedVideos, null, 2));
        console.log('generatedVideos length:', generatedVideos.length);
        console.log('first video keys:', generatedVideos[0] ? Object.keys(generatedVideos[0]) : 'none');
        for (let i = 0; i < generatedVideos.length; i++) {
          const video = generatedVideos[i];
          const videoUri = video.video?.uri || video.uri;
          const videoBytes = video.video?.bytesBase64Encoded || video.bytesBase64Encoded;
          const fileName = `${job.id}_${i}.mp4`;

          let buffer;
          if (videoBytes) {
            buffer = Buffer.from(videoBytes, 'base64');
          } else if (videoUri) {
            const vRes = await fetch(
              `${videoUri}${videoUri.includes('?') ? '&' : '?'}alt=media&key=${process.env.GOOGLE_AI_API_KEY}`
            );
            if (!vRes.ok) {
              console.error('Video download error:', vRes.status, await vRes.text());
              throw new Error(`Nie udało się pobrać wideo z Veo: ${vRes.status}`);
            }
            const contentType = vRes.headers.get('content-type') || 'video/mp4';
            console.log('Video content-type:', contentType, 'size:', vRes.headers.get('content-length'));
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

    } else if (job.job_type === 'image') {
      const IMAGE_MODEL_MAP = {
        'imagen4fast':  'imagen-4.0-fast-generate-001',
        'imagen4':      'imagen-4.0-generate-001',
        'imagen4ultra': 'imagen-4.0-ultra-generate-001',
        'imagen3':      'imagen-3.0-generate-002',
      };
      const googleModel = IMAGE_MODEL_MAP[job.model_id];
      if (!googleModel) throw new Error(`Nieznany model obrazu: ${job.model_id}`);

      const requestBody = {
        instances: [{ prompt: job.prompt || '' }],
        parameters: {
          sampleCount: parseInt(job.params?.variants) || 1,
          aspectRatio: job.params?.orientation || '1:1',
        },
      };

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:predict?key=${process.env.GOOGLE_AI_API_KEY}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Imagen API error ${response.status}: ${errText}`);
      }

      const result = await response.json();
      const predictions = result.predictions || [];

      for (let i = 0; i < predictions.length; i++) {
        const imageBytes = predictions[i].bytesBase64Encoded;
        if (!imageBytes) continue;
        const buffer = Buffer.from(imageBytes, 'base64');
        const fileName = `${job.id}_${i}.png`;
        await supabase.storage
          .from('bms-outputs')
          .upload(fileName, buffer, { contentType: 'image/png', upsert: true });
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

    } else {
      throw new Error(`Nieznany typ joba: ${job.job_type} / model: ${job.model_id}`);
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
