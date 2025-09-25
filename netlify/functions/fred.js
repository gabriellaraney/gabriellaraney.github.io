export async function handler(event, context) {
  try {
    const { series } = event.queryStringParameters;
    if (!series) {
      return { statusCode: 400, body: "Missing series" };
    }

    const apiKey = "c5d6f351f39d10c302ebc99648038d4a"; // your key
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${apiKey}&file_type=json`;

    const res = await fetch(url);
    const data = await res.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("FRED proxy error:", err);
    return { statusCode: 500, body: "Error fetching FRED" };
  }
}
