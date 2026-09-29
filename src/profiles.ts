import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { collection, doc, getFirestore, onSnapshot, writeBatch, type Unsubscribe } from "firebase/firestore";
import type { CollectionGroup, CollectionItem } from "./types.ts";

export interface ProfileState {
  user: User | null;
  ready: boolean;
  loading: boolean;
  items: CollectionItem[];
  groups: CollectionGroup[];
  error: string | null;
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
export const profileState: ProfileState = { user: null, ready: !auth, loading: false, items: [], groups: [], error: null };
let unsubscribeItems: Unsubscribe | null = null;
let unsubscribeGroups: Unsubscribe | null = null;
let generation = 0;
let writeQueue = Promise.resolve();

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
  if (imageUrl.length > 900_000) throw new Error(`The photo for ${item.title} is too large to sync. Your device copy remains safe.`);
  return { ...item, imageUrl };
}

if (auth && db) onAuthStateChanged(auth, async (user) => {
  const current = ++generation;
  unsubscribeItems?.(); unsubscribeGroups?.();
  unsubscribeItems = unsubscribeGroups = null;
  profileState.user = user;
  profileState.items = []; profileState.groups = [];
  profileState.ready = !user; profileState.loading = Boolean(user); profileState.error = null;
  announce();
  if (!user) return;
  try {
    let itemsReady = false, groupsReady = false;
    const loaded = () => {
      profileState.ready = itemsReady && groupsReady;
      profileState.loading = !profileState.ready;
      announce();
    };
    unsubscribeItems = onSnapshot(collection(db, "users", user.uid, "items"), (snapshot) => {
      if (current !== generation) return;
      profileState.items = snapshot.docs.map((entry) => entry.data() as CollectionItem);
      itemsReady = true; loaded();
    }, (error) => { profileState.error = error.message; profileState.loading = false; announce(); });
    unsubscribeGroups = onSnapshot(collection(db, "users", user.uid, "groups"), (snapshot) => {
      if (current !== generation) return;
      profileState.groups = snapshot.docs.map((entry) => entry.data() as CollectionGroup);
      groupsReady = true; loaded();
    }, (error) => { profileState.error = error.message; profileState.loading = false; announce(); });
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
export async function signOutProfile(): Promise<void> { if (auth) await signOut(auth); }

export function saveProfile(items: CollectionItem[], groups: CollectionGroup[]): Promise<void> {
  const user = profileState.user;
  if (!db || !user || !profileState.ready) return Promise.reject(new Error("Sign in and wait for your Archív to load before saving."));
  const uid = user.uid;
  const priorItems = new Map(profileState.items.map((item) => [item.id, item]));
  const priorGroups = new Map(profileState.groups.map((group) => [group.id, group]));
  profileState.items = items; profileState.groups = groups;
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
  const result = writeQueue.then(task);
  writeQueue = result.catch(() => undefined);
  return result;
}
