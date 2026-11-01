import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
const terms=readFileSync("public/terms.html","utf8");
const privacy=readFileSync("public/privacy.html","utf8");
const dialog=readFileSync("src/lego-photo-ui.ts","utf8");
const css=readFileSync("src/lego-styles.css","utf8");

describe("Archív photograph terms and upload notice",()=>{
 it("gives photographer-owned photos a dedicated anchored section in the Terms",()=>{
  expect(terms).toContain('<h2 id="community-photos">4. Community Photo Contributions</h2>');
  expect(terms).toContain("You retain copyright");
  expect(terms).toContain("does not claim ownership");
  expect(terms).toContain("non-exclusive, worldwide, royalty-free license");
  expect(terms).toContain("Request removal");
  expect(terms).toContain("Private, pending, and rejected photos");
  expect(terms).toContain("may remain visible after you delete your account");
  expect(terms).toContain('href="./privacy.html#uploaded-photos"');
  expect(terms).not.toContain("assign and transfer");
 });
 it("makes the Privacy Policy consistent with the new Terms",()=>{
  expect(privacy).toContain('id="uploaded-photos"');
  expect(privacy).toContain("Contributors retain photo copyright");
  expect(privacy).toContain("request removal");
  expect(privacy).toContain("limited, nonpublic records");
  expect(privacy).toContain('href="./terms.html#community-photos"');
 });
 it("always shows a concise notice and opens the matching Terms section",()=>{
  expect(dialog).toContain('const termsNotice=element("p","archiv-photo-terms-reference")');
  expect(dialog).toContain("You keep your copyright.");
  expect(dialog).toContain("Read Community Photo Terms");
  expect(dialog).toContain('new URL("terms.html#community-photos",window.location.href).href');
  expect(dialog).toContain('termsLink.target="_blank";termsLink.rel="noopener noreferrer"');
  expect(dialog.indexOf("termsNotice.append(termsLink);dialog.append(termsNotice)")).toBeLessThan(dialog.indexOf('const preview=element("img","archiv-photo-preview")'));
  expect(css).toContain(".archiv-photo-terms-reference{");
  const staged="https://jhoward02.github.io/archiv-app/lego-preview/#/set/60412-1";
  expect(new URL("terms.html#community-photos",staged).href)
   .toBe("https://jhoward02.github.io/archiv-app/lego-preview/terms.html#community-photos");
 });
 it("keeps community consent separate and photo uploads disabled until backend approval",()=>{
  expect(dialog).toContain('check.type="checkbox"');
  expect(dialog).toContain("Optional: Submit this photograph for community review");
  expect(dialog).not.toContain("Required copyright assignment");
  expect(dialog).not.toContain("Full legal name (electronic signature)");
 });
});
