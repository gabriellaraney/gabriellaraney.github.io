export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cache = caches.default;

    // ----------- Batch FRED (Econ Data) -----------
    if (url.pathname === "/fred") {
      const cacheKey = new Request(url.toString(), request);
      let response = await cache.match(cacheKey);

      if (!response) {
        const apiKey = "c5d6f351f39d10c302ebc99648038d4a"; // your FRED key
        const seriesList = {
          GDP: "money",
          UNRATE: "percent",
          CPIAUCSL: "percent",
          PCEPI: "percent",
          PPIACO: "percent",
          SOFR: "percent",
          FEDFUNDS: "percent",
          T5YIE: "percent"
        };

        const results = {};
        for (const id of Object.keys(seriesList)) {
          try {
            let apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${apiKey}&file_type=json`;
            if (["CPIAUCSL", "PCEPI", "PPIACO"].includes(id)) {
              apiUrl += "&units=pc1"; // YoY % change
            }
            const r = await fetch(apiUrl);
            const d = await r.json();
            results[id] = (d.observations || []).map(o => ({
              date: o.date,
              value: o.value
            }));
          } catch (err) {
            results[id] = [];
          }
        }

        response = new Response(JSON.stringify(results), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=0, s-maxage=86400" // 1 day at edge
          }
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;
    }

    return new Response("Not found", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
  }
};
