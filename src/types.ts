export type TabKey = "today" | "recipes" | "inventory" | "history" | "profile";

export type DoseStatus = "pending" | "taken" | "snoozed" | "skipped";

export type StockLevel = "ok" | "low" | "critical";

export type ProfileIcon = "baby" | "child" | "teen" | "adult" | "older";

export type Profile = {
  id: string;
  name: string;
  relationship: string;
  age: string;
  gender: string;
  icon: ProfileIcon;
  color: string;
};

export type Recipe = {
  id: string;
  profileId: string;
  title: string;
  doctor?: string;
  createdAt: string;
  photoUri?: string;
  source: "manual" | "photo" | "scan";
  needsReview?: boolean;
};

export type Medication = {
  id: string;
  profileId: string;
  recipeId: string;
  name: string;
  dose: string;
  instructions: string;
  frequencyMinutes: number;
  durationDays: number;
  startDate: string;
  times: string[];
  totalUnits: number;
  remainingUnits: number;
  unitsPerDose: number;
  unitsPerContainer: number;
  containerCount: number;
  unitLabel: string;
  color: string;
};

export type DoseEvent = {
  id: string;
  medicationId: string;
  profileId: string;
  recipeId: string;
  scheduledAt: string;
  status: DoseStatus;
  notificationId?: string;
  originalScheduledAt?: string;
  snoozedAt?: string;
  snoozeCount?: number;
  skippedAt?: string;
  skippedReason?: string;
  takenAt?: string;
};

export type NewMedicationDraft = {
  name: string;
  dose: string;
  instructions: string;
  frequencyMinutes: number;
  durationDays: number;
  firstTime: string;
  unitsPerContainer: number;
  containerCount: number;
  unitsPerDose: number;
  unitLabel: string;
};
