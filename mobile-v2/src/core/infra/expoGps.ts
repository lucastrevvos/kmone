// core/infra/expoGps.ts
import * as Location from "expo-location";
import type { IGpsPort, GpsPoint } from "@core/ports/gps";

let watchSub: Location.LocationSubscription | null = null;

export const ExpoGpsPort = (): IGpsPort => ({
  async ensurePermissions() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted" ? "granted" : "denied";
  },

  async startForeground(onPoint) {
    if (watchSub) await watchSub.remove();
    // equilíbrio entre precisão e bateria:
    watchSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced, // mude pra High quando precisar
        timeInterval: 3000, // mínimo 3s
        distanceInterval: 5, // ou 5m
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

  async stop() {
    if (watchSub) {
      await watchSub.remove();
      watchSub = null;
    }
  },
});
