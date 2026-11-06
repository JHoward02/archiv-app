import {describe, expect, it, vi, afterEach} from "vitest";
import {loadGoogleAnalytics} from "../src/archiv-ga4-dashboard";
import {trackAffiliateLink,trackVisitorStatus,trackSetVisit,trackCatalogSearch} from "../src/archiv-public-events";
import {readFileSync} from "node:fs";

const row=(dimensions:string[],metrics:string[])=>({
  dimensionValues:dimensions.map(value=>({value})),
  metricValues:metrics.map(value=>({value}))
});
function ga4Fetch(customDimensions=true){
  const requests:Array<{url:string;body:Record<string,unknown>;headers:Record<string,string>}>=[];
  const mock=vi.fn(async (url:string,options:RequestInit)=>{
    const body=JSON.parse(String(options.body)) as Record<string,unknown>;
    const headers=options.headers as Record<string,string>;
    requests.push({url,body,headers});
    const dims=(body.dimensions as {name:string}[]||[]).map(x=>x.name);
    if(!customDimensions&&dims.some(x=>x.startsWith("customEvent:")))return {ok:false,status:400,json:async()=>({error:{message:"Custom dimension unavailable"}})} as Response;
    let rows:unknown[]=[];
    if(!dims.length)rows=[row([],["80","50","101","235","70","0.6930693","75.4"])];
    else if(dims[0]==="date")rows=[row(["20261105"],["30","40","83","28"])];
    else if(dims[0]==="sessionDefaultChannelGroup")rows=[row(["Organic Search"],["47"])];
    else if(dims[0]==="pagePath")rows=[row(["/archiv-app/"],["148"])];
    else if(dims[0]==="deviceCategory")rows=[row(["mobile"],["53"])];
    else if(dims[0]==="eventName")rows=[
      row(["affiliate_click"],["24"]),row(["sign_up"],["4"]),row(["login"],["6"]),
      row(["archiv_set_view"],["100"]),row(["archiv_catalog_search"],["11"])
    ];
    else if(dims[0]==="customEvent:visitor_status")rows=[row(["guest"],["41"]),row(["registered"],["39"])];
    else if(dims[0]==="customEvent:set_number")rows=[row(["75313-1"],["15"])];
    else if(dims[0]==="customEvent:link_placement")rows=[row(["wishlist"],["12"])];
    return {ok:true,json:async()=>({rows})} as Response;
  });
  return {mock:mock as unknown as typeof fetch,requests,metrics:()=>requests.map(r=>(r.body.metrics as {name:string}[]).map(x=>x.name))};
}

describe("Archív admin analytics read-only reporting",()=>{
  it("reads GA4 data without embedding Google credentials or collecting account PII",async()=>{
    const fetcher=ga4Fetch();
    const report=await loadGoogleAnalytics("temporary-browser-token","123456789",30,fetcher.mock);
    expect(report).toMatchObject({
      visitors:80,newVisitors:50,sessions:101,pageViews:235,engagedSessions:70,
      guestVisitors:41,registeredVisitors:39,affiliateClicks:24,
      registrations:4,logins:6,setViews:100,searches:11
    });
    expect(report.daily).toEqual([{day:"20261105",visitors:30,sessions:40,views:83,engaged:28}]);
    expect(report.channels[0]).toEqual({label:"Organic Search",count:47});
    expect(report.clickedSets[0]).toEqual({label:"75313-1",count:15});
    expect(report.clickPlacements[0]).toEqual({label:"wishlist",count:12});
    for(const query of fetcher.requests){
      expect(query.url).toBe("https://analyticsdata.googleapis.com/v1beta/properties/123456789:runReport");
      expect(query.headers.Authorization).toBe("Bearer temporary-browser-token");
      expect(query.body.dateRanges).toEqual([{startDate:"29daysAgo",endDate:"today"}]);
    }
    expect(JSON.stringify(fetcher.requests)).not.toContain("collectorProfiles");
  });
  it("does not manufacture guest totals when custom dimensions have not been registered",async()=>{
    const fetcher=ga4Fetch(false);
    const report=await loadGoogleAnalytics("temporary-browser-token","123456789",7,fetcher.mock);
    expect(report.visitors).toBe(80);
    expect(report.guestVisitors).toBeNull();
    expect(report.registeredVisitors).toBeNull();
    expect(report.customDimensionsAvailable).toBe(false);
    expect(report.affiliateClicks).toBe(24);
  });
  it("rejects an invalid analytics property before network requests",async()=>{
    const fetcher=ga4Fetch();
    await expect(loadGoogleAnalytics("token","not-a-property",30,fetcher.mock)).rejects.toThrow("numeric property ID");
    expect(fetcher.requests).toHaveLength(0);
  });
});

describe("Archív public click and visitor event instrumentation",()=>{
  afterEach(()=>{delete (window as Window&{gtag?:unknown}).gtag;});
  it("emits one affiliate event with a public set number, placement and visitor state",()=>{
    const gtag=vi.fn();(window as Window&{gtag?:unknown}).gtag=gtag;
    trackAffiliateLink("75313-1","wishlist",false);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event","affiliate_click",{
      marketplace:"ebay",set_number:"75313-1",link_placement:"wishlist",visitor_status:"guest"
    });
  });
  it("excludes unsupported placements and malformed set numbers",()=>{
    const gtag=vi.fn();(window as Window&{gtag?:unknown}).gtag=gtag;
    trackAffiliateLink("75313-1","somewhere",true);
    trackAffiliateLink("private@email.test","detail",true);
    expect(gtag).not.toHaveBeenCalled();
  });
  it("classifies signed-in browsing and tracks public set browsing without sending account IDs",()=>{
    const gtag=vi.fn();(window as Window&{gtag?:unknown}).gtag=gtag;
    trackVisitorStatus(true);trackSetVisit("75313-1");trackCatalogSearch();
    expect(gtag.mock.calls).toEqual([
      ["event","archiv_visitor_status",{visitor_status:"registered"}],
      ["event","archiv_set_view",{set_number:"75313-1"}],
      ["event","archiv_catalog_search",{}]
    ]);
  });
  it("retains delegated tracking and protects admin-only access",()=>{
    const app=readFileSync("src/lego-entry.ts","utf8");
    expect(app).toContain('if(host!=="ebay.com"&&!host.endsWith(".ebay.com"))return');
    expect(app).toContain('if(currentUser)void reportAffiliateClick(setNumber)');
    expect(app).toContain('renderAdminInsights(main,{');
    expect(app).toContain('else if(!adminEnabled)');
    expect(app).not.toContain('link.onclick=()=>reportAffiliateClick');
    expect(app).not.toContain('dataLayer.push({uid:');
  });
});
