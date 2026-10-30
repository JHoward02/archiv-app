// Build-time Rebrickable catalog import. Sources: official Rebrickable CSV downloads.
// No API key or production-app changes are required.
import {readFileSync,writeFileSync} from "node:fs";
import {gunzipSync} from "node:zlib";
const root=new URL("../",import.meta.url);
function csv(file){
 const input=gunzipSync(readFileSync(new URL("data/"+file+".csv.gz",root))).toString("utf8");
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(quoted){if(c==='"'&&input[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}
  else if(c==='"')quoted=true;
  else if(c===","){row.push(cell);cell=""}
  else if(c==="\n"){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell=""}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell);rows.push(row)}
 const headers=rows.shift();return rows.filter(r=>r.length>=headers.length).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}
const themeRows=csv("themes"),themeMap=new Map(themeRows.map(t=>[t.id,t]));
const rootThemes=new Map([["1","Technic"],["52","City"],["158","Star Wars"],["252","Architecture"],["601","Speed Champions"],["721","Icons"]]);
function classify(id){
 const seen=new Set();let rootTheme;
 while(id&&!seen.has(id)){
  if(rootThemes.has(id))return rootThemes.get(id);
  seen.add(id);
  const node=themeMap.get(id);
  if(!node)break;
  rootTheme=node;
  id=node.parent_id;
 }
 const name=rootTheme?.name || "Other LEGO";
 return name==="Pokémon"?"Pokemon":name;
}
const rows=csv("sets").filter(s=>s.set_num&&s.name).map(s=>({number:s.set_num,name:s.name,year:Number(s.year)||0,theme:classify(s.theme_id),parts:Number(s.num_parts)||0,image:s.img_url||""}));
writeFileSync(new URL("src/lego-catalog.json",root),JSON.stringify(rows));
const counts=new Map(),images=new Map();
for(const row of rows){
 counts.set(row.theme,(counts.get(row.theme)||0)+1);
 const current=images.get(row.theme);
 if(row.image&&(!current||row.year>current.year))images.set(row.theme,{number:row.number,image:row.image,year:row.year});
}
const categories=[...counts].filter(([name])=>name!=="Other LEGO").sort((a,b)=>a[0].localeCompare(b[0])).map(([name,count])=>({name,count,image:images.get(name)?.image||""}));
writeFileSync(new URL("src/lego-themes.json",root),JSON.stringify(categories));
console.log("Rebrickable catalog imported:",rows.length,"sets, ",themeRows.length,"themes,",categories.length,"navigation themes.");
if(rows.length<25000||categories.length<15)throw Error("Rebrickable import unexpectedly small");
