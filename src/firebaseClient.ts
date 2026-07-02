import { firebaseConfig, hasFirebaseConfig } from "./firebaseConfig";

export type FirebaseAuthProviderName = "email" | "google" | "facebook";

export type FirebaseAuthProfile = {
  id: string;
  name: string;
  identifier: string;
  provider: FirebaseAuthProviderName;
};

type FirebaseUserLike = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
};

async function getFirebaseModules() {
  if (!hasFirebaseConfig()) {
    return null;
  }

  const dynamicImport = new Function("moduleUrl", "return import(moduleUrl)") as (moduleUrl: string) => Promise<any>;
  const appModule = await dynamicImport("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js");
  const authModule = await dynamicImport("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js");
  return { appModule, authModule };
}

async function getFirebaseAuth() {
  const modules = await getFirebaseModules();
  if (!modules) {
    return null;
  }

  const { appModule, authModule } = modules;
  const app = appModule.getApps().length > 0 ? appModule.getApp() : appModule.initializeApp(firebaseConfig);
  return { auth: authModule.getAuth(app), authModule };
}

function profileFromFirebaseUser(user: FirebaseUserLike, provider: FirebaseAuthProviderName): FirebaseAuthProfile {
  return {
    id: user.uid,
    name: user.displayName || "Usuario MediMind",
    identifier: user.email || user.phoneNumber || `${provider}@firebase`,
    provider
  };
}

export async function signInWithFirebaseEmail(email: string, password: string) {
  const firebaseAuth = await getFirebaseAuth();
  if (!firebaseAuth) {
    return null;
  }

  const result = await firebaseAuth.authModule.signInWithEmailAndPassword(firebaseAuth.auth, email, password);
  return profileFromFirebaseUser(result.user, "email");
}

export async function createFirebaseEmailUser(email: string, password: string, name: string) {
  const firebaseAuth = await getFirebaseAuth();
  if (!firebaseAuth) {
    return null;
  }

  const result = await firebaseAuth.authModule.createUserWithEmailAndPassword(firebaseAuth.auth, email, password);
  if (name.trim()) {
    await firebaseAuth.authModule.updateProfile(result.user, { displayName: name.trim() });
  }
  return profileFromFirebaseUser(result.user, "email");
}

export async function sendFirebasePasswordReset(email: string) {
  const firebaseAuth = await getFirebaseAuth();
  if (!firebaseAuth) {
    return false;
  }

  await firebaseAuth.authModule.sendPasswordResetEmail(firebaseAuth.auth, email);
  return true;
}

export async function signInWithFirebaseSocial(providerName: "google" | "facebook") {
  const firebaseAuth = await getFirebaseAuth();
  if (!firebaseAuth) {
    return null;
  }

  const provider = providerName === "google" ? new firebaseAuth.authModule.GoogleAuthProvider() : new firebaseAuth.authModule.FacebookAuthProvider();
  const result = await firebaseAuth.authModule.signInWithPopup(firebaseAuth.auth, provider);
  return profileFromFirebaseUser(result.user, providerName);
}

export async function signOutFromFirebase() {
  const firebaseAuth = await getFirebaseAuth();
  if (!firebaseAuth) {
    return;
  }

  await firebaseAuth.authModule.signOut(firebaseAuth.auth);
}

export { hasFirebaseConfig };
