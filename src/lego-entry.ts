import "./lego-styles.css";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signInWithRedirect, signOut, deleteUser, reauthenticateWithPopup, reauthenticateWithCredential, type User } from "firebase/auth";
import { collection, doc, getFirestore, onSnapshot, setDoc, deleteDoc, getDoc, getDocs, addDoc, increment, serverTimestamp, updateDoc, writeBatch, type Unsubscribe } from "firebase/firestore";
type SetRow={number:string;name:string;year:number;theme:string;parts:number;image?:string;images?:string[]};
type Status="owned"|"wishlist";
const featured=["City","Pokemon","Star Wars","Technic","Botanicals","Icons"];
let themes=["All LEGO",...featured,"Complete Catalog"];
type ThemeInfo={name:string;count:number;image:string};
let extraThemes:ThemeInfo[]=[];
const firebaseConfig={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID};
const firebaseReady=Object.values(firebaseConfig).every(Boolean);
const firebaseApp=firebaseReady?(getApps()[0]??initializeApp(firebaseConfig)):null;
// The packaged Android app uses a Capacitor WebView, not a browser tab.
type NativeBridge={isNativePlatform?:()=>boolean;getPlatform?:()=>string;nativePromise?:(plugin:string,method:string,options:object)=>Promise<{credential?:{idToken?:string}}>};
const nativeBridge=(window as Window&{Capacitor?:NativeBridge}).Capacitor;
const isNativeApp=nativeBridge?.isNativePlatform?.()===true;
const isNativeIos=nativeBridge?.getPlatform?.()==="ios";
const legoAuth=firebaseApp?(isNativeApp?initializeAuth(firebaseApp,{persistence:indexedDBLocalPersistence}):getAuth(firebaseApp)):null;
const legoDb=firebaseApp?getFirestore(firebaseApp):null;
const legoRecordPrefix="archiv-lego-set:";
let currentUser:User|null=null,authReady=!legoAuth,collectionReady=!legoAuth,accountError="";
let stopCollection:Unsubscribe|null=null,authGeneration=0;
type Activity={uid:string;type:string;setNumber?:string;theme?:string;at:string};
type Profile={uid:string;name?:string;email?:string;firstSeen?:string;lastSeen?:string;communicationsOptIn?:boolean};
// Data-erasing profile actions stay off until the shared Firebase rules are approved and deployed.
const PROFILE_BACKEND_READY=import.meta.env.VITE_PROFILE_BACKEND_READY==="true";
let ownProfile:Profile|null=null,ownProfileLoaded=false,profileBusy=false,profileError="",profileInfo="",deleteConfirmOpen=false,deleteConfirmText="",deletingAccount=false;
let stopOwnProfile:Unsubscribe|null=null;
let profiles:Profile[]=[],events:Activity[]=[],chosenUid="";
let adminEnabled=false,adminStatus="Checking access…",adminRows:Array<{owned?:number;wishlist?:number;themes?:Record<string,number>;affiliateClicks?:number}>=[],adminLoading=false,adminError="";
async function checkAdmin(user:User|null,gen:number){
 adminEnabled=false;adminRows=[];adminStatus="Checking access…";
 if(!user||!legoDb)return;
 try{
  const a=await getDoc(doc(legoDb,"adminAccess",user.uid));
  if(gen!==authGeneration)return;
  adminEnabled=a.exists()&&a.data().enabled===true;
  adminStatus=adminEnabled?"Authorized":"Restricted";
  if(adminEnabled&&location.hash==="#/admin")void loadAdmin();
 }catch{adminStatus="Admin access not configured"}
 if(gen===authGeneration)render();
}
async function loadAdmin(){
 if(!adminEnabled||!legoDb)return;
 adminLoading=true;adminError="";render();
 try{
  const [summaries,people]=await Promise.all([getDocs(collection(legoDb,"collectorSummaries")),getDocs(collection(legoDb,"collectorProfiles"))]);
  adminRows=summaries.docs.map(d=>d.data());
  profiles=people.docs.map(d=>({uid:d.id,...d.data()}));
  events=[];
  for(const person of profiles.slice(0,50)){
   const logs=await getDocs(collection(legoDb,"users",person.uid,"activity"));
   events.push(...logs.docs.map(d=>({uid:person.uid,...d.data()} as Activity)));
  }
 }
 catch(err){adminError=err instanceof Error?err.message:"Reporting unavailable"}
 adminLoading=false;render();
}
async function registerCollector(user:User){
 if(deletingAccount)return;
 if(!legoDb)return;
 try{
  const ref=doc(legoDb,"collectorProfiles",user.uid);
  const prior=await getDoc(ref);
  await setDoc(ref,{
   name:user.displayName||"Collector",
   email:user.email||"",
   firstSeen:prior.exists()?prior.data().firstSeen:new Date().toISOString(),
   lastSeen:new Date().toISOString()
  },{merge:true});
 }catch(err){console.warn("Registration reporting unavailable",err)}
}
async function recordActivity(type:string,setNumber?:string,theme?:string){
 if(deletingAccount||!currentUser||!legoDb)return;
 try{await addDoc(collection(legoDb,"users",currentUser.uid,"activity"),{
  type,at:new Date().toISOString(),...(setNumber?{setNumber}:{}),...(theme?{theme}:{})
 })}catch(err){console.warn("Activity event unavailable",err)}
}
async function reportCollector(user:User,items:Record<string,Status>){
 if(deletingAccount||!legoDb)return;
 const themes:Record<string,number>={};
 for(const [id,status] of Object.entries(items)){
  if(status!=="owned")continue;
  const theme=data.find(x=>x.number===id)?.theme||"Unknown";
  themes[theme]=(themes[theme]||0)+1;
 }
 try{await setDoc(doc(legoDb,"collectorSummaries",user.uid),{
  owned:Object.values(items).filter(x=>x==="owned").length,
  wishlist:Object.values(items).filter(x=>x==="wishlist").length,
  themes,lastActive:serverTimestamp()
 },{merge:true})}catch(err){console.warn("Analytics summary unavailable",err)}
}
async function reportAffiliateClick(){
 if(deletingAccount||!currentUser||!legoDb)return;
 try{await setDoc(doc(legoDb,"collectorSummaries",currentUser.uid),{affiliateClicks:increment(1),lastActive:serverTimestamp()},{merge:true});void recordActivity("affiliate_click")}
 catch(err){console.warn("Click reporting unavailable",err)}
}
document.addEventListener("click",ev=>{
 const el=ev.target;if(!(el instanceof Element))return;
 const a=el.closest("a[href]");if(!(a instanceof HTMLAnchorElement))return;
 try{const host=new URL(a.href).hostname;if(host==="ebay.com"||host.endsWith(".ebay.com"))void reportAffiliateClick()}catch{}
},true);

// In the packaged app, open only external seller/attribution URLs in Android's
// browser. Internal collection navigation remains in the embedded app.
document.addEventListener("click",event=>{
 if(!isNativeApp||!nativeBridge?.nativePromise||event.defaultPrevented)return;
 const target=event.target;
 if(!(target instanceof Element))return;
 const link=target.closest("a[href]");
 if(!(link instanceof HTMLAnchorElement))return;
 try{
  const url=new URL(link.href);
  if(!["http:","https:"].includes(url.protocol)||url.hostname===location.hostname)return;
  event.preventDefault();
  void nativeBridge.nativePromise("Browser","open",{url:url.href}).catch(err=>console.warn("Unable to open external link",err));
 }catch{}
},true);

async function signInLego(){
  // iOS native Google sign-in needs its own Firebase Apple app registration.
  // Do not call a missing native plugin in unsigned catalog-preview builds.
  if(isNativeIos&&import.meta.env.VITE_IOS_FIREBASE_READY!=="true"){
    accountError="iPhone Google sign-in needs the iOS Firebase setup. Register app.archiv.collector in Firebase, then upload GoogleService-Info.plist for the next build.";
    render();return;
  }
 if(!legoAuth){accountError="Cloud sign-in is not configured.";render();return}
 try{
  accountError="";
  if(isNativeApp){
   if(!nativeBridge?.nativePromise)throw new Error("Native authentication bridge unavailable.");
   // Requires this APK's package and signing SHA-1 registered in Firebase.
   const result=await nativeBridge.nativePromise("FirebaseAuthentication","signInWithGoogle",{});
   const idToken=result.credential?.idToken;
   if(!idToken)throw new Error("Google sign-in did not provide an ID token.");
   await signInWithCredential(legoAuth,GoogleAuthProvider.credential(idToken));
  }else await signInWithPopup(legoAuth,new GoogleAuthProvider());
 }catch(error){
  if(!isNativeApp&&(error as {code?:string}).code==="auth/popup-blocked"){
   await signInWithRedirect(legoAuth,new GoogleAuthProvider());return;
  }
  const message=error instanceof Error?error.message:"Sign-in failed.";
  accountError=isNativeApp?"Native Google sign-in: "+message+". Check the device Firebase configuration and Google sign-in setup.":message;render();
 }
}
async function signOutLego(){
 if(!legoAuth)return;
 try{
  if(isNativeApp&&nativeBridge?.nativePromise)await nativeBridge.nativePromise("FirebaseAuthentication","signOut",{});
  await signOut(legoAuth);
 }catch(error){accountError=error instanceof Error?error.message:"Sign-out failed.";render()}
}

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
function themeFromHash(){const slug=decodeURIComponent(location.hash.replace(/^#\/?/,""));return themes.slice(1).find(n=>n.toLowerCase().replace(/\s+/g,"-")===slug)||"All LEGO"}
function goProfile(){profileError="";profileInfo="";deleteConfirmOpen=false;deleteConfirmText="";location.hash="#/profile";render()}
selected=themeFromHash();
// Remember the displayed route, not merely the selected theme. Android/browser Back
// can return to the same theme from a set or admin page without changing selected.
let displayedRouteHash=location.hash;
function goTheme(n:string){selected=n;search="";page=0;location.hash=n==="All LEGO"?"#/":"#/"+encodeURIComponent(n.toLowerCase().replace(/\s+/g,"-"));render()}
window.addEventListener("hashchange",()=>{if(location.hash==="#/profile"){render();return}if(location.hash==="#/admin"){if(adminEnabled)void loadAdmin();else render();return}if(setFromHash()){render();return}const next=themeFromHash();if(next!==selected){selected=next;search="";page=0}if(displayedRouteHash!==location.hash)render()});
let saved:Record<string,Status>={};
if(legoAuth&&legoDb)onAuthStateChanged(legoAuth,user=>{
 const generation=++authGeneration;stopCollection?.();stopCollection=null;stopOwnProfile?.();stopOwnProfile=null;currentUser=user;saved={};ownProfile=null;ownProfileLoaded=!user;profileError="";profileInfo="";deleteConfirmOpen=false;deleteConfirmText="";authReady=true;collectionReady=!user;accountError="";render();
 void checkAdmin(user,generation);
 if(!user)return;
 const uid=user.uid;
 void registerCollector(user);
 stopOwnProfile=onSnapshot(doc(legoDb!,"collectorProfiles",uid),snapshot=>{
  if(generation!==authGeneration)return;
  ownProfile=snapshot.exists()?({uid,...snapshot.data()} as Profile):null;
  ownProfileLoaded=true;if(location.hash==="#/profile")render();
 },error=>{if(generation!==authGeneration)return;ownProfileLoaded=false;profileError="Could not load profile: "+error.message;if(location.hash==="#/profile")render()});
 stopCollection=onSnapshot(collection(legoDb!,"users",uid,"items"),snapshot=>{
  if(generation!==authGeneration)return;
  const next:Record<string,Status>={};
  snapshot.docs.forEach(record=>{if(record.id.startsWith(legoRecordPrefix)){const status=record.data().legoStatus;if(status==="owned"||status==="wishlist")next[record.id.slice(legoRecordPrefix.length)]=status}});
  saved=next;collectionReady=true;void reportCollector(user,next);render();
 },error=>{if(generation!==authGeneration)return;collectionReady=false;accountError="Could not load your saved LEGO sets: "+error.message;render()});
},error=>{authReady=true;accountError=error.message;render()});
const app=document.querySelector<HTMLElement>("#app")!;
let data:SetRow[]=[];
const url=new URL("./lego-catalog.json",import.meta.url);
const themeUrl=new URL("./lego-themes.json",import.meta.url);
async function load(){try{const [setsResponse,themeResponse]=await Promise.all([fetch(url),fetch(themeUrl)]);if(setsResponse.ok)data=await setsResponse.json();if(themeResponse.ok){extraThemes=await themeResponse.json();themes=["All LEGO",...featured,...extraThemes.map(t=>t.name).filter(n=>!featured.includes(n)&&n!=="Pokémon"),"Complete Catalog"];}}catch{} if(!setFromHash())selected=themeFromHash();render()}
function e<K extends keyof HTMLElementTagNameMap>(tag:K,cls="",value=""){const n=document.createElement(tag);n.className=cls;if(value){const parts=value.split("LEGO®");if(parts.length===1)n.textContent=value;else{parts.forEach((part,i)=>{if(i){n.append(document.createTextNode("LEGO"));const mark=document.createElement("sup");mark.className="lego-registered";mark.textContent="®";n.append(mark)}if(part)n.append(document.createTextNode(part))})}}return n}
function button(label:string,click:()=>void,cls=""){const b=e("button","lego-button "+cls,label);b.onclick=click;return b}
async function save(id:string,status:Status){
 if(deletingAccount)return;
 if(!currentUser){accountError="Sign in with Google to track owned sets and your wishlist across devices.";render();return}
 if(!collectionReady||!legoDb){accountError="Your collection is still loading. Try again.";render();return}
 const userId=currentUser.uid,ref=doc(legoDb,"users",userId,"items",legoRecordPrefix+id);
 const nextStatus=saved[id]===status?null:status;
 const row=data.find(item=>item.number===id);
 if(!row)return;
 try{
  accountError="";
  if(nextStatus){const now=Date.now();await setDoc(ref,{id:legoRecordPrefix+id,addedAt:now,updatedAt:now,title:row.name,subtitle:"LEGO set "+id,category:"other",year:row.year||null,imageUrl:row.image||null,description:null,sourceUrl:null,sourceLabel:"Rebrickable",details:[{label:"Set number",value:id},{label:"Theme",value:row.theme},{label:"Collection status",value:nextStatus}],condition:"raw",grade:"",quantity:1,pricePaid:null,estimatedValue:null,notes:"",favorite:false,groupId:null,legoStatus:nextStatus,legoSetNumber:id})}
  else await deleteDoc(ref);
  void recordActivity(nextStatus===null?"removed":nextStatus,id,row.theme);
 }catch(error){accountError="Could not save your set: "+(error instanceof Error?error.message:"Unknown error");render()}
}
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
   const inventory=inv;
  const key="archiv-parts-checked:"+setNumber;let checks:Record<string,boolean>={};
  try{checks=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
  let query="",color="All colors",showChecklist=false,showAllBuilding=false,showAllSpares=false;
  const tools=e("div","archiv-parts-toolbar");
  const searchBox=e("input") as HTMLInputElement;searchBox.type="search";searchBox.placeholder="Find a piece or number";searchBox.setAttribute("aria-label","Search pieces");tools.append(searchBox);
  const colorSelect=e("select") as HTMLSelectElement;colorSelect.setAttribute("aria-label","Filter by color");
  const allColors=[...new Set([...inventory.parts,...inventory.spares].map(p=>p.color))].sort();
  for(const c of ["All colors",...allColors]){const opt=e("option","",c);opt.value=c;colorSelect.append(opt)}tools.append(colorSelect);
  const checkButton=button("Track pieces",()=>{showChecklist=!showChecklist;checkButton.textContent=showChecklist?"Hide checklist":"Track pieces";draw()},"archiv-check-toggle");tools.append(checkButton);
  section.append(tools);
  const progress=e("p","archiv-parts-progress");section.append(progress);
  const lists=e("div","archiv-parts-lists");section.append(lists);
  function draw(){
   lists.replaceChildren();
   const total=[...inventory.parts,...inventory.minifigs,...inventory.spares];const checked=total.filter((p,i)=>checks[(i<inventory.parts.length?"parts":i<inventory.parts.length+inventory.minifigs.length?"minifigs":"spares")+":"+p.id+":"+p.color]).length;
   progress.textContent=showChecklist?checked+" of "+total.length+" part types checked":total.reduce((n,p)=>n+p.quantity,0).toLocaleString()+" pieces across "+total.length.toLocaleString()+" inventory entries";
   for(const [kind,title,items] of [["minifigs","Minifigures",inventory.minifigs],["spares","Extra & spare pieces",inventory.spares],["parts","Building pieces",inventory.parts]] as const){
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
  function showImage(index:number){active=(index+images.length)%images.length;mainImage.src=images[active];mainImage.alt=row!.name+" photograph "+(active+1)+" of "+images.length;counter.textContent=(active+1)+" / "+images.length;for(const [i,b] of [...controls.children].entries())b.classList.toggle("active",i===active)}
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
 const collection=e("div","lego-image-collection");
 collection.append(e("p","lego-detail-status",owned?"✓ In your collection":wish?"♡ On your wishlist":"Not in your collection"));
 const actions=e("div","lego-detail-actions");
 actions.append(button(owned?"✓ Owned · Remove":"Mark as owned",()=>save(row.number,"owned"),owned?"on":""));
 actions.append(button(wish?"✓ On wishlist":"♡ Add to wishlist",()=>save(row.number,"wishlist"),wish?"on":""));
 collection.append(actions);
 figure.append(collection);
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
 
 shell.append(wrap);
}

function profileDate(value?:string){
 const d=value?new Date(value):null;return d&&!Number.isNaN(d.getTime())?d.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"}):"Not available";
}
function membershipLength(value?:string){
 const started=value?new Date(value).getTime():NaN;if(!Number.isFinite(started))return "Not available";
 const days=Math.max(0,Math.floor((Date.now()-started)/86400000));
 if(days<1)return "Joined today";
 if(days<30)return days+" day"+(days===1?"":"s");
 const months=Math.floor(days/30.44);
 if(months<12)return months+" month"+(months===1?"":"s");
 const years=Math.floor(months/12),extra=months%12;
 return years+" year"+(years===1?"":"s")+(extra?" "+extra+" month"+(extra===1?"":"s"):"");
}
async function updateCommunicationsOptIn(value:boolean){
 if(!PROFILE_BACKEND_READY||!legoDb||!currentUser||!ownProfileLoaded||profileBusy||deletingAccount)return;
 profileBusy=true;profileError="";profileInfo="";render();
 try{
  // A profile document is registered on first login; update only the consent field.
  await updateDoc(doc(legoDb,"collectorProfiles",currentUser.uid),{communicationsOptIn:value});
  profileInfo=value?"You're now opted in to occasional Archív email updates.":"You've opted out of Archív email updates.";
 }catch(error){profileError="Could not save your preference: "+(error instanceof Error?error.message:"Unknown error")}
 finally{profileBusy=false;if(location.hash==="#/profile")render()}
}
async function reauthenticateForDeletion(user:User){
 if(isNativeApp){
  if(!nativeBridge?.nativePromise)throw new Error("Native sign-in is unavailable; contact support for deletion.");
  const result=await nativeBridge.nativePromise("FirebaseAuthentication","signInWithGoogle",{});
  const idToken=result.credential?.idToken;
  if(!idToken)throw new Error("Google sign-in did not return a confirmation token.");
  await reauthenticateWithCredential(user,GoogleAuthProvider.credential(idToken));
 }else{
  await reauthenticateWithPopup(user,new GoogleAuthProvider());
 }
}
async function deleteUserDocuments(path:string[]){
 if(!legoDb||!currentUser)throw Error("The account is no longer signed in.");
 const docs=await getDocs(collection(legoDb,"users",currentUser.uid,...path));
 // Firestore batches are intentionally small to avoid oversized requests.
 for(let i=0;i<docs.docs.length;i+=200){
  const batch=writeBatch(legoDb);
  for(const item of docs.docs.slice(i,i+200))batch.delete(item.ref);
  await batch.commit();
 }
}
async function deleteOwnProfile(){
 const user=currentUser;
 if(!PROFILE_BACKEND_READY||!user||!legoDb||deleteConfirmText!=="DELETE"||profileBusy||deletingAccount)return;
 profileBusy=true;profileError="";profileInfo="";render();
 try{
  // Verify fresh account ownership BEFORE making any irreversible data changes.
  await reauthenticateForDeletion(user);
  deletingAccount=true;profileInfo="Removing your collection and account data…";render();
  // A UID-only deletion marker blocks writes from other still-authenticated sessions.
  // The marker is intentionally retained to prevent stale sessions recreating records.
  await setDoc(doc(legoDb,"users",user.uid,"account","deletion"),{deleting:true});
  await deleteUserDocuments(["items"]);
  await deleteUserDocuments(["groups"]);
  await deleteUserDocuments(["activity"]);
  await deleteDoc(doc(legoDb,"collectorSummaries",user.uid));
  await deleteDoc(doc(legoDb,"collectorProfiles",user.uid));
  // Self-revoke any admin membership before removing the authentication identity.
  await deleteDoc(doc(legoDb,"adminAccess",user.uid));
  // Firebase Auth is deleted only after account records have been removed.
  await deleteUser(user);
  try{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith("archiv-parts-checked:"))localStorage.removeItem(key)}}catch{}
  if(isNativeApp&&nativeBridge?.nativePromise)void nativeBridge.nativePromise("FirebaseAuthentication","signOut",{}).catch(()=>{});
  deletingAccount=false;deleteConfirmOpen=false;deleteConfirmText="";ownProfile=null;profileInfo="";
  goTheme("All LEGO");
 }catch(error){
  deletingAccount=false;
  profileError="Deletion could not finish: "+(error instanceof Error?error.message:"Unknown error")+". Your account may be partially cleared. Please retry or contact getshelfiecollect@gmail.com.";
 }finally{profileBusy=false;if(location.hash==="#/profile")render()}
}
function renderProfile(shell:HTMLElement){
 const main=e("main","archiv-profile");
 const goBack=button("← Back to Archív",()=>goTheme("All LEGO"),"archiv-profile-back");main.append(goBack);
 const top=e("div","archiv-profile-hero");
 const badge=e("span","archiv-profile-kicker","YOUR ARCHÍV");
 const heading=e("h1","","Collector profile");
 top.append(badge,heading,e("p","archiv-profile-intro","Your collection at a glance, your account settings, and control of your data."));
 main.append(top);
 if(!currentUser){
  const section=e("section","archiv-profile-panel");
  section.append(e("h2","","Sign in to view your profile"),e("p","","Your profile is private. Sign in with Google to see your collection statistics and account details."));
  section.append(button("Sign in with Google",()=>{void signInLego()}));main.append(section);shell.append(main);return;
 }
 const user=currentUser;
 const firstSeen=ownProfile?.firstSeen||user.metadata.creationTime;
 const ownedIds=Object.keys(saved).filter(id=>saved[id]==="owned");
 const wishlisted=Object.values(saved).filter(status=>status==="wishlist").length;
 const counts=new Map<string,number>();let pieces=0;
 for(const id of ownedIds){const row=data.find(set=>set.number===id);if(!row)continue;counts.set(row.theme,(counts.get(row.theme)||0)+1);pieces+=row.parts||0}
 const account=e("section","archiv-profile-panel archiv-profile-account");
 const identity=e("div","archiv-profile-identity");
 if(user.photoURL){const photo=e("img","archiv-profile-avatar") as HTMLImageElement;photo.src=user.photoURL;photo.alt="Google account profile picture";photo.referrerPolicy="no-referrer";identity.append(photo)}
 const who=e("div");who.append(e("h2","",ownProfile?.name||user.displayName||"Collector"),e("p","",user.email||"No email address available"));identity.append(who);account.append(identity);
 const stats=e("div","archiv-profile-stats");
 const tiles:[string,string][]=[
  ["Sets owned",collectionReady?ownedIds.length.toLocaleString():"Loading…"],
  ["Themes collected",collectionReady?counts.size.toLocaleString():"Loading…"],
  ["On your wishlist",collectionReady?wishlisted.toLocaleString():"Loading…"],
  ["Pieces in owned sets",collectionReady?pieces.toLocaleString():"Loading…"]
 ];
 for(const [label,value] of tiles){const tile=e("div","archiv-profile-stat");tile.append(e("strong","",value),e("span","",label));stats.append(tile)}
 account.append(stats);
 const facts=e("dl","archiv-profile-facts");
 for(const [label,value] of [["Member since",profileDate(firstSeen)],["Membership length",membershipLength(firstSeen)],["Last sign-in",profileDate(user.metadata.lastSignInTime)],["Email address",user.email||"Not available"]]){
  const pair=e("div");pair.append(e("dt","",label),e("dd","",value));facts.append(pair);
 }
 account.append(facts);main.append(account);
 const themesPanel=e("section","archiv-profile-panel");
 themesPanel.append(e("h2","","Most collected themes"));
 const sorted=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5);
 if(!collectionReady)themesPanel.append(e("p","archiv-profile-muted","Loading your collection…"));
 else if(!sorted.length)themesPanel.append(e("p","archiv-profile-muted","Once you mark sets as owned, your most collected themes will appear here."));
 else{
  const chart=e("div","archiv-profile-chart");const max=sorted[0][1];
  for(const [name,n] of sorted){const line=e("div","archiv-profile-theme");const top=e("div","archiv-profile-theme-meta");
   top.append(e("span","",name),e("strong","",n+" set"+(n===1?"":"s")));line.append(top);
   const track=e("div","archiv-profile-bar-track");const fill=e("span","archiv-profile-bar");fill.style.width=(100*n/max)+"%";track.append(fill);line.append(track);chart.append(line)}
  themesPanel.append(chart);
 }
 main.append(themesPanel);
 const preferences=e("section","archiv-profile-panel");preferences.append(e("h2","","Communication preferences"));
 preferences.append(e("p","archiv-profile-muted","Choose whether you'd like occasional updates from Archív. We won't subscribe you automatically."));
 const option=e("label","archiv-profile-optin");
 const toggle=e("input") as HTMLInputElement;toggle.type="checkbox";toggle.checked=ownProfile?.communicationsOptIn===true;
 toggle.disabled=!PROFILE_BACKEND_READY||!ownProfileLoaded||profileBusy;toggle.onchange=()=>void updateCommunicationsOptIn(toggle.checked);
 const copy=e("span");copy.append(e("strong","","Email me Archív news and product updates"),e("small","",toggle.checked?"Opted in":"Not subscribed"));
 option.append(toggle,copy);preferences.append(option);
 if(!PROFILE_BACKEND_READY)preferences.append(e("p","archiv-profile-staging-note","Preview only: preference saving will be enabled after the shared Firebase security changes are approved."));
 if(profileError)preferences.append(e("p","archiv-profile-error",profileError));
 if(profileInfo)preferences.append(e("p","archiv-profile-success",profileInfo));
 main.append(preferences);
 const danger=e("section","archiv-profile-danger");
 danger.append(e("h2","","Delete your profile"));
 danger.append(e("p","","Permanently delete your Archív login, saved sets, wishlist, collection activity and profile. This cannot be undone. Your Google account and eBay account will not be deleted."));
 const trigger=button(deleteConfirmOpen?"Cancel deletion":"Delete profile",()=>{deleteConfirmOpen=!deleteConfirmOpen;deleteConfirmText="";profileError="";render()},"archiv-profile-delete-trigger");
 danger.append(trigger);
 if(deleteConfirmOpen){
  const confirm=e("div","archiv-profile-confirm");confirm.append(e("strong","","Confirm permanent deletion"));
  confirm.append(e("p","","To confirm, sign in again with Google and type DELETE below. This will permanently erase your Archív collection records. A minimal account identifier may be retained to prevent deleted records being recreated from an old session."));
  const field=e("input") as HTMLInputElement;field.type="text";field.placeholder="Type DELETE";field.autocomplete="off";field.value=deleteConfirmText;
  field.oninput=()=>{deleteConfirmText=field.value;final.disabled=deleteConfirmText!=="DELETE"||!PROFILE_BACKEND_READY||profileBusy};
  confirm.append(field);
  const final=button(profileBusy?"Deleting…":"Permanently delete my Archív profile",()=>void deleteOwnProfile(),"archiv-profile-delete-final");
  final.disabled=deleteConfirmText!=="DELETE"||!PROFILE_BACKEND_READY||profileBusy;confirm.append(final);
  if(!PROFILE_BACKEND_READY)confirm.append(e("p","archiv-profile-staging-note","Final deletion is disabled in this preview. Firebase security changes must be approved and deployed first."));
  danger.append(confirm);
 }
 main.append(danger);
 shell.append(main);
}
function render(){displayedRouteHash=location.hash;app.replaceChildren();const shell=e("div","lego-shell");app.append(shell);
const header=e("header","lego-header");
const logo=e("a","lego-logo");logo.href="#/";logo.onclick=(event)=>{event.preventDefault();goTheme("All LEGO")};logo.setAttribute("aria-label","Archív home");
const art=e("img");art.src=import.meta.env.BASE_URL+"archiv-lego-logo.png";art.alt="Archív. Your collection lives here.";art.onerror=()=>{art.onerror=null;art.src=import.meta.env.BASE_URL+"logo4"};logo.append(art);
header.append(logo);
const account=e("details","lego-account-controls");
const toggle=e("summary","lego-account-toggle");toggle.setAttribute("aria-label","Account menu");toggle.setAttribute("title","Account menu");
if(currentUser?.photoURL){const avatar=e("img","lego-account-avatar") as HTMLImageElement;avatar.src=currentUser.photoURL;avatar.alt="";avatar.referrerPolicy="no-referrer";avatar.onerror=()=>{avatar.remove();for(let i=0;i<3;i++)toggle.append(e("span","lego-menu-line"))};toggle.append(avatar)}else{for(let i=0;i<3;i++)toggle.append(e("span","lego-menu-line"))}
account.append(toggle);
const menu=e("div","lego-account-dropdown");
if(!authReady)menu.append(e("span","lego-account-label","Checking sign-in…"));
else if(currentUser){menu.append(button("My profile",()=>{account.open=false;goProfile()},"lego-account-button"));if(adminEnabled)menu.append(button("Admin dashboard",()=>{account.open=false;location.hash="#/admin";void loadAdmin()},"lego-account-button"));menu.append(button("Sign out",()=>{account.open=false;void signOutLego()},"lego-account-button"))}
else {
 const googleMark=()=>{const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 48 48");svg.setAttribute("aria-hidden","true");svg.classList.add("gsi-material-button-icon");for(const [fill,d] of [["#EA4335","M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"],["#4285F4","M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"],["#FBBC05","M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"],["#34A853","M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"]] ){const p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("fill",fill);p.setAttribute("d",d);svg.append(p)}return svg};

 for(const label of ["Sign in with Google","Sign up with Google"]){const b=button("",()=>{account.open=false;void signInLego()},"gsi-material-button");b.setAttribute("aria-label",label);const content=e("span","gsi-material-button-content-wrapper");content.append(googleMark(),e("span","gsi-material-button-contents",label));b.append(content);menu.append(b)}
}
account.append(menu);
header.append(account);
shell.append(header);
if(accountError)shell.append(e("p","lego-account-message",accountError));
if(currentUser&&!collectionReady)shell.append(e("p","lego-account-message","Loading your saved collection…"));
if(location.hash==="#/profile"){renderProfile(shell);const foot=e("footer","lego-footer");const nav=e("nav","lego-footer-links");for(const [label,file] of [["Contact","contact.html"],["Attribution","attribution.html"],["Terms of Use","terms.html"],["Privacy","privacy.html"]]){const link=e("a","",label);link.href=import.meta.env.BASE_URL+file;nav.append(link)}foot.append(nav,e("p","lego-copyright","© 2026 Archív. All rights reserved."));shell.append(foot);return}
if(location.hash==="#/admin"){
 const main=e("main","lego-admin");
 main.append(e("h1","","Archív analytics"));
 if(!currentUser)main.append(e("p","","Please sign in to access analytics."));
 else if(!adminEnabled)main.append(e("p","",adminStatus));
 else{
  main.append(e("p","lego-admin-note","Counts reflect signed-in collectors recorded after reporting was enabled. They exclude anonymous browsing, unreported registered accounts, and guest affiliate clicks."));
  const totals=[["Reporting collectors",adminRows.length],["Owned sets",adminRows.reduce((n,x)=>n+(Number(x.owned)||0),0)],["Wishlisted sets",adminRows.reduce((n,x)=>n+(Number(x.wishlist)||0),0)],["Signed-in affiliate clicks",adminRows.reduce((n,x)=>n+(Number(x.affiliateClicks)||0),0)]] as const;
  const cards=e("div","lego-admin-cards");
  for(const [label,total] of totals){const card=e("div","lego-admin-card");card.append(e("strong","",total.toLocaleString()),e("span","",label));cards.append(card)}
  main.append(cards);
  const registry=e("div","lego-admin-card");registry.append(e("strong","",profiles.length.toLocaleString()),e("span","","Accounts seen since registration tracking began"));main.append(registry);
  const authHelp=e("p","lego-admin-note","This count includes accounts seen by Archív since tracking began. For the complete Firebase Authentication account list, open Firebase Console.");
  const authLink=e("a","lego-admin-auth-link","View all Firebase Authentication users ↗");authLink.href="https://console.firebase.google.com/project/archiv-3f5df/authentication/users";authLink.target="_blank";authLink.rel="noopener noreferrer";authHelp.append(" ",authLink);main.append(authHelp);
  main.append(e("h2","","Daily activity (last 14 days)"));
  const trend=e("div","lego-admin-themes");
  for(let d=13;d>=0;d--){
   const date=new Date();date.setUTCHours(0,0,0,0);date.setUTCDate(date.getUTCDate()-d);
   const day=date.toISOString().slice(0,10),dayEvents=events.filter(x=>x.at?.slice(0,10)===day);
   const changes=dayEvents.filter(x=>["owned","wishlist","removed"].includes(x.type)).length;
   const clicks=dayEvents.filter(x=>x.type==="affiliate_click").length;
   const line=e("div","lego-admin-day");line.append(e("span","",day),e("span","",changes+" collection changes"),e("strong","",clicks+" affiliate clicks"));trend.append(line);
  }main.append(trend);
  main.append(e("p","lego-admin-note","Daily activity reflects recorded events, not unique visitors. Event history begins with this release. First 50 reporting profiles are included."));
  main.append(e("h2","","Individual user activity"));
  const people=e("div","lego-admin-people");
  for(const person of profiles){
   const pick=button(person.name||person.email||person.uid,()=>{chosenUid=person.uid;render()},"lego-admin-person");
   if(chosenUid===person.uid)pick.classList.add("active");
   people.append(pick);
  }main.append(people);
  const selectedPerson=profiles.find(p=>p.uid===chosenUid)||profiles[0];
  if(selectedPerson){
   const details=e("div","lego-admin-themes");
   details.append(e("h3","",selectedPerson.name||"Collector"));
   details.append(e("p","",selectedPerson.email||selectedPerson.uid));
   details.append(e("p","", "First seen: "+(selectedPerson.firstSeen||"Unknown")));
   const personalEvents=events.filter(x=>x.uid===selectedPerson.uid).sort((a,b)=>(b.at||"").localeCompare(a.at||"")).slice(0,50);
   if(!personalEvents.length)details.append(e("p","","No recorded activity yet."));
   for(const evt of personalEvents){
    const line=e("div","lego-admin-day");
    const verbs:Record<string,string>={owned:"Added to collection",wishlist:"Added to wishlist",removed:"Removed from collection",affiliate_click:"Clicked eBay affiliate link"};
    line.append(e("span","",new Date(evt.at).toLocaleString()),e("span","",verbs[evt.type]||evt.type.replace(/_/g," ")));
    const cell=e("strong","");
    if(evt.setNumber){
     const row=data.find(x=>x.number===evt.setNumber);
     const link=e("a","lego-admin-set-link",row?row.name+" ("+evt.setNumber+")":"LEGO set "+evt.setNumber);
     link.href="#/set/"+encodeURIComponent(evt.setNumber);
     cell.append(link);
    }else cell.textContent=evt.theme||"";
    line.append(cell);details.append(line);
   }
   main.append(details);
  }

  const refresh=button(adminLoading?"Refreshing…":"Refresh data",()=>{void loadAdmin()});refresh.disabled=adminLoading;main.append(refresh);
  if(adminError)main.append(e("p","lego-account-message",adminError));
  main.append(e("h2","","Popular themes in owned collections"));
  const themes:Record<string,number>={};
  for(const item of adminRows)for(const [name,count] of Object.entries(item.themes||{}))themes[name]=(themes[name]||0)+(Number(count)||0);
  const list=e("div","lego-admin-themes"),rank=Object.entries(themes).sort((a,b)=>b[1]-a[1]).slice(0,12),top=rank[0]?.[1]||1;
  if(!rank.length)list.append(e("p","","No collection summaries recorded yet."));
  for(const [name,count] of rank){const row=e("div","lego-admin-theme"),track=e("div","lego-admin-track"),bar=e("div","lego-admin-bar");bar.style.width=100*count/top+"%";track.append(bar);row.append(e("span","",name),track,e("strong","",count.toLocaleString()));list.append(row)}
  main.append(list);
 }
 main.append(button("← Return to Archív",()=>goTheme("All LEGO")));
 shell.append(main);return;
}
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
header.classList.add("lego-theme-header");const back=button("← Back to Themes",()=>goTheme("All LEGO"),"lego-back-to-themes");back.setAttribute("aria-label","Back to all LEGO themes");header.append(back);
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
const disclosure=e("p","lego-theme-affiliate-disclosure","Affiliate link: Archív may earn a commission from qualifying purchases. Listings, prices and availability are not verified.");shell.append(disclosure);
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
const shop=e("div","lego-shop-pending archiv-ebay-inline");const link=e("a","archiv-ebay-inline-link","Find on eBay ↗");link.href=ebaySetSearch(row);link.target="_blank";link.rel="noopener noreferrer sponsored";link.setAttribute("aria-label","Find "+row.name+" on eBay (affiliate link)");shop.append(link,e("small","","Archív may earn a commission if you buy through this eBay link."));actions.append(shop);
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
