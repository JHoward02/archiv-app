import type { Candidate, SearchQuery } from "../types.ts";
import { asArray, asRecord, asString, fetchJson, type Provider } from "./types.ts";

const RELAY = "https://shelfie-api.jason-howard02.workers.dev/comics/search";
const GCD = "https://www.comics.org";

function records(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  return asArray(root?.results).length ? asArray(root?.results) : [];
}

function idFromApiUrl(apiUrl: string | null): string | null {
  if (!apiUrl) return null;
  const match = apiUrl.match(/\/api\/issue\/(\d+)\/?/);
  return match?.[1] ?? null;
}

export const gcdProvider: Provider = {
  id: "gcd", label: "Grand Comics Database", categories: ["comic"],
  prefers: (query) => query.category === "comic",
  async search(query: SearchQuery, signal) {
    let series = (query.title || query.providerQuery).trim();
    let number = query.number?.replace(/^#/, "").trim();
    // Selected Comics queries may omit the # marker. Keep this interpretation
    // local to comics so book titles and card numbers are not changed.
    if (!number) {
      const trailing = series.match(/^(.+?)\s+(\d{1,3}[a-z]?)$/i);
      if (trailing) { series = trailing[1].trim(); number = trailing[2]; }
    }
    if (!number) {
      return { candidates: [], warning: "Add an issue number, for example Amazing Spider-Man #300, to search the Grand Comics Database." };
    }
    const params = new URLSearchParams({ series, number });
    if (query.year) params.set("year", String(query.year));
    const url = `${RELAY}?${params}`;
    const payload = await fetchJson(url, signal);
    const candidates: Candidate[] = [];
    for (const value of records(payload).slice(0, 40)) {
      const issue = asRecord(value); if (!issue) continue;
      const apiUrl = asString(issue.api_url);
      const id = idFromApiUrl(apiUrl) ?? `${series}:${number}:${asString(issue.publication_date) ?? "unknown"}`;
      const seriesName = asString(issue.series_name) ?? series;
      const descriptor = asString(issue.descriptor);
      const publicationDate = asString(issue.publication_date);
      const issueNumber = descriptor?.match(/#?([0-9]+[A-Za-z]?)/)?.[1] ?? number;
      const seriesUrl = asString(issue.series);
      const sourceUrl = idFromApiUrl(apiUrl) ? `${GCD}/issue/${id}/` : GCD;
      const year = publicationDate ? Number.parseInt(publicationDate.match(/\b(1[89]\d{2}|20\d{2})\b/)?.[1] ?? "",10) : query.year;
      candidates.push({
        id:`gcd:${id}`, provider:"gcd", providerLabel:"Grand Comics Database", providerKey:id,
        title:seriesName, subtitle:[descriptor ?? `#${issueNumber}`, publicationDate].filter(Boolean).join(" • ") || null,
        category:"comic", year:year && Number.isFinite(year) ? year : null,
        imageUrl:null, description:null, sourceUrl,
        details:[{label:"Issue",value:descriptor ?? `#${issueNumber}`},...(publicationDate?[{label:"Publication date",value:publicationDate}]:[]),...(seriesUrl?[{label:"GCD series API",value:seriesUrl}]:[]),{label:"Data source",value:"Grand Comics Database (CC BY-SA 4.0)"}],
        score:0, matchReasons:[],
      });
    }
    return { candidates, warning:"GCD's anonymous API is rate-limited. Comic metadata is CC BY-SA 4.0. Cover artwork is not included in this bootstrap lookup." };
  },
};
