import { expect,it } from 'vitest';
import { parseBackup } from '../src/restore.ts';
import { collectionExport } from '../src/export.ts';
import type { CollectionItem,CollectionGroup } from '../src/types.ts';
const group:CollectionGroup={id:'g1',name:'Favorites',createdAt:1,updatedAt:2};
const item:CollectionItem={id:'i1',title:'Archív 📚',addedAt:1,updatedAt:2,subtitle:null,category:'book',year:2026,imageUrl:'data:image/jpeg;base64,aA==',description:null,sourceUrl:'https://example.com/book',sourceLabel:'Manual',details:[{label:'Maker',value:'A'}],condition:'good',grade:'',quantity:1,pricePaid:0,estimatedValue:null,notes:'Notes\n"quotes"',favorite:true,groupId:'g1'};
const json=()=>collectionExport([item],[group]).json;
it('round-trips the actual export without losing photos or notes',()=>{expect(parseBackup(json())).toMatchObject({items:[item],groups:[group]});});
it.each(['bad json',JSON.stringify({format:'other',version:1,items:[],groups:[]})])('rejects unsupported files',value=>{expect(()=>parseBackup(value)).toThrow();});
it.each([
 (b:any)=>b.version=2,
 (b:any)=>b.items[0].id='../unsafe',
 (b:any)=>b.items.push(b.items[0]),
 (b:any)=>b.items[0].groupId='missing',
 (b:any)=>b.items[0].imageUrl='data:image/svg+xml;base64,AAAA',
 (b:any)=>b.items[0].sourceUrl='javascript:alert(1)',
 (b:any)=>b.items[0].quantity=-1,
 (b:any)=>b.items[0].favorite='true',
 (b:any)=>b.items[0].category='unknown',
])('rejects malformed records before restoring',mutate=>{const backup=JSON.parse(json());mutate(backup);expect(()=>parseBackup(JSON.stringify(backup))).toThrow();});
it('strips unrecognized fields before storing',()=>{const b=JSON.parse(json());b.items[0].unexpected={private:'data'};expect(parseBackup(JSON.stringify(b)).items[0]).toEqual(item);});
