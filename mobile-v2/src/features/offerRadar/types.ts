export type OfferSourceApp = "uber" | "99" | "unknown";

export type OfferCaptureStatus =
  | "idle"
  | "capturing"
  | "captured"
  | "stalled"
  | "stalled_image_reader"
  | "needs_permission_refresh"
  | "error";

export type OfferAnalysisStatus = "aceitar" | "talvez" | "recusar";

export type OfferCapturePayload = {
  frameId: string;
  sourceApp: OfferSourceApp;
  offeredValue: number;
  estimatedKm: number;
  estimatedMinutes: number;
  capturedAt: string;
  rawText: string;
  category?: string | null;
  isExclusive?: boolean;
  pickupMinutes?: number;
  pickupKm?: number;
  tripMinutes?: number;
  tripKm?: number;
  note?: string | null;
  parsedTimeKmPairs?: string | null;
  pickupPairSource?: string | null;
  tripPairSource?: string | null;
  parserConfidence?: number | null;
};

export type OfferDebugRead = {
  sourceApp: OfferSourceApp;
  channel?: "a11y" | "ocr" | "native";
  capturedAt: string;
  rawText: string;
};

export type OfferDebugState = {
  captureStatus: string;
  currentSourceApp: OfferSourceApp;
  lastSourceApp: OfferSourceApp;
  sessionId: string;
  lastOcrRawText?: string;
  lastParserReason?: string;
  lastOcrError?: string;
  lastNativeError?: string;
  lastSavedFramePath?: string;
  lastAnyOcrRawText?: string;
  lastAnyParserReason?: string;
  lastAnySavedFramePath?: string;
  lastUberOcrRawText?: string;
  lastUberParserReason?: string;
  lastUberSavedFramePath?: string;
  lastUberCapturedAt?: string;
  lastUberCapture?: OfferCapturePayload | null;
  latestFrameId?: string;
  latestFrameCapturedAt?: string;
  latestFrameProcessedAt?: string;
  latestFrameClassifiedAt?: string;
  latestFrameSourceApp?: string;
  latestFrameFinalSourceApp?: string;
  latestFrameCaptureStatusAtFrame?: string;
  latestFrameSourceAppBeforeOcr?: string;
  latestFramePathFull?: string;
  latestFramePathCrop?: string;
  latestFrameOcrText?: string;
  latestFrameParserReason?: string;
  latestFrameOcrClassifiedSourceApp?: string;
  latestFrameSourceReason?: string;
  latestFrameSourceConfidence?: number;
  latestUberFrameId?: string;
  latestUberFrameCapturedAt?: string;
  latestUberFrameProcessedAt?: string;
  latestUberFrameSourceApp?: string;
  latestUberFramePathFull?: string;
  latestUberFramePathCrop?: string;
  latestUberFrameOcrText?: string;
  latestUberFrameParserReason?: string;
  totalFramesReceived: number;
  totalFramesProcessed: number;
  totalFramesWithText: number;
  totalFramesEmpty: number;
  totalFramesError: number;
  totalFramesWhileUberDetected: number;
  totalFramesWhile99Detected: number;
  totalFramesClassifiedAsUber: number;
  totalFramesClassifiedAs99: number;
  totalFramesClassifiedAsSetup: number;
  totalFramesClassifiedAsUnknown: number;
  totalPollingFrames: number;
  totalCallbackFrames: number;
  totalFalsePositiveSetupBlocked: number;
  lastFrameReceivedAt?: string;
  lastFrameProcessedAtCounter?: string;
  lastUberDetectedAtFromAccessibility?: string;
  last99DetectedAtFromAccessibility?: string;
  lastFrameWhileUberDetectedAt?: string;
  lastFrameWhile99DetectedAt?: string;
  latestFrameWhileUberDetectedPathFull?: string;
  latestFrameWhileUberDetectedPathCrop?: string;
  latestFrameWhile99DetectedPathFull?: string;
  latestFrameWhile99DetectedPathCrop?: string;
  ocrIntervalMs: number;
  pollingIntervalMs: number;
  ocrIntervalReason: string;
  totalFramesSkippedByThrottle: number;
  lastSkippedFrameAt?: string;
  mediaProjectionActive: boolean;
  mediaProjectionStoppedAt?: string;
  virtualDisplayActive: boolean;
  virtualDisplayCreatedAt?: string;
  imageReaderActive: boolean;
  imageReaderCreatedAt?: string;
  imageAvailableCallbackCount: number;
  lastImageAvailableAt?: string;
  lastAcquireLatestImageResult?: string;
  lastAcquireLatestImageNullAt?: string;
  imageReaderSurfaceValid: boolean;
  imageReaderWidth?: number;
  imageReaderHeight?: number;
  imageReaderPixelFormat?: number;
  imageReaderMaxImages?: number;
  openImageCount: number;
  totalImagesClosed: number;
  lastPollImageAt?: string;
  handlerThreadAlive: boolean;
  handlerThreadName?: string;
  virtualDisplayWidth?: number;
  virtualDisplayHeight?: number;
  virtualDisplayDensityDpi?: number;
  virtualDisplayFlags?: number;
  virtualDisplayFlagsName?: string;
  virtualDisplayName?: string;
  captureResolutionMode: string;
  captureAcquireMode: string;
  projectionStopReason?: string;
  lastPipelineRestartReason?: string;
  lastPipelineRestartAt?: string;
  lastPipelineRestartFailedAt?: string;
  pipelineRestartFailureCount: number;
  isRecreatingPipeline: boolean;
  isProjectionStopping: boolean;
  isCapturePipelineActive: boolean;
  needsScreenCapturePermissionRefresh: boolean;
};

export type OverlayReadiness = {
  overlayPermissionGranted: boolean;
  accessibilityPermissionGranted: boolean;
  screenCapturePermissionGranted: boolean;
};
