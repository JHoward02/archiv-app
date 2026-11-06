// Public, aggregate-only GA4 activity instrumentation.
// Never send Firebase UIDs, emails, display names, saved lists or private collection contents.
type PublicEventValue = string | number | boolean;
type GtagWindow = Window & {gtag?: (command:string,eventName:string,params?:Record<string,PublicEventValue>)=>void};
export function trackPublicEvent(name:string,params:Record<string,PublicEventValue>={}):void{
  if(typeof window==="undefined")return;
  const gtag=(window as GtagWindow).gtag;
  if(typeof gtag!=="function")return;
  gtag("event",name,params);
}
export function trackVisitorStatus(signedIn:boolean):void{
  trackPublicEvent("archiv_visitor_status",{visitor_status:signedIn?"registered":"guest"});
}
export function trackSetVisit(number:string):void{
  if(!/^[A-Za-z0-9-]{2,32}$/.test(number))return;
  trackPublicEvent("archiv_set_view",{set_number:number});
}
export function trackCatalogSearch():void{
  trackPublicEvent("archiv_catalog_search");
}
export function trackAffiliateLink(number:string,placement:string,signedIn:boolean):void{
  if(!/^[A-Za-z0-9-]{2,32}$/.test(number)||!["detail","catalog","wishlist"].includes(placement))return;
  trackPublicEvent("affiliate_click",{
    marketplace:"ebay",set_number:number,link_placement:placement,
    visitor_status:signedIn?"registered":"guest"
  });
}
