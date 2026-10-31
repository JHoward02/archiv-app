/** Presentation-only selection helpers. Always read saved data from the signed-in owner. */
export type CollectorStatus="owned"|"wishlist";
export type CollectorSet={number:string;theme:string};
export function collectorOverview<T extends CollectorSet>(
 catalog:readonly T[],statuses:Readonly<Record<string,CollectorStatus>>
){
 const byNumber=new Map(catalog.map(row=>[row.number,row]));
 const collecting=new Set<string>();
 let owned=0,wishlist=0;
 for(const [number,status] of Object.entries(statuses)){
  if(status!=="owned"&&status!=="wishlist")continue;
  if(status==="owned")owned++;else wishlist++;
  const theme=byNumber.get(number)?.theme;
  if(theme)collecting.add(theme);
 }
 return {owned,wishlist,collectingThemes:collecting};
}
export function setsWithStatus<T extends CollectorSet>(
 catalog:readonly T[],statuses:Readonly<Record<string,CollectorStatus>>,filter:CollectorStatus
):T[]{
 const numbers=new Set(Object.entries(statuses).filter(([,status])=>status===filter).map(([number])=>number));
 return catalog.filter(row=>numbers.has(row.number)).sort((a,b)=>a.theme.localeCompare(b.theme)||a.number.localeCompare(b.number));
}
export function absentFromCatalog<T extends CollectorSet>(
 catalog:readonly T[],statuses:Readonly<Record<string,CollectorStatus>>,filter:CollectorStatus
):string[]{
 const known=new Set(catalog.map(row=>row.number));
 return Object.keys(statuses).filter(number=>statuses[number]===filter&&!known.has(number)).sort();
}
