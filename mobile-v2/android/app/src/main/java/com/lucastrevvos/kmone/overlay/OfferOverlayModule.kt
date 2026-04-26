package com.lucastrevvos.kmone.overlay

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.view.MotionEvent
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OfferOverlayModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
  private val tag = "KMONE_OCR"

  private val overlayRequestCode = 9237
  private val captureRequestCode = 9238

  private var pendingOverlayPromise: Promise? = null
  private var pendingCapturePromise: Promise? = null

  private var windowManager: WindowManager? = null
  private var overlayView: TextView? = null
  private var overlayParams: WindowManager.LayoutParams? = null
  private var screenCaptureGranted = false
  private var screenCaptureResultCode: Int? = null
  private var screenCaptureIntent: Intent? = null
  private val mainHandler = Handler(Looper.getMainLooper())

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
      putString("pickupPairSource", capture.pickupPairSource)
      putString("tripPairSource", capture.tripPairSource)
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
          putString("pickupPairSource", capture.pickupPairSource)
          putString("tripPairSource", capture.tripPairSource)
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

    val view = TextView(reactContext).apply {
      textSize = 14f
      setTextColor(0xFFFFFFFF.toInt())
      setBackgroundColor(0xCC0F172A.toInt())
      setPadding(32, 22, 32, 22)
      text = "Radar ativo"
      elevation = 12f
      alpha = 0f
      visibility = View.GONE
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
      view.alpha = 0f
      view.visibility = View.GONE
      return
    }

    view.visibility = View.VISIBLE
    view.alpha = 1f
    val bgColor = when (status.uppercase()) {
      "ACEITAR" -> 0xCC14532D.toInt()
      "TALVEZ" -> 0xCC78350F.toInt()
      "RECUSAR" -> 0xCC7F1D1D.toInt()
      else -> 0xCC0F172A.toInt()
    }
    view.setBackgroundColor(bgColor)
    view.text = "$title\n$subtitle"
  }

  private fun enableDrag(
    view: TextView,
    wm: WindowManager,
    params: WindowManager.LayoutParams,
  ) {
    view.setOnTouchListener(object : View.OnTouchListener {
      private var startX = 0
      private var startY = 0
      private var touchStartX = 0f
      private var touchStartY = 0f

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
        }
        return false
      }
    })
  }

  private fun runOnMainThread(action: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      action()
    } else {
      mainHandler.post { action() }
    }
  }
}
