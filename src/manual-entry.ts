import { getSearchSelection } from "./search-selection.ts";

const STORAGE_KEY = "openhands:apps:collector-scan:standalone:collection:v1";

const categoryMap: Record<string, string> = {
  Comics: "comic", TCG: "tcg", "Sports cards": "sports-card", Books: "book",
  "Video games": "video-game", Figures: "figure", Toys: "toy", Coins: "coin",
  Vinyl: "vinyl", Sneakers: "sneaker", Other: "other",
};

function selectedCategory(): string {
  const pressed = [...document.querySelectorAll<HTMLButtonElement>('.cs-chips button[aria-pressed="true"]')]
    .find((b) => b.textContent?.trim() !== "Any type");
  return categoryMap[pressed?.textContent?.trim() || ""] || "other";
}

function id(): string {
  return globalThis.crypto?.randomUUID?.() || `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function photoData(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1200;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

function saveManual(item: Record<string, unknown>): void {
  let parsed: { schemaVersion: number; items: unknown[]; groups: unknown[] } = { schemaVersion: 1, items: [], groups: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const old = JSON.parse(raw);
      parsed = {
        schemaVersion: 1,
        items: Array.isArray(old.items) ? old.items : [],
        groups: Array.isArray(old.groups) ? old.groups : [],
      };
    }
  } catch { /* start a safe collection payload */ }
  parsed.items.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
}

function catalogSubmissionUrl(form: HTMLFormElement): string {
  const fd = new FormData(form);
  const clean = (key: string, max: number) => String(fd.get(key) || "").trim().replace(/[\r\n]+/g, " ").slice(0, max);
  const category = clean("category", 30);
  const selection = getSearchSelection();
  const line = category === "figure" ? selection.figureLine : category === "toy" ? selection.toyLine : category === "tcg" ? selection.tcgGame : null;
  const title = clean("title", 200);
  const body = [
    "<!-- shelfie-catalog-submission:v1 -->",
    "### Name", title,
    "### Category", category,
    "### Line / game", line || "",
    "### Year", clean("year", 4),
    "### Maker", clean("maker", 160),
    "### Identifier", clean("identifier", 100),
    "### Photo", "If you want to share a photo, attach it here on GitHub. Photos and private notes saved in Archiv are not sent automatically.",
  ].join("\n\n");
  const url = new URL("https://github.com/JHoward02/archiv-app/issues/new");
  url.searchParams.set("title", `[Catalog submission] ${title}`);
  url.searchParams.set("body", body);
  return url.toString();
}

function openManual(): void {
  document.querySelector("#shelfie-manual-modal")?.remove();
  const query = (document.querySelector<HTMLInputElement>("#cs-search-input")?.value || "").trim();
  const overlay = document.createElement("div");
  overlay.id = "shelfie-manual-modal";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(5,21,33,.78);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:16px";
  const panel = document.createElement("form");
  panel.style.cssText = "background:#fffdf8;color:#08243b;width:min(560px,100%);max-height:90vh;overflow:auto;border:1px solid #d9cebf;border-radius:18px;padding:20px;display:grid;gap:12px;box-shadow:0 24px 60px rgba(8,36,59,.25)";
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h3 style="margin:0;font-family:Georgia,serif">Add it to Archiv</h3><button type="button" data-close aria-label="Close" style="font-size:24px;border:0;background:none;color:#08243b">×</button></div>
    <p style="margin:0;color:#6f6a62">Save privately to this device, or propose the item for Archiv's shared catalog. Catalog proposals open on GitHub, require a GitHub account, and appear in search after review.</p>
    <label>Title / name<input required name="title" value="${query.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}" class="cs-input" style="width:100%;margin-top:5px"></label>
    <label>Type<select name="category" class="cs-select" style="width:100%;margin-top:5px">
      <option value="comic">Comic</option><option value="tcg">TCG</option><option value="sports-card">Sports card</option><option value="book">Book</option><option value="video-game">Video game</option><option value="figure">Figure</option><option value="toy">Toy</option><option value="coin">Coin</option><option value="vinyl">Vinyl</option><option value="sneaker">Sneaker</option><option value="other">Other</option>
    </select></label>
    <label>Year <span style="color:#777">(optional)</span><input name="year" type="number" min="1000" max="2100" class="cs-input" style="width:100%;margin-top:5px"></label>
    <label>Maker / publisher / artist <span style="color:#777">(optional)</span><input name="maker" class="cs-input" style="width:100%;margin-top:5px"></label>
    <label>Identifier <span style="color:#777">UPC, ISBN, issue, catalog/model number, etc.</span><input name="identifier" class="cs-input" style="width:100%;margin-top:5px"></label>
    <label>Photo <span style="color:#777">(optional)</span><input name="photo" type="file" accept="image/*" capture="environment" style="display:block;margin-top:6px"></label>
    <label>Notes <span style="color:#777">(optional)</span><textarea name="notes" rows="3" class="cs-textarea" style="width:100%;margin-top:5px"></textarea></label>
    <button class="cs-button cs-button--block" type="submit">Save to my collection</button>
    <button class="cs-button cs-button--block" type="button" data-catalog>Submit to Archiv catalog on GitHub</button>
    <p style="margin:0;color:#6f6a62;font-size:13px">Only the name, type, line, year, maker, and identifier are prefilled on GitHub. Review the public proposal there before submitting. Attach a photo there if you want to share one.</p>`;
  const pageCategory = location.hash.match(/^#\/collection\/category\/(comic|tcg|sports-card|book|video-game|figure|toy|coin|vinyl|sneaker|other)$/)?.[1];
  if (pageCategory) panel.querySelector<HTMLSelectElement>('select[name="category"]')!.value = pageCategory;
  (panel.elements.namedItem("category") as HTMLSelectElement).value = selectedCategory();
  panel.querySelector("[data-close]")?.addEventListener("click", () => overlay.remove());
  panel.querySelector("[data-catalog]")?.addEventListener("click", () => {
    if (!panel.reportValidity()) return;
    window.open(catalogSubmissionUrl(panel), "_blank", "noopener,noreferrer");
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  panel.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(panel);
    const title = String(fd.get("title") || "").trim();
    if (!title) return;
    const file = fd.get("photo") as File | null;
    let imageUrl: string | null = null;
    if (file?.size) {
      try { imageUrl = await photoData(file); } catch { imageUrl = null; }
    }
    const now = Date.now();
    const yearRaw = Number(fd.get("year"));
    const maker = String(fd.get("maker") || "").trim();
    const identifier = String(fd.get("identifier") || "").trim();
    const category = String(fd.get("category") || "other");
    const selection = getSearchSelection();
    const line = category === "figure" ? selection.figureLine : category === "toy" ? selection.toyLine : category === "tcg" ? selection.tcgGame : null;
    saveManual({
      id: id(), addedAt: now, updatedAt: now, title, subtitle: maker || null,
      category, year: Number.isFinite(yearRaw) && yearRaw > 0 ? yearRaw : null,
      imageUrl, description: null, sourceUrl: null, sourceLabel: "Manual entry",
      details: [maker ? { label: "Maker / publisher / artist", value: maker } : null, identifier ? { label: "Identifier", value: identifier } : null, line ? { label: "Line / game", value: line } : null, category === "toy" && selection.toyLine === "die-cast" && selection.dieCastBrand ? { label: "Brand", value: selection.dieCastBrand } : null].filter(Boolean),
      condition: "good", grade: "", quantity: 1, pricePaid: null, estimatedValue: null,
      notes: String(fd.get("notes") || "").trim(), favorite: false, groupId: null,
    });
    overlay.remove();
    location.hash = `#/collection/category/${category}`;
    location.reload();
  });
  overlay.append(panel);
  document.body.append(overlay);
}

function installButton(): void {
  const list = document.querySelector<HTMLElement>("#cs-list");
  if (!list || document.querySelector("#shelfie-manual-add")) return;
  const button = document.createElement("button");
  button.id = "shelfie-manual-add";
  button.type = "button";
  button.className = "cs-button cs-button--block";
  button.style.marginTop = "14px";
  button.textContent = list.textContent?.includes("No matches") ? "+ Add it to Archiv" : "Can't find yours? Add it manually";
  button.addEventListener("click", openManual);
  list.insertAdjacentElement("afterend", button);
}

export function installManualEntry(): () => void {
  document.addEventListener("shelfie:manual-entry", openManual);
  const observer = new MutationObserver(installButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installButton();
  return () => { observer.disconnect(); document.removeEventListener("shelfie:manual-entry", openManual); };
}
