import {collection,deleteDoc,doc,getDocs,type Firestore} from "firebase/firestore";
import {
 compressContributorImage,getOwnSetPhoto,getCommunitySetPhotos,saveOwnSetPhoto,removeOwnSetPhoto,
 pendingCommunityPhotos,moderateSetPhoto,PHOTO_LICENSE_VERSION,COMMUNITY_PHOTO_LICENSE,
 removalRequestUrl,type PrivateSetPhoto,type CommunitySetPhoto
} from "./lego-photo-contributions";

function element<K extends keyof HTMLElementTagNameMap>(tag:K,cls="",value=""):HTMLElementTagNameMap[K]{
 const el=document.createElement(tag);el.className=cls;if(value)el.textContent=value;return el;
}
function action(label:string,fn:()=>void,cls=""){
 const b=element("button","lego-button "+cls,label);b.type="button";b.onclick=fn;return b;
}
export function openOwnedPhotoDialog(
 db:Firestore,uid:string,setNumber:string,setName:string,onSaved:()=>void
){
 if(document.querySelector(".archiv-photo-backdrop"))return;
 const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
 const back=element("div","archiv-photo-backdrop");
 const dialog=element("section","archiv-photo-dialog");
 dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");
 dialog.setAttribute("aria-label","Your photograph of "+setName);
 const title=element("h2","","Your photo: "+setName);
 const closeButton=action("Close",close,"archiv-photo-close");
 const header=element("div","archiv-photo-dialog-head");header.append(title,closeButton);dialog.append(header);
 dialog.append(element("p","archiv-photo-note","Upload a photo of your LEGO set. Keep it private or optionally submit it for community review."));
 const termsNotice=element("p","archiv-photo-terms-reference");
 termsNotice.append(document.createTextNode("You keep your copyright. Approved community photos may remain after account deletion, but you can request removal. "));
 const termsLink=element("a","","Read Community Photo Terms");
 termsLink.href=new URL("terms.html#community-photos",window.location.href).href;
 termsLink.target="_blank";termsLink.rel="noopener noreferrer";
 termsNotice.append(termsLink);dialog.append(termsNotice);
 const preview=element("img","archiv-photo-preview") as HTMLImageElement;preview.hidden=true;preview.alt="Preview of your set photograph";dialog.append(preview);
 const info=element("p","archiv-photo-status","Loading your existing photo…");info.setAttribute("role","status");dialog.append(info);
 const input=element("input") as HTMLInputElement;input.type="file";input.accept="image/*";input.setAttribute("aria-label","Choose a photograph to upload");
 dialog.append(input);
 const consent=element("label","archiv-photo-consent archiv-photo-community-consent");
 const check=element("input") as HTMLInputElement;check.type="checkbox";
 const labelText=element("span","","Optional: Submit this photograph for community review. If approved, I give Archív permission to display it in the catalog. I keep my copyright. Approved photos may remain after account deletion, but I can request removal.");
 consent.append(check,labelText);dialog.append(consent);
 const buttons=element("div","archiv-photo-actions");
 const save=action("Save my photo",()=>{void saveSelected()},"archiv-photo-save");
 const remove=action("Remove my photo",()=>{void deleteSelected()},"archiv-photo-delete");
 remove.hidden=true;buttons.append(save,remove);dialog.append(buttons);
 dialog.append(element("p","archiv-photo-privacy","You retain ownership of your photograph. Private and unapproved photos are deleted with your account. Approved community photos stay available after account deletion unless removed on request or by moderation. Photos are resized to JPEG and embedded camera location metadata is stripped. "+" Permission terms: "+PHOTO_LICENSE_VERSION+"."));
 const licenseDetail=element("p","archiv-photo-license-detail",COMMUNITY_PHOTO_LICENSE);
 licenseDetail.hidden=!check.checked;dialog.append(licenseDetail);
 check.onchange=()=>{licenseDetail.hidden=!check.checked};
 back.append(dialog);document.body.append(back);
 let closed=false,busy=false,original:PrivateSetPhoto|null=null;
 function close(){if(closed)return;closed=true;document.removeEventListener("keydown",keyClose);back.remove();previous?.focus()}
 function keyClose(ev:KeyboardEvent){if(ev.key==="Escape"&&!busy)close()}
 closeButton.onclick=close;document.addEventListener("keydown",keyClose);
 back.onclick=e=>{if(e.target===back&&!busy)close()};
 function busySet(value:boolean){busy=value;save.disabled=value;remove.disabled=value;closeButton.disabled=value;input.disabled=value;check.disabled=value}
 void getOwnSetPhoto(db,uid,setNumber).then(photo=>{
  if(closed)return;original=photo;remove.hidden=!photo;
  if(photo){preview.src=photo.imageData;preview.hidden=false;info.textContent="Saved photo: "+(photo.status==="pending"?"Awaiting administrator review":photo.status==="approved"?"Approved for community display (removal available by request)":photo.status==="rejected"?"Not approved for the catalog":"Private to you");check.checked=photo.status==="pending";}
  else info.textContent="No personal photo saved yet.";
 }).catch(()=>{if(!closed)info.textContent="Could not load your saved photo. Check your connection."});
 input.onchange=()=>{
  const file=input.files?.[0];if(!file)return;
  if(file.size>15*1024*1024){info.textContent="Choose a photo smaller than 15 MB.";input.value="";return}
  const blobUrl=URL.createObjectURL(file);preview.src=blobUrl;preview.hidden=false;
  preview.onload=()=>URL.revokeObjectURL(blobUrl);
  info.textContent="New photograph selected. Save to store it privately or submit it for review.";
 };
 async function saveSelected(){
  const selected=input.files?.[0];
  if(!selected){
   if(!original){info.textContent="Choose a photograph to upload.";return}
   const previouslyShared=original.status==="pending";
   if(check.checked===previouslyShared){info.textContent="No changes to save.";return}
   busySet(true);
   try{
    await saveOwnSetPhoto(db,uid,setNumber,original.imageData,check.checked);
    info.textContent=check.checked?"Submitted for review.":"Photo saved privately. Request removal of any previously approved community copies if needed.";
    onSaved();close();
   }catch(err){info.textContent="Could not update sharing: "+(err instanceof Error?err.message:"Unknown error")}
   finally{if(!closed)busySet(false)}
   return;
  }
  busySet(true);info.textContent="Resizing your photograph and saving it privately…";
  try{
   const data=await compressContributorImage(selected);
   await saveOwnSetPhoto(db,uid,setNumber,data,check.checked);
   info.textContent=check.checked?"Saved and submitted for review.":"Photo saved privately.";
   onSaved();close();
  }catch(err){info.textContent="Upload failed: "+(err instanceof Error?err.message:"Unknown error")}
  finally{if(!closed)busySet(false)}
 }
 async function deleteSelected(){
  if(!original||!window.confirm("Delete your personal photo? Previously approved community copies remain in the catalog unless you request their removal."))return;
  busySet(true);info.textContent="Removing your photograph…";
  try{await removeOwnSetPhoto(db,uid,setNumber);onSaved();close()}
  catch(err){info.textContent="Removal failed: "+(err instanceof Error?err.message:"Unknown error")}
  finally{if(!closed)busySet(false)}
 }
}
export function showOwnPhoto(slot:HTMLElement,db:Firestore,uid:string,setNumber:string){
 slot.replaceChildren(element("p","archiv-photo-loading","Loading your photo…"));
 void getOwnSetPhoto(db,uid,setNumber).then(photo=>{
  if(!slot.isConnected)return;
  slot.replaceChildren();
  if(!photo){slot.append(element("p","archiv-photo-muted","No personal photograph uploaded yet."));return}
  const image=element("img","archiv-photo-owned-image") as HTMLImageElement;
  image.alt="Your photograph of LEGO set "+setNumber;image.src=photo.imageData;
  slot.append(image,element("span","archiv-photo-status-tag",photo.status==="pending"?"Your photo · Pending review":photo.status==="approved"?"Your photo · Approved":photo.status==="rejected"?"Your photo · Not approved":"Your private photo"));
 }).catch(()=>{if(slot.isConnected)slot.replaceChildren(element("p","archiv-photo-muted","Your photo could not be loaded."))});
}
export function showPublishedPhoto(slot:HTMLElement,db:Firestore,setNumber:string){
 void getCommunitySetPhotos(db,setNumber).then(photos=>{
  if(!slot.isConnected||!photos.length)return;
  slot.append(element("h3","","Archív community photographs"));
  const grid=element("div","archiv-photo-community-grid");
  for(const photo of photos.slice(0,12)){
   const image=element("img","archiv-photo-community-image") as HTMLImageElement;
   image.src=photo.imageData;
   image.alt="Archív community photograph of LEGO set "+setNumber;
   const item=element("figure","archiv-photo-community-item");
   const caption=element("figcaption","archiv-photo-community-caption");
   const removal=element("a","archiv-photo-removal-link","Request removal");
   removal.href=removalRequestUrl(setNumber,photo.photoId);
   removal.setAttribute("aria-label","Request removal of community photograph "+photo.photoId);
   caption.append(removal);item.append(image,caption);grid.append(item);
  }
  slot.append(grid,element("p","archiv-photo-muted",photos.length+" approved community photograph"+(photos.length===1?"":"s")+". Copyright remains with each photographer. Photos may remain after account deletion, subject to removal requests. Not official LEGO images."));
 }).catch(()=>{});
}
export function renderPhotoModeration(slot:HTMLElement,db:Firestore,lookup:(id:string)=>string){
 slot.append(element("h2","","Community photo review"),element("p","lego-admin-note","Only explicitly submitted and approved photos appear publicly. Photographers retain copyright, grant Archív non-exclusive display permission, and may request removal. Approved photos are not automatically erased when an account is deleted."));
 const queue=element("div","archiv-photo-review-queue");
 const message=element("p","lego-admin-note","Loading submitted photographs…");
 slot.append(message,queue);
 async function refresh(){
  queue.replaceChildren();message.textContent="Loading submitted photographs…";
  try{
   const pending=await pendingCommunityPhotos(db);
   message.textContent=pending.length+" photo"+(pending.length===1?"":"s")+" awaiting review";
   if(!pending.length)queue.append(element("p","archiv-photo-muted","No pending photographs."));
   for(const contribution of pending){
    const card=element("article","archiv-photo-review-item");
    const img=element("img","archiv-photo-review-image") as HTMLImageElement;img.src=contribution.imageData;img.alt="Pending photo for set "+contribution.setNumber;
    const content=element("div","archiv-photo-review-copy");
    content.append(element("strong","",lookup(contribution.setNumber)),element("span","","Set "+contribution.setNumber+" · Submitted "+(contribution.submittedAt||"Unknown date")));
    const choices=element("div","archiv-photo-review-actions");
    const approve=action("Approve and publish",()=>void decide("approved"),"archiv-photo-approve");
    const reject=action("Reject",()=>void decide("rejected"),"archiv-photo-reject");
    async function decide(decision:"approved"|"rejected"){
     approve.disabled=true;reject.disabled=true;
     try{await moderateSetPhoto(db,contribution,decision);void refresh()}
     catch(error){message.textContent="Review failed: "+(error instanceof Error?error.message:"Unknown error");approve.disabled=false;reject.disabled=false}
    }
    choices.append(approve,reject);content.append(choices);card.append(img,content);queue.append(card);
   }
  }catch(error){message.textContent="Review queue unavailable: "+(error instanceof Error?error.message:"Unknown error")}
 }
 const refreshButton=action("Refresh photo reviews",()=>void refresh(),"archiv-photo-review-refresh");
 slot.append(refreshButton);
 void refresh();
 const publishedSection=element("section","archiv-photo-published-section");
 publishedSection.append(element("h3","","Published community photographs"));
 const publishedList=element("div","archiv-photo-published-list");
 publishedSection.append(publishedList);slot.append(publishedSection);
 void (async()=>{
  try{
   const rows=await getDocs(collection(db,"communitySetPhotos"));
   if(!rows.size){publishedList.append(element("p","archiv-photo-muted","No community photos published yet."));return}
   for(const r of rows.docs){
    const photo=r.data() as CommunitySetPhoto;
    const line=element("div","archiv-photo-published-row");
    const pic=element("img") as HTMLImageElement;pic.src=photo.imageData;pic.alt="Approved photograph for set "+r.id;
    const del=action("Unpublish",()=>{void (async()=>{if(!window.confirm("Unpublish this community photo for a verified removal request, legal concerns, or moderation? Account deletion alone does not unpublish community photos."))return;try{await deleteDoc(doc(db,"communitySetPhotos",r.id));line.remove()}catch(error){window.alert("Could not unpublish: "+(error instanceof Error?error.message:"Unknown error"))}})()},"archiv-photo-reject");
    line.append(pic,element("span","",lookup(photo.setNumber)),del);publishedList.append(line);
   }
  }catch{publishedList.append(element("p","archiv-photo-muted","Published photo list unavailable."))}
 })();
}
