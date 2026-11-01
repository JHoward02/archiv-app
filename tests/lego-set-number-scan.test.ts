import {describe,it,expect} from "vitest";
import {findManualSetNumber,findSetNumberMatches} from "../src/lego-set-number-scan";

const sets=[
 {number:"75313-1",name:"AT-AT",year:2021,theme:"Star Wars",parts:6785},
 {number:"60412-1",name:"4x4 Fire Engine with Rescue Boat",year:2024,theme:"City",parts:301},
 {number:"21058-1",name:"Great Pyramid of Giza",year:2022,theme:"Architecture",parts:1476},
 {number:"71004-13",name:"Collectible Minifigure",year:2014,theme:"Minifigures",parts:5}
];

describe("on-device photo set-number matching",()=>{
 it("matches printed set numbers with or without -1 revision",()=>{
  expect(findSetNumberMatches("LEGO STAR WARS 75313  ADULTS 18+",sets).map(x=>x.set.number)).toEqual(["75313-1"]);
  expect(findSetNumberMatches("Set no. 60412-1",sets).map(x=>x.set.number)).toEqual(["60412-1"]);
  expect(findSetNumberMatches("Model: 21058 / 1",sets).map(x=>x.set.number)).toEqual(["21058-1"]);
 });
 it("keeps revision suffixes and supports variant separators",()=>{
  expect(findSetNumberMatches("71004–13",sets).map(x=>x.set.number)).toEqual(["71004-13"]);
  expect(findSetNumberMatches("71004-13",sets)[0]?.exactVersion).toBe(true);
 });
 it("does not treat a retail barcode or fragments of long codes as set numbers",()=>{
  expect(findSetNumberMatches("UPC 673419400794",sets)).toEqual([]);
  expect(findSetNumberMatches("code A75313B",sets)).toEqual([]);
  expect(findSetNumberMatches("No obvious number",sets)).toEqual([]);
 });
 it("returns only real catalog entries and limits ambiguous matches",()=>{
  expect(findSetNumberMatches("LEGO 75313 and 60412",sets,1).map(x=>x.set.number)).toEqual(["75313-1"]);
  expect(findSetNumberMatches("99009900",sets)).toEqual([]);
 });
 it("accepts corrected set numbers but never invents unmatched sets",()=>{
  expect(findManualSetNumber(" 75313 ",sets).map(x=>x.set.number)).toEqual(["75313-1"]);
  expect(findManualSetNumber("71004-13",sets).map(x=>x.set.number)).toEqual(["71004-13"]);
  expect(findManualSetNumber("673419400794",sets)).toEqual([]);
  expect(findManualSetNumber("no number",sets)).toEqual([]);
 });
});
