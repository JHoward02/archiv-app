import fs from "node:fs";
import assert from "node:assert/strict";
import {
 initializeTestEnvironment,assertSucceeds,assertFails
} from "@firebase/rules-unit-testing";
import {
 doc,getDoc,setDoc,deleteDoc,collection,collectionGroup,
 query,where,getDocs,writeBatch
} from "firebase/firestore";

const env=await initializeTestEnvironment({
 projectId:"demo-archiv-photo-permissions",
 firestore:{rules:fs.readFileSync("firestore.rules","utf8"),host:"127.0.0.1",port:8080}
});
const number="60412-1";
const basePhoto={
 ownerUid:"alice",setNumber:number,
 imageData:"data:image/jpeg;base64,"+"A".repeat(90),
 status:"private",uploadedAt:"2026-11-01T08:00:00Z",
 submittedAt:null,
 licenseVersion:"archiv-community-photo-license-v1-2026-11-01",
 communityConsent:false,consentedAt:null
};
const pending={...basePhoto,status:"pending",submittedAt:"2026-11-01T08:02:00Z",communityConsent:true,consentedAt:"2026-11-01T08:02:00Z"};
const approved={setNumber:number,imageData:basePhoto.imageData,approvedAt:"2026-11-01T08:04:00Z"};
const receipt={ownerUid:"alice",setNumber:number,communityPhotoId:"approvedphoto100",
 licenseVersion:"archiv-community-photo-license-v1-2026-11-01",consentedAt:pending.consentedAt,approvedAt:approved.approvedAt};
const alice=env.authenticatedContext("alice").firestore();
const bob=env.authenticatedContext("bob").firestore();
const admin=env.authenticatedContext("moderator").firestore();
const guest=env.unauthenticatedContext().firestore();
const ref=(db,uid="alice")=>doc(db,"users",uid,"setPhotos",number);
const publicRef=db=>doc(db,"communitySetPhotos","approvedphoto100");
const auditRef=db=>doc(db,"communityPhotoPermissions","approvedphoto100");
try{
 await env.withSecurityRulesDisabled(async adminCtx=>{
  const db=adminCtx.firestore();
  await setDoc(doc(db,"users","alice","items","archiv-lego-set:"+number),{legoStatus:"owned"});
  await setDoc(doc(db,"adminAccess","moderator"),{enabled:true});
 });
 await assertSucceeds(setDoc(ref(alice),basePhoto));
 await assertSucceeds(getDoc(ref(alice)));
 await assertFails(getDoc(ref(bob)));
 await assertFails(getDoc(ref(guest)));
 await assertFails(getDoc(ref(admin))); // a private, unsubmitted photo is not visible to moderators
 await assertFails(setDoc(ref(bob),{...basePhoto,ownerUid:"bob"}));
 await assertFails(setDoc(ref(alice),{...basePhoto,status:"pending"})); // opt-in mandatory
 await assertFails(setDoc(ref(alice),{...basePhoto,signedName:"secret"})); // unknown fields prohibited
 await assertFails(setDoc(ref(alice),{...basePhoto,imageData:"data:image/svg+xml;base64,AAAA"}));
 await assertSucceeds(setDoc(ref(alice),pending));
 await assertSucceeds(getDoc(ref(admin)));
 await assertSucceeds(getDocs(query(collectionGroup(admin,"setPhotos"),where("status","==","pending"))));
 await assertFails(getDocs(query(collectionGroup(bob,"setPhotos"),where("status","==","pending"))));
 await assertFails(setDoc(publicRef(alice),approved));
 await assertFails(setDoc(publicRef(guest),approved));
 await assertSucceeds(setDoc(publicRef(admin),approved));
 await assertSucceeds(setDoc(auditRef(admin),receipt));
 await assertFails(getDoc(auditRef(alice)));
 await assertFails(getDoc(auditRef(guest)));
 await assertSucceeds(getDoc(auditRef(admin)));
 await assertSucceeds(getDoc(publicRef(guest)));
 await assertFails(deleteDoc(publicRef(alice)));
 await assertSucceeds(deleteDoc(ref(alice))); // deletion of personal copy
 const stillPublic=await assertSucceeds(getDoc(publicRef(guest)));
 assert.equal(stillPublic.exists(),true); // community photo remains
 await assertSucceeds(deleteDoc(publicRef(admin))); // moderator takedown
 await assertSucceeds(deleteDoc(auditRef(admin))); // accompanying permission record retention policy
 console.log("PASS: Firestore private uploads, consent, review, public retention and admin takedown");
}finally{
 await env.cleanup();
}
