// app/api/etl/upload/finalize/route.js
// Finalizuje chunked upload: scala zebraną zawartość i uruchamia ETL pipeline.
// Wywoływany przez frontend po wysłaniu wszystkich chunków do /api/etl/upload.

import { createClient } from "@supabase/supabase-js";
import { assembleFiles, clearSession } from "../../../../../lib/crm/chunkBuffer";
import { mergeMultipleCSVs } from "../../../../../lib/crm/csvParser";
import { runETLPipeline } from "../../../../../lib/crm/etl";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

function getUserClient(jwt) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    }
  );
}

export async function POST(request) {
  // ── Autoryzacja ─────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!jwt) {
    return Response.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  const userClient = getUserClient(jwt);
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Sesja wygasła." }, { status: 401 });
  }

  // TODO: przywrócić sprawdzanie uprawnień po weryfikacji ETL
  // const { data: perms } = await userClient
  //   .from("user_permissions")
  //   .select("access_level, category")
  //   .in("category", ["admin", "crm"])
  //   .eq("access_level", "write");
  //
  // const canImport =
  //   perms?.some((p) => p.category === "admin") ||
  //   perms?.some((p) => p.category === "crm");
  //
  // if (!canImport) {
  //   return Response.json({ error: "Brak uprawnień do importu danych." }, { status: 403 });
  // }

  // ── Body ──────────────────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nieprawidłowy JSON." }, { status: 400 });
  }

  const { session_id, filenames } = body ?? {};

  if (!session_id || !Array.isArray(filenames) || filenames.length === 0) {
    return Response.json({ error: "Brak session_id lub filenames." }, { status: 400 });
  }

  // ── Składanie chunków ─────────────────────────────────────────────────────────
  const filesArray = assembleFiles(session_id, filenames);

  if (!filesArray) {
    return Response.json(
      { error: "Nie znaleziono zebranych chunków. Wyślij wszystkie chunki przed finalizacją." },
      { status: 400 }
    );
  }

  clearSession(session_id);

  // ── ETL pipeline ──────────────────────────────────────────────────────────────
  const supabase = getServiceClient();

  let result;
  try {
    const mergedRows = mergeMultipleCSVs(filesArray);

    if (mergedRows.length === 0) {
      return Response.json({ error: "Pliki nie zawierają danych." }, { status: 400 });
    }

    result = await runETLPipeline(mergedRows, supabase, filenames.join(", "));

    await supabase.from("sync_log").insert({
      source: "csv_upload",
      status: "success",
      rows_upserted: result.processed,
      meta: {
        files: filenames,
        clients_upserted: result.clients,
        unmapped: result.unmapped,
        uploaded_by: user.id,
      },
    }).catch(() => {});
  } catch (err) {
    console.error("[ETL finalize] FULL ERROR:", err?.message);
    console.error("[ETL finalize] STACK:", err?.stack);

    await supabase.from("sync_log").insert({
      source: "csv_upload",
      status: "error",
      rows_upserted: 0,
      error_message: err.message?.slice(0, 1000),
      meta: { files: filenames, uploaded_by: user.id },
    }).catch(() => {});

    return Response.json({ error: `ETL error: ${err.message}` }, { status: 500 });
  }

  return Response.json({
    ok: true,
    processed: result.processed,
    unmapped: result.unmapped,
    clients: result.clients,
    events: result.events,
  });
}

export async function GET() {
  return Response.json({ error: "Method not allowed." }, { status: 405 });
}
