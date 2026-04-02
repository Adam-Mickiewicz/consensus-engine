// GET /api/crm/traffic?section=overview|sources|funnel|products|search|devices&period=7d|30d|90d
const { runReport, parseRows } = require('@/lib/ga4');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') || 'overview';
  const period = searchParams.get('period') || '30d';

  const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const startDate = periodDays + 'daysAgo';
  const endDate = 'today';
  const prevStartDate = (periodDays * 2) + 'daysAgo';
  const prevEndDate = (periodDays + 1) + 'daysAgo';

  try {
    let data = {};

    if (section === 'overview') {
      const [current, previous, daily] = await Promise.all([
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'ecommercePurchases' },
            { name: 'purchaseRevenue' },
            { name: 'screenPageViews' },
            { name: 'userEngagementDuration' },
            { name: 'averageSessionDuration' },
          ],
        }),
        runReport({
          dateRanges: [{ startDate: prevStartDate, endDate: prevEndDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'ecommercePurchases' },
            { name: 'purchaseRevenue' },
          ],
        }),
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'ecommercePurchases' },
            { name: 'purchaseRevenue' },
          ],
          dimensions: [{ name: 'date' }],
          orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
        }),
      ]);

      if (!current && !previous && !daily) {
        return Response.json({ error: 'GA4 nie skonfigurowane lub brak danych', ga4_configured: false }, { status: 200 });
      }

      const currentMetrics = current?.rows?.[0]?.metricValues?.map(v => parseFloat(v.value)) || [];
      const prevMetrics = previous?.rows?.[0]?.metricValues?.map(v => parseFloat(v.value)) || [];

      data = {
        kpis: {
          sessions: currentMetrics[0] || 0,
          users: currentMetrics[1] || 0,
          newUsers: currentMetrics[2] || 0,
          purchases: currentMetrics[3] || 0,
          revenue: currentMetrics[4] || 0,
          pageViews: currentMetrics[5] || 0,
          engagementDuration: currentMetrics[6] || 0,
          avgSessionDuration: currentMetrics[7] || 0,
          conversionRate: (currentMetrics[0] || 0) > 0 ? (((currentMetrics[3] || 0) / (currentMetrics[0] || 1)) * 100) : 0,
        },
        previousPeriod: {
          sessions: prevMetrics[0] || 0,
          users: prevMetrics[1] || 0,
          purchases: prevMetrics[2] || 0,
          revenue: prevMetrics[3] || 0,
        },
        daily: parseRows(daily, ['date'], ['sessions', 'users', 'purchases', 'revenue']),
      };
    }

    else if (section === 'sources') {
      const [channels, sourceMedium, campaigns] = await Promise.all([
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'ecommercePurchases' },
            { name: 'purchaseRevenue' },
          ],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 20,
        }),
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'ecommercePurchases' },
            { name: 'purchaseRevenue' },
          ],
          dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 30,
        }),
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'ecommercePurchases' },
            { name: 'purchaseRevenue' },
          ],
          dimensions: [{ name: 'sessionCampaignName' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 20,
        }),
      ]);

      if (!channels && !sourceMedium) {
        return Response.json({ error: 'GA4 nie skonfigurowane lub brak danych', ga4_configured: false }, { status: 200 });
      }

      data = {
        channels: parseRows(channels, ['channel'], ['sessions', 'users', 'newUsers', 'purchases', 'revenue']),
        sourceMedium: parseRows(sourceMedium, ['source', 'medium'], ['sessions', 'purchases', 'revenue']),
        campaigns: parseRows(campaigns, ['campaign'], ['sessions', 'purchases', 'revenue']),
      };
    }

    else if (section === 'funnel') {
      const [events] = await Promise.all([
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: 'eventCount' }],
          dimensions: [{ name: 'eventName' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: {
                values: ['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'add_payment_info', 'purchase'],
              },
            },
          },
        }),
      ]);

      if (!events) {
        return Response.json({ error: 'GA4 nie skonfigurowane lub brak danych', ga4_configured: false }, { status: 200 });
      }

      data = {
        funnel: parseRows(events, ['event'], ['count']),
      };
    }

    else if (section === 'products') {
      const [pages] = await Promise.all([
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'ecommercePurchases' },
            { name: 'purchaseRevenue' },
            { name: 'userEngagementDuration' },
          ],
          dimensions: [{ name: 'pagePath' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 100,
        }),
      ]);

      if (!pages) {
        return Response.json({ error: 'GA4 nie skonfigurowane lub brak danych', ga4_configured: false }, { status: 200 });
      }

      const allPages = parseRows(pages, ['path'], ['pageViews', 'purchases', 'revenue', 'engagementDuration']);
      // Filter product pages — try common Shoper patterns
      const productPages = allPages.filter(p =>
        /\/(p|produkt|product|sklep)\/|[/-]\d{4,}/.test(p.path)
      );
      data = { products: productPages.length > 0 ? productPages : allPages.slice(0, 50) };
    }

    else if (section === 'search') {
      const [search] = await Promise.all([
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: 'sessions' }],
          dimensions: [{ name: 'searchTerm' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 50,
        }),
      ]);

      if (!search) {
        return Response.json({ error: 'GA4 nie skonfigurowane lub brak danych', ga4_configured: false }, { status: 200 });
      }

      data = { searchTerms: parseRows(search, ['term'], ['sessions']) };
    }

    else if (section === 'devices') {
      const [devices, browsers, geo] = await Promise.all([
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: 'sessions' }, { name: 'ecommercePurchases' }, { name: 'purchaseRevenue' }],
          dimensions: [{ name: 'deviceCategory' }],
        }),
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: 'sessions' }],
          dimensions: [{ name: 'browser' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        }),
        runReport({
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: 'sessions' }, { name: 'ecommercePurchases' }],
          dimensions: [{ name: 'city' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 20,
        }),
      ]);

      if (!devices && !browsers && !geo) {
        return Response.json({ error: 'GA4 nie skonfigurowane lub brak danych', ga4_configured: false }, { status: 200 });
      }

      data = {
        devices: parseRows(devices, ['device'], ['sessions', 'purchases', 'revenue']),
        browsers: parseRows(browsers, ['browser'], ['sessions']),
        geo: parseRows(geo, ['city'], ['sessions', 'purchases']),
      };
    }

    if (!data || Object.keys(data).length === 0) {
      return Response.json({ error: 'GA4 nie skonfigurowane lub brak danych', ga4_configured: false }, { status: 200 });
    }

    return Response.json({ ...data, ga4_configured: true, period }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
    });

  } catch (err) {
    console.error('Traffic API error:', err);
    return Response.json({ error: err.message, ga4_configured: false }, { status: 500 });
  }
}
