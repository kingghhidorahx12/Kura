import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import { collection, doc, getCountFromServer, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseConfig, hasFirebaseConfig } from "./firebaseConfig";

export type FirebaseAuthProviderName = "email" | "phone" | "google" | "facebook";

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
};

function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig()) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

function getFirebaseDb() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

function providerFromFirebaseUser(user: User, fallbackProvider: FirebaseAuthProviderName): FirebaseAuthProviderName {
  const providerId = user.providerData[0]?.providerId ?? "";
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

function profileFromFirebaseUser(user: User, fallbackProvider: FirebaseAuthProviderName): FirebaseAuthProfile {
  const provider = providerFromFirebaseUser(user, fallbackProvider);
  return {
    id: user.uid,
    name: user.displayName || "Usuario MediMind",
    identifier: user.email || user.phoneNumber || `${provider}@firebase`,
    provider
  };
}

export async function syncFirebaseUserRecord(user: FirebaseUserRecordInput) {
  const db = getFirebaseDb();
  if (!db) {
    return false;
  }

  await setDoc(
    doc(db, "users", user.id),
    {
      uid: user.id,
      name: user.name,
      identifier: user.identifier,
      provider: user.provider,
      localCreatedAt: user.createdAt,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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

  await setDoc(
    doc(db, "usageSnapshots", userId),
    {
      userId,
      ...snapshot,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  return true;
}

export async function getFirebaseAdminStats(): Promise<FirebaseAdminStats | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  const [users, usageSnapshots] = await Promise.all([
    getCountFromServer(collection(db, "users")),
    getCountFromServer(collection(db, "usageSnapshots"))
  ]);

  return {
    userCount: users.data().count,
    usageSnapshotCount: usageSnapshots.data().count
  };
}

export async function signInWithFirebaseEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  const result = await signInWithEmailAndPassword(auth, email, password);
  return profileFromFirebaseUser(result.user, "email");
}

export async function createFirebaseEmailUser(email: string, password: string, name: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name.trim()) {
    await updateProfile(result.user, { displayName: name.trim() });
  }
  return profileFromFirebaseUser(result.user, "email");
}

export async function sendFirebasePasswordReset(email: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return false;
  }

  await sendPasswordResetEmail(auth, email);
  return true;
}

export async function signInWithFirebaseSocial(providerName: "google" | "facebook") {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  const provider = providerName === "google" ? new GoogleAuthProvider() : new FacebookAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return profileFromFirebaseUser(result.user, providerName);
}

export async function signOutFromFirebase() {
  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }

  await signOut(auth);
}

export { hasFirebaseConfig };
