import { handleComics } from "./comics-route.mjs";

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
