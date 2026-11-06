// Add this handler to the existing Worker; preserve its Discogs route and secrets.
export async function handleComics(request, fetchUpstream = fetch) {
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
    if (!upstream.ok) return reply({ upstreamStatus: upstream.status, error: upstream.status === 429 ? "Comics lookup is busy. Try again shortly." : "Comics catalog is unavailable." }, upstream.status === 429 ? 429 : 502);
    if (!(upstream.headers.get("Content-Type") || "").includes("json")) return reply({ error: "Comics catalog returned a non-JSON response", upstreamStatus: upstream.status }, 502);
    const payload = await upstream.json();
    const rows = Array.isArray(payload) ? payload : payload?.results;
    if (!Array.isArray(rows)) return reply({ error: "Unexpected comics catalog response" }, 502);
    return reply({ results: rows.slice(0, 40).map(({ api_url, series_name, descriptor, publication_date, series }) => ({ api_url, series_name, descriptor, publication_date, series })) });
  } catch (error) {
    return reply({ error: "Comics catalog is unavailable. Try again shortly.", diagnostic: String(error?.message || error).slice(0, 240) }, 502);
  }
}
