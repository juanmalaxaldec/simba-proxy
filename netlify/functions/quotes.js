export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const symbols = event.queryStringParameters?.symbols || '';
  if (!symbols) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta ?symbols=' }) };
  }

  const syms = symbols.split(',').map(s => s.trim()).filter(Boolean).slice(0, 80);
  const results = {};

  await Promise.allSettled(
    syms.map(async (sym) => {
      try {
        const enc = encodeURIComponent(sym);
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1m&range=1d`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000),
          }
        );
        if (!r.ok) return;
        const data = await r.json();
        const m = data?.chart?.result?.[0]?.meta;
        if (m?.regularMarketPrice) {
          results[sym] = {
            price: m.regularMarketPrice,
            prev:  m.chartPreviousClose || m.regularMarketPrice,
            pct:   m.regularMarketChangePercent || 0,
          };
        }
      } catch {}
    })
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(results),
  };
}
