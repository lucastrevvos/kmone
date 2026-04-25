package com.lucastrevvos.kmone.overlay

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.Locale

class OfferAccessibilityService : AccessibilityService() {
  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    if (!OfferOverlayRuntime.overlayActive) return

    val packageName = event.packageName?.toString()?.lowercase(Locale.ROOT) ?: return
    val sourceApp = when {
      packageName.contains("ubercab") || packageName.contains("uber") -> "uber"
      packageName.contains("99") || packageName.contains("taxis99") -> "99"
      else -> return
    }

    val root = rootInActiveWindow ?: event.source ?: return
    val texts = ArrayList<String>(80)
    collectTexts(root, texts)
    if (texts.isEmpty()) return

    val rawText = texts
      .asSequence()
      .map { it.trim() }
      .filter { it.isNotBlank() }
      .distinct()
      .take(120)
      .joinToString("\n")

    if (rawText.isBlank()) return
    OfferOverlayRuntime.processAccessibilityText(sourceApp, rawText)
  }

  override fun onInterrupt() = Unit

  private fun collectTexts(node: AccessibilityNodeInfo, out: MutableList<String>) {
    node.text?.toString()?.let { out.add(it) }
    node.contentDescription?.toString()?.let { out.add(it) }

    val children = node.childCount
    for (i in 0 until children) {
      val child = node.getChild(i) ?: continue
      collectTexts(child, out)
      child.recycle()
    }
  }
}

