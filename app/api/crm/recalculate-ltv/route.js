import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../lib/supabase/server";

export const maxDuration = 60;

// Przetwarza max CHUNK_SIZE klientów na jedno wywołanie.
// Frontend wywołuje kolejno: POST { offset: 0 }, { offset: 5000 }, ...
// aż done === true.
const CHUNK_SIZE = 5000;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const offset = parseInt(body.offset ?? 0);

    const supabase = getServiceClient();

    // Pobierz stronę client_id
    const { data: clientPage, error: pageErr } = await supabase
      .from('clients_360')
      .select('client_id')
      .range(offset, offset + CHUNK_SIZE - 1);
    if (pageErr) throw new Error(pageErr.message);

    if (!clientPage?.length) {
      // Wszystko przeliczone — zwróć finalną sumę
      const { data: sumData } = await supabase.rpc('get_ltv_sums');
      return NextResponse.json({ success: true, done: true, total_ltv: sumData?.ltv_360 ?? 0 });
    }

    const clientIds = clientPage.map(r => r.client_id);

    // Pobierz eventy dla tej strony klientów
    const { data: events, error: evErr } = await supabase
      .from('client_product_events')
      .select('client_id, line_total')
      .in('client_id', clientIds);
    if (evErr) throw new Error(evErr.message);

    // Agreguj LTV per client
    const ltvMap = {};
    for (const ev of events ?? []) {
      ltvMap[ev.client_id] = (ltvMap[ev.client_id] ?? 0) + (parseFloat(ev.line_total) || 0);
    }

    // Upsert
    const BATCH = 200;
    const updates = clientIds.map(id => ({
      client_id: id,
      ltv: Math.round((ltvMap[id] ?? 0) * 100) / 100,
      updated_at: new Date().toISOString(),
    }));
    for (let i = 0; i < updates.length; i += BATCH) {
      const { error } = await supabase
        .from('clients_360')
        .upsert(updates.slice(i, i + BATCH), { onConflict: 'client_id', ignoreDuplicates: false });
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      done: false,
      offset,
      processed: clientIds.length,
      next_offset: offset + CHUNK_SIZE,
    });
  } catch (err) {
    console.error("[recalculate-ltv]", err?.message);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
