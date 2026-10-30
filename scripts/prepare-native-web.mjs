// Reuse assets from the last approved Pages release: no extra Rebrickable downloads.
// The downloaded Pages artifact is extracted to native-pages/.
import {existsSync,cpSync,readdirSync,readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {join} from "node:path";
const root="native-pages";
if(!existsSync(join(root,"index.html")))throw Error("Missing extracted Pages artifact index.html");
const assets=readdirSync(join(root,"assets"));
for(const stem of ["lego-catalog","lego-themes"]){
 const filename=assets.find(name=>name.startsWith(stem+"-")&&name.endsWith(".json"));
 if(!filename)throw Error("Missing "+stem+" JSON in approved website release");
 const raw=readFileSync(join(root,"assets",filename));
 JSON.parse(raw.toString("utf8"));
 writeFileSync(join("src",stem+".json"),raw);
 console.log("Using approved",stem,"dataset",filename,raw.length,"bytes");
}
if(!existsSync(join(root,"lego-parts","0.json")))throw Error("Missing parts inventory in approved website release");
mkdirSync("public/lego-parts",{recursive:true});
cpSync(join(root,"lego-parts"),"public/lego-parts",{recursive:true});
console.log("Copied historical set inventories from previously approved website build.");
