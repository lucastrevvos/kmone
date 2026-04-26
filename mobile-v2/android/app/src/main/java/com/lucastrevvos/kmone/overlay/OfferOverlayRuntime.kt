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
  val sourceApp: String,
  val offeredValue: Double,
  val estimatedKm: Double,
  val estimatedMinutes: Double,
  val capturedAt: String,
  val rawText: String,
)

data class OfferDebugRead(
  val sourceApp: String,
  val channel: String,
  val capturedAt: String,
  val rawText: String,
)

private data class RoutePair(
  val index: Int,
  val minutes: Double,
  val km: Double,
)

object OfferOverlayRuntime {
  private const val TAG = "KMONE_OCR"
  private data class ChannelSnapshot(val epochMs: Long, val channel: String, val lines: List<String>)

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
  private var lastHeartbeatEpochMs: Long = 0L
  private var lastDebugEpochMs: Long = 0L
  private var lastOcrEmptyEpochMs: Long = 0L
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
    synchronized(recentDebugReads) {
      recentDebugReads.clear()
    }
  }

  fun noteVisibleSourceApp(sourceApp: String) {
    currentSourceApp = sourceApp
    currentSourceSeenAtEpochMs = System.currentTimeMillis()
    Log.d(TAG, "[KMONE_OCR] sourceApp=$sourceApp")
  }

  fun reportNativeError(sourceApp: String, reason: String) {
    captureStatus = "error"
    appendDebugRead(sourceApp, "native", "NATIVE_ERROR | $reason")
    Log.e(TAG, "[KMONE_OCR] OCR_ERROR source=$sourceApp reason=$reason")
    onOverlayUpdate?.invoke(
      "ERROR",
      "Radar com erro",
      reason.take(180),
    )
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
    appendDebugRead(sourceApp, "ocr", "OCR_EMPTY")
    Log.d(TAG, "[KMONE_OCR] OCR_EMPTY source=$sourceApp")
  }

  fun reportOcrFrameSaved(sourceApp: String, label: String) {
    appendDebugRead(sourceApp, "ocr", "OCR_FRAME_SAVED | $label")
    Log.d(TAG, "[KMONE_OCR] OCR_FRAME_SAVED source=$sourceApp path=$label")
  }

  fun reportOcrFrameSaveError(sourceApp: String, reason: String) {
    appendDebugRead(sourceApp, "ocr", "OCR_FRAME_SAVE_ERROR | $reason")
    Log.e(TAG, "[KMONE_OCR] OCR_FRAME_SAVE_ERROR source=$sourceApp reason=$reason")
  }

  fun reportOcrFrameTick(sourceApp: String, detail: String) {
    appendDebugRead(sourceApp, "ocr", "OCR_FRAME_TICK | $detail")
    Log.d(TAG, "[KMONE_OCR] OCR_FRAME_TICK source=$sourceApp detail=$detail")
  }

  fun reportOcrSessionStarted(sourceApp: String, detail: String) {
    appendDebugRead(sourceApp, "ocr", "OCR_SESSION_STARTED | $detail")
    Log.d(TAG, "[KMONE_OCR] OCR_SESSION_STARTED source=$sourceApp detail=$detail")
  }

  fun reportOcrTextDetected(sourceApp: String, summary: String) {
    appendDebugRead(sourceApp, "ocr", "OCR_TEXT_DETECTED | $summary")
    Log.d(TAG, "[KMONE_OCR] OCR_TEXT_DETECTED source=$sourceApp summary=$summary")
  }

  fun processAccessibilityText(sourceApp: String, rawText: String, channel: String = "a11y") {
    if (!overlayActive) return
    if (rawText.isBlank()) return
    if (channel != "ocr") {
      processSourceHeartbeat(sourceApp, rawText)
      return
    }

    captureStatus = "capturing"

    val lines = rawText
      .replace('\u00A0', ' ')
      .lines()
      .map { it.trim() }
      .filter { it.isNotBlank() }
      .take(140)
    if (lines.isEmpty()) return

    appendDebugRead(sourceApp, channel, lines.joinToString(" | ").take(1200))
    reportOcrTextDetected(sourceApp, lines.take(4).joinToString(" | ").take(220))

    maybeNotifyScanning(sourceApp)

    val combinedLines = mergeRecentSnapshots(lines, channel)
    val scopedLines = sliceOfferCardWindow(combinedLines).ifEmpty { combinedLines }

    val lowerScoped = scopedLines.map { it.lowercase(Locale.ROOT) }
    val strongSignature = hasStrongOfferSignature(lowerScoped)
    val weakSignature = hasWeakOfferSignature(lowerScoped)
    if (!strongSignature && !weakSignature) {
      maybeNotifyDebug(sourceApp, scopedLines)
      return
    }

    val moneyCandidates = extractMoneyCandidates(scopedLines)
      .filter { (_, value) -> value in 4.0..500.0 }
      .filterNot { (index, _) -> isIgnoredMoneyLine(lowerScoped[index]) }
    if (moneyCandidates.isEmpty()) {
      maybeNotifyDebug(sourceApp, scopedLines)
      return
    }

    val routePairs = extractRoutePairs(scopedLines)
    if (routePairs.isEmpty()) {
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
      maybeNotifyDebug(sourceApp, scopedLines)
      return
    }

    val bestLinked = linkedMoney.minByOrNull { (_, _, distance) -> distance } ?: return
    val primaryMoney = bestLinked.first
    val valueAnchorIndex = primaryMoney.first
    val nearbyPairs = routePairs
      .filter { abs(it.index - valueAnchorIndex) <= 20 }
      .ifEmpty { routePairs }
    val mergedRoute = mergeRoutePairs(nearbyPairs)

    val offeredValue = primaryMoney.second
    val estimatedKm = mergedRoute.km
    val estimatedMinutes = mergedRoute.minutes

    val digest = listOf(sourceApp, offeredValue, estimatedKm, estimatedMinutes).joinToString("|").hashCode()
    val nowMs = System.currentTimeMillis()
    if (digest == lastDigest && nowMs - lastCaptureEpochMs < 6_000) return

    lastDigest = digest
    lastCaptureEpochMs = nowMs

    val capture = OfferCapture(
      sourceApp = sourceApp,
      offeredValue = offeredValue,
      estimatedKm = estimatedKm,
      estimatedMinutes = estimatedMinutes,
      capturedAt = toIsoString(nowMs),
      rawText = scopedLines.joinToString(" | ").take(1000),
    )
    lastCapture = capture
    captureStatus = "captured"
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
      "ACEITAR" -> "Vale a pena aceitar"
      "TALVEZ" -> "Analise com cuidado"
      else -> "Nao vale a pena"
    }
    val subtitle =
      "R$ ${"%.2f".format(Locale.US, offeredValue)} | " +
        "${"%.1f".format(Locale.US, estimatedKm)} km | " +
        "${estimatedMinutes.toInt()} min | " +
        "R$ ${"%.2f".format(Locale.US, rsKm)}/km"
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

  private fun hasStrongOfferSignature(lowerLines: List<String>): Boolean {
    val hasAction = lowerLines.any { it.contains("selecionar") || it.contains("aceitar") }
    val hasProduct = lowerLines.any {
      it.contains("uberx") ||
        it.contains("99pop") ||
        it.contains("viagem longa") ||
        it.contains("comfort") ||
        it.contains("black")
    }
    val hasPrice = lowerLines.any { it.contains("r$") }
    val hasTimeKmPair = extractRoutePairs(lowerLines).isNotEmpty()
    return hasAction && hasProduct && hasPrice && hasTimeKmPair
  }

  private fun hasWeakOfferSignature(lowerLines: List<String>): Boolean {
    val hasAction = lowerLines.any {
      it.contains("aceitar") || it.contains("selecionar") || it.contains("recusar")
    }
    val hasProduct = lowerLines.any {
      it.contains("uberx") ||
        it.contains("99pop") ||
        it.contains("viagem longa") ||
        it.contains("comfort") ||
        it.contains("black") ||
        it.contains("exclusivo")
    }
    val hasPrice = lowerLines.any { it.contains("r$") }
    val routePairs = extractRoutePairs(lowerLines)
    val hasTimeKmPair = routePairs.isNotEmpty()
    return ((hasAction || hasProduct) && hasPrice && hasTimeKmPair) ||
      (hasPrice && routePairs.size >= 2)
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

  private fun extractRoutePairs(lines: List<String>): List<RoutePair> {
    val results = mutableListOf<RoutePair>()
    val kmRegex = Regex("""(\d{1,3}(?:[.,]\d{1,2})?)\s*km""", RegexOption.IGNORE_CASE)
    val minRegex = Regex("""(\d{1,3})\s*(min|mins|minuto|minutos)""", RegexOption.IGNORE_CASE)
    val hourRegex = Regex("""(\d{1,2})\s*h(?:\s*e\s*(\d{1,2})\s*min)?""", RegexOption.IGNORE_CASE)

    lines.forEachIndexed { index, line ->
      val minutes = extractMinutes(line, minRegex, hourRegex)
      val km = kmRegex.find(line)?.groupValues?.getOrNull(1)
        ?.replace(",", ".")
        ?.toDoubleOrNull()

      if (km != null && minutes != null && km in 0.5..160.0 && minutes in 1.0..360.0) {
        results.add(RoutePair(index = index, minutes = minutes, km = km))
        return@forEachIndexed
      }

      if (minutes != null && km == null) {
        val nextKm = lines.getOrNull(index + 1)
          ?.let { next -> kmRegex.find(next)?.groupValues?.getOrNull(1) }
          ?.replace(",", ".")
          ?.toDoubleOrNull()
        if (nextKm != null && nextKm in 0.5..160.0 && minutes in 1.0..360.0) {
          results.add(RoutePair(index = index + 1, minutes = minutes, km = nextKm))
          return@forEachIndexed
        }
      }

      if (minutes == null && km != null) {
        val previousMinutes = lines.getOrNull(index - 1)?.let { previous ->
          extractMinutes(previous, minRegex, hourRegex)
        }
        if (previousMinutes != null && km in 0.5..160.0 && previousMinutes in 1.0..360.0) {
          results.add(RoutePair(index = index, minutes = previousMinutes, km = km))
          return@forEachIndexed
        }

        val nextMinutes = lines.getOrNull(index + 1)?.let { next ->
          extractMinutes(next, minRegex, hourRegex)
        }
        if (nextMinutes != null && km in 0.5..160.0 && nextMinutes in 1.0..360.0) {
          results.add(RoutePair(index = index + 1, minutes = nextMinutes, km = km))
        }
      }
    }
    return results
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

  fun getRecentDebugReads(): List<OfferDebugRead> {
    synchronized(recentDebugReads) {
      return recentDebugReads.toList().asReversed()
    }
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
}
