import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import { collection, doc, getCountFromServer, getDocs, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
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

  const [users, usageSnapshots, usageSnapshotDocs] = await Promise.all([
    getCountFromServer(collection(db, "users")),
    getCountFromServer(collection(db, "usageSnapshots")),
    getDocs(collection(db, "usageSnapshots"))
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
    userCount: users.data().count,
    usageSnapshotCount: usageSnapshots.data().count,
    ...totals
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

export async function signInWithFirebaseGoogleIdToken(idToken: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return profileFromFirebaseUser(result.user, "google");
}

export async function signInWithFirebaseFacebookAccessToken(accessToken: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return null;
  }

  const credential = FacebookAuthProvider.credential(accessToken);
  const result = await signInWithCredential(auth, credential);
  return profileFromFirebaseUser(result.user, "facebook");
}

export async function linkFirebaseGoogleIdToken(idToken: string) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    throw new Error("Primero inicia sesión con tu cuenta de correo para conectar Google.");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await linkWithCredential(auth.currentUser, credential);
  return profileFromFirebaseUser(result.user, "google");
}

export async function linkFirebaseFacebookAccessToken(accessToken: string) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    throw new Error("Primero inicia sesión con tu cuenta de correo para conectar Facebook.");
  }

  const credential = FacebookAuthProvider.credential(accessToken);
  const result = await linkWithCredential(auth.currentUser, credential);
  return profileFromFirebaseUser(result.user, "facebook");
}

export async function signOutFromFirebase() {
  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }

  await signOut(auth);
}

export { hasFirebaseConfig };

