import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {
 isSafePhotoData,MAX_PHOTO_DATA_LENGTH,validSetNumber,
 PHOTO_LICENSE_VERSION,COMMUNITY_PHOTO_LICENSE,removalRequestUrl
} from "../src/lego-photo-contributions";
const source=readFileSync("src/lego-entry.ts","utf8");
const security=readFileSync("firestore.rules","utf8");
const service=readFileSync("src/lego-photo-contributions.ts","utf8");
const ui=readFileSync("src/lego-photo-ui.ts","utf8");
const docs=readFileSync("docs/COMMUNITY_SET_PHOTOS_ROLLOUT.md","utf8");

describe("photographer-owned LEGO set images and community permissions",()=>{
 it("bounds image size and accepts only matching JPEG formats and LEGO set IDs",()=>{
  const small="data:image/jpeg;base64,"+"a".repeat(100);
  expect(isSafePhotoData(small)).toBe(true);
  expect(isSafePhotoData("data:image/svg+xml;base64,"+"a".repeat(100))).toBe(false);
  expect(isSafePhotoData("data:image/jpeg;base64,"+"A".repeat(MAX_PHOTO_DATA_LENGTH))).toBe(false);
  expect(validSetNumber("60412-1")).toBe(true);
  expect(validSetNumber("75313-1")).toBe(true);
  expect(validSetNumber("../../secret")).toBe(false);
 });
 it("removes EXIF by re-encoding on device and does not need photo ownership assignment",()=>{
  expect(service).toContain('ctx.drawImage(image,0,0,canvas.width,canvas.height)');
  expect(service).toContain('canvas.toDataURL("image/jpeg",quality)');
  expect(service).toContain("URL.revokeObjectURL(src)");
  expect(service).not.toContain("rightsAssigned");
  expect(service).not.toContain("signedName");
  expect(ui).not.toContain("electronic signature");
 });
 it("uses a nonexclusive license and optional public submission",()=>{
  expect(PHOTO_LICENSE_VERSION).toBe("archiv-community-photo-license-v1-2026-11-01");
  expect(COMMUNITY_PHOTO_LICENSE).toContain("non-exclusive");
  expect(COMMUNITY_PHOTO_LICENSE).toContain("I keep my copyright");
  expect(COMMUNITY_PHOTO_LICENSE).toContain("request removal");
  expect(ui).toContain('check.type="checkbox"');
  expect(ui).toContain("Submit for community review (optional)");
  expect(ui).toContain("I allow Archív to display this photo if approved.");
  expect(ui).toContain("Approved photos may remain after account deletion");
  expect(ui).not.toContain("copyright assignment");
  expect(service).toContain('status:submitForReview?"pending":"private"');
  expect(service).toContain('communityConsent:submitForReview');
  expect(service).toContain('consentedAt:submitForReview?now:null');
  expect(service).toContain('x.communityConsent===true');
 });
 it("supports identifying and requesting removal of an individual approved photo",()=>{
  const uri=removalRequestUrl("60412-1","photo-abc123");
  expect(uri).toContain("mailto:getshelfiecollect@gmail.com");
  expect(decodeURIComponent(uri)).toContain("photo-abc123");
  expect(decodeURIComponent(uri)).toContain("60412-1");
  expect(ui).toContain("Request removal");
  expect(ui).toContain("removalRequestUrl(setNumber,photo.photoId)");
  expect(ui).toContain('del=action("Unpublish"');
 });
 it("publishes reviewed copies without public owner data",()=>{
  expect(service).toContain('doc(collection(db,"communitySetPhotos"))');
  expect(service).toContain('batch.set(publicRef,{setNumber:photo.setNumber,imageData:photo.imageData,approvedAt}');
  expect(service).toContain('batch.set(doc(db,"communityPhotoPermissions",publicRef.id)');
  expect(service).toContain('live.communityConsent!==true');
  expect(service).toContain('where("setNumber","==",setNumber)');
  expect(service).not.toContain("communityPhotoAssignments");
  expect(ui).toContain("getCommunitySetPhotos");
 });
 it("keeps approved photos independent from deleted account copies",()=>{
  expect(service).toContain("export async function removeOwnSetPhoto");
  expect(service).toContain("await deleteDoc(privateRef(db,uid,setNumber))");
  expect(service).not.toContain("await deleteDoc(publicRef");
  expect(source).toContain("await removeOwnSetPhoto(legoDb,user.uid,photo.id)");
  expect(source).toContain('await deleteUserDocuments(["setPhotos"])');
  expect(source).toContain("subject to removal requests");
 });
 it("limits publishing and removal to admins, and allows signed-in owners to upload privately",()=>{
  expect(security).toContain("match /users/{userId}/setPhotos/{setNumber}");
  expect(security).toContain("match /communitySetPhotos/{photoId}");
  expect(security).toContain("match /communityPhotoPermissions/{photoId}");
  expect(security).toContain("allow delete: if isReportingAdmin()");
  expect(security).toContain("request.resource.data.communityConsent is bool");
  expect(security).toContain("request.resource.data.licenseVersion ==");
  expect(security).not.toContain("rightsAssigned");
  expect(security).not.toContain("signedName");
  expect(security).not.toContain("resource.data.ownerUid == request.auth.uid");
  expect(security).not.toContain("+=*\n");
 });
 it("keeps feature off until legal notices and Firebase access rules are activated",()=>{
  expect(source).toContain('PHOTO_BACKEND_READY=import.meta.env.VITE_PHOTO_BACKEND_READY==="true"');
  expect(source).toContain("upload.disabled=!PHOTO_BACKEND_READY");
  expect(docs).toContain("Photographers retain all copyright");
  expect(docs).toContain("approved photo");
  expect(docs).toContain("removal");
  expect(docs).toContain("VITE_PHOTO_BACKEND_READY");
  expect(docs).toContain("non-exclusive");
 });
});
