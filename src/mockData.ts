import { DoseEvent, Medication, Profile, Recipe } from "./types";

const pad = (value: number) => value.toString().padStart(2, "0");
const now = new Date();
const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const todayIsoAt = (time: string) => new Date(`${todayKey}T${time}:00`).toISOString();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);

export const initialProfiles: Profile[] = [
  {
    id: "p1",
    name: "Ricardo",
    relationship: "Yo",
    age: "32",
    gender: "Hombre",
    icon: "adult",
    color: "#4f8b67"
  },
  {
    id: "p2",
    name: "Mama",
    relationship: "Familia",
    age: "58",
    gender: "Mujer",
    icon: "older",
    color: "#e78382"
  }
];

export const initialRecipes: Recipe[] = [
  {
    id: "r1",
    profileId: "p1",
    title: "Tratamiento de garganta",
    doctor: "Dra. Elena",
    createdAt: now.toISOString(),
    source: "photo"
  },
  {
    id: "r2",
    profileId: "p2",
    title: "Control diario",
    createdAt: yesterday.toISOString(),
    source: "manual"
  }
];

export const initialMedications: Medication[] = [
  {
    id: "m1",
    profileId: "p1",
    recipeId: "r1",
    name: "Amoxicilina",
    dose: "1 capsula",
    instructions: "Despues de comer",
    frequencyMinutes: 480,
    durationDays: 7,
    startDate: todayKey,
    times: ["07:30", "15:30", "23:30"],
    totalUnits: 21,
    remainingUnits: 12,
    unitsPerDose: 1,
    unitsPerContainer: 21,
    containerCount: 1,
    unitLabel: "Capsulas",
    color: "#4f8b67"
  },
  {
    id: "m2",
    profileId: "p1",
    recipeId: "r1",
    name: "Ibuprofeno",
    dose: "1 tableta",
    instructions: "Solo si hay molestia",
    frequencyMinutes: 720,
    durationDays: 3,
    startDate: todayKey,
    times: ["09:00", "21:00"],
    totalUnits: 10,
    remainingUnits: 3,
    unitsPerDose: 1,
    unitsPerContainer: 10,
    containerCount: 1,
    unitLabel: "Tabletas",
    color: "#e78382"
  },
  {
    id: "m3",
    profileId: "p2",
    recipeId: "r2",
    name: "Losartan",
    dose: "1 tableta",
    instructions: "Por la manana",
    frequencyMinutes: 1440,
    durationDays: 30,
    startDate: todayKey,
    times: ["08:00"],
    totalUnits: 30,
    remainingUnits: 26,
    unitsPerDose: 1,
    unitsPerContainer: 30,
    containerCount: 1,
    unitLabel: "Tabletas",
    color: "#8eb7c8"
  }
];

export const initialDoseEvents: DoseEvent[] = [
  {
    id: "d1",
    medicationId: "m1",
    profileId: "p1",
    recipeId: "r1",
    scheduledAt: todayIsoAt("07:30"),
    status: "taken",
    takenAt: todayIsoAt("07:35")
  },
  {
    id: "d2",
    medicationId: "m2",
    profileId: "p1",
    recipeId: "r1",
    scheduledAt: todayIsoAt("09:00"),
    status: "snoozed",
    originalScheduledAt: todayIsoAt("09:00"),
    snoozedAt: todayIsoAt("09:10"),
    snoozeCount: 1
  },
  {
    id: "d3",
    medicationId: "m1",
    profileId: "p1",
    recipeId: "r1",
    scheduledAt: todayIsoAt("15:30"),
    status: "pending"
  },
  {
    id: "d4",
    medicationId: "m2",
    profileId: "p1",
    recipeId: "r1",
    scheduledAt: todayIsoAt("21:00"),
    status: "pending"
  },
  {
    id: "d5",
    medicationId: "m3",
    profileId: "p2",
    recipeId: "r2",
    scheduledAt: todayIsoAt("08:00"),
    status: "taken",
    takenAt: todayIsoAt("08:01")
  }
];
