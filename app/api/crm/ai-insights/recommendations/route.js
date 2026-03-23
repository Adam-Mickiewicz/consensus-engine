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
      sb.from('clients_360').select('*').eq('client_id', clientId).single(),
      sb.from('client_product_events')
        .select('product_name, ean, order_date, quantity, order_sum, season, is_promo')
        .eq('client_id', clientId)
        .order('order_date', { ascending: false })
        .limit(20),
    ]);

    if (profileRes.error || !profileRes.data) {
      return NextResponse.json({ error: `Klient ${clientId} nie znaleziony` }, { status: 404 });
    }

    const prompt = `Klient Nadwyraz.com ma następujący profil:
${JSON.stringify(profileRes.data, null, 2)}

Historia zakupów (ostatnie 20):
${JSON.stringify(historyRes.data ?? [], null, 2)}

Zaproponuj po polsku:
1. 3 konkretne produkty które powinien kupić następnie (z uzasadnieniem na podstawie jego historii i zainteresowań)
2. Najlepszy moment na wysłanie emaila (na podstawie historii — dzień tygodnia, pora roku, okazja)
3. Jaki temat/motyw go przyciągnie (na podstawie kupionych światów i kategorii produktów)
4. Czy jest ryzyko churnu i jak temu zapobiec?

Uwaga: Nadwyraz.com produkuje narracyjne skarpetki i produkty inspirowane literaturą, kulturą i sztuką. Odpowiedz w formacie markdown.`;

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
