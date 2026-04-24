import * as Location from "expo-location";
import type { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";

export const KMONE_GPS_TASK = "KMONE_GPS_TASK";

export type TrackingStartErrorCode =
  | "foreground_location_denied"
  | "background_location_denied"
  | "foreground_service_start_failed";

export class TrackingStartError extends Error {
  code: TrackingStartErrorCode;

  constructor(code: TrackingStartErrorCode, message: string) {
    super(message);
    this.name = "TrackingStartError";
    this.code = code;
  }
}

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

export async function ensureAllLocationPerms(): Promise<void> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    throw new TrackingStartError(
      "foreground_location_denied",
      "Permita a localizacao para iniciar a corrida.",
    );
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") {
    throw new TrackingStartError(
      "background_location_denied",
      'Permita "o tempo todo" para rastrear a corrida em segundo plano.',
    );
  }
}

let watchSub: Location.LocationSubscription | null = null;

export const ExpoGpsPort = () => ({
  async ensurePermissions(): Promise<"granted"> {
    await ensureAllLocationPerms();
    return "granted";
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
      },
    );
  },

  async startBackground() {
    const started = await Location.hasStartedLocationUpdatesAsync(
      KMONE_GPS_TASK,
    );
    if (started) return;

    try {
      await Location.startLocationUpdatesAsync(KMONE_GPS_TASK, {
        foregroundService: {
          notificationTitle: "KM One ativo",
          notificationBody: "Rastreando seu percurso...",
        },
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.AutomotiveNavigation,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao iniciar rastreamento.";

      throw new TrackingStartError(
        "foreground_service_start_failed",
        `${message} Verifique se a permissao de localizacao esta em "Permitir o tempo todo".`,
      );
    }
  },

  async stop() {
    if (watchSub) {
      await watchSub.remove();
      watchSub = null;
    }

    const started = await Location.hasStartedLocationUpdatesAsync(
      KMONE_GPS_TASK,
    );
    if (started) {
      await Location.stopLocationUpdatesAsync(KMONE_GPS_TASK);
    }
  },
});
