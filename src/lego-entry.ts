import "./lego-styles.css";
type SetRow={number:string;name:string;year:number;theme:string;parts:number;image?:string};
type Status="owned"|"wishlist";
const themes=["All LEGO","Speed Champions","Star Wars","Technic","City","Icons","Architecture"];
const key="archiv-lego-v1";
// Rebrickable set-image URLs supplied in the downloaded CSV catalog.
// Do not scrape or bulk-download images; display with source attribution.
const tileSets:Record<string,string>={
"Speed Champions":"77239-1",
"Star Wars":"75192-1",
"Technic":"42206-1",
"City":"60473-1",
"Icons":"10354-1",
"Architecture":"21063-1"
};
const setImage=(number:string)=>"https://cdn.rebrickable.com/media/sets/"+number+".jpg";
let selected="All LEGO",search="",filter="all",sort="name",page=0;
let saved:Record<string,Status>={};
try{saved=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
const app=document.querySelector<HTMLElement>("#app")!;
let data:SetRow[]=[];
const url=new URL("./lego-catalog.json",import.meta.url);
async function load(){try{const r=await fetch(url);if(r.ok)data=await r.json()}catch{} render()}
function e<K extends keyof HTMLElementTagNameMap>(tag:K,cls="",value=""){const n=document.createElement(tag);n.className=cls;if(value)n.textContent=value;return n}
function button(label:string,click:()=>void,cls=""){const b=e("button","lego-button "+cls,label);b.onclick=click;return b}
function save(id:string,status:Status){if(saved[id]===status)delete saved[id];else saved[id]=status;localStorage.setItem(key,JSON.stringify(saved));render()}
function render(){app.replaceChildren();const shell=e("div","lego-shell");app.append(shell);
const header=e("header","lego-header");
const logo=e("a","lego-logo");logo.href="#/";logo.setAttribute("aria-label","Archív home");
const art=e("img");art.src=import.meta.env.BASE_URL+"logo4";art.alt="Archív";logo.append(art);
const caption=e("div","lego-tagline","YOUR COLLECTION LIVES HERE");logo.append(caption);header.append(logo);
const nav=e("nav","lego-topnav");nav.append(button("Explore your Archív",()=>{filter="all";selected="All LEGO";render()},filter==="all"?"active":""),button("Your Archív",()=>{filter="saved";render()},filter==="saved"?"active":""));header.append(nav);shell.append(header);
const title=e("section","lego-intro");title.append(e("p","lego-eyebrow","ARCHÍV 2.0 · LEGO COLLECTIONS"));title.append(e("h1","",filter==="saved"?"Your LEGO collection":"Explore LEGO collections"));title.append(e("p","",filter==="saved"?"See the sets you own and the ones on your wishlist.":"Discover sets across LEGO themes, track what you own, and find what you're missing."));shell.append(title);
const t=e("div","lego-theme-grid");themes.slice(1).forEach(n=>{const b=button("",()=>{selected=n;filter="all";page=0;render()},"lego-theme "+(selected===n?"current":""));const picture=e("img","lego-theme-art");picture.src=setImage(tileSets[n]);picture.alt="LEGO "+n+" set photograph sourced from Rebrickable";picture.loading="lazy";picture.onerror=()=>{picture.style.display="none"};picture.loading="lazy";b.append(picture,e("span","lego-theme-name",n));t.append(b)});shell.append(t);
const main=e("section","lego-main");main.append(e("h2","",selected==="All LEGO"?"Browse LEGO sets":selected));
const controls=e("div","lego-controls");const input=e("input") as HTMLInputElement;input.placeholder="Search by set name or number";input.value=search;input.setAttribute("aria-label","Search LEGO sets");input.oninput=()=>{search=input.value;page=0;renderResults()};controls.append(input);
const select=e("select") as HTMLSelectElement;for(const [v,l] of [["name","Name"],["year","Newest first"],["number","Set number"]]){const o=e("option") as HTMLOptionElement;o.value=v;o.textContent=l;select.append(o)}select.value=sort;select.onchange=()=>{sort=select.value;renderResults()};controls.append(select);main.append(controls);
const summary=e("div","lego-summary");const results=e("div","lego-results");const pager=e("div","lego-pagination");main.append(summary,results,pager);
shell.append(main);
const notice=e("section","lego-affiliate");notice.append(e("h2","","Find your next set"));notice.append(e("p","","LEGO.com affiliate shopping and prices are awaiting program approval and authorized feed access."));notice.append(button("Affiliate shopping · Approval pending",()=>{},"disabled"));shell.append(notice);
const footer=e("footer","lego-footer");footer.append(e("p","","Set data and set images: Rebrickable (rebrickable.com). Image rights remain subject to LEGO terms. Archív is independent and is not sponsored or endorsed by the LEGO Group."));shell.append(footer);
function renderResults(){results.replaceChildren();pager.replaceChildren();let rows=data.filter(x=>(selected==="All LEGO"||x.theme===selected)&&(filter!=="saved"||saved[x.number])&&(!search||[x.name,x.number,String(x.year)].join(" ").toLowerCase().includes(search.toLowerCase())));
rows.sort((a,b)=>sort==="year"?b.year-a.year:sort==="number"?a.number.localeCompare(b.number):a.name.localeCompare(b.name));
summary.textContent=`${rows.length.toLocaleString()} sets · ${Object.values(saved).filter(x=>x==="owned").length} owned · ${Object.values(saved).filter(x=>x==="wishlist").length} wishlist`;
if(!data.length){results.append(e("p","lego-empty","Catalog preview temporarily unavailable."));return}
if(!rows.length){results.append(e("p","lego-empty","No matching sets. Try another theme or search."));return}
for(const row of rows.slice(page*24,(page+1)*24)){const card=e("article","lego-card");const info=e("div");if(row.image||row.number){const productImg=e("img","lego-product-image");productImg.src=row.image||setImage(row.number);productImg.alt=row.name+" set image";productImg.loading="lazy";productImg.onerror=()=>{productImg.style.display="none"};card.append(productImg)}info.append(e("p","lego-number",row.number+" · "+row.year));info.append(e("h3","",row.name));info.append(e("p","lego-detail",row.theme+" · "+row.parts+" pieces"));card.append(info);const actions=e("div","lego-actions");actions.append(button(saved[row.number]==="owned"?"✓ Owned":"+ Owned",()=>save(row.number,"owned"),saved[row.number]==="owned"?"on":""),button(saved[row.number]==="wishlist"?"✓ Wishlist":"+ Wishlist",()=>save(row.number,"wishlist"),saved[row.number]==="wishlist"?"on":""));card.append(actions);results.append(card)}
if(page>0)pager.append(button("Previous",()=>{page--;renderResults()}));if((page+1)*24<rows.length)pager.append(button("Next",()=>{page++;renderResults()}));}
renderResults()}
void load();
