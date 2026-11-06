import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const app=readFileSync("src/lego-entry.ts","utf8");
const css=readFileSync("src/lego-styles.css","utf8");
const expected:Record<string,string>={"theme-city.webp":"cc373db24bfb2e8938dbc0f8f561265e6a07b6deef3e7850a98bad6c1f870ec4","theme-pokemon.webp":"8f92d2d5ccd95bf013b5ba4b65ff250fff35f511f31efe6c5eef99414fcd9676","theme-star-wars.webp":"3ff29ca62a9c05af99daaa7fa360b3b6f18c9189c04769ca6b336f79b4e0c7bc","theme-technic.webp":"7b878c01c73ae3f01e7e812708c8ae9c1dcc915e4d86902c812a9e636c55e387","theme-botanicals.webp":"055fd6654dae156365f3565de36f9700b639eeea4d1d4465ea12023373c9c72f","theme-icons.webp":"15f5e889e03bdee65a2e6b66f8ac031bf52421bd56506667d39492d8e4cc9131"};
describe("user supplied hand-drawn LEGO theme artwork",()=>{
 it("contains each original theme brick, optimized without altering its identity",()=>{
  for(const [file,hash] of Object.entries(expected)){
   const bytes=readFileSync("public/theme-bricks/"+file);
   expect(bytes.subarray(0,4).toString()).toBe("RIFF");
   expect(bytes.subarray(8,12).toString()).toBe("WEBP");
   expect(createHash("sha256").update(bytes).digest("hex")).toBe(hash);
   expect(app).toContain('"'+file+'"');
  }
 });
 it("layers unchanged set photos into the blank illustrated windows, without CSS studs or duplicate labels",()=>{
  expect(app).toContain('b.classList.add("archiv-theme-illustrated")');
  expect(app).toContain('brick.src=import.meta.env.BASE_URL+"theme-bricks/"+suppliedArt');
  expect(app).toContain('photo.src=tileSets[n]?setImage(tileSets[n])');
  expect(app).toContain('b.append(brick,photo)');
  expect(css).toContain('.lego-theme.archiv-theme-illustrated .archiv-theme-set-photo');
  expect(css).toContain('mix-blend-mode:multiply');
  expect(css).not.toContain("Staging sketch v2");
  expect(css).toContain(".lego-theme-art{border-radius:0");
 });
});
