import "./lego-styles.css";
type SetRow={number:string;name:string;year:number;theme:string;parts:number;image?:string};
type Status="owned"|"wishlist";
const featured=["City","Pokemon","Star Wars","Technic","Botanicals","Icons"];
let themes=["All LEGO",...featured,"Complete Catalog"];
type ThemeInfo={name:string;count:number;image:string};
let extraThemes:ThemeInfo[]=[];
const key="archiv-lego-v1";
// Rebrickable set-image URLs supplied in the downloaded CSV catalog.
// Do not scrape or bulk-download images; display with source attribution.
const tileSets:Record<string,string>={
"Speed Champions":"77239-1",
"Star Wars":"75192-1",
"Technic":"42206-1",
"City":"60419-1",
"Icons":"10354-1",
"Architecture":"21063-1",
"Complete Catalog":"10307-1",
"Pokemon":"72152-1",
"Botanicals":"10311-1"
};
const setImage=(number:string)=>"https://cdn.rebrickable.com/media/sets/"+number+".jpg";
let selected="All LEGO",search="",sort="name",page=0;
function themeFromHash(){const slug=decodeURIComponent(location.hash.replace(/^#\/?/,""));return themes.slice(1).find(n=>n.toLowerCase().replace(/\s+/g,"-")===slug)||"All LEGO"}
selected=themeFromHash();
function goTheme(n:string){selected=n;search="";page=0;location.hash=n==="All LEGO"?"#/":"#/"+encodeURIComponent(n.toLowerCase().replace(/\s+/g,"-"));render()}
window.addEventListener("hashchange",()=>{const next=themeFromHash();if(next!==selected){selected=next;search="";page=0;render()}});
let saved:Record<string,Status>={};
try{saved=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
const app=document.querySelector<HTMLElement>("#app")!;
let data:SetRow[]=[];
const url=new URL("./lego-catalog.json",import.meta.url);
const themeUrl=new URL("./lego-themes.json",import.meta.url);
async function load(){try{const [setsResponse,themeResponse]=await Promise.all([fetch(url),fetch(themeUrl)]);if(setsResponse.ok)data=await setsResponse.json();if(themeResponse.ok){extraThemes=await themeResponse.json();themes=["All LEGO",...featured,...extraThemes.map(t=>t.name).filter(n=>!featured.includes(n)&&n!=="Pokémon"),"Complete Catalog"];}}catch{} selected=themeFromHash();render()}
function e<K extends keyof HTMLElementTagNameMap>(tag:K,cls="",value=""){const n=document.createElement(tag);n.className=cls;if(value){const parts=value.split("LEGO®");if(parts.length===1)n.textContent=value;else{parts.forEach((part,i)=>{if(i){n.append(document.createTextNode("LEGO"));const mark=document.createElement("sup");mark.className="lego-registered";mark.textContent="®";n.append(mark)}if(part)n.append(document.createTextNode(part))})}}return n}
function button(label:string,click:()=>void,cls=""){const b=e("button","lego-button "+cls,label);b.onclick=click;return b}
function save(id:string,status:Status){if(saved[id]===status)delete saved[id];else saved[id]=status;localStorage.setItem(key,JSON.stringify(saved));render()}
function render(){app.replaceChildren();const shell=e("div","lego-shell");app.append(shell);
const header=e("header","lego-header");
const logo=e("a","lego-logo");logo.href="#/";logo.onclick=(event)=>{event.preventDefault();goTheme("All LEGO")};logo.setAttribute("aria-label","Archív home");
const art=e("img");art.src=import.meta.env.BASE_URL+"archiv-lego-logo.png";art.alt="Archív. Your collection lives here.";art.onerror=()=>{art.onerror=null;art.src=import.meta.env.BASE_URL+"logo4"};logo.append(art);
header.append(logo);
shell.append(header);
function themeTile(n:string){const b=button("",()=>goTheme(n),"lego-theme");b.dataset.theme=n.toLowerCase().replace(/\s+/g,"-");const palette=["#527c8c","#866f9f","#a76d65","#497e6c","#c29553","#4f6897","#8d8065","#8c618b"];if(!featured.includes(n)&&n!=="Complete Catalog"){const i=Math.max(0,extraThemes.findIndex(t=>t.name===n));b.style.setProperty("--brick",palette[i%palette.length]);b.style.setProperty("--brick-dark",["#355968","#5d4b75","#784a46","#30584c","#8c6b35","#344968","#625b46","#664665"][i%palette.length]);b.style.setProperty("--brick-light",["#7fa2af","#ab96c4","#c8958a","#78a68d","#e0bc78","#7d90b8","#afa387","#b48caf"][i%palette.length])}const studs=e("span","lego-brick-studs");studs.setAttribute("aria-hidden","true");for(let i=0;i<4;i++)studs.append(e("span","lego-brick-stud"));b.append(studs);const picture=e("img","lego-theme-art");picture.src=tileSets[n]?setImage(tileSets[n]):extraThemes.find(t=>t.name===n)?.image||setImage("10307-1");picture.alt="LEGO® "+n+" set photograph sourced from Rebrickable";picture.loading="lazy";picture.onerror=()=>{picture.style.display="none"};const frame=e("span","lego-brick-window");frame.append(picture);b.append(frame,e("span","lego-theme-name",n));return b}
if(selected==="All LEGO"){
const heading=e("h2","lego-popular-heading","Most Popular");shell.append(heading);
const t=e("div","lego-theme-grid lego-home-themes");featured.forEach(n=>t.append(themeTile(n)));shell.append(t);
const more=e("section","lego-more-themes");more.append(e("h2","","More LEGO® themes"));
const field=e("input","lego-theme-search") as HTMLInputElement;field.type="search";field.placeholder="Find a LEGO® theme";field.setAttribute("aria-label","Find a LEGO theme");more.append(field);
const count=e("p","lego-theme-count");more.append(count);
const grid=e("div","lego-theme-name-grid");more.append(grid);
let showAllThemes=false;const toggle=button("See More",()=>{showAllThemes=!showAllThemes;showThemes()},"lego-more-toggle");
function showThemes(){const query=field.value.trim().toLowerCase();grid.replaceChildren();const options=themes.filter(n=>!featured.includes(n)&&n!=="All LEGO"&&n.toLowerCase().includes(query));const visible=query||showAllThemes?options:options.slice(0,12);count.textContent=options.length+" themes";visible.forEach(n=>grid.append(button(n,()=>goTheme(n),"lego-theme-name-button")));toggle.textContent=showAllThemes?"See Less":"See More";toggle.hidden=!!query||options.length<=12}
field.oninput=showThemes;showThemes();more.append(toggle);shell.append(more);
}else{
header.classList.add("lego-theme-header");const feature=e("div","lego-featured-theme");feature.append(themeTile(selected));header.append(feature);const back=button("← Back to Themes",()=>goTheme("All LEGO"),"lego-back-to-themes");back.setAttribute("aria-label","Back to all LEGO themes");header.append(back);
}
const footer=e("footer","lego-footer");
const footerLinks=e("nav","lego-footer-links");footerLinks.setAttribute("aria-label","Site information");
for(const [label,file] of [["Contact","contact.html"],["Attribution","attribution.html"],["Terms of Use","terms.html"],["Privacy","privacy.html"]]){const link=e("a","",label);link.href=import.meta.env.BASE_URL+file;footerLinks.append(link)}
footer.append(footerLinks);
footer.append(e("p","lego-copyright","© 2026 Archív. All rights reserved."));
footer.append(e("p","lego-footer-disclaimer","LEGO® and the LEGO® logo are trademarks of the LEGO Group. Archív is an independent collector app and is not sponsored or endorsed by the LEGO Group."));
if(selected!=="All LEGO"){
const main=e("section","lego-main lego-catalog-section");main.append(e("h2","",selected));
const controls=e("div","lego-controls");const input=e("input") as HTMLInputElement;input.placeholder="Search by set name, number, or year";input.value=search;input.setAttribute("aria-label","Search LEGO® sets");input.oninput=()=>{search=input.value;page=0;renderResults()};controls.append(input);
const select=e("select") as HTMLSelectElement;for(const [v,l] of [["name","Name"],["year","Newest first"],["number","Set number"]]){const o=e("option") as HTMLOptionElement;o.value=v;o.textContent=l;select.append(o)}select.value=sort;select.onchange=()=>{sort=select.value;page=0;renderResults()};controls.append(select);main.append(controls);
const summary=e("div","lego-summary");const results=e("div","lego-results");const pager=e("div","lego-pagination");main.append(summary,results,pager);
shell.append(main);
const notice=e("section","lego-affiliate");notice.append(e("p","","Shopping links will appear on unowned sets once authorized seller offers are available. No live affiliate offers are connected yet."));shell.append(notice);
function renderResults(){
results.replaceChildren();pager.replaceChildren();
let rows=data.filter(x=>(selected==="Complete Catalog"||x.theme===selected||(selected==="Pokemon"&&(/pokemon|pokémon/i.test(x.name)||/pokemon|pokémon/i.test(x.theme))))&&(!search||[x.name,x.number,String(x.year)].join(" ").toLowerCase().includes(search.toLowerCase())));
rows.sort((a,b)=>{const ownedDiff=Number(saved[b.number]==="owned")-Number(saved[a.number]==="owned");return ownedDiff|| (sort==="year"?b.year-a.year:sort==="number"?a.number.localeCompare(b.number):a.name.localeCompare(b.name))});
const ownedCount=rows.filter(x=>saved[x.number]==="owned").length;
summary.textContent=`${rows.length.toLocaleString()} sets in view · ${ownedCount} owned · ${Math.max(0,rows.length-ownedCount)} missing`;
if(!data.length){results.append(e("p","lego-empty","Catalog preview temporarily unavailable."));return}
if(!rows.length){results.append(e("p","lego-empty","No matching sets. Try another search."));return}
for(const row of rows.slice(page*24,(page+1)*24)){
const owned=saved[row.number]==="owned",wish=saved[row.number]==="wishlist";
const card=e("article","lego-set-tile "+(owned?"is-owned":"is-unowned"));
const cover=e("div","lego-set-cover");const img=e("img","lego-set-photo");
img.src=row.image||setImage(row.number);img.alt=row.name+" set image";img.loading="lazy";img.onerror=()=>{img.style.display="none";cover.append(e("span","lego-image-fallback","Image unavailable"))};cover.append(img);
const status=e("span","lego-set-status "+(owned?"owned":wish?"wishlist":"missing"),owned?"✓ OWNED":wish?"♡ WISHLIST":"NOT OWNED");cover.append(status);card.append(cover);
const details=e("div","lego-set-details");details.append(e("p","lego-number",row.number+" · "+row.year));details.append(e("h3","",row.name));details.append(e("p","lego-detail",row.parts+" pieces"));card.append(details);
const actions=e("div","lego-set-actions");actions.append(button(owned?"✓ Owned":"Mark owned",()=>save(row.number,"owned"),owned?"on":""));
if(!owned){
actions.append(button(wish?"✓ Wishlisted":"♡ Wishlist",()=>save(row.number,"wishlist"),wish?"on":""));
const shop=e("div","lego-shop-pending");shop.append(e("span","","Find a seller"));shop.append(e("small","","Affiliate offers coming soon"));actions.append(shop);
}
card.append(actions);results.append(card);
}
if(page>0)pager.append(button("Previous",()=>{page--;renderResults()}));
if((page+1)*24<rows.length)pager.append(button("Next",()=>{page++;renderResults()}));
}
renderResults()}
shell.append(footer);
}
void load();
