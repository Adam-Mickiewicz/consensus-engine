const { BetaAnalyticsDataClient } = require('@google-analytics/data');

let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.GA4_CLIENT_EMAIL || !process.env.GA4_PRIVATE_KEY) {
      return null;
    }
    _client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GA4_CLIENT_EMAIL,
        private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });
  }
  return _client;
}

const PROPERTY = 'properties/' + (process.env.GA4_PROPERTY_ID || '');

async function runReport(config) {
  const client = getClient();
  if (!client) return null;

  try {
    const [response] = await client.runReport({
      property: PROPERTY,
      ...config,
    });
    return response;
  } catch (err) {
    console.error('GA4 report error:', err.message);
    return null;
  }
}

function parseRows(response, dimensionNames, metricNames) {
  if (!response?.rows) return [];
  return response.rows.map(row => {
    const obj = {};
    dimensionNames.forEach((name, i) => {
      obj[name] = row.dimensionValues?.[i]?.value || '';
    });
    metricNames.forEach((name, i) => {
      const val = row.metricValues?.[i]?.value || '0';
      obj[name] = val.includes('.') ? parseFloat(val) : parseInt(val);
    });
    return obj;
  });
}

module.exports = { getClient, runReport, parseRows, PROPERTY };
