/** Pure, client-side filters. Never fetch other users' collection records. */
export type FilterSet={number:string;name:string;theme:string;year:number;parts:number};
export type CollectionMark="owned"|"wishlist";
export type SetOrder="name-asc"|"name-desc"|"theme-asc"|"year-desc"|"year-asc"|"pieces-desc"|"pieces-asc"|"number-asc";
export type SetFilters={
 query?:string;
 theme?:string;
 decade?:string;
 pieces?:string;
 status?:string;
};
export const setSortOptions:readonly [SetOrder,string][]=[
 ["name-asc","Name: A–Z"],["name-desc","Name: Z–A"],["theme-asc","Theme: A–Z"],
 ["year-desc","Year: newest"],["year-asc","Year: oldest"],
 ["pieces-desc","Pieces: most"],["pieces-asc","Pieces: fewest"],["number-asc","Set number"]
];
export const pieceOptions:readonly [string,string][]=[
 ["all","Any piece count"],["under100","Under 100 pieces"],["100-499","100–499 pieces"],
 ["500-999","500–999 pieces"],["1000plus","1,000+ pieces"]
];
export function decadeOptions(rows:readonly FilterSet[]):[string,string][]{
 const years=[...new Set(rows.filter(r=>Number.isFinite(r.year)&&r.year>0).map(r=>Math.floor(r.year/10)*10))].sort((a,b)=>b-a);
 return [["all","Any year"],...years.map(y=>[String(y),y+"s"] as [string,string])];
}
export function sortSets<T extends FilterSet>(rows:readonly T[],order:SetOrder):T[]{
 const byName=(a:T,b:T)=>a.name.localeCompare(b.name);
 const compare=(a:T,b:T)=>{
  switch(order){
   case "name-desc":return -byName(a,b);
   case "theme-asc":return a.theme.localeCompare(b.theme)||byName(a,b);
   case "year-desc":return (b.year||0)-(a.year||0)||byName(a,b);
   case "year-asc":return (a.year||0)-(b.year||0)||byName(a,b);
   case "pieces-desc":return b.parts-a.parts||byName(a,b);
   case "pieces-asc":return a.parts-b.parts||byName(a,b);
   case "number-asc":return a.number.localeCompare(b.number,undefined,{numeric:true});
   default:return byName(a,b);
  }
 };
 return [...rows].sort((a,b)=>compare(a,b)||a.number.localeCompare(b.number,undefined,{numeric:true}));
}
export function filterSets<T extends FilterSet>(
 rows:readonly T[],filters:SetFilters,statuses:Readonly<Record<string,CollectionMark>>={}
):T[]{
 const q=(filters.query||"").trim().toLocaleLowerCase();
 return rows.filter(row=>{
  if(q&&![row.name,row.number,row.theme,String(row.year)].some(v=>v.toLocaleLowerCase().includes(q)))return false;
  if(filters.theme&&filters.theme!=="all"&&row.theme!==filters.theme)return false;
  if(filters.decade&&filters.decade!=="all"&&String(Math.floor(row.year/10)*10)!==filters.decade)return false;
  const pieces=filters.pieces||"all";
  if(pieces==="under100"&&row.parts>=100)return false;
  if(pieces==="100-499"&&(row.parts<100||row.parts>=500))return false;
  if(pieces==="500-999"&&(row.parts<500||row.parts>=1000))return false;
  if(pieces==="1000plus"&&row.parts<1000)return false;
  const mark=statuses[row.number];
  if(filters.status==="owned"&&mark!=="owned")return false;
  if(filters.status==="wishlist"&&mark!=="wishlist")return false;
  if(filters.status==="uncollected"&&mark==="owned")return false;
  return true;
 });
}
/** Counts per displayed collecting theme, accepting both Pokemon/Pokémon labels. */
export function savedThemeCounts<T extends FilterSet>(
 rows:readonly T[],statuses:Readonly<Record<string,CollectionMark>>
):Record<string,{owned:number;wishlist:number}>{
 const byNumber=new Map(rows.map(row=>[row.number,row.theme]));
 const result:Record<string,{owned:number;wishlist:number}>={};
 for(const [id,mark] of Object.entries(statuses)){
  const name=byNumber.get(id);if(!name)continue;
  const theme=/pok[eé]mon/i.test(name)?"Pokemon":name;
  const counter=result[theme]??(result[theme]={owned:0,wishlist:0});
  counter[mark]++;
 }
 return result;
}
