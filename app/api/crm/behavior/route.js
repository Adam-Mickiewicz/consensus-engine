import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

function applyFilters(q, { segment, risk, domena }) {
  if (segment) q = q.eq('legacy_segment', segment);
  if (risk)    q = q.eq('risk_level', risk);
  if (domena)  q = q.eq('top_domena', domena);
  return q;
}

function sumField(rows, key) {
  return rows.reduce((s, r) => s + Number(r[key] || 0), 0);
}

function wavg(rows, valKey, weightKey) {
  const w = sumField(rows, weightKey);
  if (w === 0) return 0;
  return rows.reduce((s, r) => s + Number(r[valKey] || 0) * Number(r[weightKey] || 0), 0) / w;
}

// ─── Tab: segments ────────────────────────────────────────────────────────────

async function fetchSegments(sb, filters) {
  const [{ data: sumRows, error: e1 }, { data: hmRows, error: e2 }] = await Promise.all([
    applyFilters(sb.from('crm_behavior_segments').select('*'), filters),
    applyFilters(
      sb.from('crm_behavior_segments')
        .select('legacy_segment,risk_level,klientow,avg_ltv,sum_ltv'),
      { domena: filters.domena } // heatmap: only domena filter so matrix is complete
    ),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const rows = sumRows ?? [];
  const total = sumField(rows, 'klientow');

  // Aggregate heatmap by segment × risk
  const hmMap = {};
  for (const r of hmRows ?? []) {
    const k = `${r.legacy_segment}|${r.risk_level}`;
    if (!hmMap[k]) hmMap[k] = { legacy_segment: r.legacy_segment, risk_level: r.risk_level, klientow: 0, ltv_sum: 0 };
    hmMap[k].klientow += Number(r.klientow);
    hmMap[k].ltv_sum  += Number(r.avg_ltv) * Number(r.klientow);
  }
  const heatmap = Object.values(hmMap).map(r => ({
    legacy_segment: r.legacy_segment,
    risk_level:     r.risk_level,
    klientow:       r.klientow,
    avg_ltv:        r.klientow > 0 ? Math.round(r.ltv_sum / r.klientow * 100) / 100 : 0,
  }));

  return {
    total_clients:          total,
    avg_ltv:                Math.round(wavg(rows, 'avg_ltv', 'klientow') * 100) / 100,
    sum_ltv:                Math.round(sumField(rows, 'sum_ltv') * 100) / 100,
    avg_orders:             Math.round(wavg(rows, 'avg_orders', 'klientow') * 100) / 100,
    promo_buyers_pct:       total > 0 ? Math.round(sumField(rows, 'promo_buyers')         / total * 1000) / 10 : 0,
    free_shipping_pct:      total > 0 ? Math.round(sumField(rows, 'free_shipping_buyers') / total * 1000) / 10 : 0,
    avg_new_products_ratio: Math.round(wavg(rows, 'avg_new_products_ratio', 'klientow') * 100) / 100,
    avg_events:             Math.round(wavg(rows, 'avg_events',             'klientow') * 100) / 100,
    heatmap,
  };
}

// ─── Tab: dna ─────────────────────────────────────────────────────────────────

async function fetchDNA(sb, filters) {
  const [tagsRes, pgRes] = await Promise.all([
    applyFilters(sb.from('crm_behavior_tags').select('tag_type,tag,klientow'), filters),
    applyFilters(sb.from('crm_behavior_product_groups').select('product_group,klientow,zakupow'), filters),
  ]);
  if (tagsRes.error) throw new Error(tagsRes.error.message);

  const tagAgg = { granularne: {}, domenowe: {}, okazje: {} };
  for (const r of tagsRes.data ?? []) {
    if (!tagAgg[r.tag_type]) continue;
    tagAgg[r.tag_type][r.tag] = (tagAgg[r.tag_type][r.tag] || 0) + Number(r.klientow);
  }
  const sorted = (obj, n = 20) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([tag, klientow]) => ({ tag, klientow }));

  const pgAgg = {};
  for (const r of pgRes.data ?? []) {
    const k = r.product_group;
    if (!pgAgg[k]) pgAgg[k] = { product_group: k, klientow: 0, zakupow: 0 };
    pgAgg[k].klientow += Number(r.klientow);
    pgAgg[k].zakupow  += Number(r.zakupow);
  }

  return {
    granularne:    sorted(tagAgg.granularne),
    domenowe:      sorted(tagAgg.domenowe, 12),
    okazje:        sorted(tagAgg.okazje, 12),
    product_groups: Object.values(pgAgg).sort((a, b) => b.klientow - a.klientow).slice(0, 12),
  };
}

// ─── Tab: seasons ─────────────────────────────────────────────────────────────

async function fetchSeasons(sb, filters) {
  const { data, error } = await applyFilters(
    sb.from('crm_behavior_seasons').select('season,klientow,zakupow'), filters
  );
  if (error) throw new Error(error.message);

  const agg = {};
  for (const r of data ?? []) {
    if (!agg[r.season]) agg[r.season] = { season: r.season, klientow: 0, zakupow: 0 };
    agg[r.season].klientow += Number(r.klientow);
    agg[r.season].zakupow  += Number(r.zakupow);
  }
  return Object.values(agg).sort((a, b) => b.klientow - a.klientow);
}

// ─── Tab: promos ──────────────────────────────────────────────────────────────

async function fetchPromos(sb, filters) {
  const { data, error } = await applyFilters(
    sb.from('crm_behavior_promos')
      .select('promo_name,signal,free_shipping,promo_code_used,klientow,total_orders'),
    filters
  );
  if (error) throw new Error(error.message);

  const promoAgg = {};
  for (const r of data ?? []) {
    const k = r.promo_name;
    if (!promoAgg[k]) promoAgg[k] = {
      promo_name: k, klientow: 0, total_orders: 0, code_users: 0, free_ship_users: 0, signals: new Set(),
    };
    promoAgg[k].klientow     += Number(r.klientow);
    promoAgg[k].total_orders += Number(r.total_orders);
    if (r.promo_code_used) promoAgg[k].code_users     += Number(r.klientow);
    if (r.free_shipping)   promoAgg[k].free_ship_users += Number(r.klientow);
    if (r.signal)          promoAgg[k].signals.add(r.signal);
  }

  return Object.values(promoAgg)
    .map(r => ({ ...r, signals: [...r.signals] }))
    .sort((a, b) => b.klientow - a.klientow);
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'segments';

    const filterA = {
      segment: searchParams.get('a_segment') || '',
      risk:    searchParams.get('a_risk')    || '',
      domena:  searchParams.get('a_domena')  || '',
    };
    const filterB = {
      segment: searchParams.get('b_segment') || '',
      risk:    searchParams.get('b_risk')    || '',
      domena:  searchParams.get('b_domena')  || '',
    };

    const sb = getServiceClient();

    const fetchFn = { dna: fetchDNA, seasons: fetchSeasons, promos: fetchPromos }[tab] ?? fetchSegments;

    let promotionsMeta = {};
    if (tab === 'promos') {
      const { data } = await sb.from('promotions')
        .select('promo_name,promo_type,season,discount_type,discount_min,discount_max');
      for (const p of data ?? []) promotionsMeta[p.promo_name] = p;
    }

    const [group_a, group_b] = await Promise.all([
      fetchFn(sb, filterA),
      fetchFn(sb, filterB),
    ]);

    return NextResponse.json({ group_a, group_b, tab, promotions_meta: promotionsMeta });
  } catch (err) {
    console.error('[behavior] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
