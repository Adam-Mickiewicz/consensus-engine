import { createClient } from "@supabase/supabase-js";

// Service-role client — jedyny, który ma dostęp do master_key.
// Nigdy nie eksponować klucza po stronie klienta.
function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Authenticated client na podstawie JWT z nagłówka — używany do weryfikacji
// tożsamości i uprawnień (RLS respektuje auth.uid()).
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
  // ── 1. Ekstrakcja JWT ────────────────────────────────────────────────────────
  const authHeader = request.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!jwt) {
    return Response.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  // ── 2. Weryfikacja sesji użytkownika ─────────────────────────────────────────
  const userClient = getUserClient(jwt);
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Sesja wygasła lub nieprawidłowa." }, { status: 401 });
  }

  // ── 3. Parsowanie body ────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie JSON." }, { status: 400 });
  }

  const { client_id, reason } = body ?? {};

  if (!client_id || typeof client_id !== "string" || client_id.trim() === "") {
    return Response.json({ error: "Brak client_id." }, { status: 400 });
  }

  const sanitizedClientId = client_id.trim();
  const sanitizedReason   = typeof reason === "string" ? reason.trim().slice(0, 500) : null;

  // ── 4. Weryfikacja uprawnień: category='admin', access_level='write' ─────────
  // Użytkownik może SELECT tylko własnych rekordów (RLS), więc wystarczy zwykły
  // klient z JWT — nie potrzebujemy service_role do sprawdzenia uprawnień.
  const { data: permRows, error: permError } = await userClient
    .from("user_permissions")
    .select("access_level")
    .eq("category", "admin")
    .eq("access_level", "write")
    .limit(1);

  if (permError) {
    return Response.json({ error: "Błąd weryfikacji uprawnień." }, { status: 500 });
  }

  if (!permRows || permRows.length === 0) {
    return Response.json(
      { error: "Brak uprawnień. Wymagana rola admin z poziomem 'write'." },
      { status: 403 }
    );
  }

  // ── 5. Lookup w master_key (tylko service_role ma dostęp) ────────────────────
  // master_key przechowuje email_hash (MD5 emaila lowercase).
  // Nigdy nie logujemy ani nie zwracamy emaila w logach serwera.
  const serviceClient = getServiceClient();

  const { data: vaultRow, error: vaultError } = await serviceClient
    .from("master_key")
    .select("email_hash")
    .eq("client_id", sanitizedClientId)
    .maybeSingle();

  if (vaultError) {
    return Response.json({ error: "Błąd vault lookup." }, { status: 500 });
  }

  if (!vaultRow) {
    // Klient istnieje w CRM ale nie ma wpisu w vault — brak PII do odkrycia.
    return Response.json({ error: "Brak danych tożsamości dla tego klienta." }, { status: 404 });
  }

  // ── 6. Zapis do vault_access_log ─────────────────────────────────────────────
  // Używamy service_role, żeby wpisać accessed_by explicite (uniknięcie race
  // condition między RLS a tworzeniem rekordu).
  // WAŻNE: log NIE zawiera samego email_hash ani żadnego PII — tylko client_id.
  const { error: logError } = await serviceClient
    .from("vault_access_log")
    .insert({
      accessed_by: user.id,
      client_id:   sanitizedClientId,
      reason:      sanitizedReason ?? null,
      accessed_at: new Date().toISOString(),
    });

  if (logError) {
    // Logowanie błędu audytu — bez ujawniania PII. Blokujemy odpowiedź:
    // odkrycie bez logu jest niedopuszczalne.
    return Response.json(
      { error: "Nie można zapisać logu audytu. Odkrycie odrzucone." },
      { status: 500 }
    );
  }

  // ── 7. Zwróć email_hash — NIGDY nie loguj do konsoli ────────────────────────
  // email_hash to identyfikator tożsamości z vaultu.
  // W systemie produkcyjnym z szyfrowaniem asymetrycznym, tutaj byłby odszyfrowany email.
  // Klient powinien wyświetlić to jednorazowo i nie zapisywać w localStorage/sessionStorage.
  return Response.json(
    { email: vaultRow.email_hash },
    {
      status: 200,
      headers: {
        // Blokujemy cache odpowiedzi — odpowiedź z PII nie może być cachowana
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma":        "no-cache",
      },
    }
  );
}

// Tylko POST jest dozwolone — żadnych GET z PII w URL/query params
export async function GET() {
  return Response.json({ error: "Method not allowed." }, { status: 405 });
}
