import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import {
  Accessibility,
  AlarmClockCheck,
  Baby,
  BadgeInfo,
  BellRing,
  CalendarDays,
  CalendarClock,
  Camera,
  Check,
  Clock3,
  Droplets,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  GlassWater,
  Home,
  HeartHandshake,
  Info,
  Mail,
  MessageCircle,
  Minus,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  PersonStanding,
  Pill,
  PillBottle,
  Plus,
  RotateCcw,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Trash2,
  UserRound,
  X
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar as NativeStatusBar,
  Text,
  TextInput,
  View
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { buildDoseEvents, formatFrequency, formatShortDate, formatTime, getStockLevel, getStockPercent, suggestTimes, todayDateKey } from "./src/schedule";
import { theme } from "./src/theme";
import { DoseEvent, DoseStatus, Medication, NewMedicationDraft, Profile, ProfileIcon, Recipe, TabKey } from "./src/types";
import { KuraLogo } from "./src/KuraLogo";
import { confirmNativePhoneVerification, formatPhoneForFirebase, sendNativePhoneVerification, type NativePhoneConfirmation } from "./src/nativePhoneAuth";
import {
  createFirebaseEmailUser,
  getFirebaseAdminStats,
  hasFirebaseConfig,
  saveFirebaseUsageSnapshot,
  sendFirebasePasswordReset,
  signInWithFirebaseEmail,
  signInWithFirebaseFacebookAccessToken,
  signInWithFirebaseGoogleIdToken,
  signInWithFirebaseSocial,
  signOutFromFirebase,
  syncFirebaseUserRecord,
  type FirebaseAdminStats,
  type FirebaseAuthProfile
} from "./src/firebaseClient";
import { requestFacebookAccessToken, requestGoogleIdToken } from "./src/nativeSocialAuth";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

type IconType = React.ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

type StorageShape = {
  profiles: Profile[];
  recipes: Recipe[];
  medications: Medication[];
  doseEvents: DoseEvent[];
  selectedProfileId: string;
  tutorialSeen?: boolean;
};

type RecipeStep = "photo" | "medications" | "alarms";
type WizardMedicationDraft = NewMedicationDraft & { confirmed: boolean };
type InventoryMode = "pick" | "units" | "container" | "adjust";
type HistoryDateFilter = "today" | "custom" | "all";
type AgeUnit = "years" | "months";
type AuthMode = "login" | "signup" | "recover";
type AuthMethod = "email" | "phone";
type DoctorPrefix = string;
type AuthUser = {
  id: string;
  name: string;
  identifier: string;
  provider: "email" | "phone" | "google" | "facebook";
  createdAt: string;
};
type LocalUserRecord = AuthUser & {
  secret?: string;
};
type DeviceAuthAccount = AuthUser & {
  lastUsedAt: string;
};
type PhoneCodeState = {
  identifier: string;
  code: string;
  expiresAt: number;
};
type ConfirmationState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};
type ChoiceAction = {
  label: string;
  tone?: "primary" | "secondary" | "danger";
  onPress: () => void;
};
type ChoiceState = {
  title: string;
  message: string;
  actions: ChoiceAction[];
  onClose?: () => void;
};
type TextExtractorModule = {
  isSupported: boolean;
  extractTextFromImage: (uri: string) => Promise<string[]>;
};
type NoticeState = {
  title: string;
  message: string;
  tone?: "info" | "success" | "warning" | "danger";
};
type MedicationDraftErrorState = {
  name: boolean;
  unitLabel: boolean;
  dose: boolean;
  frequencyMinutes: boolean;
  durationDays: boolean;
  containerCount: boolean;
  unitsPerContainer: boolean;
};
type TutorialStep = {
  tab: TabKey;
  target: string;
  title: string;
  message: string;
  final?: boolean;
};

const dropdownClosers = new Set<() => void>();

function registerDropdownCloser(close: () => void) {
  dropdownClosers.add(close);
  return () => {
    dropdownClosers.delete(close);
  };
}

function closeOpenDropdowns() {
  dropdownClosers.forEach((close) => close());
}

const APP_NAME = "Kura";
const MEDIMIND_LOGO = require("./assets/medimind-logo-generated.png");
const STORAGE_KEY_PREFIX = "medimind-state-v1";
const AUTH_STORAGE_KEY = "medimind-auth-v1";
const DEVICE_ACCOUNTS_STORAGE_KEY = "medimind-device-accounts-v1";
const USERS_STORAGE_KEY = "medimind-users-v1";
const APP_VERSION = "1.0.1";
const DEVELOPER_GITHUB = "KingGhidorahX12";
const PAYPAL_DONATION_URL = "https://paypal.me/KingGhidorahX12";
const MERCADO_PAGO_DONATION_URL = "";
const DONATION_URL = MERCADO_PAGO_DONATION_URL || PAYPAL_DONATION_URL;
const CONTACT_EMAIL = "kingghidorahx12@gmail.com";
const CONTACT_WHATSAPP = "527121709077";
const ADMIN_IDENTIFIERS = [CONTACT_EMAIL, "KingGhidorahX12", "kingghidorahx12@gmail.com"];
const MEDICATION_CHANNEL_ID = "medimind-medication-reminders";
const MEDICATION_CATEGORY_ID = "medimind_medication_actions";
const NOTIFICATION_ACTION_TAKEN = "MEDIMIND_TAKEN";
const NOTIFICATION_ACTION_SNOOZE = "MEDIMIND_SNOOZE";
const NOTIFICATION_ACTION_SKIP = "MEDIMIND_SKIP";

const colorOptions = ["#4f8b67", "#e78382", "#8eb7c8", "#b7a9cf", "#f0a868"];
const unitOptions = ["Tabletas", "Capsulas", "Mililitros", "Gotas", "Sobres", "Dosis"];
const doctorPrefixOptions: DoctorPrefix[] = [
  "Dr.",
  "Dra.",
  "Med.",
  "Psic.",
  "Lic.",
  "Licda.",
  "Enf.",
  "Nut.",
  "Odont.",
  "Ped.",
  "Gin.",
  "Q.F.B.",
  "Mtro.",
  "Mtra.",
  "Otro"
];
const STATUS_BAR_OFFSET = Platform.OS === "android" ? NativeStatusBar.currentHeight ?? 0 : 0;
const SCREEN_TOP_GAP = STATUS_BAR_OFFSET + 14;
const frequencyPresets = [
  { label: "30 min", minutes: 30 },
  { label: "1 h", minutes: 60 },
  { label: "6 h", minutes: 360 },
  { label: "8 h", minutes: 480 },
  { label: "12 h", minutes: 720 },
  { label: "24 h", minutes: 1440 }
];
const tutorialSteps: TutorialStep[] = [
  {
    tab: "profile",
    target: "Botón Agregar perfil",
    title: "Primero crea un perfil",
    message: "Crea el perfil de la persona que usará Kura. Así cada receta, inventario e historial queda separado."
  },
  {
    tab: "recipes",
    target: "Botón Agregar receta",
    title: "Registra una receta",
    message: "Agrega el tratamiento, sus medicamentos y los horarios. La foto puede quedarse solo como referencia."
  },
  {
    tab: "today",
    target: "Siguiente dosis",
    title: "Revisa lo que toca ahora",
    message: "Aquí aparece la dosis más cercana. Desde ahí puedes marcarla como completada, posponerla u omitirla."
  },
  {
    tab: "today",
    target: "Siguientes dosis",
    title: "Mira lo que viene",
    message: "Esta sección muestra la dosis actual y las próximas tomas para que no pierdas el ritmo del tratamiento."
  },
  {
    tab: "inventory",
    target: "Agregar, Ajustar y Borrar",
    title: "Cuida el inventario",
    message: "Agrega frascos o unidades, ajusta lo que queda y borra inventario cuando necesites reiniciarlo."
  },
  {
    tab: "history",
    target: "Filtros e historial",
    title: "Consulta el registro",
    message: "Filtra por tratamiento y fecha para revisar lo completado, pendiente, pospuesto u omitido."
  },
  {
    tab: "profile",
    target: "Botón Donar",
    title: "Gracias por usar Kura",
    message: "Si la app te ayuda, puedes apoyar el proyecto con un café desde el botón Donar cuando está configurado.",
    final: true
  }
];

const tabs: Array<{ key: TabKey; label: string; icon: IconType }> = [
  { key: "today", label: "Hoy", icon: Home },
  { key: "recipes", label: "Recetas", icon: FileText },
  { key: "inventory", label: "Inventario", icon: PackageCheck },
  { key: "history", label: "Historial", icon: Clock3 }
];

const profileIconOptions: Array<{ value: ProfileIcon; label: string; icon: IconType; gender: string }> = [
  { value: "baby", label: "Bebé", icon: Baby, gender: "Bebé" },
  { value: "child", label: "Niño", icon: PersonStanding, gender: "Niño" },
  { value: "teen", label: "Adolescente", icon: UserRound, gender: "Adolescente" },
  { value: "adult", label: "Adulto", icon: UserRound, gender: "Adulto" },
  { value: "older", label: "Adulto mayor", icon: Accessibility, gender: "Adulto mayor" }
];

const statusLabels: Record<DoseStatus, string> = {
  pending: "Pendiente",
  taken: "Completado",
  snoozed: "Pospuesto",
  skipped: "Omitido"
};

const statusColors: Record<DoseStatus, string> = {
  pending: theme.colors.apricot,
  taken: theme.colors.primary,
  snoozed: theme.colors.blue,
  skipped: theme.colors.rose
};

const emptyDraft: NewMedicationDraft = {
  name: "",
  dose: "",
  instructions: "",
  frequencyMinutes: 0,
  durationDays: 0,
  firstTime: "",
  unitsPerContainer: 0,
  containerCount: 0,
  unitsPerDose: 0,
  unitLabel: ""
};

const emptyWizardDraft = (): WizardMedicationDraft => ({ ...emptyDraft, confirmed: false });

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function storageKeyForUser(user: AuthUser) {
  return `${STORAGE_KEY_PREFIX}-${user.id}`;
}

function dateKeyFromIso(iso: string) {
  return todayDateKey(new Date(iso));
}

function doseDateLabel(iso: string) {
  const dateKey = dateKeyFromIso(iso);
  const today = todayDateKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateKey === todayDateKey(tomorrow)) {
    return "Mañana";
  }

  return dateKey === today ? "" : formatShortDate(iso);
}

function currentTimeKey(date = new Date()) {
  const next = new Date(date.getTime() + 60 * 1000);
  return `${next.getHours().toString().padStart(2, "0")}:${next.getMinutes().toString().padStart(2, "0")}`;
}

function minuteKeyFromIso(iso: string) {
  const date = new Date(iso);
  return `${todayDateKey(date)}-${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function getTotalUnits(draft: NewMedicationDraft) {
  return Math.max(0, Number(draft.unitsPerContainer || 0) * Number(draft.containerCount || 0));
}

function getDraftTimes(draft: NewMedicationDraft) {
  return suggestTimes(draft.firstTime, draft.frequencyMinutes);
}

function sanitizeNumericInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${whole}.${rest.join("")}` : whole;
}

function numberFromText(value: string) {
  const match = value.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function unitLabelText(unitLabel: string) {
  return unitLabel.trim() || "Unidades";
}

function unitLabelLower(unitLabel: string) {
  return unitLabelText(unitLabel).toLowerCase();
}

function totalUnitsLabel(unitLabel: string) {
  if (unitLabel.toLowerCase().includes("gota")) {
    return "Total de mililitros por frasco/caja";
  }
  return unitLabel ? `Total de ${unitLabelLower(unitLabel)} por frasco/caja` : "Total por frasco/caja";
}

function inventoryUnitLabel(unitLabel: string) {
  return unitLabel.toLowerCase().includes("gota") ? "Mililitros" : unitLabelText(unitLabel);
}

function numberInputValue(value: number) {
  return value > 0 ? `${value}` : "";
}

function sentenceCase(value: string) {
  const clean = value.trim();
  return clean ? `${clean.charAt(0).toUpperCase()}${clean.slice(1)}` : "";
}

function doseUnitLabel(unitLabel: string, amount: number) {
  const unit = unitLabelLower(unitLabel);
  if (amount !== 1) {
    return unit;
  }
  if (unit === "dosis") {
    return unit;
  }
  if (unit.endsWith("es")) {
    return unit.slice(0, -2);
  }
  if (unit.endsWith("s")) {
    return unit.slice(0, -1);
  }
  return unit;
}

function formatMedicationDose(draft: NewMedicationDraft) {
  const doseAmount = Number(draft.dose) || Number(draft.unitsPerDose) || 1;
  return `${doseAmount} ${doseUnitLabel(draft.unitLabel, doseAmount)}`;
}

function buildDoctorLabel(prefix: DoctorPrefix, name: string) {
  const cleanName = name.trim();
  return cleanName ? `${prefix} ${cleanName}` : "";
}

function parseDoctorLabel(value = ""): { prefix: DoctorPrefix; name: string } {
  const clean = value.trim();
  const prefix = doctorPrefixOptions.find((option) => clean.toLowerCase().startsWith(option.toLowerCase())) ?? "Dr.";
  return {
    prefix,
    name: clean.replace(new RegExp(`^${prefix.replace(".", "\\.")}\\s*`, "i"), "").trim()
  };
}

function getUnitsPerDose(draft: NewMedicationDraft) {
  const dose = Number(draft.dose) || Number(draft.unitsPerDose) || 1;
  return draft.unitLabel.toLowerCase().includes("gota") ? Math.max(0.01, dose / 20) : dose;
}

function normalizeTimeValue(value: string) {
  const [rawHour = "", rawMinute = ""] = value.split(":");
  const hour = Math.max(0, Math.min(23, Number(rawHour) || 0));
  const minute = Math.max(0, Math.min(59, Number(rawMinute) || 0));
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function parseProfileAge(value: string): { amount: number; unit: AgeUnit } {
  return {
    amount: numberFromText(value),
    unit: value.toLowerCase().includes("mes") ? "months" : "years"
  };
}

function formatProfileAge(amount: number, unit: AgeUnit) {
  if (amount <= 0) {
    return "";
  }
  if (unit === "months") {
    return `${amount} ${amount === 1 ? "mes" : "meses"}`;
  }
  return `${amount} ${amount === 1 ? "año" : "años"}`;
}

function profileAgeText(value: string) {
  const clean = value.trim();
  if (!clean) {
    return "";
  }
  return /^\d+$/.test(clean) ? `${clean} años` : clean;
}

function normalizedText(value: string) {
  return value.trim().toLowerCase();
}

function isAdminAuthUser(user?: AuthUser | null) {
  if (!user) {
    return false;
  }

  const identifier = normalizedText(user.identifier);
  const name = normalizedText(user.name);
  return ADMIN_IDENTIFIERS.some((item) => identifier.includes(normalizedText(item)) || name.includes(normalizedText(item)));
}

function usageSnapshotFromState(profiles: Profile[], recipes: Recipe[], medications: Medication[], doseEvents: DoseEvent[]) {
  return {
    profileCount: profiles.length,
    recipeCount: recipes.length,
    medicationCount: medications.length,
    doseEventCount: doseEvents.length,
    completedDoseCount: doseEvents.filter((event) => event.status === "taken").length,
    skippedDoseCount: doseEvents.filter((event) => event.status === "skipped").length
  };
}

function getSnoozedMinutes(event: DoseEvent, now = new Date()) {
  if (!(event.snoozeCount ?? 0) && event.status !== "snoozed") {
    return 0;
  }

  const startedAt = event.snoozedAt ?? event.originalScheduledAt ?? event.scheduledAt;
  const finishedAt = event.takenAt ?? event.skippedAt ?? (event.status === "snoozed" ? now.toISOString() : event.scheduledAt);
  return Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000));
}

function formatMinutes(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

function buildRhythmText({
  todayMinutes,
  totalMinutes,
  todaySkipped,
  totalSkipped,
  snoozedDays
}: {
  todayMinutes: number;
  totalMinutes: number;
  todaySkipped: number;
  totalSkipped: number;
  snoozedDays: number;
}) {
  const todaySkippedText = todaySkipped > 0 ? ` y ${todaySkipped} omitidos` : "";
  if (snoozedDays <= 1) {
    return `Llevas ${formatMinutes(todayMinutes)} pospuestos hoy${todaySkippedText}.`;
  }

  const totalSkippedText = totalSkipped > 0 ? ` y ${totalSkipped} omitidos` : "";
  return `Llevas ${formatMinutes(todayMinutes)} pospuestos hoy${todaySkippedText}; en todo el tratamiento van ${formatMinutes(totalMinutes)} pospuestos${totalSkippedText}.`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(date);
}

function buildMonthCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: firstWeekday }, () => null);

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day));
  }

  return cells;
}

function previewTimes(draft: NewMedicationDraft) {
  const times = getDraftTimes(draft);
  if (times.length <= 6) {
    return times.join(", ");
  }
  return `${times.slice(0, 6).join(", ")} y ${times.length - 6} más`;
}

function getUnitIcon(unitLabel: string): IconType {
  const unit = unitLabel.toLowerCase();
  if (unit.includes("mili") || unit.includes("ml")) {
    return Droplets;
  }
  if (unit.includes("gota")) {
    return GlassWater;
  }
  if (unit.includes("frasco")) {
    return PillBottle;
  }
  if (unit.includes("sobre")) {
    return PackagePlus;
  }
  return Pill;
}

function getProfileIcon(profile: Profile): IconType {
  return profileIconOptions.find((option) => option.value === profile.icon)?.icon ?? UserRound;
}

async function ensureNotificationPermission() {
  if (Platform.OS === "web") {
    return false;
  }

  await prepareNotificationChannel();
  await prepareNotificationActions();

  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

async function prepareNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_ID, {
    name: "Alarmas de medicamentos",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 650, 250, 650, 250, 650],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
  });
}

async function prepareNotificationActions() {
  if (Platform.OS === "web") {
    return;
  }

  try {
    await Notifications.setNotificationCategoryAsync(MEDICATION_CATEGORY_ID, [
      {
        identifier: NOTIFICATION_ACTION_TAKEN,
        buttonTitle: "Completado",
        options: { opensAppToForeground: true }
      },
      {
        identifier: NOTIFICATION_ACTION_SNOOZE,
        buttonTitle: "Posponer 10 min",
        options: { opensAppToForeground: true }
      },
      {
        identifier: NOTIFICATION_ACTION_SKIP,
        buttonTitle: "Omitir",
        options: { opensAppToForeground: true, isDestructive: true }
      }
    ]);
  } catch {
    // Algunas vistas web o builds de prueba no exponen categorías de notificación.
  }
}

async function scheduleDoseNotification(medication: Medication, date: Date, eventId?: string) {
  if (date.getTime() <= Date.now()) {
    return undefined;
  }

  const allowed = await ensureNotificationPermission();
  if (!allowed) {
    return undefined;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `Es hora de tomar la dosis de ${medication.name}`,
        body: `${medication.dose}. ${medication.instructions || "Confirma cuando la tomes o posponla 10 minutos."}`,
        sound: true,
        categoryIdentifier: MEDICATION_CATEGORY_ID,
        color: theme.colors.primary,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 650, 250, 650, 250, 650],
        interruptionLevel: "timeSensitive",
        data: {
          eventId,
          medicationId: medication.id,
          recipeId: medication.recipeId
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: MEDICATION_CHANNEL_ID
      }
    });
  } catch {
    return undefined;
  }
}

async function sendActionFeedbackNotification(title: string, body: string) {
  if (Platform.OS === "web") {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250],
        interruptionLevel: "active"
      },
      trigger: null
    });
  } catch {
    // Si el sistema no permite avisos inmediatos, la acción ya quedó registrada en la app.
  }
}

async function cancelDoseNotification(notificationId?: string) {
  if (!notificationId || Platform.OS === "web") {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // La alarma pudo haber sonado o haber sido borrada por el sistema.
  }
}

async function cancelNotificationsForEvents(events: DoseEvent[]) {
  await Promise.all(events.map((event) => cancelDoseNotification(event.notificationId)));
}

async function attachNotificationsToEvents(events: DoseEvent[], sourceMedications: Medication[]) {
  const scheduledPairs = await Promise.all(
    events.map(async (event) => {
      if (event.status !== "pending" && event.status !== "snoozed") {
        return [event.id, undefined] as const;
      }

      const medication = sourceMedications.find((item) => item.id === event.medicationId);
      const notificationId = medication ? await scheduleDoseNotification(medication, new Date(event.scheduledAt), event.id) : undefined;
      return [event.id, notificationId] as const;
    })
  );
  const notificationByEventId = new Map(scheduledPairs.filter(([, notificationId]) => Boolean(notificationId)) as Array<readonly [string, string]>);

  return events.map((event) => {
    const notificationId = notificationByEventId.get(event.id);
    return notificationId ? { ...event, notificationId } : event;
  });
}

function inferUnitFromText(text: string) {
  const normalized = text.toLowerCase();
  if (/(capsula|capsulas|c[aá]psula|c[aá]psulas)/i.test(normalized)) {
    return "Capsulas";
  }
  if (/(tableta|tabletas|comprimido|comprimidos|pastilla|pastillas)/i.test(normalized)) {
    return "Tabletas";
  }
  if (/(mililitro|mililitros|\bml\b|jarabe|suspensi[oó]n)/i.test(normalized)) {
    return "Mililitros";
  }
  if (/(gota|gotas)/i.test(normalized)) {
    return "Gotas";
  }
  if (/(sobre|sobres)/i.test(normalized)) {
    return "Sobres";
  }
  if (/(dosis)/i.test(normalized)) {
    return "Dosis";
  }
  return "";
}

function parseFrequencyMinutes(text: string) {
  const directMatch = text.match(/(?:cada|c\/)\s*(\d+(?:[.,]\d+)?)\s*(min|minutos?|h|hr|hrs|hora|horas)?/i);
  if (!directMatch) {
    return 0;
  }

  const amount = Number(directMatch[1].replace(",", "."));
  const unit = directMatch[2]?.toLowerCase() ?? "h";
  return unit.startsWith("min") ? Math.round(amount) : Math.round(amount * 60);
}

function parseDurationDays(text: string) {
  const durationMatch = text.match(/(?:por|durante)\s*(\d+(?:[.,]\d+)?)\s*(d[ií]as?)/i);
  return durationMatch ? Math.round(Number(durationMatch[1].replace(",", "."))) : 0;
}

function parseDoseFromText(text: string, unitLabel: string) {
  const unitPatterns: Record<string, string> = {
    capsulas: "c[aá]psulas?|capsulas?",
    tabletas: "tabletas?|comprimidos?|pastillas?",
    mililitros: "mililitros?|ml",
    gotas: "gotas?",
    sobres: "sobres?",
    dosis: "dosis"
  };
  const unitPattern = unitLabel ? unitPatterns[unitLabel.toLowerCase()] ?? unitLabel.toLowerCase() : Object.values(unitPatterns).join("|");
  const takeMatch = text.match(/(?:tomar|toma|dosis)\s*(\d+(?:[.,]\d+)?)/i);
  const unitMatch = text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:${unitPattern})`, "i"));
  const value = takeMatch?.[1] ?? unitMatch?.[1] ?? "";
  return value.replace(",", ".");
}

function parseInstructionsFromText(text: string) {
  const instructionMatch = text.match(/(despu[eé]s de [^.,;\n]+|antes de [^.,;\n]+|con alimentos?[^.,;\n]*|en ayunas[^.,;\n]*|si hay [^.,;\n]+)/i);
  return instructionMatch ? sentenceCase(instructionMatch[1]) : "";
}

function cleanMedicationName(segment: string) {
  const firstLine = segment.split(/\n|\.|;/)[0] ?? segment;
  const clean = firstLine
    .replace(/^(rx|receta|medicamento|medicamentos?)\s*:?\s*/i, "")
    .replace(/\b\d+(?:[.,]\d+)?\s*(mg|g|mcg|ml|%)\b/gi, "")
    .replace(/\b(tabletas?|c[aá]psulas?|capsulas?|comprimidos?|pastillas?|mililitros?|ml|gotas?|sobres?|dosis)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^(agotamiento|cansancio|diagn[oó]stico|diagnostico|tratamiento|dolor|fiebre|tos|garganta|control)(\s|$)/i.test(clean)) {
    return "";
  }

  return clean.split(" ").slice(0, 4).join(" ");
}

function buildDraftsFromScannedText(lines: string[]) {
  const cleanLines = lines.map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const ignoredLine = /(paciente|fecha|edad|firma|c[eé]dula|cedula|diagn[oó]stico|doctor|doctora|\bdr\b|\bdra\b)/i;
  const medicationSignal = /(\d+\s*(mg|g|mcg|ml)\b|tabletas?|c[aá]psulas?|capsulas?|gotas?|sobres?|jarabe|suspensi[oó]n|tomar|toma|cada|c\/)/i;
  const starts = cleanLines
    .map((line, index) => ({ line, index, nextLine: cleanLines[index + 1] ?? "" }))
    .filter(({ line, nextLine }) => /[a-záéíóúñ]{4,}/i.test(line) && !ignoredLine.test(line) && (medicationSignal.test(line) || medicationSignal.test(nextLine)))
    .map(({ index }) => index);
  const uniqueStarts = starts.filter((index, position) => position === 0 || index - starts[position - 1] > 1).slice(0, 4);

  const segments = uniqueStarts.length > 0 ? uniqueStarts.map((start, index) => cleanLines.slice(start, uniqueStarts[index + 1] ?? start + 3).join("\n")) : [];
  const drafts = segments
    .map((segment, index) => {
      const unitLabel = inferUnitFromText(segment);
      const dose = parseDoseFromText(segment, unitLabel);
      const name = cleanMedicationName(segment);

      return {
        ...emptyDraft,
        name: name || `Medicamento ${index + 1}`,
        dose,
        instructions: parseInstructionsFromText(segment),
        frequencyMinutes: parseFrequencyMinutes(segment),
        durationDays: parseDurationDays(segment),
        unitsPerDose: Number(dose) || 0,
        unitLabel,
        confirmed: false
      };
    })
    .filter((draft) => draft.name.trim().length > 0 || draft.dose || draft.unitLabel);

  const titleLine = cleanLines.find((line) => /diagn[oó]stico|tratamiento/i.test(line));
  const doctorLine = cleanLines.find((line) => /\b(dr|dra|doctor|doctora|medico|m[eé]dico)\b/i.test(line));

  return {
    drafts,
    title: titleLine?.replace(/diagn[oó]stico|tratamiento|:/gi, "").trim(),
    doctor: doctorLine?.replace(/doctor|doctora|medico|m[eé]dico|dr\.?|dra\.?|:/gi, "").trim(),
    preview: cleanLines.slice(0, 8).join("\n")
  };
}

function upsertDeviceAccount(accounts: DeviceAuthAccount[], user: AuthUser) {
  const nextAccount: DeviceAuthAccount = { ...user, lastUsedAt: new Date().toISOString() };
  const remaining = accounts.filter((account) => account.id !== user.id);
  return [nextAccount, ...remaining].sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
}

async function canUseBiometricUnlock() {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync()
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [storedAuthUser, setStoredAuthUser] = useState<AuthUser | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricChecking, setBiometricChecking] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [authName, setAuthName] = useState("");
  const [authIdentifier, setAuthIdentifier] = useState("");
  const [authSecret, setAuthSecret] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [localUsers, setLocalUsers] = useState<LocalUserRecord[]>([]);
  const [deviceAccounts, setDeviceAccounts] = useState<DeviceAuthAccount[]>([]);
  const [selectedDeviceAccountId, setSelectedDeviceAccountId] = useState("");
  const [useManualAuthForm, setUseManualAuthForm] = useState(false);
  const [phoneCodeState, setPhoneCodeState] = useState<PhoneCodeState | null>(null);
  const nativePhoneConfirmationRef = useRef<NativePhoneConfirmation | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const lockingSessionRef = useRef(false);
  const [remoteAdminStats, setRemoteAdminStats] = useState<FirebaseAdminStats | null>(null);
  const [adminStatsLoading, setAdminStatsLoading] = useState(false);
  const [adminStatsError, setAdminStatsError] = useState("");
  const [adminStatsSyncedAt, setAdminStatsSyncedAt] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("today");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseEvents, setDoseEvents] = useState<DoseEvent[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const screenTransition = useRef(new Animated.Value(1)).current;

  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipeStep, setRecipeStep] = useState<RecipeStep>("photo");
  const [recipeTitle, setRecipeTitle] = useState("");
  const [recipeDoctorPrefix, setRecipeDoctorPrefix] = useState<DoctorPrefix>("Dr.");
  const [recipeDoctor, setRecipeDoctor] = useState("");
  const [recipeValidationAttempted, setRecipeValidationAttempted] = useState(false);
  const [medicationValidationAttempted, setMedicationValidationAttempted] = useState(false);
  const [recipePhotoUri, setRecipePhotoUri] = useState<string | undefined>();
  const [recipeSource, setRecipeSource] = useState<Recipe["source"]>("photo");
  const [wizardDrafts, setWizardDrafts] = useState<WizardMedicationDraft[]>([emptyWizardDraft()]);
  const [activeWizardIndex, setActiveWizardIndex] = useState(0);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const [scanPreview, setScanPreview] = useState("");
  const [notificationTestNotice, setNotificationTestNotice] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState("");
  const [editingMedicationId, setEditingMedicationId] = useState("");
  const [editRecipeTitle, setEditRecipeTitle] = useState("");
  const [editRecipeDoctorPrefix, setEditRecipeDoctorPrefix] = useState<DoctorPrefix>("Dr.");
  const [editRecipeDoctor, setEditRecipeDoctor] = useState("");
  const [editDraft, setEditDraft] = useState<NewMedicationDraft>(emptyDraft);

  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryMedicationId, setInventoryMedicationId] = useState("");
  const [inventoryFlow, setInventoryFlow] = useState<"add" | "adjust">("add");
  const [inventoryMode, setInventoryMode] = useState<InventoryMode>("pick");
  const [inventoryAmount, setInventoryAmount] = useState("5");
  const [inventoryUnitsPerContainer, setInventoryUnitsPerContainer] = useState("30");
  const [inventoryContainerCount, setInventoryContainerCount] = useState("1");
  const [inventorySuccess, setInventorySuccess] = useState("");

  const [historyDateFilter, setHistoryDateFilter] = useState<HistoryDateFilter>("today");
  const [historyCalendarOpen, setHistoryCalendarOpen] = useState(false);
  const [historySelectedDateKey, setHistorySelectedDateKey] = useState(todayDateKey());
  const [historyCalendarMonth, setHistoryCalendarMonth] = useState(() => new Date());
  const [historyRecipeFilter, setHistoryRecipeFilter] = useState("all");

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileRelationship, setProfileRelationship] = useState("");
  const [profileAge, setProfileAge] = useState("");
  const [profileGender, setProfileGender] = useState("Adulto");
  const [profileIcon, setProfileIcon] = useState<ProfileIcon>("adult");
  const [profileColor, setProfileColor] = useState(colorOptions[0]);

  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipEventId, setSkipEventId] = useState("");
  const [skipReason, setSkipReason] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [choiceModal, setChoiceModal] = useState<ChoiceState | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadAuthState() {
      try {
        const [saved, savedUsers, savedDeviceAccounts] = await Promise.all([
          AsyncStorage.getItem(AUTH_STORAGE_KEY),
          AsyncStorage.getItem(USERS_STORAGE_KEY),
          AsyncStorage.getItem(DEVICE_ACCOUNTS_STORAGE_KEY)
        ]);
        if (savedUsers) {
          setLocalUsers(JSON.parse(savedUsers) as LocalUserRecord[]);
        }
        const parsedDeviceAccounts = savedDeviceAccounts ? (JSON.parse(savedDeviceAccounts) as DeviceAuthAccount[]) : [];
        let nextDeviceAccounts = parsedDeviceAccounts;
        if (saved) {
          const parsedUser = JSON.parse(saved) as AuthUser;
          nextDeviceAccounts = upsertDeviceAccount(parsedDeviceAccounts, parsedUser);
          setDeviceAccounts(nextDeviceAccounts);
          setSelectedDeviceAccountId(parsedUser.id);
          setStoredAuthUser(parsedUser);
          setUseManualAuthForm(false);
          const canUnlockWithBiometrics = await canUseBiometricUnlock();
          if (canUnlockWithBiometrics) {
            setBiometricAvailable(true);
            setAuthNotice("Confirma tu huella o biometría para entrar a tu sesión guardada.");
          } else {
            setAuthUser(parsedUser);
          }
          await AsyncStorage.setItem(DEVICE_ACCOUNTS_STORAGE_KEY, JSON.stringify(nextDeviceAccounts));
        } else {
          setDeviceAccounts(nextDeviceAccounts);
          setSelectedDeviceAccountId(nextDeviceAccounts[0]?.id ?? "");
          setStoredAuthUser(nextDeviceAccounts[0] ?? null);
          setBiometricAvailable(nextDeviceAccounts.length > 0 ? await canUseBiometricUnlock() : false);
        }
      } finally {
        setAuthHydrated(true);
      }
    }

    void loadAuthState();
  }, []);

  useEffect(() => {
    async function loadUserState() {
      if (!authHydrated) {
        return;
      }

      if (!authUser) {
        setProfiles([]);
        setRecipes([]);
        setMedications([]);
        setDoseEvents([]);
        setSelectedProfileId("");
        setTutorialSeen(false);
        setHydrated(true);
        return;
      }

      setHydrated(false);
      try {
        const saved = await AsyncStorage.getItem(storageKeyForUser(authUser));
        if (saved) {
          const parsed = JSON.parse(saved) as StorageShape;
          setProfiles(parsed.profiles ?? []);
          setRecipes(parsed.recipes ?? []);
          setMedications(parsed.medications ?? []);
          setDoseEvents(parsed.doseEvents ?? []);
          setSelectedProfileId(parsed.selectedProfileId ?? "");
          setTutorialSeen(Boolean(parsed.tutorialSeen));
        } else {
          setProfiles([]);
          setRecipes([]);
          setMedications([]);
          setDoseEvents([]);
          setSelectedProfileId("");
          setTutorialSeen(false);
        }
      } finally {
        setHydrated(true);
      }
    }

    void loadUserState();
  }, [authHydrated, authUser?.id]);

  useEffect(() => {
    if (!hydrated || !authUser) {
      return;
    }

    const state: StorageShape = {
      profiles,
      recipes,
      medications,
      doseEvents,
      selectedProfileId,
      tutorialSeen
    };

    void AsyncStorage.setItem(storageKeyForUser(authUser), JSON.stringify(state));
    void saveFirebaseUsageSnapshot(authUser.id, usageSnapshotFromState(profiles, recipes, medications, doseEvents)).catch(() => undefined);
  }, [authUser, doseEvents, hydrated, medications, profiles, recipes, selectedProfileId, tutorialSeen]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!authUser) {
      lastActivityAtRef.current = Date.now();
      return;
    }

    lastActivityAtRef.current = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - lastActivityAtRef.current >= 15 * 60 * 1000) {
        void lockSessionForInactivity();
      }
    }, 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (Date.now() - lastActivityAtRef.current >= 15 * 60 * 1000) {
          void lockSessionForInactivity();
        } else {
          markActivity();
        }
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [authUser?.id]);

  useEffect(() => {
    screenTransition.setValue(0);
    Animated.timing(screenTransition, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true
    }).start();
  }, [screenTransition, tab]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (profiles.length === 0) {
      setSelectedProfileId("");
      setTab("profile");
      return;
    }
    if (!profiles.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [hydrated, profiles, selectedProfileId]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void scheduleMissingDoseNotifications();
  }, [hydrated]);

  useEffect(() => {
    if (Platform.OS === "web" || !hydrated || !authUser) {
      return;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const eventId = response.notification.request.content.data?.eventId;
      if (typeof eventId !== "string") {
        setTab("today");
        return;
      }

      if (response.actionIdentifier === NOTIFICATION_ACTION_TAKEN) {
        void updateDoseStatus(eventId, "taken").then(() => {
          void sendActionFeedbackNotification("Dosis completada", "Bien hecho. Kura actualizó tu tratamiento.");
          showNotice("Bien hecho", "Dosis marcada como completada.", "success");
        });
        return;
      }

      if (response.actionIdentifier === NOTIFICATION_ACTION_SNOOZE) {
        void updateDoseStatus(eventId, "snoozed").then(() => {
          void sendActionFeedbackNotification("Dosis pospuesta", "Te recordare en 10 minutos. Cuida el ritmo del tratamiento.");
          showNotice("Dosis pospuesta", "Te recordare otra vez en 10 minutos. Cuida el ritmo del tratamiento.", "warning");
        });
        return;
      }

      if (response.actionIdentifier === NOTIFICATION_ACTION_SKIP) {
        void updateDoseStatus(eventId, "skipped", { skippedReason: "Omitida desde la notificación" }).then(() => {
          void sendActionFeedbackNotification("Dosis omitida", "Quedó registrada. Revisa el ritmo del tratamiento cuando puedas.");
          showNotice("Dosis omitida", "Quedó registrada. Si puedes, revisa el ritmo del tratamiento.", "warning");
        });
        return;
      }

      setTab("today");
    });

    return () => subscription.remove();
  }, [authUser, doseEvents, hydrated, medications]);

  useEffect(() => {
    if (!hydrated || !isAdminAuthUser(authUser)) {
      setRemoteAdminStats(null);
      setAdminStatsError("");
      setAdminStatsSyncedAt(null);
      return;
    }

    void refreshAdminStats(true);
  }, [authUser, hydrated, localUsers.length, profiles.length, recipes.length, medications.length, doseEvents.length]);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0];
  const selectedDeviceAccount = deviceAccounts.find((account) => account.id === selectedDeviceAccountId) ?? storedAuthUser ?? deviceAccounts[0] ?? null;
  const shouldShowSavedAccountLogin = authMode === "login" && !useManualAuthForm && Boolean(selectedDeviceAccount);
  const profileRecipes = recipes.filter((recipe) => recipe.profileId === selectedProfileId);
  const profileMedications = medications.filter((medication) => medication.profileId === selectedProfileId);
  const profileDoseEvents = doseEvents.filter((event) => event.profileId === selectedProfileId);
  const todaysEvents = useMemo(
    () =>
      profileDoseEvents
        .filter((event) => dateKeyFromIso(event.scheduledAt) === todayDateKey())
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [profileDoseEvents]
  );
  const actionableEvents = useMemo(
    () =>
      profileDoseEvents
        .filter((event) => event.status === "pending" || event.status === "snoozed")
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [profileDoseEvents]
  );
  const actionableToday = actionableEvents.filter((event) => dateKeyFromIso(event.scheduledAt) === todayDateKey());
  const activeSnoozedEvents = actionableEvents.filter((event) => event.status === "snoozed");
  const nextDoseEvents = useMemo(() => {
    if (actionableEvents.length === 0) {
      return [];
    }

    if (activeSnoozedEvents.length > 0) {
      const snoozedOriginalKeys = new Set(activeSnoozedEvents.map((event) => minuteKeyFromIso(event.originalScheduledAt ?? event.scheduledAt)));
      return actionableEvents.filter((event) => event.status === "snoozed" || snoozedOriginalKeys.has(minuteKeyFromIso(event.scheduledAt)));
    }

    const firstKey = minuteKeyFromIso(actionableEvents[0].scheduledAt);
    return actionableEvents.filter((event) => minuteKeyFromIso(event.scheduledAt) === firstKey);
  }, [actionableEvents, activeSnoozedEvents]);
  const upcomingDoseEvents = useMemo(() => {
    const selectedIds = new Set<string>();
    const nextItems: DoseEvent[] = [];

    nextDoseEvents.forEach((event) => {
      selectedIds.add(event.id);
      nextItems.push(event);
    });

    const activeMedicationIds = new Set(profileMedications.map((medication) => medication.id));
    activeMedicationIds.forEach((medicationId) => {
      const event = actionableEvents.find((item) => item.medicationId === medicationId);
      if (!event || selectedIds.has(event.id)) {
        return;
      }
      selectedIds.add(event.id);
      nextItems.push(event);
    });

    const minimumItems = Math.max(3, activeMedicationIds.size);
    actionableEvents.forEach((event) => {
      if (nextItems.length >= minimumItems || selectedIds.has(event.id)) {
        return;
      }
      selectedIds.add(event.id);
      nextItems.push(event);
    });

    return nextItems.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [actionableEvents, nextDoseEvents, profileMedications]);
  const takenToday = todaysEvents.filter((event) => event.status === "taken").length;
  const completedToday = todaysEvents.filter((event) => event.status === "taken");
  const skippedToday = todaysEvents.filter((event) => event.status === "skipped");
  const delayedTodayEvents = profileDoseEvents.filter((event) => ((event.snoozeCount ?? 0) > 0 || event.status === "snoozed") && dateKeyFromIso(event.originalScheduledAt ?? event.scheduledAt) === todayDateKey());
  const snoozedMinutesToday = delayedTodayEvents.reduce((total, event) => total + getSnoozedMinutes(event, nowTick), 0);
  const todayScore = Math.max(0, 100 - snoozedMinutesToday * 2 - skippedToday.length * 25);
  const rhythmSummaries = profileRecipes
    .map((recipe) => {
      const recipeEvents = profileDoseEvents.filter((event) => event.recipeId === recipe.id);
      const delayedEvents = recipeEvents.filter((event) => (event.snoozeCount ?? 0) > 0 || event.status === "snoozed");
      const todayDelayed = delayedEvents.filter((event) => dateKeyFromIso(event.originalScheduledAt ?? event.scheduledAt) === todayDateKey());
      const todaySkipped = recipeEvents.filter((event) => event.status === "skipped" && dateKeyFromIso(event.scheduledAt) === todayDateKey()).length;
      const totalSkipped = recipeEvents.filter((event) => event.status === "skipped").length;

      if (delayedEvents.length === 0 && totalSkipped === 0) {
        return null;
      }

      return {
        id: recipe.id,
        title: recipe.title,
        message: buildRhythmText({
          todayMinutes: todayDelayed.reduce((total, event) => total + getSnoozedMinutes(event, nowTick), 0),
          totalMinutes: delayedEvents.reduce((total, event) => total + getSnoozedMinutes(event, nowTick), 0),
          todaySkipped,
          totalSkipped,
          snoozedDays: new Set(delayedEvents.map((event) => dateKeyFromIso(event.originalScheduledAt ?? event.scheduledAt))).size
        })
      };
    })
    .filter(Boolean) as Array<{ id: string; title: string; message: string }>;
  const currentWizardDraft = wizardDrafts[activeWizardIndex] ?? wizardDrafts[0];
  const visibleRecipeErrors = recipeValidationAttempted ? recipeDetailErrors() : { title: false, doctor: false };
  const visibleMedicationErrors = medicationValidationAttempted
    ? medicationDraftErrors(currentWizardDraft)
    : { name: false, unitLabel: false, dose: false, frequencyMinutes: false, durationDays: false, containerCount: false, unitsPerContainer: false };
  const currentTutorialStep = tutorialSteps[tutorialStepIndex] ?? tutorialSteps[0];
  const inventoryMedication = medications.find((medication) => medication.id === inventoryMedicationId);
  const editingRecipe = recipes.find((recipe) => recipe.id === editingRecipeId);
  const editingRecipeMedications = medications.filter((medication) => medication.recipeId === editingRecipeId);

  function medicationFor(event: DoseEvent) {
    return medications.find((medication) => medication.id === event.medicationId);
  }

  function doseMarkerFor(event: DoseEvent) {
    const medicationEvents = doseEvents
      .filter((item) => item.medicationId === event.medicationId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const index = medicationEvents.findIndex((item) => item.id === event.id);
    if (index < 0) {
      return undefined;
    }
    if (medicationEvents.length === 1) {
      return "Primera y última dosis";
    }
    if (index === 0) {
      return "Primera dosis";
    }
    if (index === medicationEvents.length - 1) {
      return "Última dosis";
    }
    return undefined;
  }

  async function scheduleMissingDoseNotifications() {
    const missingEvents = doseEvents.filter(
      (event) =>
        !event.notificationId &&
        (event.status === "pending" || event.status === "snoozed") &&
        new Date(event.scheduledAt).getTime() > Date.now()
    );

    if (missingEvents.length === 0) {
      return;
    }

    const scheduledEvents = await attachNotificationsToEvents(missingEvents, medications);
    const notificationByEventId = new Map(scheduledEvents.filter((event) => event.notificationId).map((event) => [event.id, event.notificationId]));

    if (notificationByEventId.size === 0) {
      return;
    }

    setDoseEvents((current) =>
      current.map((event) => {
        const notificationId = notificationByEventId.get(event.id);
        return notificationId ? { ...event, notificationId } : event;
      })
    );
  }

  function resetRecipeWizard() {
    setRecipeStep("photo");
    setRecipeTitle("");
    setRecipeDoctorPrefix("Dr.");
    setRecipeDoctor("");
    setRecipeValidationAttempted(false);
    setMedicationValidationAttempted(false);
    setRecipePhotoUri(undefined);
    setRecipeSource("photo");
    setWizardDrafts([emptyWizardDraft()]);
    setActiveWizardIndex(0);
    setScanLoading(false);
    setScanNotice("");
    setScanPreview("");
    setNotificationTestNotice("");
  }

  function resetAuthForm(nextMode = authMode) {
    setAuthMode(nextMode);
    setAuthName("");
    setAuthIdentifier("");
    setAuthSecret("");
    setAuthNotice("");
    setPhoneCodeState(null);
    nativePhoneConfirmationRef.current = null;
  }

  function showNotice(title: string, message: string, tone: NoticeState["tone"] = "info") {
    setNotice({ title, message, tone });
  }

  async function saveLocalUsers(nextUsers: LocalUserRecord[]) {
    setLocalUsers(nextUsers);
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
  }

  async function saveDeviceAccounts(nextAccounts: DeviceAuthAccount[]) {
    setDeviceAccounts(nextAccounts);
    await AsyncStorage.setItem(DEVICE_ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));
  }

  async function rememberDeviceAccount(user: AuthUser) {
    const nextAccounts = upsertDeviceAccount(deviceAccounts, user);
    setSelectedDeviceAccountId(user.id);
    setStoredAuthUser(user);
    await saveDeviceAccounts(nextAccounts);
  }

  function normalizedAuthIdentifier(value: string) {
    return normalizedText(value);
  }

  function findLocalUser(provider: AuthUser["provider"], identifier: string) {
    const normalized = normalizedAuthIdentifier(identifier);
    return localUsers.find((user) => user.provider === provider && normalizedAuthIdentifier(user.identifier) === normalized);
  }

  async function registerLocalUser(provider: AuthUser["provider"], identifier: string, name: string, secret?: string) {
    const existing = findLocalUser(provider, identifier);
    if (existing) {
      return existing;
    }

    const nextUser: LocalUserRecord = {
      ...buildLocalAuthUser(provider, identifier, name),
      secret
    };
    await saveLocalUsers([...localUsers, nextUser]);
    return nextUser;
  }

  function makePhoneCode() {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
  }

  async function sendPhoneCode() {
    const identifier = authIdentifier.trim();
    if (!identifier) {
      showNotice("Falta el celular", "Escribe tu número celular para enviar el código.", "warning");
      return;
    }
    if (authMode === "login" && !findLocalUser("phone", identifier) && !hasFirebaseConfig()) {
      setAuthNotice("No encontré una cuenta con ese celular. Primero crea una cuenta.");
      return;
    }

    if (hasFirebaseConfig() && Platform.OS !== "web") {
      const formattedPhone = formatPhoneForFirebase(identifier);
      if (!formattedPhone || formattedPhone.length < 11) {
        showNotice("Revisa el celular", "Escribe el número con 10 dígitos o con lada internacional.", "warning");
        return;
      }

      try {
        setAuthNotice("Enviando SMS real...");
        const confirmation = await sendNativePhoneVerification(formattedPhone);
        if (confirmation) {
          nativePhoneConfirmationRef.current = confirmation;
          setPhoneCodeState({
            identifier,
            code: "",
            expiresAt: Date.now() + 10 * 60 * 1000
          });
          setAuthSecret("");
          setAuthNotice(`Te enviamos un SMS real a ${formattedPhone}. Escribe el código para continuar.`);
          return;
        }
      } catch (error) {
        nativePhoneConfirmationRef.current = null;
        showNotice("No se pudo enviar SMS", firebaseErrorMessage(error), "danger");
        return;
      }
    }

    const code = makePhoneCode();
    nativePhoneConfirmationRef.current = null;
    setPhoneCodeState({
      identifier,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    setAuthSecret("");
    setAuthNotice(
      hasFirebaseConfig()
        ? "En navegador seguimos usando código de prueba. En APK instalada se enviará SMS real."
        : `Código de prueba: ${code}. En Firebase este código llegará por SMS.`
    );
  }

  function validatePhoneCode(identifier: string, secret: string) {
    if (!phoneCodeState || phoneCodeState.identifier !== identifier) {
      showNotice("Envía el código", "Primero envía el código de verificación al celular.", "warning");
      return false;
    }
    if (Date.now() > phoneCodeState.expiresAt) {
      setPhoneCodeState(null);
      setAuthNotice("El código venció. Envía uno nuevo.");
      return false;
    }
    if (!secret || secret !== phoneCodeState.code) {
      showNotice("Código incorrecto", "Revisa el código e inténtalo de nuevo.", "danger");
      return false;
    }
    return true;
  }

  function buildLocalAuthUser(provider: AuthUser["provider"], identifier: string, name?: string): AuthUser {
    return {
      id: makeId(`user-${provider}`),
      name: name?.trim() || (provider === "email" || provider === "phone" ? "Usuario Kura" : `Usuario ${provider === "google" ? "Google" : "Facebook"}`),
      identifier,
      provider,
      createdAt: new Date().toISOString()
    };
  }

  function buildAuthUserFromFirebase(profile: FirebaseAuthProfile): AuthUser {
    return {
      id: profile.id,
      name: profile.name,
      identifier: profile.identifier,
      provider: profile.provider,
      createdAt: new Date().toISOString()
    };
  }

  function firebaseErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("auth/invalid-credential") || message.includes("auth/wrong-password")) {
      return "Los datos de inicio de sesión no coinciden.";
    }
    if (message.includes("auth/email-already-in-use")) {
      return "Ese correo ya tiene una cuenta.";
    }
    if (message.includes("auth/weak-password")) {
      return "Usa una contraseña de al menos 6 caracteres.";
    }
    if (message.includes("auth/popup")) {
      return "No se pudo abrir la ventana de inicio de sesión.";
    }
    return "Firebase no pudo completar la operación. Revisa la configuración del proyecto.";
  }

  async function saveAuthUser(user: AuthUser) {
    await rememberDeviceAccount(user);
    setAuthUser(user);
    setStoredAuthUser(user);
    setBiometricAvailable(false);
    setBiometricChecking(false);
    setUseManualAuthForm(false);
    setAuthSecret("");
    setTab("today");
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    void syncFirebaseUserRecord(user).catch(() => undefined);
  }

  async function refreshAdminStats(silent = false) {
    if (!isAdminAuthUser(authUser)) {
      return;
    }

    if (!hasFirebaseConfig()) {
      setRemoteAdminStats(null);
      setAdminStatsError("Firebase aún no está conectado.");
      return;
    }

    if (!silent) {
      setAdminStatsLoading(true);
    }
    setAdminStatsError("");

    try {
      const stats = await getFirebaseAdminStats();
      setRemoteAdminStats(stats);
      setAdminStatsSyncedAt(new Date().toISOString());
      if (!stats) {
        setAdminStatsError("No hay datos remotos todavía.");
      }
    } catch {
      setRemoteAdminStats(null);
      setAdminStatsError("No pude leer Firebase. Revisa reglas, conexión o permisos admin.");
    } finally {
      setAdminStatsLoading(false);
    }
  }

  async function unlockWithBiometrics(account = selectedDeviceAccount) {
    if (!account) {
      showNotice("Sin sesión guardada", "Inicia sesión con tu correo o celular para activar el desbloqueo con huella en este dispositivo.", "warning");
      return;
    }

    setBiometricChecking(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Entrar a ${APP_NAME}`,
        cancelLabel: "Cancelar",
        fallbackLabel: "Usar contraseña"
      });

      if (result.success) {
        await saveAuthUser(account);
        setAuthNotice("");
        resetAuthForm("login");
        return;
      }

      setAuthNotice("No se desbloqueó la sesión. Puedes intentarlo otra vez o iniciar sesión manualmente.");
    } catch {
      showNotice("Biometría no disponible", "No pude usar la huella en este momento. Puedes entrar con correo o celular.", "warning");
    } finally {
      setBiometricChecking(false);
    }
  }

  async function loginSavedAccountWithPassword() {
    const account = selectedDeviceAccount;
    const secret = authSecret.trim();

    if (!account) {
      setUseManualAuthForm(true);
      return;
    }
    if (account.provider !== "email") {
      showNotice("Usa otra opción", "Esta cuenta no usa contraseña. Entra con huella o elige otra cuenta.", "warning");
      return;
    }
    if (!secret) {
      showNotice("Falta la contraseña", "Escribe la contraseña de esta cuenta para entrar.", "warning");
      return;
    }

    if (hasFirebaseConfig()) {
      try {
        const firebaseProfile = await signInWithFirebaseEmail(account.identifier, secret);
        if (firebaseProfile) {
          await saveAuthUser(buildAuthUserFromFirebase(firebaseProfile));
          resetAuthForm("login");
          return;
        }
      } catch (error) {
        showNotice("No se pudo iniciar sesión", firebaseErrorMessage(error), "danger");
        return;
      }
    }

    const localUser = findLocalUser("email", account.identifier);
    if (!localUser || (localUser.secret && localUser.secret !== secret)) {
      showNotice("Datos incorrectos", "La contraseña no coincide con esa cuenta.", "danger");
      return;
    }

    await saveAuthUser(localUser);
    resetAuthForm("login");
  }

  async function handleAuthSubmit() {
    const identifier = authIdentifier.trim();
    const secret = authSecret.trim();

    if (!identifier) {
      showNotice("Falta un dato", authMethod === "email" ? "Escribe tu correo." : "Escribe tu número celular.", "warning");
      return;
    }

    if (authMethod === "phone" && nativePhoneConfirmationRef.current) {
      if (!secret) {
        showNotice("Falta el código", "Escribe el código que llegó por SMS.", "warning");
        return;
      }

      try {
        const firebaseProfile = await confirmNativePhoneVerification(nativePhoneConfirmationRef.current, secret, authName);
        nativePhoneConfirmationRef.current = null;
        setPhoneCodeState(null);
        await saveAuthUser(buildAuthUserFromFirebase(firebaseProfile));
        resetAuthForm("login");
        return;
      } catch (error) {
        showNotice("Código incorrecto", firebaseErrorMessage(error), "danger");
        return;
      }
    }

    if (authMode === "recover") {
      if (authMethod === "phone") {
        if (!validatePhoneCode(identifier, secret)) {
          return;
        }

        const existing = findLocalUser("phone", identifier);
        if (!existing) {
          setAuthNotice("No encontre una cuenta con ese celular. Primero crea una cuenta.");
          return;
        }

        await saveAuthUser(existing);
        resetAuthForm("login");
        return;
      }

      if (authMethod === "email" && hasFirebaseConfig()) {
        try {
          await sendFirebasePasswordReset(identifier);
          setAuthNotice("Firebase envió las instrucciones para recuperar tu acceso.");
        } catch (error) {
          setAuthNotice(firebaseErrorMessage(error));
        }
        return;
      }

      const existing = findLocalUser(authMethod, identifier);
      setAuthNotice(
        existing
          ? authMethod === "email"
            ? "Cuenta encontrada. En Firebase se enviará un correo real para recuperar contraseña."
            : "Cuenta encontrada. En Firebase se enviará un SMS real para recuperar acceso."
          : "No encontre una cuenta con esos datos. Primero crea una cuenta."
      );
      return;
    }

    if (authMode === "signup" && !authName.trim()) {
      showNotice("Falta tu nombre", "Agrega tu nombre para crear la cuenta.", "warning");
      return;
    }

    if (authMethod === "phone") {
      if (!validatePhoneCode(identifier, secret)) {
        return;
      }
    } else if (!secret) {
      showNotice("Falta la clave", "Escribe tu contraseña.", "warning");
      return;
    }

    if (authMethod === "email" && hasFirebaseConfig()) {
      try {
        const firebaseProfile =
          authMode === "signup"
            ? await createFirebaseEmailUser(identifier, secret, authName)
            : await signInWithFirebaseEmail(identifier, secret);
        if (firebaseProfile) {
          await saveAuthUser(buildAuthUserFromFirebase(firebaseProfile));
          resetAuthForm("login");
          return;
        }
      } catch (error) {
        showNotice("No se pudo iniciar sesión", firebaseErrorMessage(error), "danger");
        return;
      }
    }

    if (authMode === "signup") {
      if (findLocalUser(authMethod, identifier)) {
        showNotice("Cuenta existente", authMethod === "email" ? "Ese correo ya tiene una cuenta." : "Ese celular ya tiene una cuenta.", "warning");
        return;
      }
      const user = await registerLocalUser(authMethod, identifier, authName, authMethod === "email" ? secret : undefined);
      await saveAuthUser(user);
      resetAuthForm("login");
      return;
    }

    const user = findLocalUser(authMethod, identifier);
    if (!user) {
      showNotice("Cuenta no encontrada", "Primero crea una cuenta para poder iniciar sesión.", "warning");
      return;
    }
    if (authMethod === "email" && user.secret && user.secret !== secret) {
      showNotice("Datos incorrectos", "La contraseña no coincide con esa cuenta.", "danger");
      return;
    }
    await saveAuthUser(user);
    resetAuthForm("login");
  }

  async function handleSocialSignIn(provider: "google" | "facebook") {
    if (!hasFirebaseConfig()) {
      setAuthNotice("Para usar Google o Facebook con usuarios reales falta conectar el proyecto de Firebase.");
      return;
    }

    if (hasFirebaseConfig() && Platform.OS === "web") {
      try {
        const firebaseProfile = await signInWithFirebaseSocial(provider);
        if (firebaseProfile) {
          await saveAuthUser(buildAuthUserFromFirebase(firebaseProfile));
          setAuthNotice("");
          return;
        }
      } catch (error) {
        showNotice("No se pudo iniciar sesión", firebaseErrorMessage(error), "danger");
        return;
      }
    }

    try {
      const firebaseProfile =
        provider === "google"
          ? await signInWithFirebaseGoogleIdToken(await requestGoogleIdToken())
          : await signInWithFirebaseFacebookAccessToken(await requestFacebookAccessToken());

      if (firebaseProfile) {
        await saveAuthUser(buildAuthUserFromFirebase(firebaseProfile));
        setAuthNotice("");
        resetAuthForm("login");
        return;
      }
    } catch (error) {
      showNotice("Falta configurar acceso", error instanceof Error ? error.message : firebaseErrorMessage(error), "warning");
      return;
    }

    showNotice("No se pudo iniciar sesión", "Firebase no devolvió usuario para este proveedor.", "danger");
  }

  function markActivity() {
    lastActivityAtRef.current = Date.now();
  }

  async function lockSessionForInactivity() {
    if (!authUser || lockingSessionRef.current) {
      return;
    }

    lockingSessionRef.current = true;
    const currentUser = authUser;
    try {
      await signOutFromFirebase();
      await rememberDeviceAccount(currentUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      setStoredAuthUser(currentUser);
      setSelectedDeviceAccountId(currentUser.id);
      setBiometricAvailable(await canUseBiometricUnlock());
      setUseManualAuthForm(false);
      setAuthUser(null);
      setProfiles([]);
      setRecipes([]);
      setMedications([]);
      setDoseEvents([]);
      setSelectedProfileId("");
      setTutorialSeen(false);
      resetAuthForm("login");
      setAuthNotice("Por seguridad bloqueamos la app después de 15 minutos sin actividad.");
    } finally {
      lockingSessionRef.current = false;
    }
  }

  async function signOut() {
    const currentUser = authUser;
    await signOutFromFirebase();
    if (currentUser) {
      await rememberDeviceAccount(currentUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      setStoredAuthUser(currentUser);
      setSelectedDeviceAccountId(currentUser.id);
      setBiometricAvailable(await canUseBiometricUnlock());
    }
    setAuthUser(null);
    setBiometricChecking(false);
    setUseManualAuthForm(false);
    setProfiles([]);
    setRecipes([]);
    setMedications([]);
    setDoseEvents([]);
    setSelectedProfileId("");
    setTutorialSeen(false);
    resetAuthForm("login");
    setTab("today");
  }

  function openRecipeWizard() {
    if (!selectedProfileId || profiles.length === 0) {
      showNotice("Primero agrega un perfil", "Así Kura sabrá para quién es la receta.", "warning");
      setTab("profile");
      openProfileModal();
      return;
    }
    resetRecipeWizard();
    setRecipeModalOpen(true);
  }

  async function pickRecipePhoto(mode: "camera" | "library") {
    const permission =
      mode === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showNotice("Permiso pendiente", "Necesitamos permiso para guardar la foto de la receta.", "warning");
      return;
    }

    const result =
      mode === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.82, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.82,
            allowsEditing: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images
          });

    if (!result.canceled && result.assets[0]) {
      setRecipePhotoUri(result.assets[0].uri);
      setRecipeSource("photo");
      setScanNotice("");
      setScanPreview("");
    }
  }

  function requestRecipeScan() {
    if (!recipePhotoUri) {
      showNotice("Primero la foto", "Toma o elige una foto de la receta para poder escanearla.", "warning");
      return;
    }

    requestConfirmation({
      title: "Revisa el escaneo",
      message: "El escaneo está en pruebas y puede cometer errores. Kura llenará lo que detecte, pero revisa cada campo antes de activar las alarmas.",
      confirmLabel: "Escanear",
      onConfirm: () => void runRecipeScan()
    });
  }

  async function runRecipeScan() {
    if (!recipePhotoUri) {
      return;
    }

    setScanLoading(true);
    setScanNotice("");

    try {
      const textExtractor = require("expo-text-extractor") as TextExtractorModule;
      if (!textExtractor.isSupported) {
        throw new Error("OCR_UNSUPPORTED");
      }

      const lines = await textExtractor.extractTextFromImage(recipePhotoUri);
      const detected = buildDraftsFromScannedText(lines);
      const nextDrafts = detected.drafts.length > 0 ? detected.drafts : [emptyWizardDraft()];

      if (!recipeTitle.trim() && detected.title) {
        setRecipeTitle(detected.title);
      }
      if (!recipeDoctor.trim() && detected.doctor) {
        const parsedDoctor = parseDoctorLabel(detected.doctor);
        setRecipeDoctorPrefix(parsedDoctor.prefix);
        setRecipeDoctor(parsedDoctor.name);
      }

      setRecipeSource("scan");
      setWizardDrafts(nextDrafts);
      setActiveWizardIndex(0);
      setScanPreview(detected.preview);
      setScanNotice(
        detected.drafts.length > 0
          ? "Escaneo completado. Revisa los campos detectados antes de guardar el medicamento."
          : "No encontre campos claros. La foto queda guardada como referencia y puedes llenar el formulario manualmente."
      );
      setRecipeStep("medications");
    } catch {
      showNotice(
        "Escaneo no disponible",
        "No pude leer esta receta en esta vista. En Expo Go puede requerir una build instalada con OCR; mientras tanto puedes usar la foto como referencia y llenar los campos manualmente.",
        "warning"
      );
    } finally {
      setScanLoading(false);
    }
  }

  function updateWizardDraft(nextDraft: NewMedicationDraft) {
    setWizardDrafts((current) =>
      current.map((item, index) =>
        index === activeWizardIndex
          ? {
              ...nextDraft,
              confirmed: false
            }
          : item
      )
    );
  }

  function recipeDetailErrors() {
    return {
      title: !recipeTitle.trim(),
      doctor: !recipeDoctor.trim()
    };
  }

  function medicationDraftErrors(draft: NewMedicationDraft): MedicationDraftErrorState {
    return {
      name: !draft.name.trim(),
      unitLabel: !draft.unitLabel.trim(),
      dose: !(Number(draft.dose) > 0),
      frequencyMinutes: !(draft.frequencyMinutes > 0),
      durationDays: !(draft.durationDays > 0),
      containerCount: !(draft.containerCount > 0),
      unitsPerContainer: !(draft.unitsPerContainer > 0)
    };
  }

  function validateRecipeDetails() {
    setRecipeValidationAttempted(true);
    const errors = recipeDetailErrors();
    return !Object.values(errors).some(Boolean);
  }

  function validateMedicationDraft(draft: NewMedicationDraft) {
    setMedicationValidationAttempted(true);
    const errors = medicationDraftErrors(draft);
    return !Object.values(errors).some(Boolean);
  }

  function saveCurrentWizardMedication() {
    if (!validateMedicationDraft(currentWizardDraft)) {
      return;
    }

    setMedicationValidationAttempted(false);
    setWizardDrafts((current) =>
      current.map((item, index) =>
        index === activeWizardIndex
          ? {
              ...item,
              name: item.name.trim() || `Medicamento ${index + 1}`,
              confirmed: true
            }
          : item
      )
    );
  }

  function addAnotherWizardMedication() {
    setWizardDrafts((current) => [...current, emptyWizardDraft()]);
    setActiveWizardIndex(wizardDrafts.length);
    setMedicationValidationAttempted(false);
  }

  function editCurrentWizardMedication() {
    setWizardDrafts((current) =>
      current.map((item, index) =>
        index === activeWizardIndex
          ? {
              ...item,
              confirmed: false
            }
          : item
      )
    );
  }

  function goToAlarmStep() {
    const hasSavedMedication = wizardDrafts.some((item) => item.confirmed);
    if (!hasSavedMedication) {
      showNotice("Falta medicamento", "Guarda al menos un medicamento antes de finalizar la receta.", "warning");
      return;
    }
    setRecipeStep("alarms");
  }

  function goToMedicationStep() {
    if (!validateRecipeDetails()) {
      return;
    }
    setRecipeStep("medications");
  }

  function goToRecipeStep(step: RecipeStep) {
    if (step === "photo") {
      setRecipeStep("photo");
      return;
    }
    if (step === "medications") {
      goToMedicationStep();
      return;
    }
    if (step === "alarms") {
      if (!validateRecipeDetails()) {
        return;
      }
      goToAlarmStep();
      return;
    }
  }

  function askPastDoseHandling(count: number): Promise<"taken" | "pending" | "cancel"> {
    return new Promise((resolve) => {
      setChoiceModal({
        title: "Hora de inicio pasada",
        message: `Por la hora de inicio, ya hay ${count} dosis que debieron tomarse. ¿Quieres marcarlas como completadasí`,
        onClose: () => resolve("cancel"),
        actions: [
          {
            label: "Cancelar",
            tone: "secondary",
            onPress: () => {
              setChoiceModal(null);
              resolve("cancel");
            }
          },
          {
            label: "Dejarlas pendientes",
            tone: "secondary",
            onPress: () => {
              setChoiceModal(null);
              resolve("pending");
            }
          },
          {
            label: "Si, ya se tomaron",
            tone: "primary",
            onPress: () => {
              setChoiceModal(null);
              resolve("taken");
            }
          }
        ]
      });
    });
  }

  async function activateRecipe() {
    if (!validateRecipeDetails()) {
      setRecipeStep("photo");
      return;
    }

    const confirmedDrafts = wizardDrafts.filter((item) => item.confirmed);
    if (confirmedDrafts.length === 0) {
      showNotice("Falta medicamento", "Guarda al menos un medicamento antes de activar alarmas.", "warning");
      return;
    }

    const activatedAt = new Date();
    const fallbackStartTime = currentTimeKey(activatedAt);
    const recipe: Recipe = {
      id: makeId("recipe"),
      profileId: selectedProfileId,
      title: recipeTitle.trim() || "Nueva receta",
      doctor: buildDoctorLabel(recipeDoctorPrefix, recipeDoctor) || undefined,
      createdAt: new Date().toISOString(),
      photoUri: recipePhotoUri,
      source: recipeSource,
      needsReview: false
    };

    const newMedications: Medication[] = confirmedDrafts.map((draft, index) => {
      const timedDraft = {
        ...draft,
        firstTime: normalizeTimeValue(draft.firstTime || fallbackStartTime),
        frequencyMinutes: draft.frequencyMinutes || 480,
        durationDays: draft.durationDays || 1
      };
      const totalUnits = getTotalUnits(timedDraft);
      return {
        id: makeId(`med-${index}`),
        profileId: selectedProfileId,
        recipeId: recipe.id,
        name: timedDraft.name.trim() || `Medicamento ${index + 1}`,
        dose: formatMedicationDose(timedDraft),
        instructions: timedDraft.instructions.trim() || "Segun receta",
        frequencyMinutes: timedDraft.frequencyMinutes,
        durationDays: timedDraft.durationDays,
        startDate: todayDateKey(),
        times: getDraftTimes(timedDraft),
        totalUnits,
        remainingUnits: totalUnits,
        unitsPerDose: getUnitsPerDose(timedDraft),
        unitsPerContainer: Number(timedDraft.unitsPerContainer) || 0,
        containerCount: Number(timedDraft.containerCount) || 0,
        unitLabel: timedDraft.unitLabel || "Unidades",
        color: colorOptions[(medications.length + index) % colorOptions.length]
      };
    });

    const rawEvents = newMedications.flatMap((medication) => buildDoseEvents(medication));
    const pastEvents = rawEvents.filter((event) => new Date(event.scheduledAt).getTime() < activatedAt.getTime() - 60000 && dateKeyFromIso(event.scheduledAt) === todayDateKey());
    const pastHandling = pastEvents.length > 0 ? await askPastDoseHandling(pastEvents.length) : "pending";
    if (pastHandling === "cancel") {
      return;
    }

    const pastTakenCounts = new Map<string, number>();
    const newEvents = rawEvents.map((event) => {
      const isPast = pastEvents.some((pastEvent) => pastEvent.id === event.id);
      if (isPast && pastHandling === "taken") {
        pastTakenCounts.set(event.medicationId, (pastTakenCounts.get(event.medicationId) ?? 0) + 1);
        return {
          ...event,
          status: "taken" as DoseStatus,
          takenAt: activatedAt.toISOString()
        };
      }
      return event;
    });

    const adjustedMedications = newMedications.map((medication) => {
      const takenCount = pastTakenCounts.get(medication.id) ?? 0;
      return takenCount > 0
        ? {
            ...medication,
            remainingUnits: Math.max(0, medication.remainingUnits - takenCount * medication.unitsPerDose)
          }
        : medication;
    });

    setRecipeModalOpen(false);
    setTab("today");

    const scheduledEvents = await attachNotificationsToEvents(newEvents, adjustedMedications);
    setRecipes((current) => [recipe, ...current]);
    setMedications((current) => [...adjustedMedications, ...current]);
    setDoseEvents((current) => [...current, ...scheduledEvents]);

    resetRecipeWizard();
    const alarmCount = scheduledEvents.filter((event) => event.notificationId).length;
    showNotice(
      "Receta lista",
      Platform.OS === "web"
        ? "La receta quedó guardada. En navegador no se pueden mandar notificaciones del teléfono; hay que probarlas en la app instalada."
        : alarmCount > 0
        ? "Las alarmas del teléfono quedaron preparadas para esta receta."
        : "La receta quedó guardada. Revisa los permisos de notificaciones para que suenen las alarmas.",
      alarmCount > 0 ? "success" : "warning"
    );
  }

  async function scheduleTestNotification() {
    if (Platform.OS === "web") {
      const message = "En navegador no se pueden mandar notificaciones del teléfono. Esta prueba hay que hacerla desde la app instalada.";
      setNotificationTestNotice(message);
      showNotice("Prueba no disponible", message, "warning");
      return;
    }

    setNotificationTestNotice("Preparando prueba de notificación...");
    const allowed = await ensureNotificationPermission();
    if (!allowed) {
      const message = "Activa las notificaciones del teléfono para que Kura pueda recordarte las dosis.";
      setNotificationTestNotice(message);
      showNotice("Permiso pendiente", message, "warning");
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Prueba de Kura",
          body: "Si ves esto, las notificaciones ya están funcionando.",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 650, 250, 650],
          interruptionLevel: "timeSensitive"
        },
        trigger: null
      });
      setNotificationTestNotice("Prueba enviada. Debe aparecer una notificación del teléfono ahora.");
      showNotice("Prueba enviada", "Debe aparecer una notificación del teléfono ahora.", "success");
    } catch {
      const message = "El teléfono no aceptó la notificación de prueba. Revisa permisos de la app y ahorro de batería.";
      setNotificationTestNotice(message);
      showNotice("No se pudo probar", message, "danger");
    }
  }

  async function updateDoseStatus(eventId: string, status: DoseStatus, options?: { skippedReason?: string }) {
    const target = doseEvents.find((event) => event.id === eventId);
    if (!target) {
      return;
    }

    const medication = medicationFor(target);
    const wasTaken = target.status === "taken";
    const wasSnoozed = target.status === "snoozed";
    const snoozedAt = new Date(new Date(target.scheduledAt).getTime() + 10 * 60 * 1000);
    const takenAt = new Date();
    const shiftedEventIds = new Set<string>();
    const shiftedNotificationIds: string[] = [];

    if (status === "taken" || status === "skipped" || status === "snoozed") {
      await cancelDoseNotification(target.notificationId);
    }

    const targetNotificationId = status === "snoozed" && medication ? await scheduleDoseNotification(medication, snoozedAt, target.id) : undefined;

    let nextDoseEventsState: DoseEvent[] = doseEvents.map((event): DoseEvent => {
        if (event.id === eventId) {
          return {
            ...event,
            status,
            notificationId: status === "snoozed" ? targetNotificationId : undefined,
            originalScheduledAt: status === "snoozed" ? event.originalScheduledAt ?? event.scheduledAt : event.originalScheduledAt,
            scheduledAt: status === "snoozed" ? snoozedAt.toISOString() : event.scheduledAt,
            snoozedAt: status === "snoozed" ? event.snoozedAt ?? new Date().toISOString() : event.snoozedAt,
            snoozeCount: status === "snoozed" ? (event.snoozeCount ?? 0) + 1 : event.snoozeCount,
            skippedAt: status === "skipped" ? new Date().toISOString() : event.skippedAt,
            skippedReason: status === "skipped" ? options?.skippedReason?.trim() || "Sin motivo indicado" : event.skippedReason,
            takenAt: status === "taken" ? takenAt.toISOString() : event.takenAt
          };
        }

        if (status === "taken" && wasSnoozed && medication && event.medicationId === medication.id && (event.status === "pending" || event.status === "snoozed")) {
          const targetTime = new Date(target.originalScheduledAt ?? target.scheduledAt).getTime();
          const eventTime = new Date(event.scheduledAt).getTime();
          if (event.id !== eventId && eventTime > targetTime) {
            const futureEvents = doseEvents
              .filter((item) => item.id !== eventId && item.medicationId === medication.id && (item.status === "pending" || item.status === "snoozed") && new Date(item.scheduledAt).getTime() > targetTime)
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
            const nextIndex = futureEvents.findIndex((item) => item.id === event.id);
            shiftedEventIds.add(event.id);
            if (event.notificationId) {
              shiftedNotificationIds.push(event.notificationId);
            }
            return {
              ...event,
              status: "pending",
              notificationId: undefined,
              scheduledAt: new Date(takenAt.getTime() + medication.frequencyMinutes * 60000 * (nextIndex + 1)).toISOString()
            };
          }
        }

        return event;
      });

    if (shiftedNotificationIds.length > 0) {
      await Promise.all(shiftedNotificationIds.map((notificationId) => cancelDoseNotification(notificationId)));
    }

    if (shiftedEventIds.size > 0 && medication) {
      const shiftedEvents = nextDoseEventsState.filter((event) => shiftedEventIds.has(event.id));
      const scheduledShiftedEvents = await attachNotificationsToEvents(shiftedEvents, [medication]);
      const notificationByEventId = new Map(scheduledShiftedEvents.filter((event) => event.notificationId).map((event) => [event.id, event.notificationId]));
      nextDoseEventsState = nextDoseEventsState.map((event) => {
        const notificationId = notificationByEventId.get(event.id);
        return notificationId ? { ...event, notificationId } : event;
      });
    }

    setDoseEvents(nextDoseEventsState);

    if (status === "taken" && medication && !wasTaken) {
      setMedications((current) =>
        current.map((item) =>
          item.id === medication.id
            ? {
                ...item,
                remainingUnits: Math.max(0, item.remainingUnits - item.unitsPerDose)
              }
            : item
          )
      );
    }
  }

  function openEditRecipe(recipe: Recipe) {
    const firstMedication = medications.find((medication) => medication.recipeId === recipe.id);
    const parsedDoctor = parseDoctorLabel(recipe.doctor ?? "");
    setEditingRecipeId(recipe.id);
    setEditRecipeTitle(recipe.title);
    setEditRecipeDoctorPrefix(parsedDoctor.prefix);
    setEditRecipeDoctor(parsedDoctor.name);
    setEditingMedicationId(firstMedication?.id ?? "");
    setEditDraft(firstMedication ? draftFromMedication(firstMedication) : emptyDraft);
    setEditModalOpen(true);
  }

  function selectEditingMedication(medicationId: string) {
    const medication = medications.find((item) => item.id === medicationId);
    if (!medication) {
      return;
    }
    setEditingMedicationId(medication.id);
    setEditDraft(draftFromMedication(medication));
  }

  async function saveRecipeEdits() {
    setRecipes((current) =>
      current.map((recipe) =>
        recipe.id === editingRecipeId
          ? {
              ...recipe,
              title: editRecipeTitle.trim() || recipe.title,
              doctor: buildDoctorLabel(editRecipeDoctorPrefix, editRecipeDoctor) || undefined
            }
          : recipe
      )
    );

    const currentMedication = medications.find((item) => item.id === editingMedicationId);
    if (currentMedication) {
      const safeEditDraft = {
        ...editDraft,
        firstTime: normalizeTimeValue(editDraft.firstTime || currentMedication.times[0] || currentTimeKey()),
        frequencyMinutes: editDraft.frequencyMinutes || currentMedication.frequencyMinutes || 480,
        durationDays: editDraft.durationDays || currentMedication.durationDays || 1
      };
      const totalUnits = getTotalUnits(safeEditDraft);
      const updatedMedication: Medication = {
        ...currentMedication,
        name: safeEditDraft.name.trim() || currentMedication.name,
        dose: formatMedicationDose(safeEditDraft),
        instructions: safeEditDraft.instructions.trim() || currentMedication.instructions,
        frequencyMinutes: safeEditDraft.frequencyMinutes,
        durationDays: safeEditDraft.durationDays,
        times: getDraftTimes(safeEditDraft),
        totalUnits,
        remainingUnits: Math.min(currentMedication.remainingUnits, totalUnits),
        unitsPerDose: getUnitsPerDose(safeEditDraft),
        unitsPerContainer: Number(safeEditDraft.unitsPerContainer) || currentMedication.unitsPerContainer,
        containerCount: Number(safeEditDraft.containerCount) || currentMedication.containerCount,
        unitLabel: safeEditDraft.unitLabel || currentMedication.unitLabel
      };
      const oldPendingEvents = doseEvents.filter((event) => event.medicationId === updatedMedication.id && (event.status === "pending" || event.status === "snoozed"));
      await cancelNotificationsForEvents(oldPendingEvents);
      const replacementEvents = await attachNotificationsToEvents(buildDoseEvents(updatedMedication), [updatedMedication]);

      setMedications((current) => current.map((item) => (item.id === updatedMedication.id ? updatedMedication : item)));
      setDoseEvents((current) => [
        ...current.filter((event) => event.medicationId !== updatedMedication.id || event.status === "taken" || event.status === "skipped"),
        ...replacementEvents
      ]);
    }

    setEditModalOpen(false);
  }

  function openInventoryAddModal(medication: Medication) {
    setInventoryMedicationId(medication.id);
    setInventoryFlow("add");
    setInventoryMode("pick");
    setInventoryAmount("");
    setInventoryUnitsPerContainer("");
    setInventoryContainerCount("");
    setInventorySuccess("");
    setInventoryModalOpen(true);
  }

  function openInventoryAdjustModal(medication: Medication) {
    setInventoryMedicationId(medication.id);
    setInventoryFlow("adjust");
    setInventoryMode("adjust");
    setInventoryAmount(`${medication.remainingUnits}`);
    setInventoryUnitsPerContainer(`${medication.unitsPerContainer}`);
    setInventoryContainerCount(`${medication.containerCount}`);
    setInventorySuccess("");
    setInventoryModalOpen(true);
  }

  function moveInventoryAmountByDose(direction: 1 | -1) {
    const medication = inventoryMedication;
    if (!medication) {
      return;
    }
    const currentAmount = Number(inventoryAmount) || 0;
    const nextAmount = Math.max(0, currentAmount + direction * medication.unitsPerDose);
    setInventoryAmount(`${Number(nextAmount.toFixed(2))}`);
  }

  function requestConfirmation(nextConfirmation: ConfirmationState) {
    setConfirmation(nextConfirmation);
  }

  function clearInventory(medication: Medication) {
    requestConfirmation({
      title: "Borrar inventario",
      message: `El inventario de ${medication.name} quedara en 0.`,
      confirmLabel: "Borrar",
      danger: true,
      onConfirm: () => {
        setMedications((current) =>
          current.map((item) =>
            item.id === medication.id
              ? {
                  ...item,
                  remainingUnits: 0
                }
              : item
          )
        );
      }
    });
  }

  function confirmInventoryAdd() {
    const medication = inventoryMedication;
    if (!medication || inventoryMode === "pick") {
      return;
    }

    const amount = Math.max(0, Number(inventoryAmount) || 0);
    const unitsPerContainer = Number(inventoryUnitsPerContainer) || medication.unitsPerContainer;
    const containerCount = Math.max(0, Number(inventoryContainerCount) || 0);
    let successText = "";

    setMedications((current) =>
      current.map((item) =>
        item.id === medication.id
          ? (() => {
              if (inventoryMode === "container") {
                const addedUnits = unitsPerContainer * containerCount;
                successText = `${containerCount} frasco/caja agregado correctamente`;
                return {
                  ...item,
                  unitsPerContainer,
                  containerCount: item.containerCount + containerCount,
                  totalUnits: item.totalUnits + addedUnits,
                  remainingUnits: item.remainingUnits + addedUnits
                };
              }

              if (inventoryMode === "adjust") {
                successText = "Inventario ajustado correctamente";
                return {
                  ...item,
                  unitsPerContainer,
                  containerCount,
                  totalUnits: Math.max(amount, unitsPerContainer * containerCount),
                  remainingUnits: amount
                };
              }

              successText = `${inventoryUnitLabel(item.unitLabel)} agregadas correctamente`;
              return {
                ...item,
                totalUnits: item.totalUnits + amount,
                remainingUnits: item.remainingUnits + amount
              };
            })()
          : item
      )
    );

    setInventorySuccess(successText || `${inventoryUnitLabel(medication.unitLabel)} agregadas correctamente`);
    setTimeout(() => {
      setInventoryModalOpen(false);
      setInventorySuccess("");
    }, 900);
  }

  function openProfileModal(profile?: Profile) {
    setEditingProfileId(profile?.id ?? "");
    setProfileName(profile?.name ?? "");
    setProfileRelationship(profile?.relationship ?? "");
    setProfileAge(profile?.age ?? "");
    setProfileGender(profile?.gender ?? "Adulto");
    setProfileIcon(profile?.icon ?? "adult");
    setProfileColor(profile?.color ?? colorOptions[0]);
    setProfileModalOpen(true);
  }

  function saveProfile() {
    if (!profileName.trim()) {
      showNotice("Falta el nombre", "Agrega el nombre del perfil para continuar.", "warning");
      return;
    }

    const creatingFirstProfile = !editingProfileId && profiles.length === 0;
    const nextProfile: Profile = {
      id: editingProfileId || makeId("profile"),
      name: profileName.trim() || "Nuevo perfil",
      relationship: profileRelationship.trim() || "Familia",
      age: profileAge.trim(),
      gender: profileGender,
      icon: profileIcon,
      color: profileColor
    };

    if (editingProfileId) {
      setProfiles((current) => current.map((profile) => (profile.id === editingProfileId ? nextProfile : profile)));
    } else {
      setProfiles((current) => [...current, nextProfile]);
      setSelectedProfileId(nextProfile.id);
      setTab("today");
    }

    setProfileModalOpen(false);
    if (creatingFirstProfile && !tutorialSeen) {
      startTutorial();
    }
  }

  function deleteProfile(profileId: string) {
    if (profiles.length <= 1) {
      showNotice("No se puede eliminar", "Necesitas conservar al menos un perfil.", "warning");
      return;
    }

    const profile = profiles.find((item) => item.id === profileId);
    requestConfirmation({
      title: "Eliminar perfil",
      message: `Se eliminará ${profile?.name ?? "este perfil"} junto con sus recetas, medicamentos y registros.`,
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: () => {
        const nextProfiles = profiles.filter((item) => item.id !== profileId);
        void cancelNotificationsForEvents(doseEvents.filter((event) => event.profileId === profileId));
        setProfiles(nextProfiles);
        setRecipes((current) => current.filter((recipe) => recipe.profileId !== profileId));
        setMedications((current) => current.filter((medication) => medication.profileId !== profileId));
        setDoseEvents((current) => current.filter((event) => event.profileId !== profileId));
        if (selectedProfileId === profileId) {
          setSelectedProfileId(nextProfiles[0]?.id ?? "");
        }
      }
    });
  }

  function deleteRecipe(recipeId: string, afterDelete?: () => void) {
    if (!recipeId) {
      return;
    }

    requestConfirmation({
      title: "Eliminar receta",
      message: "Se eliminará la receta, sus medicamentos y alarmas pendientes.",
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: () => {
        void cancelNotificationsForEvents(doseEvents.filter((event) => event.recipeId === recipeId));
        setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
        setMedications((current) => current.filter((medication) => medication.recipeId !== recipeId));
        setDoseEvents((current) => current.filter((event) => event.recipeId !== recipeId));
        afterDelete?.();
      }
    });
  }

  function openDonation() {
    if (!DONATION_URL) {
      showNotice(
        "Donacion pendiente",
        "Para activar este botón agrega un link real de Mercado Pago o PayPal.me. Para México conviene dejar ambas opciones disponibles.",
        "info"
      );
      return;
    }

    void Linking.openURL(DONATION_URL);
  }

function buildContactText() {
  return `Nombre: ${contactName || "Sin nombre"}\nContacto: ${contactMethod || "No indicado"}\nMensaje: ${contactMessage || "Sin mensaje"}`;
}

  function sendContactByWhatsapp() {
    void Linking.openURL(`https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(buildContactText())}`);
  }

  function sendContactByEmail() {
    const subject = encodeURIComponent("Mensaje desde Kura");
    const body = encodeURIComponent(buildContactText());
    void Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`);
  }

  function openSkipDoseModal(eventId: string) {
    setSkipEventId(eventId);
    setSkipReason("");
    setSkipModalOpen(true);
  }

  function confirmSkipDose() {
    if (!skipEventId) {
      return;
    }

    void updateDoseStatus(skipEventId, "skipped", { skippedReason: skipReason });
    setSkipModalOpen(false);
    setSkipEventId("");
    setSkipReason("");
  }

  function confirmPendingAction() {
    const action = confirmation?.onConfirm;
    setConfirmation(null);
    action?.();
  }

  function startTutorial(stepIndex = 0) {
    const safeIndex = Math.min(Math.max(stepIndex, 0), tutorialSteps.length - 1);
    setTutorialStepIndex(safeIndex);
    setTab(tutorialSteps[safeIndex].tab);
    setTutorialModalOpen(true);
  }

  function advanceTutorial() {
    const nextIndex = tutorialStepIndex + 1;
    if (nextIndex >= tutorialSteps.length) {
      finishTutorial();
      return;
    }

    setTutorialStepIndex(nextIndex);
    setTab(tutorialSteps[nextIndex].tab);
  }

  function finishTutorial() {
    setTutorialSeen(true);
    setTutorialModalOpen(false);
    setTutorialStepIndex(0);
  }

  function renderSplash() {
    return (
      <SafeAreaView style={styles.safe}>
        <AppStatusBar />
        <View style={styles.splashScreen}>
          <KuraLogo size={190} />
          <Text style={styles.splashTitle}>{APP_NAME}</Text>
          <Text style={styles.splashTagline}>Tu salud a tiempo</Text>
        </View>
      </SafeAreaView>
    );
  }

  function renderAuthScreen() {
    const isRecover = authMode === "recover";
    const isSignup = authMode === "signup";
    const actionLabel = isRecover ? "Recuperar acceso" : isSignup ? "Crear cuenta" : "Iniciar sesión";
    const heading = isSignup ? "Crea tu cuenta" : isRecover ? "Recupera tu acceso" : "Iniciar sesión";

    return (
      <SafeAreaView style={styles.safe}>
        <AppStatusBar />
        <KeyboardAvoidingView style={styles.keyboardScreen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.authScroll}
          contentContainerStyle={styles.authScreen}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.authBrand}>
            <KuraLogo size={118} />
            <Text style={styles.authAppName}>{APP_NAME}</Text>
            <Text style={styles.authTagline}>Tu salud a tiempo</Text>
          </View>

          <View style={styles.authPanel}>
            <Text style={styles.authTitle}>{heading}</Text>

            {shouldShowSavedAccountLogin && selectedDeviceAccount ? (
              <View style={styles.savedLoginStack}>
                {deviceAccounts.length > 1 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedAccountChips}>
                    {deviceAccounts.map((account) => {
                      const active = account.id === selectedDeviceAccount.id;
                      return (
                        <Pressable
                          key={account.id}
                          style={[styles.savedAccountChip, active && styles.savedAccountChipActive]}
                          onPress={() => {
                            Keyboard.dismiss();
                            setSelectedDeviceAccountId(account.id);
                            setStoredAuthUser(account);
                            setAuthSecret("");
                          }}
                        >
                          <Text style={[styles.savedAccountChipText, active && styles.savedAccountChipTextActive]}>{account.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                <View style={styles.biometricPanel}>
                  <Fingerprint color={theme.colors.primaryDark} size={24} />
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{selectedDeviceAccount.name}</Text>
                    <Text style={styles.muted}>Cuenta guardada en este teléfono.</Text>
                  </View>
                </View>

                {selectedDeviceAccount.provider === "email" ? (
                  <>
                    <FloatingInput label="Contraseña" value={authSecret} onChangeText={setAuthSecret} secureTextEntry />
                    <Pressable style={styles.secondaryButton} onPress={() => void loginSavedAccountWithPassword()}>
                      <Text style={styles.secondaryButtonText}>Entrar con contraseña</Text>
                    </Pressable>
                  </>
                ) : null}

                {biometricAvailable ? (
                  <Pressable style={styles.primaryButton} onPress={() => void unlockWithBiometrics(selectedDeviceAccount)} disabled={biometricChecking}>
                    <Fingerprint color={theme.colors.white} size={18} />
                    <Text style={styles.primaryButtonText}>{biometricChecking ? "Revisando" : "Entrar con huella"}</Text>
                  </Pressable>
                ) : (
                  <View style={styles.authNotice}>
                    <BadgeInfo color={theme.colors.primaryDark} size={18} />
                    <Text style={styles.authNoticeText}>Configura huella o biometría en el teléfono para activar esta entrada rápida.</Text>
                  </View>
                )}

                {authNotice ? (
                  <View style={styles.authNotice}>
                    <BadgeInfo color={theme.colors.primaryDark} size={18} />
                    <Text style={styles.authNoticeText}>{authNotice}</Text>
                  </View>
                ) : null}

                <Pressable
                  style={styles.authLinkButton}
                  onPress={() => {
                    setUseManualAuthForm(true);
                    setAuthSecret("");
                    setAuthNotice("");
                    setAuthMode("login");
                  }}
                >
                  <Text style={styles.authInlineText}>¿Quieres usar otra cuenta?</Text>
                </Pressable>
              </View>
            ) : null}

            {!shouldShowSavedAccountLogin ? <FormSectionTitle title="Datos para iniciar sesión" /> : null}
            {!shouldShowSavedAccountLogin ? (
              <>
            <View style={styles.authMethodRow}>
              <Pressable
                style={[styles.authMethodButton, authMethod === "email" && styles.authMethodButtonActive]}
                onPress={() => {
                  setAuthMethod("email");
                  setPhoneCodeState(null);
                  setAuthSecret("");
                  setAuthNotice("");
                }}
              >
                <Text style={[styles.authMethodText, authMethod === "email" && styles.authMethodTextActive]}>Correo</Text>
              </Pressable>
              <Pressable
                style={[styles.authMethodButton, authMethod === "phone" && styles.authMethodButtonActive]}
                onPress={() => {
                  setAuthMethod("phone");
                  setPhoneCodeState(null);
                  nativePhoneConfirmationRef.current = null;
                  setAuthSecret("");
                  setAuthNotice("");
                }}
              >
                <Text style={[styles.authMethodText, authMethod === "phone" && styles.authMethodTextActive]}>Celular</Text>
              </Pressable>
            </View>

            {isSignup ? <FloatingInput label="Nombre" value={authName} onChangeText={setAuthName} /> : null}
            <FloatingInput
              label={authMethod === "email" ? "Correo" : "Número celular"}
              value={authIdentifier}
              onChangeText={setAuthIdentifier}
              keyboardType={authMethod === "email" ? "email-address" : "phone-pad"}
            />
            {authMethod === "phone" ? (
              <Pressable style={styles.secondaryButton} onPress={() => void sendPhoneCode()}>
                <MessageCircle color={theme.colors.primaryDark} size={18} />
                <Text style={styles.secondaryButtonText}>{phoneCodeState ? "Reenviar código" : "Enviar código"}</Text>
              </Pressable>
            ) : null}
            {((authMethod === "email" && !isRecover) || (authMethod === "phone" && phoneCodeState)) ? (
              <FloatingInput
                label={authMethod === "email" ? "Contraseña" : "Código de verificación"}
                value={authSecret}
                onChangeText={setAuthSecret}
                secureTextEntry={authMethod === "email"}
                keyboardType={authMethod === "email" ? "default" : "numeric"}
              />
            ) : null}
            {isSignup && authMethod === "email" ? (
              <Text style={styles.passwordHint}>Usa al menos 6 caracteres. Mejor si combinas letras y números.</Text>
            ) : null}

            {authNotice ? (
              <View style={styles.authNotice}>
                <BadgeInfo color={theme.colors.primaryDark} size={18} />
                <Text style={styles.authNoticeText}>{authNotice}</Text>
              </View>
            ) : null}

            <Pressable style={styles.primaryButton} onPress={() => void handleAuthSubmit()}>
              <Text style={styles.primaryButtonText}>{actionLabel}</Text>
            </Pressable>

            {!isRecover ? (
              <Pressable style={styles.authLinkButton} onPress={() => resetAuthForm("recover")}>
                <Text style={styles.authInlineText}>¿Olvidaste tu contraseña? <Text style={styles.authInlineLink}>Recupérala</Text></Text>
              </Pressable>
            ) : (
              <Pressable style={styles.authLinkButton} onPress={() => resetAuthForm("login")}>
                <Text style={styles.authInlineText}>Ya recordé mi acceso. <Text style={styles.authInlineLink}>Iniciar sesión</Text></Text>
              </Pressable>
            )}

            {!isRecover ? (
              <>
                <Text style={styles.authDividerText}>Otras opciones de inicio de sesión</Text>
                <View style={styles.socialButtons}>
                  <Pressable style={styles.socialButton} onPress={() => void handleSocialSignIn("google")}>
                    <GoogleLogo />
                  </Pressable>
                  <Pressable style={styles.socialButton} onPress={() => void handleSocialSignIn("facebook")}>
                    <FacebookLogo />
                  </Pressable>
                </View>
              </>
            ) : null}

            {!isRecover ? (
              <Pressable style={styles.authLinkButton} onPress={() => resetAuthForm(isSignup ? "login" : "signup")}>
                <Text style={styles.authInlineText}>
                  {isSignup ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
                  <Text style={styles.authInlineLink}>{isSignup ? "Inicia sesión" : "Crea una"}</Text>
                </Text>
              </Pressable>
            ) : null}
              </>
            ) : null}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  function renderToday() {
    return (
      <View style={styles.screen}>
        <View style={styles.todayHeader}>
          <View>
            <Text style={styles.eyebrow}>Hoy</Text>
            <Text style={styles.title}>{selectedProfile?.name ?? "Sin perfil"}</Text>
          </View>
        </View>

        <View style={[styles.callout, { borderColor: nextDoseEvents.length > 0 ? theme.colors.primary : theme.colors.line }]}>
          {nextDoseEvents.length > 0 ? (
            <View style={styles.nextDoseStack}>
              <View style={styles.nextHeader}>
                <BellRing color={theme.colors.primaryDark} size={22} />
                <Text style={styles.nextLabel}>Siguiente dosis</Text>
              </View>
              {nextDoseEvents.map((event, index) => (
                <DoseSummary
                  key={event.id}
                  event={event}
                  medication={medicationFor(event)}
                  doseMarker={doseMarkerFor(event)}
                  showHeader={false}
                  divided={index > 0}
                  onTaken={() => void updateDoseStatus(event.id, "taken")}
                  onSnooze={() => void updateDoseStatus(event.id, "snoozed")}
                  onSkip={() => openSkipDoseModal(event.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyBlock}>
              <Check color={theme.colors.primary} size={26} />
              <Text style={styles.cardTitle}>Todo listo por ahora</Text>
              <Text style={styles.muted}>La agenda se actualiza con las recetas activas.</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Completadas" value={`${takenToday}`} />
          <Stat label="Pospuesto" value={formatMinutes(snoozedMinutesToday)} />
          <Stat label="Omitidas" value={`${skippedToday.length}`} />
        </View>

        {activeSnoozedEvents.length > 0 ? (
          <View style={styles.snoozedPanel}>
            <Text style={styles.snoozedPanelTitle}>POSPUESTO</Text>
            {activeSnoozedEvents.map((event) => {
              const med = medicationFor(event);
              return (
                <Text key={`postponed-${event.id}`} style={styles.snoozedPanelText}>
                  {med?.name ?? "Medicamento"} - {formatTime(event.scheduledAt)} - {formatMinutes(getSnoozedMinutes(event, nowTick))}
                </Text>
              );
            })}
          </View>
        ) : null}

        {rhythmSummaries.length > 0 && (
          <View style={styles.warningPanel}>
            <View style={styles.rowBetween}>
              <View style={styles.nextHeader}>
                <BadgeInfo color={theme.colors.primaryDark} size={20} />
                <Text style={styles.cardTitle}>Cuidado con el ritmo</Text>
              </View>
              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>{todayScore}/100</Text>
              </View>
            </View>
            {rhythmSummaries.map((summary) => (
              <Text key={summary.id} style={styles.muted}>
                <Text style={styles.rhythmRecipeName}>{summary.title}: </Text>
                {summary.message}
              </Text>
            ))}
          </View>
        )}

        <SectionTitle title="Siguientes dosis" />
        {upcomingDoseEvents.length === 0 ? (
          <EmptyState text="No hay tomas pendientes." />
        ) : (
          upcomingDoseEvents.map((event) => (
            <DoseRow
              key={event.id}
              event={event}
              medication={medicationFor(event)}
              doseMarker={doseMarkerFor(event)}
              onTaken={() => void updateDoseStatus(event.id, "taken")}
              onSnooze={() => void updateDoseStatus(event.id, "snoozed")}
              onSkip={() => openSkipDoseModal(event.id)}
              showActions={false}
            />
          ))
        )}

        {skippedToday.length > 0 ? (
          <>
            <SectionTitle title="No se tomo" />
            {skippedToday.map((event) => (
              <DoseRow
                key={event.id}
                event={event}
                medication={medicationFor(event)}
                doseMarker={doseMarkerFor(event)}
                onTaken={() => void updateDoseStatus(event.id, "taken")}
                onSnooze={() => void updateDoseStatus(event.id, "snoozed")}
                onSkip={() => openSkipDoseModal(event.id)}
              />
            ))}
          </>
        ) : null}

        <SectionTitle title="COMPLETADO" />
        {completedToday.length === 0 ? (
          <EmptyState text="Aún no hay tomas completadas hoy." />
        ) : (
          completedToday.map((event) => <DoseRow key={event.id} event={event} medication={medicationFor(event)} doseMarker={doseMarkerFor(event)} onTaken={() => undefined} onSnooze={() => undefined} onSkip={() => undefined} />)
        )}
      </View>
    );
  }

  function renderRecipes() {
    return (
      <View style={styles.screen}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.eyebrow}>Recetas</Text>
            <Text style={styles.title}>Tratamientos</Text>
          </View>
        </View>

        {profileRecipes.length === 0 ? (
          <EmptyState text="Este perfil aun no tiene recetas." />
        ) : (
          profileRecipes.map((recipe) => {
            const recipeMedications = profileMedications.filter((medication) => medication.recipeId === recipe.id);

            return (
              <View key={recipe.id} style={styles.card}>
                <View style={styles.rowBetweenTop}>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{recipe.title}</Text>
                    <Text style={styles.muted}>
                      {recipe.doctor ? `${recipe.doctor} - ` : ""}
                      {formatShortDate(recipe.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.recipeCardActions}>
                    <Pressable style={styles.editRecipeButton} onPress={() => openEditRecipe(recipe)}>
                      <SquarePen color={theme.colors.primaryDark} size={16} />
                      <Text style={styles.editRecipeText}>Editar receta</Text>
                    </Pressable>
                    <Pressable style={styles.deleteRecipeButton} onPress={() => deleteRecipe(recipe.id)}>
                      <Trash2 color={theme.colors.white} size={16} />
                      <Text style={styles.deleteRecipeText}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>

                {recipe.photoUri ? <Image source={{ uri: recipe.photoUri }} style={styles.recipeImage} /> : null}

                <View style={styles.medicationMiniList}>
                  {recipeMedications.length === 0 ? (
                    <Text style={styles.muted}>Sin medicamentos registrados.</Text>
                  ) : (
                    recipeMedications.map((medication) => {
                      const UnitIcon = getUnitIcon(medication.unitLabel);
                      return (
                        <View key={medication.id} style={styles.miniRow}>
                          <UnitIcon color={medication.color} size={19} />
                          <Text style={styles.miniText}>{medication.name}</Text>
                          <Text style={styles.softText}>{formatFrequency(medication.frequencyMinutes)}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  }

  function renderInventory() {
    return (
      <View style={styles.screen}>
        <Text style={styles.eyebrow}>Inventario</Text>
        <Text style={styles.title}>Lo que queda</Text>

        {profileMedications.length === 0 ? (
          <EmptyState text="Los niveles apareceran al agregar medicamentos." />
        ) : (
          profileMedications.map((medication) => {
            const percent = getStockPercent(medication);
            const stockLevel = getStockLevel(medication);
            const barColor =
              stockLevel === "ok" ? theme.colors.primary : stockLevel === "low" ? theme.colors.yellow : theme.colors.rose;
            const UnitIcon = getUnitIcon(medication.unitLabel);

            return (
              <View key={medication.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.inventoryTitleRow}>
                    <View style={[styles.unitIconBubble, { backgroundColor: medication.color }]}>
                      <UnitIcon color={theme.colors.white} size={20} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>{medication.name}</Text>
                      <Text style={styles.muted}>
                        {medication.remainingUnits} de {medication.totalUnits} {inventoryUnitLabel(medication.unitLabel)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.stockBadge, { backgroundColor: barColor }]}>
                    <Text style={styles.stockBadgeText}>{percent}%</Text>
                  </View>
                </View>

                <View style={styles.stockTrack}>
                  <View style={[styles.stockFill, { width: `${percent}%`, backgroundColor: barColor }]} />
                </View>

                <View style={styles.inventoryActions}>
                  <Text style={styles.inventoryStatusText}>
                    {stockLevel === "ok" ? "Suficiente" : stockLevel === "low" ? "Queda poco" : "Casi se acaba"}
                  </Text>
                  <Pressable style={[styles.inlineButton, styles.inventoryActionButton]} onPress={() => openInventoryAddModal(medication)}>
                    <PackagePlus color={theme.colors.primaryDark} size={18} />
                    <Text style={styles.inlineButtonText}>Agregar</Text>
                  </Pressable>
                  <Pressable style={[styles.inlineButton, styles.inventoryActionButton]} onPress={() => openInventoryAdjustModal(medication)}>
                    <SlidersHorizontal color={theme.colors.primaryDark} size={18} />
                    <Text style={styles.inlineButtonText}>Ajustar</Text>
                  </Pressable>
                  <Pressable style={[styles.deleteInventoryButton, styles.inventoryActionButton]} onPress={() => clearInventory(medication)}>
                    <Trash2 color={theme.colors.white} size={18} />
                    <Text style={styles.deleteInventoryText}>Borrar</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  }

  function renderHistory() {
    const selectedRecipeEvents = profileDoseEvents.filter((event) => historyRecipeFilter === "all" || event.recipeId === historyRecipeFilter);
    const availableDateKeys = Array.from(new Set(selectedRecipeEvents.map((event) => dateKeyFromIso(event.scheduledAt)))).sort();
    const selectedDateKey = historyDateFilter === "today" ? todayDateKey() : historySelectedDateKey;
    const filteredHistory = profileDoseEvents
      .filter((event) => historyRecipeFilter === "all" || event.recipeId === historyRecipeFilter)
      .filter((event) => historyDateFilter === "all" || dateKeyFromIso(event.scheduledAt) === selectedDateKey)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const completed = filteredHistory.filter((event) => event.status === "taken").length;
    const pending = filteredHistory.filter((event) => event.status === "pending" || event.status === "snoozed").length;
    const skipped = filteredHistory.filter((event) => event.status === "skipped").length;
    const snoozedMinutes = filteredHistory.reduce((total, event) => total + (event.status === "snoozed" || event.snoozeCount ? getSnoozedMinutes(event, nowTick) : 0), 0);
    const periodLabel = historyRecipeFilter === "all" ? "Todos los tratamientos" : "Todo el tratamiento";
    const historyTitle =
      historyDateFilter === "all"
        ? historyRecipeFilter === "all"
          ? "Historial de tratamientos"
          : "Historial del tratamiento"
        : historyDateFilter === "today"
          ? "Historial de hoy"
          : `Historial del ${formatShortDate(`${historySelectedDateKey}T00:00:00`)}`;

    return (
      <View style={styles.screen}>
        <Text style={styles.eyebrow}>Historial</Text>
        <Text style={styles.title}>Registro</Text>

        <View style={styles.historyDashboard}>
          <MetricCard label="Completado" value={`${completed}`} color={theme.colors.primary} />
          <MetricCard label="Pendiente" value={`${pending}`} color={theme.colors.apricot} />
          <MetricCard label="Pospuesto" value={formatMinutes(snoozedMinutes)} color={theme.colors.blue} />
          <MetricCard label="Omitido" value={`${skipped}`} color={theme.colors.rose} />
        </View>

        <SectionTitle title="Tratamiento" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Pressable
            style={[styles.chip, historyRecipeFilter === "all" && styles.chipActive]}
            onPress={() => {
              setHistoryRecipeFilter("all");
              setHistoryDateFilter("today");
              setHistoryCalendarOpen(false);
            }}
          >
            <Text style={[styles.chipText, historyRecipeFilter === "all" && styles.chipTextActive]}>Todas</Text>
          </Pressable>
          {profileRecipes.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={[styles.chip, historyRecipeFilter === recipe.id && styles.chipActive]}
              onPress={() => {
                setHistoryRecipeFilter(recipe.id);
                setHistoryDateFilter("today");
                setHistoryCalendarOpen(false);
              }}
            >
              <Text style={[styles.chipText, historyRecipeFilter === recipe.id && styles.chipTextActive]}>{recipe.title}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle title="Fecha" />
        <View style={styles.segmented}>
          <Pressable
            style={[styles.segment, historyDateFilter === "today" && styles.segmentActive]}
            onPress={() => {
              setHistoryDateFilter("today");
              setHistoryCalendarOpen(false);
            }}
          >
            <Text style={[styles.segmentText, historyDateFilter === "today" && styles.segmentTextActive]}>Hoy</Text>
          </Pressable>
          <Pressable
            style={[styles.segment, historyDateFilter === "custom" && styles.segmentActive]}
            onPress={() => {
              const firstAvailable = availableDateKeys[0] ?? todayDateKey();
              setHistoryDateFilter("custom");
              setHistorySelectedDateKey(availableDateKeys.includes(historySelectedDateKey) ? historySelectedDateKey : firstAvailable);
              setHistoryCalendarMonth(new Date(`${firstAvailable}T00:00:00`));
              setHistoryCalendarOpen((open) => !open);
            }}
          >
            <Text style={[styles.segmentText, historyDateFilter === "custom" && styles.segmentTextActive]}>Seleccionar fecha</Text>
          </Pressable>
          <Pressable
            style={[styles.segment, historyDateFilter === "all" && styles.segmentActive]}
            onPress={() => {
              setHistoryDateFilter("all");
              setHistoryCalendarOpen(false);
            }}
          >
            <Text style={[styles.segmentText, historyDateFilter === "all" && styles.segmentTextActive]}>{periodLabel}</Text>
          </Pressable>
        </View>

        {historyCalendarOpen ? (
          <View style={styles.calendarPanel}>
            <View style={styles.rowBetween}>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() => setHistoryCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              >
                <Text style={styles.calendarNavText}>Anterior</Text>
              </Pressable>
              <Text style={styles.calendarTitle}>{monthLabel(historyCalendarMonth)}</Text>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() => setHistoryCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              >
                <Text style={styles.calendarNavText}>Siguiente</Text>
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {["D", "L", "M", "M", "J", "V", "S"].map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {buildMonthCells(historyCalendarMonth).map((date, index) => {
                const key = date ? todayDateKey(date) : `empty-${index}`;
                const available = date ? availableDateKeys.includes(key) : false;
                const selected = key === selectedDateKey;
                return (
                  <Pressable
                    key={key}
                    disabled={!available}
                    style={[styles.calendarDay, !date && styles.calendarDayEmpty, date && !available && styles.calendarDayDisabled, selected && styles.calendarDaySelected]}
                    onPress={() => {
                      if (date && available) {
                        setHistorySelectedDateKey(key);
                        setHistoryDateFilter("custom");
                      }
                    }}
                  >
                    <Text style={[styles.calendarDayText, !available && date && styles.calendarDayTextDisabled, selected && styles.calendarDayTextSelected]}>
                      {date ? date.getDate() : ""}
                    </Text>
                    {available ? <View style={styles.calendarDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <SectionTitle title={historyTitle} />
        {filteredHistory.length === 0 ? (
          <EmptyState text="No hay registros con estos filtros." />
        ) : (
          filteredHistory.map((event) => <HistoryRow key={`history-${event.id}`} event={event} medication={medicationFor(event)} />)
        )}
      </View>
    );
  }

  function renderProfile() {
    return (
      <View style={[styles.screen, styles.profileScreen]}>
        <View style={styles.rowBetween}>
          <Text style={styles.profileTitle}>Perfiles</Text>
          <Pressable style={styles.addProfileButton} onPress={() => openProfileModal()}>
            <Plus color={theme.colors.primaryDark} size={22} />
            <Text style={styles.addProfileButtonText}>Agregar perfil</Text>
          </Pressable>
        </View>

        {profiles.length === 0 ? <EmptyState text="Agrega un perfil para empezar a registrar recetas." /> : null}

        {profiles.map((profile) => {
          const Icon = getProfileIcon(profile);
          const active = selectedProfileId === profile.id;
          return (
            <Pressable key={profile.id} style={[styles.profileCard, active && styles.profileCardActive]} onPress={() => setSelectedProfileId(profile.id)}>
              <View style={[styles.profileIconBubble, { backgroundColor: profile.color }]}>
                <Icon color={theme.colors.white} size={30} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.muted}>
                  {profile.gender} {profile.age ? `- ${profileAgeText(profile.age)}` : ""} - {profile.relationship}
                </Text>
              </View>
              <View style={styles.profileActions}>
                <Pressable style={styles.iconSoftButton} onPress={() => openProfileModal(profile)}>
                  <SquarePen color={theme.colors.primaryDark} size={18} />
                </Pressable>
                <Pressable style={styles.iconDangerButton} onPress={() => deleteProfile(profile.id)}>
                  <Trash2 color={theme.colors.white} size={17} />
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        <View style={styles.treatmentPanel}>
          <View style={styles.nextHeader}>
            <CalendarClock color={theme.colors.primaryDark} size={20} />
            <Text style={styles.cardTitle}>Tratamientos</Text>
          </View>
          {profiles.map((profile) => {
            const profileRecipeList = recipes.filter((recipe) => recipe.profileId === profile.id);
            return (
              <View key={`${profile.id}-treatments`} style={styles.treatmentSummaryRow}>
                <Text style={styles.baseTimeName}>{profile.name}</Text>
                {profileRecipeList.length === 0 ? (
                  <Text style={styles.muted}>Sin tratamientos activos</Text>
                ) : (
                  profileRecipeList.map((recipe) => {
                    const meds = medications.filter((medication) => medication.recipeId === recipe.id);
                    return (
                      <Text key={`${profile.id}-${recipe.id}`} style={styles.muted}>
                        <Text style={styles.treatmentRecipeName}>{recipe.title}: </Text>
                        {meds.length === 0 ? "Sin medicamentos" : meds.map((medication) => `${medication.name} ${formatFrequency(medication.frequencyMinutes).toLowerCase()}`).join(" e ")}
                      </Text>
                    );
                  })
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.aboutPanel}>
          <View style={styles.aboutCentered}>
            <Info color={theme.colors.primaryDark} size={26} />
            <Text style={styles.cardTitle}>Acerca de Kura</Text>
            <Text style={styles.mutedCentered}>Kura ayuda a recordar tratamientos registrados por la persona. No recomienda dosis ni sustituye indicaciones médicas.</Text>
            <Text style={styles.mutedCentered}>Versión {APP_VERSION} - Desarrollado por @{DEVELOPER_GITHUB}</Text>
            <Text style={styles.mutedCentered}>Esta app se hace sin fines de lucro para que organizar medicamentos sea menos pesado para familias y cuidadores.</Text>
          </View>
          <View style={styles.aboutActions}>
            <Pressable style={styles.primaryButtonSmall} onPress={openDonation}>
              <Text style={styles.primaryButtonText}>Donar</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setAboutModalOpen(true)}>
              <MessageCircle color={theme.colors.primaryDark} size={18} />
              <Text style={styles.secondaryButtonText}>Contáctame</Text>
            </Pressable>
          </View>
          <Pressable style={[styles.secondaryButton, styles.fullWidthButton]} onPress={() => startTutorial()}>
            <RotateCcw color={theme.colors.primaryDark} size={18} />
            <Text style={styles.secondaryButtonText}>Ver tutorial</Text>
          </Pressable>
        </View>

        {renderAdminPanel()}

        <View style={styles.accountPanel}>
          <View style={styles.nextHeader}>
            <UserRound color={theme.colors.primaryDark} size={21} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Cuenta</Text>
              <Text style={styles.muted}>{authUser?.name ?? "Usuario Kura"} - {authUser?.identifier ?? "Sesión local"}</Text>
            </View>
          </View>
          <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
            <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderAdminPanel() {
    if (!isAdminAuthUser(authUser)) {
      return null;
    }

    const localSnapshot = usageSnapshotFromState(profiles, recipes, medications, doseEvents);
    const localUserCount = Math.max(localUsers.length, authUser ? 1 : 0);
    const usingRemoteStats = Boolean(remoteAdminStats);
    const adminSubtitle = !hasFirebaseConfig()
      ? "Estadísticas locales hasta conectar Firebase"
      : adminStatsLoading
        ? "Actualizando estadísticas de Firebase"
        : usingRemoteStats
          ? `${remoteAdminStats?.userCount ?? 0} usuarios en Firebase`
          : adminStatsError || "Sin datos remotos todavía";
    const latestSyncText = remoteAdminStats?.latestSyncAt
      ? `Última actividad: ${formatShortDate(remoteAdminStats.latestSyncAt)} - ${formatTime(remoteAdminStats.latestSyncAt)}`
      : adminStatsSyncedAt
        ? `Panel actualizado: ${formatShortDate(adminStatsSyncedAt)} - ${formatTime(adminStatsSyncedAt)}`
        : "Panel listo para sincronizar";

    return (
      <View style={styles.adminPanel}>
        <View style={styles.nextHeader}>
          <Sparkles color={theme.colors.primaryDark} size={21} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Panel admin</Text>
            <Text style={styles.muted}>{adminSubtitle}</Text>
          </View>
          <Pressable style={styles.adminRefreshButton} onPress={() => void refreshAdminStats()} disabled={adminStatsLoading}>
            <RotateCcw color={theme.colors.primaryDark} size={16} />
            <Text style={styles.adminRefreshText}>{adminStatsLoading ? "Leyendo" : "Actualizar"}</Text>
          </Pressable>
        </View>
        <View style={styles.adminGrid}>
          <AdminMetric label="Usuarios" value={`${remoteAdminStats?.userCount ?? localUserCount}`} />
          <AdminMetric label="Usuarios activos" value={`${remoteAdminStats?.activeUserCount ?? (localSnapshot.profileCount > 0 ? 1 : 0)}`} />
          <AdminMetric label="Perfiles" value={`${remoteAdminStats?.profileCount ?? localSnapshot.profileCount}`} />
          <AdminMetric label="Tratamientos" value={`${remoteAdminStats?.recipeCount ?? localSnapshot.recipeCount}`} />
          <AdminMetric label="Medicamentos" value={`${remoteAdminStats?.medicationCount ?? localSnapshot.medicationCount}`} />
          <AdminMetric label="Dosis registradas" value={`${remoteAdminStats?.doseEventCount ?? localSnapshot.doseEventCount}`} />
          <AdminMetric label="Completadas" value={`${remoteAdminStats?.completedDoseCount ?? localSnapshot.completedDoseCount}`} />
          <AdminMetric label="Omitidas" value={`${remoteAdminStats?.skippedDoseCount ?? localSnapshot.skippedDoseCount}`} />
        </View>
        <View style={styles.adminStatusBox}>
          <Text style={styles.adminStatusText}>{latestSyncText}</Text>
          <Text style={styles.adminFootnote}>
            {usingRemoteStats
              ? "Estos números son agregados; no muestran recetas ni datos personales de otros usuarios."
              : "Mientras no haya lectura remota, el panel muestra tu información local de prueba."}
          </Text>
        </View>
      </View>
    );
  }

  function renderProfileFormFields() {
    return (
      <>
        <FloatingInput label="Nombre" value={profileName} onChangeText={setProfileName} />
        <FloatingInput label="Relación" value={profileRelationship} onChangeText={setProfileRelationship} />
        <AgeSelector value={profileAge} onChange={setProfileAge} />

        <Field label="Icono">
          <View style={styles.iconGrid}>
            {profileIconOptions.map((option) => {
              const Icon = option.icon;
              const active = profileIcon === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.profileIconOption, active && styles.profileIconOptionActive]}
                  onPress={() => {
                    setProfileIcon(option.value);
                    setProfileGender(option.gender);
                  }}
                >
                  <Icon color={active ? theme.colors.white : theme.colors.primaryDark} size={22} />
                  <Text style={[styles.profileIconOptionText, active && styles.profileIconOptionTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
            <ColorSelector value={profileColor} onChange={setProfileColor} />
          </View>
        </Field>
      </>
    );
  }

  function renderFirstProfileSetup() {
    return (
      <SafeAreaView style={styles.safe}>
        <AppStatusBar />
        <KeyboardAvoidingView style={styles.keyboardScreen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.firstProfileContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <KuraLogo size={108} />
            <Text style={[styles.profileTitle, styles.centeredTitle]}>Crea tu primer perfil</Text>
            <Text style={styles.firstProfileText}>Este perfil nos ayuda a organizar recetas, inventario y recordatorios desde el primer tratamiento.</Text>
            <View style={styles.firstProfileCard}>
              {renderProfileFormFields()}
              <Pressable style={styles.primaryButton} onPress={saveProfile}>
                <Text style={styles.primaryButtonText}>Crear perfil</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  function renderCurrentTab() {
    if (tab === "recipes") {
      return renderRecipes();
    }
    if (tab === "inventory") {
      return renderInventory();
    }
    if (tab === "history") {
      return renderHistory();
    }
    if (tab === "profile") {
      return renderProfile();
    }
    return renderToday();
  }

  if (!hydrated || !authHydrated || showSplash) {
    return renderSplash();
  }

  if (!authUser) {
    return renderAuthScreen();
  }

  if (profiles.length === 0) {
    return renderFirstProfileSetup();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppStatusBar />
      <KeyboardAvoidingView style={styles.appShell} behavior={Platform.OS === "ios" ? "padding" : "height"} onTouchStart={markActivity}>
        {tab !== "profile" ? (
          <View style={styles.topBar}>
            <ProfileSwitcher profiles={profiles} selectedProfileId={selectedProfileId} onSelect={setSelectedProfileId} onAdd={() => openProfileModal()} />
            <Pressable style={styles.topProfileButton} onPress={() => setTab("profile")}>
              <UserRound color={theme.colors.white} size={22} />
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: screenTransition,
              transform: [
                {
                  translateY: screenTransition.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
                }
              ]
            }}
          >
            {renderCurrentTab()}
          </Animated.View>
        </ScrollView>

        <BottomNav current={tab} onChange={setTab} onNewRecipe={openRecipeWizard} />
      </KeyboardAvoidingView>

      <TutorialOverlay
        visible={tutorialModalOpen}
        step={currentTutorialStep}
        index={tutorialStepIndex}
        total={tutorialSteps.length}
        onNext={advanceTutorial}
        onClose={finishTutorial}
      />

      <ModalShell visible={recipeModalOpen} title="Nueva receta" onClose={() => setRecipeModalOpen(false)}>
        <RecipeWizardSteps current={recipeStep} onSelect={goToRecipeStep} />
        {recipeStep === "photo" ? (
          <View style={styles.modalStack}>
            <FormSectionTitle title="Tratamiento" />
            <FloatingInput label="Nombre del tratamiento o diagnóstico" value={recipeTitle} onChangeText={setRecipeTitle} error={visibleRecipeErrors.title} />
            {visibleRecipeErrors.title ? <Text style={styles.inlineErrorText}>Agrega el nombre del tratamiento o diagnóstico.</Text> : null}
            <DoctorInput prefix={recipeDoctorPrefix} name={recipeDoctor} onPrefixChange={setRecipeDoctorPrefix} onNameChange={setRecipeDoctor} nameError={visibleRecipeErrors.doctor} />
            <View style={styles.reviewNotice}>
              <Camera color={theme.colors.primaryDark} size={20} />
              <Text style={[styles.reviewText, styles.centeredNoticeText]}>La fotografia solo es una referencia y es opcional. Puedes avanzar sin foto y registrar el medicamento manualmente.</Text>
            </View>

            <View style={styles.photoActions}>
              <Pressable style={styles.optionButton} onPress={() => void pickRecipePhoto("camera")}>
                <Camera color={theme.colors.primaryDark} size={21} />
                <Text style={styles.optionText}>Tomar foto</Text>
              </Pressable>
              <Pressable style={styles.optionButton} onPress={() => void pickRecipePhoto("library")}>
                <FileText color={theme.colors.primaryDark} size={21} />
                <Text style={styles.optionText}>Galeria</Text>
              </Pressable>
            </View>

            {recipePhotoUri ? <Image source={{ uri: recipePhotoUri }} style={styles.modalImage} /> : null}
            {recipePhotoUri ? (
              <View style={styles.scanPrototypeNotice}>
                <BadgeInfo color={theme.colors.primaryDark} size={19} />
                <Text style={styles.scanPrototypeText}>El escaneo está en pruebas y puede cometer errores. Úsalo si quieres probarlo y revisa cada dato antes de guardar.</Text>
              </View>
            ) : null}
            {recipePhotoUri ? (
              <Pressable
                style={[styles.optionButton, recipeSource === "scan" && styles.optionButtonActive, scanLoading && styles.optionButtonDisabled]}
                onPress={requestRecipeScan}
                disabled={scanLoading}
              >
                <ScanLine color={theme.colors.primaryDark} size={21} />
                <Text style={styles.optionText}>{scanLoading ? "Escaneando" : "Probar escaneo"}</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.primaryButton} onPress={goToMedicationStep}>
              <Text style={styles.primaryButtonText}>Continuar a medicamento</Text>
            </Pressable>
          </View>
        ) : null}

        {recipeStep === "medications" ? (
          <View style={styles.modalStack}>
            {recipeSource === "scan" ? (
              <View style={styles.scanNotice}>
                <ScanLine color={theme.colors.primaryDark} size={20} />
                <View style={styles.flex}>
                  <Text style={styles.scanNoticeTitle}>Revisa el escaneo</Text>
                  <Text style={styles.scanNoticeText}>
                    {scanNotice || "El escaneo puede cometer errores. Revisa cada campo antes de activar las alarmas."}
                  </Text>
                  {scanPreview ? <Text style={styles.scanPreviewText}>{scanPreview}</Text> : null}
                </View>
              </View>
            ) : null}
            <MedicationTabs drafts={wizardDrafts} activeIndex={activeWizardIndex} onSelect={setActiveWizardIndex} />
            {!currentWizardDraft.confirmed ? <MedicationDraftForm draft={currentWizardDraft} onChange={updateWizardDraft} errors={visibleMedicationErrors} /> : (
              <View style={styles.summaryRow}>
                <Check color={theme.colors.primaryDark} size={20} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{currentWizardDraft.name}</Text>
                  <Text style={styles.muted}>Medicamento guardado para esta receta.</Text>
                </View>
                <Pressable style={styles.iconSoftButton} onPress={editCurrentWizardMedication}>
                  <SquarePen color={theme.colors.primaryDark} size={17} />
                </Pressable>
              </View>
            )}

            {!currentWizardDraft.confirmed ? (
              <Pressable style={styles.primaryButton} onPress={saveCurrentWizardMedication}>
                <Text style={styles.primaryButtonText}>Guardar medicamento</Text>
              </Pressable>
            ) : (
              <View style={styles.wizardActions}>
                <Pressable style={styles.secondaryButton} onPress={addAnotherWizardMedication}>
                  <Plus color={theme.colors.primaryDark} size={18} />
                  <Text style={styles.secondaryButtonText}>Agregar otro medicamento</Text>
                </Pressable>
                <Pressable style={styles.primaryButtonSmall} onPress={goToAlarmStep}>
                  <Text style={styles.primaryButtonText}>Finalizar receta</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        {recipeStep === "alarms" ? (
          <View style={styles.modalStack}>
            <View style={styles.reviewNotice}>
              <AlarmClockCheck color={theme.colors.primaryDark} size={22} />
              <Text style={styles.reviewText}>Se activarán alarmas con los medicamentos guardados.</Text>
            </View>
            {wizardDrafts
              .filter((item) => item.confirmed)
              .map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.summaryRow}>
                  <Pill color={theme.colors.primaryDark} size={19} />
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.muted}>
                      {formatFrequency(item.frequencyMinutes || 480)} - {item.firstTime ? `inicia ${normalizeTimeValue(item.firstTime)}` : "usa la hora actual"}
                    </Text>
                  </View>
                </View>
              ))}
            <Pressable style={[styles.secondaryButton, styles.fullWidthButton]} onPress={() => void scheduleTestNotification()}>
              <BellRing color={theme.colors.primaryDark} size={18} />
              <Text style={styles.secondaryButtonText}>Probar notificación</Text>
            </Pressable>
            {notificationTestNotice ? (
              <View style={styles.testNotice}>
                <BadgeInfo color={theme.colors.primaryDark} size={18} />
                <Text style={styles.testNoticeText}>{notificationTestNotice}</Text>
              </View>
            ) : null}
            <Pressable style={styles.primaryButton} onPress={() => void activateRecipe()}>
              <Text style={styles.primaryButtonText}>Activar alarmas y guardar</Text>
            </Pressable>
          </View>
        ) : null}
      </ModalShell>

      <ModalShell visible={editModalOpen} title="Editar receta" onClose={() => setEditModalOpen(false)}>
        <View style={styles.modalStack}>
          <FormSectionTitle title="Tratamiento" />
          <FloatingInput label="Nombre del tratamiento o diagnóstico" value={editRecipeTitle} onChangeText={setEditRecipeTitle} />
          <DoctorInput prefix={editRecipeDoctorPrefix} name={editRecipeDoctor} onPrefixChange={setEditRecipeDoctorPrefix} onNameChange={setEditRecipeDoctor} />

          {editingRecipe ? <SourceBadge source={editingRecipe.source} /> : null}

          <Field label="Medicamento">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {editingRecipeMedications.map((medication) => (
                <Pressable key={medication.id} style={[styles.chip, editingMedicationId === medication.id && styles.chipActive]} onPress={() => selectEditingMedication(medication.id)}>
                  <Text style={[styles.chipText, editingMedicationId === medication.id && styles.chipTextActive]}>{medication.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Field>

          {editingMedicationId ? <MedicationDraftForm draft={editDraft} onChange={setEditDraft} /> : <EmptyState text="Esta receta no tiene medicamentos." />}

          <Pressable style={styles.primaryButton} onPress={() => void saveRecipeEdits()}>
            <Text style={styles.primaryButtonText}>Guardar cambios</Text>
          </Pressable>
        </View>
      </ModalShell>

      <ModalShell visible={inventoryModalOpen} title={inventoryFlow === "add" ? "Agregar inventario" : "Ajustar inventario"} onClose={() => setInventoryModalOpen(false)}>
        {inventoryMedication ? (
          <View style={styles.modalStack}>
            <View style={styles.summaryRow}>
              {React.createElement(getUnitIcon(inventoryMedication.unitLabel), { color: theme.colors.primaryDark, size: 22 })}
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{inventoryMedication.name}</Text>
                <Text style={styles.muted}>
                  {inventoryMedication.remainingUnits} {inventoryUnitLabel(inventoryMedication.unitLabel)} disponibles
                </Text>
              </View>
            </View>
            {inventoryFlow === "add" ? (
              <Field label="Que vas a agregar">
                <View style={styles.inventoryModeGrid}>
                  {[
                    { key: "units" as InventoryMode, label: "Unidades", icon: Plus },
                    { key: "container" as InventoryMode, label: "Frasco/caja", icon: PackageOpen }
                  ].map((option) => {
                    const Icon = option.icon;
                    const active = inventoryMode === option.key;
                    return (
                      <Pressable key={option.key} style={[styles.inventoryModeButton, active && styles.inventoryModeButtonActive]} onPress={() => setInventoryMode(option.key)}>
                        <Icon color={active ? theme.colors.white : theme.colors.primaryDark} size={18} />
                        <Text style={[styles.inventoryModeText, active && styles.inventoryModeTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>
            ) : null}

            {inventoryFlow === "add" && inventoryMode === "units" ? (
              <FloatingInput label={`Cantidad a agregar (${inventoryUnitLabel(inventoryMedication.unitLabel)})`} value={inventoryAmount} onChangeText={setInventoryAmount} keyboardType="numeric" />
            ) : null}

            {inventoryFlow === "add" && inventoryMode === "container" ? (
              <View style={styles.formRow}>
                <View style={styles.formSideField}>
                  <FloatingInput label="Por frasco/caja" value={inventoryUnitsPerContainer} onChangeText={setInventoryUnitsPerContainer} keyboardType="numeric" />
                </View>
                <View style={styles.formSideField}>
                  <FloatingInput label="Frascos/cajas" value={inventoryContainerCount} onChangeText={setInventoryContainerCount} keyboardType="numeric" />
                </View>
              </View>
            ) : null}

            {inventoryFlow === "adjust" ? (
              <>
                <FloatingInput label={`Inventario actual (${inventoryUnitLabel(inventoryMedication.unitLabel)})`} value={inventoryAmount} onChangeText={setInventoryAmount} keyboardType="numeric" />
                <View style={styles.twoColumns}>
                  <Pressable style={styles.secondaryButton} onPress={() => moveInventoryAmountByDose(1)}>
                    <Plus color={theme.colors.primaryDark} size={18} />
                    <Text style={styles.secondaryButtonText}>Agregar dosis</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={() => moveInventoryAmountByDose(-1)}>
                    <Minus color={theme.colors.primaryDark} size={18} />
                    <Text style={styles.secondaryButtonText}>Quitar dosis</Text>
                  </Pressable>
                </View>
                <View style={styles.formRow}>
                  <View style={styles.formSideField}>
                    <FloatingInput label="Por frasco/caja" value={inventoryUnitsPerContainer} onChangeText={setInventoryUnitsPerContainer} keyboardType="numeric" />
                  </View>
                  <View style={styles.formSideField}>
                    <FloatingInput label="Frascos/cajas" value={inventoryContainerCount} onChangeText={setInventoryContainerCount} keyboardType="numeric" />
                  </View>
                </View>
              </>
            ) : null}

            {inventorySuccess ? (
              <View style={styles.successNotice}>
                <Check color={theme.colors.primaryDark} size={20} />
                <Text style={styles.successText}>{inventorySuccess}</Text>
              </View>
            ) : inventoryFlow === "adjust" || inventoryMode !== "pick" ? (
              <Pressable style={styles.primaryButton} onPress={confirmInventoryAdd}>
                <Text style={styles.primaryButtonText}>{inventoryFlow === "adjust" ? "Ajustar inventario" : "Agregar"}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ModalShell>

      <ModalShell visible={profileModalOpen} title={editingProfileId ? "Editar perfil" : "Nuevo perfil"} onClose={() => setProfileModalOpen(false)}>
        <View style={styles.modalStack}>
          {renderProfileFormFields()}
          <Pressable style={styles.primaryButton} onPress={saveProfile}>
            <Text style={styles.primaryButtonText}>{editingProfileId ? "Guardar perfil" : "Crear perfil"}</Text>
          </Pressable>
        </View>
      </ModalShell>

      <ModalShell visible={aboutModalOpen} title="Contáctame" onClose={() => setAboutModalOpen(false)}>
        <View style={styles.contactFormStack}>
          <FormSectionTitle title="Contacto" />
          <FloatingInput label="Tu nombre" value={contactName} onChangeText={setContactName} />
          <FloatingInput label="Como te contacto" value={contactMethod} onChangeText={setContactMethod} />
          <FloatingInput label="Mensaje" value={contactMessage} onChangeText={setContactMessage} multiline />
          <View style={styles.twoColumns}>
            <Pressable style={styles.secondaryButton} onPress={sendContactByWhatsapp}>
              <MessageCircle color={theme.colors.primaryDark} size={18} />
              <Text style={styles.secondaryButtonText}>WhatsApp</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={sendContactByEmail}>
              <Mail color={theme.colors.primaryDark} size={18} />
              <Text style={styles.secondaryButtonText}>Correo</Text>
            </Pressable>
          </View>
        </View>
      </ModalShell>

      <ModalShell visible={skipModalOpen} title="Omitir dosis" onClose={() => setSkipModalOpen(false)}>
        <View style={styles.modalStack}>
          <Text style={styles.muted}>Kura guardará el motivo para que aparezca en el historial.</Text>
          <FloatingInput label="Motivo de omisión" value={skipReason} onChangeText={setSkipReason} multiline />
          <Pressable style={styles.dangerButton} onPress={confirmSkipDose}>
            <X color={theme.colors.white} size={18} />
            <Text style={styles.primaryButtonText}>Omitir dosis</Text>
          </Pressable>
        </View>
      </ModalShell>

      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
      <ChoiceModal choice={choiceModal} onClose={() => setChoiceModal(null)} />

      <ModalShell visible={Boolean(confirmation)} title={confirmation?.title ?? ""} onClose={() => setConfirmation(null)}>
        <View style={styles.modalStack}>
          <Text style={styles.muted}>{confirmation?.message}</Text>
          <View style={styles.twoColumns}>
            <Pressable style={styles.secondaryButton} onPress={() => setConfirmation(null)}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.primaryButtonSmall, confirmation?.danger && styles.confirmDangerButton]} onPress={confirmPendingAction}>
              <Text style={styles.primaryButtonText}>{confirmation?.confirmLabel ?? "Confirmar"}</Text>
            </Pressable>
          </View>
        </View>
      </ModalShell>
    </SafeAreaView>
  );
}

function draftFromMedication(medication: Medication): NewMedicationDraft {
  const displayDose = numberFromText(medication.dose) || medication.unitsPerDose || 1;
  return {
    name: medication.name,
    dose: `${displayDose}`,
    instructions: medication.instructions,
    frequencyMinutes: medication.frequencyMinutes,
    durationDays: medication.durationDays,
    firstTime: medication.times[0] ?? "08:00",
    unitsPerContainer: medication.unitsPerContainer,
    containerCount: medication.containerCount,
    unitsPerDose: medication.unitsPerDose,
    unitLabel: medication.unitLabel
  };
}

function ProfileSwitcher({
  profiles,
  selectedProfileId,
  onSelect,
  onAdd
}: {
  profiles: Profile[];
  selectedProfileId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.switcher}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherContent}>
        {profiles.map((profile) => {
          const Icon = getProfileIcon(profile);
          return (
            <Pressable key={profile.id} style={[styles.profileChip, selectedProfileId === profile.id && styles.profileChipActive]} onPress={() => onSelect(profile.id)}>
              <View style={[styles.profileDot, { backgroundColor: profile.color }]}>
                <Icon color={theme.colors.white} size={14} />
              </View>
              <Text style={[styles.profileChipText, selectedProfileId === profile.id && styles.profileChipTextActive]}>{profile.name}</Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.addChip} onPress={onAdd}>
          <Plus color={theme.colors.primaryDark} size={18} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function BottomNav({ current, onChange, onNewRecipe }: { current: TabKey; onChange: (tab: TabKey) => void; onNewRecipe: () => void }) {
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);

  return (
    <View style={styles.bottomNav}>
      {leftTabs.map((item) => {
        const Icon = item.icon;
        const active = current === item.key;

        return (
          <Pressable key={item.key} style={[styles.navItem, active && styles.navItemActive]} onPress={() => onChange(item.key)}>
            <Icon color={active ? theme.colors.white : theme.colors.mint} size={24} strokeWidth={active ? 2.8 : 2} />
            <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
      <Pressable style={styles.navRecipeButton} onPress={onNewRecipe}>
        <Plus color={theme.colors.white} size={30} />
        <Text style={styles.navRecipeText}>Agregar receta</Text>
      </Pressable>
      {rightTabs.map((item) => {
        const Icon = item.icon;
        const active = current === item.key;

        return (
          <Pressable key={item.key} style={[styles.navItem, active && styles.navItemActive]} onPress={() => onChange(item.key)}>
            <Icon color={active ? theme.colors.white : theme.colors.mint} size={24} strokeWidth={active ? 2.8 : 2} />
            <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RecipeWizardSteps({ current, onSelect }: { current: RecipeStep; onSelect: (step: RecipeStep) => void }) {
  const steps: Array<{ key: RecipeStep; label: string; stepLabel: string }> = [
    { key: "photo", label: "Foto", stepLabel: "Paso 1" },
    { key: "medications", label: "Medicamento", stepLabel: "Paso 2" },
    { key: "alarms", label: "Alarmas", stepLabel: "Último paso" }
  ];

  return (
    <View style={styles.stepper}>
      {steps.map((step) => {
        const active = current === step.key;
        return (
          <Pressable key={step.key} style={[styles.stepPill, active && styles.stepPillActive]} onPress={() => onSelect(step.key)}>
            <Text style={[styles.stepPillStepText, active && styles.stepPillTextActive]}>{step.stepLabel}</Text>
            <Text style={[styles.stepPillText, active && styles.stepPillTextActive]}>{step.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MedicationTabs({
  drafts,
  activeIndex,
  onSelect
}: {
  drafts: WizardMedicationDraft[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {drafts.map((draft, index) => {
        const active = activeIndex === index;
        const label = draft.confirmed && draft.name ? draft.name : `Medicamento ${index + 1}`;
        return (
          <Pressable key={`${label}-${index}`} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(index)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function DoseSummary({
  event,
  medication,
  doseMarker,
  onTaken,
  onSnooze,
  onSkip,
  showHeader = true,
  divided = false
}: {
  event: DoseEvent;
  medication?: Medication;
  doseMarker?: string;
  onTaken: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  showHeader?: boolean;
  divided?: boolean;
}) {
  const scheduledDateLabel = doseDateLabel(event.scheduledAt);

  return (
    <View style={[styles.nextDoseItem, divided && styles.nextDoseItemDivided]}>
      {showHeader ? (
        <View style={styles.nextHeader}>
          <BellRing color={theme.colors.primaryDark} size={22} />
          <Text style={styles.nextLabel}>Siguiente dosis</Text>
        </View>
      ) : null}
      <Text style={styles.nextTime}>{formatTime(event.scheduledAt)}</Text>
      {scheduledDateLabel ? <Text style={styles.nextDate}>{scheduledDateLabel}</Text> : null}
      {doseMarker ? <Text style={styles.doseMarkerText}>{doseMarker}</Text> : null}
      <Text style={styles.nextMedication}>{medication?.name ?? "Medicamento"}</Text>
      <Text style={styles.muted}>{medication ? `${medication.dose} - ${medication.instructions}` : ""}</Text>
      <ActionRow onTaken={onTaken} onSnooze={onSnooze} onSkip={onSkip} />
    </View>
  );
}

function DoseRow({
  event,
  medication,
  doseMarker,
  onTaken,
  onSnooze,
  onSkip,
  showActions = true
}: {
  event: DoseEvent;
  medication?: Medication;
  doseMarker?: string;
  onTaken: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  showActions?: boolean;
}) {
  const disabled = event.status === "taken" || event.status === "skipped";
  const scheduledDateLabel = doseDateLabel(event.scheduledAt);

  return (
    <View style={styles.doseRow}>
      <View style={styles.timeBlock}>
        <Text style={styles.timeText}>{formatTime(event.scheduledAt)}</Text>
        {scheduledDateLabel ? <Text style={styles.doseDateText}>{scheduledDateLabel}</Text> : null}
        <View style={[styles.statusPill, { backgroundColor: statusColors[event.status] }]}>
          <Text style={styles.statusPillText}>{statusLabels[event.status]}</Text>
        </View>
      </View>
      <View style={styles.flex}>
        {doseMarker ? <Text style={styles.doseMarkerText}>{doseMarker}</Text> : null}
        <Text style={styles.cardTitle}>{medication?.name ?? "Medicamento"}</Text>
        <Text style={styles.muted}>{medication?.dose ?? ""}</Text>
        {event.status === "skipped" && event.skippedReason ? <Text style={styles.skipReasonText}>Motivo: {event.skippedReason}</Text> : null}
        {showActions && !disabled ? <ActionRow compact onTaken={onTaken} onSnooze={onSnooze} onSkip={onSkip} /> : null}
      </View>
    </View>
  );
}

function ActionRow({ onTaken, onSnooze, onSkip, compact = false }: { onTaken: () => void; onSnooze: () => void; onSkip: () => void; compact?: boolean }) {
  return (
    <View style={[styles.actionRow, compact && styles.actionRowCompact]}>
      <Pressable style={[styles.actionButton, styles.actionTaken]} onPress={onTaken}>
        <Check color={theme.colors.white} size={compact ? 16 : 18} />
        <Text style={styles.actionButtonText}>Completado</Text>
      </Pressable>
      <Pressable style={styles.actionButtonSoft} onPress={onSnooze}>
        <RotateCcw color={theme.colors.primaryDark} size={compact ? 16 : 18} />
        <Text style={styles.actionButtonSoftText}>10 min</Text>
      </Pressable>
      <Pressable style={styles.actionSkipButton} onPress={onSkip}>
        <X color={theme.colors.rose} size={compact ? 16 : 18} />
        <Text style={styles.actionSkipText}>Omitir</Text>
      </Pressable>
    </View>
  );
}

function HistoryRow({ event, medication }: { event: DoseEvent; medication?: Medication }) {
  return (
    <View style={styles.historyRow}>
      <View style={[styles.statusDot, { backgroundColor: statusColors[event.status] }]} />
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{medication?.name ?? "Medicamento"}</Text>
        <Text style={styles.muted}>
          {formatShortDate(event.scheduledAt)} - {formatTime(event.scheduledAt)}
        </Text>
        {event.status === "skipped" && event.skippedReason ? <Text style={styles.skipReasonText}>Motivo: {event.skippedReason}</Text> : null}
      </View>
      <Text style={[styles.statusText, { color: statusColors[event.status] }]}>{statusLabels[event.status]}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.metricCard, { borderColor: color }]}>
      <View style={[styles.metricDot, { backgroundColor: color }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.adminMetric}>
      <Text style={styles.adminMetricValue}>{value}</Text>
      <Text style={styles.adminMetricLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Pill color={theme.colors.primary} size={22} />
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

function AppStatusBar() {
  return <NativeStatusBar barStyle="light-content" backgroundColor={theme.colors.background} translucent={false} />;
}

function NoticeModal({ notice, onClose }: { notice: NoticeState | null; onClose: () => void }) {
  if (!notice) {
    return null;
  }

  const toneColor =
    notice.tone === "success" ? theme.colors.primary : notice.tone === "warning" ? theme.colors.apricot : notice.tone === "danger" ? theme.colors.rose : theme.colors.blue;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.noticeOverlay} onPress={onClose}>
        <Pressable style={styles.noticeCard} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.noticeIcon, { backgroundColor: toneColor }]}>
            <BadgeInfo color={theme.colors.white} size={22} />
          </View>
          <Text style={styles.noticeTitle}>{notice.title}</Text>
          <Text style={styles.noticeMessage}>{notice.message}</Text>
          <Pressable style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>Entendido</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ChoiceModal({ choice, onClose }: { choice: ChoiceState | null; onClose: () => void }) {
  if (!choice) {
    return null;
  }

  function closeChoice() {
    choice?.onClose?.();
    onClose();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={closeChoice}>
      <Pressable style={styles.noticeOverlay} onPress={closeChoice}>
        <Pressable style={styles.noticeCard} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.noticeIcon, { backgroundColor: theme.colors.primary }]}>
            <Clock3 color={theme.colors.white} size={22} />
          </View>
          <Text style={styles.noticeTitle}>{choice.title}</Text>
          <Text style={styles.noticeMessage}>{choice.message}</Text>
          <View style={styles.choiceActions}>
            {choice.actions.map((action) => (
              <Pressable
                key={action.label}
                style={[
                  styles.choiceButton,
                  action.tone === "danger" && styles.choiceButtonDanger,
                  action.tone === "secondary" && styles.choiceButtonSecondary
                ]}
                onPress={action.onPress}
              >
                <Text style={[styles.primaryButtonText, action.tone === "secondary" && styles.choiceButtonSecondaryText]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TutorialOverlay({
  visible,
  step,
  index,
  total,
  onNext,
  onClose
}: {
  visible: boolean;
  step: TutorialStep;
  index: number;
  total: number;
  onNext: () => void;
  onClose: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.tutorialOverlay}>
        <View style={styles.tutorialSpotlight}>
          <Text style={styles.tutorialSpotlightText}>{step.target}</Text>
        </View>
        <View style={styles.tutorialArrow} />
        <View style={styles.tutorialCard}>
          <Text style={styles.tutorialProgress}>
            Paso {index + 1} de {total}
          </Text>
          <Text style={styles.tutorialTitle}>{step.title}</Text>
          <Text style={styles.tutorialMessage}>{step.message}</Text>
          <View style={styles.tutorialActions}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cerrar tutorial</Text>
            </Pressable>
            <Pressable style={styles.primaryButtonSmall} onPress={onNext}>
              <Text style={styles.primaryButtonText}>{step.final ? "Finalizar" : "Entendido"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SourceBadge({ source }: { source: Recipe["source"] }) {
  const label = source === "scan" ? "Detectada" : source === "photo" ? "Foto" : "Manual";
  return (
    <View style={styles.sourceBadge}>
      <Text style={styles.sourceBadgeText}>{label}</Text>
    </View>
  );
}

function GoogleLogo({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.5c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.6-4.9 3.6-8.2Z" />
      <Path fill="#34A853" d="M12 24c3.2 0 5.9-1 7.9-3.5l-3.7-2.8c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1H1.4v2.9C3.3 21 7.4 24 12 24Z" />
      <Path fill="#FBBC05" d="M5.2 13.8c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V6.5H1.4C.5 8.1 0 9.8 0 11.6s.5 3.6 1.4 5.1l3.8-2.9Z" />
      <Path fill="#EA4335" d="M12 4.7c1.8 0 3.3.6 4.6 1.8L20 3.1C17.9 1.2 15.2 0 12 0 7.4 0 3.3 3 1.4 6.5l3.8 2.9c.9-3 3.6-4.7 6.8-4.7Z" />
    </Svg>
  );
}

function FacebookLogo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="12" fill="#1877F2" />
      <Path fill="#FFFFFF" d="M15.4 12.8h-2.2V21h-3.3v-8.2H8.3V10h1.6V8.2c0-1.3.6-3.3 3.3-3.3h2.4v2.7h-1.8c-.3 0-.7.1-.7.8V10h2.5l-.2 2.8Z" />
    </Svg>
  );
}

function FloatingInput({
  label,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry = false,
  multiline = false,
  error = false
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  secureTextEntry?: boolean;
  multiline?: boolean;
  error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const active = focused || value.length > 0;
  const inputRef = useRef<TextInput>(null);
  const labelProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const canTogglePassword = secureTextEntry;

  useEffect(() => {
    Animated.timing(labelProgress, {
      toValue: active ? 1 : 0,
      duration: 170,
      useNativeDriver: false
    }).start();
  }, [active, labelProgress]);

  return (
    <Pressable style={[styles.floatingInputContainer, multiline && styles.floatingInputContainerMultiline, error && styles.inputError]} onPress={() => inputRef.current?.focus()}>
      <Animated.Text
        pointerEvents="none"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        style={[
          styles.floatingInputLabel,
          active && styles.floatingInputLabelActive,
          error && styles.floatingInputLabelError,
          {
            top: labelProgress.interpolate({ inputRange: [0, 1], outputRange: [17, 7] }),
            fontSize: labelProgress.interpolate({ inputRange: [0, 1], outputRange: [13, 11] })
          }
        ]}
      >
        {label}
      </Animated.Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry && !passwordVisible}
        multiline={multiline}
        onFocus={() => {
          closeOpenDropdowns();
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        style={[styles.floatingInput, canTogglePassword && styles.floatingInputWithIcon, multiline && styles.floatingInputMultiline]}
      />
      {canTogglePassword ? (
        <Pressable
          style={styles.passwordToggle}
          onPress={(event) => {
            event.stopPropagation();
            setPasswordVisible((visible) => !visible);
          }}
        >
          {passwordVisible ? <EyeOff color={theme.colors.primaryDark} size={20} /> : <Eye color={theme.colors.primaryDark} size={20} />}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function FormSectionTitle({ title }: { title: string }) {
  return <Text style={styles.formSectionTitle}>{title.toUpperCase()}</Text>;
}

type PickerOption = {
  label: string;
  value: string;
  color?: string;
  iconOnly?: boolean;
};

function PickerModal({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <Pressable style={styles.modalClose} onPress={onClose}>
              <X color={theme.colors.ink} size={20} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerContent}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  onPress={() => {
                    Keyboard.dismiss();
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  {option.color ? <View style={[styles.colorPreviewDot, { backgroundColor: option.color }]} /> : null}
                  {!option.iconOnly ? <Text style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>{option.label}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function UnitSelector({ value, onChange, error = false }: { value: string; onChange: (value: string) => void; error?: boolean }) {
  const [unitOpen, setUnitOpen] = useState(false);

  useEffect(() => registerDropdownCloser(() => setUnitOpen(false)), []);

  return (
    <View style={styles.dropdownField}>
      <Pressable
        style={[styles.dropdownButton, error && styles.inputError]}
        onPress={() => {
          Keyboard.dismiss();
          closeOpenDropdowns();
          setUnitOpen(true);
        }}
      >
        <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholderText]}>{value ? unitLabelText(value) : "Unidad"}</Text>
      </Pressable>
      <PickerModal
        visible={unitOpen}
        title="Unidad"
        options={unitOptions.map((unit) => ({ label: unit, value: unit }))}
        value={value}
        onSelect={onChange}
        onClose={() => setUnitOpen(false)}
      />
    </View>
  );
}

function DoctorInput({
  prefix,
  name,
  onPrefixChange,
  onNameChange,
  nameError = false
}: {
  prefix: DoctorPrefix;
  name: string;
  onPrefixChange: (value: DoctorPrefix) => void;
  onNameChange: (value: string) => void;
  nameError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => registerDropdownCloser(() => setOpen(false)), []);

  return (
    <View style={styles.doctorInputBlock}>
      <View style={[styles.formRow, styles.formRowRaised]}>
        <View style={styles.doctorPrefixField}>
          <Pressable
            style={styles.dropdownButton}
            onPress={() => {
              Keyboard.dismiss();
              closeOpenDropdowns();
              setOpen(true);
            }}
          >
            <Text style={styles.dropdownText}>{prefix}</Text>
          </Pressable>
          <PickerModal
            visible={open}
            title="Título"
            options={doctorPrefixOptions.map((option) => ({ label: option, value: option }))}
            value={prefix}
            onSelect={onPrefixChange}
            onClose={() => setOpen(false)}
          />
        </View>
        <View style={styles.formMainField}>
          <FloatingInput label="Nombre del doctor" value={name} onChangeText={onNameChange} error={nameError} />
        </View>
      </View>
      {nameError ? <Text style={styles.inlineErrorText}>Agrega el nombre del doctor.</Text> : null}
    </View>
  );
}

function AgeDropdown({
  value,
  options,
  onSelect,
  placeholder = "Selecciona",
  compact = false
}: {
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => registerDropdownCloser(() => setOpen(false)), []);

  return (
    <View style={[styles.ageDropdown, compact && styles.compactDropdown]}>
      <Pressable
        style={[styles.dropdownButton, compact && styles.compactDropdownButton]}
        onPress={() => {
          Keyboard.dismiss();
          closeOpenDropdowns();
          setOpen(true);
        }}
      >
        <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholderText]}>{value || placeholder}</Text>
      </Pressable>
      <PickerModal
        visible={open}
        title={placeholder}
        options={options.map((option) => ({ label: option, value: option }))}
        value={value}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

function AgeSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parsed = parseProfileAge(value);
  const amount = parsed.amount > 0 ? `${parsed.amount}` : "";
  const unitLabel = parsed.unit === "months" ? "Meses" : "Años";
  const amountOptions = Array.from({ length: parsed.unit === "months" ? 24 : 120 }, (_, index) => `${index + 1}`);

  function updateAge(nextAmountText = amount, nextUnitLabel = unitLabel) {
    const nextAmount = Number(nextAmountText) || 0;
    const nextUnit: AgeUnit = nextUnitLabel === "Meses" ? "months" : "years";
    onChange(formatProfileAge(nextAmount, nextUnit));
  }

  return (
    <Field label="Edad">
      <View style={[styles.formRow, styles.ageSelectorRow]}>
        <View style={styles.formMainField}>
          <AgeDropdown value={amount} options={amountOptions} onSelect={(nextAmount) => updateAge(nextAmount, unitLabel)} />
        </View>
        <View style={styles.formSideField}>
          <AgeDropdown value={unitLabel} options={["Años", "Meses"]} onSelect={(nextUnit) => updateAge(amount || "1", nextUnit)} />
        </View>
      </View>
    </Field>
  );
}

function TimeWheelColumn({ label, value, options, onSelect }: { label: string; value: string; options: string[]; onSelect: (value: string) => void }) {
  return (
    <View style={styles.timeWheelColumn}>
      <Text style={styles.timeWheelLabel}>{label}</Text>
      <View style={styles.timeWheelFrame}>
        <ScrollView
          nestedScrollEnabled
          scrollEnabled
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          style={styles.timeWheelScroll}
          contentContainerStyle={styles.timeWheelContent}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
        >
          {options.map((option) => {
            const active = option === value;
            return (
              <Pressable key={option} style={[styles.timeWheelOption, active && styles.timeWheelOptionActive]} onPress={() => onSelect(option)}>
                <Text style={[styles.timeWheelText, active && styles.timeWheelTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View pointerEvents="none" style={styles.timeWheelCenterLine} />
      </View>
    </View>
  );
}

function TimeSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value || currentTimeKey(new Date()));
  const [hour = "", minute = ""] = draftValue.split(":");
  const hourOptions = Array.from({ length: 24 }, (_, index) => index.toString().padStart(2, "0"));
  const minuteOptions = Array.from({ length: 60 }, (_, index) => index.toString().padStart(2, "0"));

  function updateTime(nextHour = hour, nextMinute = minute) {
    const fallback = currentTimeKey(new Date());
    const [fallbackHour, fallbackMinute] = fallback.split(":");
    setDraftValue(`${nextHour || fallbackHour}:${nextMinute || fallbackMinute}`);
  }

  return (
    <Field label="Hora de inicio (opcional)">
      <Pressable
        style={styles.timeDisplayButton}
        onPress={() => {
          Keyboard.dismiss();
          closeOpenDropdowns();
          setDraftValue(value || currentTimeKey(new Date()));
          setOpen(true);
        }}
      >
        <Clock3 color={theme.colors.primaryDark} size={18} />
        <Text style={[styles.timeDisplayText, !value && styles.dropdownPlaceholderText]}>{value ? normalizeTimeValue(value) : "Elegir hora"}</Text>
      </Pressable>
      <View style={styles.timeQuickRow}>
        <Pressable
          style={styles.timeQuickButton}
          onPress={() => {
            const [currentHour, currentMinute] = currentTimeKey(new Date()).split(":");
            onChange(`${currentHour}:${currentMinute}`);
          }}
        >
          <Text style={styles.timeQuickText}>Usar hora actual</Text>
        </Pressable>
        {value ? (
          <Pressable style={styles.timeClearButton} onPress={() => onChange("")}>
            <Text style={styles.timeClearText}>Dejar vacía</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.timeSelectorHint}>Si la dejas vacía, se usará la hora actual al activar el tratamiento.</Text>
      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.timePickerSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Hora de inicio</Text>
              <Pressable style={styles.modalClose} onPress={() => setOpen(false)}>
                <X color={theme.colors.ink} size={20} />
              </Pressable>
            </View>
            <View style={styles.timeWheel}>
              <TimeWheelColumn label="Hora" value={hour} options={hourOptions} onSelect={(nextHour) => updateTime(nextHour, minute)} />
              <Text style={styles.timeSeparator}>:</Text>
              <TimeWheelColumn label="Min" value={minute} options={minuteOptions} onSelect={(nextMinute) => updateTime(hour, nextMinute)} />
            </View>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                onChange(draftValue);
                setOpen(false);
              }}
            >
              <Text style={styles.primaryButtonText}>Confirmar hora</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Field>
  );
}

function ColorSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => registerDropdownCloser(() => setOpen(false)), []);

  return (
    <View style={styles.profileColorOption}>
      <Text style={styles.profileColorTitle}>Color del perfil</Text>
      <Pressable
        style={styles.colorDropdownButton}
        onPress={() => {
          Keyboard.dismiss();
          closeOpenDropdowns();
          setOpen(true);
        }}
      >
        <View style={[styles.colorPreviewDot, { backgroundColor: value }]} />
      </Pressable>
      <PickerModal
        visible={open}
        title="Color del perfil"
        options={colorOptions.map((color) => ({ label: "", value: color, color, iconOnly: true }))}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

function MedicationDraftForm({
  draft,
  onChange,
  errors
}: {
  draft: NewMedicationDraft;
  onChange: (draft: NewMedicationDraft) => void;
  errors?: MedicationDraftErrorState;
}) {
  const customFrequency = draft.frequencyMinutes > 0 && !frequencyPresets.some((option) => option.minutes === draft.frequencyMinutes);
  const [customValue, setCustomValue] = useState(customFrequency ? `${draft.frequencyMinutes < 60 ? draft.frequencyMinutes : draft.frequencyMinutes / 60}` : "2");
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours">(draft.frequencyMinutes > 0 && draft.frequencyMinutes < 60 ? "minutes" : "hours");

  useEffect(() => {
    if (draft.frequencyMinutes <= 0) {
      setCustomUnit("hours");
      setCustomValue("2");
      return;
    }

    const isMinutes = draft.frequencyMinutes < 60;
    setCustomUnit(isMinutes ? "minutes" : "hours");
    setCustomValue(`${isMinutes ? draft.frequencyMinutes : draft.frequencyMinutes / 60}`);
  }, [draft.frequencyMinutes]);

  function applyCustomFrequency(valueText = customValue, unit = customUnit) {
    const value = Number(valueText) || 1;
    const minutes = unit === "hours" ? value * 60 : value;
    onChange({ ...draft, frequencyMinutes: Math.max(30, Math.round(minutes)) });
  }

  return (
    <View style={styles.formStack}>
      <FormSectionTitle title="Medicamento" />
      <FloatingInput label="Nombre del medicamento" value={draft.name} onChangeText={(value) => onChange({ ...draft, name: value })} error={Boolean(errors?.name)} />
      {errors?.name ? <Text style={styles.inlineErrorText}>Agrega el nombre del medicamento.</Text> : null}

      <FormSectionTitle title="Tratamiento" />
      <View style={[styles.formRow, styles.formRowRaised]}>
        <View style={styles.formThirdField}>
          <UnitSelector value={draft.unitLabel} onChange={(value) => onChange({ ...draft, unitLabel: value })} error={Boolean(errors?.unitLabel)} />
        </View>
        <View style={styles.formThirdField}>
          <FloatingInput
            label="Dosis"
            value={draft.dose}
            onChangeText={(value) => {
              const nextDose = sanitizeNumericInput(value);
              onChange({ ...draft, dose: nextDose, unitsPerDose: Number(nextDose) || 0 });
            }}
            keyboardType="numeric"
            error={Boolean(errors?.dose)}
          />
        </View>
        <View style={styles.formThirdField}>
          <FloatingInput label="Por cuántos días" value={numberInputValue(draft.durationDays)} onChangeText={(value) => onChange({ ...draft, durationDays: Number(sanitizeNumericInput(value)) || 0 })} keyboardType="numeric" error={Boolean(errors?.durationDays)} />
        </View>
      </View>
      {errors?.unitLabel || errors?.dose || errors?.durationDays ? <Text style={styles.inlineErrorText}>Completa unidad, dosis y días del tratamiento.</Text> : null}

      <Field label="Cada cuánto">
        <View style={styles.frequencyGrid}>
          {frequencyPresets.map((option) => {
            const active = draft.frequencyMinutes === option.minutes;
            return (
              <Pressable key={option.minutes} style={[styles.frequencyChip, active && styles.frequencyChipActive]} onPress={() => onChange({ ...draft, frequencyMinutes: option.minutes })}>
                <Text style={[styles.frequencyChipText, active && styles.frequencyChipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
          <Pressable style={[styles.frequencyChip, customFrequency && styles.frequencyChipActive]} onPress={() => applyCustomFrequency()}>
            <Text style={[styles.frequencyChipText, customFrequency && styles.frequencyChipTextActive]}>Personalizar</Text>
          </Pressable>
        </View>
      </Field>
      {errors?.frequencyMinutes ? <Text style={styles.inlineErrorText}>Selecciona cada cuánto se toma.</Text> : null}

      {customFrequency ? (
        <View style={styles.formRow}>
          <View style={styles.formSideField}>
            <FloatingInput
              label="Intervalo"
              value={customValue}
              onChangeText={(value) => {
                setCustomValue(value);
                applyCustomFrequency(value, customUnit);
              }}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.formSideField}>
            <View style={styles.segmented}>
              <Pressable
                style={[styles.segment, customUnit === "minutes" && styles.segmentActive]}
                onPress={() => {
                  setCustomUnit("minutes");
                  applyCustomFrequency(customValue, "minutes");
                }}
              >
                <Text style={[styles.segmentText, customUnit === "minutes" && styles.segmentTextActive]}>Min</Text>
              </Pressable>
              <Pressable
                style={[styles.segment, customUnit === "hours" && styles.segmentActive]}
                onPress={() => {
                  setCustomUnit("hours");
                  applyCustomFrequency(customValue, "hours");
                }}
              >
                <Text style={[styles.segmentText, customUnit === "hours" && styles.segmentTextActive]}>Horas</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <FloatingInput label="Indicaciones extras u observación" value={draft.instructions} onChangeText={(value) => onChange({ ...draft, instructions: value })} />

      <TimeSelector value={draft.firstTime} onChange={(value) => onChange({ ...draft, firstTime: value })} />

      <FormSectionTitle title="Cuánto medicamento tienes" />
      <View style={styles.formRow}>
        <View style={styles.formSideField}>
          <FloatingInput label="Frascos/cajas" value={numberInputValue(draft.containerCount)} onChangeText={(value) => onChange({ ...draft, containerCount: Number(sanitizeNumericInput(value)) || 0 })} keyboardType="numeric" error={Boolean(errors?.containerCount)} />
        </View>
        <View style={styles.formMainField}>
          <FloatingInput label={totalUnitsLabel(draft.unitLabel)} value={numberInputValue(draft.unitsPerContainer)} onChangeText={(value) => onChange({ ...draft, unitsPerContainer: Number(sanitizeNumericInput(value)) || 0 })} keyboardType="numeric" error={Boolean(errors?.unitsPerContainer)} />
        </View>
      </View>
      {errors?.containerCount || errors?.unitsPerContainer ? <Text style={styles.inlineErrorText}>Completa cuántos frascos o cajas tienes y el total por frasco/caja.</Text> : null}
    </View>
  );
}

function ModalShell({
  visible,
  title,
  children,
  onClose
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}>
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable style={styles.modalClose} onPress={onClose}>
                <X color={theme.colors.ink} size={20} />
              </Pressable>
            </View>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={styles.modalContent}
            >
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  appShell: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  splashScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: theme.colors.background
  },
  splashLogo: {
    width: 210,
    height: 210
  },
  splashTitle: {
    marginTop: 12,
    fontSize: 42,
    fontWeight: "900",
    color: theme.colors.white,
    letterSpacing: 0
  },
  splashTagline: {
    marginTop: 4,
    color: theme.colors.mint,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  authScroll: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  authScreen: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 18,
    padding: 18,
    paddingTop: SCREEN_TOP_GAP + 12,
    paddingBottom: 28
  },
  authBrand: {
    alignItems: "center",
    gap: 2
  },
  authLogo: {
    width: 132,
    height: 132
  },
  authAppName: {
    fontSize: 34,
    fontWeight: "900",
    color: theme.colors.white,
    letterSpacing: 0
  },
  authTagline: {
    color: theme.colors.mint,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  authPanel: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: 14,
    padding: 18,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  authTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: theme.colors.ink,
    textAlign: "center"
  },
  authMethodRow: {
    flexDirection: "row",
    gap: 8
  },
  authMethodButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  authMethodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  authMethodText: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    textAlign: "center"
  },
  authMethodTextActive: {
    color: theme.colors.white
  },
  authLinkButton: {
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center"
  },
  authInlineText: {
    color: theme.colors.primaryDark,
    textAlign: "center",
    fontWeight: "700"
  },
  authInlineLink: {
    color: theme.colors.primaryDark,
    fontWeight: "900"
  },
  authDividerText: {
    color: theme.colors.primaryDark,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500"
  },
  socialButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14
  },
  socialButton: {
    width: 56,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  authNotice: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mint
  },
  authNoticeText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  biometricPanel: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mint,
    borderWidth: 1,
    borderColor: theme.colors.primary
  },
  biometricButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary
  },
  savedLoginStack: {
    gap: 12
  },
  savedAccountChips: {
    gap: 8
  },
  savedAccountChip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  savedAccountChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  savedAccountChipText: {
    color: theme.colors.primaryDark,
    fontWeight: "900"
  },
  savedAccountChipTextActive: {
    color: theme.colors.white
  },
  passwordHint: {
    marginTop: -8,
    color: theme.colors.primaryDark,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: SCREEN_TOP_GAP,
    paddingRight: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: theme.colors.background
  },
  switcher: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 10,
    backgroundColor: theme.colors.background
  },
  topProfileButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: theme.colors.primary
  },
  switcherContent: {
    gap: 10,
    paddingHorizontal: 18
  },
  profileChip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.backgroundSoft,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  profileChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primary
  },
  profileDot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12
  },
  profileChipText: {
    fontSize: 14,
    color: theme.colors.mint,
    fontWeight: "700",
    textAlign: "center"
  },
  profileChipTextActive: {
    color: theme.colors.white
  },
  addChip: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.peach
  },
  content: {
    flex: 1
  },
  contentInner: {
    paddingBottom: 132
  },
  screen: {
    padding: 18,
    gap: 16
  },
  profileScreen: {
    paddingTop: SCREEN_TOP_GAP
  },
  keyboardScreen: {
    flex: 1
  },
  firstProfileContent: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 16,
    padding: 18,
    paddingTop: SCREEN_TOP_GAP + 18,
    paddingBottom: 36
  },
  firstProfileLogo: {
    width: 118,
    height: 118,
    alignSelf: "center"
  },
  firstProfileText: {
    maxWidth: 520,
    alignSelf: "center",
    color: theme.colors.mint,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "700"
  },
  firstProfileCard: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    gap: 14,
    padding: 16,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  todayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.mint,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: theme.colors.white,
    letterSpacing: 0
  },
  profileTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: theme.colors.mint,
    letterSpacing: 0
  },
  centeredTitle: {
    textAlign: "center"
  },
  roundButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary
  },
  secondaryIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.peach
  },
  addProfileButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.peach
  },
  addProfileButtonText: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    textAlign: "center"
  },
  callout: {
    padding: 18,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1
  },
  nextDoseStack: {
    gap: 10
  },
  nextDoseItem: {
    gap: 2
  },
  nextDoseItemDivided: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line
  },
  snoozedPanel: {
    gap: 6,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mint,
    borderWidth: 1,
    borderColor: theme.colors.primary
  },
  snoozedPanelTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.primaryDark
  },
  snoozedPanelText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.ink,
    fontWeight: "700"
  },
  nextHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  nextLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.primaryDark
  },
  nextTime: {
    marginTop: 8,
    fontSize: 42,
    fontWeight: "900",
    color: theme.colors.ink,
    letterSpacing: 0
  },
  nextDate: {
    marginTop: -2,
    marginBottom: 4,
    fontSize: 13,
    color: theme.colors.primaryDark,
    fontWeight: "800"
  },
  nextMedication: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.ink
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.primaryDark
  },
  softText: {
    fontSize: 13,
    color: theme.colors.primaryDark
  },
  statsRow: {
    flexDirection: "row",
    gap: 10
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.ink
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: "700"
  },
  historyDashboard: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10
  },
  metricCard: {
    width: "46%",
    maxWidth: 168,
    minHeight: 106,
    gap: 4,
    padding: 16,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 2
  },
  metricDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.ink
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: "900"
  },
  warningPanel: {
    gap: 8,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.peach,
    borderWidth: 1,
    borderColor: theme.colors.apricot
  },
  scorePill: {
    minWidth: 64,
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.white
  },
  scoreText: {
    color: theme.colors.primaryDark,
    fontWeight: "900"
  },
  rhythmRecipeName: {
    color: theme.colors.ink,
    fontWeight: "900"
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.white
  },
  emptyBlock: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8
  },
  emptyState: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 18,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  doseRow: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  timeBlock: {
    width: 76,
    gap: 8
  },
  timeText: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.ink
  },
  doseDateText: {
    fontSize: 11,
    lineHeight: 13,
    color: theme.colors.primaryDark,
    fontWeight: "800"
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.white
  },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.ink
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  rowBetweenTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  flex: {
    flex: 1
  },
  recipeCardActions: {
    gap: 8,
    alignItems: "flex-end"
  },
  editRecipeButton: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mint
  },
  editRecipeText: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    color: theme.colors.primaryDark
  },
  deleteRecipeButton: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.rose
  },
  deleteRecipeText: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    color: theme.colors.white
  },
  sourceBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.primaryDark
  },
  recipeImage: {
    width: "100%",
    height: 160,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSoft
  },
  medicationMiniList: {
    gap: 8
  },
  miniRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  miniText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.ink
  },
  inlineButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mint
  },
  inlineButtonText: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    flexShrink: 1,
    color: theme.colors.primaryDark
  },
  inventoryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8
  },
  inventoryStatusText: {
    width: "100%",
    fontSize: 13,
    color: theme.colors.primaryDark
  },
  inventoryActionButton: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 0,
    justifyContent: "center"
  },
  deleteInventoryButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.rose
  },
  deleteInventoryText: {
    color: theme.colors.white,
    fontWeight: "900",
    fontSize: 13,
    textAlign: "center",
    flexShrink: 1
  },
  inventoryTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  unitIconBubble: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21
  },
  stockBadge: {
    minWidth: 48,
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill
  },
  stockBadgeText: {
    color: theme.colors.ink,
    fontWeight: "900"
  },
  stockTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "#eadfce"
  },
  stockFill: {
    height: "100%",
    borderRadius: 5
  },
  historyRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  statusText: {
    fontSize: 13,
    fontWeight: "900"
  },
  skipReasonText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.primaryDark,
    fontWeight: "700"
  },
  doseMarkerText: {
    alignSelf: "flex-start",
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mint,
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: "900"
  },
  profileCard: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  profileCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceAlt
  },
  profileIconBubble: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29
  },
  profileName: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.ink
  },
  iconSoftButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.mint
  },
  iconDangerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.rose
  },
  profileActions: {
    gap: 8
  },
  accountPanel: {
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  adminPanel: {
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mint,
    borderWidth: 1,
    borderColor: theme.colors.primary
  },
  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  adminRefreshButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  adminRefreshText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  adminMetric: {
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 74,
    justifyContent: "center",
    gap: 2,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  adminMetricValue: {
    color: theme.colors.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  adminMetricLabel: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  adminStatusBox: {
    gap: 4,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  adminStatusText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  adminFootnote: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  },
  treatmentPanel: {
    gap: 10,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  aboutPanel: {
    gap: 10,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  aboutCentered: {
    alignItems: "center",
    gap: 8
  },
  aboutActions: {
    flexDirection: "row",
    gap: 10
  },
  mutedCentered: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.primaryDark,
    textAlign: "center"
  },
  baseTimeRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  baseTimeName: {
    color: theme.colors.ink,
    fontWeight: "900"
  },
  treatmentSummaryRow: {
    gap: 7,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line
  },
  treatmentRecipeName: {
    color: theme.colors.ink,
    fontWeight: "900"
  },
  actionRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  actionRowCompact: {
    marginTop: 10
  },
  actionButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill
  },
  actionTaken: {
    backgroundColor: theme.colors.primary
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: "900",
    textAlign: "center"
  },
  actionButtonSoft: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mint
  },
  actionButtonSoftText: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    textAlign: "center"
  },
  iconOnlyButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#f9e4df"
  },
  actionSkipButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: "#f9e4df"
  },
  actionSkipText: {
    color: theme.colors.rose,
    fontWeight: "900",
    textAlign: "center"
  },
  bottomNav: {
    minHeight: 90,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: theme.colors.background
  },
  navItem: {
    minWidth: 64,
    alignItems: "center",
    gap: 5,
    paddingTop: 8,
    paddingBottom: 7,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm
  },
  navItemActive: {
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  navText: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    color: theme.colors.mint
  },
  navTextActive: {
    color: theme.colors.white
  },
  navRecipeButton: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    marginTop: -38,
    borderWidth: 7,
    borderColor: theme.colors.background
  },
  navRecipeText: {
    maxWidth: 78,
    textAlign: "center",
    color: theme.colors.white,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "900"
  },
  modalKeyboard: {
    flex: 1
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8, 12, 11, 0.68)"
  },
  modalSheet: {
    width: "100%",
    maxWidth: 860,
    maxHeight: "92%",
    alignSelf: "center",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: theme.colors.surface
  },
  modalHeader: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.ink
  },
  modalClose: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#efe5d6"
  },
  modalContent: {
    padding: 18,
    paddingBottom: 140,
    overflow: "visible"
  },
  modalStack: {
    gap: 14,
    overflow: "visible"
  },
  contactFormStack: {
    gap: 18
  },
  noticeOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(8, 12, 11, 0.68)"
  },
  noticeCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: 12,
    padding: 20,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  noticeIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24
  },
  noticeTitle: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center"
  },
  noticeMessage: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center"
  },
  tutorialRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb"
  },
  tutorialNumber: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: theme.colors.primary
  },
  tutorialNumberText: {
    color: theme.colors.white,
    fontWeight: "900",
    textAlign: "center"
  },
  choiceActions: {
    width: "100%",
    gap: 10
  },
  choiceButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary
  },
  choiceButtonSecondary: {
    backgroundColor: theme.colors.mint
  },
  choiceButtonDanger: {
    backgroundColor: theme.colors.rose
  },
  choiceButtonSecondaryText: {
    color: theme.colors.primaryDark
  },
  tutorialOverlay: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
    padding: 20,
    paddingTop: SCREEN_TOP_GAP + 20,
    backgroundColor: "rgba(8, 12, 11, 0.76)"
  },
  tutorialSpotlight: {
    alignSelf: "center",
    maxWidth: 320,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(217,237,223,0.18)",
    borderWidth: 2,
    borderColor: theme.colors.mint
  },
  tutorialSpotlightText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  tutorialArrow: {
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: theme.colors.surface
  },
  tutorialCard: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: 10,
    padding: 18,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  tutorialProgress: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase"
  },
  tutorialTitle: {
    color: theme.colors.ink,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center"
  },
  tutorialMessage: {
    color: theme.colors.primaryDark,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center"
  },
  tutorialActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4
  },
  field: {
    flex: 1,
    gap: 7,
    minWidth: 0,
    overflow: "visible"
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.primaryDark
  },
  formSectionTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.primaryDark
  },
  inlineErrorText: {
    marginTop: -6,
    color: theme.colors.rose,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  inputError: {
    borderColor: theme.colors.rose,
    borderWidth: 2
  },
  floatingInputLabelError: {
    color: theme.colors.rose
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    color: theme.colors.ink,
    backgroundColor: theme.colors.white,
    fontSize: 15,
    fontWeight: "600"
  },
  floatingInputContainer: {
    width: "100%",
    minHeight: 56,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.white
  },
  floatingInputContainerMultiline: {
    minHeight: 112,
    justifyContent: "flex-start"
  },
  floatingInputLabel: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 17,
    maxHeight: 18,
    overflow: "hidden",
    color: theme.colors.primaryDark,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "500",
    zIndex: 1
  },
  floatingInputLabelActive: {
    top: 7,
    fontSize: 11,
    color: theme.colors.primaryDark
  },
  floatingInput: {
    minHeight: 54,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 6,
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: "600"
  },
  floatingInputWithIcon: {
    paddingRight: 46
  },
  floatingInputMultiline: {
    minHeight: 110,
    paddingTop: 26,
    textAlignVertical: "top"
  },
  passwordToggle: {
    position: "absolute",
    right: 10,
    top: 8,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20
  },
  photoActions: {
    flexDirection: "row",
    gap: 10
  },
  optionButton: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  optionButtonActive: {
    backgroundColor: theme.colors.mint,
    borderColor: theme.colors.primary
  },
  optionButtonDisabled: {
    opacity: 0.55
  },
  optionText: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    color: theme.colors.primaryDark
  },
  modalImage: {
    width: "100%",
    height: 180,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSoft
  },
  primaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary
  },
  primaryButtonSmall: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center",
    flexShrink: 1
  },
  dangerButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.rose
  },
  confirmDangerButton: {
    backgroundColor: theme.colors.rose
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mint
  },
  secondaryButtonText: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    fontSize: 14,
    textAlign: "center",
    flexShrink: 1
  },
  fullWidthButton: {
    width: "100%",
    flex: 0
  },
  wizardActions: {
    flexDirection: "row",
    gap: 10
  },
  chips: {
    gap: 8
  },
  chip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  chipText: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    textAlign: "center"
  },
  chipTextActive: {
    color: theme.colors.white
  },
  stepper: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14
  },
  stepPill: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: "#f3eadb"
  },
  stepPillActive: {
    backgroundColor: theme.colors.primary
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.primaryDark,
    textAlign: "center"
  },
  stepPillStepText: {
    fontSize: 10,
    fontWeight: "500",
    color: theme.colors.primaryDark,
    textAlign: "center"
  },
  stepPillTextActive: {
    color: theme.colors.white
  },
  formStack: {
    gap: 14,
    overflow: "visible"
  },
  formRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  formRowRaised: {
    zIndex: 320,
    elevation: 36
  },
  formMainField: {
    flex: 2,
    minWidth: 0
  },
  formSideField: {
    flex: 1,
    minWidth: 0
  },
  formThirdField: {
    flex: 1,
    minWidth: 0
  },
  doctorInputBlock: {
    gap: 7,
    zIndex: 60,
    elevation: 12,
    overflow: "visible"
  },
  doctorPrefixField: {
    width: 92,
    zIndex: 65,
    elevation: 12
  },
  frequencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  frequencyChip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  frequencyChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  frequencyChipText: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    textAlign: "center"
  },
  frequencyChipTextActive: {
    color: theme.colors.white
  },
  segmented: {
    flexDirection: "row",
    gap: 8
  },
  segment: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  segmentText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
    textAlign: "center",
    color: theme.colors.primaryDark
  },
  segmentTextActive: {
    color: theme.colors.white
  },
  calendarPanel: {
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  calendarTitle: {
    flex: 1,
    textAlign: "center",
    color: theme.colors.ink,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  calendarNavButton: {
    minHeight: 34,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mint
  },
  calendarNavText: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center"
  },
  weekRow: {
    flexDirection: "row"
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: theme.colors.primaryDark,
    fontWeight: "900"
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  calendarDay: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm
  },
  calendarDayEmpty: {
    opacity: 0
  },
  calendarDayDisabled: {
    opacity: 0.28
  },
  calendarDaySelected: {
    backgroundColor: theme.colors.primary
  },
  calendarDayText: {
    color: theme.colors.ink,
    fontWeight: "900",
    textAlign: "center"
  },
  calendarDayTextDisabled: {
    color: theme.colors.primary
  },
  calendarDayTextSelected: {
    color: theme.colors.white
  },
  calendarDot: {
    position: "absolute",
    right: 10,
    top: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary
  },
  twoColumns: {
    flexDirection: "row",
    gap: 10
  },
  suggestionBox: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mint
  },
  suggestionText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontWeight: "800"
  },
  pickerOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(8, 14, 13, 0.62)"
  },
  pickerSheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "72%",
    gap: 10,
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  pickerHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  pickerTitle: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  pickerScroll: {
    maxHeight: 360
  },
  pickerContent: {
    gap: 8,
    paddingBottom: 6
  },
  pickerOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  pickerOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  pickerOptionText: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    textAlign: "center"
  },
  pickerOptionTextActive: {
    color: theme.colors.white
  },
  dropdownField: {
    width: "100%",
    minHeight: 56,
    position: "relative",
    zIndex: 180,
    elevation: 20
  },
  dropdownFieldOpen: {
    zIndex: 1000,
    elevation: 60
  },
  dropdownFieldLabel: {
    position: "absolute",
    top: -22,
    left: 0,
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.primaryDark
  },
  dropdownButton: {
    minHeight: 56,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.white
  },
  dropdownText: {
    color: theme.colors.primaryDark,
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 17,
    maxHeight: 18,
    overflow: "hidden"
  },
  dropdownPlaceholderText: {
    color: theme.colors.primaryDark,
    fontWeight: "500"
  },
  dropdownPanel: {
    position: "absolute",
    top: 66,
    left: 0,
    right: 0,
    zIndex: 1200,
    elevation: 70,
    maxHeight: 300,
    gap: 8,
    padding: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb"
  },
  dropdownScroll: {
    maxHeight: 260
  },
  dropdownScrollContent: {
    paddingBottom: 8
  },
  dropdownOption: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm
  },
  dropdownOptionActive: {
    backgroundColor: theme.colors.primary
  },
  dropdownOptionText: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    textAlign: "center"
  },
  dropdownOptionTextActive: {
    color: theme.colors.white
  },
  ageSelectorRow: {
    alignItems: "flex-start",
    zIndex: 90,
    elevation: 18,
    overflow: "visible"
  },
  timeSelectorHint: {
    marginTop: 6,
    color: theme.colors.primaryDark,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600"
  },
  timeDisplayButton: {
    minHeight: 50,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.white
  },
  timeDisplayText: {
    color: theme.colors.primaryDark,
    fontSize: 15,
    fontWeight: "800"
  },
  timePickerSheet: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  timeWheel: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.white
  },
  timeSeparator: {
    color: theme.colors.primaryDark,
    fontSize: 28,
    fontWeight: "900"
  },
  timePartLabel: {
    marginBottom: 6,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  timeWheelColumn: {
    width: 76,
    gap: 6
  },
  timeWheelLabel: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  timeWheelFrame: {
    height: 154,
    overflow: "hidden",
    borderRadius: theme.radius.sm,
    backgroundColor: "#f8f3eb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  timeWheelScroll: {
    height: 154
  },
  timeWheelContent: {
    paddingVertical: 54
  },
  timeWheelOption: {
    height: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  timeWheelOptionActive: {
    backgroundColor: theme.colors.mint
  },
  timeWheelText: {
    color: theme.colors.primaryDark,
    fontSize: 18,
    fontWeight: "700"
  },
  timeWheelTextActive: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  timeWheelCenterLine: {
    position: "absolute",
    top: 59,
    left: 0,
    right: 0,
    height: 36,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(39, 95, 70, 0.18)"
  },
  timeQuickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  timeQuickButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mint
  },
  timeQuickText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  timeClearButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  timeClearText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  ageDropdown: {
    width: "100%",
    minHeight: 56,
    position: "relative",
    zIndex: 90,
    elevation: 18
  },
  compactDropdown: {
    width: undefined,
    minWidth: 64,
    flexGrow: 0,
    flexShrink: 0
  },
  compactDropdownButton: {
    minHeight: 46,
    paddingHorizontal: 14
  },
  ageDropdownOpen: {
    zIndex: 1000,
    elevation: 60
  },
  ageDropdownPanel: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    maxHeight: 180,
    zIndex: 1200,
    elevation: 70,
    padding: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  reviewNotice: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mint
  },
  reviewText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontWeight: "800"
  },
  centeredNoticeText: {
    textAlign: "center"
  },
  scanPrototypeNotice: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: "#fff0dc",
    borderWidth: 1,
    borderColor: theme.colors.apricot
  },
  scanPrototypeText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700"
  },
  testNotice: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  testNoticeText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700"
  },
  scanNotice: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mint
  },
  scanNoticeTitle: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  scanNoticeText: {
    marginTop: 2,
    color: theme.colors.primaryDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700"
  },
  scanPreviewText: {
    marginTop: 8,
    color: theme.colors.primaryDark,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500"
  },
  summaryRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb"
  },
  inventoryModeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  inventoryModeButton: {
    width: "48%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  inventoryModeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  inventoryModeText: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    textAlign: "center"
  },
  inventoryModeTextActive: {
    color: theme.colors.white
  },
  successNotice: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.mint
  },
  successText: {
    color: theme.colors.primaryDark,
    fontWeight: "900"
  },
  messageInput: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  profileIconOption: {
    width: "31%",
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  profileIconOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  profileIconOptionText: {
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
    color: theme.colors.primaryDark
  },
  profileIconOptionTextActive: {
    color: theme.colors.white
  },
  profileColorOption: {
    width: "31%",
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line,
    zIndex: 25,
    overflow: "visible"
  },
  profileColorOptionOpen: {
    zIndex: 220,
    elevation: 30
  },
  profileColorTitle: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center"
  },
  colorDropdownButton: {
    width: 42,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  colorDropdownText: {
    flex: 1,
    color: theme.colors.primaryDark,
    fontWeight: "700",
    fontSize: 12
  },
  colorPreviewDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(36,49,47,0.2)"
  },
  colorDropdownPanel: {
    position: "absolute",
    right: 0,
    bottom: 74,
    minWidth: 178,
    flexDirection: "row",
    justifyContent: "center",
    zIndex: 240,
    elevation: 30,
    gap: 7,
    padding: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: "#f3eadb",
    borderWidth: 1,
    borderColor: theme.colors.line
  },
  colorOptionRow: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14
  },
  colorOptionRowActive: {
    backgroundColor: theme.colors.white
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 2
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: "transparent"
  },
  swatchActive: {
    borderColor: theme.colors.ink
  }
});


