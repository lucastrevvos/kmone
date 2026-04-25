import { create } from "zustand";

import { offerOverlayBridge } from "@features/offerRadar/overlayBridge";
import type {
  OfferAnalysisStatus,
  OfferCapturePayload,
  OfferCaptureStatus,
  OfferSourceApp,
  OverlayReadiness,
} from "@features/offerRadar/types";

type OfferRadarStore = {
  supported: boolean;
  active: boolean;
  loading: boolean;
  captureStatus: OfferCaptureStatus;
  sourceApp: OfferSourceApp;
  readiness: OverlayReadiness;
  lastCapture: OfferCapturePayload | null;
  lastDecision: OfferAnalysisStatus | null;
  sync(): Promise<void>;
  requestOverlayPermission(): Promise<boolean>;
  requestAccessibilityPermission(): Promise<boolean>;
  requestScreenCapturePermission(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
  setLastCapture(payload: OfferCapturePayload | null): void;
  setLastDecision(status: OfferAnalysisStatus | null): void;
};

const defaultReadiness: OverlayReadiness = {
  overlayPermissionGranted: false,
  accessibilityPermissionGranted: false,
  screenCapturePermissionGranted: false,
};

export const useOfferRadarStore = create<OfferRadarStore>((set, get) => ({
  supported: offerOverlayBridge.isSupported(),
  active: false,
  loading: false,
  captureStatus: "idle",
  sourceApp: "unknown",
  readiness: defaultReadiness,
  lastCapture: null,
  lastDecision: null,

  async sync() {
    set({ loading: true });
    try {
      const state = await offerOverlayBridge.getState();
      set({
        supported: state.available,
        active: state.active,
        readiness: state.readiness,
        captureStatus: state.captureStatus,
        lastCapture: state.lastCapture,
        sourceApp: state.lastCapture?.sourceApp ?? "unknown",
      });
    } finally {
      set({ loading: false });
    }
  },

  async requestOverlayPermission() {
    set({ loading: true });
    try {
      const granted = await offerOverlayBridge.requestOverlayPermission();
      set((state) => ({
        readiness: {
          ...state.readiness,
          overlayPermissionGranted: granted,
        },
      }));
      return granted;
    } catch (error) {
      console.error("requestOverlayPermission error:", error);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  async requestAccessibilityPermission() {
    set({ loading: true });
    try {
      const granted = await offerOverlayBridge.requestAccessibilityPermission();
      set((state) => ({
        readiness: {
          ...state.readiness,
          accessibilityPermissionGranted: granted,
        },
      }));
      return granted;
    } catch (error) {
      console.error("requestAccessibilityPermission error:", error);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  async requestScreenCapturePermission() {
    set({ loading: true });
    try {
      const granted = await offerOverlayBridge.requestScreenCapturePermission();
      set((state) => ({
        readiness: {
          ...state.readiness,
          screenCapturePermissionGranted: granted,
        },
      }));
      return granted;
    } catch (error) {
      console.error("requestScreenCapturePermission error:", error);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  async start() {
    set({ loading: true });
    try {
      const active = await offerOverlayBridge.start();
      set({ active });
      await get().sync();
    } finally {
      set({ loading: false });
    }
  },

  async stop() {
    set({ loading: true });
    try {
      await offerOverlayBridge.stop();
      set({ active: false, captureStatus: "idle" });
    } finally {
      set({ loading: false });
    }
  },

  setLastCapture(payload) {
    set((state) => {
      const nextSourceApp = payload?.sourceApp ?? "unknown";
      const nextCaptureStatus = payload ? "captured" : "idle";

      if (
        state.lastCapture === payload &&
        state.sourceApp === nextSourceApp &&
        state.captureStatus === nextCaptureStatus
      ) {
        return state;
      }

      return {
        lastCapture: payload,
        sourceApp: nextSourceApp,
        captureStatus: nextCaptureStatus,
      };
    });
  },

  setLastDecision(status) {
    set((state) => {
      if (state.lastDecision === status) {
        return state;
      }

      return { lastDecision: status };
    });
  },
}));
