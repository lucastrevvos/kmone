// core/infra/expoGps.ts
import * as Location from "expo-location";
import type { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";

export const KMONE_GPS_TASK = "KMONE_GPS_TASK";

export type GpsPoint = {
  lat: number;
  lon: number;
  t: number;
  accuracy?: number;
  speed?: number;
};

let onBackgroundPoint: ((p: GpsPoint) => void) | null = null;
export function setBackgroundPointHandler(fn: ((p: GpsPoint) => void) | null) {
  onBackgroundPoint = fn;
}

// ⚠️ Torna o executor async e remove o tipo inexistente
TaskManager.defineTask(KMONE_GPS_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("[KMONE_GPS_TASK] erro no task:", error);
    return;
  }
  const payload = data as { locations?: LocationObject[] } | undefined;
  const locs = payload?.locations ?? [];
  for (const loc of locs) {
    const p: GpsPoint = {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined,
      speed: loc.coords.speed ?? undefined,
      t: Date.now(),
    };
    onBackgroundPoint?.(p);
  }
});

export async function ensureAllLocationPerms(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return false;

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") return false;

  return true;
}

let watchSub: Location.LocationSubscription | null = null;

export const ExpoGpsPort = () => ({
  async ensurePermissions(): Promise<"granted" | "denied"> {
    const ok = await ensureAllLocationPerms();
    return ok ? "granted" : "denied";
  },

  async startForeground(onPoint: (p: GpsPoint) => void) {
    if (watchSub) await watchSub.remove();

    watchSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 3000,
        distanceInterval: 5,
        mayShowUserSettingsDialog: true,
      },
      (loc) => {
        const p: GpsPoint = {
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
          speed: loc.coords.speed ?? undefined,
          t: Date.now(),
        };
        onPoint(p);
      }
    );
  },

  async startBackground() {
    const started = await Location.hasStartedLocationUpdatesAsync(
      KMONE_GPS_TASK
    );
    if (started) return;

    await Location.startLocationUpdatesAsync(KMONE_GPS_TASK, {
      // Android Foreground Service (correto: notificationTitle/notificationBody)
      foregroundService: {
        notificationTitle: "KM One ativo",
        notificationBody: "Rastreando seu percurso…",
      },
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true, // iOS
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
    });
  },

  async stop() {
    if (watchSub) {
      await watchSub.remove();
      watchSub = null;
    }
    const started = await Location.hasStartedLocationUpdatesAsync(
      KMONE_GPS_TASK
    );
    if (started) {
      await Location.stopLocationUpdatesAsync(KMONE_GPS_TASK);
    }
  },
});
