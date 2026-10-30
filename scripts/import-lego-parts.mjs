// Generate lazy-loaded, sharded set inventories from Rebrickable's official CSV exports.
// Read files as streams to avoid holding the giant inventory_parts download in memory.
import {createReadStream,writeFileSync,mkdirSync} from "node:fs";
import {createGunzip} from "node:zlib";
import {createInterface} from "node:readline";
const root=new URL("../",import.meta.url),out=new URL("../public/lego-parts/",import.meta.url);
const SHARDS=128;
function bucket(id){let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;return h%SHARDS}
function fields(line){let cols=[],v="",quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){v+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){cols.push(v);v=""}else v+=c}cols.push(v);return cols}
async function readCsv(name,fn){const reader=createInterface({input:createReadStream(new URL("../data/"+name+".csv.gz",import.meta.url)).pipe(createGunzip()),crlfDelay:Infinity});let header;for await(const line of reader){if(!header){header=fields(line.replace(/^\uFEFF/,""));continue}if(!line)continue;const cols=fields(line);const row={};header.forEach((k,i)=>row[k]=cols[i]||"");fn(row)}}
const colors=new Map(),parts=new Map(),minifigs=new Map(),chosen=new Map(),inventoryToSet=new Map();
await readCsv("colors",r=>colors.set(r.id,r.name));
await readCsv("parts",r=>parts.set(r.part_num,r.name));
await readCsv("minifigs",r=>minifigs.set(r.fig_num,{name:r.name,image:r.img_url||""}));
await readCsv("inventories",r=>{if(!r.set_num||!r.id)return;const before=chosen.get(r.set_num);if(!before||Number(r.version)>Number(before.version))chosen.set(r.set_num,{id:r.id,version:r.version})});
for(const [setNum,inv] of chosen)inventoryToSet.set(inv.id,setNum);
const stores=Array.from({length:SHARDS},()=>Object.create(null));
function collection(id){const set=inventoryToSet.get(id);if(!set)return null;const shard=stores[bucket(set)];return shard[set]||(shard[set]={parts:[],minifigs:[],spares:[]})}
await readCsv("inventory_parts",r=>{const dest=collection(r.inventory_id);if(!dest)return;const part=r.part_num||"";const item={id:part,name:parts.get(part)||part,color:colors.get(r.color_id)||"Unknown color",quantity:Number(r.quantity)||0,image:r.img_url||""};(r.is_spare==="t"||r.is_spare==="True"||r.is_spare==="1"?dest.spares:dest.parts).push(item)});
await readCsv("inventory_minifigs",r=>{const dest=collection(r.inventory_id);if(!dest)return;const fig=minifigs.get(r.fig_num);dest.minifigs.push({id:r.fig_num,name:fig?.name||r.fig_num,color:"",quantity:Number(r.quantity)||1,image:fig?.image||""})});
mkdirSync(out,{recursive:true});
let sets=0,partLines=0;
for(let i=0;i<SHARDS;i++){const data=stores[i];sets+=Object.keys(data).length;for(const v of Object.values(data))partLines+=v.parts.length+v.spares.length+v.minifigs.length;writeFileSync(new URL(String(i)+".json",out),JSON.stringify(data))}
console.log("Built inventory shards:",sets,"sets,",partLines,"inventory entries");
if(sets<15000||partLines<100000)throw Error("Rebrickable inventory import unexpectedly small");
