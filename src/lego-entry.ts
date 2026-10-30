import "./lego-styles.css";
type SetRow={number:string;name:string;year:number;theme:string;parts:number};
type Status="owned"|"wishlist";
const themes=["All LEGO","Speed Champions","Star Wars","Technic","City","Icons","Architecture"];
const key="archiv-lego-v1";
// Original vector artwork. No LEGO packaging, logos, or third-party product images.
const tilePalette:Record<string,[string,string,string]>={
"Speed Champions":["#254d6d","#e25738","#f9d4a1"],
"Star Wars":["#15273e","#93a8bb","#e6bd65"],
"Technic":["#434b56","#e58b32","#aebbc6"],
"City":["#427caa","#e4bb56","#e9f4fa"],
"Icons":["#526e58","#f1a0a4","#f2d994"],
"Architecture":["#8a8a7e","#d6b996","#d9e2e4"]
};
function categoryArt(name:string):string{
 const [bg,primary,secondary]=tilePalette[name]||["#445","#f90","#ddd"];
 const stud=(x:number,y:number,w=20)=>`<rect x="${x}" y="${y}" width="${w}" height="7" rx="2" fill="#fff" opacity=".3"/>`;
 const model= name==="Speed Champions" ?
 `<path d="M202 141h15l20-25h69l20 25h15v24H202z" fill="${primary}" stroke="#15273e" stroke-width="3"/><path d="M244 118h52l14 21h-81z" fill="${secondary}" opacity=".85"/><circle cx="236" cy="166" r="17" fill="#162337"/><circle cx="313" cy="166" r="17" fill="#162337"/><circle cx="236" cy="166" r="7" fill="#b8c0c4"/><circle cx="313" cy="166" r="7" fill="#b8c0c4"/>${stud(256,108)}` :
 name==="Star Wars" ?
 `<path d="M273 80l30 57 44 16-44 10-30 30-30-30-44-10 44-16z" fill="${secondary}" stroke="#31465c" stroke-width="4"/><path d="M273 74v114M238 138h70" stroke="${primary}" stroke-width="9"/><path d="M219 141l-24-45M327 141l24-45" stroke="${secondary}" stroke-width="12"/>` :
 name==="Technic" ?
 `<path d="M199 145l27-19 23-31h55l26 31 20 19v22H199z" fill="${primary}" stroke="#29333c" stroke-width="4"/><rect x="248" y="104" width="45" height="21" fill="#c8dbe4"/><circle cx="229" cy="168" r="18" fill="#222933"/><circle cx="317" cy="168" r="18" fill="#222933"/><circle cx="229" cy="168" r="8" fill="#c1c5cb"/><circle cx="317" cy="168" r="8" fill="#c1c5cb"/><circle cx="205" cy="150" r="4" fill="#e7ecec"/><circle cx="338" cy="150" r="4" fill="#e7ecec"/>` :
 name==="City" ?
 `<rect x="203" y="111" width="47" height="63" fill="${primary}"/><rect x="253" y="85" width="51" height="89" fill="${secondary}"/><rect x="308" y="125" width="46" height="49" fill="${primary}"/><g fill="#fff" opacity=".78"><rect x="212" y="124" width="13" height="15"/><rect x="231" y="124" width="12" height="15"/><rect x="263" y="99" width="13" height="14"/><rect x="282" y="99" width="13" height="14"/><rect x="263" y="123" width="13" height="14"/><rect x="282" y="123" width="13" height="14"/><rect x="319" y="137" width="12" height="13"/></g><path d="M195 174h165" stroke="#243c57" stroke-width="7"/>` :
 name==="Icons" ?
 `<path d="M272 176l-17-50h39l-15 50z" fill="${secondary}"/><path d="M273 144V94M273 139l-33-38M273 139l36-37" stroke="#3a7844" stroke-width="7"/><g fill="${primary}" stroke="#fff2" stroke-width="2"><circle cx="272" cy="94" r="21"/><circle cx="241" cy="104" r="19"/><circle cx="309" cy="103" r="19"/></g><circle cx="272" cy="94" r="7" fill="#f9d686"/><circle cx="241" cy="104" r="6" fill="#f9d686"/><circle cx="309" cy="103" r="6" fill="#f9d686"/>` :
 `<rect x="207" y="115" width="37" height="65" fill="${secondary}"/><rect x="250" y="90" width="44" height="90" fill="${primary}"/><rect x="299" y="123" width="43" height="57" fill="${secondary}"/><path d="M268 90V69l-12 21M268 69l12 21" fill="none" stroke="#e9e0cb" stroke-width="6"/><g stroke="#fff" opacity=".75" stroke-width="4"><path d="M215 130h20M215 145h20M260 105h23M260 122h23M260 139h23M309 139h22M309 154h22"/></g>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="232" viewBox="0 0 440 232"><rect width="440" height="232" fill="#f1e9dc"/><rect width="440" height="232" fill="${bg}" opacity=".11"/><ellipse cx="267" cy="196" rx="111" ry="11" fill="#213047" opacity=".15"/><g transform="translate(40 37)"><rect x="0" y="7" width="137" height="160" rx="6" fill="#172b42" opacity=".18"/><path d="M7 0H137V160H7z" fill="${bg}"/><path d="M7 0H137V21H7z" fill="${primary}"/><rect x="17" y="31" width="110" height="110" rx="3" fill="#fff" opacity=".15"/><path d="M22 125l31-47 28 30 36-47v70H22z" fill="${secondary}" opacity=".9"/><path d="M19 147h111" stroke="#fff" opacity=".35"/><circle cx="34" cy="12" r="4" fill="#fff" opacity=".7"/><circle cx="45" cy="12" r="4" fill="#fff" opacity=".7"/><circle cx="56" cy="12" r="4" fill="#fff" opacity=".7"/></g><g>${model}</g><text x="220" y="220" fill="#385068" opacity=".65" font-family="sans-serif" font-size="10" text-anchor="middle">ORIGINAL CONCEPT ART · NOT OFFICIAL PRODUCT PACKAGING</text></svg>`;
 return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
}

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
const t=e("div","lego-theme-grid");themes.slice(1).forEach(n=>{const b=button("",()=>{selected=n;filter="all";page=0;render()},"lego-theme "+(selected===n?"current":""));const picture=e("img","lego-theme-art");picture.src=categoryArt(n);picture.alt="Original illustrated box and assembled model concept for "+n;picture.loading="lazy";b.append(picture,e("span","lego-theme-name",n));t.append(b)});shell.append(t);
const main=e("section","lego-main");main.append(e("h2","",selected==="All LEGO"?"Browse LEGO sets":selected));
const controls=e("div","lego-controls");const input=e("input") as HTMLInputElement;input.placeholder="Search by set name or number";input.value=search;input.setAttribute("aria-label","Search LEGO sets");input.oninput=()=>{search=input.value;page=0;renderResults()};controls.append(input);
const select=e("select") as HTMLSelectElement;for(const [v,l] of [["name","Name"],["year","Newest first"],["number","Set number"]]){const o=e("option") as HTMLOptionElement;o.value=v;o.textContent=l;select.append(o)}select.value=sort;select.onchange=()=>{sort=select.value;renderResults()};controls.append(select);main.append(controls);
const summary=e("div","lego-summary");const results=e("div","lego-results");const pager=e("div","lego-pagination");main.append(summary,results,pager);
shell.append(main);
const notice=e("section","lego-affiliate");notice.append(e("h2","","Find your next set"));notice.append(e("p","","LEGO.com affiliate shopping and prices are awaiting program approval and authorized feed access."));notice.append(button("Affiliate shopping · Approval pending",()=>{},"disabled"));shell.append(notice);
const footer=e("footer","lego-footer");footer.append(e("p","","Set metadata: Rebrickable. Archív is independent and is not sponsored or endorsed by the LEGO Group."));shell.append(footer);
function renderResults(){results.replaceChildren();pager.replaceChildren();let rows=data.filter(x=>(selected==="All LEGO"||x.theme===selected)&&(filter!=="saved"||saved[x.number])&&(!search||[x.name,x.number,String(x.year)].join(" ").toLowerCase().includes(search.toLowerCase())));
rows.sort((a,b)=>sort==="year"?b.year-a.year:sort==="number"?a.number.localeCompare(b.number):a.name.localeCompare(b.name));
summary.textContent=`${rows.length.toLocaleString()} sets · ${Object.values(saved).filter(x=>x==="owned").length} owned · ${Object.values(saved).filter(x=>x==="wishlist").length} wishlist`;
if(!data.length){results.append(e("p","lego-empty","Catalog preview temporarily unavailable."));return}
if(!rows.length){results.append(e("p","lego-empty","No matching sets. Try another theme or search."));return}
for(const row of rows.slice(page*24,(page+1)*24)){const card=e("article","lego-card");const info=e("div");info.append(e("p","lego-number",row.number+" · "+row.year));info.append(e("h3","",row.name));info.append(e("p","lego-detail",row.theme+" · "+row.parts+" pieces"));card.append(info);const actions=e("div","lego-actions");actions.append(button(saved[row.number]==="owned"?"✓ Owned":"+ Owned",()=>save(row.number,"owned"),saved[row.number]==="owned"?"on":""),button(saved[row.number]==="wishlist"?"✓ Wishlist":"+ Wishlist",()=>save(row.number,"wishlist"),saved[row.number]==="wishlist"?"on":""));card.append(actions);results.append(card)}
if(page>0)pager.append(button("Previous",()=>{page--;renderResults()}));if((page+1)*24<rows.length)pager.append(button("Next",()=>{page++;renderResults()}));}
renderResults()}
void load();
