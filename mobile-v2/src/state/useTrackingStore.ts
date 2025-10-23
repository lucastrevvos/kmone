import { create } from "zustand";
import { ExpoGpsPort } from "@core/infra/expoGps";
import type { AppFonte } from "@core/domain/types";

function haversine(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat),
    la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type DraftRide = { receitaBruta: number; app: AppFonte };

type TrackState = {
  running: boolean;
  distanceMeters: number;
  lastPoint?: { lat: number; lon: number; t: number };
  points: Array<{ lat: number; lon: number; t: number }>;
  draft?: DraftRide; // 👈 guarda valor + app enquanto trackeia

  startWithDraft(d: DraftRide): Promise<void>;
  stop(): Promise<{ distanceMeters: number; draft?: DraftRide }>;
};

const gps = ExpoGpsPort();

export const useTrackingStore = create<TrackState>((set, get) => ({
  running: false,
  distanceMeters: 0,
  points: [],

  async startWithDraft(draft) {
    const ok = await gps.ensurePermissions();
    if (ok !== "granted") throw new Error("Permissão de localização negada");

    set({
      running: true,
      distanceMeters: 0,
      lastPoint: undefined,
      points: [],
      draft,
    });

    await gps.startForeground((p) => {
      const s = get();
      if (p.accuracy && p.accuracy > 50) return;
      if (!s.lastPoint) {
        set({ lastPoint: p, points: [...s.points, p] });
        return;
      }

      const d = haversine(s.lastPoint, p);
      if (d > 0 && d < 200) {
        set({
          distanceMeters: s.distanceMeters + d,
          lastPoint: p,
          points: [...s.points, p],
        });
      } else {
        set({ lastPoint: p, points: [...s.points, p] });
      }
    });
  },

  async stop() {
    await gps.stop();
    const { distanceMeters, draft } = get();
    set({ running: false, draft: undefined });
    return { distanceMeters, draft };
  },
}));
