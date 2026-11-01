// @vitest-environment jsdom
import {describe,it,expect,afterEach} from "vitest";
import {openLegoSetNumberScanner} from "../src/lego-camera-scanner";

const sets=[
 {number:"75313-1",name:"AT-AT",year:2021,theme:"Star Wars",parts:6785},
 {number:"60412-1",name:"4x4 Fire Engine with Rescue Boat",year:2024,theme:"City",parts:301}
];
afterEach(()=>{document.querySelector(".archiv-scan-backdrop")?.remove();document.head.querySelector('script[src*="tesseract.js"]')?.remove()});
describe("phone-friendly camera scanner interface",()=>{
 it("opens camera and gallery pickers without loading OCR until a photo is selected",()=>{
  const matches:string[]=[];
  openLegoSetNumberScanner(sets,id=>matches.push(id));
  expect(document.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
  const inputs=[...document.querySelectorAll<HTMLInputElement>('input[type="file"]')];
  expect(inputs).toHaveLength(2);
  expect(inputs[0]?.accept).toBe("image/*");
  expect(inputs[0]?.getAttribute("capture")).toBe("environment");
  expect(inputs[1]?.hasAttribute("capture")).toBe(false);
  expect(document.querySelector('script[src*="tesseract.js"]')).toBeNull();
  expect(matches).toEqual([]);
 });
 it("lets users manually correct the printed number and confirm a catalog match",()=>{
  const opened:string[]=[];
  openLegoSetNumberScanner(sets,id=>opened.push(id));
  const entry=document.querySelector<HTMLInputElement>(".archiv-scan-manual-label input");
  expect(entry).not.toBeNull();
  entry!.value="75313";
  document.querySelector<HTMLButtonElement>(".archiv-scan-manual .lego-button")?.click();
  expect(document.querySelector(".archiv-scan-hit-info")?.textContent).toContain("AT-AT");
  expect(opened).toEqual([]);
  document.querySelector<HTMLButtonElement>(".archiv-scan-open-set")?.click();
  expect(opened).toEqual(["75313-1"]);
  expect(document.querySelector(".archiv-scan-backdrop")).toBeNull();
 });
 it("closes with Escape and does not retain a selected photo",()=>{
  openLegoSetNumberScanner(sets,()=>{});
  document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  expect(document.querySelector(".archiv-scan-backdrop")).toBeNull();
 });
});
