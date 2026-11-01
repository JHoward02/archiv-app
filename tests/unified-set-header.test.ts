import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const app=readFileSync("src/lego-entry.ts","utf8");
const styles=readFileSync("src/lego-styles.css","utf8");
const terms=readFileSync("public/terms.html","utf8");
const privacy=readFileSync("public/privacy.html","utf8");

describe("consistent Archív logo and set page navigation",()=>{
 it("uses the red brick accent artwork on every app route and both legal pages",()=>{
  const logo=readFileSync("public/archiv-red-brick-accent-logo.webp");
  expect(logo.subarray(0,4).toString()).toBe("RIFF");
  expect(logo.subarray(8,12).toString()).toBe("WEBP");
  expect(app).toContain('art.src=import.meta.env.BASE_URL+"archiv-red-brick-accent-logo.webp"');
  expect(terms).toContain('<img src="./archiv-red-brick-accent-logo.webp" alt="Archív Collect"');
  expect(privacy).toContain('<img src="./archiv-red-brick-accent-logo.webp" alt="Archív Collect"');
  expect(terms).toContain('href="./" aria-label="Archív home"');
  expect(privacy).toContain('href="./" aria-label="Archív home"');
 });
 it("does not enable page-specific header sizing on theme or detail pages",()=>{
  expect(app).toContain('const header=e("header","lego-header")');
  expect(app).not.toContain('header.classList.add("lego-theme-header")');
  expect(app).not.toContain('header.classList.add("lego-detail-header")');
  expect(app).toContain('const art=e("img");art.src=import.meta.env.BASE_URL+"archiv-red-brick-accent-logo.webp"');
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
 it("places search left of OR and camera scan, above Catalog: Most Popular",()=>{
  const discover=app.indexOf('const discover=e("div","archiv-home-discover")');
  const searchForm=app.indexOf('const searchForm=e("form","archiv-home-search")',discover);
  const or=app.indexOf('discover.append(searchForm,e("span","archiv-home-search-or","OR"),scanSetNumberButton(true))',searchForm);
  const catalog=app.indexOf('shell.append(e("h2","archiv-catalog-heading","Catalog: Most Popular"))',or);
  const tiles=app.indexOf('const t=e("div","lego-theme-grid lego-home-themes")',catalog);
  expect(discover).toBeGreaterThan(0);
  expect(searchForm).toBeGreaterThan(discover);
  expect(or).toBeGreaterThan(searchForm);
  expect(catalog).toBeGreaterThan(or);
  expect(tiles).toBeGreaterThan(catalog);
  expect(app).toContain('b.replaceChildren(cameraGlyph(),e("span","","Scan Set Number"))');
  expect(styles).toContain(".archiv-home-discover .archiv-camera-glyph{width:39px;height:39px}");
  expect(styles).toContain(".archiv-home-discover{");
 });
 it("homepage searches by name, theme and set number using the full catalog",()=>{
  expect(app).toContain('homeQuery.placeholder="Name, theme, or set number"');
  expect(app).toContain('homeQuery.setAttribute("aria-label","Search LEGO sets by name, theme, or set number")');
  expect(app).toContain('searchForm.onsubmit=event=>{event.preventDefault();if(!homeQuery.value.trim()){homeQuery.focus();return}searchFullCatalogFromHome(homeQuery.value)}');
  expect(app).toContain('selected="Complete Catalog";search=term;page=0;sort="name-asc"');
  expect(app).toContain('location.hash="#/complete-catalog"');
  expect(app).toContain('{query:search,theme:catalogTheme,decade:catalogDecade,pieces:catalogPieces,status:catalogStatus},saved');
 });
 it("places the theme catalog button directly below the catalog heading",()=>{
  const title=app.indexOf('main.append(e("h2","",selected))');
  const back=app.indexOf('main.append(button("← Back to Catalog",()=>goTheme("All LEGO"),"archiv-collector-back archiv-set-page-back"))');
  const filters=app.indexOf('const toolbar=e("div","archiv-filter-bar archiv-catalog-filters")',title);
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
  expect(app).toContain('shell.append(e("h2","archiv-catalog-heading","Catalog: Most Popular"))');
  expect(app).not.toContain('const heading=e("h2","lego-popular-heading","Most Popular")');
  expect(app).toContain('const seller=e("div","lego-shop-pending archiv-ebay-inline")');
  expect(app).toContain('privacy.href=import.meta.env.BASE_URL+"privacy.html"');
 });
});
