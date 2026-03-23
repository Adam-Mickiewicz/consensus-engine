/**
 * GET /api/crm/predictive
 *
 * Predictive Analytics — dane z widoków crm_predictive_*
 *
 * PARAMETRY:
 *   (brak)          → summary + top 20 buying_soon
 *   ?view=calendar  → dane crm_next_purchase_calendar (wykres słupkowy)
 *   ?view=high_prob → top 50 purchase_probability_30d >= 70
 *   ?view=overdue   → top 50 days_to_next_order < 0 (spóźnieni)
 *   ?view=top_ltv   → top 50 predicted_ltv_12m DESC
 *   ?client_id=XXX  → predykcja dla konkretnego klienta
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const view      = searchParams.get('view')      || '';
    const client_id = searchParams.get('client_id') || '';

    const sb = getServiceClient();

    // ── Pojedynczy klient ─────────────────────────────────────────────────────
    if (client_id) {
      const { data, error } = await sb
        .from('crm_predictive_ltv')
        .select('*')
        .eq('client_id', client_id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return NextResponse.json({ client: data ?? null });
    }

    // ── Kalendarz przychodów ─────────────────────────────────────────────────
    if (view === 'calendar') {
      const { data, error } = await sb
        .from('crm_next_purchase_calendar')
        .select('week,clients,expected_revenue');

      if (error) throw new Error(error.message);
      return NextResponse.json({ calendar: data ?? [] });
    }

    // ── Wysokie prawdopodobieństwo (>= 70%) ──────────────────────────────────
    if (view === 'high_prob') {
      const { data, error } = await sb
        .from('crm_predictive_ltv')
        .select('client_id,legacy_segment,risk_level,predicted_next_order,days_to_next_order,purchase_probability_30d,avg_order_value,predicted_ltv_12m,current_ltv')
        .gte('purchase_probability_30d', 70)
        .order('purchase_probability_30d', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return NextResponse.json({ clients: data ?? [] });
    }

    // ── Spóźnieni — powinni kupić ale nie kupili ──────────────────────────────
    if (view === 'overdue') {
      const { data, error } = await sb
        .from('crm_predictive_ltv')
        .select('client_id,legacy_segment,risk_level,predicted_next_order,days_to_next_order,purchase_probability_30d,avg_order_value,predicted_ltv_12m,current_ltv')
        .lt('days_to_next_order', 0)
        .order('days_to_next_order', { ascending: true }) // najdłużej spóźnieni pierwsi
        .limit(50);

      if (error) throw new Error(error.message);
      return NextResponse.json({ clients: data ?? [] });
    }

    // ── Top predykcje LTV ────────────────────────────────────────────────────
    if (view === 'top_ltv') {
      const { data, error } = await sb
        .from('crm_predictive_ltv')
        .select('client_id,legacy_segment,risk_level,current_ltv,predicted_ltv_12m,avg_order_value,orders_count,avg_days_between_orders')
        .not('predicted_ltv_12m', 'is', null)
        .order('predicted_ltv_12m', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return NextResponse.json({ clients: data ?? [] });
    }

    // ── Domyślnie: summary + buying_soon top 20 ───────────────────────────────
    const [summaryRes, buyingSoonRes] = await Promise.all([
      sb.from('crm_predictive_summary').select('*').single(),
      sb.from('crm_predictive_ltv')
        .select('client_id,legacy_segment,risk_level,predicted_next_order,days_to_next_order,purchase_probability_30d,avg_order_value')
        .gte('days_to_next_order', 0)
        .lte('days_to_next_order', 30)
        .order('days_to_next_order', { ascending: true })
        .limit(20),
    ]);

    if (summaryRes.error) throw new Error(summaryRes.error.message);

    return NextResponse.json({
      summary:     summaryRes.data    ?? null,
      buying_soon: buyingSoonRes.data ?? [],
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
