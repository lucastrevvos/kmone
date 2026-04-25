package com.lucastrevvos.kmone.overlay

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import android.view.Gravity
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

  private val overlayRequestCode = 9237
  private val captureRequestCode = 9238

  private var pendingOverlayPromise: Promise? = null
  private var pendingCapturePromise: Promise? = null

  private var windowManager: WindowManager? = null
  private var overlayView: TextView? = null
  private var screenCaptureGranted = false

  override fun getName(): String = "OfferOverlayModule"

  init {
    reactContext.addActivityEventListener(this)
  }

  @ReactMethod
  fun isOverlayPermissionGranted(promise: Promise) {
    promise.resolve(hasOverlayPermission())
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

    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${reactContext.packageName}"),
    )
    activity.startActivityForResult(intent, overlayRequestCode)
  }

  @ReactMethod
  fun isAccessibilityPermissionGranted(promise: Promise) {
    promise.resolve(isAnyAccessibilityEnabled())
  }

  @ReactMethod
  fun openAccessibilityPermissionSettings(promise: Promise) {
    try {
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
    promise.resolve(screenCaptureGranted)
  }

  @ReactMethod
  fun requestScreenCapturePermission(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }

    val manager = ContextCompat.getSystemService(
      reactContext,
      MediaProjectionManager::class.java,
    )
    if (manager == null) {
      promise.resolve(false)
      return
    }

    pendingCapturePromise?.resolve(false)
    pendingCapturePromise = promise
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
      promise.resolve(false)
      return
    }

    OfferOverlayRuntime.overlayActive = true
    OfferOverlayRuntime.captureStatus = "capturing"
    OfferOverlayRuntime.setOverlayUpdateListener { nextStatus, nextTitle, nextSubtitle ->
      reactContext.runOnUiQueueThread {
        applyOverlayText(nextStatus, nextTitle, nextSubtitle)
      }
    }
    ensureOverlayView()
    applyOverlayText(status, title, subtitle)
    promise.resolve(true)
  }

  @ReactMethod
  fun updateOverlay(status: String, title: String, subtitle: String, promise: Promise) {
    if (!OfferOverlayRuntime.overlayActive) {
      startOverlay(status, title, subtitle, promise)
      return
    }

    applyOverlayText(status, title, subtitle)
    promise.resolve(true)
  }

  @ReactMethod
  fun hideOverlay(promise: Promise) {
    removeOverlay()
    promise.resolve(true)
  }

  @ReactMethod
  fun stopOverlay(promise: Promise) {
    removeOverlay()
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
        pendingOverlayPromise?.resolve(granted)
        pendingOverlayPromise = null
      }

      captureRequestCode -> {
        val granted = resultCode == Activity.RESULT_OK && data != null
        screenCaptureGranted = granted
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

    val wm = reactContext.getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return
    windowManager = wm

    val view = TextView(reactContext).apply {
      textSize = 14f
      setTextColor(0xFFFFFFFF.toInt())
      setBackgroundColor(0xCC0F172A.toInt())
      setPadding(32, 22, 32, 22)
      text = "Radar ativo"
      elevation = 12f
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

    wm.addView(view, params)
    overlayView = view
  }

  private fun removeOverlay() {
    val wm = windowManager
    val view = overlayView
    if (wm != null && view != null) {
      try {
        wm.removeView(view)
      } catch (_: Throwable) {
      }
    }
    overlayView = null
    windowManager = null
    OfferOverlayRuntime.overlayActive = false
    OfferOverlayRuntime.captureStatus = "idle"
    OfferOverlayRuntime.setOverlayUpdateListener(null)
  }

  private fun applyOverlayText(status: String, title: String, subtitle: String) {
    val view = overlayView ?: return
    val bgColor = when (status.uppercase()) {
      "ACEITAR" -> 0xCC14532D.toInt()
      "TALVEZ" -> 0xCC78350F.toInt()
      "RECUSAR" -> 0xCC7F1D1D.toInt()
      else -> 0xCC0F172A.toInt()
    }
    view.setBackgroundColor(bgColor)
    view.text = "$title\n$subtitle"
  }
}
