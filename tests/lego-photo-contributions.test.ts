import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {
 isSafePhotoData,MAX_PHOTO_DATA_LENGTH,validSetNumber,
 validAssignmentSignature,PHOTO_ASSIGNMENT_VERSION
} from "../src/lego-photo-contributions";
const source=readFileSync("src/lego-entry.ts","utf8");
const security=readFileSync("firestore.rules","utf8");
const service=readFileSync("src/lego-photo-contributions.ts","utf8");
const ui=readFileSync("src/lego-photo-ui.ts","utf8");
const docs=readFileSync("docs/COMMUNITY_SET_PHOTOS_ROLLOUT.md","utf8");
describe("Archív copyright-assigned collector photographs",()=>{
 it("accepts only small JPEGs for correctly formatted LEGO set numbers",()=>{
  const photo="data:image/jpeg;base64,"+"a".repeat(100);
  expect(isSafePhotoData(photo)).toBe(true);
  expect(isSafePhotoData("data:image/svg+xml;base64,"+"a".repeat(100))).toBe(false);
  expect(isSafePhotoData("data:image/jpeg;base64,"+"A".repeat(MAX_PHOTO_DATA_LENGTH))).toBe(false);
  expect(validSetNumber("60412-1")).toBe(true);
  expect(validSetNumber("75313-1")).toBe(true);
  expect(validSetNumber("../../secret")).toBe(false);
 });
 it("re-encodes source images without camera EXIF or GPS metadata",()=>{
  expect(service).toContain('ctx.drawImage(image,0,0,canvas.width,canvas.height)');
  expect(service).toContain('canvas.toDataURL("image/jpeg",quality)');
  expect(service).toContain('URL.revokeObjectURL(src)');
 });
 it("requires a separate signed copyright assignment for ALL uploads",()=>{
  expect(PHOTO_ASSIGNMENT_VERSION).toBe("archiv-photo-assignment-v1-2026-11-01");
  expect(validAssignmentSignature("Jane Collector",true)).toBe(true);
  expect(validAssignmentSignature("Jane Collector",false)).toBe(false);
  expect(validAssignmentSignature("",true)).toBe(false);
  expect(validAssignmentSignature("a",true)).toBe(false);
  expect(ui).toContain('agreementCheck.type="checkbox"');
  expect(ui).toContain('signedName.type="text"');
  expect(ui).toContain('PHOTO_ASSIGNMENT_STATEMENT');
  expect(ui).toContain("full legal name");
  expect(service).toContain('rightsAssigned:true');
  expect(service).toContain('signedName:signedName.trim(),signedAt:now');
  expect(service).toContain('if(!validAssignmentSignature(signedName,acceptedAssignment))');
  expect(service).not.toContain('getDoc(publicRef(db,setNumber))');
 });
 it("keeps community submission a distinct optional choice",()=>{
  expect(ui).toContain('check.type="checkbox"');
  expect(ui).toContain('Also submit for community review');
  expect(service).toContain('status:submitForReview?"pending":"private"');
  expect(service).toContain('where("status","==","pending")');
  expect(source).toContain('PHOTO_BACKEND_READY=import.meta.env.VITE_PHOTO_BACKEND_READY==="true"');
  expect(source).toContain('upload.disabled=!PHOTO_BACKEND_READY');
 });
 it("publishes every approved photo in a permanent set-specific community gallery",()=>{
  expect(service).toContain('const publicRef=doc(collection(db,"communitySetPhotos"))');
  expect(service).toContain('batch.set(publicRef,');
  expect(service).toContain('batch.set(doc(db,"communityPhotoAssignments",publicRef.id)');
  expect(service).toContain('batch.update(source,{status:"approved",communityPhotoId:publicRef.id})');
  expect(service).toContain('getCommunitySetPhotos');
  expect(service).toContain('where("setNumber","==",setNumber)');
  expect(ui).toContain('Archív community photographs');
  expect(ui).toContain('getDocs(collection(db,"communitySetPhotos"))');
  expect(ui).not.toContain('"approvedSetPhotos"');
 });
 it("removes non-community account copies but NEVER automatically deletes public community assets",()=>{
  expect(service).toContain('export async function removeOwnSetPhoto');
  expect(service).toContain('await deleteDoc(privateRef(db,uid,setNumber))');
  expect(service).not.toContain('await deleteDoc(publicRef');
  expect(source).toContain('await removeOwnSetPhoto(legoDb,user.uid,photo.id)');
  expect(source).toContain('await deleteUserDocuments(["setPhotos"])');
  expect(source).toContain('Approved community photos stay published');
  expect(source).not.toContain("await withdrawOwnSetPhoto");
 });
 it("allows only moderators to publish and unpublish, keeping audit names private",()=>{
  expect(security).toContain("match /users/{userId}/setPhotos/{setNumber}");
  expect(security).toContain("match /communitySetPhotos/{photoId}");
  expect(security).toContain("match /communityPhotoAssignments/{photoId}");
  expect(security).toContain("allow delete: if isReportingAdmin()");
  expect(security).toContain("allow update, delete: if false");
  expect(security).toContain("request.resource.data.rightsAssigned == true");
  expect(security).toContain("request.resource.data.signedName is string");
  expect(security).toContain("request.resource.data.status in ['private','pending']");
  expect(security).not.toContain("resource.data.ownerUid == request.auth.uid");
  expect(security).not.toContain("approvedSetPhotos");
  expect(security).not.toContain("+=*\n");
 });
 it("documents legal review and the new account-deletion retention boundary",()=>{
  expect(docs).toContain("17 U.S.C. § 204(a)");
  expect(docs.toLowerCase()).toContain("approved community photographs remain");
  expect(docs).toContain("restricted copyright assignment");
  expect(docs).toContain("VITE_PHOTO_BACKEND_READY");
 });
});
