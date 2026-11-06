import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";

const app=readFileSync("src/lego-entry.ts","utf8");
const styles=readFileSync("src/lego-styles.css","utf8");

describe("Archív eBay shopping placement and attribution safeguards",()=>{
 it("uses one shared EPN search link builder across the three shopping placements",()=>{
  expect(app).toContain('type EbayPlacement="detail"|"catalog"|"wishlist"');
  expect(app).toContain('details.append(ebayShopping(row,"detail"))');
  expect(app).toContain('actions.append(ebayShopping(row,"catalog"))');
  expect(app).toContain('side.append(ebayShopping(row,"wishlist"))');
  expect(app).toContain('link.href=ebaySetSearch(row);link.target="_blank";link.rel="noopener noreferrer sponsored"');
  expect(app).toContain('link.dataset.affiliatePlacement=placement');
  expect(app).toContain('const u=new URL("https://www.ebay.com/sch/i.html")');
  for(const param of ['"_nkw"','"mkevt"','"mkcid"','"mkrid"','"campid"','"toolid"'])expect(app).toContain('u.searchParams.set('+param+',');
 });
 it("shows prominent, truthful shopping CTAs and disclosure near every link",()=>{
  expect(app).toContain('"Looking for this set?"');
  expect(app).toContain('"Find this set on eBay ↗"');
  expect(app).toContain('"Search on eBay ↗"');
  expect(app).toContain('"Search eBay listings ↗"');
  expect(app).toContain('shop.append(link);');
  expect(app).toContain('shop.append(e("p","archiv-marketplace-disclosure",');
  expect(app).toContain("Affiliate link: Archív may earn a commission from qualifying purchases.");
  expect(app).toContain("Listings, prices and availability are not verified.");
  expect(app).not.toContain("Buy now on eBay");
  expect(app).not.toContain('archiv-ebay-inline-link');
 });
 it("uses one delegated click handler without double-counting Wishlist clicks",()=>{
  expect(app).toContain('document.addEventListener("click",ev=>{');
  expect(app).toContain('void reportAffiliateClick(setNumber)');
  expect(app).toContain('link.dataset.affiliateSetNumber=row.number');
  expect(app).toContain('trackAffiliateLink(setNumber,placement,Boolean(currentUser))');
  expect(app).not.toContain('buy.onclick=()=>{void reportAffiliateClick()}');
  expect((app.match(/void reportAffiliateClick\(setNumber\)/g)||[]).length).toBe(1);
 });
 it("provides keyboard-visible focus and mobile tap targets for each design",()=>{
  for(const cls of [".archiv-marketplace-detail",".archiv-marketplace-catalog",".archiv-marketplace-wishlist",".archiv-marketplace-disclosure",".archiv-marketplace-cta:focus-visible"])expect(styles).toContain(cls);
  expect(styles).toContain("min-height:46px");
  expect(styles).toContain("min-height:44px");
  expect(styles).toContain("@media(max-width:640px)");
  expect(styles).toContain("@media(max-width:700px)");
 });
});
