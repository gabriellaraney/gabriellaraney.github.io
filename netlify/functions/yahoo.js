export async function handler(event, context) {
  try {
    const symbol = event.queryStringParameters.symbol;
    if (!symbol) {
      return { statusCode: 400, body: "Missing symbol" };
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=ytd`;
    const res = await fetch(url);   // native fetch in Node 18+
    const data = await res.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("Yahoo proxy error:", err);
    return { statusCode: 500, body: "Error fetching Yahoo Finance" };
  }
}
