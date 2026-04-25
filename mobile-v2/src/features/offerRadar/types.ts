export type OfferSourceApp = "uber" | "99" | "unknown";

export type OfferCaptureStatus = "idle" | "capturing" | "captured" | "error";

export type OfferAnalysisStatus = "aceitar" | "talvez" | "recusar";

export type OfferCapturePayload = {
  sourceApp: OfferSourceApp;
  offeredValue?: number;
  estimatedKm?: number;
  estimatedMinutes?: number;
  capturedAt: string;
  rawText?: string;
};

export type OverlayReadiness = {
  overlayPermissionGranted: boolean;
  accessibilityPermissionGranted: boolean;
  screenCapturePermissionGranted: boolean;
};
