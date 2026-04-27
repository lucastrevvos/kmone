package com.lucastrevvos.kmone.overlay

import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs
import kotlin.math.max

typealias OverlayUpdateListener = (status: String, title: String, subtitle: String) -> Unit

data class OfferCapture(
  val frameId: String,
  val sourceApp: String,
  val offeredValue: Double,
  val estimatedKm: Double,
  val estimatedMinutes: Double,
  val capturedAt: String,
  val rawText: String,
  val category: String? = null,
  val isExclusive: Boolean = false,
  val pickupMinutes: Double? = null,
  val pickupKm: Double? = null,
  val tripMinutes: Double? = null,
  val tripKm: Double? = null,
  val note: String? = null,
  val parsedTimeKmPairs: String? = null,
  val parsedTimeDistancePairs: String? = null,
  val pickupPairSource: String? = null,
  val tripPairSource: String? = null,
  val displayedEarningsPerKm: Double? = null,
  val parserSourceApp: String? = null,
  val parserWarnings: String? = null,
  val parserConfidence: Double? = null,
)

data class OfferDebugRead(
  val sourceApp: String,
  val channel: String,
  val capturedAt: String,
  val rawText: String,
)

data class OfferDebugState(
  val captureStatus: String,
  val currentSourceApp: String,
  val lastSourceApp: String,
  val sessionId: String,
  val lastOcrRawText: String?,
  val lastParserReason: String?,
  val lastOcrError: String?,
  val lastNativeError: String?,
  val lastSavedFramePath: String?,
  val lastAnyOcrRawText: String?,
  val lastAnyParserReason: String?,
  val lastAnySavedFramePath: String?,
  val lastUberOcrRawText: String?,
  val lastUberParserReason: String?,
  val lastUberSavedFramePath: String?,
  val lastUberCapturedAt: String?,
  val lastUberCapture: OfferCapture?,
  val latestFrameId: String?,
  val latestFrameCapturedAt: String?,
  val latestFrameProcessedAt: String?,
  val latestFrameClassifiedAt: String?,
  val latestFrameSourceApp: String?,
  val latestFrameFinalSourceApp: String?,
  val latestFrameCaptureStatusAtFrame: String?,
  val latestFrameSourceAppBeforeOcr: String?,
  val latestFramePathFull: String?,
  val latestFramePathCrop: String?,
  val latestFrameOcrText: String?,
  val latestFrameParserReason: String?,
  val latestFrameOcrClassifiedSourceApp: String?,
  val latestFrameSourceReason: String?,
  val latestFrameSourceConfidence: Double?,
  val latestUberFrameId: String?,
  val latestUberFrameCapturedAt: String?,
  val latestUberFrameProcessedAt: String?,
  val latestUberFrameSourceApp: String?,
  val latestUberFramePathFull: String?,
  val latestUberFramePathCrop: String?,
  val latestUberFrameOcrText: String?,
  val latestUberFrameParserReason: String?,
  val totalFramesReceived: Int,
  val totalFramesProcessed: Int,
  val totalFramesWithText: Int,
  val totalFramesEmpty: Int,
  val totalFramesError: Int,
  val totalFramesWhileUberDetected: Int,
  val totalFramesWhile99Detected: Int,
  val totalFramesClassifiedAsUber: Int,
  val totalFramesClassifiedAs99: Int,
  val totalFramesClassifiedAsSetup: Int,
  val totalFramesClassifiedAsUnknown: Int,
  val totalPollingFrames: Int,
  val totalCallbackFrames: Int,
  val totalFalsePositiveSetupBlocked: Int,
  val lastFrameReceivedAt: String?,
  val lastFrameProcessedAtCounter: String?,
  val lastUberDetectedAtFromAccessibility: String?,
  val last99DetectedAtFromAccessibility: String?,
  val lastFrameWhileUberDetectedAt: String?,
  val lastFrameWhile99DetectedAt: String?,
  val latestFrameWhileUberDetectedPathFull: String?,
  val latestFrameWhileUberDetectedPathCrop: String?,
  val latestFrameWhile99DetectedPathFull: String?,
  val latestFrameWhile99DetectedPathCrop: String?,
  val ocrIntervalMs: Long,
  val pollingIntervalMs: Long,
  val ocrIntervalReason: String,
  val totalFramesSkippedByThrottle: Int,
  val lastSkippedFrameAt: String?,
  val mediaProjectionActive: Boolean,
  val mediaProjectionStoppedAt: String?,
  val virtualDisplayActive: Boolean,
  val virtualDisplayCreatedAt: String?,
  val imageReaderActive: Boolean,
  val imageReaderCreatedAt: String?,
  val imageAvailableCallbackCount: Int,
  val lastImageAvailableAt: String?,
  val lastAcquireLatestImageResult: String?,
  val lastAcquireLatestImageNullAt: String?,
  val imageReaderSurfaceValid: Boolean,
  val imageReaderWidth: Int?,
  val imageReaderHeight: Int?,
  val imageReaderPixelFormat: Int?,
  val imageReaderMaxImages: Int?,
  val openImageCount: Int,
  val totalImagesClosed: Int,
  val lastPollImageAt: String?,
  val handlerThreadAlive: Boolean,
  val handlerThreadName: String?,
  val virtualDisplayWidth: Int?,
  val virtualDisplayHeight: Int?,
  val virtualDisplayDensityDpi: Int?,
  val virtualDisplayFlags: Int?,
  val virtualDisplayFlagsName: String?,
  val virtualDisplayName: String?,
  val captureResolutionMode: String,
  val captureAcquireMode: String,
  val projectionStopReason: String?,
  val lastPipelineRestartReason: String?,
  val lastPipelineRestartAt: String?,
  val lastPipelineRestartFailedAt: String?,
  val pipelineRestartFailureCount: Int,
  val isRecreatingPipeline: Boolean,
  val isProjectionStopping: Boolean,
  val isCapturePipelineActive: Boolean,
  val needsScreenCapturePermissionRefresh: Boolean,
)

private data class RoutePair(
  val index: Int,
  val minutes: Double,
  val km: Double,
)

object OfferOverlayRuntime {
  private const val TAG = "KMONE_OCR"
  private const val SHOW_RADAR_DEBUG_OVERLAY = false
  private data class ChannelSnapshot(val epochMs: Long, val channel: String, val lines: List<String>)
  private data class FrameSnapshot(
    val frameId: String,
    val capturedAt: String,
    val processedAt: String? = null,
    val classifiedAt: String? = null,
    val sourceAppBeforeOcr: String,
    val ocrClassifiedSourceApp: String,
    val finalSourceApp: String,
    val sourceReason: String,
    val sourceConfidence: Double,
    val captureStatusAtFrame: String,
    val width: Int? = null,
    val height: Int? = null,
    val fullPath: String? = null,
    val cropPath: String? = null,
    val ocrText: String? = null,
    val parserReason: String? = null,
  )
  private data class OfferSignatureContext(
    val hasAction: Boolean,
    val hasProduct: Boolean,
    val hasPrice: Boolean,
    val hasRoutePair: Boolean,
    val hasExclusive: Boolean,
    val hasLongTrip: Boolean,
  )
  private data class SourceResolution(
    val ocrClassifiedSourceApp: String,
    val finalSourceApp: String,
    val reason: String,
    val confidence: Double,
  )

  @Volatile
  var overlayActive: Boolean = false

  @Volatile
  var captureStatus: String = "idle"

  @Volatile
  var lastCapture: OfferCapture? = null

  @Volatile
  var minValor: Double = 8.0

  @Volatile
  var minRsKm: Double = 1.8

  @Volatile
  var minRsHora: Double = 22.0

  @Volatile
  var currentSourceApp: String = "unknown"

  @Volatile
  var currentSourceSeenAtEpochMs: Long = 0L

  @Volatile
  private var onOverlayUpdate: OverlayUpdateListener? = null

  private var lastDigest: Int = 0
  private var lastCaptureEpochMs: Long = 0L

  fun isDebugOverlayEnabled(): Boolean = SHOW_RADAR_DEBUG_OVERLAY
  private var lastHeartbeatEpochMs: Long = 0L
  private var lastDebugEpochMs: Long = 0L
  private var lastOcrEmptyEpochMs: Long = 0L
  private var lastAnyOcrRawText: String? = null
  private var lastAnyParserReason: String? = null
  private var lastOcrError: String? = null
  private var lastNativeError: String? = null
  private var lastAnySavedFramePath: String? = null
  private var lastUberOcrRawText: String? = null
  private var lastUberParserReason: String? = null
  private var lastUberSavedFramePath: String? = null
  private var lastUberCapture: OfferCapture? = null
  private var lastUberCapturedAt: String? = null
  private var lastSourceApp: String = "unknown"
  private var sessionId: String = "session-0"
  private var latestFrame: FrameSnapshot? = null
  private var latestUberFrame: FrameSnapshot? = null
  private var sessionStarted: Boolean = false
  private var lastSavedDiagnosticFrameId: String? = null
  private var totalFramesReceived: Int = 0
  private var totalFramesProcessed: Int = 0
  private var totalFramesWithText: Int = 0
  private var totalFramesEmpty: Int = 0
  private var totalFramesError: Int = 0
  private var totalFramesWhileUberDetected: Int = 0
  private var totalFramesWhile99Detected: Int = 0
  private var totalFramesClassifiedAsUber: Int = 0
  private var totalFramesClassifiedAs99: Int = 0
  private var totalFramesClassifiedAsSetup: Int = 0
  private var totalFramesClassifiedAsUnknown: Int = 0
  private var totalPollingFrames: Int = 0
  private var totalCallbackFrames: Int = 0
  private var totalFalsePositiveSetupBlocked: Int = 0
  private var lastFrameReceivedAt: String? = null
  private var lastFrameProcessedAtCounter: String? = null
  private var lastUberDetectedAtFromAccessibility: String? = null
  private var last99DetectedAtFromAccessibility: String? = null
  private var lastFrameWhileUberDetectedAt: String? = null
  private var lastFrameWhile99DetectedAt: String? = null
  private var latestFrameWhileUberDetectedPathFull: String? = null
  private var latestFrameWhileUberDetectedPathCrop: String? = null
  private var latestFrameWhile99DetectedPathFull: String? = null
  private var latestFrameWhile99DetectedPathCrop: String? = null
  private var ocrIntervalMs: Long = 3000L
  private var ocrIntervalReason: String = "idle/default"
  private var totalFramesSkippedByThrottle: Int = 0
  private var lastSkippedFrameAt: String? = null
  private var mediaProjectionActive: Boolean = false
  private var mediaProjectionStoppedAt: String? = null
  private var virtualDisplayActive: Boolean = false
  private var virtualDisplayCreatedAt: String? = null
  private var imageReaderActive: Boolean = false
  private var imageReaderCreatedAt: String? = null
  private var imageAvailableCallbackCount: Int = 0
  private var lastImageAvailableAt: String? = null
  private var lastAcquireLatestImageResult: String? = null
  private var lastAcquireLatestImageNullAt: String? = null
  private var imageReaderSurfaceValid: Boolean = false
  private var imageReaderWidth: Int? = null
  private var imageReaderHeight: Int? = null
  private var imageReaderPixelFormat: Int? = null
  private var imageReaderMaxImages: Int? = null
  private var openImageCount: Int = 0
  private var totalImagesClosed: Int = 0
  private var lastPollImageAt: String? = null
  private var handlerThreadAlive: Boolean = false
  private var handlerThreadName: String? = null
  private var virtualDisplayWidth: Int? = null
  private var virtualDisplayHeight: Int? = null
  private var virtualDisplayDensityDpi: Int? = null
  private var virtualDisplayFlags: Int? = null
  private var virtualDisplayFlagsName: String? = null
  private var virtualDisplayName: String? = null
  private var captureResolutionMode: String = "scaled"
  private var captureAcquireMode: String = "callback+polling"
  private var projectionStopReason: String? = null
  private var lastPipelineRestartReason: String? = null
  private var lastPipelineRestartAt: String? = null
  private var lastPipelineRestartFailedAt: String? = null
  private var pipelineRestartFailureCount: Int = 0
  private var isRecreatingPipeline: Boolean = false
  private var isProjectionStopping: Boolean = false
  private var needsScreenCapturePermissionRefresh: Boolean = false
  private val recentSnapshots = ArrayDeque<ChannelSnapshot>()
  private val recentDebugReads = ArrayDeque<OfferDebugRead>()

  fun setOverlayUpdateListener(listener: OverlayUpdateListener?) {
    onOverlayUpdate = listener
    Log.d(TAG, "[KMONE_OCR] overlay listener updated: active=${listener != null}")
  }

  fun setRadarConfig(minValor: Double, minRsKm: Double, minRsHora: Double) {
    this.minValor = minValor
    this.minRsKm = minRsKm
    this.minRsHora = minRsHora
  }

  fun resetSession() {
    Log.d(TAG, "[KMONE_OCR] resetSession")
    captureStatus = "idle"
    lastCapture = null
    lastDigest = 0
    lastCaptureEpochMs = 0L
    lastHeartbeatEpochMs = 0L
    lastDebugEpochMs = 0L
    lastOcrEmptyEpochMs = 0L
    synchronized(recentSnapshots) {
      recentSnapshots.clear()
    }
    lastAnyOcrRawText = null
    lastAnyParserReason = null
    lastOcrError = null
    lastNativeError = null
    lastAnySavedFramePath = null
    lastUberOcrRawText = null
    lastUberParserReason = null
    lastUberSavedFramePath = null
    lastUberCapture = null
    lastUberCapturedAt = null
    lastSourceApp = "unknown"
    latestFrame = null
    latestUberFrame = null
    sessionId = "session-${System.currentTimeMillis()}"
    sessionStarted = false
    lastSavedDiagnosticFrameId = null
    totalFramesReceived = 0
    totalFramesProcessed = 0
    totalFramesWithText = 0
    totalFramesEmpty = 0
    totalFramesError = 0
    totalFramesWhileUberDetected = 0
    totalFramesWhile99Detected = 0
    totalFramesClassifiedAsUber = 0
    totalFramesClassifiedAs99 = 0
    totalFramesClassifiedAsSetup = 0
    totalFramesClassifiedAsUnknown = 0
    totalPollingFrames = 0
    totalCallbackFrames = 0
    totalFalsePositiveSetupBlocked = 0
    lastFrameReceivedAt = null
    lastFrameProcessedAtCounter = null
    lastUberDetectedAtFromAccessibility = null
    last99DetectedAtFromAccessibility = null
    lastFrameWhileUberDetectedAt = null
    lastFrameWhile99DetectedAt = null
    latestFrameWhileUberDetectedPathFull = null
    latestFrameWhileUberDetectedPathCrop = null
    latestFrameWhile99DetectedPathFull = null
    latestFrameWhile99DetectedPathCrop = null
    ocrIntervalMs = 3000L
    ocrIntervalReason = "idle/default"
    totalFramesSkippedByThrottle = 0
    lastSkippedFrameAt = null
    mediaProjectionActive = false
    mediaProjectionStoppedAt = null
    virtualDisplayActive = false
    virtualDisplayCreatedAt = null
    imageReaderActive = false
    imageReaderCreatedAt = null
    imageAvailableCallbackCount = 0
    lastImageAvailableAt = null
    lastAcquireLatestImageResult = null
    lastAcquireLatestImageNullAt = null
    imageReaderSurfaceValid = false
    imageReaderWidth = null
    imageReaderHeight = null
    imageReaderPixelFormat = null
    imageReaderMaxImages = null
    openImageCount = 0
    totalImagesClosed = 0
    lastPollImageAt = null
    handlerThreadAlive = false
    handlerThreadName = null
    virtualDisplayWidth = null
    virtualDisplayHeight = null
    virtualDisplayDensityDpi = null
    virtualDisplayFlags = null
    virtualDisplayFlagsName = null
    virtualDisplayName = null
    captureResolutionMode = "scaled"
    captureAcquireMode = "callback+polling"
    projectionStopReason = null
    lastPipelineRestartReason = null
    lastPipelineRestartAt = null
    lastPipelineRestartFailedAt = null
    pipelineRestartFailureCount = 0
    isRecreatingPipeline = false
    isProjectionStopping = false
    needsScreenCapturePermissionRefresh = false
  }

  fun noteVisibleSourceApp(sourceApp: String) {
    currentSourceApp = sourceApp
    currentSourceSeenAtEpochMs = System.currentTimeMillis()
    lastSourceApp = sourceApp
    if (sourceApp == "uber") {
      lastUberDetectedAtFromAccessibility = toIsoString(currentSourceSeenAtEpochMs)
    }
    if (sourceApp == "99") {
      last99DetectedAtFromAccessibility = toIsoString(currentSourceSeenAtEpochMs)
    }
    updateOcrInterval()
    Log.d(TAG, "[KMONE_OCR] sourceApp=$sourceApp")
  }

  fun getCurrentOcrIntervalMs(): Long {
    updateOcrInterval()
    return ocrIntervalMs
  }

  fun getCurrentOcrIntervalReason(): String {
    updateOcrInterval()
    return ocrIntervalReason
  }

  fun reportFrameSkippedByThrottle(sourceApp: String) {
    totalFramesSkippedByThrottle += 1
    lastSkippedFrameAt = toIsoString(System.currentTimeMillis())
    appendDebugRead(
      sourceApp,
      "ocr",
      "OCR_FRAME_SKIPPED_THROTTLE | intervalMs=$ocrIntervalMs | reason=$ocrIntervalReason",
    )
  }

  fun reportNativeError(sourceApp: String, reason: String) {
    captureStatus = "error"
    lastOcrError = reason
    lastNativeError = reason
    totalFramesError += 1
    appendDebugRead(sourceApp, "native", "NATIVE_ERROR | $reason")
    Log.e(TAG, "[KMONE_OCR] OCR_ERROR source=$sourceApp reason=$reason")
    onOverlayUpdate?.invoke(
      "ERROR",
      "Radar com erro",
      reason.take(180),
    )
  }

  fun updateProjectionState(active: Boolean, stopReason: String? = projectionStopReason) {
    mediaProjectionActive = active
    if (!active) {
      mediaProjectionStoppedAt = toIsoString(System.currentTimeMillis())
      projectionStopReason = stopReason
      appendDebugRead("native", "ocr", "OCR_PROJECTION_STOPPED | reason=${stopReason ?: "unknown"}")
    }
  }

  fun updateVirtualDisplayState(active: Boolean) {
    virtualDisplayActive = active
    if (active) {
      virtualDisplayCreatedAt = toIsoString(System.currentTimeMillis())
    }
  }

  fun updateVirtualDisplayConfig(
    width: Int,
    height: Int,
    densityDpi: Int,
    flags: Int,
    flagsName: String,
    name: String,
  ) {
    virtualDisplayWidth = width
    virtualDisplayHeight = height
    virtualDisplayDensityDpi = densityDpi
    virtualDisplayFlags = flags
    virtualDisplayFlagsName = flagsName
    virtualDisplayName = name
  }

  fun updateImageReaderState(active: Boolean) {
    imageReaderActive = active
    if (active) {
      imageReaderCreatedAt = toIsoString(System.currentTimeMillis())
    }
  }

  fun updateImageReaderConfig(
    width: Int,
    height: Int,
    pixelFormat: Int,
    maxImages: Int,
    surfaceValid: Boolean,
  ) {
    imageReaderWidth = width
    imageReaderHeight = height
    imageReaderPixelFormat = pixelFormat
    imageReaderMaxImages = maxImages
    imageReaderSurfaceValid = surfaceValid
  }

  fun updateHandlerThreadState(alive: Boolean, name: String?) {
    handlerThreadAlive = alive
    handlerThreadName = name
  }

  fun updateCaptureModes(
    resolutionMode: String,
    acquireMode: String,
  ) {
    captureResolutionMode = resolutionMode
    captureAcquireMode = acquireMode
  }

  fun reportImageAvailableCallback() {
    imageAvailableCallbackCount += 1
    lastImageAvailableAt = toIsoString(System.currentTimeMillis())
  }

  fun reportAcquireLatestImage(result: String) {
    lastAcquireLatestImageResult = result
    if (result.contains("null")) {
      lastAcquireLatestImageNullAt = toIsoString(System.currentTimeMillis())
    }
  }

  fun reportPollImageResult(result: String) {
    lastPollImageAt = toIsoString(System.currentTimeMillis())
    appendDebugRead(
      currentSourceApp,
      "ocr",
      "OCR_POLL_RESULT | result=$result | callbackCount=$imageAvailableCallbackCount",
    )
  }

  fun reportImageAcquired(source: String, width: Int, height: Int) {
    openImageCount += 1
    appendDebugRead(
      currentSourceApp,
      "ocr",
      "IMAGE_ACQUIRED | source=$source | size=${width}x$height | openImageCount=$openImageCount",
    )
  }

  fun reportImageClosed(source: String) {
    openImageCount = maxOf(0, openImageCount - 1)
    totalImagesClosed += 1
    appendDebugRead(
      currentSourceApp,
      "ocr",
      "IMAGE_CLOSED | source=$source | openImageCount=$openImageCount | totalImagesClosed=$totalImagesClosed",
    )
  }

  fun reportImageCloseFailed(source: String, reason: String) {
    appendDebugRead(
      currentSourceApp,
      "ocr",
      "IMAGE_CLOSE_FAILED | source=$source | reason=$reason | openImageCount=$openImageCount",
    )
  }

  fun reportServiceAliveTick(secondsSinceLastFrame: Double) {
    appendDebugRead(
      currentSourceApp,
      "ocr",
      "OCR_SERVICE_ALIVE | projectionActive=$mediaProjectionActive | virtualDisplayActive=$virtualDisplayActive | imageReaderActive=$imageReaderActive | callbackCount=$imageAvailableCallbackCount | secondsSinceLastFrame=${"%.1f".format(Locale.US, secondsSinceLastFrame)} | currentSourceApp=$currentSourceApp | handlerThreadAlive=$handlerThreadAlive | handlerThreadName=${handlerThreadName ?: "unknown"}",
    )
  }

  fun reportImageReaderHealth(secondsSinceLastImageAvailable: Double) {
    appendDebugRead(
      currentSourceApp,
      "ocr",
      "OCR_IMAGE_READER_HEALTH | imageReaderActive=$imageReaderActive | handlerThreadAlive=$handlerThreadAlive | handlerThreadName=${handlerThreadName ?: "unknown"} | surfaceValid=$imageReaderSurfaceValid | callbackCount=$imageAvailableCallbackCount | secondsSinceLastImageAvailable=${"%.1f".format(Locale.US, secondsSinceLastImageAvailable)} | maxImages=${imageReaderMaxImages ?: -1} | width=${imageReaderWidth ?: -1} | height=${imageReaderHeight ?: -1} | format=${imageReaderPixelFormat ?: -1} | openImageCount=$openImageCount | totalImagesClosed=$totalImagesClosed | acquireMode=$captureAcquireMode | resolutionMode=$captureResolutionMode",
    )
  }

  fun reportVirtualDisplayHealth(surfaceAttached: Boolean) {
    appendDebugRead(
      currentSourceApp,
      "ocr",
      "OCR_VIRTUAL_DISPLAY_HEALTH | virtualDisplayActive=$virtualDisplayActive | createdAt=${virtualDisplayCreatedAt ?: "none"} | width=${virtualDisplayWidth ?: -1} | height=${virtualDisplayHeight ?: -1} | density=${virtualDisplayDensityDpi ?: -1} | flags=${virtualDisplayFlags ?: -1} | flagsName=${virtualDisplayFlagsName ?: "unknown"} | name=${virtualDisplayName ?: "unknown"} | surfaceAttached=$surfaceAttached",
    )
  }

  fun reportPipelineRestarted(reason: String) {
    lastPipelineRestartReason = reason
    lastPipelineRestartAt = toIsoString(System.currentTimeMillis())
    appendDebugRead(currentSourceApp, "ocr", "OCR_CAPTURE_PIPELINE_RESTARTED | $reason")
  }

  fun appendPipelineFailure(reason: String) {
    lastPipelineRestartReason = reason
    lastPipelineRestartFailedAt = toIsoString(System.currentTimeMillis())
    pipelineRestartFailureCount += 1
    appendDebugRead(currentSourceApp, "ocr", reason)
  }

  fun reportNoFramesButPipelineActive(secondsSinceLastFrame: Double) {
    captureStatus = if (
      (captureStatus == "capturing" || captureStatus == "stalled" || captureStatus == "stalled_image_reader") &&
      imageAvailableCallbackCount <= 1 &&
      virtualDisplayActive &&
      imageReaderActive
    ) {
      "stalled_image_reader"
    } else if (captureStatus == "capturing" || captureStatus == "stalled" || captureStatus == "stalled_image_reader") {
      "stalled"
    } else {
      captureStatus
    }
    appendDebugRead(
      currentSourceApp,
      "ocr",
      "NO_FRAMES_BUT_PIPELINE_ACTIVE | callbackCount=$imageAvailableCallbackCount | secondsSinceLastFrame=${"%.1f".format(Locale.US, secondsSinceLastFrame)} | currentSourceApp=$currentSourceApp",
    )
  }

  fun markNeedsScreenCapturePermissionRefresh(reason: String) {
    captureStatus = "needs_permission_refresh"
    needsScreenCapturePermissionRefresh = true
    projectionStopReason = reason
    lastPipelineRestartReason = reason
    lastPipelineRestartFailedAt = toIsoString(System.currentTimeMillis())
    pipelineRestartFailureCount += 1
    appendDebugRead(currentSourceApp, "ocr", "OCR_PERMISSION_REFRESH_REQUIRED | reason=$reason")
    onOverlayUpdate?.invoke(
      "NEEDS_PERMISSION_REFRESH",
      "Captura precisa ser reativada",
      "Permita a captura de tela novamente para continuar lendo ofertas.",
    )
  }

  fun setPipelineLifecycleFlags(
    recreating: Boolean? = null,
    projectionStopping: Boolean? = null,
  ) {
    recreating?.let { isRecreatingPipeline = it }
    projectionStopping?.let { isProjectionStopping = it }
  }

  fun processSourceHeartbeat(sourceApp: String, rawText: String) {
    if (!overlayActive) return
    if (rawText.isBlank()) return
    maybeNotifyScanning(sourceApp)
  }

  fun reportOcrEmpty(sourceApp: String) {
    val now = System.currentTimeMillis()
    if (now - lastOcrEmptyEpochMs < 4000) return
    lastOcrEmptyEpochMs = now
    totalFramesEmpty += 1
    val frameId = latestFrame?.frameId ?: "unknown"
    appendDebugRead(sourceApp, "ocr", "OCR_EMPTY | frameId=$frameId")
    Log.d(TAG, "[KMONE_OCR] OCR_EMPTY source=$sourceApp")
  }

  fun reportFrameAttempt(
    sourceApp: String,
    frameId: String,
    capturedAtEpochMs: Long,
    width: Int,
    height: Int,
    acquireSource: String,
  ) {
    totalFramesReceived += 1
    if (acquireSource == "polling") totalPollingFrames += 1 else totalCallbackFrames += 1
    lastFrameReceivedAt = toIsoString(capturedAtEpochMs)
    if (sourceApp == "uber") {
      totalFramesWhileUberDetected += 1
      lastFrameWhileUberDetectedAt = lastFrameReceivedAt
    }
    if (sourceApp == "99") {
      totalFramesWhile99Detected += 1
      lastFrameWhile99DetectedAt = lastFrameReceivedAt
    }
    val snapshot = FrameSnapshot(
      frameId = frameId,
      capturedAt = toIsoString(capturedAtEpochMs),
      sourceAppBeforeOcr = sourceApp,
      ocrClassifiedSourceApp = "unknown",
      finalSourceApp = classifyFrameSourceApp(sourceApp),
      sourceReason = "aguardando OCR",
      sourceConfidence = 0.0,
      captureStatusAtFrame = classifyCaptureStatusAtFrame(),
      width = width,
      height = height,
    )
    latestFrame = snapshot
    appendDebugRead(
      sourceApp,
      "ocr",
      "OCR_ATTEMPT | frameId=$frameId | sourceBeforeOcr=$sourceApp | acquireSource=$acquireSource | size=${width}x$height | status=${snapshot.captureStatusAtFrame}",
    )
    maybeNotifyFrameStats(snapshot)
  }

  fun reportOcrFrameSaved(sourceApp: String, frameId: String, kind: String, label: String, width: Int, height: Int) {
    val current = latestFrame
    val updated = (current ?: FrameSnapshot(
      frameId = frameId,
      capturedAt = toIsoString(System.currentTimeMillis()),
      sourceAppBeforeOcr = sourceApp,
      ocrClassifiedSourceApp = "unknown",
      finalSourceApp = classifyFrameSourceApp(sourceApp),
      sourceReason = "frame salvo sem OCR",
      sourceConfidence = 0.0,
      captureStatusAtFrame = classifyCaptureStatusAtFrame(),
    )).copy(
      frameId = frameId,
      processedAt = current?.processedAt ?: toIsoString(System.currentTimeMillis()),
      sourceAppBeforeOcr = current?.sourceAppBeforeOcr ?: sourceApp,
      captureStatusAtFrame = current?.captureStatusAtFrame ?: classifyCaptureStatusAtFrame(),
      width = width,
      height = height,
      fullPath = if (kind == "full") label else current?.fullPath,
      cropPath = if (kind == "crop") label else current?.cropPath,
    )
    latestFrame = updated
    lastAnySavedFramePath = updated.cropPath ?: updated.fullPath
    if (updated.sourceAppBeforeOcr == "uber") {
      latestFrameWhileUberDetectedPathFull = updated.fullPath ?: latestFrameWhileUberDetectedPathFull
      latestFrameWhileUberDetectedPathCrop = updated.cropPath ?: latestFrameWhileUberDetectedPathCrop
    }
    if (updated.sourceAppBeforeOcr == "99") {
      latestFrameWhile99DetectedPathFull = updated.fullPath ?: latestFrameWhile99DetectedPathFull
      latestFrameWhile99DetectedPathCrop = updated.cropPath ?: latestFrameWhile99DetectedPathCrop
    }
    if (isRideApp(updated.finalSourceApp)) {
      latestUberFrame = mergeUberFrame(updated)
      lastUberSavedFramePath = latestUberFrame?.cropPath ?: latestUberFrame?.fullPath
    }
    appendDebugRead(
      "pending",
      "ocr",
      "OCR_FRAME_SAVED | frameId=$frameId | sourceBeforeOcr=${updated.sourceAppBeforeOcr} | finalSourceApp=pending | ocrClassifiedSourceApp=pending | type=$kind | size=${width}x$height | path=$label",
    )
    Log.d(TAG, "[KMONE_OCR] OCR_FRAME_SAVED source=$sourceApp frameId=$frameId type=$kind path=$label")
  }

  fun reportOcrFrameSaveError(sourceApp: String, reason: String) {
    appendDebugRead(sourceApp, "ocr", "OCR_FRAME_SAVE_ERROR | $reason")
    Log.e(TAG, "[KMONE_OCR] OCR_FRAME_SAVE_ERROR source=$sourceApp reason=$reason")
  }

  fun reportOcrFrameTick(sourceApp: String, detail: String) {
    val frameId = latestFrame?.frameId ?: "unknown"
    appendDebugRead(sourceApp, "ocr", "OCR_FRAME_TICK | frameId=$frameId | $detail")
    Log.d(TAG, "[KMONE_OCR] OCR_FRAME_TICK source=$sourceApp detail=$detail")
  }

  fun reportOcrSessionStarted(sourceApp: String, detail: String) {
    sessionStarted = true
    appendDebugRead(sourceApp, "ocr", "OCR_SESSION_STARTED | sessionId=$sessionId | $detail")
    Log.d(TAG, "[KMONE_OCR] OCR_SESSION_STARTED source=$sourceApp detail=$detail")
  }

  fun reportOcrTextDetected(sourceApp: String, frameId: String, summary: String, rawText: String) {
    val resolution = resolveSourceApp(sourceApp, rawText)
    val classifiedAt = toIsoString(System.currentTimeMillis())
    totalFramesProcessed += 1
    totalFramesWithText += 1
    lastFrameProcessedAtCounter = classifiedAt
    when (resolution.finalSourceApp) {
      "uber" -> totalFramesClassifiedAsUber += 1
      "99" -> totalFramesClassifiedAs99 += 1
      "setup" -> totalFramesClassifiedAsSetup += 1
      else -> totalFramesClassifiedAsUnknown += 1
    }
    val current = latestFrame
    val updated = (current ?: FrameSnapshot(
      frameId = frameId,
      capturedAt = toIsoString(System.currentTimeMillis()),
      sourceAppBeforeOcr = sourceApp,
      ocrClassifiedSourceApp = resolution.ocrClassifiedSourceApp,
      finalSourceApp = resolution.finalSourceApp,
      sourceReason = resolution.reason,
      sourceConfidence = resolution.confidence,
      captureStatusAtFrame = classifyCaptureStatusAtFrame(),
    )).copy(
      frameId = frameId,
      processedAt = toIsoString(System.currentTimeMillis()),
      classifiedAt = classifiedAt,
      sourceAppBeforeOcr = current?.sourceAppBeforeOcr ?: sourceApp,
      ocrClassifiedSourceApp = resolution.ocrClassifiedSourceApp,
      finalSourceApp = resolution.finalSourceApp,
      sourceReason = resolution.reason,
      sourceConfidence = resolution.confidence,
      captureStatusAtFrame = current?.captureStatusAtFrame ?: classifyCaptureStatusAtFrame(),
      ocrText = rawText.take(2000),
    )
    latestFrame = updated
    if (isRideApp(updated.finalSourceApp)) {
      latestUberFrame = mergeUberFrame(updated)
    }
    appendDebugRead(sourceApp, "ocr", "OCR_TEXT_DETECTED | frameId=$frameId | $summary")
    appendDebugRead(
      updated.finalSourceApp,
      "ocr",
      "OCR_FRAME_CLASSIFIED | frameId=$frameId | sourceBeforeOcr=${updated.sourceAppBeforeOcr} | ocrClassifiedSourceApp=${updated.ocrClassifiedSourceApp} | finalSourceApp=${updated.finalSourceApp} | confidence=${"%.2f".format(Locale.US, updated.sourceConfidence)} | reason=${updated.sourceReason}",
    )
    if (updated.sourceAppBeforeOcr == "uber" && updated.finalSourceApp != "uber") {
      appendDebugRead(
        updated.finalSourceApp,
        "ocr",
        "FRAME_SOURCE_MISMATCH_WHILE_UBER_DETECTED | frameId=$frameId | sourceBeforeOcr=uber | finalSourceApp=${updated.finalSourceApp} | reason=${updated.sourceReason}",
      )
    }
    Log.d(TAG, "[KMONE_OCR] OCR_TEXT_DETECTED source=$sourceApp summary=$summary")
    maybeNotifyFrameStats(updated)
  }

  fun reportParserReason(sourceApp: String, reason: String) {
    val finalSourceApp = latestFrame?.finalSourceApp ?: sourceApp
    lastAnyParserReason = reason
    if (isRideApp(finalSourceApp)) {
      lastUberParserReason = reason
    }
    latestFrame = latestFrame?.copy(parserReason = reason, processedAt = toIsoString(System.currentTimeMillis()))
    if (isRideApp(finalSourceApp)) {
      latestUberFrame = latestUberFrame?.copy(parserReason = reason, processedAt = toIsoString(System.currentTimeMillis()))
    }
    val frameId = latestFrame?.frameId ?: "unknown"
    appendDebugRead(sourceApp, "ocr", "OCR_PARSER_REASON | frameId=$frameId | $reason")
    Log.d(TAG, "[KMONE_OCR] OCR_PARSER_REASON source=$sourceApp reason=$reason")
  }

  fun processAccessibilityText(sourceApp: String, rawText: String, channel: String = "a11y", frameId: String? = null) {
    if (!overlayActive) return
    if (rawText.isBlank()) return
    if (channel != "ocr") {
      processSourceHeartbeat(sourceApp, rawText)
      return
    }

    captureStatus = "capturing"
    lastSourceApp = sourceApp

    val lines = rawText
      .replace('\u00A0', ' ')
      .lines()
      .map { it.trim() }
      .filter { it.isNotBlank() }
      .take(140)
    if (lines.isEmpty()) return

    val normalizedRawText = lines.joinToString(" | ").take(2000)
    val finalSourceApp = latestFrame?.finalSourceApp ?: sourceApp
    lastAnyOcrRawText = normalizedRawText
    if (isRideApp(finalSourceApp)) {
      lastUberOcrRawText = normalizedRawText
    }
    appendDebugRead(sourceApp, channel, lines.joinToString(" | ").take(1200))
    reportOcrTextDetected(sourceApp, frameId ?: (latestFrame?.frameId ?: "unknown"), lines.take(4).joinToString(" | ").take(220), normalizedRawText)

    if (maybeNotifyOfferExpired(finalSourceApp, normalizedRawText)) {
      reportParserReason(finalSourceApp, "oferta expirada ou indisponivel")
      return
    }

    maybeNotifyScanning(sourceApp)

    val combinedLines = mergeRecentSnapshots(lines, channel)
    val scopedLines = sliceOfferCardWindow(combinedLines).ifEmpty { combinedLines }

    val lowerScoped = scopedLines.map { it.lowercase(Locale.ROOT) }
    val signatureContext = buildSignatureContext(lowerScoped)
    val strongSignature = hasStrongOfferSignature(signatureContext)
    val weakSignature = hasWeakOfferSignature(signatureContext)
    val routePairs = extractRoutePairs(scopedLines)
    val moneyCandidates = extractMoneyCandidates(scopedLines)
      .filter { (_, value) -> value in 4.0..500.0 }
      .filterNot { (index, _) -> isIgnoredMoneyLine(lowerScoped[index]) }
    val rideAppSignature = isRideApp(sourceApp) &&
      signatureContext.hasPrice &&
      routePairs.isNotEmpty() &&
      (signatureContext.hasProduct || signatureContext.hasAction || signatureContext.hasExclusive || signatureContext.hasLongTrip || routePairs.size >= 2)

    if (!strongSignature && !weakSignature) {
      if (!rideAppSignature) {
        reportParserReason(finalSourceApp, buildMissingSignatureReason(signatureContext))
        maybeNotifyDebug(sourceApp, scopedLines)
        return
      }
    }

    if (moneyCandidates.isEmpty()) {
      reportParserReason(
        finalSourceApp,
        "sem valor monetario valido: faltou preco como R$ 40,67 no card",
      )
      maybeNotifyDebug(sourceApp, scopedLines)
      return
    }
    if (routePairs.isEmpty()) {
      reportParserReason(
        finalSourceApp,
        "sem pares de tempo/km: faltou trecho como 2 min (0.8 km) ou 39 minutos (31.4 km)",
      )
      maybeNotifyDebug(sourceApp, scopedLines)
      return
    }

    val linkedMoney = moneyCandidates
      .mapNotNull { money ->
        val nearestRoute = routePairs.minByOrNull { abs(it.index - money.first) } ?: return@mapNotNull null
        val distance = abs(nearestRoute.index - money.first)
        Triple(money, nearestRoute, distance)
      }
      .filter { (_, _, distance) -> strongSignature || distance <= 24 }
      .ifEmpty {
        if (strongSignature || weakSignature) {
          val bestMoney = moneyCandidates.maxByOrNull { (_, value) -> value }
          val nearestRoute = bestMoney?.let { m -> routePairs.minByOrNull { abs(it.index - m.first) } }
          if (bestMoney != null && nearestRoute != null) listOf(Triple(bestMoney, nearestRoute, abs(nearestRoute.index - bestMoney.first)))
          else emptyList()
        } else {
          emptyList()
        }
      }
    if (linkedMoney.isEmpty()) {
      reportParserReason(
        finalSourceApp,
        "nao foi possivel ligar valor ao trajeto: preco e pares de tempo/km ficaram distantes no OCR",
      )
      maybeNotifyDebug(sourceApp, scopedLines)
      return
    }

    val bestLinked = linkedMoney.minByOrNull { (_, _, distance) -> distance } ?: return
    val primaryMoney = bestLinked.first
    val valueAnchorIndex = primaryMoney.first
    val nearbyPairs = routePairs
      .filter { abs(it.index - valueAnchorIndex) <= 20 }
      .ifEmpty { routePairs }
    val orderedPairs = routePairs.sortedBy { it.index }
    val (pickupPair, tripPair) = if (finalSourceApp == "99" && orderedPairs.size >= 2) {
      Pair(orderedPairs[0], orderedPairs[1])
    } else {
      splitPickupAndTripPairs(orderedPairs)
    }
    val primaryRoute = tripPair ?: pickupPair ?: mergeRoutePairs(nearbyPairs)
    val offeredValue = primaryMoney.second
    val category = extractCategory(scopedLines) ?: if (finalSourceApp == "99") "99" else null
    val isExclusive = lowerScoped.any { it.contains("exclusivo") }
    val note = extractOfferNote(lowerScoped)
    val displayedEarningsPerKm = extractDisplayedEarningsPerKm(scopedLines)
    val estimatedKm = when {
      tripPair != null -> tripPair.km
      pickupPair != null -> pickupPair.km
      else -> primaryRoute.km
    }
    val estimatedMinutes = when {
      tripPair != null -> tripPair.minutes
      pickupPair != null -> pickupPair.minutes
      else -> primaryRoute.minutes
    }
    val parserWarnings = mutableListOf<String>()

    val digest = listOf(sourceApp, offeredValue, estimatedKm, estimatedMinutes).joinToString("|").hashCode()
    val nowMs = System.currentTimeMillis()
    if (digest == lastDigest && nowMs - lastCaptureEpochMs < 6_000) return

    lastDigest = digest
    lastCaptureEpochMs = nowMs
    if (displayedEarningsPerKm != null) {
      val calculatedTotalKm = max((pickupPair?.km ?: 0.0) + (tripPair?.km ?: estimatedKm), 0.1)
      val calculatedDisplayedRsKm = offeredValue / calculatedTotalKm
      if (abs(calculatedDisplayedRsKm - displayedEarningsPerKm) > 0.2) {
        parserWarnings.add(
          "rs/km divergente: tela=${"%.2f".format(Locale.US, displayedEarningsPerKm)} calculado=${"%.2f".format(Locale.US, calculatedDisplayedRsKm)}",
        )
      }
    }

    val capture = OfferCapture(
      frameId = frameId ?: (latestFrame?.frameId ?: "unknown"),
      sourceApp = finalSourceApp,
      offeredValue = offeredValue,
      estimatedKm = estimatedKm,
      estimatedMinutes = estimatedMinutes,
      capturedAt = toIsoString(nowMs),
      rawText = scopedLines.joinToString(" | ").take(1000),
      category = category,
      isExclusive = isExclusive,
      pickupMinutes = pickupPair?.minutes,
      pickupKm = pickupPair?.km,
      tripMinutes = tripPair?.minutes,
      tripKm = tripPair?.km,
      note = note,
      parsedTimeKmPairs = orderedPairs.joinToString(" | ") {
        "${it.minutes.toInt()} min (${String.format(Locale.US, "%.1f", it.km)} km)@${it.index}"
      },
      parsedTimeDistancePairs = orderedPairs.joinToString(" | ") {
        "${String.format(Locale.US, "%.0f", it.minutes)} min (${formatDistanceForDebug(it.km)})@${it.index}"
      },
      pickupPairSource = pickupPair?.let { "pair@index=${it.index}" },
      tripPairSource = tripPair?.let { "pair@index=${it.index}" },
      displayedEarningsPerKm = displayedEarningsPerKm,
      parserSourceApp = finalSourceApp,
      parserWarnings = parserWarnings.takeIf { it.isNotEmpty() }?.joinToString(" | "),
      parserConfidence = when {
        pickupPair != null && tripPair != null -> 0.96
        pickupPair != null -> 0.82
        else -> 0.65
      },
    )
    lastCapture = capture
    if (isRideApp(finalSourceApp)) {
      lastUberCapture = capture
      lastUberCapturedAt = capture.capturedAt
      latestUberFrame = latestUberFrame?.copy(
        parserReason = "captura valida",
        processedAt = capture.capturedAt,
        ocrText = normalizedRawText,
      )
    }
    captureStatus = "captured"
    reportParserReason(
      finalSourceApp,
      "captura valida: categoria=${category ?: "desconhecida"}, exclusivo=${if (isExclusive) "sim" else "nao"}, nota=${note ?: "nenhuma"}",
    )
    Log.i(
      TAG,
      "[KMONE_OCR] OCR_CAPTURED source=$sourceApp value=$offeredValue km=$estimatedKm minutes=$estimatedMinutes",
    )

    val rsKm = offeredValue / max(estimatedKm, 0.1)
    val rsHora = offeredValue / max(estimatedMinutes / 60.0, 0.1)
    val status = when {
      offeredValue < minValor || rsKm < minRsKm || rsHora < minRsHora -> "RECUSAR"
      rsKm >= minRsKm * 1.12 && rsHora >= minRsHora * 1.08 -> "ACEITAR"
      else -> "TALVEZ"
    }
    val title = when (status) {
      "ACEITAR" -> "Vale muito a pena"
      "TALVEZ" -> "Aceitavel"
      else -> "Nao compensa"
    }
    val subtitle =
      "R$ ${"%.2f".format(Locale.US, offeredValue)} | " +
        "${"%.1f".format(Locale.US, estimatedKm)} km | " +
        "${estimatedMinutes.toInt()} min | " +
        "R$ ${"%.2f".format(Locale.US, rsKm)}/km | " +
        "R$ ${"%.2f".format(Locale.US, rsHora)}/h"
    onOverlayUpdate?.invoke(status, title, subtitle)
  }

  private fun sliceOfferCardWindow(lines: List<String>): List<String> {
    val lower = lines.map { it.lowercase(Locale.ROOT) }
    val actionIndexes = lower.mapIndexedNotNull { index, line ->
      if (line.contains("selecionar") || line.contains("aceitar") || line.contains("recusar")) index else null
    }
    val productIndexes = lower.mapIndexedNotNull { index, line ->
      if (
        line.contains("uberx") ||
          line.contains("comfort") ||
          line.contains("black") ||
          line.contains("99pop") ||
          line.contains("99 plus") ||
          line.contains("viagem longa")
      ) index else null
    }

    if (actionIndexes.isEmpty() && productIndexes.isEmpty()) return lines

    val bottom = actionIndexes.lastOrNull() ?: (productIndexes.maxOrNull() ?: return emptyList())
    val windowStart = max(0, bottom - 34)
    val topHint = productIndexes.lastOrNull { it <= bottom } ?: windowStart
    val start = max(windowStart, topHint - 2)
    val endExclusive = minOf(bottom + 1, lines.size)
    if (start >= endExclusive) return emptyList()
    return lines.subList(start, endExclusive)
  }

  private fun buildSignatureContext(lowerLines: List<String>): OfferSignatureContext {
    return OfferSignatureContext(
      hasAction = lowerLines.any { it.contains("selecionar") || it.contains("aceitar") || it.contains("recusar") },
      hasProduct = lowerLines.any {
        it.contains("uberx") ||
          it.contains("comfort") ||
          it.contains("black") ||
          it.contains("99pop") ||
          it.contains("99 plus") ||
          it.contains("exclusivo")
      },
      hasPrice = lowerLines.any { it.contains("r$") },
      hasRoutePair = extractRoutePairs(lowerLines).isNotEmpty(),
      hasExclusive = lowerLines.any { it.contains("exclusivo") },
      hasLongTrip = lowerLines.any { it.contains("viagem longa") },
    )
  }

  private fun hasStrongOfferSignature(context: OfferSignatureContext): Boolean {
    return context.hasAction && context.hasProduct && context.hasPrice && context.hasRoutePair
  }

  private fun hasWeakOfferSignature(context: OfferSignatureContext): Boolean {
    return ((context.hasAction || context.hasProduct || context.hasExclusive || context.hasLongTrip) &&
      context.hasPrice &&
      context.hasRoutePair)
  }

  private fun buildMissingSignatureReason(context: OfferSignatureContext): String {
    val missing = mutableListOf<String>()
    if (!context.hasAction) missing.add("acao como Aceitar/Selecionar")
    if (!context.hasProduct) missing.add("categoria como UberX/Comfort/99Pop")
    if (!context.hasPrice) missing.add("preco como R$ 40,67")
    if (!context.hasRoutePair) missing.add("trajeto como 2 min (0.8 km)")
    if (missing.isEmpty()) {
      return "sem assinatura de oferta: o OCR viu texto, mas nao fechou um card confiavel"
    }
    return "sem assinatura de oferta: faltou ${missing.joinToString(", ")}"
  }

  private fun isIgnoredMoneyLine(line: String): Boolean {
    val ignored = listOf(
      "ganho",
      "ganhos",
      "voce fez",
      "saldo",
      "carteira",
      "combustivel",
      "gasolina",
      "etanol",
      "diesel",
      "meta diaria",
      "faturamento",
      "preco",
      "litro",
      "/l",
    )
    return ignored.any { line.contains(it) }
  }

  private fun extractMoneyCandidates(lines: List<String>): List<Pair<Int, Double>> {
    val regex = Regex("""r\$\s*(\d{1,3}(?:[.,]\d{1,2})?)""", RegexOption.IGNORE_CASE)
    return lines.mapIndexedNotNull { index, line ->
      if (looksLikeMapBonusLine(line)) return@mapIndexedNotNull null
      if (looksLikePerKmMoneyLine(line) || looksLikeAdditionalFeeLine(line)) return@mapIndexedNotNull null
      val match = regex.find(line) ?: return@mapIndexedNotNull null
      val value = match.groupValues.getOrNull(1)
        ?.replace(".", "")
        ?.replace(",", ".")
        ?.toDoubleOrNull()
        ?: return@mapIndexedNotNull null
      index to value
    }
  }

  private fun looksLikeMapBonusLine(line: String): Boolean {
    val normalized = line.trim().lowercase(Locale.ROOT)
    if (!normalized.contains("r$")) return false
    if (normalized.startsWith("+r$") || normalized.startsWith("+ r$")) return true
    if (normalized.contains("+r$") || normalized.contains("+ r$")) return true
    return false
  }

  private fun looksLikePerKmMoneyLine(line: String): Boolean {
    val normalized = line.trim().lowercase(Locale.ROOT)
    return normalized.contains("/km")
  }

  private fun looksLikeAdditionalFeeLine(line: String): Boolean {
    val normalized = line.trim().lowercase(Locale.ROOT)
    return normalized.contains("taxa de deslocamento") || normalized.contains("taxa deslocamento")
  }

  private fun extractRoutePairs(lines: List<String>): List<RoutePair> {
    val results = mutableListOf<RoutePair>()
    val kmRegex = Regex("""(\d{1,3}(?:[.,]\d{1,2})?)\s*km""", RegexOption.IGNORE_CASE)
    val meterRegex = Regex("""(\d{1,3}(?:[.,]\d{3})?|\d{1,4})\s*m\b""", RegexOption.IGNORE_CASE)
    val minRegex = Regex("""(\d{1,3})\s*(min|mins|minuto|minutos)""", RegexOption.IGNORE_CASE)
    val hourRegex = Regex("""(\d{1,2})\s*h(?:\s*e\s*(\d{1,2})\s*min)?""", RegexOption.IGNORE_CASE)
    val inlinePairRegex =
      Regex("""(\d{1,3})\s*(?:min|mins|minuto|minutos)\s*\(\s*([\d.,]+)\s*(km|m)\s*\)""", RegexOption.IGNORE_CASE)

    lines.forEachIndexed { index, line ->
      val normalizedLine = normalizeOcrNumericArtifacts(line)
      val inlinePair = inlinePairRegex.find(normalizedLine)
      if (inlinePair != null) {
        val minutes = inlinePair.groupValues.getOrNull(1)?.toDoubleOrNull()
        val distanceValue = inlinePair.groupValues.getOrNull(2)
        val distanceUnit = inlinePair.groupValues.getOrNull(3)?.lowercase(Locale.ROOT)
        val distanceKm = distanceValue?.let { parseDistanceTokenToKm(it, distanceUnit) }
        if (minutes != null && distanceKm != null && distanceKm in 0.05..160.0 && minutes in 1.0..360.0) {
          results.add(RoutePair(index = index, minutes = minutes, km = distanceKm))
          return@forEachIndexed
        }
      }

      val minutes = extractMinutes(normalizedLine, minRegex, hourRegex)
      val km = extractDistanceKm(normalizedLine, kmRegex, meterRegex)

      if (km != null && minutes != null && km in 0.05..160.0 && minutes in 1.0..360.0) {
        results.add(RoutePair(index = index, minutes = minutes, km = km))
        return@forEachIndexed
      }

      if (minutes != null && km == null) {
        val nextKm = lines.getOrNull(index + 1)
          ?.let { next -> extractDistanceKm(normalizeOcrNumericArtifacts(next), kmRegex, meterRegex) }
        if (nextKm != null && nextKm in 0.05..160.0 && minutes in 1.0..360.0) {
          results.add(RoutePair(index = index + 1, minutes = minutes, km = nextKm))
          return@forEachIndexed
        }
      }

      if (minutes == null && km != null) {
        val previousMinutes = lines.getOrNull(index - 1)?.let { previous ->
          extractMinutes(normalizeOcrNumericArtifacts(previous), minRegex, hourRegex)
        }
        if (previousMinutes != null && km in 0.05..160.0 && previousMinutes in 1.0..360.0) {
          results.add(RoutePair(index = index, minutes = previousMinutes, km = km))
          return@forEachIndexed
        }

        val nextMinutes = lines.getOrNull(index + 1)?.let { next ->
          extractMinutes(normalizeOcrNumericArtifacts(next), minRegex, hourRegex)
        }
        if (nextMinutes != null && km in 0.05..160.0 && nextMinutes in 1.0..360.0) {
          results.add(RoutePair(index = index + 1, minutes = nextMinutes, km = km))
        }
      }
    }
    return results
  }

  private fun normalizeOcrNumericArtifacts(line: String): String {
    return line
      .replace(Regex("""(?<=\d)[lI](?=[\d.,])"""), "1")
      .replace(Regex("""(?<=[\d.,])[lI](?=\d)"""), "1")
      .replace(Regex("""(?<=\d)[oO](?=[\d.,])"""), "0")
      .replace(Regex("""(?<=[\d.,])[oO](?=\d)"""), "0")
      .replace("1,l", "1,1")
      .replace("1.l", "1.1")
      .replace("1,I", "1,1")
      .replace("1.I", "1.1")
  }

  private fun normalizeOcrNumericToken(token: String): String {
    return normalizeOcrNumericArtifacts(token)
      .replace(",", ".")
      .replace(Regex("""[^\d.]"""), "")
  }

  private fun parseDistanceTokenToKm(token: String, unit: String?): Double? {
    return when (unit?.lowercase(Locale.ROOT)) {
      "m" -> parseMetersTokenToKm(token)
      else -> normalizeOcrNumericToken(token).takeIf { it.isNotBlank() }?.toDoubleOrNull()
    }
  }

  private fun parseMetersTokenToKm(token: String): Double? {
    val normalizedToken = normalizeOcrNumericArtifacts(token).trim()
    if (normalizedToken.isBlank()) return null
    val digitsOnly = normalizedToken.replace(Regex("""[^\d]"""), "")
    val hasSeparators = normalizedToken.contains('.') || normalizedToken.contains(',')
    return when {
      digitsOnly.isBlank() -> null
      hasSeparators && digitsOnly.length >= 4 -> digitsOnly.toDoubleOrNull()?.div(1000.0)
      !hasSeparators && digitsOnly.length >= 4 -> digitsOnly.toDoubleOrNull()?.div(1000.0)
      else -> {
        val normalized = normalizeOcrNumericToken(normalizedToken)
        normalized.toDoubleOrNull()?.div(1000.0)
      }
    }
  }

  private fun extractDistanceKm(
    line: String,
    kmRegex: Regex,
    meterRegex: Regex,
  ): Double? {
    val kmToken = kmRegex.find(line)?.groupValues?.getOrNull(1)
    if (kmToken != null) {
      return parseDistanceTokenToKm(kmToken, "km")
    }
    val meterToken = meterRegex.find(line)?.groupValues?.getOrNull(1)
    if (meterToken != null) {
      return parseDistanceTokenToKm(meterToken, "m")
    }
    return null
  }

  private fun extractDisplayedEarningsPerKm(lines: List<String>): Double? {
    val regex = Regex("""r\$\s*([\d.,]+)\s*/km""", RegexOption.IGNORE_CASE)
    return lines.firstNotNullOfOrNull { line ->
      regex.find(line)
        ?.groupValues
        ?.getOrNull(1)
        ?.replace(".", "")
        ?.replace(",", ".")
        ?.toDoubleOrNull()
    }
  }

  private fun formatDistanceForDebug(distanceKm: Double): String {
    return if (distanceKm < 1.0) {
      "${(distanceKm * 1000.0).toInt()} m"
    } else {
      "${String.format(Locale.US, "%.3f", distanceKm).trimEnd('0').trimEnd('.')} km"
    }
  }

  private fun extractMinutes(
    line: String,
    minRegex: Regex,
    hourRegex: Regex,
  ): Double? {
    val minMatch = minRegex.find(line)
    val hourMatch = hourRegex.find(line)
    return when {
      hourMatch != null -> {
        val hours = hourMatch.groupValues.getOrNull(1)?.toDoubleOrNull() ?: return null
        val mins = hourMatch.groupValues.getOrNull(2)?.toDoubleOrNull() ?: 0.0
        (hours * 60.0) + mins
      }
      minMatch != null -> {
        minMatch.groupValues.getOrNull(1)?.toDoubleOrNull()
      }
      else -> null
    }
  }

  private fun mergeRoutePairs(pairs: List<RoutePair>): RoutePair {
    val sorted = pairs.sortedBy { it.index }
    if (sorted.size >= 2) {
      val first = sorted[0]
      val second = sorted[1]
      val likelyPickupAndTrip =
        first.km < second.km &&
          first.minutes < second.minutes &&
          first.km <= 15.0 &&
          second.km >= 3.0
      if (likelyPickupAndTrip) {
        return RoutePair(
          index = second.index,
          minutes = first.minutes + second.minutes,
          km = first.km + second.km,
        )
      }
    }
    return sorted.maxByOrNull { it.km } ?: sorted.first()
  }

  private fun splitPickupAndTripPairs(pairs: List<RoutePair>): Pair<RoutePair?, RoutePair?> {
    if (pairs.size < 2) return Pair(pairs.firstOrNull(), null)
    val first = pairs[0]
    val second = pairs[1]
    val likelyPickupAndTrip =
      first.km < second.km &&
        first.minutes < second.minutes &&
        first.km <= 15.0 &&
        second.km >= 2.0
    return if (likelyPickupAndTrip) {
      Pair(first, second)
    } else {
      Pair(pairs.firstOrNull(), null)
    }
  }

  private fun extractCategory(lines: List<String>): String? {
    val categories = listOf("UberX", "Comfort", "Black", "99Pop", "99 Plus")
    return categories.firstOrNull { category ->
      lines.any { line -> line.contains(category, ignoreCase = true) }
    }
  }

  private fun extractOfferNote(lowerLines: List<String>): String? {
    return when {
      lowerLines.any { it.contains("viagem longa") } -> "Viagem longa"
      lowerLines.any { it.contains("exclusivo") } -> "Exclusivo"
      else -> null
    }
  }

  private fun toIsoString(epochMillis: Long): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    formatter.timeZone = TimeZone.getTimeZone("UTC")
    return formatter.format(Date(epochMillis))
  }

  private fun mergeRecentSnapshots(lines: List<String>, channel: String): List<String> {
    val now = System.currentTimeMillis()
    synchronized(recentSnapshots) {
      recentSnapshots.addLast(ChannelSnapshot(epochMs = now, channel = channel, lines = lines))
      while (recentSnapshots.isNotEmpty() && now - recentSnapshots.first().epochMs > 1500) {
        recentSnapshots.removeFirst()
      }

      return recentSnapshots
        .filter { it.channel == channel }
        .flatMap { it.lines }
        .map { it.trim() }
        .filter { it.isNotBlank() }
        .distinct()
        .takeLast(180)
    }
  }

  private fun maybeNotifyScanning(sourceApp: String) {
    if (!SHOW_RADAR_DEBUG_OVERLAY) return
    val now = System.currentTimeMillis()
    if (now - lastHeartbeatEpochMs < 3500) return
    lastHeartbeatEpochMs = now
    onOverlayUpdate?.invoke(
      "SCANNING",
      "Radar ativo",
      "Lendo ${sourceApp.uppercase(Locale.ROOT)}...",
    )
  }

  private fun maybeNotifyDebug(sourceApp: String, lines: List<String>) {
    if (!SHOW_RADAR_DEBUG_OVERLAY) return
    val now = System.currentTimeMillis()
    if (now - lastDebugEpochMs < 2500) return
    lastDebugEpochMs = now

    val hasOfferContext = lines.any { line ->
      val lower = line.lowercase(Locale.ROOT)
      lower.contains("aceitar") ||
        lower.contains("selecionar") ||
        lower.contains("recusar") ||
        lower.contains("uberx") ||
        lower.contains("99pop") ||
        lower.contains("comfort") ||
        lower.contains("black") ||
        lower.contains("exclusivo") ||
        lower.contains("viagem longa")
    }
    if (!hasOfferContext) return

    val interesting = lines.filter { line ->
      val lower = line.lowercase(Locale.ROOT)
      (lower.contains("r$") && !looksLikeMapBonusLine(lower)) ||
        lower.contains("km") ||
        lower.contains("min") ||
        lower.contains("aceitar") ||
        lower.contains("selecionar") ||
        lower.contains("uberx") ||
        lower.contains("99pop")
    }
    if (interesting.isEmpty()) return

    onOverlayUpdate?.invoke(
      "SCANNING",
      "Lendo ${sourceApp.uppercase(Locale.ROOT)}",
      interesting.take(3).joinToString(" | ").take(180),
    )
  }

  private fun maybeNotifyOfferExpired(sourceApp: String, rawText: String): Boolean {
    if (!isRideApp(sourceApp)) return false
    val lower = rawText.lowercase(Locale.ROOT)
    val expired =
      lower.contains("expir") ||
        lower.contains("indispon") ||
        lower.contains("nao esta mais disponivel") ||
        lower.contains("não está mais disponível") ||
        lower.contains("oferta nao esta mais disponivel") ||
        lower.contains("oferta não está mais disponível")
    if (!expired) return false

    onOverlayUpdate?.invoke(
      "OFFER_EXPIRED",
      "Oferta expirada",
      "A oferta nao esta mais disponivel.",
    )
    return true
  }

  fun getRecentDebugReads(): List<OfferDebugRead> {
    synchronized(recentDebugReads) {
      return recentDebugReads.toList().asReversed()
    }
  }

  fun getDebugState(): OfferDebugState {
    return OfferDebugState(
      captureStatus = captureStatus,
      currentSourceApp = currentSourceApp,
      lastSourceApp = lastSourceApp,
      sessionId = sessionId,
      lastOcrRawText = lastUberOcrRawText ?: lastAnyOcrRawText,
      lastParserReason = lastUberParserReason ?: lastAnyParserReason,
      lastOcrError = lastOcrError,
      lastNativeError = lastNativeError,
      lastSavedFramePath = lastUberSavedFramePath ?: lastAnySavedFramePath,
      lastAnyOcrRawText = lastAnyOcrRawText,
      lastAnyParserReason = lastAnyParserReason,
      lastAnySavedFramePath = lastAnySavedFramePath,
      lastUberOcrRawText = lastUberOcrRawText,
      lastUberParserReason = lastUberParserReason,
      lastUberSavedFramePath = lastUberSavedFramePath,
      lastUberCapturedAt = lastUberCapturedAt,
      lastUberCapture = lastUberCapture,
      latestFrameId = latestFrame?.frameId,
      latestFrameCapturedAt = latestFrame?.capturedAt,
      latestFrameProcessedAt = latestFrame?.processedAt,
      latestFrameClassifiedAt = latestFrame?.classifiedAt,
      latestFrameSourceApp = latestFrame?.sourceAppBeforeOcr,
      latestFrameFinalSourceApp = latestFrame?.finalSourceApp,
      latestFrameCaptureStatusAtFrame = latestFrame?.captureStatusAtFrame,
      latestFrameSourceAppBeforeOcr = latestFrame?.sourceAppBeforeOcr,
      latestFramePathFull = latestFrame?.fullPath,
      latestFramePathCrop = latestFrame?.cropPath,
      latestFrameOcrText = latestFrame?.ocrText,
      latestFrameParserReason = latestFrame?.parserReason,
      latestFrameOcrClassifiedSourceApp = latestFrame?.ocrClassifiedSourceApp,
      latestFrameSourceReason = latestFrame?.sourceReason,
      latestFrameSourceConfidence = latestFrame?.sourceConfidence,
      latestUberFrameId = latestUberFrame?.frameId,
      latestUberFrameCapturedAt = latestUberFrame?.capturedAt,
      latestUberFrameProcessedAt = latestUberFrame?.processedAt,
      latestUberFrameSourceApp = latestUberFrame?.finalSourceApp,
      latestUberFramePathFull = latestUberFrame?.fullPath,
      latestUberFramePathCrop = latestUberFrame?.cropPath,
      latestUberFrameOcrText = latestUberFrame?.ocrText,
      latestUberFrameParserReason = latestUberFrame?.parserReason,
      totalFramesReceived = totalFramesReceived,
      totalFramesProcessed = totalFramesProcessed,
      totalFramesWithText = totalFramesWithText,
      totalFramesEmpty = totalFramesEmpty,
      totalFramesError = totalFramesError,
      totalFramesWhileUberDetected = totalFramesWhileUberDetected,
      totalFramesWhile99Detected = totalFramesWhile99Detected,
      totalFramesClassifiedAsUber = totalFramesClassifiedAsUber,
      totalFramesClassifiedAs99 = totalFramesClassifiedAs99,
      totalFramesClassifiedAsSetup = totalFramesClassifiedAsSetup,
      totalFramesClassifiedAsUnknown = totalFramesClassifiedAsUnknown,
      totalPollingFrames = totalPollingFrames,
      totalCallbackFrames = totalCallbackFrames,
      totalFalsePositiveSetupBlocked = totalFalsePositiveSetupBlocked,
      lastFrameReceivedAt = lastFrameReceivedAt,
      lastFrameProcessedAtCounter = lastFrameProcessedAtCounter,
      lastUberDetectedAtFromAccessibility = lastUberDetectedAtFromAccessibility,
      last99DetectedAtFromAccessibility = last99DetectedAtFromAccessibility,
      lastFrameWhileUberDetectedAt = lastFrameWhileUberDetectedAt,
      lastFrameWhile99DetectedAt = lastFrameWhile99DetectedAt,
      latestFrameWhileUberDetectedPathFull = latestFrameWhileUberDetectedPathFull,
      latestFrameWhileUberDetectedPathCrop = latestFrameWhileUberDetectedPathCrop,
      latestFrameWhile99DetectedPathFull = latestFrameWhile99DetectedPathFull,
      latestFrameWhile99DetectedPathCrop = latestFrameWhile99DetectedPathCrop,
      ocrIntervalMs = ocrIntervalMs,
      pollingIntervalMs = ocrIntervalMs,
      ocrIntervalReason = ocrIntervalReason,
      totalFramesSkippedByThrottle = totalFramesSkippedByThrottle,
      lastSkippedFrameAt = lastSkippedFrameAt,
      mediaProjectionActive = mediaProjectionActive,
      mediaProjectionStoppedAt = mediaProjectionStoppedAt,
      virtualDisplayActive = virtualDisplayActive,
      virtualDisplayCreatedAt = virtualDisplayCreatedAt,
      imageReaderActive = imageReaderActive,
      imageReaderCreatedAt = imageReaderCreatedAt,
      imageAvailableCallbackCount = imageAvailableCallbackCount,
      lastImageAvailableAt = lastImageAvailableAt,
      lastAcquireLatestImageResult = lastAcquireLatestImageResult,
      lastAcquireLatestImageNullAt = lastAcquireLatestImageNullAt,
      imageReaderSurfaceValid = imageReaderSurfaceValid,
      imageReaderWidth = imageReaderWidth,
      imageReaderHeight = imageReaderHeight,
      imageReaderPixelFormat = imageReaderPixelFormat,
      imageReaderMaxImages = imageReaderMaxImages,
      openImageCount = openImageCount,
      totalImagesClosed = totalImagesClosed,
      lastPollImageAt = lastPollImageAt,
      handlerThreadAlive = handlerThreadAlive,
      handlerThreadName = handlerThreadName,
      virtualDisplayWidth = virtualDisplayWidth,
      virtualDisplayHeight = virtualDisplayHeight,
      virtualDisplayDensityDpi = virtualDisplayDensityDpi,
      virtualDisplayFlags = virtualDisplayFlags,
      virtualDisplayFlagsName = virtualDisplayFlagsName,
      virtualDisplayName = virtualDisplayName,
      captureResolutionMode = captureResolutionMode,
      captureAcquireMode = captureAcquireMode,
      projectionStopReason = projectionStopReason,
      lastPipelineRestartReason = lastPipelineRestartReason,
      lastPipelineRestartAt = lastPipelineRestartAt,
      lastPipelineRestartFailedAt = lastPipelineRestartFailedAt,
      pipelineRestartFailureCount = pipelineRestartFailureCount,
      isRecreatingPipeline = isRecreatingPipeline,
      isProjectionStopping = isProjectionStopping,
      isCapturePipelineActive = virtualDisplayActive && imageReaderActive,
      needsScreenCapturePermissionRefresh = needsScreenCapturePermissionRefresh,
    )
  }

  private fun appendDebugRead(sourceApp: String, channel: String, rawText: String) {
    val trimmed = rawText.trim()
    if (trimmed.isBlank()) return

    val now = System.currentTimeMillis()
    val entry = OfferDebugRead(
      sourceApp = sourceApp,
      channel = channel,
      capturedAt = toIsoString(now),
      rawText = trimmed,
    )

    synchronized(recentDebugReads) {
      val duplicate = recentDebugReads.lastOrNull()
      if (
        duplicate?.rawText == entry.rawText &&
        duplicate.sourceApp == entry.sourceApp &&
        duplicate.channel == entry.channel
      ) {
        return
      }

      recentDebugReads.addLast(entry)
      while (recentDebugReads.size > 12) {
        recentDebugReads.removeFirst()
      }
    }
  }

  private fun isRideApp(sourceApp: String): Boolean {
    return sourceApp == "uber" || sourceApp == "99"
  }

  private fun classifyFrameSourceApp(sourceApp: String): String {
    return when {
      isRideApp(sourceApp) -> sourceApp
      sourceApp == "kmone" || sourceApp == "unknown" -> "setup"
      else -> sourceApp
    }
  }

  private fun classifyCaptureStatusAtFrame(): String {
    return if (sessionStarted && captureStatus != "idle") "capturing" else "starting"
  }

  private fun mergeUberFrame(frame: FrameSnapshot): FrameSnapshot {
    val current = latestUberFrame
    return if (current == null || current.frameId == frame.frameId) {
      frame.copy(
        fullPath = frame.fullPath ?: current?.fullPath,
        cropPath = frame.cropPath ?: current?.cropPath,
        ocrText = frame.ocrText ?: current?.ocrText,
        parserReason = frame.parserReason ?: current?.parserReason,
        processedAt = frame.processedAt ?: current?.processedAt,
      )
    } else {
      frame
    }
  }

  fun reportNoFramesWhileUberForeground() {
    appendDebugRead(
      "uber",
      "ocr",
      "NO_FRAMES_WHILE_UBER_FOREGROUND | lastUberDetectedAt=$lastUberDetectedAtFromAccessibility | lastFrameWhileUberDetectedAt=$lastFrameWhileUberDetectedAt",
    )
  }

  private fun maybeNotifyFrameStats(frame: FrameSnapshot) {
    if (!SHOW_RADAR_DEBUG_OVERLAY) return
    if (!overlayActive) return
    val subtitle =
      "OCR ${ocrIntervalMs}ms | Rx:$totalFramesReceived Px:$totalFramesProcessed Sk:$totalFramesSkippedByThrottle | " +
        "hint:${frame.sourceAppBeforeOcr} final:${frame.finalSourceApp} | uberHint:$totalFramesWhileUberDetected uberOk:$totalFramesClassifiedAsUber"
    onOverlayUpdate?.invoke(
      "SCANNING",
      "Radar ativo",
      subtitle.take(180),
    )
  }

  private fun updateOcrInterval() {
    val now = System.currentTimeMillis()
    val uberFresh = currentSourceApp == "uber" || (lastUberDetectedAtFromAccessibility != null && now - currentSourceSeenAtEpochMs <= 6_000)
    val ninetyNineFresh = currentSourceApp == "99" || (last99DetectedAtFromAccessibility != null && now - currentSourceSeenAtEpochMs <= 6_000)
    when {
      uberFresh -> {
        ocrIntervalMs = 1000L
        ocrIntervalReason = "uber-detected-debug"
      }
      ninetyNineFresh -> {
        ocrIntervalMs = 1200L
        ocrIntervalReason = "99-detected-debug"
      }
      else -> {
        ocrIntervalMs = 3000L
        ocrIntervalReason = "background/default"
      }
    }
  }

  private fun resolveSourceApp(sourceAppHint: String, rawText: String): SourceResolution {
    val lower = rawText.lowercase(Locale.ROOT)
    val hasKmOneText =
      listOf(
        "captura de tela",
        "reativar captura",
        "fase 2 android",
        "overlay flutuante",
        "ocr runtime",
        "painel temporario",
        "debug",
        "radar incompleto",
        "bridge preparada",
        "historico",
        "abastecer",
        "config",
        "configur",
        "home",
      ).any { lower.contains(it) }
    val hasAction = lower.contains("aceitar") || lower.contains("selecionar")
    val hasPrice = Regex("""r\$\s*\d{1,3}(?:[.,]\d{1,2})?""", RegexOption.IGNORE_CASE).containsMatchIn(lower)
    val hasRoutePair = extractRoutePairs(rawText.lines()).isNotEmpty()
    val hasUberProduct = listOf("uberx", "comfort", "black", "flash", "moto").any { lower.contains(it) }
    val hasUberModifiers = lower.contains("exclusivo") || lower.contains("viagem longa")
    val has99Product = listOf("99pop", "99 pop", "99comfort", "99 comfort", "99plus", "99 plus").any { lower.contains(it) }
    val hasUberSignal = hasAction && hasPrice && hasRoutePair && (hasUberProduct || hasUberModifiers)
    val has99Signal = hasAction && hasPrice && hasRoutePair && has99Product

    return when {
      hasKmOneText -> {
        if ((sourceAppHint == "uber" || sourceAppHint == "99") && (lower.contains("uber") || lower.contains("99"))) {
          totalFalsePositiveSetupBlocked += 1
        }
        SourceResolution(
        ocrClassifiedSourceApp = "setup",
        finalSourceApp = "setup",
        reason = "texto OCR corresponde a tela do KM One/setup",
        confidence = 0.98,
      )
      }
      has99Signal -> SourceResolution(
        ocrClassifiedSourceApp = "99",
        finalSourceApp = "99",
        reason = "OCR encontrou assinatura forte da 99",
        confidence = 0.92,
      )
      hasUberSignal -> SourceResolution(
        ocrClassifiedSourceApp = "uber",
        finalSourceApp = "uber",
        reason = "OCR encontrou assinatura forte de oferta Uber",
        confidence = 0.92,
      )
      else -> {
        val fallback = if (sourceAppHint == "uber" || sourceAppHint == "99") "unknown" else classifyFrameSourceApp(sourceAppHint)
        SourceResolution(
          ocrClassifiedSourceApp = fallback,
          finalSourceApp = fallback,
          reason = "sem assinatura forte no OCR; pista anterior insuficiente para classificar app de corrida",
          confidence = if (isRideApp(fallback)) 0.35 else 0.2,
        )
      }
    }
  }
}
