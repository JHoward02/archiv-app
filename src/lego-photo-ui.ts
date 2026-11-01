import {collection,deleteDoc,doc,getDocs,type Firestore} from "firebase/firestore";
import {
 compressContributorImage,getOwnSetPhoto,getCommunitySetPhotos,saveOwnSetPhoto,removeOwnSetPhoto,
 pendingCommunityPhotos,moderateSetPhoto,PHOTO_ASSIGNMENT_STATEMENT,PHOTO_ASSIGNMENT_VERSION,
 validAssignmentSignature,type PrivateSetPhoto,type CommunitySetPhoto
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
 dialog.append(element("p","archiv-photo-note","You can keep your photo private, or separately submit it for review. For every upload, you must sign a copyright assignment to Archív's legal operator. Approved community photos remain part of Archív even if you later delete your account."));
 const preview=element("img","archiv-photo-preview") as HTMLImageElement;preview.hidden=true;preview.alt="Preview of your set photograph";dialog.append(preview);
 const info=element("p","archiv-photo-status","Loading your existing photo…");info.setAttribute("role","status");dialog.append(info);
 const input=element("input") as HTMLInputElement;input.type="file";input.accept="image/*";input.setAttribute("aria-label","Choose a photograph to upload");
 dialog.append(input);
 const assignment=element("section","archiv-photo-assignment");
 assignment.append(element("h3","","Required copyright assignment"));
 assignment.append(element("p","archiv-photo-assignment-copy",PHOTO_ASSIGNMENT_STATEMENT));
 const assignmentName=element("label","archiv-photo-signature-label","Full legal name (electronic signature)");
 const signedName=element("input") as HTMLInputElement;
 signedName.type="text";signedName.autocomplete="name";signedName.maxLength=120;signedName.placeholder="Type your legal name";
 signedName.setAttribute("aria-label","Full legal name for copyright assignment");
 assignmentName.append(signedName);assignment.append(assignmentName);
 const agree=element("label","archiv-photo-consent archiv-photo-assignment-consent");
 const agreementCheck=element("input") as HTMLInputElement;agreementCheck.type="checkbox";
 agreementCheck.setAttribute("aria-label","I agree to assign my photo copyright to Archív");
 agree.append(agreementCheck,element("span","","I have read and agree to the copyright assignment above. By entering my name and saving, I electronically sign the assignment for this photograph."));
 assignment.append(agree);dialog.append(assignment);
 const consent=element("label","archiv-photo-consent");
 const check=element("input") as HTMLInputElement;check.type="checkbox";
 const labelText=element("span","","Also submit for community review. If approved, my photograph becomes a permanent community catalog photo even if I delete my Archív account. This choice is optional.");
 consent.append(check,labelText);dialog.append(consent);
 const buttons=element("div","archiv-photo-actions");
 const save=action("Save my photo",()=>{void saveSelected()},"archiv-photo-save");
 const remove=action("Remove my photo",()=>{void deleteSelected()},"archiv-photo-delete");
 remove.hidden=true;buttons.append(save,remove);dialog.append(buttons);
 dialog.append(element("p","archiv-photo-privacy","Private and unapproved photos are deleted with your account. Approved community photographs remain published after account deletion and cannot be withdrawn through account controls. Your image is resized to a small JPEG and camera location metadata is stripped before saving. Copyright assignment terms version: "+PHOTO_ASSIGNMENT_VERSION+"."));
 back.append(dialog);document.body.append(back);
 let closed=false,busy=false,original:PrivateSetPhoto|null=null;
 function close(){if(closed)return;closed=true;document.removeEventListener("keydown",keyClose);back.remove();previous?.focus()}
 function keyClose(ev:KeyboardEvent){if(ev.key==="Escape"&&!busy)close()}
 closeButton.onclick=close;document.addEventListener("keydown",keyClose);
 back.onclick=e=>{if(e.target===back&&!busy)close()};
 function busySet(value:boolean){busy=value;save.disabled=value;remove.disabled=value;closeButton.disabled=value;input.disabled=value;check.disabled=value;agreementCheck.disabled=value;signedName.disabled=value}
 void getOwnSetPhoto(db,uid,setNumber).then(photo=>{
  if(closed)return;original=photo;remove.hidden=!photo;
  if(photo){preview.src=photo.imageData;preview.hidden=false;info.textContent="Saved photo: "+(photo.status==="pending"?"Awaiting administrator review":photo.status==="approved"?"Already approved as a permanent community photo":photo.status==="rejected"?"Not approved for the catalog":"Private to you");check.checked=photo.status==="pending";}
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
  if(!validAssignmentSignature(signedName.value,agreementCheck.checked)){
   info.textContent="To upload or change sharing, confirm the copyright assignment and sign with your full legal name.";return;
  }
  const selected=input.files?.[0];
  if(!selected){
   if(!original){info.textContent="Choose a photograph to upload.";return}
   const previouslyShared=original.status==="pending";
   if(check.checked===previouslyShared){info.textContent="No changes to save.";return}
   busySet(true);
   try{
    await saveOwnSetPhoto(db,uid,setNumber,original.imageData,check.checked,signedName.value,agreementCheck.checked);
    info.textContent=check.checked?"Submitted for review.":"Photo saved privately; previously approved community photos remain published.";
    onSaved();close();
   }catch(err){info.textContent="Could not update sharing: "+(err instanceof Error?err.message:"Unknown error")}
   finally{if(!closed)busySet(false)}
   return;
  }
  busySet(true);info.textContent="Resizing your photograph and saving it privately…";
  try{
   const data=await compressContributorImage(selected);
   await saveOwnSetPhoto(db,uid,setNumber,data,check.checked,signedName.value,agreementCheck.checked);
   info.textContent=check.checked?"Saved and submitted for review.":"Photo saved privately.";
   onSaved();close();
  }catch(err){info.textContent="Upload failed: "+(err instanceof Error?err.message:"Unknown error")}
  finally{if(!closed)busySet(false)}
 }
 async function deleteSelected(){
  if(!original||!window.confirm("Delete your private/uploaded copy? Any photograph already approved as community content will remain in Archív's catalog."))return;
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
   grid.append(image);
  }
  slot.append(grid,element("p","archiv-photo-muted",photos.length+" approved Archív community photograph"+(photos.length===1?"":"s")+". These remain part of the catalog after contributors delete their accounts. Not official LEGO images."));
 }).catch(()=>{});
}
export function renderPhotoModeration(slot:HTMLElement,db:Firestore,lookup:(id:string)=>string){
 slot.append(element("h2","","Community photo review"),element("p","lego-admin-note","Only approved photos appear in the shared catalog. Contributors sign the copyright assignment before saving, and approved community photos remain after account deletion."));
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
    const del=action("Unpublish",()=>{void (async()=>{if(!window.confirm("Unpublish this Archív-owned community photo for moderation or legal reasons? Account deletion does not unpublish community photos."))return;try{await deleteDoc(doc(db,"communitySetPhotos",r.id));line.remove()}catch(error){window.alert("Could not unpublish: "+(error instanceof Error?error.message:"Unknown error"))}})()},"archiv-photo-reject");
    line.append(pic,element("span","",lookup(photo.setNumber)),del);publishedList.append(line);
   }
  }catch{publishedList.append(element("p","archiv-photo-muted","Published photo list unavailable."))}
 })();
}
