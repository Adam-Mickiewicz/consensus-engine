import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';
import { callAI } from '../../../../../lib/ai/callAI';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const model     = body.model     ?? DEFAULT_MODEL;
    const segment   = body.segment   ?? null;   // single value
    const risk      = body.risk      ?? null;
    const world     = body.world     ?? null;
    const occasion  = body.occasion  ?? null;
    const date_from = body.date_from ?? null;
    const date_to   = body.date_to   ?? null;

    const sb = getServiceClient();

    // ── 1. Build filtered client query ──────────────────────────────────────
    let clientsQ = sb.from('clients_360')
      .select('client_id,legacy_segment,risk_level,ulubiony_swiat,ltv,last_order,orders_count,purchase_frequency_yearly');

    if (segment)   clientsQ = clientsQ.eq('legacy_segment', segment);
    if (risk)      clientsQ = clientsQ.eq('risk_level', risk);
    if (world)     clientsQ = clientsQ.eq('ulubiony_swiat', world);
    if (date_from) clientsQ = clientsQ.gte('last_order', date_from);
    if (date_to)   clientsQ = clientsQ.lte('last_order', date_to);

    // Count + sample
    const [countRes, sampleRes] = await Promise.all([
      clientsQ.select('client_id', { count: 'exact', head: true }),
      clientsQ.order('ltv', { ascending: false }).limit(10),
    ]);

    const totalCount = countRes.count ?? 0;
    const sampleClients = sampleRes.data ?? [];

    if (totalCount === 0) {
      return NextResponse.json({ error: 'Brak klientów spełniających kryteria filtrowania' }, { status: 404 });
    }

    // ── 2. Aggregates for the group ─────────────────────────────────────────
    const clientIds = sampleClients.map(c => c.client_id);

    // Stats from the filtered set (use sample for averages — good enough)
    const ltvValues = sampleClients.map(c => Number(c.ltv) || 0).filter(v => v > 0);
    const avgLtv    = ltvValues.length > 0 ? Math.round(ltvValues.reduce((a, b) => a + b, 0) / ltvValues.length) : 0;

    const lastOrders = sampleClients.map(c => c.last_order).filter(Boolean).sort();
    const minLastOrder = lastOrders[0] ?? null;
    const maxLastOrder = lastOrders[lastOrders.length - 1] ?? null;

    // Top 10 products + promo distribution for this group
    const [productsRes, promoRes] = await Promise.all([
      sb.from('client_product_events')
        .select('product_name,quantity')
        .in('client_id', clientIds)
        .not('product_name', 'is', null)
        .limit(500),
      sb.from('client_product_events')
        .select('is_promo')
        .in('client_id', clientIds)
        .limit(500),
    ]);

    // Aggregate top products
    const productCounts: Record<string, number> = {};
    for (const row of productsRes.data ?? []) {
      if (row.product_name) {
        productCounts[row.product_name] = (productCounts[row.product_name] || 0) + (Number(row.quantity) || 1);
      }
    }
    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Promo ratio
    const promoRows  = promoRes.data ?? [];
    const promoCount = promoRows.filter(r => r.is_promo).length;
    const promoPct   = promoRows.length > 0 ? Math.round((promoCount / promoRows.length) * 100) : 0;

    // ── 3. Build filter description ─────────────────────────────────────────
    const filterDesc = [
      segment   && `Segment: ${segment}`,
      risk      && `Risk: ${risk}`,
      world     && `Świat: ${world}`,
      occasion  && `Okazja: ${occasion}`,
      date_from && `Od: ${date_from}`,
      date_to   && `Do: ${date_to}`,
    ].filter(Boolean).join(', ') || 'Brak filtrów (cała baza)';

    const groupData = {
      filterDescription: filterDesc,
      totalClients:      totalCount,
      sampleSize:        sampleClients.length,
      avgLtv,
      lastOrderRange:    { min: minLastOrder, max: maxLastOrder },
      topSegments:       [...new Set(sampleClients.map(c => c.legacy_segment).filter(Boolean))],
      topRiskLevels:     [...new Set(sampleClients.map(c => c.risk_level).filter(Boolean))],
      promoHuntersPct:   promoPct,
      topProducts,
      sampleClients:     sampleClients.map(c => ({
        client_id:    c.client_id,
        ltv:          Number(c.ltv),
        orders_count: c.orders_count,
        last_order:   c.last_order,
      })),
    };

    const prompt = `Jesteś strategiem marketingowym dla Nadwyraz.com — polskiej marki e-commerce z narracyjnymi skarpetkami i produktami literackimi/kulturowymi.

Analizujesz grupę klientów o następującym profilu:
${JSON.stringify(groupData, null, 2)}

Odpowiedz po polsku:

## 1. KIM SĄ
Charakterystyka tej grupy w 3-4 zdaniach — kim są, co ich wyróżnia, jaki to typ klienta.

## 2. CO ICH ŁĄCZY
Wzorce zakupowe, preferencje produktowe, zachowania zakupowe (jak często kupują, jakie produkty, czy polują na promocje itp.)

## 3. NAJWIĘKSZE RYZYKO
Co może sprawić że stracisz tych klientów — konkretne zagrożenia dla retention.

## 4. STRATEGIA KAMPANII
Konkretna rekomendacja kampanii emailowej dla tej grupy:
- **Cel kampanii**: czego chcemy osiągnąć
- **Najlepszy moment wysyłki**: konkretny miesiąc/okazja
- **Tone of voice**: jaki styl komunikacji
- **3 propozycje tematu emaila** (subject lines gotowe do użycia)
- **Kluczowe punkty w treści**: 3-5 rzeczy które powinny znaleźć się w mailu
- **Rekomendacje produktowe**: które produkty/światy promować

## 5. QUICK WINS
2-3 rzeczy które można zrobić natychmiast żeby poprawić wyniki tej grupy.`;

    const text = await callAI(model, prompt, 2000);
    return NextResponse.json({ text, count: totalCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Błąd serwera';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
