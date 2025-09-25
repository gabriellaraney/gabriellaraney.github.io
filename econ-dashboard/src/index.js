export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Yahoo Finance Proxy
    if (url.pathname === "/yahoo") {
      const symbol = url.searchParams.get("symbol");
      if (!symbol) {
        return new Response("Missing symbol", { status: 400 });
      }
      const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=ytd`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // FRED Proxy
    if (url.pathname === "/fred") {
      const series = url.searchParams.get("series");
      const units = url.searchParams.get("units") || "";
      if (!series) {
        return new Response("Missing series", { status: 400 });
      }
      const apiKey = "c5d6f351f39d10c302ebc99648038d4a"; // your FRED API key
      let apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${apiKey}&file_type=json`;
      if (units) apiUrl += `&units=${units}`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Default response
    return new Response("Not found", { status: 404 });
  }
};
