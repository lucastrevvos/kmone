package com.lucastrevvos.kmone.overlay

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.util.TypedValue
import android.view.MotionEvent
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.lucastrevvos.kmone.R
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.math.abs

class OfferOverlayModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
  private val tag = "KMONE_OCR"

  private val overlayRequestCode = 9237
  private val captureRequestCode = 9238

  private var pendingOverlayPromise: Promise? = null
  private var pendingCapturePromise: Promise? = null

  private var windowManager: WindowManager? = null
  private var overlayView: LinearLayout? = null
  private var overlayParams: WindowManager.LayoutParams? = null
  private var overlayCardBackground: GradientDrawable? = null
  private var overlayStatusBadge: TextView? = null
  private var overlayHeadline: TextView? = null
  private var overlaySummary: TextView? = null
  private var overlayPrimaryRow: LinearLayout? = null
  private var overlaySecondaryRow: LinearLayout? = null
  private var overlayAutoHideRunnable: Runnable? = null
  private var overlayDismissedAt: Long? = null
  private var overlayDismissedSignature: String? = null
  private var currentOverlaySignature: String? = null
  private var screenCaptureGranted = false
  private var screenCaptureResultCode: Int? = null
  private var screenCaptureIntent: Intent? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  private data class OverlayBadgeState(
    val label: String,
    val backgroundColor: Int,
    val textColor: Int,
  )

  private data class OverlayTelemetry(
    val ocrMs: String,
    val rx: String,
    val px: String,
    val sk: String,
    val hint: String,
    val finalSource: String,
    val uberHint: String,
    val uberOk: String,
  )

  private data class OverlayProductSummary(
    val value: String,
    val totalKm: String,
    val totalMinutes: String,
    val rsKm: String?,
    val rsHour: String?,
  )

  private data class OverlayVisibilityRule(
    val shouldShow: Boolean,
    val autoHideMs: Long? = null,
  )

  override fun getName(): String = "OfferOverlayModule"

  init {
    reactContext.addActivityEventListener(this)
    latestInstance = this
    Log.d(tag, "[KMONE_OCR] OfferOverlayModule init package=${reactContext.packageName}")
  }

  @ReactMethod
  fun isOverlayPermissionGranted(promise: Promise) {
    val granted = hasOverlayPermission()
    Log.d(tag, "[KMONE_OCR] overlayPermission granted=$granted")
    promise.resolve(granted)
  }

  @ReactMethod
  fun openOverlayPermissionSettings(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }

    pendingOverlayPromise?.resolve(false)
    pendingOverlayPromise = promise
    Log.d(tag, "[KMONE_OCR] openOverlayPermissionSettings")

    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${reactContext.packageName}"),
    )
    activity.startActivityForResult(intent, overlayRequestCode)
  }

  @ReactMethod
  fun isAccessibilityPermissionGranted(promise: Promise) {
    val granted = isAnyAccessibilityEnabled()
    Log.d(tag, "[KMONE_OCR] accessibilityPermission granted=$granted")
    promise.resolve(granted)
  }

  @ReactMethod
  fun openAccessibilityPermissionSettings(promise: Promise) {
    try {
      Log.d(tag, "[KMONE_OCR] openAccessibilityPermissionSettings")
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (_: Throwable) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun isScreenCapturePermissionGranted(promise: Promise) {
    val granted = screenCaptureGranted && screenCaptureResultCode != null && screenCaptureIntent != null
    Log.d(tag, "[KMONE_OCR] screenCapturePermission granted=$granted")
    promise.resolve(granted)
  }

  @ReactMethod
  fun requestScreenCapturePermission(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      Log.w(tag, "[KMONE_OCR] requestScreenCapturePermission without activity")
      promise.resolve(false)
      return
    }

    val manager = ContextCompat.getSystemService(
      reactContext,
      MediaProjectionManager::class.java,
    )
    if (manager == null) {
      Log.e(tag, "[KMONE_OCR] MediaProjectionManager unavailable")
      promise.resolve(false)
      return
    }

    pendingCapturePromise?.resolve(false)
    pendingCapturePromise = promise
    OfferCaptureService.stop(reactContext)
    OfferOverlayRuntime.resetSession()
    screenCaptureGranted = false
    screenCaptureResultCode = null
    screenCaptureIntent = null
    OfferOverlayRuntime.captureStatus = "capturing"
    Log.d(tag, "[KMONE_OCR] requestScreenCapturePermission launching system dialog")
    activity.startActivityForResult(
      manager.createScreenCaptureIntent(),
      captureRequestCode,
    )
  }

  @ReactMethod
  fun isOverlayActive(promise: Promise) {
    promise.resolve(OfferOverlayRuntime.overlayActive)
  }

  @ReactMethod
  fun getLatestCapture(promise: Promise) {
    val capture = OfferOverlayRuntime.lastCapture
    if (capture == null) {
      promise.resolve(null)
      return
    }
    val map = Arguments.createMap().apply {
      putString("frameId", capture.frameId)
      putString("sourceApp", capture.sourceApp)
      putDouble("offeredValue", capture.offeredValue)
      putDouble("estimatedKm", capture.estimatedKm)
      putDouble("estimatedMinutes", capture.estimatedMinutes)
      putString("capturedAt", capture.capturedAt)
      putString("rawText", capture.rawText)
      putString("category", capture.category)
      putBoolean("isExclusive", capture.isExclusive)
      capture.pickupMinutes?.let { putDouble("pickupMinutes", it) }
      capture.pickupKm?.let { putDouble("pickupKm", it) }
      capture.tripMinutes?.let { putDouble("tripMinutes", it) }
      capture.tripKm?.let { putDouble("tripKm", it) }
      putString("note", capture.note)
      putString("parsedTimeKmPairs", capture.parsedTimeKmPairs)
      putString("parsedTimeDistancePairs", capture.parsedTimeDistancePairs)
      putString("pickupPairSource", capture.pickupPairSource)
      putString("tripPairSource", capture.tripPairSource)
      capture.displayedEarningsPerKm?.let { putDouble("displayedEarningsPerKm", it) }
      putString("parserSourceApp", capture.parserSourceApp)
      putString("parserWarnings", capture.parserWarnings)
      capture.parserConfidence?.let { putDouble("parserConfidence", it) }
    }
    promise.resolve(map)
  }

  @ReactMethod
  fun getRecentDebugReads(promise: Promise) {
    val list = Arguments.createArray()
    OfferOverlayRuntime.getRecentDebugReads().forEach { entry ->
      val map = Arguments.createMap().apply {
        putString("sourceApp", entry.sourceApp)
        putString("channel", entry.channel)
        putString("capturedAt", entry.capturedAt)
        putString("rawText", entry.rawText)
      }
      list.pushMap(map)
    }
    promise.resolve(list)
  }

  @ReactMethod
  fun getCaptureStatus(promise: Promise) {
    promise.resolve(OfferOverlayRuntime.captureStatus)
  }

  @ReactMethod
  fun getDebugState(promise: Promise) {
    val state = OfferOverlayRuntime.getDebugState()
    val map = Arguments.createMap().apply {
      putString("captureStatus", state.captureStatus)
      putString("currentSourceApp", state.currentSourceApp)
      putString("lastSourceApp", state.lastSourceApp)
      putString("lastOcrRawText", state.lastOcrRawText)
      putString("lastParserReason", state.lastParserReason)
      putString("lastOcrError", state.lastOcrError)
      putString("lastNativeError", state.lastNativeError)
      putString("lastSavedFramePath", state.lastSavedFramePath)
      putString("lastAnyOcrRawText", state.lastAnyOcrRawText)
      putString("lastAnyParserReason", state.lastAnyParserReason)
      putString("lastAnySavedFramePath", state.lastAnySavedFramePath)
      putString("lastUberOcrRawText", state.lastUberOcrRawText)
        putString("lastUberParserReason", state.lastUberParserReason)
        putString("lastUberSavedFramePath", state.lastUberSavedFramePath)
        putString("lastUberCapturedAt", state.lastUberCapturedAt)
        putString("sessionId", state.sessionId)
        putString("latestFrameId", state.latestFrameId)
        putString("latestFrameCapturedAt", state.latestFrameCapturedAt)
        putString("latestFrameProcessedAt", state.latestFrameProcessedAt)
        putString("latestFrameClassifiedAt", state.latestFrameClassifiedAt)
        putString("latestFrameSourceApp", state.latestFrameSourceApp)
        putString("latestFrameFinalSourceApp", state.latestFrameFinalSourceApp)
        putString("latestFrameCaptureStatusAtFrame", state.latestFrameCaptureStatusAtFrame)
        putString("latestFrameSourceAppBeforeOcr", state.latestFrameSourceAppBeforeOcr)
        putString("latestFramePathFull", state.latestFramePathFull)
        putString("latestFramePathCrop", state.latestFramePathCrop)
        putString("latestFrameOcrText", state.latestFrameOcrText)
        putString("latestFrameParserReason", state.latestFrameParserReason)
        putString("latestFrameOcrClassifiedSourceApp", state.latestFrameOcrClassifiedSourceApp)
        putDouble("latestFrameSourceConfidence", state.latestFrameSourceConfidence ?: 0.0)
        putString("latestFrameSourceReason", state.latestFrameSourceReason)
        putString("latestUberFrameId", state.latestUberFrameId)
        putString("latestUberFrameCapturedAt", state.latestUberFrameCapturedAt)
        putString("latestUberFrameProcessedAt", state.latestUberFrameProcessedAt)
        putString("latestUberFrameSourceApp", state.latestUberFrameSourceApp)
        putString("latestUberFramePathFull", state.latestUberFramePathFull)
        putString("latestUberFramePathCrop", state.latestUberFramePathCrop)
        putString("latestUberFrameOcrText", state.latestUberFrameOcrText)
        putString("latestUberFrameParserReason", state.latestUberFrameParserReason)
        putInt("totalFramesReceived", state.totalFramesReceived)
        putInt("totalFramesProcessed", state.totalFramesProcessed)
        putInt("totalFramesWithText", state.totalFramesWithText)
        putInt("totalFramesEmpty", state.totalFramesEmpty)
        putInt("totalFramesError", state.totalFramesError)
        putInt("totalFramesWhileUberDetected", state.totalFramesWhileUberDetected)
        putInt("totalFramesWhile99Detected", state.totalFramesWhile99Detected)
        putInt("totalFramesClassifiedAsUber", state.totalFramesClassifiedAsUber)
        putInt("totalFramesClassifiedAs99", state.totalFramesClassifiedAs99)
        putInt("totalFramesClassifiedAsSetup", state.totalFramesClassifiedAsSetup)
        putInt("totalFramesClassifiedAsUnknown", state.totalFramesClassifiedAsUnknown)
        putInt("totalPollingFrames", state.totalPollingFrames)
        putInt("totalCallbackFrames", state.totalCallbackFrames)
        putInt("totalFalsePositiveSetupBlocked", state.totalFalsePositiveSetupBlocked)
        putString("lastFrameReceivedAt", state.lastFrameReceivedAt)
        putString("lastFrameProcessedAtCounter", state.lastFrameProcessedAtCounter)
        putString("lastUberDetectedAtFromAccessibility", state.lastUberDetectedAtFromAccessibility)
        putString("last99DetectedAtFromAccessibility", state.last99DetectedAtFromAccessibility)
        putString("lastFrameWhileUberDetectedAt", state.lastFrameWhileUberDetectedAt)
        putString("lastFrameWhile99DetectedAt", state.lastFrameWhile99DetectedAt)
        putString("latestFrameWhileUberDetectedPathFull", state.latestFrameWhileUberDetectedPathFull)
        putString("latestFrameWhileUberDetectedPathCrop", state.latestFrameWhileUberDetectedPathCrop)
        putString("latestFrameWhile99DetectedPathFull", state.latestFrameWhile99DetectedPathFull)
        putString("latestFrameWhile99DetectedPathCrop", state.latestFrameWhile99DetectedPathCrop)
        putDouble("ocrIntervalMs", state.ocrIntervalMs.toDouble())
        putDouble("pollingIntervalMs", state.pollingIntervalMs.toDouble())
        putString("ocrIntervalReason", state.ocrIntervalReason)
        putInt("totalFramesSkippedByThrottle", state.totalFramesSkippedByThrottle)
        putString("lastSkippedFrameAt", state.lastSkippedFrameAt)
        putBoolean("mediaProjectionActive", state.mediaProjectionActive)
        putString("mediaProjectionStoppedAt", state.mediaProjectionStoppedAt)
        putBoolean("virtualDisplayActive", state.virtualDisplayActive)
        putString("virtualDisplayCreatedAt", state.virtualDisplayCreatedAt)
        putBoolean("imageReaderActive", state.imageReaderActive)
        putString("imageReaderCreatedAt", state.imageReaderCreatedAt)
        putInt("imageAvailableCallbackCount", state.imageAvailableCallbackCount)
        putString("lastImageAvailableAt", state.lastImageAvailableAt)
        putString("lastAcquireLatestImageResult", state.lastAcquireLatestImageResult)
        putString("lastAcquireLatestImageNullAt", state.lastAcquireLatestImageNullAt)
        putBoolean("imageReaderSurfaceValid", state.imageReaderSurfaceValid)
        state.imageReaderWidth?.let { putInt("imageReaderWidth", it) }
        state.imageReaderHeight?.let { putInt("imageReaderHeight", it) }
        state.imageReaderPixelFormat?.let { putInt("imageReaderPixelFormat", it) }
        state.imageReaderMaxImages?.let { putInt("imageReaderMaxImages", it) }
        putInt("openImageCount", state.openImageCount)
        putInt("totalImagesClosed", state.totalImagesClosed)
        putString("lastPollImageAt", state.lastPollImageAt)
        putBoolean("handlerThreadAlive", state.handlerThreadAlive)
        putString("handlerThreadName", state.handlerThreadName)
        state.virtualDisplayWidth?.let { putInt("virtualDisplayWidth", it) }
        state.virtualDisplayHeight?.let { putInt("virtualDisplayHeight", it) }
        state.virtualDisplayDensityDpi?.let { putInt("virtualDisplayDensityDpi", it) }
        state.virtualDisplayFlags?.let { putInt("virtualDisplayFlags", it) }
        putString("virtualDisplayFlagsName", state.virtualDisplayFlagsName)
        putString("virtualDisplayName", state.virtualDisplayName)
        putString("captureResolutionMode", state.captureResolutionMode)
        putString("captureAcquireMode", state.captureAcquireMode)
        putString("projectionStopReason", state.projectionStopReason)
        putString("lastPipelineRestartReason", state.lastPipelineRestartReason)
        putString("lastPipelineRestartAt", state.lastPipelineRestartAt)
        putString("lastPipelineRestartFailedAt", state.lastPipelineRestartFailedAt)
        putInt("pipelineRestartFailureCount", state.pipelineRestartFailureCount)
        putBoolean("isRecreatingPipeline", state.isRecreatingPipeline)
        putBoolean("isProjectionStopping", state.isProjectionStopping)
        putBoolean("isCapturePipelineActive", state.isCapturePipelineActive)
        putBoolean("needsScreenCapturePermissionRefresh", state.needsScreenCapturePermissionRefresh)
        state.lastUberCapture?.let { capture ->
          val captureMap = Arguments.createMap().apply {
            putString("frameId", capture.frameId)
            putString("sourceApp", capture.sourceApp)
          putDouble("offeredValue", capture.offeredValue)
          putDouble("estimatedKm", capture.estimatedKm)
          putDouble("estimatedMinutes", capture.estimatedMinutes)
          putString("capturedAt", capture.capturedAt)
          putString("rawText", capture.rawText)
          putString("category", capture.category)
          putBoolean("isExclusive", capture.isExclusive)
          capture.pickupMinutes?.let { putDouble("pickupMinutes", it) }
          capture.pickupKm?.let { putDouble("pickupKm", it) }
          capture.tripMinutes?.let { putDouble("tripMinutes", it) }
          capture.tripKm?.let { putDouble("tripKm", it) }
          putString("note", capture.note)
          putString("parsedTimeKmPairs", capture.parsedTimeKmPairs)
          putString("parsedTimeDistancePairs", capture.parsedTimeDistancePairs)
          putString("pickupPairSource", capture.pickupPairSource)
          putString("tripPairSource", capture.tripPairSource)
          capture.displayedEarningsPerKm?.let { putDouble("displayedEarningsPerKm", it) }
          putString("parserSourceApp", capture.parserSourceApp)
          putString("parserWarnings", capture.parserWarnings)
          capture.parserConfidence?.let { putDouble("parserConfidence", it) }
        }
        putMap("lastUberCapture", captureMap)
      }
    }
    promise.resolve(map)
  }

  @ReactMethod
  fun setRadarConfig(minValor: Double, minRsKm: Double, minRsHora: Double, promise: Promise) {
    OfferOverlayRuntime.setRadarConfig(minValor, minRsKm, minRsHora)
    promise.resolve(true)
  }

  @ReactMethod
  fun startOverlay(status: String, title: String, subtitle: String, promise: Promise) {
    if (!hasOverlayPermission()) {
      Log.w(tag, "[KMONE_OCR] startOverlay denied: overlay permission missing")
      promise.resolve(false)
      return
    }

    Log.d(tag, "[KMONE_OCR] startOverlay screenCaptureGranted=$screenCaptureGranted")
    OfferOverlayRuntime.resetSession()
    OfferOverlayRuntime.overlayActive = true
    OfferOverlayRuntime.captureStatus = "capturing"
    OfferOverlayRuntime.setOverlayUpdateListener { nextStatus, nextTitle, nextSubtitle ->
      runOnMainThread {
        applyOverlayText(nextStatus, nextTitle, nextSubtitle)
      }
    }
    runOnMainThread {
      ensureOverlayView()
      applyOverlayText("HIDDEN", title, subtitle)
    }
    if (screenCaptureGranted && screenCaptureResultCode != null && screenCaptureIntent != null) {
      Log.d(tag, "[KMONE_OCR] starting OfferCaptureService")
      OfferCaptureService.start(
        reactContext,
        screenCaptureResultCode,
        screenCaptureIntent,
      )
    } else {
      Log.w(tag, "[KMONE_OCR] startOverlay without screen capture token")
      OfferOverlayRuntime.reportNativeError(
        OfferOverlayRuntime.currentSourceApp,
        "Permita novamente a captura de tela para reativar o OCR",
      )
    }
    promise.resolve(true)
  }

  @ReactMethod
  fun updateOverlay(status: String, title: String, subtitle: String, promise: Promise) {
    if (!OfferOverlayRuntime.overlayActive) {
      startOverlay(status, title, subtitle, promise)
      return
    }

    runOnMainThread {
      applyOverlayText(status, title, subtitle)
    }
    promise.resolve(true)
  }

  @ReactMethod
  fun hideOverlay(promise: Promise) {
    Log.d(tag, "[KMONE_OCR] hideOverlay")
    runOnMainThread {
      removeOverlay()
    }
    promise.resolve(true)
  }

  @ReactMethod
  fun stopOverlay(promise: Promise) {
    Log.d(tag, "[KMONE_OCR] stopOverlay")
    runOnMainThread {
      removeOverlay()
    }
    promise.resolve(true)
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    when (requestCode) {
      overlayRequestCode -> {
        val granted = hasOverlayPermission()
        Log.d(tag, "[KMONE_OCR] overlay activityResult granted=$granted")
        pendingOverlayPromise?.resolve(granted)
        pendingOverlayPromise = null
      }

      captureRequestCode -> {
        val granted = resultCode == Activity.RESULT_OK && data != null
        Log.d(tag, "[KMONE_OCR] capture activityResult granted=$granted resultCode=$resultCode hasData=${data != null}")
        screenCaptureGranted = granted
        screenCaptureResultCode = if (granted) resultCode else null
        screenCaptureIntent = if (granted && data != null) Intent(data) else null
        if (!granted) {
          Log.w(tag, "[KMONE_OCR] capture permission denied or canceled")
          OfferCaptureService.stop(reactContext)
          OfferOverlayRuntime.captureStatus = "idle"
        }
        pendingCapturePromise?.resolve(granted)
        pendingCapturePromise = null
      }
    }
  }

  override fun onNewIntent(intent: Intent) = Unit

  private fun hasOverlayPermission(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(reactContext)
    } else {
      true
    }
  }

  private fun isAnyAccessibilityEnabled(): Boolean {
    return try {
      val accessibilityEnabled = Settings.Secure.getInt(
        reactContext.contentResolver,
        Settings.Secure.ACCESSIBILITY_ENABLED,
      )
      if (accessibilityEnabled != 1) return false
      val settingValue = Settings.Secure.getString(
        reactContext.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
      ) ?: return false

      val splitter = TextUtils.SimpleStringSplitter(':')
      splitter.setString(settingValue)
      val expectedService =
        "${reactContext.packageName}/${OfferAccessibilityService::class.java.name}"
      while (splitter.hasNext()) {
        val service = splitter.next()
        if (service.equals(expectedService, ignoreCase = true)) {
          return true
        }
      }
      false
    } catch (_: Throwable) {
      false
    }
  }

  private fun ensureOverlayView() {
    if (overlayView != null) return
    Log.d(tag, "[KMONE_OCR] ensureOverlayView creating view")

    val wm = reactContext.getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return
    windowManager = wm

    val cardBackground = GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = dp(20)
      setColor(0xD9121724.toInt())
      setStroke(dpInt(1), 0x3338BDF8)
    }
    overlayCardBackground = cardBackground

    val brandTitle = TextView(reactContext).apply {
      text = "Radar KM One"
      setTextColor(0xFFD7E5F3.toInt())
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
      setTypeface(typeface, Typeface.BOLD)
      letterSpacing = 0.02f
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
    }

    overlayHeadline = TextView(reactContext).apply {
      text = "Aguardando leitura"
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
      setTypeface(typeface, Typeface.BOLD)
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
    }

    overlayStatusBadge = TextView(reactContext).apply {
      setPadding(dpInt(11), dpInt(7), dpInt(11), dpInt(7))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
      text = "ATIVO"
      background = createPillDrawable(0xFF166534.toInt())
      setTextColor(Color.WHITE)
      maxLines = 1
    }

    val icon = ImageView(reactContext).apply {
      layoutParams = LinearLayout.LayoutParams(dpInt(30), dpInt(30)).apply {
        rightMargin = dpInt(12)
      }
      background = createCircleDrawable(0x2238BDF8)
      setPadding(dpInt(4), dpInt(4), dpInt(4), dpInt(4))
      setImageDrawable(ContextCompat.getDrawable(reactContext, R.mipmap.ic_launcher_round))
      scaleType = ImageView.ScaleType.CENTER_CROP
    }

    val titleColumn = LinearLayout(reactContext).apply {
      orientation = LinearLayout.VERTICAL
      layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
      addView(brandTitle)
      overlayHeadline?.let { addView(it) }
    }

    val headerRow = LinearLayout(reactContext).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      addView(icon)
      addView(titleColumn)
      overlayStatusBadge?.let { addView(it) }
    }

    overlayPrimaryRow = LinearLayout(reactContext).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.START
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply {
        topMargin = dpInt(10)
      }
    }

    overlaySecondaryRow = LinearLayout(reactContext).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.START
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply {
        topMargin = dpInt(8)
      }
    }

    overlaySummary = TextView(reactContext).apply {
      setTextColor(0xFF9FB3C8.toInt())
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
      maxLines = 2
      ellipsize = TextUtils.TruncateAt.END
      visibility = View.GONE
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply {
        topMargin = dpInt(10)
      }
    }

    val view = LinearLayout(reactContext).apply {
      orientation = LinearLayout.VERTICAL
      background = cardBackground
      setPadding(dpInt(16), dpInt(14), dpInt(16), dpInt(14))
      minimumWidth = dpInt(278)
      elevation = 16f
      alpha = 0f
      visibility = View.GONE
      addView(headerRow)
      overlayPrimaryRow?.let { addView(it) }
      overlaySecondaryRow?.let { addView(it) }
      overlaySummary?.let { addView(it) }
    }

    val type =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
      }

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
      y = 180
    }

    enableDrag(view, wm, params)
    wm.addView(view, params)
    overlayView = view
    overlayParams = params
  }

  private fun removeOverlay() {
    Log.d(tag, "[KMONE_OCR] removeOverlay")
    clearAutoHide()
    val wm = windowManager
    val view = overlayView
    if (wm != null && view != null) {
      try {
        wm.removeView(view)
      } catch (_: Throwable) {
      }
    }
    overlayView = null
    overlayParams = null
    windowManager = null
    overlayDismissedAt = null
    overlayDismissedSignature = null
    currentOverlaySignature = null
    OfferOverlayRuntime.overlayActive = false
    OfferOverlayRuntime.captureStatus = "idle"
    OfferOverlayRuntime.setOverlayUpdateListener(null)
    OfferCaptureService.stop(reactContext)
  }

  companion object {
    @Volatile
    private var latestInstance: OfferOverlayModule? = null

    fun invalidateScreenCapturePermission() {
      latestInstance?.reactContext?.let { context ->
        OfferCaptureService.stop(context)
      }
      OfferOverlayRuntime.resetSession()
      latestInstance?.screenCaptureGranted = false
      latestInstance?.screenCaptureResultCode = null
      latestInstance?.screenCaptureIntent = null
    }
  }

  private fun applyOverlayText(status: String, title: String, subtitle: String) {
    val view = overlayView ?: return
    if (status.uppercase() == "HIDDEN") {
      hideOverlayCard()
      return
    }

    val signature = buildOverlaySignature(status, title, subtitle)
    val visibilityRule = resolveOverlayVisibility(status, title, subtitle)
    if (!visibilityRule.shouldShow) {
      currentOverlaySignature = signature
      hideOverlayCard()
      return
    }

    if (shouldSuppressDismissedOverlay(status, signature)) {
      currentOverlaySignature = signature
      hideOverlayCard()
      return
    }

    view.visibility = View.VISIBLE
    view.alpha = 1f
    currentOverlaySignature = signature
    if (overlayDismissedSignature != signature) {
      overlayDismissedSignature = null
      overlayDismissedAt = null
    }
    val badgeState = resolveBadgeState(status)
    val bgColor = when (status.uppercase()) {
      "ACEITAR" -> 0xD9133B28.toInt()
      "TALVEZ" -> 0xD95B3A12.toInt()
      "RECUSAR" -> 0xD9581C1C.toInt()
      "ERROR", "IDLE" -> 0xD9420F12.toInt()
      else -> 0xD9121724.toInt()
    }
    overlayCardBackground?.setColor(bgColor)
    overlayStatusBadge?.apply {
      text = badgeState.label
      background = createPillDrawable(badgeState.backgroundColor)
      setTextColor(badgeState.textColor)
    }
    overlayHeadline?.text = title.ifBlank { "Radar KM One" }

    val productSummary = parseProductSummary(status, subtitle)
    val telemetry = parseOverlayTelemetry(subtitle)
    if (productSummary != null && !OfferOverlayRuntime.isDebugOverlayEnabled()) {
      overlayHeadline?.text = resolveProductHeadline(status, title)
      renderChipRow(
        overlayPrimaryRow,
        listOfNotNull(
          productSummary.value,
          productSummary.rsKm?.let { "R$/km $it" },
          productSummary.rsHour?.let { "R$/h $it" },
        ),
        emphasized = true,
      )
      renderChipRow(
        overlaySecondaryRow,
        listOf(
          "Total ${productSummary.totalKm} km",
          "${productSummary.totalMinutes} min",
        ),
        emphasized = false,
      )
      overlaySummary?.visibility = View.GONE
      overlaySummary?.text = ""
    } else if (telemetry != null) {
      renderChipRow(
        overlayPrimaryRow,
        listOf(
          "OCR ${telemetry.ocrMs} ms",
          "Rx ${telemetry.rx}",
          "Px ${telemetry.px}",
          "Sk ${telemetry.sk}",
        ),
        emphasized = true,
      )
      renderChipRow(
        overlaySecondaryRow,
        listOf(
          "Hint ${telemetry.hint}",
          "Final ${telemetry.finalSource}",
          "UberHint ${telemetry.uberHint}",
          "UberOK ${telemetry.uberOk}",
        ),
        emphasized = false,
      )
      overlaySummary?.visibility = View.GONE
      overlaySummary?.text = ""
    } else {
      overlayPrimaryRow?.removeAllViews()
      overlayPrimaryRow?.visibility = View.GONE
      overlaySecondaryRow?.removeAllViews()
      overlaySecondaryRow?.visibility = View.GONE
      overlaySummary?.visibility = View.VISIBLE
      overlaySummary?.setTextSize(
        TypedValue.COMPLEX_UNIT_SP,
        if (!OfferOverlayRuntime.isDebugOverlayEnabled()) 14f else 12f,
      )
      overlaySummary?.setTypeface(
        overlaySummary?.typeface,
        if (!OfferOverlayRuntime.isDebugOverlayEnabled()) Typeface.BOLD else Typeface.NORMAL,
      )
      overlaySummary?.text = subtitle
    }

    clearAutoHide()
    visibilityRule.autoHideMs?.let { delayMs ->
      val runnable = Runnable {
        hideOverlayCard()
      }
      overlayAutoHideRunnable = runnable
      mainHandler.postDelayed(runnable, delayMs)
    }
  }

  private fun enableDrag(
    view: View,
    wm: WindowManager,
    params: WindowManager.LayoutParams,
  ) {
    view.setOnTouchListener(object : View.OnTouchListener {
      private var startX = 0
      private var startY = 0
      private var touchStartX = 0f
      private var touchStartY = 0f
      private val touchSlop = dpInt(8)

      override fun onTouch(v: View, event: MotionEvent): Boolean {
        when (event.action) {
          MotionEvent.ACTION_DOWN -> {
            startX = params.x
            startY = params.y
            touchStartX = event.rawX
            touchStartY = event.rawY
            return true
          }

          MotionEvent.ACTION_MOVE -> {
            params.x = startX + (event.rawX - touchStartX).toInt()
            params.y = startY + (event.rawY - touchStartY).toInt()
            try {
              wm.updateViewLayout(view, params)
            } catch (_: Throwable) {
            }
            return true
          }

          MotionEvent.ACTION_UP -> {
            val deltaX = abs(event.rawX - touchStartX)
            val deltaY = abs(event.rawY - touchStartY)
            if (deltaX <= touchSlop && deltaY <= touchSlop) {
              dismissOverlayByUser()
            }
            return true
          }

          MotionEvent.ACTION_CANCEL -> return true
        }
        return false
      }
    })
  }

  private fun dismissOverlayByUser() {
    overlayDismissedAt = System.currentTimeMillis()
    overlayDismissedSignature = currentOverlaySignature
    Log.d(tag, "[KMONE_OCR] overlay dismissed by touch signature=$overlayDismissedSignature at=$overlayDismissedAt")
    hideOverlayCard()
  }

  private fun clearAutoHide() {
    overlayAutoHideRunnable?.let { mainHandler.removeCallbacks(it) }
    overlayAutoHideRunnable = null
  }

  private fun hideOverlayCard() {
    clearAutoHide()
    overlayView?.alpha = 0f
    overlayView?.visibility = View.GONE
  }

  private fun buildOverlaySignature(status: String, title: String, subtitle: String): String {
    return "${status.uppercase()}|${title.trim()}|${subtitle.trim()}"
  }

  private fun shouldSuppressDismissedOverlay(status: String, signature: String): Boolean {
    if (OfferOverlayRuntime.isDebugOverlayEnabled()) return false
    if (isCriticalOverlayStatus(status)) return false
    return overlayDismissedSignature != null && overlayDismissedSignature == signature
  }

  private fun isCriticalOverlayStatus(status: String): Boolean {
    return when (status.uppercase()) {
      "ERROR", "NEEDS_PERMISSION_REFRESH", "STALLED", "STALLED_IMAGE_READER" -> true
      else -> false
    }
  }

  private fun resolveBadgeState(status: String): OverlayBadgeState {
    return when (status.uppercase()) {
      "TALVEZ", "STALLED", "STALLED_IMAGE_READER", "NEEDS_PERMISSION_REFRESH" ->
        OverlayBadgeState("ATENCAO", 0xFFB45309.toInt(), Color.WHITE)
      "ERROR", "IDLE" ->
        OverlayBadgeState("PAUSADO", 0xFF991B1B.toInt(), Color.WHITE)
      else ->
        OverlayBadgeState("ATIVO", 0xFF166534.toInt(), Color.WHITE)
    }
  }

  private fun resolveOverlayVisibility(
    status: String,
    title: String,
    subtitle: String,
  ): OverlayVisibilityRule {
    if (OfferOverlayRuntime.isDebugOverlayEnabled()) {
      return OverlayVisibilityRule(shouldShow = true)
    }

    return when (status.uppercase()) {
      "ACEITAR", "TALVEZ", "RECUSAR", "OFFER_EXPIRED" ->
        OverlayVisibilityRule(shouldShow = true, autoHideMs = 7_000L)
      "ERROR", "NEEDS_PERMISSION_REFRESH", "STALLED", "STALLED_IMAGE_READER" ->
        OverlayVisibilityRule(shouldShow = true)
      "SCANNING" ->
        OverlayVisibilityRule(shouldShow = false)
      else -> {
        val hasProductText =
          title.contains("vale", ignoreCase = true) ||
            title.contains("analise", ignoreCase = true) ||
            title.contains("nao vale", ignoreCase = true) ||
            subtitle.contains("R$", ignoreCase = true)
        if (hasProductText) {
          OverlayVisibilityRule(shouldShow = true, autoHideMs = 7_000L)
        } else {
          OverlayVisibilityRule(shouldShow = false)
        }
      }
    }
  }

  private fun resolveProductHeadline(status: String, title: String): String {
    return when (status.uppercase()) {
      "ACEITAR" -> "VALE MUITO A PENA"
      "TALVEZ" -> "ACEITAVEL"
      "RECUSAR" -> "NAO COMPENSA"
      "OFFER_EXPIRED" -> "OFERTA EXPIRADA"
      else -> title.uppercase()
    }
  }

  private fun parseProductSummary(
    status: String,
    subtitle: String,
  ): OverlayProductSummary? {
    val normalizedStatus = status.uppercase()
    if (
      normalizedStatus != "ACEITAR" &&
      normalizedStatus != "TALVEZ" &&
      normalizedStatus != "RECUSAR"
    ) {
      return null
    }

    val value = Regex("""R\$\s*([\d.,]+)""", RegexOption.IGNORE_CASE)
      .find(subtitle)
      ?.groupValues
      ?.getOrNull(1)
      ?: return null
    val totalKm = Regex("""\|\s*([\d.,]+)\s*km""", RegexOption.IGNORE_CASE)
      .find(subtitle)
      ?.groupValues
      ?.getOrNull(1)
      ?: return null
    val totalMinutes = Regex("""\|\s*(\d+)\s*min""", RegexOption.IGNORE_CASE)
      .find(subtitle)
      ?.groupValues
      ?.getOrNull(1)
      ?: return null
    val rsKm = Regex("""R\$\s*([\d.,]+)\s*/km""", RegexOption.IGNORE_CASE)
      .find(subtitle)
      ?.groupValues
      ?.getOrNull(1)
    val rsHour = Regex("""R\$\s*([\d.,]+)\s*/h""", RegexOption.IGNORE_CASE)
      .find(subtitle)
      ?.groupValues
      ?.getOrNull(1)

    return OverlayProductSummary(
      value = "R$ $value",
      totalKm = totalKm,
      totalMinutes = totalMinutes,
      rsKm = rsKm,
      rsHour = rsHour,
    )
  }

  private fun parseOverlayTelemetry(subtitle: String): OverlayTelemetry? {
    val ocr = Regex("""OCR\s+(\d+)ms""", RegexOption.IGNORE_CASE).find(subtitle)?.groupValues?.getOrNull(1)
    val rx = Regex("""Rx:(\d+)""", RegexOption.IGNORE_CASE).find(subtitle)?.groupValues?.getOrNull(1)
    val px = Regex("""Px:(\d+)""", RegexOption.IGNORE_CASE).find(subtitle)?.groupValues?.getOrNull(1)
    val sk = Regex("""Sk:(\d+)""", RegexOption.IGNORE_CASE).find(subtitle)?.groupValues?.getOrNull(1)
    val hint = Regex("""hint:([a-z0-9_-]+)""", RegexOption.IGNORE_CASE).find(subtitle)?.groupValues?.getOrNull(1)
    val finalSource = Regex("""final:([a-z0-9_-]+)""", RegexOption.IGNORE_CASE).find(subtitle)?.groupValues?.getOrNull(1)
    val uberHint = Regex("""uberHint:(\d+)""", RegexOption.IGNORE_CASE).find(subtitle)?.groupValues?.getOrNull(1)
    val uberOk = Regex("""uberOk:(\d+)""", RegexOption.IGNORE_CASE).find(subtitle)?.groupValues?.getOrNull(1)

    if (ocr == null || rx == null || px == null || sk == null) {
      return null
    }

    return OverlayTelemetry(
      ocrMs = ocr,
      rx = rx,
      px = px,
      sk = sk,
      hint = hint ?: "unknown",
      finalSource = finalSource ?: "unknown",
      uberHint = uberHint ?: "0",
      uberOk = uberOk ?: "0",
    )
  }

  private fun renderChipRow(
    row: LinearLayout?,
    values: List<String>,
    emphasized: Boolean,
  ) {
    row ?: return
    row.removeAllViews()
    row.visibility = View.VISIBLE

    values.forEachIndexed { index, value ->
      val chip = createChip(value, emphasized)
      (chip.layoutParams as? LinearLayout.LayoutParams)?.rightMargin =
        if (index == values.lastIndex) 0 else dpInt(6)
      row.addView(chip)
    }
  }

  private fun createChip(text: String, emphasized: Boolean): TextView {
    return TextView(reactContext).apply {
      this.text = text
      setTextColor(if (emphasized) Color.WHITE else 0xFFB9C9D8.toInt())
      setTextSize(TypedValue.COMPLEX_UNIT_SP, if (emphasized) 14f else 12f)
      setTypeface(typeface, if (emphasized) Typeface.BOLD else Typeface.NORMAL)
      setPadding(dpInt(10), dpInt(if (emphasized) 7 else 6), dpInt(10), dpInt(if (emphasized) 7 else 6))
      background = createPillDrawable(if (emphasized) 0x2238BDF8 else 0x182B3647)
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      )
    }
  }

  private fun createPillDrawable(color: Int): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = dp(999)
      setColor(color)
    }
  }

  private fun createCircleDrawable(color: Int): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(color)
    }
  }

  private fun dp(value: Int): Float = value * reactContext.resources.displayMetrics.density

  private fun dpInt(value: Int): Int = dp(value).toInt()

  private fun runOnMainThread(action: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      action()
    } else {
      mainHandler.post { action() }
    }
  }
}
