import { Platform } from "react-native";
import type { FirebaseAuthProfile } from "./firebaseClient";

export type NativePhoneConfirmation = {
  verificationId?: string | null;
  confirm: (code: string) => Promise<{
    user?: {
      uid?: string;
      displayName?: string | null;
      email?: string | null;
      phoneNumber?: string | null;
    } | null;
  } | null>;
};

type NativeAuthModuleLike = {
  getAuth: () => {
    currentUser?: {
      uid?: string;
      displayName?: string | null;
      email?: string | null;
      phoneNumber?: string | null;
      linkWithCredential?: (credential: unknown) => Promise<{
        user?: {
          uid?: string;
          displayName?: string | null;
          email?: string | null;
          phoneNumber?: string | null;
        } | null;
      }>;
    } | null;
  };
  signInWithPhoneNumber: (auth: unknown, phoneNumber: string) => Promise<NativePhoneConfirmation>;
  verifyPhoneNumber: (auth: unknown, phoneNumber: string) => Promise<{ verificationId: string }>;
  PhoneAuthProvider: {
    credential: (verificationId: string, code: string) => unknown;
  };
};

export function formatPhoneForFirebase(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.replace(/[^\d]/g, "")}`;
  }

  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) {
    return `+52${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("52")) {
    return `+${digits}`;
  }
  return digits ? `+${digits}` : "";
}

async function getNativeAuthModule() {
  return (await import("@react-native-firebase/auth")) as unknown as NativeAuthModuleLike;
}

function profileFromNativeUser(
  user: {
    uid?: string;
    displayName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  } | null | undefined,
  fallbackName?: string
): FirebaseAuthProfile {
  const uid = user?.uid;
  const phoneNumber = user?.phoneNumber ?? "";

  if (!uid) {
    throw new Error("Firebase no devolvió usuario al confirmar el SMS.");
  }

  return {
    id: uid,
    name: fallbackName?.trim() || user?.displayName || phoneNumber || "Usuario Kura",
    identifier: phoneNumber || user?.email || "telefono@firebase",
    provider: "phone"
  };
}

export async function sendNativePhoneVerification(phoneNumber: string): Promise<NativePhoneConfirmation | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const authModule = await getNativeAuthModule();
  const auth = authModule.getAuth();
  return authModule.signInWithPhoneNumber(auth, phoneNumber);
}

export async function confirmNativePhoneVerification(
  confirmation: NativePhoneConfirmation,
  code: string,
  fallbackName?: string
): Promise<FirebaseAuthProfile> {
  const result = await confirmation.confirm(code);
  return profileFromNativeUser(result?.user, fallbackName);
}

export async function sendNativePhoneLinkVerification(phoneNumber: string): Promise<NativePhoneConfirmation | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const authModule = await getNativeAuthModule();
  const auth = authModule.getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Primero inicia sesión para conectar un teléfono.");
  }

  const verification = await authModule.verifyPhoneNumber(auth, phoneNumber);

  return {
    verificationId: verification.verificationId,
    confirm: async (code: string) => {
      const credential = authModule.PhoneAuthProvider.credential(verification.verificationId, code);

      if (!auth.currentUser?.linkWithCredential) {
        throw new Error("No pude vincular el teléfono con la sesión actual de Firebase.");
      }

      return auth.currentUser.linkWithCredential(credential);
    }
  };
}

export async function confirmNativePhoneLinkVerification(
  confirmation: NativePhoneConfirmation,
  code: string,
  fallbackName?: string
): Promise<FirebaseAuthProfile> {
  const result = await confirmation.confirm(code);
  return profileFromNativeUser(result?.user, fallbackName);
}
