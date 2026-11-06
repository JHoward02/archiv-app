// Archív admin-only, read-only Google Analytics Data API client.
// OAuth tokens remain in memory and are never written to Firestore or local storage.
export type Ga4Cell = {value: string};
export type Ga4Row = {dimensionValues?: Ga4Cell[]; metricValues?: Ga4Cell[]};
export type Ga4Report = {rows?: Ga4Row[]; totals?: Ga4Row[]; rowCount?: number};
export type AudiencePeriod = 7 | 30 | 90;
export type RankedMetric = {label: string; count: number};
export type DailyTraffic = {day: string; visitors: number; sessions: number; views: number; engaged: number};
export type SiteAnalytics = {
  visitors: number;
  newVisitors: number;
  sessions: number;
  pageViews: number;
  engagedSessions: number;
  engagementRate: number;
  averageSessionSeconds: number;
  guestVisitors: number | null;
  registeredVisitors: number | null;
  affiliateClicks: number;
  registrations: number;
  logins: number;
  setViews: number;
  searches: number;
  daily: DailyTraffic[];
  channels: RankedMetric[];
  pages: RankedMetric[];
  devices: RankedMetric[];
  clickedSets: RankedMetric[];
  clickPlacements: RankedMetric[];
  customDimensionsAvailable: boolean;
};
type ReportBody = {
  dateRanges: {startDate: string; endDate: string}[];
  metrics: {name: string}[];
  dimensions?: {name: string}[];
  limit?: string;
  dimensionFilter?: unknown;
  orderBys?: unknown[];
};
type OAuthResponse = {access_token?: string; error?: string; error_description?: string};
type OAuthTokenClient = {requestAccessToken: (options?: {prompt?: string}) => void};
type OAuthProvider = {initTokenClient: (options: {client_id: string; scope: string; callback: (response: OAuthResponse) => void}) => OAuthTokenClient};
type GoogleIdentityWindow = Window & {google?: {accounts?: {oauth2?: OAuthProvider}}};
let identityScript: Promise<void> | null = null;

export function analyticsConfiguration(): {clientId: string; propertyId: string; ready: boolean} {
  const clientId = String(import.meta.env.VITE_GA4_OAUTH_CLIENT_ID || "").trim();
  const propertyId = String(import.meta.env.VITE_GA4_PROPERTY_ID || "").trim();
  return {clientId, propertyId, ready: clientId.length > 0 && /^[0-9]+$/.test(propertyId)};
}

export function prepareGoogleAnalyticsSignIn(): Promise<void> {
  if (typeof document === "undefined") return Promise.reject(new Error("Browser sign-in is unavailable."));
  if ((window as GoogleIdentityWindow).google?.accounts?.oauth2) return Promise.resolve();
  if (!identityScript) {
    identityScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google authorization could not load. Check your browser's blocking settings."));
      script.dataset.archivGoogleIdentity = "true";
      document.head.append(script);
    }).catch(error => {identityScript = null; throw error;});
  }
  return identityScript;
}

export async function authorizeGoogleAnalytics(clientId: string): Promise<string> {
  await prepareGoogleAnalyticsSignIn();
  const oauth = (window as GoogleIdentityWindow).google?.accounts?.oauth2;
  if (!oauth) throw new Error("Google authorization is unavailable.");
  return new Promise<string>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      callback: response => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || "Analytics authorization was cancelled."));
        } else resolve(response.access_token);
      }
    });
    client.requestAccessToken({prompt: "consent"});
  });
}

const metric = (row: Ga4Row | undefined, index: number): number =>
  Number(row?.metricValues?.[index]?.value || 0) || 0;
const label = (row: Ga4Row, index = 0): string =>
  row.dimensionValues?.[index]?.value || "(not set)";
const ranked = (report: Ga4Report | null): RankedMetric[] =>
  (report?.rows || []).map(row => ({label: label(row), count: metric(row, 0)}));

function eventFilter(eventName: string): unknown {
  return {filter: {fieldName: "eventName", stringFilter: {matchType: "EXACT", value: eventName}}};
}

export async function loadGoogleAnalytics(
  token: string,
  propertyId: string,
  days: AudiencePeriod,
  request: typeof fetch = fetch
): Promise<SiteAnalytics> {
  if (!/^[0-9]+$/.test(propertyId)) throw new Error("Google Analytics needs a numeric property ID.");
  const dateRanges = [{startDate: (days - 1) + "daysAgo", endDate: "today"}];
  const fetchReport = async (metrics: string[], dimensions: string[] = [], other: Partial<ReportBody> = {}): Promise<Ga4Report> => {
    const body: ReportBody = {
      dateRanges, metrics: metrics.map(name => ({name})),
      ...(dimensions.length ? {dimensions: dimensions.map(name => ({name}))} : {}),
      limit: "100",
      ...other
    };
    const result = await request("https://analyticsdata.googleapis.com/v1beta/properties/" + propertyId + ":runReport", {
      method: "POST",
      headers: {"Authorization": "Bearer " + token, "Content-Type": "application/json"},
      body: JSON.stringify(body)
    });
    if (!result.ok) {
      let detail = "";
      try {detail = (await result.json()).error?.message || "";} catch { /* no details */ }
      throw new Error(detail || "Google Analytics returned HTTP " + result.status);
    }
    return result.json() as Promise<Ga4Report>;
  };
  const fetchOptional = (metrics: string[], dimensions: string[], eventName: string): Promise<Ga4Report | null> =>
    fetchReport(metrics, dimensions, {dimensionFilter: eventFilter(eventName)}).catch(() => null);

  // Core queries work without any custom dimensions registered in GA4.
  const [overview, daily, channels, pages, devices, events, classified, clickedSets, placements] = await Promise.all([
    fetchReport(["totalUsers", "newUsers", "sessions", "screenPageViews", "engagedSessions", "engagementRate", "averageSessionDuration"]),
    fetchReport(["totalUsers", "sessions", "screenPageViews", "engagedSessions"], ["date"], {limit:"100", orderBys:[{dimension:{dimensionName:"date"}}]}),
    fetchReport(["sessions"], ["sessionDefaultChannelGroup"], {limit:"12",orderBys:[{metric:{metricName:"sessions"},desc:true}]}),
    fetchReport(["screenPageViews"], ["pagePath"], {limit:"12",orderBys:[{metric:{metricName:"screenPageViews"},desc:true}]}),
    fetchReport(["totalUsers"], ["deviceCategory"], {limit:"10",orderBys:[{metric:{metricName:"totalUsers"},desc:true}]}),
    fetchReport(["eventCount"], ["eventName"], {limit:"100"}),
    fetchOptional(["totalUsers"], ["customEvent:visitor_status"], "archiv_visitor_status"),
    fetchOptional(["eventCount"], ["customEvent:set_number"], "affiliate_click"),
    fetchOptional(["eventCount"], ["customEvent:link_placement"], "affiliate_click")
  ]);
  const one = overview.rows?.[0] || overview.totals?.[0];
  const counts = new Map((events.rows || []).map(row => [label(row), metric(row, 0)]));
  const classification = ranked(classified);
  return {
    visitors: metric(one, 0),
    newVisitors: metric(one, 1),
    sessions: metric(one, 2),
    pageViews: metric(one, 3),
    engagedSessions: metric(one, 4),
    engagementRate: metric(one, 5),
    averageSessionSeconds: metric(one, 6),
    guestVisitors: classified ? classification.find(x => x.label === "guest")?.count || 0 : null,
    registeredVisitors: classified ? classification.find(x => x.label === "registered")?.count || 0 : null,
    affiliateClicks: counts.get("affiliate_click") || 0,
    registrations: counts.get("sign_up") || 0,
    logins: counts.get("login") || 0,
    setViews: counts.get("archiv_set_view") || 0,
    searches: counts.get("archiv_catalog_search") || 0,
    daily: (daily.rows || []).map(row => ({
      day: label(row), visitors: metric(row, 0), sessions: metric(row, 1),
      views: metric(row, 2), engaged: metric(row, 3)
    })),
    channels: ranked(channels), pages: ranked(pages), devices: ranked(devices),
    clickedSets: ranked(clickedSets).filter(x => x.label !== "(not set)"),
    clickPlacements: ranked(placements).filter(x => x.label !== "(not set)"),
    customDimensionsAvailable: Boolean(classified && clickedSets && placements)
  };
}
