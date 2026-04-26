package com.lucastrevvos.kmone.overlay

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.Locale

class OfferAccessibilityService : AccessibilityService() {
  private val tag = "KMONE_OCR"
  private val handler = Handler(Looper.getMainLooper())

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    if (!OfferOverlayRuntime.overlayActive) return

    val packageName = event.packageName?.toString()?.lowercase(Locale.ROOT) ?: return
    val sourceApp = when {
      packageName.contains("ubercab") || packageName.contains("uber") -> "uber"
      packageName.contains("99") || packageName.contains("taxis99") -> "99"
      else -> {
        OfferOverlayRuntime.noteVisibleSourceApp("unknown")
        return
      }
    }
    Log.d(tag, "[KMONE_OCR] accessibility event package=$packageName source=$sourceApp type=${event.eventType}")
    OfferOverlayRuntime.noteVisibleSourceApp(sourceApp)
    OfferCaptureService.boostForRideAppDetection()

    processSnapshot(sourceApp, event)
    scheduleDelayedSnapshot(sourceApp, 120L)
    scheduleDelayedSnapshot(sourceApp, 320L)
    scheduleDelayedSnapshot(sourceApp, 520L)
  }

  override fun onInterrupt() = Unit

  override fun onServiceConnected() {
    super.onServiceConnected()
    Log.d(tag, "[KMONE_OCR] accessibility service connected")
  }

  private fun processSnapshot(sourceApp: String, event: AccessibilityEvent? = null): String? {
    val texts = ArrayList<String>(120)
    event?.text?.forEach { item ->
      val value = item?.toString()?.trim()
      if (!value.isNullOrBlank()) texts.add(value)
    }

    val root = resolveRootNode(sourceApp, event) ?: return null
    if (root != null) {
      collectTexts(root, texts)
    }
    if (texts.isEmpty()) return null

    val rawText = texts
      .asSequence()
      .map { it.trim() }
      .filter { it.isNotBlank() }
      .distinct()
      .take(160)
      .joinToString("\n")

    if (rawText.isBlank()) return null
    Log.d(tag, "[KMONE_OCR] accessibility snapshot source=$sourceApp length=${rawText.length}")
    OfferOverlayRuntime.processSourceHeartbeat(sourceApp, rawText)
    return rawText
  }

  private fun scheduleDelayedSnapshot(sourceApp: String, delayMs: Long) {
    handler.postDelayed(
      {
        if (!OfferOverlayRuntime.overlayActive) return@postDelayed
        processSnapshot(sourceApp, null)
      },
      delayMs,
    )
  }

  private fun resolveRootNode(
    sourceApp: String,
    event: AccessibilityEvent?,
  ): AccessibilityNodeInfo? {
    val eventSource = event?.source
    if (matchesSourceApp(eventSource?.packageName?.toString(), sourceApp)) {
      return eventSource
    }

    val activeRoot = rootInActiveWindow
    if (matchesSourceApp(activeRoot?.packageName?.toString(), sourceApp)) {
      return activeRoot
    }

    return null
  }

  private fun matchesSourceApp(packageName: String?, sourceApp: String): Boolean {
    val normalized = packageName?.lowercase(Locale.ROOT) ?: return false
    return when (sourceApp) {
      "uber" -> normalized.contains("ubercab") || normalized.contains("uber")
      "99" -> normalized.contains("99") || normalized.contains("taxis99")
      else -> false
    }
  }

  private fun collectTexts(node: AccessibilityNodeInfo, out: MutableList<String>) {
    node.text?.toString()?.let { out.add(it) }
    node.contentDescription?.toString()?.let { out.add(it) }

    val children = node.childCount
    for (i in 0 until children) {
      val child = node.getChild(i) ?: continue
      collectTexts(child, out)
      @Suppress("DEPRECATION")
      child.recycle()
    }
  }
}
