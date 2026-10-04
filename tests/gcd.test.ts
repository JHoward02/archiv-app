import { afterEach, expect, it, vi } from "vitest";
import { gcdProvider } from "../src/providers/gcd.ts";
import { parseQuery } from "../src/query.ts";
import { handleComics } from "../worker/comics-route.mjs";

afterEach(() => vi.unstubAllGlobals());
it("routes a bare issue number through the relay and preserves publication year", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ api_url: "https://www.comics.org/api/issue/44451/", series_name: "The Amazing Spider-Man", descriptor: "300 [Direct]", publication_date: "May 1988" }] })));
  vi.stubGlobal("fetch", fetchMock);
  const result = await gcdProvider.search({ ...parseQuery("Amazing Spider-Man 300"), category: "comic" }, new AbortController().signal);
  expect(fetchMock.mock.calls[0][0]).toContain("/comics/search?series=Amazing+Spider-Man&number=300");
  expect(result.candidates[0]).toMatchObject({ id: "gcd:44451", year: 1988, category: "comic" });
});
it("adds browser CORS headers and requests upstream JSON", async () => {
  const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ api_url: "issue", private_field: "omit" }])));
  const response = await handleComics(new Request("https://relay.test/comics/search?series=Batman&number=1", { headers: { Origin: "https://jhoward02.github.io" } }), upstream);
  expect(response!.headers.get("Access-Control-Allow-Origin")).toBe("https://jhoward02.github.io");
  expect(upstream.mock.calls[0][0]).toBe("https://www.comics.org/api/series/name/Batman/issue/1/?format=json");
  expect(await response!.json()).toEqual({ results: [{ api_url: "issue" }] });
});
it("leaves other routes alone and rejects invalid requests before upstream", async () => {
  const upstream = vi.fn();
  expect(await handleComics(new Request("https://relay.test/discogs/search?q=test"), upstream)).toBeNull();
  const response = await handleComics(new Request("https://relay.test/comics/search?series=Batman&number=../secret"), upstream);
  expect(response!.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});
it("reports upstream rate limiting as a failure, not an empty catalog", async () => {
  const response = await handleComics(new Request("https://relay.test/comics/search?series=Batman&number=1"), vi.fn().mockResolvedValue(new Response("busy", { status: 429 })));
  expect(response!.status).toBe(429);
});
