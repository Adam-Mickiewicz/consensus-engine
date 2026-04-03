/**
 * POST /api/crm/clients/reveal-emails
 *
 * Odkrywa adresy email (PII) dla podanej listy client_id.
 * Używa service_role do odczytu tabeli master_key.
 * Każde wywołanie jest logowane do vault_access_log.
 *
 * Body JSON: { client_ids: string[] }  — max 500 ID
 * Response:  { emails: { [client_id]: email }, count: number }
 */

import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_IDS = 500;
const BATCH   = 500;

export async function POST(request) {
  try {
    const body       = await request.json().catch(() => ({}));
    const client_ids = Array.isArray(body?.client_ids)
      ? body.client_ids.slice(0, MAX_IDS).map(String)
      : [];

    if (client_ids.length === 0) {
      return Response.json({ error: 'Brak client_ids' }, { status: 400 });
    }

    const sb     = getServiceClient();
    const emails = {};

    for (let i = 0; i < client_ids.length; i += BATCH) {
      const batch = client_ids.slice(i, i + BATCH);
      const { data, error } = await sb
        .from('master_key')
        .select('client_id,email')
        .in('client_id', batch)
        .not('email', 'is', null);

      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        if (row.email) emails[row.client_id] = row.email;
      }
    }

    // Log PII access (soft fail — nie przerywaj przy błędzie logu)
    try {
      await sb.from('vault_access_log').insert({
        accessed_by:  null,
        client_id:    'BULK_REVEAL',
        accessed_at:  new Date().toISOString(),
        reason: `pii_reveal_list count=${client_ids.length} found=${Object.keys(emails).length}`,
      });
    } catch (e) {
      console.warn('[reveal-emails] vault_access_log insert failed:', e?.message);
    }

    return Response.json({ emails, count: Object.keys(emails).length });
  } catch (err) {
    console.error('[reveal-emails] error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 },
    );
  }
}
