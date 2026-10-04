import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { CollectionItem } from "../src/types.ts";

const fake = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string } | null },
  authChanged: null as null | ((user: { uid: string } | null) => void),
  subscriptions: [] as { path: string; next: (snapshot: unknown) => void; error: (error: Error) => void; active: boolean }[],
  records: new Map<string, unknown>(),
  transactionCount: 0, failTransaction: 0, fail: false, reauthFail: false, deleteFail: false, deleted: false,
}));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}), getApps: () => [] }));
vi.mock("firebase/auth", () => ({
  getAuth: () => fake.auth,
  GoogleAuthProvider: class {},
  onAuthStateChanged: (_auth: unknown, callback: typeof fake.authChanged) => { fake.authChanged = callback; },
  signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(),
  reauthenticateWithPopup: async () => { if (fake.reauthFail) throw new Error("Cancelled"); },
  deleteUser: async () => { if (fake.deleteFail) throw new Error("Auth deletion failed"); fake.deleted = true; fake.auth.currentUser = null; fake.authChanged?.(null); },
  signOut: async () => { fake.auth.currentUser = null; fake.authChanged?.(null); },
}));
vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  getDocFromServer: async (path: string) => ({ exists: () => fake.records.has(path) }),
  setDoc: async (path: string, value: unknown) => { if (fake.fail) throw new Error("Permission denied"); fake.records.set(path,value); },
  limit: (count: number) => count,
  query: (path: string, count: number) => ({path,count}),
  getDocsFromServer: async (source: string | {path:string;count:number}) => {
    if (fake.fail) throw new Error("Read failed");
    const {path,count} = typeof source === "string" ? {path:source,count:Infinity} : source;
    const docs = [...fake.records.keys()].filter(key => key.startsWith(path + "/")).slice(0,count).map(ref => ({ref,data: () => fake.records.get(ref)}));
    return {docs,empty:docs.length===0};
  },
  collection: (_db: unknown, ...parts: string[]) => parts.join("/"),
  doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
  onSnapshot: (path: string, next: (snapshot: unknown) => void, error: (error: Error) => void) => {
    const sub = { path, next, error, active: true };
    fake.subscriptions.push(sub);
    next({ docs: [...fake.records].filter(([key]) => key.startsWith(path + "/")).map(([, value]) => ({ data: () => value })) });
    return () => { sub.active = false; };
  },
  runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<unknown>) => {
    fake.transactionCount++;
    if (fake.failTransaction === fake.transactionCount) throw new Error("Transaction failed");
    const changes: [string,unknown][] = [];
    const result = await action({get: async (path:string) => ({exists: () => fake.records.has(path)}),set: (path:string,value:unknown) => changes.push([path,value])});
    changes.forEach(([path,value]) => fake.records.set(path,value));
    return result;
  },
  writeBatch: () => {
    const changes: [string, unknown][] = [];
    return {
      set: (path: string, value: unknown) => changes.push([path, value]),
      delete: (path: string) => changes.push([path, undefined]),
      commit: async () => {
        if (fake.fail) throw new Error("Permission denied");
        for (const [path, value] of changes) { if (value === undefined) fake.records.delete(path); else fake.records.set(path, value); }
        for (const sub of fake.subscriptions.filter((sub) => sub.active)) {
          sub.next({ docs: [...fake.records].filter(([key]) => key.startsWith(sub.path + "/")).map(([, value]) => ({ data: () => value })) });
        }
      },
    };
  },
}));

beforeEach(() => {
  vi.resetModules();
  for (const name of ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID"]) vi.stubEnv(`VITE_FIREBASE_${name}`, "test");
  fake.auth.currentUser = null; fake.authChanged = null; fake.subscriptions = []; fake.records.clear(); fake.fail = false; fake.reauthFail = false; fake.deleteFail = false; fake.deleted = false; fake.transactionCount = 0; fake.failTransaction = 0;
  localStorage.clear();
});
afterEach(() => vi.unstubAllEnvs());

async function signedIn() {
  const module = await import("../src/profiles.ts");
  fake.auth.currentUser = { uid: "account-a" };
  fake.authChanged?.(fake.auth.currentUser);
  return module;
}
const item = { id: "item-1", title: "Test book", imageUrl: null } as CollectionItem;

it("saves under the signed-in account and does not create device records", async () => {
  const profile = await signedIn();
  await profile.saveProfile([item], []);
  expect(fake.records.get("users/account-a/items/item-1")).toEqual(item);
  expect(profile.profileState.items).toEqual([item]);
  expect(localStorage.length).toBe(0);
});

it("rolls back a failed save so retry writes the item again", async () => {
  const profile = await signedIn(); fake.fail = true;
  await expect(profile.saveProfile([item], [])).rejects.toThrow("Permission denied");
  expect(profile.profileState.items).toEqual([]);
  fake.fail = false;
  await profile.saveProfile([item], []);
  expect(fake.records.get("users/account-a/items/item-1")).toEqual(item);
});

it("clears the prior account on sign-out and ignores its stale listener errors", async () => {
  const profile = await signedIn();
  await profile.saveProfile([item], []);
  const old = fake.subscriptions[0];
  await profile.signOutProfile();
  old.error(new Error("Stale account error"));
  expect(profile.profileState).toMatchObject({ user: null, items: [], groups: [], error: null });
});

it("does not delete records when Google identity confirmation is cancelled", async () => {
  const profile = await signedIn(); await profile.saveProfile([item], []);
  fake.reauthFail = true;
  await expect(profile.deleteProfile()).rejects.toThrow("Cancelled");
  expect(fake.records.get("users/account-a/items/item-1")).toEqual(item);
  expect(fake.records.has("users/account-a/account/deletion")).toBe(false);
  expect(fake.deleted).toBe(false);
});
it("does not delete records when the server cannot establish the deletion lock", async () => {
  const profile = await signedIn(); await profile.saveProfile([item], []); fake.fail = true;
  await expect(profile.deleteProfile()).rejects.toThrow("Permission denied");
  expect(fake.records.get("users/account-a/items/item-1")).toEqual(item);
  expect(fake.deleted).toBe(false);
});
it("deletes multiple batches of account records before deleting authentication", async () => {
  const profile = await signedIn();
  for (let i=0;i<425;i++) fake.records.set(`users/account-a/items/${i}`, {id:String(i)});
  fake.records.set("users/account-a/groups/g1", {id:"g1"});
  fake.records.set("users/account-b/items/private", {id:"private"});
  await profile.deleteProfile();
  expect([...fake.records.keys()]).toEqual(["users/account-b/items/private", "users/account-a/account/deletion"]);
  expect(fake.deleted).toBe(true);
  expect(profile.profileState.user).toBeNull();
});
it("keeps authentication when a data batch fails and allows deletion retry", async () => {
  const profile = await signedIn(); await profile.saveProfile([item], []);
  fake.records.set("users/account-a/account/deletion", {deleting:true}); fake.fail = true;
  await expect(profile.deleteProfile()).rejects.toThrow("Read failed");
  expect(fake.deleted).toBe(false);
  await expect(profile.saveProfile([], [])).rejects.toThrow("deletion has started");
  fake.fail = false; await profile.deleteProfile(); expect(fake.deleted).toBe(true);
});
it("can finish deletion if authentication removal fails after record cleanup", async () => {
  const profile = await signedIn(); await profile.saveProfile([item], []); fake.deleteFail = true;
  await expect(profile.deleteProfile()).rejects.toThrow("Auth deletion failed");
  expect(fake.records.has("users/account-a/items/item-1")).toBe(false);
  expect(fake.auth.currentUser).not.toBeNull();
  fake.deleteFail = false; await profile.deleteProfile(); expect(fake.deleted).toBe(true);
});

it("exports committed records from the current account without other accounts or deletion markers", async () => {
  const profile = await signedIn();
  fake.records.set("users/account-a/items/server-only", {id:"server-only",notes:"Private notes",imageUrl:"data:image/jpeg;base64,aA=="});
  fake.records.set("users/account-a/groups/g1", {id:"g1",name:"Favorites"});
  fake.records.set("users/account-b/items/private", {id:"private"});
  expect(await profile.exportProfile()).toEqual({items:[{id:"server-only",notes:"Private notes",imageUrl:"data:image/jpeg;base64,aA=="}],groups:[{id:"g1",name:"Favorites"}]});
});
it("rejects export if a server read fails rather than returning an incomplete backup", async () => {
  const profile = await signedIn(); fake.fail = true;
  await expect(profile.exportProfile()).rejects.toThrow("Read failed");
});
it("rejects export after sign-out", async () => {
  const profile = await signedIn(); await profile.signOutProfile();
  await expect(profile.exportProfile()).rejects.toThrow("Sign in");
});

it("restores missing records and preserves newer existing records", async () => {
  const profile = await signedIn();
  fake.records.set("users/account-a/items/item-1", {...item,notes:"Newer notes"});
  const result = await profile.restoreProfile({items:[item,{...item,id:"item-2"}],groups:[],exportedAt:"2026-10-04"}, "account-a");
  expect(result).toEqual({addedItems:1,addedGroups:0,skipped:1});
  expect(fake.records.get("users/account-a/items/item-1")).toMatchObject({notes:"Newer notes"});
});
it("can retry a partially completed restore without duplicate records", async () => {
  const profile = await signedIn(); const backup={items:Array.from({length:45},(_,i)=>({...item,id:`item-${i}`})),groups:[],exportedAt:"2026-10-04"};
  fake.failTransaction=2; await expect(profile.restoreProfile(backup,"account-a")).rejects.toThrow("Transaction failed");
  expect(fake.records.size).toBe(20);
  fake.failTransaction=0;
  expect(await profile.restoreProfile(backup,"account-a")).toEqual({addedItems:25,addedGroups:0,skipped:20});
  expect(fake.records.size).toBe(45);
});
it("rejects a restore if the reviewed account changed or is marked for deletion", async () => {
  const profile=await signedIn(); const backup={items:[item],groups:[],exportedAt:"2026-10-04"};
  await expect(profile.restoreProfile(backup,"account-b")).rejects.toThrow("account changed");
  fake.records.set("users/account-a/account/deletion",{deleting:true});
  await expect(profile.restoreProfile(backup,"account-a")).rejects.toThrow("deletion has started");
  expect(fake.records.has("users/account-a/items/item-1")).toBe(false);
});
