import Anthropic from '@anthropic-ai/sdk';
import { logAIUsage } from './logAIUsage';

/**
 * Unified AI call routing:
 *  claude-* → Anthropic SDK
 *  gpt-*    → OpenAI REST API
 *  gemini-* → Gemini REST API
 *
 * @param {string} model
 * @param {string} prompt
 * @param {number} maxTokens
 * @param {string} [endpoint]  — caller label for monitoring (e.g. 'ai-insights', 'sock-brief')
 */
export async function callAI(model, prompt, maxTokens = 2048, endpoint = null) {
  if (model.startsWith('claude-')) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let response;
    try {
      response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (err) {
      logAIUsage({ model, endpoint, inputTokens: 0, outputTokens: 0, error: err.message });
      throw err;
    }
    logAIUsage({
      model,
      endpoint,
      inputTokens:  response.usage?.input_tokens  ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    });
    return response.content.find(b => b.type === 'text')?.text ?? '';
  }

  if (model.startsWith('gpt-')) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message ?? `OpenAI error ${res.status}`;
      logAIUsage({ model, endpoint, inputTokens: 0, outputTokens: 0, error: msg });
      throw new Error(msg);
    }
    const data = await res.json();
    logAIUsage({
      model,
      endpoint,
      inputTokens:  data.usage?.prompt_tokens     ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    });
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (model.startsWith('gemini-')) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message ?? `Gemini error ${res.status}`;
      logAIUsage({ model, endpoint, inputTokens: 0, outputTokens: 0, error: msg });
      throw new Error(msg);
    }
    const data = await res.json();
    logAIUsage({
      model,
      endpoint,
      inputTokens:  data.usageMetadata?.promptTokenCount      ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount  ?? 0,
    });
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  throw new Error(`Nieznany model: ${model}`);
}
