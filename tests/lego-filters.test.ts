import {describe,expect,it} from "vitest";
import {decadeOptions,filterSets,sortSets,savedThemeCounts} from "../src/lego-filters";

const rows=[
 {number:"1-1",name:"Alpha Racer",theme:"City",year:2022,parts:45},
 {number:"100-1",name:"Zeta Castle",theme:"Icons",year:2015,parts:1250},
 {number:"20-1",name:"Beta Ship",theme:"Star Wars",year:2024,parts:650},
 {number:"3-1",name:"Gamma House",theme:"City",year:2021,parts:200}
];
const saved={"1-1":"owned","20-1":"wishlist","100-1":"owned"} as const;

describe("LEGO catalog and saved-set filtering",()=>{
 it("searches names, numbers, themes and years case-insensitively",()=>{
  expect(filterSets(rows,{query:"beta"}).map(x=>x.number)).toEqual(["20-1"]);
  expect(filterSets(rows,{query:"100-1"}).map(x=>x.number)).toEqual(["100-1"]);
  expect(filterSets(rows,{query:"star wars"}).map(x=>x.number)).toEqual(["20-1"]);
  expect(filterSets(rows,{query:"2015"}).map(x=>x.number)).toEqual(["100-1"]);
 });
 it("combines themes, decade, and part count without losing saved status",()=>{
  expect(filterSets(rows,{theme:"City",decade:"2020",pieces:"100-499"},saved).map(x=>x.number)).toEqual(["3-1"]);
  expect(filterSets(rows,{pieces:"1000plus"},saved).map(x=>x.number)).toEqual(["100-1"]);
  expect(filterSets(rows,{pieces:"under100"},saved).map(x=>x.number)).toEqual(["1-1"]);
  expect(filterSets(rows,{pieces:"500-999"},saved).map(x=>x.number)).toEqual(["20-1"]);
 });
 it("filters owned, wishlist and not owned independently",()=>{
  expect(filterSets(rows,{status:"owned"},saved).map(x=>x.number)).toEqual(["1-1","100-1"]);
  expect(filterSets(rows,{status:"wishlist"},saved).map(x=>x.number)).toEqual(["20-1"]);
  expect(filterSets(rows,{status:"uncollected"},saved).map(x=>x.number)).toEqual(["20-1","3-1"]);
 });
 it("sorts without silently prioritizing owned sets",()=>{
  expect(sortSets(rows,"year-desc").map(x=>x.number)).toEqual(["20-1","1-1","3-1","100-1"]);
  expect(sortSets(rows,"pieces-desc").map(x=>x.number)).toEqual(["100-1","20-1","3-1","1-1"]);
  expect(sortSets(rows,"number-asc").map(x=>x.number)).toEqual(["1-1","3-1","20-1","100-1"]);
  expect(sortSets(rows,"name-desc")[0]?.name).toBe("Zeta Castle");
  expect(rows[0]?.number).toBe("1-1");
 });
 it("offers only decades found in the catalog",()=>{
  expect(decadeOptions(rows)).toEqual([["all","Any year"],["2020","2020s"],["2010","2010s"]]);
 });
 it("counts collecting themes by actual owned and wishlisted sets",()=>{
  const pokemon={number:"12-1",name:"Pika",theme:"Pokémon",year:2026,parts:500};
  expect(savedThemeCounts([...rows,pokemon],{...saved,"12-1":"wishlist"})).toEqual({
   City:{owned:1,wishlist:0},
   "Star Wars":{owned:0,wishlist:1},
   Icons:{owned:1,wishlist:0},
   Pokemon:{owned:0,wishlist:1}
  });
 });
});
