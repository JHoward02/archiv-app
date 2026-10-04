// Add this handler to the existing Worker; preserve its Discogs route and secrets.
async function handleComics(request, fetchUpstream = fetch) {
  const url = new URL(request.url);
  if (url.pathname !== "/comics/search") return null;
  const origin = request.headers.get("Origin");
  const allowed = ["https://jhoward02.github.io", "http://localhost:5173", "http://localhost:4173"];
  const headers = { "Content-Type": "application/json", "Vary": "Origin" };
  if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowed.includes(origin)) return reply({ error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
  if (request.method !== "GET") return reply({ error: "Method not allowed" }, 405);
  const series = url.searchParams.get("series")?.trim();
  const number = url.searchParams.get("number")?.trim();
  const year = url.searchParams.get("year");
  if (!series || series.length > 200 || !number || !/^\d{1,6}[a-z]?$/i.test(number) || (year && !/^(18|19|20)\d{2}$/.test(year))) return reply({ error: "Enter a series and issue number" }, 400);
  const path = `/api/series/name/${encodeURIComponent(series)}/issue/${encodeURIComponent(number)}/${year ? `year/${year}/` : ""}`;
  try {
    const upstream = await fetchUpstream(`https://www.comics.org${path}?format=json`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return reply({ error: upstream.status === 429 ? "Comics lookup is busy. Try again shortly." : "Comics catalog is unavailable." }, upstream.status === 429 ? 429 : 502);
    const payload = await upstream.json();
    const rows = Array.isArray(payload) ? payload : payload?.results;
    if (!Array.isArray(rows)) return reply({ error: "Unexpected comics catalog response" }, 502);
    return reply({ results: rows.slice(0, 40).map(({ api_url, series_name, descriptor, publication_date, series }) => ({ api_url, series_name, descriptor, publication_date, series })) });
  } catch { return reply({ error: "Comics catalog is unavailable. Try again shortly." }, 502); }
}



const ALLOWED_ORIGINS = new Set(["https://jhoward02.github.io"]);
function cors(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://jhoward02.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    const comics = await handleComics(request);
    if (comics) return comics;
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ ok: true }, { headers: cors(origin) });
    if (url.pathname !== "/discogs/search" || request.method !== "GET") return Response.json({ error: "Not found" }, { status: 404, headers: cors(origin) });
    if (!ALLOWED_ORIGINS.has(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403, headers: cors(origin) });
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) return Response.json({ results: [] }, { headers: cors(origin) });
    if (!env.DISCOGS_TOKEN) return Response.json({ error: "Discogs secret is not configured" }, { status: 503, headers: cors(origin) });
    const params = new URLSearchParams({ q, type: "release", format: "Vinyl", per_page: "20" });
    const upstream = await fetch(`https://api.discogs.com/database/search?${params}`, {
      headers: {
        Authorization: `Discogs token=${env.DISCOGS_TOKEN}`,
        "User-Agent": "Shelfie/1.0 +https://jhoward02.github.io/collector-scan/",
        Accept: "application/json",
      },
    });
    if (!upstream.ok) return Response.json({ error: `Discogs responded with ${upstream.status}` }, { status: upstream.status, headers: cors(origin) });
    const data = await upstream.json();
    const results = Array.isArray(data.results) ? data.results.map((r) => ({
      id: r.id, title: r.title, year: r.year, label: r.label, catno: r.catno,
      format: r.format, country: r.country, uri: r.uri,
    })) : [];
    return Response.json({ results }, { headers: { ...cors(origin), "Cache-Control": "private, max-age=300" } });
  },
};
