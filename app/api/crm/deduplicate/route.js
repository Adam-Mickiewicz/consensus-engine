import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../lib/supabase/server";
import { recalculateAllLTV } from "../../../../lib/crm/etl";

export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = getServiceClient();

    // Get total count before
    const { count: totalBefore } = await supabase
      .from('client_product_events')
      .select('*', { count: 'exact', head: true });

    // Fetch all events (paginated) and find duplicates in JS
    const PAGE = 1000;
    let allEvents = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('client_product_events')
        .select('id, client_id, ean, order_date, product_name')
        .range(from, from + PAGE - 1)
        .order('id', { ascending: true });
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      allEvents = allEvents.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // Group by (client_id, ean, order_date::date, product_name) — keep min id
    const groupMap = new Map();
    for (const ev of allEvents) {
      const dateKey = ev.order_date ? ev.order_date.slice(0, 10) : 'null';
      const key = `${ev.client_id}||${ev.ean ?? ''}||${dateKey}||${ev.product_name ?? ''}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, ev.id);
      } else {
        // Keep the smaller id
        if (ev.id < groupMap.get(key)) groupMap.set(key, ev.id);
      }
    }

    // IDs to keep
    const keepIds = new Set(groupMap.values());
    const deleteIds = allEvents.map(e => e.id).filter(id => !keepIds.has(id));

    // Delete duplicates in batches of 200
    const BATCH = 200;
    for (let i = 0; i < deleteIds.length; i += BATCH) {
      const batch = deleteIds.slice(i, i + BATCH);
      const { error } = await supabase
        .from('client_product_events')
        .delete()
        .in('id', batch);
      if (error) throw new Error(`delete error: ${error.message}`);
    }

    // Recalculate LTV after dedup
    const ltvResult = await recalculateAllLTV(supabase);

    const remaining = (totalBefore ?? 0) - deleteIds.length;

    return NextResponse.json({
      ok: true,
      deleted: deleteIds.length,
      remaining,
      ltv_after: ltvResult.total_ltv,
    });
  } catch (err) {
    console.error("[deduplicate]", err?.message);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
