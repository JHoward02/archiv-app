import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const app=readFileSync("src/lego-entry.ts","utf8");
const styles=readFileSync("src/lego-styles.css","utf8");

describe("consistent Archív logo and set page navigation",()=>{
 it("does not enable page-specific header sizing on theme or detail pages",()=>{
  expect(app).toContain('const header=e("header","lego-header")');
  expect(app).not.toContain('header.classList.add("lego-theme-header")');
  expect(app).not.toContain('header.classList.add("lego-detail-header")');
  expect(app).toContain('const art=e("img");art.src=import.meta.env.BASE_URL+"archiv-toy-brick-logo.webp"');
  expect(styles).toContain(".lego-logo{width:min(560px,100%)}");
 });
 it("blends the alternate logo into the warm background without a white panel",()=>{
  expect(styles).toContain("Staging logo: let the artwork's white pixels blend naturally");
  expect(styles).toContain(".lego-header::before{content:none}");
  expect(styles).toContain(".lego-logo::before{display:none}");
  expect(styles).toContain(".lego-logo img{mix-blend-mode:multiply}");
  expect(styles).not.toContain("width:100vw;");
  expect(styles).not.toContain("background:#fefefe;");
 });
 it("moves the account icon inward on desktop and mobile",()=>{
  expect(styles).toContain(".lego-header>.lego-account-controls{margin-right:18px}");
  expect(styles).toContain("right:16px;");
  expect(styles).toContain(".lego-header:not(.lego-theme-header):not(.lego-detail-header)>.lego-account-controls");
 });
 it("places the theme catalog button directly below the catalog heading",()=>{
  const title=app.indexOf('main.append(e("h2","",selected))');
  const back=app.indexOf('main.append(button("← Back to Catalog",()=>goTheme("All LEGO"),"archiv-collector-back archiv-set-page-back"))');
  const filters=app.indexOf('const controls=e("div","lego-controls")',title);
  expect(title).toBeGreaterThan(0);
  expect(back).toBeGreaterThan(title);
  expect(filters).toBeGreaterThan(back);
 });
 it("moves set detail navigation below the shared logo without losing collection back links",()=>{
  expect(app).toContain('const navigation=e("nav","archiv-set-back-navigation")');
  expect(app).toContain('navigation.append(button("← Back to Catalog",()=>goTheme("All LEGO"),"archiv-collector-back archiv-set-page-back"))');
  expect(app).toContain('()=>backTarget?goCollectorView(backTarget):goTheme(selected!=="All LEGO"?selected:homeTheme)');
  expect(app).not.toContain('header.append(returnButton)');
 });
 it("keeps account menu and collector features on all pages",()=>{
  expect(app).toContain('header.append(account)');
  expect(app).toContain('const collectorRoute=collectorViewFromHash()');
  expect(app).toContain('const heading=e("h2","lego-popular-heading","Most Popular")');
  expect(app).toContain('const seller=e("div","lego-shop-pending archiv-ebay-inline")');
  expect(app).toContain('privacy.href=import.meta.env.BASE_URL+"privacy.html"');
 });
});
