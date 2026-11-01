import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {isSafePhotoData,MAX_PHOTO_DATA_LENGTH,validSetNumber} from "../src/lego-photo-contributions";
const source=readFileSync("src/lego-entry.ts","utf8");
const security=readFileSync("firestore.rules","utf8");
const service=readFileSync("src/lego-photo-contributions.ts","utf8");
const ui=readFileSync("src/lego-photo-ui.ts","utf8");
describe("owned LEGO set photo contributions",()=>{
 it("restricts image size, format and set identifiers",()=>{
  const small="data:image/jpeg;base64,"+"a".repeat(100);
  expect(isSafePhotoData(small)).toBe(true);
  expect(isSafePhotoData("data:image/svg+xml;base64,"+"a".repeat(100))).toBe(false);
  expect(isSafePhotoData("data:image/jpeg;base64,"+"A".repeat(MAX_PHOTO_DATA_LENGTH))).toBe(false);
  expect(validSetNumber("60412-1")).toBe(true);
  expect(validSetNumber("75313-1")).toBe(true);
  expect(validSetNumber("../../secret")).toBe(false);
 });
 it("removes EXIF by canvas JPEG conversion before storing photos",()=>{
  expect(service).toContain('ctx.drawImage(image,0,0,canvas.width,canvas.height)');
  expect(service).toContain('canvas.toDataURL("image/jpeg",quality)');
  expect(service).toContain('URL.revokeObjectURL(src)');
  expect(service).toContain("MAX_PHOTO_DATA_LENGTH=340000");
 });
 it("shows upload only for signed-in owners, including owned set list and detail",()=>{
  expect(source).toContain('if(owned&&currentUser&&legoDb){');
  expect(source).toContain('openOwnedPhotoDialog(legoDb!,currentUser!.uid,row.number,row.name,render)');
  expect(source).toContain('if(desired==="owned"&&legoDb&&currentUser){');
  expect(source).toContain('side.append(button("Upload photo"');
  expect(source).toContain('showPublishedPhoto(published,legoDb,row.number)');
 });
 it("requires explicit contributor approval and administrator decision",()=>{
  expect(ui).toContain('check.type="checkbox"');
  expect(ui).toContain('permission to display it to other users if approved');
  expect(ui).toContain('moderateSetPhoto(db,contribution,decision)');
  expect(service).toContain('status:submitForReview?"pending":"private"');
  expect(service).toContain('where("status","==","pending")');
  expect(service).toContain('batch.set(publicRef(db,photo.setNumber)');
  expect(service).toContain('const approved=await getDoc(publicRef(db,setNumber))');
 });
 it("prevents public photos from bypassing human moderation with security rules",()=>{
  expect(security).toContain("match /approvedSetPhotos/{setNumber}");
  expect(security).toContain("allow create, update: if isReportingAdmin()");
  expect(security).toContain("request.resource.data.status in ['private','pending']");
  expect(security).toContain("resource.data.status == 'pending'");
  expect(security).toContain("request.resource.data.status in ['approved','rejected']");
  expect(security).toContain("request.resource.data.imageData.size() <= 340000");
  expect(security).toContain("match /{path=**}/setPhotos/{setNumber}");
 });
 it("removes private and published photos as part of profile deletion",()=>{
  expect(source).toContain('await withdrawOwnSetPhoto(legoDb,user.uid,photo.id)');
  expect(source).toContain('await deleteUserDocuments(["setPhotos"])');
  expect(service).toContain('await deleteDoc(published.ref)');
 });
});
