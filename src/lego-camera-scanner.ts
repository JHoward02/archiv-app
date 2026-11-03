import {findManualSetNumber,findSetNumberMatches,type ScannableSet,type ScanHit} from "./lego-set-number-scan";

/** On-demand browser OCR: no photo uploads or server-side image recognition. */
const OCR_URL="https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
type OCRWorker={
 recognize:(image:HTMLCanvasElement)=>Promise<{data:{text:string}}>;
 terminate:()=>Promise<unknown>;
};
type OCRLibrary={
 createWorker:(language:string,oem?:number,options?:{logger?:(info:{status:string;progress?:number})=>void})=>Promise<OCRWorker>;
};
declare global{interface Window{Tesseract?:OCRLibrary}}
let ocrLoad:Promise<OCRLibrary>|null=null;
function loadOcr():Promise<OCRLibrary>{
 if(window.Tesseract?.createWorker)return Promise.resolve(window.Tesseract);
 if(ocrLoad)return ocrLoad;
 ocrLoad=new Promise<OCRLibrary>((resolve,reject)=>{
  const script=document.createElement("script");
  script.src=OCR_URL;script.async=true;script.referrerPolicy="no-referrer";
  script.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(new Error("Photo reader failed to initialize."));
  script.onerror=()=>{script.remove();reject(new Error("Could not download the photo reader. Check your connection."))};
  document.head.append(script);
 }).catch(error=>{ocrLoad=null;throw error});
 return ocrLoad;
}
function node<K extends keyof HTMLElementTagNameMap>(tag:K,className="",text=""):HTMLElementTagNameMap[K]{
 const element=document.createElement(tag);element.className=className;if(text)element.textContent=text;return element;
}
function scanButton(label:string,action:()=>void,style=""){
 const b=node("button","lego-button "+style,label);b.type="button";b.onclick=action;return b;
}
async function downsizeForOcr(preview:HTMLImageElement):Promise<HTMLCanvasElement>{
 if(!preview.complete||!preview.naturalWidth)await preview.decode();
 const scale=Math.min(1,2200/Math.max(preview.naturalWidth,preview.naturalHeight));
 const canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(preview.naturalWidth*scale));
 canvas.height=Math.max(1,Math.round(preview.naturalHeight*scale));
 const context=canvas.getContext("2d");if(!context)throw new Error("This browser cannot process photos.");
 context.filter="grayscale(1) contrast(1.3)";
 context.drawImage(preview,0,0,canvas.width,canvas.height);
 return canvas;
}
export function openLegoSetNumberScanner(
 catalog:readonly ScannableSet[],
 onOpenSet:(setNumber:string)=>void
):void{
 if(document.querySelector(".archiv-scan-backdrop"))return;
 const lastFocused=document.activeElement instanceof HTMLElement?document.activeElement:null;
 const backdrop=node("div","archiv-scan-backdrop");
 const panel=node("section","archiv-scan-dialog");
 panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","Scan LEGO set number");
 const titleRow=node("div","archiv-scan-title-row");
 const heading=node("h2","","Scan a LEGO set number");heading.id="archiv-scan-title";
 panel.setAttribute("aria-labelledby",heading.id);
 const closeButton=scanButton("✕",close,"archiv-scan-close");
 closeButton.setAttribute("aria-label","Close set scanner");
 titleRow.append(heading,closeButton);panel.append(titleRow);
 panel.append(node("p","archiv-scan-description","Photograph the printed set number on a LEGO box or instruction booklet. Archív will suggest matching sets for you to confirm."));
 const choices=node("div","archiv-scan-choices");
 const cameraPicker=node("input") as HTMLInputElement;cameraPicker.type="file";cameraPicker.accept="image/*";cameraPicker.setAttribute("capture","environment");
 cameraPicker.setAttribute("aria-label","Take a photo of a LEGO set number");cameraPicker.hidden=true;
 const galleryPicker=node("input") as HTMLInputElement;galleryPicker.type="file";galleryPicker.accept="image/*";
 galleryPicker.setAttribute("aria-label","Select a photo of a LEGO set number");galleryPicker.hidden=true;
 const cameraButton=scanButton("📷 Take photo",()=>cameraPicker.click(),"archiv-scan-primary");
 const galleryButton=scanButton("Choose photo",()=>galleryPicker.click(),"archiv-scan-secondary");
 choices.append(cameraButton,galleryButton,cameraPicker,galleryPicker);panel.append(choices);
 const photo=node("img","archiv-scan-preview") as HTMLImageElement;photo.alt="Photo selected for set number recognition";photo.hidden=true;
 panel.append(photo);
 const progress=node("p","archiv-scan-progress","Photos are processed on your device, not uploaded to Archív. OCR software files are downloaded when you first scan.");
 progress.setAttribute("role","status");progress.setAttribute("aria-live","polite");panel.append(progress);
 const matches=node("div","archiv-scan-matches");matches.setAttribute("aria-live","polite");panel.append(matches);
 const manual=node("div","archiv-scan-manual");
 const manualLabel=node("label","archiv-scan-manual-label","Or enter the set number");
 const manualInput=node("input") as HTMLInputElement;manualInput.type="text";manualInput.inputMode="numeric";
 manualInput.placeholder="e.g. 75313 or 75313-1";manualInput.autocomplete="off";manualInput.maxLength=12;
 manualLabel.append(manualInput);
 const manualButton=scanButton("Find set",()=>{showHits(findManualSetNumber(manualInput.value,catalog));progress.textContent="Manual set-number search. No photo required."},"archiv-scan-secondary");
 manualInput.onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();manualButton.click()}};
 manual.append(manualLabel,manualButton);panel.append(manual);
 panel.append(node("p","archiv-scan-note","For better results, photograph the large set number directly, in good light. This identifies printed numbers, not loose or assembled models."));
 backdrop.append(panel);document.body.append(backdrop);
 let closed=false,busy=false,currentUrl:string|null=null,activeWorker:OCRWorker|null=null;
 function cleanupPhoto(){if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=null}}
 function onEscape(event:KeyboardEvent){if(event.key==="Escape")close()}
 function close(){
  if(closed)return;closed=true;backdrop.remove();cleanupPhoto();document.removeEventListener("keydown",onEscape);
  if(activeWorker){const worker=activeWorker;activeWorker=null;void worker.terminate().catch(()=>{})}
  lastFocused?.focus();
 }
 document.addEventListener("keydown",onEscape);
 backdrop.onclick=event=>{if(event.target===backdrop)close()};
 closeButton.focus();
 function showHits(hits:readonly ScanHit[]){
  matches.replaceChildren();
  if(!hits.length){
   matches.append(node("p","archiv-scan-no-match","No matching set found. Try a closer, clearer photo or enter the printed number below."));
   return;
  }
  matches.append(node("h3","","Possible LEGO set matches"));
  matches.append(node("p","archiv-scan-confirm","Check the photo and set name before opening the result."));
  for(const hit of hits){
   const row=node("div","archiv-scan-hit");
   const img=node("img","archiv-scan-hit-image") as HTMLImageElement;
   img.src=hit.set.image||"https://cdn.rebrickable.com/media/sets/"+encodeURIComponent(hit.set.number.toLowerCase())+".jpg";
   img.alt=hit.set.name+" set";img.loading="lazy";img.onerror=()=>{img.style.display="none"};
   const info=node("div","archiv-scan-hit-info");
   info.append(node("strong","",hit.set.name),node("span","",hit.set.number+" · "+hit.set.year+" · "+hit.set.theme));
   const view=scanButton("View set",()=>{close();onOpenSet(hit.set.number)},"archiv-scan-open-set");
   row.append(img,info,view);matches.append(row);
  }
 }
 async function readPhoto(file:File){
  if(closed||busy)return;
  if(!file.type.startsWith("image/")){progress.textContent="Please select an image file.";return}
  if(file.size>18*1024*1024){progress.textContent="This image exceeds 18 MB. Try a smaller photo.";return}
  if(!catalog.length){progress.textContent="The LEGO catalog is still loading. Try again shortly.";return}
  busy=true;cameraButton.disabled=true;galleryButton.disabled=true;
  matches.replaceChildren();cleanupPhoto();
  currentUrl=URL.createObjectURL(file);photo.src=currentUrl;photo.hidden=false;
  progress.textContent="Preparing photo…";
  let worker:OCRWorker|null=null;
  try{
   const image=await downsizeForOcr(photo);
   if(closed)return;
   progress.textContent="Loading the on-device text reader…";
   const api=await loadOcr();
   if(closed)return;
   worker=await api.createWorker("eng",1,{logger:info=>{
    if(closed)return;
    if(info.status==="recognizing text"&&typeof info.progress==="number"){
     progress.textContent="Reading printed numbers… "+Math.round(info.progress*100)+"%";
    }
   }});
   activeWorker=worker;
   if(closed)return;
   const recognized=await worker.recognize(image);
   if(closed)return;
   const hits=findSetNumberMatches(recognized.data.text,catalog);
   progress.textContent=hits.length?"Found "+hits.length+" potential set"+(hits.length===1?"":"s")+". Please confirm the correct one.":"No catalog match from this photo.";
   showHits(hits);
  }catch(error){
   if(!closed){progress.textContent=error instanceof Error?error.message:"Could not read that image. Try again or enter the set number.";showHits([])}
  }finally{
   const w=worker;if(w&&activeWorker===w)activeWorker=null;
   if(w)try{await w.terminate()}catch{}
   if(!closed){busy=false;cameraButton.disabled=false;galleryButton.disabled=false}
  }
 }
 cameraPicker.onchange=()=>{const file=cameraPicker.files?.[0];cameraPicker.value="";if(file)void readPhoto(file)};
 galleryPicker.onchange=()=>{const file=galleryPicker.files?.[0];galleryPicker.value="";if(file)void readPhoto(file)};
}
