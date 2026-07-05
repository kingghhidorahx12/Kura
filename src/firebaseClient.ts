import rnFirestore from "@react-native-firebase/firestore";
import rnAuth from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
﻿import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  linkWithCredential,
  signOut,
  updateProfile,
  type User,
  onAuthStateChanged,
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import * as FirebaseAuthModule from "firebase/auth";
import { collection, doc, getCountFromServer, getDocs, getFirestore, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { firebaseConfig, hasFirebaseConfig } from "./firebaseConfig";

export type FirebaseAuthProviderName = "email" | "phone" | "google" | "facebook";

type FirebaseUserLike = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  providerData?: Array<{ providerId?: string | null }>;
};

export type FirebaseAuthProfile = {
  id: string;
  name: string;
  identifier: string;
  provider: FirebaseAuthProviderName;
};

export type FirebaseUserRecordInput = FirebaseAuthProfile & {
  createdAt: string;
};

export type FirebaseUsageSnapshotInput = {
  profileCount: number;
  recipeCount: number;
  medicationCount: number;
  doseEventCount: number;
  completedDoseCount: number;
  skippedDoseCount: number;
};

export type FirebaseAdminStats = {
  userCount: number;
  usageSnapshotCount: number;
  activeUserCount: number;
  profileCount: number;
  recipeCount: number;
  medicationCount: number;
  doseEventCount: number;
  completedDoseCount: number;
  skippedDoseCount: number;
  latestSyncAt: string | null;
};

function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig()) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

let firebaseAuthInstance: ReturnType<typeof getAuth> | null = null;

function getFirebaseAuth() {
  return hasFirebaseConfig() ? rnAuth() : null;
}

function getFirebaseDb() {
  return hasFirebaseConfig() ? rnFirestore() : null;
}

function providerFromFirebaseUser(user: FirebaseUserLike, fallbackProvider: FirebaseAuthProviderName): FirebaseAuthProviderName {
  const providerId = user.providerData?.[0]?.providerId ?? "";
  if (providerId.includes("google")) {
    return "google";
  }
  if (providerId.includes("facebook")) {
    return "facebook";
  }
  if (providerId.includes("phone")) {
    return "phone";
  }
  return fallbackProvider;
}

function profileFromFirebaseUser(user: FirebaseUserLike, fallbackProvider: FirebaseAuthProviderName): FirebaseAuthProfile {
  const provider = providerFromFirebaseUser(user, fallbackProvider);
  return {
    id: user.uid,
    name: user.displayName || "Usuario Kura",
    identifier: user.email || user.phoneNumber || `${provider}@firebase`,
    provider
  };
}

function numberFromSnapshotField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function firestoreDateToIso(value: unknown) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  return typeof value === "string" ? value : null;
}

export async function syncFirebaseUserRecord(user: FirebaseUserRecordInput) {
  const db = getFirebaseDb();
  if (!db) {
    return false;
  }

  await db.collection("users").doc(user.id).set(
    {
      uid: user.id,
      name: user.name,
      identifier: user.identifier,
      provider: user.provider,
      localCreatedAt: user.createdAt,
      lastLoginAt: rnFirestore.FieldValue.serverTimestamp(),
      updatedAt: rnFirestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return true;
}

export async function saveFirebaseUsageSnapshot(userId: string, snapshot: FirebaseUsageSnapshotInput) {
  const db = getFirebaseDb();
  if (!db) {
    return false;
  }

  await db.collection("usageSnapshots").doc(userId).set(
    {
      userId,
      ...snapshot,
      updatedAt: rnFirestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return true;
}

export async function saveFirebaseUserAppState(userId: string, appState: unknown) {
  const db = getFirebaseDb();
  if (!db) {
    return false;
  }

  await db.collection("usageSnapshots").doc(userId).set(
    {
      userId,
      appState,
      appStateUpdatedAt: rnFirestore.FieldValue.serverTimestamp(),
      updatedAt: rnFirestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return true;
}

export async function getFirebaseUserAppState(userId: string) {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  const snapshot = await db.collection("usageSnapshots").doc(userId).get();
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as { appState?: unknown } | undefined;
  return data?.appState ?? null;
}

export async function getFirebaseAdminStats(): Promise<FirebaseAdminStats | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  const [usersSnapshot, usageSnapshotDocs] = await Promise.all([
    db.collection("users").get(),
    db.collection("usageSnapshots").get()
  ]);

  const totals = {
    activeUserCount: 0,
    profileCount: 0,
    recipeCount: 0,
    medicationCount: 0,
    doseEventCount: 0,
    completedDoseCount: 0,
    skippedDoseCount: 0,
    latestSyncAt: null as string | null
  };

  usageSnapshotDocs.forEach((snapshot) => {
    const data = snapshot.data();
    const profileCount = numberFromSnapshotField(data.profileCount);
    const recipeCount = numberFromSnapshotField(data.recipeCount);
    const medicationCount = numberFromSnapshotField(data.medicationCount);
    const doseEventCount = numberFromSnapshotField(data.doseEventCount);
    const completedDoseCount = numberFromSnapshotField(data.completedDoseCount);
    const skippedDoseCount = numberFromSnapshotField(data.skippedDoseCount);

    totals.profileCount += profileCount;
    totals.recipeCount += recipeCount;
    totals.medicationCount += medicationCount;
    totals.doseEventCount += doseEventCount;
    totals.completedDoseCount += completedDoseCount;
    totals.skippedDoseCount += skippedDoseCount;

    if (profileCount > 0 || recipeCount > 0 || medicationCount > 0 || doseEventCount > 0) {
      totals.activeUserCount += 1;
    }

    const updatedAt = firestoreDateToIso(data.updatedAt);
    if (updatedAt && (!totals.latestSyncAt || new Date(updatedAt).getTime() > new Date(totals.latestSyncAt).getTime())) {
      totals.latestSyncAt = updatedAt;
    }
  });

  return {
    userCount: typeof usersSnapshot.size === "number" ? usersSnapshot.size : 0,
    usageSnapshotCount: typeof usageSnapshotDocs.size === "number" ? usageSnapshotDocs.size : 0,
    ...totals
  };
}

export async function waitForFirebaseAuthReady() {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  await new Promise<void>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      unsubscribe();
      resolve();
    });
  });

  return auth.currentUser ? profileFromFirebaseUser(auth.currentUser, "email") : null;
}

export async function signInWithFirebaseEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  const result = await auth.signInWithEmailAndPassword(email, password);
  return profileFromFirebaseUser(result.user, "email");
}

export async function createFirebaseEmailUser(email: string, password: string, name: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  const result = await auth.createUserWithEmailAndPassword(email, password);
  if (name.trim()) {
    await result.user.updateProfile({ displayName: name.trim() });
  }

  return profileFromFirebaseUser(result.user, "email");
}

export async function sendFirebasePasswordReset(email: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return false;
  }

  await auth.sendPasswordResetEmail(email);
  return true;
}

export async function signInWithFirebaseSocial(providerName: "google" | "facebook") {
  return null;
}

export async function signInWithFirebaseGoogleIdToken(idToken: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  const credential = rnAuth.GoogleAuthProvider.credential(idToken);
  const result = await auth.signInWithCredential(credential);
  return profileFromFirebaseUser(result.user, "google");
}

export async function signInWithFirebaseFacebookAccessToken(accessToken: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  const credential = rnAuth.FacebookAuthProvider.credential(accessToken);
  const result = await auth.signInWithCredential(credential);
  return profileFromFirebaseUser(result.user, "facebook");
}

export async function linkFirebaseGoogleIdToken(idToken: string) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    throw new Error("Primero inicia sesión para conectar Google.");
  }

  const credential = rnAuth.GoogleAuthProvider.credential(idToken);
  const result = await auth.currentUser.linkWithCredential(credential);
  return profileFromFirebaseUser(result.user, "google");
}

export async function linkFirebaseFacebookAccessToken(accessToken: string) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    throw new Error("Primero inicia sesión para conectar Facebook.");
  }

  const credential = rnAuth.FacebookAuthProvider.credential(accessToken);
  const result = await auth.currentUser.linkWithCredential(credential);
  return profileFromFirebaseUser(result.user, "facebook");
}

export async function signOutFromFirebase() {
  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }

  await auth.signOut();
}

export { hasFirebaseConfig };

