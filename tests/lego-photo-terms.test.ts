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
 it("shows compact informed consent and links to the full photo policies",()=>{
  expect(dialog).toContain('const termsNotice=element("p","archiv-photo-terms-reference")');
  expect(dialog).toContain("Submit for community review (optional)");
  expect(dialog).toContain("I keep my copyright.");
  expect(dialog).toContain("Approved photos may remain after account deletion");
  expect(dialog).toContain('new URL("terms.html#community-photos",window.location.href).href');
  expect(dialog).toContain('new URL("privacy.html#uploaded-photos",window.location.href).href');
  expect(dialog).toContain('termsLink.target="_blank";termsLink.rel="noopener noreferrer"');
  expect(dialog.indexOf('const termsNotice=element("p","archiv-photo-terms-reference")'))
   .toBeGreaterThan(dialog.indexOf('const labelText=element("span"'));
  expect(dialog.indexOf('termsNotice.append(termsLink,document.createTextNode(" · "),privacyLink);dialog.append(termsNotice)'))
   .toBeLessThan(dialog.indexOf('const buttons=element("div","archiv-photo-actions")'));
  expect(dialog).not.toContain('archiv-photo-license-detail');
  expect(dialog).not.toContain('Permission terms: ');
  expect(css).toContain(".archiv-photo-terms-reference{");
  const staged="https://jhoward02.github.io/archiv-app/lego-preview/#/set/60412-1";
  expect(new URL("terms.html#community-photos",staged).href)
   .toBe("https://jhoward02.github.io/archiv-app/lego-preview/terms.html#community-photos");
  expect(new URL("privacy.html#uploaded-photos",staged).href)
   .toBe("https://jhoward02.github.io/archiv-app/lego-preview/privacy.html#uploaded-photos");
 });
 it("keeps community consent optional and private uploads the default",()=>{
  expect(dialog).toContain('check.type="checkbox"');
  expect(dialog).toContain("Submit for community review (optional)");
  expect(dialog).not.toContain("Required copyright assignment");
  expect(dialog).not.toContain("Full legal name (electronic signature)");
 });
});
