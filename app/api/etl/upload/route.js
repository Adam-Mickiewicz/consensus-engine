// app/api/etl/upload/route.js
// Przyjmuje multipart/form-data z plikami CSV, parsuje i przepuszcza przez ETL.
// Obsługuje dwa tryby:
//   - Bezpośredni (pola "files"): jeden request z plikami ≤4MB
//   - Chunked (pole "chunk_index"): kawałki po ≤3MB, scala /finalize

import { createClient } from "@supabase/supabase-js";
import { mergeMultipleCSVs } from "../../../../lib/crm/csvParser";
import { runETLPipeline } from "../../../../lib/crm/etl";
import { storeChunk } from "../../../../lib/crm/chunkBuffer";

const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB

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
  //   return Response.json(
  //     { error: "Brak uprawnień do importu danych." },
  //     { status: 403 }
  //   );
  // }

  // ── Odczyt multipart ─────────────────────────────────────────────────────────
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Nieprawidłowe multipart/form-data." }, { status: 400 });
  }

  // ── Tryb chunked ──────────────────────────────────────────────────────────────
  if (formData.has("chunk_index")) {
    const chunkText = formData.get("chunk_text");
    const chunkIndex = parseInt(formData.get("chunk_index") ?? "", 10);
    const totalChunks = parseInt(formData.get("total_chunks") ?? "0", 10);
    const sourceFilename = formData.get("source_filename") ?? "upload.csv";
    const sessionId = formData.get("session_id");

    if (!sessionId || chunkText === null || isNaN(chunkIndex) || totalChunks < 1) {
      return Response.json({ error: "Nieprawidłowe pola chunk." }, { status: 400 });
    }

    storeChunk({
      sessionId,
      filename: sourceFilename,
      chunkIndex,
      totalChunks,
      text: chunkText,
      userId: user.id,
    });

    return Response.json({ ok: true, buffered: true, received: chunkIndex + 1, total: totalChunks });
  }

  // ── Tryb bezpośredni ──────────────────────────────────────────────────────────
  const files = formData.getAll("files");
  if (!files || files.length === 0) {
    return Response.json({ error: "Brak plików w żądaniu." }, { status: 400 });
  }

  // Sprawdź łączny rozmiar
  let totalBytes = 0;
  for (const file of files) {
    if (typeof file === "string") continue;
    totalBytes += file.size ?? 0;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return Response.json(
      { error: `Pliki przekraczają limit 50 MB (${(totalBytes / 1024 / 1024).toFixed(1)} MB).` },
      { status: 413 }
    );
  }

  // ── Czytaj pliki ──────────────────────────────────────────────────────────────
  const filesArray = [];
  for (const file of files) {
    if (typeof file === "string") continue;
    const content = await file.text();
    filesArray.push({ name: file.name ?? "upload.csv", content });
  }

  if (filesArray.length === 0) {
    return Response.json({ error: "Nie znaleziono plików CSV." }, { status: 400 });
  }

  // ── ETL pipeline ──────────────────────────────────────────────────────────────
  const supabase = getServiceClient();

  let result;
  try {
    const mergedRows = mergeMultipleCSVs(filesArray);

    if (mergedRows.length === 0) {
      return Response.json({ error: "Pliki nie zawierają danych." }, { status: 400 });
    }

    result = await runETLPipeline(mergedRows, supabase, filesArray.map((f) => f.name).join(", "));

    await supabase.from("sync_log").insert({
      source: "csv_upload",
      status: "success",
      rows_upserted: result.processed,
      meta: {
        files: filesArray.map((f) => f.name),
        total_bytes: totalBytes,
        clients_upserted: result.clients,
        unmapped: result.unmapped,
        uploaded_by: user.id,
      },
    }).catch(() => {});
  } catch (err) {
    await supabase.from("sync_log").insert({
      source: "csv_upload",
      status: "error",
      rows_upserted: 0,
      error_message: err.message?.slice(0, 1000),
      meta: { files: filesArray.map((f) => f.name), uploaded_by: user.id },
    }).catch(() => {});

    return Response.json(
      { error: `ETL error: ${err.message}` },
      { status: 500 }
    );
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
