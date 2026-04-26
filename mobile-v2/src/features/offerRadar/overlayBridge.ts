import type { Settings } from "@core/domain/types";
import { Linking, NativeModules, Platform } from "react-native";

import type {
  OfferCapturePayload,
  OfferCaptureStatus,
  OfferDebugState,
  OfferDebugRead,
  OverlayReadiness,
} from "./types";

export type OverlayBridgeState = {
  available: boolean;
  active: boolean;
  readiness: OverlayReadiness;
  captureStatus: OfferCaptureStatus;
  lastCapture: OfferCapturePayload | null;
  recentDebugReads: OfferDebugRead[];
  debugState: OfferDebugState | null;
};

const defaultReadiness: OverlayReadiness = {
  overlayPermissionGranted: false,
  accessibilityPermissionGranted: false,
  screenCapturePermissionGranted: false,
};

type OfferOverlayNativeModule = {
  isOverlayPermissionGranted?: () => Promise<boolean>;
  openOverlayPermissionSettings?: () => Promise<boolean>;
  isAccessibilityPermissionGranted?: () => Promise<boolean>;
  openAccessibilityPermissionSettings?: () => Promise<boolean>;
  isScreenCapturePermissionGranted?: () => Promise<boolean>;
  requestScreenCapturePermission?: () => Promise<boolean>;
  isOverlayActive?: () => Promise<boolean>;
  getLatestCapture?: () => Promise<OfferCapturePayload | null>;
  getRecentDebugReads?: () => Promise<OfferDebugRead[]>;
  getCaptureStatus?: () => Promise<OfferCaptureStatus>;
  getDebugState?: () => Promise<OfferDebugState | null>;
  setRadarConfig?: (
    minValor: number,
    minRsKm: number,
    minRsHora: number,
  ) => Promise<boolean>;
  startOverlay?: (
    status: string,
    title: string,
    subtitle: string,
  ) => Promise<boolean>;
  stopOverlay?: () => Promise<boolean>;
  updateOverlay?: (
    status: string,
    title: string,
    subtitle: string,
  ) => Promise<boolean>;
  hideOverlay?: () => Promise<boolean>;
};

const nativeModule = NativeModules.OfferOverlayModule as
  | OfferOverlayNativeModule
  | undefined;

console.log("[KMONE_OCR][JS] NativeModules.OfferOverlayModule =", nativeModule);

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export const offerOverlayBridge = {
  isSupported() {
    console.log("[KMONE_OCR][JS] isSupported check", {
      platform: Platform.OS,
      hasNativeModule: !!nativeModule,
    });
    return Platform.OS === "android" && !!nativeModule;
  },

  async getState(): Promise<OverlayBridgeState> {
    console.log("[KMONE_OCR][JS] getState start", {
      hasNativeModule: !!nativeModule,
      nativeKeys: nativeModule ? Object.keys(nativeModule) : [],
    });
    const overlayPermissionGranted =
      Platform.OS === "android" &&
      !!nativeModule?.isOverlayPermissionGranted
        ? await (console.log("[KMONE_OCR][JS] calling isOverlayPermissionGranted"),
          nativeModule.isOverlayPermissionGranted())
        : false;
    const accessibilityPermissionGranted =
      Platform.OS === "android" &&
      !!nativeModule?.isAccessibilityPermissionGranted
        ? await (console.log("[KMONE_OCR][JS] calling isAccessibilityPermissionGranted"),
          nativeModule.isAccessibilityPermissionGranted())
        : false;
    const active =
      Platform.OS === "android" && !!nativeModule?.isOverlayActive
        ? await (console.log("[KMONE_OCR][JS] calling isOverlayActive"),
          nativeModule.isOverlayActive())
        : false;
    const screenCapturePermissionGranted =
      Platform.OS === "android" &&
      !!nativeModule?.isScreenCapturePermissionGranted
        ? await (console.log("[KMONE_OCR][JS] calling isScreenCapturePermissionGranted"),
          nativeModule.isScreenCapturePermissionGranted())
        : false;
    const lastCapture =
      Platform.OS === "android" && !!nativeModule?.getLatestCapture
        ? await (console.log("[KMONE_OCR][JS] calling getLatestCapture"),
          nativeModule.getLatestCapture())
        : null;
    const captureStatus =
      Platform.OS === "android" && !!nativeModule?.getCaptureStatus
        ? await (console.log("[KMONE_OCR][JS] calling getCaptureStatus"),
          nativeModule.getCaptureStatus())
        : "idle";
    const recentDebugReads =
      Platform.OS === "android" && !!nativeModule?.getRecentDebugReads
        ? await (console.log("[KMONE_OCR][JS] calling getRecentDebugReads"),
          nativeModule.getRecentDebugReads())
        : [];
    const debugState =
      Platform.OS === "android" && !!nativeModule?.getDebugState
        ? await (console.log("[KMONE_OCR][JS] calling getDebugState"),
          nativeModule.getDebugState())
        : null;

    console.log("[KMONE_OCR][JS] getState result", {
      overlayPermissionGranted,
      accessibilityPermissionGranted,
      screenCapturePermissionGranted,
      active,
      captureStatus,
      recentDebugReadsCount: recentDebugReads.length,
      debugState,
    });

    return {
      available: this.isSupported(),
      active,
      readiness: {
        ...defaultReadiness,
        overlayPermissionGranted,
        accessibilityPermissionGranted,
        screenCapturePermissionGranted,
      },
      captureStatus,
      lastCapture,
      recentDebugReads,
      debugState,
    };
  },

  async requestOverlayPermission() {
    console.log("[KMONE_OCR][JS] requestOverlayPermission");
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.openOverlayPermissionSettings) {
      await Linking.openSettings();
      return false;
    }

    await nativeModule.openOverlayPermissionSettings();

    if (!nativeModule.isOverlayPermissionGranted) return false;
    return nativeModule.isOverlayPermissionGranted();
  },

  async requestAccessibilityPermission() {
    console.log("[KMONE_OCR][JS] requestAccessibilityPermission");
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.openAccessibilityPermissionSettings) {
      await Linking.openSettings();
      return false;
    }

    await nativeModule.openAccessibilityPermissionSettings();

    if (!nativeModule.isAccessibilityPermissionGranted) return false;
    return nativeModule.isAccessibilityPermissionGranted();
  },

  async requestScreenCapturePermission() {
    console.log("[KMONE_OCR][JS] requestScreenCapturePermission");
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.requestScreenCapturePermission) return false;

    return withTimeout(
      nativeModule.requestScreenCapturePermission(),
      15000,
      false,
    );
  },

  async syncRadarConfig(settings: Settings) {
    console.log("[KMONE_OCR][JS] syncRadarConfig", settings);
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.setRadarConfig) return false;

    return nativeModule.setRadarConfig(
      settings.radarMinValor,
      settings.radarMinRSKm,
      settings.radarMinRSHora,
    );
  },

  async start() {
    console.log("[KMONE_OCR][JS] start overlay");
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.startOverlay) return false;

    return nativeModule.startOverlay(
      "HIDDEN",
      "Radar flutuante ativo",
      "Aguardando leitura da oferta",
    );
  },

  async stop() {
    console.log("[KMONE_OCR][JS] stop overlay");
    if (Platform.OS !== "android") return true;
    if (!nativeModule?.stopOverlay) return true;
    return nativeModule.stopOverlay();
  },

  async updatePreview(input: {
    status: string;
    title: string;
    subtitle: string;
  }) {
    console.log("[KMONE_OCR][JS] updatePreview", input);
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.updateOverlay) return false;

    return nativeModule.updateOverlay(input.status, input.title, input.subtitle);
  },

  async hide() {
    console.log("[KMONE_OCR][JS] hide overlay");
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.hideOverlay) return false;

    return nativeModule.hideOverlay();
  },
};
