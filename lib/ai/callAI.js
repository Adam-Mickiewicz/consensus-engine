import Anthropic from '@anthropic-ai/sdk';

/**
 * Unified AI call routing:
 *  claude-* → Anthropic SDK
 *  gpt-*    → OpenAI REST API
 *  gemini-* → Gemini REST API
 */
export async function callAI(model, prompt, maxTokens = 2048) {
  if (model.startsWith('claude-')) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
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
      throw new Error(err.error?.message ?? `OpenAI error ${res.status}`);
    }
    const data = await res.json();
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
      throw new Error(err.error?.message ?? `Gemini error ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  throw new Error(`Nieznany model: ${model}`);
}
