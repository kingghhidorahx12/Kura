import { Platform } from "react-native";
import type { FirebaseAuthProfile } from "./firebaseClient";

export type NativePhoneConfirmation = {
  confirm: (code: string) => Promise<{
    user?: {
      uid?: string;
      displayName?: string | null;
      phoneNumber?: string | null;
    } | null;
  } | null>;
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

export async function sendNativePhoneVerification(phoneNumber: string): Promise<NativePhoneConfirmation | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const authModule = await import("@react-native-firebase/auth");
  const auth = authModule.getAuth();
  return authModule.signInWithPhoneNumber(auth, phoneNumber);
}

export async function confirmNativePhoneVerification(confirmation: NativePhoneConfirmation, code: string, fallbackName?: string): Promise<FirebaseAuthProfile> {
  const result = await confirmation.confirm(code);
  const user = result?.user;
  const uid = user?.uid;
  const phoneNumber = user?.phoneNumber ?? "";

  if (!uid) {
    throw new Error("Firebase no devolvió usuario al confirmar el SMS.");
  }

  return {
    id: uid,
    name: fallbackName?.trim() || user?.displayName || phoneNumber || "Usuario Kura",
    identifier: phoneNumber,
    provider: "phone"
  };
}

