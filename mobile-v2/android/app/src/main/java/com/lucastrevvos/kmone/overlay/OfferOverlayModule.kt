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
      putString("sourceApp", capture.sourceApp)
      putDouble("offeredValue", capture.offeredValue)
      putDouble("estimatedKm", capture.estimatedKm)
      putDouble("estimatedMinutes", capture.estimatedMinutes)
      putString("capturedAt", capture.capturedAt)
      putString("rawText", capture.rawText)
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
