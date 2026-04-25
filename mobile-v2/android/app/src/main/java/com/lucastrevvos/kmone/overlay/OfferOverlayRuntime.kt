package com.lucastrevvos.kmone.overlay

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
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

object OfferOverlayRuntime {
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
  private var onOverlayUpdate: OverlayUpdateListener? = null

  private var lastDigest: Int = 0
  private var lastCaptureEpochMs: Long = 0L

  fun setOverlayUpdateListener(listener: OverlayUpdateListener?) {
    onOverlayUpdate = listener
  }

  fun setRadarConfig(minValor: Double, minRsKm: Double, minRsHora: Double) {
    this.minValor = minValor
    this.minRsKm = minRsKm
    this.minRsHora = minRsHora
  }

  fun processAccessibilityText(sourceApp: String, rawText: String) {
    if (!overlayActive) return
    if (rawText.isBlank()) return

    captureStatus = "capturing"

    val normalized = rawText.lowercase(Locale.ROOT)
    if (!looksLikeRideOffer(normalized)) return

    val lines = rawText
      .replace('\u00A0', ' ')
      .lines()
      .map { it.trim() }
      .filter { it.isNotBlank() }
      .take(120)
    if (lines.isEmpty()) return

    val moneyCandidates = extractMoneyCandidates(lines)
      .filter { (_, value) -> value in 4.0..500.0 }
      .filterNot { (index, _) -> isIgnoredMoneyLine(lines[index].lowercase(Locale.ROOT)) }
    if (moneyCandidates.isEmpty()) return

    val kmCandidates = extractKmCandidates(lines).filter { it.second in 0.5..120.0 }
    val minCandidates = extractMinuteCandidates(lines).filter { it.second in 1.0..240.0 }
    if (kmCandidates.isEmpty() || minCandidates.isEmpty()) return

    val primaryMoney = moneyCandidates.first()
    val primaryKm = nearestCandidate(primaryMoney.first, kmCandidates) ?: kmCandidates.first()
    val primaryMin = nearestCandidate(primaryMoney.first, minCandidates) ?: minCandidates.first()

    val offeredValue = primaryMoney.second
    val estimatedKm = primaryKm.second
    val estimatedMinutes = primaryMin.second
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
      rawText = lines.joinToString(" | ").take(900),
    )
    lastCapture = capture
    captureStatus = "captured"

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
    val subtitle = "R$ ${"%.2f".format(Locale.US, offeredValue)} • ${"%.1f".format(Locale.US, estimatedKm)} km • ${estimatedMinutes.toInt()} min • R$ ${"%.2f".format(Locale.US, rsKm)}/km"
    onOverlayUpdate?.invoke(status, title, subtitle)
  }

  private fun looksLikeRideOffer(text: String): Boolean {
    val sourceHint =
      text.contains("uber") ||
        text.contains("99") ||
        text.contains("corrida") ||
        text.contains("viagem") ||
        text.contains("oferta") ||
        text.contains("aceitar")
    val hasMoney = Regex("""r\$\s*\d+([.,]\d{1,2})?""").containsMatchIn(text)
    val hasDistance = Regex("""\d+([.,]\d+)?\s*km""").containsMatchIn(text)
    return sourceHint && hasMoney && hasDistance
  }

  private fun isIgnoredMoneyLine(line: String): Boolean {
    val ignored = listOf(
      "ganho",
      "ganhos",
      "voce fez",
      "você fez",
      "saldo",
      "carteira",
      "combustivel",
      "combustível",
      "gasolina",
      "etanol",
      "diesel",
      "meta diaria",
      "meta diária",
      "faturamento",
      "preco",
      "preço",
      "litro",
      "/l",
    )
    return ignored.any { line.contains(it) }
  }

  private fun extractMoneyCandidates(lines: List<String>): List<Pair<Int, Double>> {
    val regex = Regex("""r\$\s*(\d{1,3}(?:[.,]\d{1,2})?)""", RegexOption.IGNORE_CASE)
    return lines.mapIndexedNotNull { index, line ->
      val match = regex.find(line) ?: return@mapIndexedNotNull null
      val value = match.groupValues.getOrNull(1)
        ?.replace(".", "")
        ?.replace(",", ".")
        ?.toDoubleOrNull()
        ?: return@mapIndexedNotNull null
      index to value
    }
  }

  private fun extractKmCandidates(lines: List<String>): List<Pair<Int, Double>> {
    val regex = Regex("""(\d{1,3}(?:[.,]\d{1,2})?)\s*km""", RegexOption.IGNORE_CASE)
    return lines.mapIndexedNotNull { index, line ->
      val match = regex.find(line) ?: return@mapIndexedNotNull null
      val value = match.groupValues.getOrNull(1)
        ?.replace(",", ".")
        ?.toDoubleOrNull()
        ?: return@mapIndexedNotNull null
      index to value
    }
  }

  private fun extractMinuteCandidates(lines: List<String>): List<Pair<Int, Double>> {
    val regex = Regex("""(\d{1,3})\s*(min|mins|minuto|minutos)""", RegexOption.IGNORE_CASE)
    return lines.mapIndexedNotNull { index, line ->
      val match = regex.find(line) ?: return@mapIndexedNotNull null
      val value = match.groupValues.getOrNull(1)?.toDoubleOrNull() ?: return@mapIndexedNotNull null
      index to value
    }
  }

  private fun nearestCandidate(anchorIndex: Int, candidates: List<Pair<Int, Double>>): Pair<Int, Double>? {
    return candidates.minByOrNull { (index, _) -> kotlin.math.abs(index - anchorIndex) }
  }

  private fun toIsoString(epochMillis: Long): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    formatter.timeZone = TimeZone.getTimeZone("UTC")
    return formatter.format(Date(epochMillis))
  }
}
