/**
 * GET /api/admin/ai-usage
 *
 * PARAMETRY:
 *   (brak)    → summary + last 50 calls + by-model breakdown + daily chart (30d)
 *   ?days=N   → zakres dzienny (domyślnie 30, max 90)
 *   ?limit=N  → limit ostatnich wywołań (domyślnie 50, max 200)
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days  = Math.min(parseInt(searchParams.get('days')  || '30', 10), 90);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const sb = getServiceClient();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const [allRes, recentRes] = await Promise.all([
      // All rows in range (for summary + groupings)
      sb.from('ai_usage_log')
        .select('called_at,model,endpoint,input_tokens,output_tokens,cost_usd,error')
        .gte('called_at', since)
        .order('called_at', { ascending: true }),

      // Last N calls for the table
      sb.from('ai_usage_log')
        .select('id,called_at,endpoint,model,input_tokens,output_tokens,cost_usd,error')
        .order('called_at', { ascending: false })
        .limit(limit),
    ]);

    if (allRes.error) throw new Error(allRes.error.message);

    const rows = allRes.data ?? [];

    // ── Summary ───────────────────────────────────────────────────────────────
    const summary = {
      total_calls:         rows.length,
      total_cost_usd:      rows.reduce((s, r) => s + Number(r.cost_usd), 0),
      total_input_tokens:  rows.reduce((s, r) => s + (r.input_tokens  ?? 0), 0),
      total_output_tokens: rows.reduce((s, r) => s + (r.output_tokens ?? 0), 0),
      error_count:         rows.filter(r => r.error).length,
    };

    // ── By-model breakdown ────────────────────────────────────────────────────
    const modelMap = {};
    for (const r of rows) {
      if (!modelMap[r.model]) {
        modelMap[r.model] = { model: r.model, calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
      }
      const m = modelMap[r.model];
      m.calls++;
      m.input_tokens  += r.input_tokens  ?? 0;
      m.output_tokens += r.output_tokens ?? 0;
      m.cost_usd      += Number(r.cost_usd);
    }
    const by_model = Object.values(modelMap).sort((a, b) => b.cost_usd - a.cost_usd);

    // ── Daily cost (bucketed by UTC date) ─────────────────────────────────────
    const dayMap = {};
    for (const r of rows) {
      const day = r.called_at.slice(0, 10); // "YYYY-MM-DD"
      if (!dayMap[day]) dayMap[day] = { day, calls: 0, cost_usd: 0 };
      dayMap[day].calls++;
      dayMap[day].cost_usd += Number(r.cost_usd);
    }
    const daily = Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day));

    // ── By-endpoint breakdown ─────────────────────────────────────────────────
    const epMap = {};
    for (const r of rows) {
      const ep = r.endpoint ?? '(unknown)';
      if (!epMap[ep]) epMap[ep] = { endpoint: ep, calls: 0, cost_usd: 0 };
      epMap[ep].calls++;
      epMap[ep].cost_usd += Number(r.cost_usd);
    }
    const by_endpoint = Object.values(epMap).sort((a, b) => b.cost_usd - a.cost_usd);

    return NextResponse.json({
      summary,
      recent:      recentRes.data ?? [],
      by_model,
      by_endpoint,
      daily,
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
