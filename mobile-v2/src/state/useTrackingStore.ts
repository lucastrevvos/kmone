import { create } from "zustand";
import { ExpoGpsPort, setBackgroundPointHandler } from "@core/infra/expoGps";
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

type TrackPoint = { lat: number; lon: number; t: number; accuracy?: number };

type TrackState = {
  running: boolean;
  distanceMeters: number;
  lastPoint?: TrackPoint;
  points: TrackPoint[];
  draft?: DraftRide;

  startWithDraft(d: DraftRide): Promise<void>;
  stop(): Promise<{ distanceMeters: number; draft?: DraftRide }>;
};

const gps = ExpoGpsPort();

export const useTrackingStore = create<TrackState>((set, get) => ({
  running: false,
  distanceMeters: 0,
  points: [],

  async startWithDraft(draft) {
    const perm = await gps.ensurePermissions();
    if (perm !== "granted") throw new Error("Permissão de localização negada");

    // zera estado
    set({
      running: true,
      distanceMeters: 0,
      lastPoint: undefined,
      points: [],
      draft,
    });

    // Atualizador comum (usa a mesma lógica para FG/BG)
    const applyPoint = (p: TrackPoint) => {
      const s = get();

      // filtra leituras ruins
      if (p.accuracy && p.accuracy > 50) return;

      // primeiro ponto
      if (!s.lastPoint) {
        set({ lastPoint: p, points: [...s.points, p] });
        return;
      }

      const d = haversine(s.lastPoint, p);

      // rejeita spikes bizarros
      if (d <= 0 || d >= 200) {
        set({ lastPoint: p, points: [...s.points, p] });
        return;
      }

      set({
        distanceMeters: s.distanceMeters + d,
        lastPoint: p,
        points: [...s.points, p],
      });
    };

    // Foreground watcher
    await gps.startForeground((p) => applyPoint(p));

    // Background: define handler global para o Task chamar
    setBackgroundPointHandler((p) => {
      // só processa se ainda estiver rodando
      if (!get().running) return;
      applyPoint(p);
    });

    // Sobe o serviço em 1º plano (Android) e ativa updates de BG
    await gps.startBackground();
  },

  async stop() {
    await gps.stop();
    // remove o handler do background
    setBackgroundPointHandler(null);

    const { distanceMeters, draft } = get();
    set({ running: false, draft: undefined });
    return { distanceMeters, draft };
  },
}));
