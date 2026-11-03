/** Extract printed LEGO set numbers from OCR text and match only existing catalog sets.
 * The scanner intentionally never guesses an item or changes a user's collection. */
export type ScannableSet={
 number:string;name:string;year:number;theme:string;parts:number;image?:string;
};
export type ScanHit={set:ScannableSet;matchedText:string;exactVersion:boolean};
function uniqueStrings(values:string[]):string[]{return [...new Set(values)];}

/** Normalize dash variants but preserve leading zeros and the set's revision suffix. */
function clean(text:string):string{
 return text.normalize("NFKC").replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g,"-");
}
function candidateIds(base:string,revision:string|undefined,catalog:readonly ScannableSet[]):string[]{
 if(revision)return [base+"-"+revision];
 const exact=base.includes("-")?base:base+"-1";
 const alternatives=catalog.filter(x=>x.number.startsWith(base+"-")).map(x=>x.number);
 return uniqueStrings([exact,...alternatives]);
}
export function findSetNumberMatches(
 recognizedText:string,catalog:readonly ScannableSet[],limit=6
):ScanHit[]{
 const text=clean(recognizedText);
 // Bracket the number so a UPC/EAN, date, or long alphanumeric code is not treated
 // as an arbitrary fragment of a set number. OCR is fallible: every hit is shown for confirmation.
 const printed=/(^|[^A-Za-z0-9])([0-9]{3,8})(?:\s*[-/]\s*([0-9]{1,2}))?(?=$|[^A-Za-z0-9])/gm;
 const byNumber=new Map(catalog.map(row=>[row.number.toLowerCase(),row]));
 const tokens:{text:string;base:string;revision:string|undefined;priority:number}[]=[];
 for(const match of text.matchAll(printed)){
  const base=match[2],revision=match[3];
  if(!base)continue;
  const priority=(revision?4:0)+(base.length>=4&&base.length<=7?2:0)+Math.min(base.length,8)/100;
  tokens.push({text:match[0].trim(),base,revision,priority});
 }
 tokens.sort((a,b)=>b.priority-a.priority);
 const output:ScanHit[]=[],seen=new Set<string>();
 for(const token of tokens){
  for(const id of candidateIds(token.base,token.revision,catalog)){
   const set=byNumber.get(id.toLowerCase());
   if(!set||seen.has(set.number))continue;
   seen.add(set.number);
   output.push({set,matchedText:token.text,exactVersion:!!token.revision});
   if(output.length>=limit)return output;
  }
 }
 return output;
}
/** Manual correction uses the same untrusted input parsing and exact catalog lookup. */
export function findManualSetNumber(
 input:string,catalog:readonly ScannableSet[]
):ScanHit[]{
 const text=clean(input.trim()).replace(/\s+/g,"");
 if(!/^[0-9]{3,8}(?:[-/][0-9]{1,2})?$/.test(text))return [];
 const [base,rev]=text.split(/[-/]/);
 const byNumber=new Map(catalog.map(row=>[row.number.toLowerCase(),row]));
 return candidateIds(base,rev,catalog)
  .map(id=>({set:byNumber.get(id.toLowerCase()),matchedText:text,exactVersion:!!rev}))
  .filter((r):r is ScanHit=>!!r.set)
  .slice(0,6);
}
