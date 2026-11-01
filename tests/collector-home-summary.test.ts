import {describe,expect,it} from "vitest";
import {collectorOverview,collectingThemeTiles,setsWithStatus,absentFromCatalog} from "../src/collector-home-summary";

const catalog=[
 {number:"100-1",theme:"City",name:"City House"},
 {number:"101-1",theme:"City",name:"Train"},
 {number:"200-1",theme:"Star Wars",name:"Starship"},
 {number:"300-1",theme:"Technic",name:"Car"}
];

describe("collector homepage and dedicated collection lists",()=>{
 it("counts themes as unique union of owned and wishlist sets",()=>{
  const status={"100-1":"owned","101-1":"wishlist","200-1":"wishlist"} as const;
  const summary=collectorOverview(catalog,status);
  expect(summary.owned).toBe(1);
  expect(summary.wishlist).toBe(2);
  expect([...summary.collectingThemes].sort()).toEqual(["City","Star Wars"]);
 });
 it("does not include unrelated catalog themes when showing themes collecting",()=>{
  expect([...collectorOverview(catalog,{"100-1":"owned"}).collectingThemes]).toEqual(["City"]);
 });
 it("returns independent owned and wishlisted rows without mixing them",()=>{
  const status={"100-1":"owned","101-1":"wishlist","200-1":"owned"} as const;
  expect(setsWithStatus(catalog,status,"owned").map(x=>x.number)).toEqual(["100-1","200-1"]);
  expect(setsWithStatus(catalog,status,"wishlist").map(x=>x.number)).toEqual(["101-1"]);
 });
 it("keeps collection counts even if a previously saved set disappears from catalog",()=>{
  const status={"missing-1":"owned","101-1":"wishlist"} as const;
  expect(collectorOverview(catalog,status).owned).toBe(1);
  expect(absentFromCatalog(catalog,status,"owned")).toEqual(["missing-1"]);
  expect(setsWithStatus(catalog,status,"owned")).toEqual([]);
 });
 it("does not show any private items for an empty collection",()=>{
  expect(collectorOverview(catalog,{}).collectingThemes.size).toBe(0);
  expect(setsWithStatus(catalog,{},"wishlist")).toEqual([]);
 });
 it("maps saved Pokémon sets to the Pokemon browsing tile without changing label",()=>{
  const overview=collectorOverview([{number:"501-1",theme:"Pokémon"}],{"501-1":"wishlist"});
  expect(collectingThemeTiles(["All LEGO","City","Pokemon","Complete Catalog"],overview.collectingThemes)).toEqual(["Pokemon"]);
 });
 it("the collecting theme count matches visible tiles",()=>{
  const overview=collectorOverview(catalog,{"100-1":"owned","200-1":"wishlist"});
  expect(collectingThemeTiles(["All LEGO","City","Pokemon","Star Wars","Technic","Complete Catalog"],overview.collectingThemes)).toEqual(["City","Star Wars"]);
 });
});
