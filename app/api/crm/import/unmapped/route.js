import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const sort   = searchParams.get('sort')   || 'klientow';
    const order  = searchParams.get('order')  || 'desc';
    const page   = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));
    const status = searchParams.get('status') || 'all'; // all | matched | unmatched

    const sb = getServiceClient();
    const { data, error } = await sb.rpc('get_unmapped_products');
    if (error) throw new Error(error.message);

    let rows = data ?? [];

    // Statystyki z pełnego zbioru (przed filtrowaniem)
    const totalAll      = rows.length;
    const matchedAll    = rows.filter(r => r.matched_ean != null).length;
    const unmatchedAll  = totalAll - matchedAll;
    const totalZakupow  = rows.reduce((s, r) => s + Number(r.zakupow  || 0), 0);
    const totalWartosc  = rows.reduce((s, r) => s + parseFloat(r.wartosc || 0), 0);

    // Filtr status
    if (status === 'matched')   rows = rows.filter(r => r.matched_ean != null);
    if (status === 'unmatched') rows = rows.filter(r => r.matched_ean == null);

    // Filtr search
    if (search) rows = rows.filter(r => r.product_name?.toLowerCase().includes(search));

    // Sortowanie
    const asc = order === 'asc';
    rows.sort((a, b) => {
      switch (sort) {
        case 'zakupow': return asc ? a.zakupow - b.zakupow             : b.zakupow - a.zakupow;
        case 'wartosc': return asc ? a.wartosc - b.wartosc             : b.wartosc - a.wartosc;
        case 'status':  return asc ? (a.matched_ean ? 1 : 0) - (b.matched_ean ? 1 : 0)
                                   : (b.matched_ean ? 1 : 0) - (a.matched_ean ? 1 : 0);
        default:        return asc ? a.klientow - b.klientow           : b.klientow - a.klientow;
      }
    });

    const total       = rows.length;
    const total_pages = Math.ceil(total / limit);
    const offset      = (page - 1) * limit;
    const pageRows    = rows.slice(offset, offset + limit);

    return NextResponse.json({
      rows: pageRows,
      total,
      page,
      limit,
      total_pages,
      stats: {
        total:      totalAll,
        matched:    matchedAll,
        unmatched:  unmatchedAll,
        zakupow:    totalZakupow,
        wartosc:    Math.round(totalWartosc * 100) / 100,
      },
    });
  } catch (err) {
    console.error('[unmapped] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
