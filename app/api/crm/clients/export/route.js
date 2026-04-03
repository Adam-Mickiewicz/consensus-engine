import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const PAGE = 1000;
const CONC = 10;

async function fetchAll(sb, params) {
  const { segment, risk, world, ltv_min, ltv_max, search, sort } = params;

  let countQ = sb.from('clients_360')
    .select('*', { count: 'exact', head: true });
  if (segment)  countQ = countQ.eq('legacy_segment', segment);
  if (risk)     countQ = countQ.eq('risk_level', risk);
  if (world)    countQ = countQ.eq('top_domena', world);
  if (ltv_min)  countQ = countQ.gte('ltv', parseFloat(ltv_min));
  if (ltv_max)  countQ = countQ.lte('ltv', parseFloat(ltv_max));
  if (search)   countQ = countQ.ilike('client_id', `%${search}%`);

  const { count } = await countQ;
  const total = Math.min(count ?? 0, 10000);
  const pages = Math.ceil(total / PAGE);
  let rows = [];

  for (let b = 0; b < Math.ceil(pages / CONC); b++) {
    const promises = [];
    for (let i = 0; i < CONC; i++) {
      const idx = b * CONC + i;
      if (idx >= pages) break;
      let q = sb.from('clients_360')
        .select('client_id,legacy_segment,risk_level,ltv,orders_count,last_order,first_order,top_domena,winback_priority')
        .range(idx * PAGE, (idx + 1) * PAGE - 1);
      if (segment)  q = q.eq('legacy_segment', segment);
      if (risk)     q = q.eq('risk_level', risk);
      if (world)    q = q.eq('top_domena', world);
      if (ltv_min)  q = q.gte('ltv', parseFloat(ltv_min));
      if (ltv_max)  q = q.lte('ltv', parseFloat(ltv_max));
      if (search)   q = q.ilike('client_id', `%${search}%`);
      switch (sort) {
        case 'ltv_asc':         q = q.order('ltv', { ascending: true }); break;
        case 'last_order_desc': q = q.order('last_order', { ascending: false }); break;
        case 'last_order_asc':  q = q.order('last_order', { ascending: true }); break;
        case 'orders_desc':     q = q.order('orders_count', { ascending: false }); break;
        default:                q = q.order('ltv', { ascending: false }); break;
      }
      promises.push(q);
    }
    const results = await Promise.all(promises);
    for (const { data, error } of results) {
      if (error) throw new Error(error.message);
      if (data) rows = rows.concat(data);
    }
  }
  return rows;
}

function toCSV(rows, emailMap) {
  const COLS = ['client_id', 'legacy_segment', 'risk_level', 'ltv', 'orders_count', 'last_order', 'first_order', 'top_domena', 'winback_priority'];
  const withEmail = !!emailMap;
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = withEmail ? ['email', ...COLS] : COLS;
  const lines = [header.join(',')];
  for (const r of rows) {
    const base = COLS.map(c => escape(r[c]));
    if (withEmail) {
      lines.push([escape(emailMap.get(r.client_id) ?? ''), ...base].join(','));
    } else {
      lines.push(base.join(','));
    }
  }
  return lines.join('\n');
}

async function fetchEmailsForExport(sb, clientIds) {
  const emailMap = new Map();
  const BATCH = 500;
  for (let i = 0; i < clientIds.length; i += BATCH) {
    const batch = clientIds.slice(i, i + BATCH);
    const { data, error } = await sb
      .from('master_key')
      .select('client_id,email')
      .in('client_id', batch)
      .not('email', 'is', null);
    if (error) { console.error('[export] master_key fetch error:', error.message); continue; }
    for (const row of data ?? []) {
      if (row.email) emailMap.set(row.client_id, row.email);
    }
  }
  return emailMap;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeEmail = searchParams.get('include_email') === '1';
    const params = {
      segment: searchParams.get('segment') || '',
      risk:    searchParams.get('risk') || '',
      world:   searchParams.get('world') || '',
      ltv_min: searchParams.get('ltv_min') || '',
      ltv_max: searchParams.get('ltv_max') || '',
      search:  searchParams.get('search') || '',
      sort:    searchParams.get('sort') || 'ltv_desc',
    };

    const sb = getServiceClient();
    const rows = await fetchAll(sb, params);

    let emailMap = null;
    if (includeEmail && rows.length > 0) {
      emailMap = await fetchEmailsForExport(sb, rows.map(r => r.client_id));
      // Log PII export
      try {
        await sb.from('vault_access_log').insert({
          accessed_by: null,
          client_id:   'BULK_EXPORT_PII',
          accessed_at: new Date().toISOString(),
          reason: `pii_csv_export count=${rows.length} found=${emailMap.size}`,
        });
      } catch (e) {
        console.warn('[export] vault_access_log insert failed:', e?.message);
      }
    }

    const csv = toCSV(rows, emailMap);
    const suffix = includeEmail ? '_z_emailami' : '';

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="klienci${suffix}_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return new Response(`error,${err instanceof Error ? err.message : 'Błąd serwera'}`, {
      status: 500,
      headers: { 'Content-Type': 'text/csv' },
    });
  }
}
