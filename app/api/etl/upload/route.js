// app/api/etl/upload/route.js
// Przyjmuje jeden plik CSV jako multipart/form-data (pole "file").
// Parsuje i przepuszcza przez pełny ETL pipeline. Jeden request = jeden plik.

import { createClient } from "@supabase/supabase-js";
import { parseShoperCSV } from "../../../../lib/crm/csvParser";
import { runETLPipeline } from "../../../../lib/crm/etl";

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

  // ── Odczyt pliku ─────────────────────────────────────────────────────────────
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Nieprawidłowe multipart/form-data." }, { status: 400 });
  }

  const keys = [...formData.keys()];
  console.log("[ETL upload] formData keys:", keys);

  const file = formData.get("file");
  console.log("[ETL upload] file type:", typeof file, "value:", file === null ? "null" : file?.constructor?.name);

  if (!file || typeof file === "string") {
    return Response.json({
      error: `Brak pliku w żądaniu (pole 'file'). Otrzymane pola: ${keys.join(", ") || "(brak)"}`,
    }, { status: 400 });
  }

  const filename = file.name ?? "upload.csv";
  const content = await file.text();
  const rows = parseShoperCSV(content, filename);

  console.log("[ETL upload] file:", filename, "rows:", rows.length);

  if (rows.length === 0) {
    return Response.json({ error: `Plik ${filename} nie zawiera danych.` }, { status: 400 });
  }

  // ── ETL pipeline ──────────────────────────────────────────────────────────────
  const supabase = getServiceClient();

  let result;
  try {
    result = await runETLPipeline(rows, supabase, filename);

    await supabase.rpc("refresh_crm_views");

    await supabase.from("sync_log").insert({
      source: "csv_upload",
      status: "success",
      rows_upserted: result.processed,
      meta: {
        file: filename,
        clients_upserted: result.clients,
        unmapped: result.unmapped,
        uploaded_by: user.id,
      },
    }).catch(() => {});
  } catch (err) {
    console.error(`[ETL upload] ERROR (${filename}):`, err?.message);
    console.error(`[ETL upload] STACK:`, err?.stack);

    await supabase.from("sync_log").insert({
      source: "csv_upload",
      status: "error",
      rows_upserted: 0,
      error_message: err.message?.slice(0, 1000),
      meta: { file: filename, uploaded_by: user.id },
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
