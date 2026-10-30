import "./lego-styles.css";
type SetRow={number:string;name:string;year:number;theme:string;parts:number;image?:string;images?:string[]};
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
function setFromHash(){const m=location.hash.match(/^#\/set\/(.+)$/);return m?decodeURIComponent(m[1]):null}
function goSet(id:string){location.hash="#/set/"+encodeURIComponent(id);render()}
function themeFromHash(){const slug=decodeURIComponent(location.hash.replace(/^#\/?/,""));return themes.slice(1).find(n=>n.toLowerCase().replace(/\s+/g,"-")===slug)||"All LEGO"}
selected=themeFromHash();
function goTheme(n:string){selected=n;search="";page=0;location.hash=n==="All LEGO"?"#/":"#/"+encodeURIComponent(n.toLowerCase().replace(/\s+/g,"-"));render()}
window.addEventListener("hashchange",()=>{if(setFromHash()){render();return}const next=themeFromHash();if(next!==selected){selected=next;search="";page=0;render()}});
let saved:Record<string,Status>={};
try{saved=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
const app=document.querySelector<HTMLElement>("#app")!;
let data:SetRow[]=[];
const url=new URL("./lego-catalog.json",import.meta.url);
const themeUrl=new URL("./lego-themes.json",import.meta.url);
async function load(){try{const [setsResponse,themeResponse]=await Promise.all([fetch(url),fetch(themeUrl)]);if(setsResponse.ok)data=await setsResponse.json();if(themeResponse.ok){extraThemes=await themeResponse.json();themes=["All LEGO",...featured,...extraThemes.map(t=>t.name).filter(n=>!featured.includes(n)&&n!=="Pokémon"),"Complete Catalog"];}}catch{} if(!setFromHash())selected=themeFromHash();render()}
function e<K extends keyof HTMLElementTagNameMap>(tag:K,cls="",value=""){const n=document.createElement(tag);n.className=cls;if(value){const parts=value.split("LEGO®");if(parts.length===1)n.textContent=value;else{parts.forEach((part,i)=>{if(i){n.append(document.createTextNode("LEGO"));const mark=document.createElement("sup");mark.className="lego-registered";mark.textContent="®";n.append(mark)}if(part)n.append(document.createTextNode(part))})}}return n}
function button(label:string,click:()=>void,cls=""){const b=e("button","lego-button "+cls,label);b.onclick=click;return b}
function save(id:string,status:Status){if(saved[id]===status)delete saved[id];else saved[id]=status;localStorage.setItem(key,JSON.stringify(saved));render()}
type PartLine={id:string;name:string;color:string;quantity:number;image:string};
type Inventory={parts:PartLine[];minifigs:PartLine[];spares:PartLine[]};
const inventoryCache=new Map<number,Record<string,Inventory>>();
function inventoryBucket(id:string){let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;return h%128}
async function loadInventory(id:string):Promise<Inventory|null>{
 const bucket=inventoryBucket(id);
 if(!inventoryCache.has(bucket)){const response=await fetch(import.meta.env.BASE_URL+"lego-parts/"+bucket+".json");if(!response.ok)throw Error("Inventory unavailable");inventoryCache.set(bucket,await response.json())}
 return inventoryCache.get(bucket)?.[id]||null;
}
function renderInventory(parent:HTMLElement,setNumber:string){
 const section=e("section","archiv-inventory");section.append(e("div","archiv-inventory-heading"));
 const heading=section.firstElementChild as HTMLElement;
 heading.append(e("p","archiv-eyebrow","YOUR SET, PIECE BY PIECE"),e("h2","","Parts inventory"));
 const message=e("p","archiv-inventory-loading","Loading the set inventory…");section.append(message);parent.append(section);
 void loadInventory(setNumber).then(inv=>{
  if(!section.isConnected)return;
  message.remove();
  if(!inv){section.append(e("p","archiv-empty-inventory","A parts inventory hasn't been published for this set yet."));return}
  const key="archiv-parts-checked:"+setNumber;let checks:Record<string,boolean>={};
  try{checks=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
  let query="",color="All colors",showChecklist=false,showAllBuilding=false,showAllSpares=false;
  const tools=e("div","archiv-parts-toolbar");
  const searchBox=e("input") as HTMLInputElement;searchBox.type="search";searchBox.placeholder="Find a piece or number";searchBox.setAttribute("aria-label","Search pieces");tools.append(searchBox);
  const colorSelect=e("select") as HTMLSelectElement;colorSelect.setAttribute("aria-label","Filter by color");
  const allColors=[...new Set([...inv.parts,...inv.spares].map(p=>p.color))].sort();
  for(const c of ["All colors",...allColors]){const opt=e("option","",c);opt.value=c;colorSelect.append(opt)}tools.append(colorSelect);
  const checkButton=button("Track pieces",()=>{showChecklist=!showChecklist;checkButton.textContent=showChecklist?"Hide checklist":"Track pieces";draw()},"archiv-check-toggle");tools.append(checkButton);
  section.append(tools);
  const progress=e("p","archiv-parts-progress");section.append(progress);
  const lists=e("div","archiv-parts-lists");section.append(lists);
  function draw(){
   lists.replaceChildren();
   const total=[...inv.parts,...inv.minifigs,...inv.spares];const checked=total.filter((p,i)=>checks[(i<inv.parts.length?"parts":i<inv.parts.length+inv.minifigs.length?"minifigs":"spares")+":"+p.id+":"+p.color]).length;
   progress.textContent=showChecklist?checked+" of "+total.length+" part types checked":total.reduce((n,p)=>n+p.quantity,0).toLocaleString()+" pieces across "+total.length.toLocaleString()+" inventory entries";
   for(const [kind,title,items] of [["minifigs","Minifigures",inv.minifigs],["spares","Extra & spare pieces",inv.spares],["parts","Building pieces",inv.parts]] as const){
    const panel=e("section","archiv-parts-panel");const details=e("details","archiv-parts-section");details.open=true;
    const sum=e("summary","archiv-parts-section-head");sum.append(e("span","",title),e("span","archiv-parts-pill",items.length+" types · "+items.reduce((n,p)=>n+p.quantity,0)+" pieces"));details.append(sum);
    const matched=items.filter(p=>(kind==="minifigs"||color==="All colors"||p.color===color)&&[p.id,p.name,p.color].join(" ").toLowerCase().includes(query));
    const grid=e("div","archiv-parts-grid");
    for(const p of matched){const entry=e("article","archiv-part-card");const pic=e("div","archiv-part-photo");
      if(p.image){const img=e("img");img.src=p.image;img.alt=p.name;img.loading="lazy";img.onerror=()=>{img.remove();pic.append(e("span","archiv-part-placeholder","Image unavailable"))};pic.append(img)}else pic.append(e("span","archiv-part-placeholder","Image unavailable"));
      entry.append(pic,e("strong","archiv-part-quantity",p.quantity+" ×"),e("p","archiv-part-name",p.name),e("p","archiv-part-meta",p.id+(p.color?" · "+p.color:"")));
      if(showChecklist){const id=kind+":"+p.id+":"+p.color;const line=e("label","archiv-part-check");const tick=e("input") as HTMLInputElement;tick.type="checkbox";tick.checked=!!checks[id];tick.onchange=()=>{checks[id]=tick.checked;localStorage.setItem(key,JSON.stringify(checks));draw()};line.append(tick,document.createTextNode("Accounted for"));entry.append(line);if(checks[id])entry.classList.add("archiv-part-checked")}
      grid.append(entry);
    }
    if(!matched.length)details.append(e("p","archiv-parts-no-match",items.length?"No pieces match this filter.":"No entries for this set."));
    details.append(grid);
    if((kind==="parts"||kind==="spares")&&matched.length){const updateLimit=()=>{
      const cards=[...grid.children] as HTMLElement[];
      cards.forEach(card=>{card.hidden=false});
      const offsets=cards.map(card=>card.offsetTop);
      const rows=[...new Set(offsets)].sort((a,b)=>a-b);
      const maxRows=kind==="spares"?2:3;
      const lastVisibleRow=rows[maxRows-1]??Infinity;
      cards.forEach((card,i)=>{card.hidden=!(kind==="spares"?showAllSpares:showAllBuilding)&&offsets[i]>lastVisibleRow});
      toggle.hidden=rows.length<=maxRows;
      toggle.textContent=(kind==="spares"?showAllSpares:showAllBuilding)?"See Less":"See More";
    };
    const toggle=button("See More",()=>{if(kind==="spares")showAllSpares=!showAllSpares;else showAllBuilding=!showAllBuilding;updateLimit()},"archiv-parts-more");
    details.append(toggle);
    requestAnimationFrame(()=>{if(grid.isConnected)updateLimit()});
    }
    panel.append(details);lists.append(panel);
   }
  }
  searchBox.oninput=()=>{query=searchBox.value.toLowerCase().trim();draw()};
  colorSelect.onchange=()=>{color=colorSelect.value;draw()};
  draw();
 }).catch(()=>{if(section.isConnected)message.textContent="Parts inventory is currently unavailable. Please try again later."});
}
// EPN tracking parameters follow eBay's published link specification.
// A search-results link does not imply a verified listing, price, or availability.
const EPN_CAMPAIGN="5339235740";
function ebaySetSearch(row:SetRow){
 const u=new URL("https://www.ebay.com/sch/i.html");
 u.searchParams.set("_nkw","LEGO "+row.number+" "+row.name);
 u.searchParams.set("mkevt","1");
 u.searchParams.set("mkcid","1");
 u.searchParams.set("mkrid","711-53200-19255-0");
 u.searchParams.set("campid",EPN_CAMPAIGN);
 u.searchParams.set("toolid","10001");
 return u.toString();
}
function renderSetDetail(shell:HTMLElement,id:string){
 const row=data.find(x=>x.number===id);
 const wrap=e("main","lego-set-detail");
 const homeTheme=row?.theme||"Complete Catalog";
 const back=button("← Back to "+(selected!=="All LEGO"?selected:homeTheme),()=>goTheme(selected!=="All LEGO"?selected:homeTheme),"lego-detail-back");
 wrap.append(back);
 if(!row){wrap.append(e("h1","","Set not found"));wrap.append(e("p","","This set is not present in the current Rebrickable catalog."));shell.append(wrap);return}
 const owned=saved[row.number]==="owned",wish=saved[row.number]==="wishlist";
 const hero=e("div","lego-detail-layout");
 const figure=e("div","lego-detail-figure");
 const candidates=[...(row.images||[]),row.image||""].filter(Boolean);
 const images=[...new Set(candidates)];
 if(!images.length){figure.append(e("p","lego-empty","No set photographs are available."))}
 else{
  const mainImage=e("img","lego-gallery-main");mainImage.alt=row.name+" photograph 1 of "+images.length;
  const counter=e("p","lego-gallery-count");
  const controls=e("div","lego-gallery-controls");
  let active=0;
  function showImage(index:number){active=(index+images.length)%images.length;mainImage.src=images[active];mainImage.alt=row.name+" photograph "+(active+1)+" of "+images.length;counter.textContent=(active+1)+" / "+images.length;for(const [i,b] of [...controls.children].entries())b.classList.toggle("active",i===active)}
  mainImage.onerror=()=>{mainImage.style.display="none";counter.textContent="This photograph is unavailable."};
  figure.append(mainImage);
  if(images.length>1){const prev=button("← Previous",()=>showImage(active-1),"lego-gallery-prev"),next=button("Next →",()=>showImage(active+1),"lego-gallery-next");figure.append(e("div","lego-gallery-arrows"));figure.lastElementChild?.append(prev,next);for(let i=0;i<images.length;i++){const thumb=e("button","lego-gallery-thumb");thumb.setAttribute("aria-label","Show photograph "+(i+1));const pic=e("img");pic.src=images[i];pic.alt="";thumb.append(pic);thumb.onclick=()=>showImage(i);controls.append(thumb)}figure.append(controls)}
  
  if(images.length>1)figure.append(counter);
  showImage(0);
 }
 const details=e("section","lego-detail-info");
 details.append(e("p","lego-detail-kicker","LEGO® set "+row.number));
 details.append(e("h1","",row.name));
 const facts=e("dl","lego-detail-facts");
 for(const [label,value] of [["Set number",row.number],["Theme",row.theme],["Release year",String(row.year||"Not listed")],["Pieces",row.parts?row.parts.toLocaleString():"Not listed"]]){const item=e("div");item.append(e("dt","",label),e("dd","",value));facts.append(item)}
 details.append(facts);
 details.append(e("p","lego-detail-status",owned?"✓ In your collection":wish?"♡ On your wishlist":"Not in your collection"));
 const actions=e("div","lego-detail-actions");
 actions.append(button(owned?"✓ Owned · Remove":"Mark as owned",()=>save(row.number,"owned"),owned?"on":""));
 actions.append(button(wish?"✓ On wishlist":"♡ Add to wishlist",()=>save(row.number,"wishlist"),wish?"on":""));
 details.append(actions);
 if(!owned){
  const seller=e("div","lego-shop-pending archiv-ebay-inline");
  const link=e("a","archiv-ebay-inline-link","Find on eBay ↗");
  link.href=ebaySetSearch(row);link.target="_blank";link.rel="noopener noreferrer sponsored";
  link.setAttribute("aria-label","Find "+row.name+" on eBay (affiliate link)");
  seller.append(link,e("small","","Search eBay listings for this exact set"));
  seller.append(e("p","archiv-ebay-inline-disclosure","Affiliate link: Archív may earn a commission from qualifying purchases. Seller listings, prices and availability are not verified."));
  details.append(seller);
 }

 hero.append(figure,details);wrap.append(hero);
 renderInventory(wrap,row.number);
 wrap.append(e("p","lego-detail-credit","Set information and imagery sourced from Rebrickable. Product images are owned by their respective rights holders."));
 shell.append(wrap);
}
function render(){app.replaceChildren();const shell=e("div","lego-shell");app.append(shell);
const header=e("header","lego-header");
const logo=e("a","lego-logo");logo.href="#/";logo.onclick=(event)=>{event.preventDefault();goTheme("All LEGO")};logo.setAttribute("aria-label","Archív home");
const art=e("img");art.src=import.meta.env.BASE_URL+"archiv-lego-logo.png";art.alt="Archív. Your collection lives here.";art.onerror=()=>{art.onerror=null;art.src=import.meta.env.BASE_URL+"logo4"};logo.append(art);
header.append(logo);
shell.append(header);
const setId=setFromHash();
if(setId){
 const returnButton=button("← Back to Sets",()=>goTheme(selected!=="All LEGO"?selected:data.find(x=>x.number===setId)?.theme||"Complete Catalog"),"lego-back-to-themes");
 header.classList.add("lego-detail-header");header.append(returnButton);
 renderSetDetail(shell,setId);
 const foot=e("footer","lego-footer");const nav=e("nav","lego-footer-links");
 for(const [label,file] of [["Contact","contact.html"],["Attribution","attribution.html"],["Terms of Use","terms.html"],["Privacy","privacy.html"]]){const link=e("a","",label);link.href=import.meta.env.BASE_URL+file;nav.append(link)}
 foot.append(nav,e("p","lego-copyright","© 2026 Archív. All rights reserved."));shell.append(foot);return
}
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
const cover=e("a","lego-set-cover lego-set-open");cover.href="#/set/"+encodeURIComponent(row.number);cover.setAttribute("aria-label","View details for "+row.name);const img=e("img","lego-set-photo");
img.src=row.image||setImage(row.number);img.alt=row.name+" set image";img.loading="lazy";img.onerror=()=>{img.style.display="none";cover.append(e("span","lego-image-fallback","Image unavailable"))};cover.append(img);
const status=e("span","lego-set-status "+(owned?"owned":wish?"wishlist":"missing"),owned?"✓ OWNED":wish?"♡ WISHLIST":"NOT OWNED");cover.append(status);card.append(cover);
const details=e("a","lego-set-details lego-set-open");details.href="#/set/"+encodeURIComponent(row.number);details.setAttribute("aria-label","View details for "+row.name);details.append(e("p","lego-number",row.number+" · "+row.year));details.append(e("h3","",row.name));details.append(e("p","lego-detail",row.parts+" pieces"));card.append(details);
const actions=e("div","lego-set-actions");actions.append(button(owned?"✓ Owned":"Mark owned",()=>save(row.number,"owned"),owned?"on":""));
if(!owned){
actions.append(button(wish?"✓ Wishlisted":"♡ Wishlist",()=>save(row.number,"wishlist"),wish?"on":""));
const shop=e("div","lego-shop-pending");shop.append(e("span","","Find a seller"));shop.append(e("small","","Affiliate offers coming soon"));actions.append(shop);
}
actions.append(button("View details →",()=>goSet(row.number),"lego-view-detail"));card.append(actions);results.append(card);
}
if(page>0)pager.append(button("Previous",()=>{page--;renderResults()}));
if((page+1)*24<rows.length)pager.append(button("Next",()=>{page++;renderResults()}));
}
renderResults()}
shell.append(footer);
}
void load();
