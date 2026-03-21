// app/api/etl/run/route.js
// Live sync z Shoper API — uruchamiany przez Vercel Cron lub ręcznie.
// Autoryzacja: nagłówek Authorization: Bearer <CRON_SECRET> lub <SYNC_SECRET>

import { createClient } from "@supabase/supabase-js";
import { getShoperToken, fetchNewOrdersSince } from "../../../../lib/crm/shoper";
import { runETLPipeline } from "../../../../lib/crm/etl";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function isAuthorized(request) {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  return (
    (process.env.CRON_SECRET && token === process.env.CRON_SECRET) ||
    (process.env.SYNC_SECRET  && token === process.env.SYNC_SECRET)
  );
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Pobierz datę ostatniego udanego runu shoper_api
  const { data: lastRun } = await supabase
    .from("sync_log")
    .select("triggered_at, meta")
    .eq("source", "shoper_api")
    .eq("status", "success")
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Domyślnie 30 dni wstecz przy pierwszym uruchomieniu
  const sinceDate = lastRun?.meta?.last_order_date
    ?? lastRun?.triggered_at?.slice(0, 10)
    ?? new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);

  let result;
  let token;

  try {
    token = await getShoperToken();
  } catch (err) {
    await supabase.from("sync_log").insert({
      source: "shoper_api",
      status: "error",
      rows_upserted: 0,
      error_message: `Auth failed: ${err.message}`,
    }).catch(() => {});
    return Response.json({ error: `Shoper auth error: ${err.message}` }, { status: 502 });
  }

  try {
    const orders = await fetchNewOrdersSince(undefined, token, sinceDate);

    if (orders.length === 0) {
      await supabase.from("sync_log").insert({
        source: "shoper_api",
        status: "success",
        rows_upserted: 0,
        meta: { since: sinceDate, orders_fetched: 0 },
      }).catch(() => {});
      return Response.json({ ok: true, processed: 0, message: "Brak nowych zamówień." });
    }

    result = await runETLPipeline(orders, supabase, "shoper_api");

    // Zanotuj datę ostatniego zamówienia w tej partii
    const maxDate = orders
      .map((o) => o.date)
      .filter(Boolean)
      .sort()
      .at(-1) ?? sinceDate;

    await supabase.from("sync_log").insert({
      source: "shoper_api",
      status: "success",
      rows_upserted: result.processed,
      meta: {
        since: sinceDate,
        orders_fetched: orders.length,
        last_order_date: maxDate,
        clients_upserted: result.clients,
        unmapped: result.unmapped,
      },
    }).catch(() => {});

    return Response.json({ ok: true, ...result });
  } catch (err) {
    await supabase.from("sync_log").insert({
      source: "shoper_api",
      status: "error",
      rows_upserted: 0,
      error_message: err.message?.slice(0, 1000),
      meta: { since: sinceDate },
    }).catch(() => {});

    return Response.json(
      { error: `ETL error: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ error: "Method not allowed." }, { status: 405 });
}
