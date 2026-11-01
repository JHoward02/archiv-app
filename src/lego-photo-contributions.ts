import {
 collection,collectionGroup,deleteDoc,doc,getDoc,getDocs,query,setDoc,where,writeBatch,
 type Firestore
} from "firebase/firestore";

/** Collectors retain copyright. A separate optional permission authorizes publication.
 * Approved community copies persist after account deletion, subject to removal requests.
 * Backend remains disabled until Firebase security rules and public legal notices are live.
 */
export type PhotoStatus="private"|"pending"|"approved"|"rejected";
export const PHOTO_LICENSE_VERSION="archiv-community-photo-license-v1-2026-11-01";
export const MAX_PHOTO_DATA_LENGTH=340000;
export const PHOTO_LIMIT_BYTES=15*1024*1024;
export const COMMUNITY_PHOTO_REMOVAL_EMAIL="getshelfiecollect@gmail.com";
export const COMMUNITY_PHOTO_LICENSE=
 "I own this photograph or have the necessary rights to share it. I give Archív a non-exclusive, worldwide, royalty-free permission to store, resize, reproduce, and publicly display it in the Archív community catalog after moderator approval. I keep my copyright. Approved photos may remain after I delete my account, but I can request removal by contacting Archív. Archív may verify that I am the photographer or rights holder before processing the request.";
export type PrivateSetPhoto={
 ownerUid:string;setNumber:string;imageData:string;status:PhotoStatus;
 uploadedAt:string;submittedAt:string|null;
 licenseVersion:string;communityConsent:boolean;consentedAt:string|null;
 communityPhotoId?:string;
};
export type CommunitySetPhoto={
 setNumber:string;imageData:string;approvedAt:string;
};
export type ListedCommunitySetPhoto=CommunitySetPhoto&{photoId:string};
export type PhotoPermissionRecord={
 ownerUid:string;setNumber:string;communityPhotoId:string;
 licenseVersion:string;consentedAt:string;approvedAt:string;
};
export type ReviewPhoto=PrivateSetPhoto&{referencePath:string};
export function validSetNumber(id:string){return /^[A-Za-z0-9]{2,16}-[0-9]{1,3}$/.test(id)}
export function isSafePhotoData(data:string):boolean{
 return data.startsWith("data:image/jpeg;base64,")
  && data.length>25&&data.length<=MAX_PHOTO_DATA_LENGTH
  && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(data);
}
function privateRef(db:Firestore,uid:string,setNumber:string){
 return doc(db,"users",uid,"setPhotos",setNumber);
}

export async function compressContributorImage(file:File):Promise<string>{
 if(!file.type.startsWith("image/"))throw Error("Choose a JPEG, PNG, HEIC, or WebP photograph.");
 if(file.size>PHOTO_LIMIT_BYTES)throw Error("Photo exceeds 15 MB. Choose a smaller image.");
 const src=URL.createObjectURL(file);
 try{
  const image=new Image();
  image.src=src;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight)throw Error("Could not read that photograph.");
  let target=Math.min(1280,Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
  if(!ctx)throw Error("This browser cannot resize photographs.");
  for(let attempt=0;attempt<12;attempt++){
   const scale=Math.min(1,target/Math.max(image.naturalWidth,image.naturalHeight));
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(image,0,0,canvas.width,canvas.height);
   const quality=Math.max(.47,.79-Math.floor(attempt/3)*.09);
   const result=canvas.toDataURL("image/jpeg",quality);
   if(isSafePhotoData(result))return result;
   target=Math.floor(target*.85);
  }
  throw Error("Photo is too detailed to store. Try a simpler crop or smaller image.");
 }finally{URL.revokeObjectURL(src)}
}


export async function getOwnSetPhoto(db:Firestore,uid:string,setNumber:string):Promise<PrivateSetPhoto|null>{
 const snap=await getDoc(privateRef(db,uid,setNumber));
 if(!snap.exists())return null;
 const data=snap.data() as PrivateSetPhoto;
 return data.ownerUid===uid&&data.setNumber===setNumber&&isSafePhotoData(data.imageData)?data:null;
}
export async function getCommunitySetPhotos(db:Firestore,setNumber:string):Promise<ListedCommunitySetPhoto[]>{
 const snap=await getDocs(query(collection(db,"communitySetPhotos"),where("setNumber","==",setNumber)));
 return snap.docs.map(d=>({...d.data() as CommunitySetPhoto,photoId:d.id}))
  .filter(data=>data.setNumber===setNumber&&isSafePhotoData(data.imageData))
  .sort((a,b)=>b.approvedAt.localeCompare(a.approvedAt));
}
export function removalRequestUrl(setNumber:string,photoId:string):string{
 const subject="Archív community photo removal request: "+setNumber;
 const body="Please review removal of community photo "+photoId+" for LEGO set "+setNumber+
  ". I can provide information to verify I am the photographer or rights holder.";
 return "mailto:"+COMMUNITY_PHOTO_REMOVAL_EMAIL+
  "?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
}
export async function saveOwnSetPhoto(
 db:Firestore,uid:string,setNumber:string,imageData:string,submitForReview:boolean
):Promise<void>{
 if(!validSetNumber(setNumber)||!isSafePhotoData(imageData))throw Error("Invalid set photo.");
 const now=new Date().toISOString();
 await setDoc(privateRef(db,uid,setNumber),{
  ownerUid:uid,setNumber,imageData,status:submitForReview?"pending":"private",
  uploadedAt:now,submittedAt:submitForReview?now:null,
  licenseVersion:PHOTO_LICENSE_VERSION,communityConsent:submitForReview,
  consentedAt:submitForReview?now:null
 } satisfies PrivateSetPhoto);
}
/** Deleting a personal image does not erase a separately approved community photo. */
export async function removeOwnSetPhoto(db:Firestore,uid:string,setNumber:string):Promise<void>{
 await deleteDoc(privateRef(db,uid,setNumber));
}
export async function pendingCommunityPhotos(db:Firestore):Promise<ReviewPhoto[]>{
 const pending=await getDocs(query(collectionGroup(db,"setPhotos"),where("status","==","pending")));
 return pending.docs.map(d=>({...d.data() as PrivateSetPhoto,referencePath:d.ref.path}))
  .filter(x=>validSetNumber(x.setNumber)&&isSafePhotoData(x.imageData)&&
   x.licenseVersion===PHOTO_LICENSE_VERSION&&x.communityConsent===true&&!!x.consentedAt)
  .sort((a,b)=>(a.submittedAt||"").localeCompare(b.submittedAt||""));
}
export async function moderateSetPhoto(db:Firestore,photo:ReviewPhoto,decision:"approved"|"rejected"):Promise<void>{
 if(!validSetNumber(photo.setNumber)||!isSafePhotoData(photo.imageData))throw Error("Invalid contribution.");
 const source=privateRef(db,photo.ownerUid,photo.setNumber);
 if(photo.referencePath!==source.path)throw Error("Photo reference mismatch.");
 const snap=await getDoc(source);
 const live=snap.data() as PrivateSetPhoto|undefined;
 if(!snap.exists()||live?.status!=="pending"||live.imageData!==photo.imageData||
  live.licenseVersion!==PHOTO_LICENSE_VERSION||live.communityConsent!==true||
  typeof live.consentedAt!=="string"||!live.consentedAt){
  throw Error("The photo or consent changed since review. Refresh the queue.");
 }
 const batch=writeBatch(db);
 if(decision==="approved"){
  // Auto IDs allow several approved photos for one set. Public documents
  // contain no name or UID. The private permission record can establish assent.
  const publicRef=doc(collection(db,"communitySetPhotos"));
  const approvedAt=new Date().toISOString();
  batch.set(publicRef,{setNumber:photo.setNumber,imageData:photo.imageData,approvedAt} satisfies CommunitySetPhoto);
  batch.set(doc(db,"communityPhotoPermissions",publicRef.id),{
   ownerUid:photo.ownerUid,setNumber:photo.setNumber,communityPhotoId:publicRef.id,
   licenseVersion:live.licenseVersion,consentedAt:live.consentedAt,approvedAt
  } satisfies PhotoPermissionRecord);
  batch.update(source,{status:"approved",communityPhotoId:publicRef.id});
 }else batch.update(source,{status:"rejected"});
 await batch.commit();
}
