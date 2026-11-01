import {
 collection,collectionGroup,deleteDoc,doc,getDoc,getDocs,query,setDoc,where,writeBatch,
 type Firestore
} from "firebase/firestore";

/** Private uploads and immutable, reviewed public community photographs.
 * No previously submitted photos are assumed to have been copyright-assigned.
 * This feature stays disabled until a legally reviewed assignment and Firestore rules launch.
 */
export type PhotoStatus="private"|"pending"|"approved"|"rejected";
export const PHOTO_ASSIGNMENT_VERSION="archiv-photo-assignment-v1-2026-11-01";
export const MAX_PHOTO_DATA_LENGTH=340000;
export const PHOTO_LIMIT_BYTES=15*1024*1024;
export type PrivateSetPhoto={
 ownerUid:string;setNumber:string;imageData:string;status:PhotoStatus;
 uploadedAt:string;submittedAt:string|null;
 assignmentVersion:string;rightsAssigned:true;signedName:string;signedAt:string;
 communityPhotoId?:string;
};
export type CommunitySetPhoto={
 setNumber:string;imageData:string;approvedAt:string;
};
export type PhotoAssignmentAudit={
 ownerUid:string;setNumber:string;communityPhotoId:string;
 assignmentVersion:string;signedName:string;signedAt:string;approvedAt:string;
};
export type ReviewPhoto=PrivateSetPhoto&{referencePath:string};
export function validSetNumber(id:string){return /^[A-Za-z0-9]{2,16}-[0-9]{1,3}$/.test(id)}
export function isSafePhotoData(data:string):boolean{
 return data.startsWith("data:image/jpeg;base64,")
  && data.length>25&&data.length<=MAX_PHOTO_DATA_LENGTH
  && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(data);
}
export function validAssignmentSignature(name:string,accepted:boolean){
 const trimmed=name.trim();
 return accepted&&trimmed.length>=3&&trimmed.length<=120&&/[A-Za-z\p{L}]/u.test(trimmed);
}
function privateRef(db:Firestore,uid:string,setNumber:string){
 return doc(db,"users",uid,"setPhotos",setNumber);
}
export const PHOTO_ASSIGNMENT_STATEMENT=
 "By checking the box and signing with my full legal name, I represent that I own the copyright in this photograph and assign to the legal operator of Archív all copyright rights I hold in the uploaded photograph, for the full copyright term, worldwide. This assignment applies even when the photo is private. Submitting for community review is a separate, optional choice. If Archív approves it as a community photo, the approved photo may remain publicly displayed after I delete my account. Removing my private copy or deleting my account does not undo a completed copyright assignment.";

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
export async function getCommunitySetPhotos(db:Firestore,setNumber:string):Promise<CommunitySetPhoto[]>{
 const snap=await getDocs(query(collection(db,"communitySetPhotos"),where("setNumber","==",setNumber)));
 return snap.docs.map(d=>d.data() as CommunitySetPhoto)
  .filter(data=>data.setNumber===setNumber&&isSafePhotoData(data.imageData))
  .sort((a,b)=>b.approvedAt.localeCompare(a.approvedAt));
}
export async function saveOwnSetPhoto(
 db:Firestore,uid:string,setNumber:string,imageData:string,submitForReview:boolean,
 signedName:string,acceptedAssignment:boolean
):Promise<void>{
 if(!validSetNumber(setNumber)||!isSafePhotoData(imageData))throw Error("Invalid set photo.");
 if(!validAssignmentSignature(signedName,acceptedAssignment))throw Error("Sign the copyright assignment with your legal name before saving.");
 const now=new Date().toISOString();
 await setDoc(privateRef(db,uid,setNumber),{
  ownerUid:uid,setNumber,imageData,status:submitForReview?"pending":"private",
  uploadedAt:now,submittedAt:submitForReview?now:null,
  assignmentVersion:PHOTO_ASSIGNMENT_VERSION,rightsAssigned:true,
  signedName:signedName.trim(),signedAt:now
 } satisfies PrivateSetPhoto);
}
/** Deleting or replacing a private upload NEVER deletes an already-approved community copy. */
export async function removeOwnSetPhoto(db:Firestore,uid:string,setNumber:string):Promise<void>{
 await deleteDoc(privateRef(db,uid,setNumber));
}
export async function pendingCommunityPhotos(db:Firestore):Promise<ReviewPhoto[]>{
 const pending=await getDocs(query(collectionGroup(db,"setPhotos"),where("status","==","pending")));
 return pending.docs.map(d=>({...d.data() as PrivateSetPhoto,referencePath:d.ref.path}))
  .filter(x=>validSetNumber(x.setNumber)&&isSafePhotoData(x.imageData)&&
   x.assignmentVersion===PHOTO_ASSIGNMENT_VERSION&&x.rightsAssigned===true)
  .sort((a,b)=>(a.submittedAt||"").localeCompare(b.submittedAt||""));
}
export async function moderateSetPhoto(db:Firestore,photo:ReviewPhoto,decision:"approved"|"rejected"):Promise<void>{
 if(!validSetNumber(photo.setNumber)||!isSafePhotoData(photo.imageData))throw Error("Invalid contribution.");
 const source=privateRef(db,photo.ownerUid,photo.setNumber);
 if(photo.referencePath!==source.path)throw Error("Photo reference mismatch.");
 const snap=await getDoc(source);
 const live=snap.data() as PrivateSetPhoto|undefined;
 if(!snap.exists()||live?.status!=="pending"||live.imageData!==photo.imageData||
  live.assignmentVersion!==PHOTO_ASSIGNMENT_VERSION||live.rightsAssigned!==true||
  !validAssignmentSignature(live.signedName,true)){
  throw Error("The photo or assignment changed since review. Refresh the queue.");
 }
 const batch=writeBatch(db);
 if(decision==="approved"){
  // Auto-ID permits multiple permanent approved photographs for the same LEGO set.
  // The public record deliberately contains no account identifier or legal name.
  const publicRef=doc(collection(db,"communitySetPhotos"));
  const approvedAt=new Date().toISOString();
  batch.set(publicRef,{setNumber:photo.setNumber,imageData:photo.imageData,approvedAt} satisfies CommunitySetPhoto);
  // Only moderators can read this signed copyright-transfer audit trail.
  batch.set(doc(db,"communityPhotoAssignments",publicRef.id),{
   ownerUid:photo.ownerUid,setNumber:photo.setNumber,communityPhotoId:publicRef.id,
   assignmentVersion:live.assignmentVersion,signedName:live.signedName,
   signedAt:live.signedAt,approvedAt
  } satisfies PhotoAssignmentAudit);
  batch.update(source,{status:"approved",communityPhotoId:publicRef.id});
 }else batch.update(source,{status:"rejected"});
 await batch.commit();
}
