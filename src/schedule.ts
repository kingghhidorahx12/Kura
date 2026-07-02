import { DoseEvent, Medication, StockLevel } from "./types";

const pad = (value: number) => value.toString().padStart(2, "0");

export function todayDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short"
  }).format(new Date(iso));
}

export function getStockLevel(medication: Medication): StockLevel {
  if (medication.totalUnits <= 0) {
    return "critical";
  }
  const ratio = medication.remainingUnits / medication.totalUnits;
  if (ratio <= 0.2) {
    return "critical";
  }
  if (ratio <= 0.4) {
    return "low";
  }
  return "ok";
}

export function getStockPercent(medication: Medication) {
  if (medication.totalUnits <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((medication.remainingUnits / medication.totalUnits) * 100)));
}

export function suggestTimes(firstTime: string, frequencyMinutes: number) {
  const [hourText, minuteText] = firstTime.split(":");
  const startMinutes = Number(hourText) * 60 + Number(minuteText);
  const safeFrequency = Math.max(30, frequencyMinutes || 480);
  const slots = Math.max(1, Math.floor((24 * 60) / safeFrequency));

  return Array.from({ length: slots }, (_, index) => {
    const nextTotalMinutes = (startMinutes + index * safeFrequency) % (24 * 60);
    const nextHour = Math.floor(nextTotalMinutes / 60);
    const nextMinute = nextTotalMinutes % 60;
    return `${pad(nextHour)}:${pad(nextMinute)}`;
  });
}

export function formatFrequency(minutes: number) {
  if (minutes < 60) {
    return `Cada ${minutes} min`;
  }

  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return `Cada ${hours} h`;
  }

  return `Cada ${hours.toFixed(1)} h`;
}

export function buildDoseEvents(medication: Medication): DoseEvent[] {
  const events: DoseEvent[] = [];
  const start = new Date(`${medication.startDate}T00:00:00`);

  for (let dayIndex = 0; dayIndex < medication.durationDays; dayIndex += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + dayIndex);
    const dateKey = todayDateKey(day);

    medication.times.forEach((time, slotIndex) => {
      events.push({
        id: `${medication.id}-${dayIndex}-${slotIndex}`,
        medicationId: medication.id,
        profileId: medication.profileId,
        recipeId: medication.recipeId,
        scheduledAt: new Date(`${dateKey}T${time}:00`).toISOString(),
        status: "pending"
      });
    });
  }

  return events;
}

export function nextPendingEvent(events: DoseEvent[]) {
  return [...events]
    .filter((event) => event.status === "pending")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
}
