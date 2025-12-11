import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExpoGpsPort, setBackgroundPointHandler } from "@core/infra/expoGps";
import type { AppFonte } from "@core/domain/types";

const TRACKING_KEY = "@kmone:tracking-session";

function haversine(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
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

type DraftRide = {
  receitaBruta: number;
  app: AppFonte;
  startedAt: string;
};

type TrackPoint = { lat: number; lon: number; t: number; accuracy?: number };

type TrackState = {
  running: boolean;
  distanceMeters: number;
  lastPoint?: TrackPoint;
  points: TrackPoint[];
  draft?: DraftRide;

  startWithDraft(d: Omit<DraftRide, "startedAt">): Promise<void>;
  stop(): Promise<{
    distanceMeters: number;
    draft?: DraftRide;
    endedAt: string;
    durationMinutes: number;
  }>;
  restoreTrackingSession(): Promise<void>;
};

const gps = ExpoGpsPort();

export const useTrackingStore = create<TrackState>((set, get) => {
  // 👇 Função única para aplicar ponto + persistir estado
  const applyPoint = (p: TrackPoint) => {
    const s = get();

    // filtra leituras ruins
    if (p.accuracy && p.accuracy > 50) return;

    // primeiro ponto
    if (!s.lastPoint) {
      const next = {
        ...s,
        lastPoint: p,
        points: [...s.points, p],
      };
      set(next);
      // persiste distância 0 + lastPoint
      void AsyncStorage.setItem(
        TRACKING_KEY,
        JSON.stringify({
          running: next.running,
          distanceMeters: next.distanceMeters,
          lastPoint: next.lastPoint,
          draft: next.draft,
        }),
      );
      return;
    }

    const d = haversine(s.lastPoint, p);

    // rejeita spikes bizarros
    if (d <= 0 || d >= 200) {
      const next = {
        ...s,
        lastPoint: p,
        points: [...s.points, p],
      };
      set(next);
      void AsyncStorage.setItem(
        TRACKING_KEY,
        JSON.stringify({
          running: next.running,
          distanceMeters: next.distanceMeters,
          lastPoint: next.lastPoint,
          draft: next.draft,
        }),
      );
      return;
    }

    const nextDistance = s.distanceMeters + d;

    const next = {
      ...s,
      distanceMeters: nextDistance,
      lastPoint: p,
      points: [...s.points, p],
    };

    set(next);

    // persiste distância acumulada + último ponto
    void AsyncStorage.setItem(
      TRACKING_KEY,
      JSON.stringify({
        running: next.running,
        distanceMeters: next.distanceMeters,
        lastPoint: next.lastPoint,
        draft: next.draft,
      }),
    );
  };

  return {
    running: false,
    distanceMeters: 0,
    points: [],

    async startWithDraft(input) {
      const perm = await gps.ensurePermissions();
      if (perm !== "granted") {
        throw new Error("Permissão de localização negada");
      }

      // cria draft completo com horário de início
      const startedAt = new Date().toISOString();
      const draft: DraftRide = {
        receitaBruta: input.receitaBruta,
        app: input.app,
        startedAt,
      };

      // zera estado e marca como rodando
      set({
        running: true,
        distanceMeters: 0,
        lastPoint: undefined,
        points: [],
        draft,
      });

      // persiste início da sessão (km 0)
      await AsyncStorage.setItem(
        TRACKING_KEY,
        JSON.stringify({
          running: true,
          distanceMeters: 0,
          lastPoint: undefined,
          draft,
        }),
      );

      // Foreground watcher
      await gps.startForeground((p) => applyPoint(p));

      // Background: define handler global para o Task chamar
      setBackgroundPointHandler((p) => {
        if (!get().running) return;
        applyPoint(p);
      });

      // sobe o serviço em 1º plano (Android) e ativa updates de BG
      await gps.startBackground();
    },

    async stop() {
      await gps.stop();
      setBackgroundPointHandler(null);

      const { distanceMeters, draft } = get();

      const endedAt = new Date().toISOString();

      const durationMinutes = draft?.startedAt
        ? Math.round(
            (new Date(endedAt).getTime() -
              new Date(draft.startedAt).getTime()) /
              1000 /
              60,
          )
        : 0;

      // limpa estado de tracking
      set({
        running: false,
        distanceMeters: 0,
        lastPoint: undefined,
        points: [],
        draft: undefined,
      });

      // remove rascunho persistido
      await AsyncStorage.removeItem(TRACKING_KEY);

      return {
        distanceMeters,
        draft,
        endedAt,
        durationMinutes,
      };
    },

    // 👇 chamada na inicialização do app / Home
    async restoreTrackingSession() {
      const saved = await AsyncStorage.getItem(TRACKING_KEY);
      if (!saved) return;

      try {
        const parsed = JSON.parse(saved) as {
          running?: boolean;
          distanceMeters?: number;
          lastPoint?: TrackPoint;
          draft?: DraftRide;
        };

        if (!parsed.draft) {
          // lixo antigo, limpa
          await AsyncStorage.removeItem(TRACKING_KEY);
          return;
        }

        // restaura estado em memória
        set({
          running: !!parsed.running,
          distanceMeters: parsed.distanceMeters ?? 0,
          lastPoint: parsed.lastPoint,
          points: [],
          draft: parsed.draft,
        });

        // reatacha GPS se ainda estiver rodando
        if (parsed.running) {
          const perm = await gps.ensurePermissions();
          if (perm === "granted") {
            await gps.startForeground((p) => applyPoint(p));
            setBackgroundPointHandler((p) => {
              if (!get().running) return;
              applyPoint(p);
            });
            await gps.startBackground();
          }
        }
      } catch (e) {
        console.error("restoreTrackingSession error:", e);
        await AsyncStorage.removeItem(TRACKING_KEY);
      }
    },
  };
});
