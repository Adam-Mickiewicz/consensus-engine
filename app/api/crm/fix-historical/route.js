import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../lib/supabase/server";
import { segmentClients } from "../../../../lib/crm/etl";

export const maxDuration = 60;

export async function POST() {
  const report = {};
  const supabase = getServiceClient();

  // STEP 1: Fix first_order/last_order/orders_count from events
  try {
    const PAGE = 1000;
    let allEvents = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('client_product_events')
        .select('client_id, order_date, product_name')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      allEvents = allEvents.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // Aggregate per client
    const clientAgg = new Map();
    for (const ev of allEvents) {
      if (!ev.client_id) continue;
      if (!clientAgg.has(ev.client_id)) {
        clientAgg.set(ev.client_id, { firstOrder: null, lastOrder: null, orderDates: new Set() });
      }
      const agg = clientAgg.get(ev.client_id);
      if (ev.order_date) {
        const d = ev.order_date.slice(0, 10);
        if (!agg.firstOrder || d < agg.firstOrder) agg.firstOrder = d;
        if (!agg.lastOrder || d > agg.lastOrder) agg.lastOrder = d;
        agg.orderDates.add(d + '||' + (ev.product_name ?? ''));
      }
    }

    // Upsert fixes in batches
    const BATCH = 200;
    const clientIds = [...clientAgg.keys()];
    let fixedCount = 0;
    for (let i = 0; i < clientIds.length; i += BATCH) {
      const batch = clientIds.slice(i, i + BATCH).map(client_id => {
        const agg = clientAgg.get(client_id);
        return {
          client_id,
          first_order: agg.firstOrder ? new Date(agg.firstOrder).toISOString() : null,
          last_order: agg.lastOrder ? new Date(agg.lastOrder).toISOString() : null,
          orders_count: agg.orderDates.size,
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase
        .from('clients_360')
        .upsert(batch, { onConflict: 'client_id', ignoreDuplicates: false });
      if (error) throw new Error(`fix dates upsert error: ${error.message}`);
      fixedCount += batch.length;
    }
    report.step1 = { ok: true, fixed: fixedCount };
  } catch (err) {
    report.step1 = { ok: false, error: err.message };
  }

  // STEP 2: Recalculate LTV via SQL function
  try {
    const { data: ltvData, error: ltvErr } = await supabase.rpc('recalculate_all_ltv');
    if (ltvErr) throw new Error(ltvErr.message);
    report.step2 = { ok: true, ...ltvData };
  } catch (err) {
    report.step2 = { ok: false, error: err.message };
  }

  // STEP 3: Re-segment all clients
  try {
    const PAGE = 1000;
    let allClients = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('clients_360')
        .select('*')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      allClients = allClients.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const segmented = segmentClients(allClients);

    const BATCH = 200;
    for (let i = 0; i < segmented.length; i += BATCH) {
      const batch = segmented.slice(i, i + BATCH).map(c => ({
        client_id: c.client_id,
        legacy_segment: c.legacy_segment,
        risk_level: c.risk_level,
        winback_priority: c.winback_priority,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('clients_360')
        .upsert(batch, { onConflict: 'client_id', ignoreDuplicates: false });
      if (error) throw new Error(`re-segment upsert error: ${error.message}`);
    }
    report.step3 = { ok: true, clients: segmented.length };
  } catch (err) {
    report.step3 = { ok: false, error: err.message };
  }

  // STEP 4: Refresh views
  try {
    await supabase.rpc('refresh_crm_views');
    report.step4 = { ok: true };
  } catch (err) {
    report.step4 = { ok: false, error: err.message };
  }

  report.step5 = { ok: true, note: 'Sanity checks run via ETL pipeline' };

  return NextResponse.json({ ok: true, report });
}
