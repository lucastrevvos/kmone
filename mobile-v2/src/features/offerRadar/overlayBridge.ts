import type { Settings } from "@core/domain/types";
import { Linking, NativeModules, Platform } from "react-native";

import type {
  OfferCapturePayload,
  OfferCaptureStatus,
  OverlayReadiness,
} from "./types";

export type OverlayBridgeState = {
  available: boolean;
  active: boolean;
  readiness: OverlayReadiness;
  captureStatus: OfferCaptureStatus;
  lastCapture: OfferCapturePayload | null;
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
  getCaptureStatus?: () => Promise<OfferCaptureStatus>;
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

export const offerOverlayBridge = {
  isSupported() {
    return Platform.OS === "android" && !!nativeModule;
  },

  async getState(): Promise<OverlayBridgeState> {
    const overlayPermissionGranted =
      Platform.OS === "android" &&
      !!nativeModule?.isOverlayPermissionGranted
        ? await nativeModule.isOverlayPermissionGranted()
        : false;
    const accessibilityPermissionGranted =
      Platform.OS === "android" &&
      !!nativeModule?.isAccessibilityPermissionGranted
        ? await nativeModule.isAccessibilityPermissionGranted()
        : false;
    const active =
      Platform.OS === "android" && !!nativeModule?.isOverlayActive
        ? await nativeModule.isOverlayActive()
        : false;
    const screenCapturePermissionGranted =
      Platform.OS === "android" &&
      !!nativeModule?.isScreenCapturePermissionGranted
        ? await nativeModule.isScreenCapturePermissionGranted()
        : false;
    const lastCapture =
      Platform.OS === "android" && !!nativeModule?.getLatestCapture
        ? await nativeModule.getLatestCapture()
        : null;
    const captureStatus =
      Platform.OS === "android" && !!nativeModule?.getCaptureStatus
        ? await nativeModule.getCaptureStatus()
        : "idle";

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
    };
  },

  async requestOverlayPermission() {
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
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.requestScreenCapturePermission) return false;

    return nativeModule.requestScreenCapturePermission();
  },

  async syncRadarConfig(settings: Settings) {
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.setRadarConfig) return false;

    return nativeModule.setRadarConfig(
      settings.radarMinValor,
      settings.radarMinRSKm,
      settings.radarMinRSHora,
    );
  },

  async start() {
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.startOverlay) return false;

    return nativeModule.startOverlay(
      "HIDDEN",
      "Radar flutuante ativo",
      "Aguardando leitura da oferta",
    );
  },

  async stop() {
    if (Platform.OS !== "android") return true;
    if (!nativeModule?.stopOverlay) return true;
    return nativeModule.stopOverlay();
  },

  async updatePreview(input: {
    status: string;
    title: string;
    subtitle: string;
  }) {
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.updateOverlay) return false;

    return nativeModule.updateOverlay(input.status, input.title, input.subtitle);
  },

  async hide() {
    if (Platform.OS !== "android") return false;
    if (!nativeModule?.hideOverlay) return false;

    return nativeModule.hideOverlay();
  },
};
