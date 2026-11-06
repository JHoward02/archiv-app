import type {AudiencePeriod, SiteAnalytics, RankedMetric} from "./archiv-ga4-dashboard";

export type AdminProfile = {uid:string; name?:string; email?:string; firstSeen?:string; lastSeen?:string};
export type AdminSummary = {owned?:number; wishlist?:number; themes?:Record<string,number>; affiliateClicks?:number};
export type AdminEvent = {uid:string; type:string; at:string; setNumber?:string; theme?:string};
export type AdminDashboardState = {
  days:AudiencePeriod;
  analytics:SiteAnalytics|null;
  analyticsBusy:boolean;
  analyticsError:string;
  analyticsConfigured:boolean;
  analyticsConnected:boolean;
  backendBusy:boolean;
  backendLoaded:boolean;
  backendError:string;
  profiles:AdminProfile[];
  summaries:AdminSummary[];
  events:AdminEvent[];
  selectedUid:string;
  onPeriod:(days:AudiencePeriod)=>void;
  onConnect:()=>void;
  onRefresh:()=>void;
  onSelectUid:(uid:string)=>void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag:K, cls="", value=""):HTMLElementTagNameMap[K] {
  const node=document.createElement(tag);node.className=cls;node.textContent=value;return node;
}
function num(value:number|null|undefined):string{return value===null||value===undefined?"—":value.toLocaleString();}
function formatDay(value:string):string{
  if(!/^\d{8}$/.test(value))return value;
  return value.slice(4,6)+"/"+value.slice(6,8);
}
function dateLabel(value:string):string{
  const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"Unknown";
}
function metric(title:string,value:number|null|undefined,description:string,large=false):HTMLElement{
  const card=el("article","archiv-insight-metric"+(large?" is-featured":""));
  card.append(el("span","archiv-insight-metric-label",title),el("strong","archiv-insight-metric-number",num(value)),el("p","archiv-insight-small",description));
  return card;
}
function sectionTitle(title:string,description?:string):HTMLElement{
  const header=el("div","archiv-insight-section-header");
  header.append(el("h2","",title));
  if(description)header.append(el("p","archiv-insight-small",description));
  return header;
}
function rankedList(rows:RankedMetric[],empty:string,format?:(value:string)=>string):HTMLElement{
  const list=el("div","archiv-insight-rankings");
  if(!rows.length){list.append(el("p","archiv-insight-muted",empty));return list;}
  const largest=Math.max(...rows.map(x=>x.count),1);
  for(const row of rows.slice(0,10)){
    const line=el("div","archiv-insight-ranked-row");
    const top=el("div","archiv-insight-ranked-top");
    top.append(el("span","",format?format(row.label):row.label),el("strong","",num(row.count)));
    const rail=el("div","archiv-insight-rail");
    const fill=el("span","archiv-insight-fill");
    fill.style.width=Math.max(0,100*row.count/largest)+"%";
    rail.append(fill);line.append(top,rail);list.append(line);
  }
  return list;
}
function periodStart(days:AudiencePeriod):number{return Date.now()-(days-1)*86400000;}
function periodEvents(events:AdminEvent[],days:AudiencePeriod):AdminEvent[]{
  const cutoff=periodStart(days);
  return events.filter(x=>Number.isFinite(Date.parse(x.at))&&Date.parse(x.at)>=cutoff);
}
function setRanking(events:AdminEvent[]):RankedMetric[]{
  const counts=new Map<string,number>();
  for(const event of events)if(event.type==="affiliate_click"&&event.setNumber)counts.set(event.setNumber,(counts.get(event.setNumber)||0)+1);
  return [...counts].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count).slice(0,10);
}
function themeRanking(summaries:AdminSummary[]):RankedMetric[]{
  const counts=new Map<string,number>();
  for(const x of summaries)for(const [theme,n] of Object.entries(x.themes||{}))counts.set(theme,(counts.get(theme)||0)+(Number(n)||0));
  return [...counts].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count).slice(0,10);
}
function trackedAccounts(state:AdminDashboardState):number|null{return state.backendLoaded?state.profiles.length:null;}
function link(url:string,label:string):HTMLAnchorElement{
  const a=el("a","archiv-insight-link",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;
}
function info(text:string):HTMLElement{return el("p","archiv-insight-small",text);}

let drilldownOpen=false;
export function renderAdminInsights(main:HTMLElement,state:AdminDashboardState):void{
  const ga=state.analytics,period=state.days;
  const recent=periodEvents(state.events,period);
  const firstSeen=periodStart(period);
  const signups=state.profiles.filter(p=>p.firstSeen&&Date.parse(p.firstSeen)>=firstSeen).length;
  const signedClicks=state.summaries.reduce((n,row)=>n+(Number(row.affiliateClicks)||0),0);
  const owned=state.summaries.reduce((n,row)=>n+(Number(row.owned)||0),0);
  const wished=state.summaries.reduce((n,row)=>n+(Number(row.wishlist)||0),0);

  const hero=el("section","archiv-insight-hero");
  const heroCopy=el("div");
  heroCopy.append(el("p","archiv-insight-eyebrow","ARCHÍV / OWNER INSIGHTS"));
  heroCopy.append(el("h1","","Your audience, at a glance"));
  heroCopy.append(info("Website traffic, collector engagement, registrations and affiliate shopping, in one place."));
  const tools=el("div","archiv-insight-actions");
  const periods=el("div","archiv-insight-periods");
  for(const days of [7,30,90] as const){
    const button=el("button",days===period?"active":"",days+" days");
    button.type="button";button.setAttribute("aria-pressed",String(days===period));
    button.onclick=()=>state.onPeriod(days);periods.append(button);
  }
  const refresh=el("button","archiv-insight-refresh",state.backendBusy||state.analyticsBusy?"Updating…":"↻ Refresh");
  refresh.type="button";refresh.disabled=state.backendBusy||state.analyticsBusy;
  refresh.onclick=state.onRefresh;
  tools.append(periods,refresh);hero.append(heroCopy,tools);main.append(hero);

  if(!state.analyticsConfigured){
    const connect=el("div","archiv-insight-banner");
    connect.append(el("strong","","Connect website analytics to unlock visitor counts"));
    connect.append(info("Registered collector reporting is available below. To display site traffic, guest visitors and all affiliate clicks, configure the read-only GA4 property ID and Google OAuth client for Archív. No visitor totals are estimated from account records."));
    connect.append(link("https://analytics.google.com/analytics/web/","Open Google Analytics"));
    main.append(connect);
  }else if(!state.analyticsConnected){
    const connect=el("div","archiv-insight-banner");
    connect.append(el("strong","","Connect Google Analytics"));
    connect.append(info("Only authorized Archív administrators can open this dashboard. Connect the Google account that has read access to the Archív GA4 property. This requests read-only access, with the token kept in this browser session."));
    const button=el("button","archiv-insight-connect",state.analyticsBusy?"Connecting…":"Connect Google Analytics");
    button.type="button";button.disabled=state.analyticsBusy;button.onclick=state.onConnect;connect.append(button);
    main.append(connect);
  }
  if(state.analyticsError)main.append(el("p","archiv-insight-error","Google Analytics: "+state.analyticsError));
  if(state.backendError)main.append(el("p","archiv-insight-error","Collector reporting: "+state.backendError));

  main.append(sectionTitle("Who is visiting","Unique browsers measured by Google Analytics for the selected date range."));
  const audience=el("div","archiv-insight-metrics archiv-insight-audience");
  audience.append(
    metric("All website visitors",ga?.visitors,"GA4 unique users during the selected period.",true),
    metric("Guest browsers",ga?.guestVisitors,"Browsing without signing in. Tracking begins after the new event is deployed."),
    metric("Signed-in browsers",ga?.registeredVisitors,"Visitors observed while signed in. A browser may appear in both groups.")
  );
  main.append(audience);
  const quick=el("div","archiv-insight-metrics archiv-insight-quick");
  quick.append(
    metric("Registered accounts",trackedAccounts(state),"Profiles recorded in Firestore, all time. Not the complete Firebase Auth directory."),
    metric("New registered accounts",state.backendLoaded?signups:null,"Profiles first recorded in this period."),
    metric("Website sessions",ga?.sessions,"All browsing sessions, including guests."),
    metric("Engaged sessions",ga?.engagedSessions,"GA4 sessions with meaningful engagement.")
  );
  main.append(quick);

  main.append(sectionTitle("How visitors use Archív","Measure growth and understand which experiences attract attention."));
  const grid=el("div","archiv-insight-grid");
  const traffic=el("section","archiv-insight-panel archiv-insight-chart-panel");
  traffic.append(el("h3","","Daily visitor trend"));
  if(ga?.daily.length){
    const bars=el("div","archiv-insight-chart");
    const max=Math.max(1,...ga.daily.map(x=>x.visitors));
    for(const day of ga.daily){
      const bar=el("div","archiv-insight-chart-day");
      const column=el("div","archiv-insight-chart-rail");
      const fill=el("div","archiv-insight-chart-fill");
      fill.style.height=(day.visitors?Math.max(3,100*day.visitors/max):0)+"%";
      column.title=day.day+": "+num(day.visitors)+" visitors, "+num(day.sessions)+" sessions";
      column.append(fill);bar.append(column,el("span","",formatDay(day.day)));bars.append(bar);
    }
    traffic.append(bars);
  }else traffic.append(el("p","archiv-insight-muted","Connect GA4 to view daily visitors and trends."));
  grid.append(traffic);
  const engagement=el("section","archiv-insight-panel");
  engagement.append(el("h3","","Engagement snapshot"));
  const engagementMetrics=el("div","archiv-insight-statlines");
  for(const [name,value] of [
    ["Page views",num(ga?.pageViews)],["New visitors",num(ga?.newVisitors)],
    ["Engagement rate",ga?(ga.engagementRate*100).toFixed(1)+"%":"—"],
    ["Average session",ga?Math.round(ga.averageSessionSeconds)+" sec":"—"],
    ["LEGO set views",num(ga?.setViews)],["Catalog searches",num(ga?.searches)]
  ]){
    const item=el("div");item.append(el("span","",name),el("strong","",value));engagementMetrics.append(item);
  }
  engagement.append(engagementMetrics);grid.append(engagement);
  const channels=el("section","archiv-insight-panel");
  channels.append(el("h3","","How people found you"));
  channels.append(rankedList(ga?.channels||[],"GA4 traffic sources will appear after connection."));
  grid.append(channels);
  const pages=el("section","archiv-insight-panel");
  pages.append(el("h3","","Most visited pages"));
  pages.append(rankedList(ga?.pages||[],"GA4 page performance will appear after connection.",value=>{
    try{
      const url=new URL(value);
      return url.hash.startsWith("#/")?url.hash.slice(1):(url.pathname.startsWith("/archiv-app/")?url.pathname.slice("/archiv-app".length):url.pathname)||"/";
    }catch{return value;}
  }));
  grid.append(pages);main.append(grid);

  main.append(sectionTitle("Affiliate shopping","Every eligible eBay click is measured separately from actual orders and commission."));
  const affiliateMetrics=el("div","archiv-insight-metrics archiv-insight-quick");
  affiliateMetrics.append(
    metric("All affiliate clicks",ga?.affiliateClicks,"GA4 click events from guests and registered visitors, starting at event deployment.",true),
    metric("Signed-in clicks",state.backendLoaded?signedClicks:null,"Lifetime Firestore count from collector summaries."),
    metric("Affiliate click rate",ga&&ga.sessions>0?Math.round(1000*ga.affiliateClicks/ga.sessions)/10:null,"Clicks per 100 website sessions, as a percentage."),
    metric("Registrations tracked by GA4",ga?.registrations,"Sign-up events after new conversion tracking launches.")
  );
  main.append(affiliateMetrics);
  const affiliateGrid=el("div","archiv-insight-grid");
  const placement=el("section","archiv-insight-panel");
  placement.append(el("h3","","Clicks by placement"));
  placement.append(rankedList(ga?.clickPlacements||[],"After GA4 custom dimensions are registered, see clicks from detail pages, catalog and wishlist.",p=>({detail:"Set details",catalog:"Catalog cards",wishlist:"Wishlist"} as Record<string,string>)[p]||p));
  affiliateGrid.append(placement);
  const topSets=el("section","archiv-insight-panel");
  topSets.append(el("h3","","Sets driving clicks"));
  const fallback=setRanking(recent);
  topSets.append(rankedList(ga?.clickedSets.length?ga.clickedSets:fallback,
    "Per-set affiliate data starts with the updated click tracking."));
  if(!ga?.clickedSets.length&&fallback.length)topSets.append(info("Showing signed-in activity from the first 50 reporting profiles, not all visitor clicks."));
  affiliateGrid.append(topSets);main.append(affiliateGrid);
  const notice=el("p","archiv-insight-annotation","Attribution note: An outgoing click is not an eBay sale. Affiliate revenue and purchases require verified reporting from eBay Partner Network. GA4 event dimensions can take time to become reportable and require registration in your GA4 property.");
  main.append(notice);

  main.append(sectionTitle("Collector behavior","What registered collectors save, and which themes are most popular."));
  const collector=el("div","archiv-insight-metrics archiv-insight-quick");
  collector.append(
    metric("Sets owned",state.backendLoaded?owned:null,"Current owned-set total among reporting collectors."),
    metric("Wishlist saves",state.backendLoaded?wished:null,"Current wished-for set total among reporting collectors."),
    metric("Collection changes",state.backendLoaded?recent.filter(e=>["owned","wishlist","removed"].includes(e.type)).length:null,"Recent activity from the first 50 reporting profiles."),
    metric("Signed-in visits tracked by GA4",ga?.registeredVisitors,"Browser-based signed-in visits, not account creation.")
  );main.append(collector);
  const extra=el("div","archiv-insight-grid");
  const themes=el("section","archiv-insight-panel");
  themes.append(el("h3","","Most collected LEGO themes"));
  themes.append(rankedList(themeRanking(state.summaries),"Themes will appear once collectors save sets."));
  extra.append(themes);
  const devices=el("section","archiv-insight-panel");
  devices.append(el("h3","","Visitor devices"));
  devices.append(rankedList(ga?.devices||[],"Connect GA4 to learn whether visitors use mobile, desktop or tablet."));
  extra.append(devices);main.append(extra);

  const drill=el("details","archiv-insight-drilldown");
  drill.open=drilldownOpen;
  drill.ontoggle=()=>{drilldownOpen=drill.open};
  drill.append(el("summary","","Individual collector activity (private admin detail)"));
  const contents=el("div","archiv-insight-drilldown-content");
  contents.append(info("Activity events are loaded for the first 50 recorded profiles. Other accounts may have no detailed events in this view."));
  const userList=el("div","archiv-insight-people");
  const selected=state.profiles.find(p=>p.uid===state.selectedUid)||state.profiles[0];
  for(const profile of state.profiles){
    const name=(profile.name||"Collector").trim();
    const button=el("button",selected?.uid===profile.uid?"active":"",name);
    button.type="button";button.onclick=()=>state.onSelectUid(profile.uid);
    userList.append(button);
  }
  contents.append(userList);
  if(selected){
    const detail=el("div","archiv-insight-person-detail");
    detail.append(el("strong","",selected.name||"Collector"),el("p","archiv-insight-small",selected.email||"Email not provided"));
    detail.append(info("First seen: "+dateLabel(selected.firstSeen||"")));
    const items=state.events.filter(e=>e.uid===selected.uid).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,20);
    if(!items.length)detail.append(info("No activity recorded for this collector."));
    for(const item of items){
      const line=el("div","archiv-insight-person-event");
      line.append(el("span","",dateLabel(item.at)),el("strong","",item.type.replace(/_/g," ")),el("span","",item.setNumber?"Set "+item.setNumber:item.theme||""));
      detail.append(line);
    }
    contents.append(detail);
  }else contents.append(info("No registered profiles have been recorded yet."));
  drill.append(contents);main.append(drill);

  const coverage=el("section","archiv-insight-footnote");
  coverage.append(el("strong","","How to read these numbers"));
  coverage.append(link("https://console.firebase.google.com/project/archiv-3f5df/authentication/users","View complete account list in Firebase Authentication"));
  coverage.append(info("GA4 visitor, session and event counts reflect measurable web traffic and may exclude visitors who block analytics. Guest means not signed in at the time of measurement, not necessarily a person without an account. Guest and signed-in visitor groups can overlap. Firestore totals include only collector profiles and summaries the app has recorded, not every Firebase Authentication identity. Never add GA4 clicks and Firestore clicks together; they measure overlapping activity."));
  if(ga&&!ga.customDimensionsAvailable)coverage.append(info("Visitor status and click-by-set/placement reporting need GA4 event-scoped custom dimensions named visitor_status, set_number and link_placement. Those fields cannot be backfilled."));
  main.append(coverage);
}
