import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MODEL = 'claude-sonnet-4-20250514';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    if (!clientId) {
      return NextResponse.json({ error: 'Brak parametru client_id' }, { status: 400 });
    }

    const sb = getServiceClient();

    const [profileRes, historyRes] = await Promise.all([
      sb.from('clients_360')
        .select('client_id,legacy_segment,risk_level,ltv,last_order,first_order,orders_count,ulubiony_swiat,purchase_frequency_yearly')
        .eq('client_id', clientId)
        .single(),
      sb.from('client_product_events')
        .select('product_name, order_date, order_sum, season, quantity')
        .eq('client_id', clientId)
        .order('order_date', { ascending: false })
        .limit(30),
    ]);

    if (profileRes.error || !profileRes.data) {
      return NextResponse.json({ error: `Klient ${clientId} nie znaleziony` }, { status: 404 });
    }

    const profile = profileRes.data;
    const history = historyRes.data ?? [];

    const prompt = `Jesteś specjalistą ds. retencji klientów dla Nadwyraz.com — polskiej marki narracyjnych skarpetek i produktów kulturowych.

Profil klienta:
${JSON.stringify(profile, null, 2)}

Historia zakupów (ostatnie 30):
${JSON.stringify(history, null, 2)}

Przeanalizuj wzorzec zakupów i odpowiedz po polsku:

1. **Optymalny moment na kontakt** — podaj konkretną datę lub okres (np. "pierwsze dni maja przed Dniem Matki") z uzasadnieniem na podstawie historii
2. **Proponowane tematy emaila** — 3 warianty subject line dostosowane do profilu klienta
3. **Co napisać w treści emaila** — 3-5 kluczowych punktów które powinny znaleźć się w wiadomości
4. **Jaki produkt/świat wspomnieć** — konkretna rekomendacja produktowa dopasowana do historii i zainteresowań

Uwaga: Nadwyraz.com produkuje narracyjne skarpetki z motywami literackimi, artystycznymi i kulturowymi. Odpowiedz w formacie markdown.`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '';
    return NextResponse.json({ text, client_id: clientId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Błąd serwera';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
