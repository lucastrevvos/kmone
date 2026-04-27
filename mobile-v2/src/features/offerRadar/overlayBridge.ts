import type { Settings } from "@core/domain/types";
import { Linking, NativeModules, Platform } from "react-native";

import type {
  OfferCapturePayload,
  OfferCaptureStatus,
  OfferDebugState,
  OfferDebugRead,
  LatestUberOfferState,
  OfferSourceApp,
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
  latestUberOfferState: LatestUberOfferState;
  lastValidUberCapture: OfferCapturePayload | null;
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

const ENABLE_RADAR_JS_DEBUG_LOGS = false;

function radarLog(...args: unknown[]) {
  if (__DEV__ && ENABLE_RADAR_JS_DEBUG_LOGS) {
    console.log(...args);
  }
}

radarLog("[KMONE_OCR][JS] NativeModules.OfferOverlayModule =", nativeModule);

function normalizeOfferSourceApp(sourceApp: string | null | undefined): OfferSourceApp {
  if (sourceApp === "uber" || sourceApp === "99") {
    return sourceApp;
  }

  return "unknown";
}

function buildLatestUberOfferState(
  debugState: OfferDebugState | null,
): LatestUberOfferState {
  const latestFrameId = debugState?.latestUberFrameId;
  const lastValidCapture = debugState?.lastUberCapture ?? null;
  const matchedValidCapture =
    !!latestFrameId && latestFrameId === lastValidCapture?.frameId;

  if (!latestFrameId) {
    return {
      status: "idle",
      sourceApp: "unknown",
      matchedValidCapture: false,
    };
  }

  const processedAt = debugState?.latestUberFrameProcessedAt;
  const parserReason = debugState?.latestUberFrameParserReason;
  const status = matchedValidCapture
    ? "valid"
    : !processedAt
      ? "detected"
      : parserReason
        ? "invalid"
        : "processing";

  return {
    status,
    frameId: latestFrameId,
    capturedAt: debugState?.latestUberFrameCapturedAt,
    processedAt,
    sourceApp: normalizeOfferSourceApp(debugState?.latestUberFrameSourceApp),
    parserReason,
    ocrText: debugState?.latestUberFrameOcrText,
    pathFull: debugState?.latestUberFramePathFull,
    pathCrop: debugState?.latestUberFramePathCrop,
    matchedValidCapture,
  };
}

function getLastValidUberCapture(
  lastCapture: OfferCapturePayload | null,
  debugState: OfferDebugState | null,
): OfferCapturePayload | null {
  if (debugState?.lastUberCapture) {
    return debugState.lastUberCapture;
  }

  if (lastCapture?.sourceApp === "uber" || lastCapture?.sourceApp === "99") {
    return lastCapture;
  }

  return null;
}

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
    radarLog("[KMONE_OCR][JS] isSupported check", {
      platform: Platform.OS,
      hasNativeModule: !!nativeModule,
    });
    return Platform.OS === "android" && !!nativeModule;
  },

  async getState(): Promise<OverlayBridgeState> {
    radarLog("[KMONE_OCR][JS] getState start", {
      hasNativeModule: !!nativeModule,
      nativeKeys: nativeModule ? Object.keys(nativeModule) : [],
    });
    const overlayPermissionGranted =
      Platform.OS === "android" &&
      !!nativeModule?.isOverlayPermissionGranted
        ? await (radarLog("[KMONE_OCR][JS] calling isOverlayPermissionGranted"),
          nativeModule.isOverlayPermissionGranted())
        : false;
    const accessibilityPermissionGranted =
      Platform.OS === "android" &&
      !!nativeModule?.isAccessibilityPermissionGranted
        ? await (radarLog("[KMONE_OCR][JS] calling isAccessibilityPermissionGranted"),
          nativeModule.isAccessibilityPermissionGranted())
        : false;
    const active =
      Platform.OS === "android" && !!nativeModule?.isOverlayActive
        ? await (radarLog("[KMONE_OCR][JS] calling isOverlayActive"),
          nativeModule.isOverlayActive())
        : false;
    const screenCapturePermissionGranted =
      Platform.OS === "android" &&
      !!nativeModule?.isScreenCapturePermissionGranted
        ? await (radarLog("[KMONE_OCR][JS] calling isScreenCapturePermissionGranted"),
          nativeModule.isScreenCapturePermissionGranted())
        : false;
    const lastCapture =
      Platform.OS === "android" && !!nativeModule?.getLatestCapture
        ? await (radarLog("[KMONE_OCR][JS] calling getLatestCapture"),
          nativeModule.getLatestCapture())
        : null;
    const captureStatus =
      Platform.OS === "android" && !!nativeModule?.getCaptureStatus
        ? await (radarLog("[KMONE_OCR][JS] calling getCaptureStatus"),
          nativeModule.getCaptureStatus())
        : "idle";
    const recentDebugReads =
      Platform.OS === "android" && !!nativeModule?.getRecentDebugReads
        ? await (radarLog("[KMONE_OCR][JS] calling getRecentDebugReads"),
          nativeModule.getRecentDebugReads())
        : [];
    const debugState =
      Platform.OS === "android" && !!nativeModule?.getDebugState
        ? await (radarLog("[KMONE_OCR][JS] calling getDebugState"),
          nativeModule.getDebugState())
        : null;
    const latestUberOfferState = buildLatestUberOfferState(debugState);
    const lastValidUberCapture = getLastValidUberCapture(lastCapture, debugState);

    radarLog("[KMONE_OCR][JS] getState result", {
      overlayPermissionGranted,
      accessibilityPermissionGranted,
      screenCapturePermissionGranted,
      active,
      captureStatus,
      recentDebugReadsCount: recentDebugReads.length,
      debugState,
      latestUberOfferState,
      lastValidUberCapture,
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
      latestUberOfferState,
      lastValidUberCapture,
    };
  },

  async requestOverlayPermission() {
    radarLog("[KMONE_OCR][JS] requestOverlayPermission");
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
    radarLog("[KMONE_OCR][JS] requestAccessibilityPermission");
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
    radarLog("[KMONE_OCR][JS] requestScreenCapturePermission");
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.requestScreenCapturePermission) return false;

    return withTimeout(
      nativeModule.requestScreenCapturePermission(),
      15000,
      false,
    );
  },

  async syncRadarConfig(settings: Settings) {
    radarLog("[KMONE_OCR][JS] syncRadarConfig", settings);
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.setRadarConfig) return false;

    return nativeModule.setRadarConfig(
      settings.radarMinValor,
      settings.radarMinRSKm,
      settings.radarMinRSHora,
    );
  },

  async start() {
    radarLog("[KMONE_OCR][JS] start overlay");
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.startOverlay) return false;

    return nativeModule.startOverlay(
      "HIDDEN",
      "Radar flutuante ativo",
      "Aguardando leitura da oferta",
    );
  },

  async stop() {
    radarLog("[KMONE_OCR][JS] stop overlay");
    if (Platform.OS !== "android") return true;
    if (!nativeModule?.stopOverlay) return true;
    return nativeModule.stopOverlay();
  },

  async updatePreview(input: {
    status: string;
    title: string;
    subtitle: string;
  }) {
    radarLog("[KMONE_OCR][JS] updatePreview", input);
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.updateOverlay) return false;

    return nativeModule.updateOverlay(input.status, input.title, input.subtitle);
  },

  async hide() {
    radarLog("[KMONE_OCR][JS] hide overlay");
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.hideOverlay) return false;

    return nativeModule.hideOverlay();
  },
};
