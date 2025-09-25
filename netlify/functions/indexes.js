import fetch from "node-fetch";

const FMP_API_KEY = "MhI7zKnoqQ9DKey93CvbGqTOnU4U79Hu";

export async function handler(event, context) {
  const symbols = [
    "^GSPC", "^DJI", "^IXIC", "^RUT", "^FTSE", "^N225",
    "^GDAXI", "^HSI", "000001.SS", "^TNX"
  ];

  let results = {};

  for (let sym of symbols) {
    try {
      // Try Yahoo first
      const yahooRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=ytd&interval=1d`
      );

      if (yahooRes.ok) {
        const data = await yahooRes.json();
        if (data.chart && data.chart.result) {
          results[sym] = { provider: "Yahoo", ...data.chart.result[0] };
          continue;
        }
      }

      // If Yahoo fails → FMP fallback
      const fmpSym = sym.replace("^", "");
      const fmpRes = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${fmpSym}?apikey=${FMP_API_KEY}`
      );
      const fmpData = await fmpRes.json();
      if (Array.isArray(fmpData) && fmpData[0]) {
        results[sym] = { provider: "FMP", meta: fmpData[0] };
      } else {
        results[sym] = { error: "No data" };
      }
    } catch (err) {
      results[sym] = { error: err.message };
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(results)
  };
}
