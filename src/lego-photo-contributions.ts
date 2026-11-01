import {
 collectionGroup,deleteDoc,doc,getDoc,getDocs,query,setDoc,where,writeBatch,
 type Firestore
} from "firebase/firestore";

/** Limited-size JPEGs are stored in Firestore for the first photo-contribution release.
 * Canvas re-encoding strips camera EXIF/location metadata. Never store source files.
 * No pending photo is shared with unauthenticated users.
 */
export type PhotoStatus="private"|"pending"|"approved"|"rejected";
export type PrivateSetPhoto={
 ownerUid:string;setNumber:string;imageData:string;status:PhotoStatus;
 uploadedAt:string;submittedAt:string|null;
};
export type PublishedSetPhoto={
 ownerUid:string;setNumber:string;imageData:string;approvedAt:string;
};
export type ReviewPhoto=PrivateSetPhoto&{referencePath:string};
export const MAX_PHOTO_DATA_LENGTH=340000;
export const PHOTO_LIMIT_BYTES=15*1024*1024;
export function validSetNumber(id:string){return /^[A-Za-z0-9]{2,16}-[0-9]{1,3}$/.test(id)}
export function isSafePhotoData(data:string):boolean{
 return data.startsWith("data:image/jpeg;base64,")
  && data.length>25&&data.length<=MAX_PHOTO_DATA_LENGTH
  && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(data);
}
function privateRef(db:Firestore,uid:string,setNumber:string){
 return doc(db,"users",uid,"setPhotos",setNumber);
}
function publicRef(db:Firestore,setNumber:string){
 return doc(db,"approvedSetPhotos",setNumber);
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
export async function getPublishedSetPhoto(db:Firestore,setNumber:string):Promise<PublishedSetPhoto|null>{
 const snap=await getDoc(publicRef(db,setNumber));
 if(!snap.exists())return null;
 const data=snap.data() as PublishedSetPhoto;
 return data.setNumber===setNumber&&isSafePhotoData(data.imageData)?data:null;
}
export async function saveOwnSetPhoto(
 db:Firestore,uid:string,setNumber:string,imageData:string,submitForReview:boolean
):Promise<void>{
 if(!validSetNumber(setNumber)||!isSafePhotoData(imageData))throw Error("Invalid set photo.");
 // If an earlier photo was published, remove the published copy BEFORE changing its consent.
 const approved=await getDoc(publicRef(db,setNumber));
 if(approved.exists()&&approved.data().ownerUid===uid)await deleteDoc(approved.ref);
 const now=new Date().toISOString();
 await setDoc(privateRef(db,uid,setNumber),{
  ownerUid:uid,setNumber,imageData,
  status:submitForReview?"pending":"private",
  uploadedAt:now,submittedAt:submitForReview?now:null
 } satisfies PrivateSetPhoto);
}
export async function withdrawOwnSetPhoto(db:Firestore,uid:string,setNumber:string):Promise<void>{
 const published=await getDoc(publicRef(db,setNumber));
 if(published.exists()&&published.data().ownerUid===uid)await deleteDoc(published.ref);
 await deleteDoc(privateRef(db,uid,setNumber));
}
export async function pendingCommunityPhotos(db:Firestore):Promise<ReviewPhoto[]>{
 const pending=await getDocs(query(collectionGroup(db,"setPhotos"),where("status","==","pending")));
 return pending.docs.map(d=>({...d.data() as PrivateSetPhoto,referencePath:d.ref.path}))
  .filter(x=>validSetNumber(x.setNumber)&&isSafePhotoData(x.imageData))
  .sort((a,b)=>a.submittedAt&&b.submittedAt?a.submittedAt.localeCompare(b.submittedAt):0);
}
export async function moderateSetPhoto(db:Firestore,photo:ReviewPhoto,decision:"approved"|"rejected"):Promise<void>{
 if(!validSetNumber(photo.setNumber)||!isSafePhotoData(photo.imageData))throw Error("Invalid contribution.");
 const source=privateRef(db,photo.ownerUid,photo.setNumber);
 if(photo.referencePath!==source.path)throw Error("Photo reference mismatch.");
 const snap=await getDoc(source);
 if(!snap.exists()||snap.data().status!=="pending"||snap.data().imageData!==photo.imageData){
  throw Error("This photo changed since review. Refresh the queue.");
 }
 const batch=writeBatch(db);
 if(decision==="approved"){
  batch.set(publicRef(db,photo.setNumber),{
   ownerUid:photo.ownerUid,setNumber:photo.setNumber,
   imageData:photo.imageData,approvedAt:new Date().toISOString()
  } satisfies PublishedSetPhoto);
 }
 batch.update(source,{status:decision});
 await batch.commit();
}
