import { expect, it } from 'vitest';
import { collectionExport } from '../src/export.ts';
import type { CollectionItem, CollectionGroup } from '../src/types.ts';
it('preserves notes, Unicode, groups, and embedded photos through JSON round trip', () => {
 const items = [{id:'one',title:'Archív 📚',notes:'Line one\n"Line two"',imageUrl:'data:image/jpeg;base64,aA==',pricePaid:0,quantity:2}] as CollectionItem[];
 const groups = [{id:'group',name:'My shelf'}] as CollectionGroup[];
 const result = collectionExport(items,groups,new Date('2026-10-04T22:00:00Z'));
 expect(JSON.parse(result.json)).toEqual({format:'archiv-collection',version:1,exportedAt:'2026-10-04T22:00:00.000Z',items,groups});
 expect(result.filename).toBe('archiv-backup-2026-10-04T22-00-00-000Z.json');
});
it('exports an empty collection as a valid backup', () => {
 expect(JSON.parse(collectionExport([],[]).json)).toMatchObject({items:[],groups:[],version:1});
});
