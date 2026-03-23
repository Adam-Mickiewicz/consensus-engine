import { getServiceClient } from '../supabase/server';

/**
 * Cost per 1M tokens (USD), keyed by model prefix or exact name.
 * Prices provided by project owner.
 */
const PRICE_MAP = {
  // Anthropic
  'claude-opus-4':   { input: 15.00, output: 75.00 },
  'claude-sonnet-4': { input:  3.00, output: 15.00 },
  'claude-haiku-4':  { input:  0.80, output:  4.00 },
  // OpenAI
  'gpt-5.4-mini':    { input:  0.50, output:  1.50 },
  'gpt-4o-mini':     { input:  0.50, output:  1.50 },
  'gpt-5.4':         { input:  2.00, output:  8.00 },
  'gpt-5.3':         { input:  0.50, output:  1.50 },
  // Gemini
  'gemini-2.5-pro':       { input: 1.25, output:  5.00 },
  'gemini-2.5-flash-lite':{ input: 0.025,output:  0.10 },
  'gemini-2.5-flash':     { input: 0.075,output:  0.30 },
};

/** Find the best matching price entry for a model string */
function getPrices(model) {
  // Exact match first
  if (PRICE_MAP[model]) return PRICE_MAP[model];
  // Prefix match (longest wins)
  let best = null;
  let bestLen = 0;
  for (const key of Object.keys(PRICE_MAP)) {
    if (model.startsWith(key) && key.length > bestLen) {
      best = PRICE_MAP[key];
      bestLen = key.length;
    }
  }
  return best ?? { input: 0, output: 0 };
}

/**
 * Fire-and-forget: insert one row into ai_usage_log.
 * Never throws — logging failures must not break the AI call.
 */
export async function logAIUsage({ model, endpoint, inputTokens, outputTokens, error = null }) {
  try {
    const prices = getPrices(model);
    const cost_usd = (inputTokens * prices.input + outputTokens * prices.output) / 1_000_000;

    const sb = getServiceClient();
    await sb.from('ai_usage_log').insert({
      model,
      endpoint: endpoint ?? null,
      input_tokens:  inputTokens,
      output_tokens: outputTokens,
      cost_usd,
      error,
    });
  } catch {
    // swallow — logging must never break the caller
  }
}
