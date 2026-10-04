import type { Backup } from "./restore.ts";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, deleteUser, reauthenticateWithPopup, type User } from "firebase/auth";
import { collection, doc, getFirestore, onSnapshot, writeBatch, runTransaction, getDocsFromServer, getDocFromServer, setDoc, query, limit, type Unsubscribe } from "firebase/firestore";
import type { CollectionGroup, CollectionItem } from "./types.ts";

export interface ProfileState {
  user: User | null;
  ready: boolean;
  loading: boolean;
  items: CollectionItem[];
  groups: CollectionGroup[];
  error: string | null;
  deletionPending: boolean;
}

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const profilesConfigured = Object.values(config).every(Boolean);
const app = profilesConfigured ? (getApps()[0] ?? initializeApp(config)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const listeners = new Set<(state: ProfileState) => void>();
export const profileState: ProfileState = { user: null, ready: !auth, loading: false, items: [], groups: [], error: null, deletionPending: false };
let unsubscribeItems: Unsubscribe | null = null;
let unsubscribeGroups: Unsubscribe | null = null;
let generation = 0;
let writeQueue = Promise.resolve();
let pendingSaves = 0;
export let deletingAccount = false;
export let restoringAccount = false;
let confirmedItems: CollectionItem[] = [];
let confirmedGroups: CollectionGroup[] = [];

function announce(): void { for (const listener of listeners) listener(profileState); }
export function subscribeProfile(listener: (state: ProfileState) => void): () => void {
  listeners.add(listener);
  listener(profileState);
  return () => listeners.delete(listener);
}

async function fitPhoto(item: CollectionItem): Promise<CollectionItem> {
  if (!item.imageUrl?.startsWith("data:image/") || item.imageUrl.length < 600_000) return item;
  const image = new Image();
  image.src = item.imageUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 700 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageUrl = canvas.toDataURL("image/jpeg", 0.65);
  if (imageUrl.length > 900_000) throw new Error(`The photo for ${item.title} is too large to sync. Please use a smaller photo.`);
  return { ...item, imageUrl };
}

if (auth && db) onAuthStateChanged(auth, async (user) => {
  const current = ++generation;
  unsubscribeItems?.(); unsubscribeGroups?.();
  unsubscribeItems = unsubscribeGroups = null;
  profileState.user = user;
  profileState.deletionPending = false;
  profileState.items = []; profileState.groups = [];
  confirmedItems = []; confirmedGroups = [];
  profileState.ready = !user; profileState.loading = Boolean(user); profileState.error = null;
  announce();
  if (!user) return;
  void getDocFromServer(doc(db, "users", user.uid, "account", "deletion")).then((record) => {
    if (current !== generation) return;
    profileState.deletionPending = record.exists();
    announce();
  }).catch(() => { /* Older rules may not yet expose the deletion marker. */ });
  try {
    let itemsReady = false, groupsReady = false;
    const loaded = () => {
      profileState.ready = itemsReady && groupsReady;
      profileState.loading = !profileState.ready;
      announce();
    };
    unsubscribeItems = onSnapshot(collection(db, "users", user.uid, "items"), (snapshot) => {
      if (current !== generation) return;
      confirmedItems = snapshot.docs.map((entry) => entry.data() as CollectionItem);
      if (!pendingSaves) profileState.items = confirmedItems;
      itemsReady = true; loaded();
    }, (error) => { if (current !== generation) return; profileState.error = error.message; profileState.ready = false; profileState.loading = false; announce(); });
    unsubscribeGroups = onSnapshot(collection(db, "users", user.uid, "groups"), (snapshot) => {
      if (current !== generation) return;
      confirmedGroups = snapshot.docs.map((entry) => entry.data() as CollectionGroup);
      if (!pendingSaves) profileState.groups = confirmedGroups;
      groupsReady = true; loaded();
    }, (error) => { if (current !== generation) return; profileState.error = error.message; profileState.ready = false; profileState.loading = false; announce(); });
  } catch (error) {
    if (current !== generation) return;
    profileState.error = error instanceof Error ? error.message : "Could not load your Archív.";
    profileState.loading = false; announce();
  }
});

export async function signInProfile(): Promise<void> {
  if (!auth) throw new Error("Cloud profiles are not configured yet.");
  const provider = new GoogleAuthProvider();
  try { await signInWithPopup(auth, provider); }
  catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}
export async function signOutProfile(): Promise<void> {
  await writeQueue;
  if (auth) await signOut(auth);
}

export function saveProfile(items: CollectionItem[], groups: CollectionGroup[]): Promise<void> {
  const user = profileState.user;
  if (restoringAccount) return Promise.reject(new Error("Wait for your restore to finish before saving."));
  if (deletingAccount || profileState.deletionPending) return Promise.reject(new Error("Account deletion has started. Finish deleting your account from Your profile."));
  if (!db || !user || !profileState.ready) return Promise.reject(new Error("Sign in and wait for your Archív to load before saving."));
  const uid = user.uid;
  const accountGeneration = generation;
  const priorItems = new Map(profileState.items.map((item) => [item.id, item]));
  const priorGroups = new Map(profileState.groups.map((group) => [group.id, group]));
  profileState.items = items; profileState.groups = groups;
  pendingSaves++;
  const task = async () => {
    if (auth?.currentUser?.uid !== uid) throw new Error("Your account changed before the save completed.");
    const changes: { type: "items" | "groups"; id: string; value?: CollectionItem | CollectionGroup }[] = [];
    for (const item of items) if (JSON.stringify(priorItems.get(item.id)) !== JSON.stringify(item)) changes.push({ type: "items", id: item.id, value: item });
    for (const group of groups) if (JSON.stringify(priorGroups.get(group.id)) !== JSON.stringify(group)) changes.push({ type: "groups", id: group.id, value: group });
    for (const id of priorItems.keys()) if (!items.some((item) => item.id === id)) changes.push({ type: "items", id });
    for (const id of priorGroups.keys()) if (!groups.some((group) => group.id === id)) changes.push({ type: "groups", id });
    for (let offset = 0; offset < changes.length; offset += 200) {
      const batch = writeBatch(db!);
      for (const change of changes.slice(offset, offset + 200)) {
        const ref = doc(db!, "users", uid, change.type, change.id);
        if (change.value) batch.set(ref, change.type === "items" ? await fitPhoto(change.value as CollectionItem) : change.value);
        else batch.delete(ref);
      }
      await batch.commit();
    }
  };
  const result = writeQueue.then(task).finally(() => {
    pendingSaves--;
    if (!pendingSaves && accountGeneration === generation) {
      profileState.items = confirmedItems;
      profileState.groups = confirmedGroups;
      announce();
    }
  });
  writeQueue = result.catch(() => undefined);
  return result;
}

/** Reauthenticate before any destructive write; delete auth only after all data is removed. */
export async function deleteProfile(): Promise<void> {
  const user = auth?.currentUser;
  if (!user || !db || !auth) throw new Error("Sign in before deleting your account.");
  if (deletingAccount) throw new Error("Account deletion is already running.");
  deletingAccount = true;
  try {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    await writeQueue;
    if (auth.currentUser?.uid !== user.uid) throw new Error("Your account changed. Please try again.");
    const marker = doc(db, "users", user.uid, "account", "deletion");
    const prior = await getDocFromServer(marker);
    if (!prior.exists()) await setDoc(marker, { deleting: true });
    profileState.deletionPending = true;
    // The marker is immutable under the rules and blocks writes from every device.
    for (const section of ["items", "groups"]) {
      while (true) {
        const snapshot = await getDocsFromServer(query(collection(db, "users", user.uid, section), limit(200)));
        if (snapshot.empty) break;
        const batch = writeBatch(db);
        for (const record of snapshot.docs) batch.delete(record.ref);
        await batch.commit();
      }
    }
    await deleteUser(user);
  } catch (error) {
    throw error;
  } finally {
    deletingAccount = false;
    if (!auth.currentUser) announce();
  }
}

/** Read confirmed cloud records after queued writes, never a browser cache or optimistic state. */
export async function exportProfile(): Promise<{ items: CollectionItem[]; groups: CollectionGroup[] }> {
  const user = auth?.currentUser;
  if (!user || !db || !profileState.ready || deletingAccount || profileState.deletionPending) throw new Error("Sign in and wait for your Archív to load before exporting.");
  const accountGeneration = generation;
  await writeQueue;
  if (auth?.currentUser?.uid !== user.uid || accountGeneration !== generation) throw new Error("Your account changed. Please try again.");
  const [items, groups] = await Promise.all([
    getDocsFromServer(collection(db, "users", user.uid, "items")),
    getDocsFromServer(collection(db, "users", user.uid, "groups")),
  ]);
  if (auth?.currentUser?.uid !== user.uid || accountGeneration !== generation || deletingAccount || profileState.deletionPending) throw new Error("Your account changed. Please try again.");
  return { items: items.docs.map((record) => record.data() as CollectionItem), groups: groups.docs.map((record) => record.data() as CollectionGroup) };
}

export async function restoreProfile(backup: Backup, expectedUid: string): Promise<{ addedItems: number; addedGroups: number; skipped: number }> {
  const user = auth?.currentUser;
  if (!user || !db || !profileState.ready || deletingAccount || restoringAccount || profileState.deletionPending) throw new Error("Sign in and wait for your Archív to load before restoring.");
  if (user.uid !== expectedUid) throw new Error("Your account changed. Review the backup again.");
  const current = generation;
  restoringAccount = true;
  const totals = { addedItems: 0, addedGroups: 0, skipped: 0 };
  try {
    await writeQueue;
    const records = [...backup.groups.map(value => ({section:"groups",value})), ...backup.items.map(value => ({section:"items",value}))];
    for (let offset = 0; offset < records.length;) {
      let bytes = 0;
      const chunk: typeof records = [];
      while (offset < records.length && chunk.length < 20) {
        const size = new TextEncoder().encode(JSON.stringify(records[offset].value)).length;
        if (chunk.length && bytes + size > 4 * 1024 * 1024) break;
        bytes += size; chunk.push(records[offset++]);
      }
      const result = await runTransaction(db, async transaction => {
        if (auth?.currentUser?.uid !== user.uid || generation !== current) throw new Error("Your account changed. Restore stopped.");
        const marker = await transaction.get(doc(db!, "users", user.uid, "account", "deletion"));
        if (marker.exists()) throw new Error("Account deletion has started. Restore stopped.");
        const refs = chunk.map(entry => doc(db!, "users", user.uid, entry.section, entry.value.id));
        const existing = await Promise.all(refs.map(ref => transaction.get(ref)));
        if (auth?.currentUser?.uid !== user.uid || generation !== current) throw new Error("Your account changed. Restore stopped.");
        const counts = { addedItems: 0, addedGroups: 0, skipped: 0 };
        chunk.forEach((entry,index) => {
          if (existing[index].exists()) { counts.skipped++; return; }
          transaction.set(refs[index], entry.value);
          if (entry.section === "items") counts.addedItems++; else counts.addedGroups++;
        });
        return counts;
      });
      totals.addedItems += result.addedItems; totals.addedGroups += result.addedGroups; totals.skipped += result.skipped;
    }
    return totals;
  } finally {
    restoringAccount = false;
    if (!auth?.currentUser) announce();
  }
}
