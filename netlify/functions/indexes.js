// Netlify Function to batch Yahoo Finance calls for indexes.
// - 1 function call per page load (saves Netlify credits)
// - 30-minute CDN cache + memory cache
// - FMP fallback if Yahoo rate-limits

const FMP_API_KEY = process.env.FMP_API_KEY || "MhI7zKnoqQ9DKey93CvbGqTOnU4U79Hu";

// Symbols to fetch
const SYMBOLS = [
  "^GSPC",  // S&P 500 (US)
  "^DJI",   // Dow (US)
  "^IXIC",  // Nasdaq (US)
  "^RUT",   // Russell 2000 (US)
  "^FTSE",  // FTSE 100 (UK)
  "^N225",  // Nikkei 225 (JP)
  "^GDAXI", // DAX (DE)
  "^HSI",   // Hang Seng (HK)
  "000001.SS", // Shanghai Composite (CN)
  "^TNX"    // 10Y Treasury yield (US)
];

// In-memory cache (lives while function stays warm)
let memoryCache = { ts: 0, data: null };
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function handler(event, context) {
  try {
    const now = Date.now();

    // Serve from memory cache if still fresh
    if (memoryCache.data && (now - memoryCache.ts) < TTL_MS) {
      return respond(memoryCache.data);
    }

    const results = {};
    for (const sym of SYMBOLS) {
      const encoded = encodeURIComponent(sym);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=ytd`;

      try {
        const res = await fetch(url);
        const text = await res.text();

        // Yahoo sometimes returns "Too Many Requests"
        if (text.startsWith("Too Many Requests")) {
          throw new Error("Yahoo 429");
        }

        const json = JSON.parse(text);
        const inner = json?.chart?.result?.[0];

        if (!inner || !inner.timestamp || !inner.indicators?.quote?.[0]?.close) {
          throw new Error("Yahoo missing fields");
        }

        // Normalize TNX (Yahoo returns yield * 10)
        if (sym === "^TNX") {
          const close = inner.indicators.quote[0].close.map(v => (v == null ? null : v / 10));
          results[sym] = {
            meta: inner.meta,
            timestamp: inner.timestamp,
            indicators: { quote: [{ close }] },
            provider: "Yahoo"
          };
        } else {
          results[sym] = {
            meta: inner.meta,
            timestamp: inner.timestamp,
            indicators: inner.indicators,
            provider: "Yahoo"
          };
        }

      } catch (yahooErr) {
        // Fallback to FMP — price + % change only
        try {
          const fmpUrl = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(sym)}?apikey=${FMP_API_KEY}`;
          const r = await fetch(fmpUrl);
          const arr = await r.json();
          const q = Array.isArray(arr) ? arr[0] : null;

          if (!q || typeof q.price !== "number") {
            results[sym] = { error: "Fallback FMP failed" };
            continue;
          }

          const nowSec = Math.floor(Date.now() / 1000);
          results[sym] = {
            meta: { symbol: sym, regularMarketPrice: q.price, changesPercentage: q.changesPercentage ?? 0 },
            timestamp: [nowSec],
            indicators: { quote: [{ close: [sym === "^TNX" ? q.price / 10 : q.price] }] },
            provider: "FMP"
          };
        } catch (fmpErr) {
          results[sym] = { error: "Both Yahoo and FMP failed" };
        }
      }
    }

    // Save in memory cache
    memoryCache = { ts: Date.now(), data: results };

    return respond(results);

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(1800),
      body: JSON.stringify({ error: err.message || "Unknown error" })
    };
  }
}

function respond(payload) {
  return {
    statusCode: 200,
    headers: corsHeaders(1800), // 30 min CDN cache
    body: JSON.stringify(payload)
  };
}

function corsHeaders(sMaxAgeSeconds) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": `public, max-age=0, s-maxage=${sMaxAgeSeconds}`
  };
}
