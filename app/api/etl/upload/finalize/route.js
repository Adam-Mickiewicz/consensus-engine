// app/api/etl/upload/finalize/route.js
// Finalizuje chunked upload: scala zebraną zawartość i uruchamia ETL pipeline.
// Wywoływany przez frontend po wysłaniu wszystkich chunków do /api/etl/upload.

import { createClient } from "@supabase/supabase-js";
import { assembleFiles, clearSession } from "../../../../../lib/crm/chunkBuffer";
import { parseShoperCSV } from "../../../../../lib/crm/csvParser";
import { runETLPipeline } from "../../../../../lib/crm/etl";

export const maxDuration = 60;
export const runtime = "nodejs";

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
  const filesArray = await assembleFiles(session_id, filenames);

  console.log("[ETL finalize] assembleFiles result:", filesArray?.map(f => ({ name: f.name, contentLength: f.content?.length })));

  if (!filesArray) {
    return Response.json(
      { error: "Nie znaleziono zebranych chunków. Wyślij wszystkie chunki przed finalizacją." },
      { status: 400 }
    );
  }

  // ── ETL pipeline — przetwarzaj każdy plik osobno ──────────────────────────────
  const supabase = getServiceClient();

  let totalClients = 0;
  let totalLineItems = 0;
  let totalUnmapped = 0;
  let processedFiles = 0;

  for (const { name, content } of filesArray) {
    let rows;
    try {
      rows = parseShoperCSV(content, name);
    } catch (err) {
      console.error(`[ETL finalize] Błąd parsowania ${name}:`, err.message);
      continue;
    }

    console.log("[ETL finalize] processing file:", name, "rows:", rows.length);

    if (rows.length === 0) {
      console.warn(`[ETL finalize] Plik ${name} nie zawiera danych, pomijam.`);
      continue;
    }

    try {
      const result = await runETLPipeline(rows, supabase, name);
      totalLineItems += result.processed ?? 0;
      totalClients  += result.clients   ?? 0;
      totalUnmapped += result.unmapped  ?? 0;
      processedFiles++;
    } catch (err) {
      console.error(`[ETL finalize] FULL ERROR (${name}):`, err?.message);
      console.error(`[ETL finalize] STACK:`, err?.stack);

      await supabase.from("sync_log").insert({
        source: "csv_upload",
        status: "error",
        rows_upserted: 0,
        error_message: err.message?.slice(0, 1000),
        meta: { file: name, uploaded_by: user.id },
      });

      return Response.json({ error: `ETL error (${name}): ${err.message}` }, { status: 500 });
    }

    // Odśwież widoki po każdym pliku
    await supabase.rpc("refresh_crm_views");
  }

  if (processedFiles === 0) {
    return Response.json({ error: "Żaden plik nie zawierał danych." }, { status: 400 });
  }

  await supabase.from("sync_log").insert({
    source: "csv_upload",
    status: "success",
    rows_upserted: totalLineItems,
    meta: {
      files: filenames,
      processed_files: processedFiles,
      clients_upserted: totalClients,
      unmapped: totalUnmapped,
      uploaded_by: user.id,
    },
  });

  return Response.json({
    ok: true,
    processed_files: processedFiles,
    total_clients: totalClients,
    total_line_items: totalLineItems,
    unmapped: totalUnmapped,
  });
}

export async function GET() {
  return Response.json({ error: "Method not allowed." }, { status: 405 });
}
