import type { CollectionGroup, CollectionItem } from "./types.ts";

/** Versioned, lossless JSON: uploaded photo data stays embedded; catalog images retain their URLs. */
export function collectionExport(items: CollectionItem[], groups: CollectionGroup[], exportedAt = new Date()): { filename: string; json: string } {
  const timestamp = exportedAt.toISOString();
  return {
    filename: `archiv-backup-${timestamp.replace(/[:.]/g, "-")}.json`,
    json: JSON.stringify({ format: "archiv-collection", version: 1, exportedAt: timestamp, items, groups }, null, 2),
  };
}

export function downloadExport(filename: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
