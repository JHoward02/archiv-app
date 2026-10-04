import { CATEGORIES, CONDITIONS, type CollectionItem, type CollectionGroup } from "./types.ts";
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
export interface Backup { items: CollectionItem[]; groups: CollectionGroup[]; exportedAt: string; }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid backup record.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 10000): string {
  if (typeof value !== "string" || value.length > max) throw new Error("Invalid or oversized text in backup.");
  return value;
}
function nullableText(value: unknown, max = 10000): string | null { return value === null ? null : text(value, max); }
function number(value: unknown, nullable = false): number | null {
  if (nullable && value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Invalid number in backup.");
  return value;
}
function id(value: unknown): string {
  const result = text(value, 128);
  if (!result || result.includes("/") || result === "." || result === ".." || /^__.*__$/.test(result)) throw new Error("Invalid record identifier.");
  return result;
}
function url(value: unknown, photo = false): string | null {
  if (value === null) return null;
  const result = text(value, photo ? 900000 : 5000);
  if (photo && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(result)) return result;
  try { if (new URL(result).protocol === "https:") return result; } catch { /* rejected below */ }
  throw new Error("Backup contains an unsupported image or link.");
}
export function parseBackup(json: string): Backup {
  if (new TextEncoder().encode(json).length > MAX_BACKUP_BYTES) throw new Error("Backup is larger than 100 MB.");
  let raw: Record<string, unknown>;
  try { raw = record(JSON.parse(json)); } catch { throw new Error("Choose an Archív JSON export."); }
  if (raw.format !== "archiv-collection" || raw.version !== 1 || !Array.isArray(raw.items) || !Array.isArray(raw.groups)) throw new Error("Unsupported backup. Choose an Archív version 1 export.");
  const exportedAt = text(raw.exportedAt, 50);
  if (!Number.isFinite(Date.parse(exportedAt))) throw new Error("Invalid export date.");
  if (raw.items.length + raw.groups.length > 10000) throw new Error("Backup has more than 10,000 records.");
  const groups = raw.groups.map((entry): CollectionGroup => {
    const g = record(entry);
    const name = text(g.name, 500); if (!name.trim()) throw new Error("A group name is missing.");
    return { id: id(g.id), name, createdAt: number(g.createdAt)!, updatedAt: number(g.updatedAt)! };
  });
  const groupIds = new Set(groups.map(g => g.id));
  if (groupIds.size !== groups.length) throw new Error("Backup contains duplicate group identifiers.");
  const items = raw.items.map((entry): CollectionItem => {
    const i = record(entry);
    if (!CATEGORIES.includes(i.category as never) || !CONDITIONS.includes(i.condition as never)) throw new Error("Invalid item type or condition.");
    if (typeof i.favorite !== "boolean" || !Array.isArray(i.details) || i.details.length > 100) throw new Error("Invalid item details.");
    const groupId = i.groupId === null ? null : id(i.groupId);
    if (groupId && !groupIds.has(groupId)) throw new Error("An item refers to a group missing from the backup.");
    const quantity = number(i.quantity)!; if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Invalid item quantity.");
    const title = text(i.title, 1000); if (!title.trim()) throw new Error("An item title is missing.");
    const item: CollectionItem = { id:id(i.id), title, category:i.category as CollectionItem["category"], condition:i.condition as CollectionItem["condition"], addedAt:number(i.addedAt)!, updatedAt:number(i.updatedAt)!, subtitle:nullableText(i.subtitle), year:number(i.year,true), imageUrl:url(i.imageUrl,true), description:nullableText(i.description), sourceUrl:url(i.sourceUrl), sourceLabel:text(i.sourceLabel), details:i.details.map(value => { const d=record(value); return {label:text(d.label),value:text(d.value)}; }), grade:text(i.grade), quantity, pricePaid:number(i.pricePaid,true), estimatedValue:number(i.estimatedValue,true), notes:text(i.notes,100000), favorite:i.favorite, groupId };
    if (new TextEncoder().encode(JSON.stringify(item)).length > 950000) throw new Error("An item is too large to restore.");
    return item;
  });
  if (new Set(items.map(i => i.id)).size !== items.length) throw new Error("Backup contains duplicate item identifiers.");
  return {items,groups,exportedAt};
}
