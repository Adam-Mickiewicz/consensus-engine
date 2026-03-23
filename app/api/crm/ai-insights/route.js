import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';
import { callAI } from '../../../../lib/ai/callAI';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const model = body.model ?? DEFAULT_MODEL;

    const sb = getServiceClient();

    const [overviewRes, segmentsRes, worldsRes, occasionLtvRes, segSummaryRes] =
      await Promise.all([
        sb.from('crm_overview').select('*').single(),
        sb.from('crm_segments').select('*'),
        sb.from('crm_worlds').select('*').limit(10),
        sb.from('crm_occasion_ltv').select('*').limit(15),
        sb.from('crm_segment_summary').select('*').single(),
      ]);

    const crmData = {
      overview:        overviewRes.data  ?? {},
      segments:        segmentsRes.data  ?? [],
      worlds:          worldsRes.data    ?? [],
      occasion_ltv:    occasionLtvRes.data ?? [],
      segment_summary: segSummaryRes.data ?? {},
    };

    const prompt = `Jesteś analitykiem CRM dla Nadwyraz.com — polskiej marki e-commerce produkującej narracyjne skarpetki i produkty z motywami literackimi/kulturowymi.

Oto dane z bazy CRM:
${JSON.stringify(crmData, null, 2)}

Przeanalizuj bazę i odpowiedz po polsku na pytania:
1. Jakie są najważniejsze spostrzeżenia o bazie klientów?
2. Które segmenty wymagają natychmiastowej uwagi?
3. Jakie są wzorce zakupowe które warto wykorzystać?
4. Jakie 3 konkretne akcje marketingowe rekomenujesz na najbliższy miesiąc?
5. Co Cię zaskoczyło lub jest nietypowe w tych danych?

Odpowiedz w formacie markdown z nagłówkami dla każdego pytania.`;

    const text = await callAI(model, prompt, 2048);
    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Błąd serwera';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
