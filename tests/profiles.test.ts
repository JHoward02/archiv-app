import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { CollectionItem } from "../src/types.ts";

const fake = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string } | null },
  authChanged: null as null | ((user: { uid: string } | null) => void),
  subscriptions: [] as { path: string; next: (snapshot: unknown) => void; error: (error: Error) => void; active: boolean }[],
  records: new Map<string, unknown>(),
  fail: false,
}));
vi.mock("firebase/app", () => ({ initializeApp: () => ({}), getApps: () => [] }));
vi.mock("firebase/auth", () => ({
  getAuth: () => fake.auth,
  GoogleAuthProvider: class {},
  onAuthStateChanged: (_auth: unknown, callback: typeof fake.authChanged) => { fake.authChanged = callback; },
  signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(),
  signOut: async () => { fake.auth.currentUser = null; fake.authChanged?.(null); },
}));
vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  collection: (_db: unknown, ...parts: string[]) => parts.join("/"),
  doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
  onSnapshot: (path: string, next: (snapshot: unknown) => void, error: (error: Error) => void) => {
    const sub = { path, next, error, active: true };
    fake.subscriptions.push(sub);
    next({ docs: [...fake.records].filter(([key]) => key.startsWith(path + "/")).map(([, value]) => ({ data: () => value })) });
    return () => { sub.active = false; };
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
  fake.auth.currentUser = null; fake.authChanged = null; fake.subscriptions = []; fake.records.clear(); fake.fail = false;
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
