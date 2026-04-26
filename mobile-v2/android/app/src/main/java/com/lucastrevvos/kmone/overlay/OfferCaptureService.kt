package com.lucastrevvos.kmone.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import android.content.pm.ServiceInfo
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File
import java.io.FileOutputStream

class OfferCaptureService : Service() {
  private val tag = "KMONE_OCR"
  private val recognizer by lazy {
    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  }

  private var mediaProjection: MediaProjection? = null
  private var mediaProjectionCallback: MediaProjection.Callback? = null
  private var imageReader: ImageReader? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var workerThread: HandlerThread? = null
  private var workerHandler: Handler? = null
  private var processing = false
  private var lastProcessedAt = 0L
  private var lastSavedDebugFrameAt = 0L
  private var lastFrameTickAt = 0L
  private var serviceStartedAt = 0L
  private var latestFullFrame: Bitmap? = null
  private var latestCroppedFrame: Bitmap? = null
  private val diagnosticRunnable = object : Runnable {
    override fun run() {
      runDiagnosticTick()
      workerHandler?.postDelayed(this, 5000)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      Log.d(tag, "[KMONE_OCR] OfferCaptureService onStartCommand action=${intent?.action}")
      when (intent?.action) {
        ACTION_STOP -> {
          Log.d(tag, "[KMONE_OCR] OfferCaptureService stop requested")
          stopSelf()
          return START_NOT_STICKY
        }
        ACTION_START -> {
          if (serviceStartedAt == 0L) {
            serviceStartedAt = System.currentTimeMillis()
          }
          resetDiagnosticState()
          startForegroundInternal()
          Log.d(tag, "[KMONE_OCR] OfferCaptureService foreground started")
          val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Int.MIN_VALUE)
          val data = intent.getParcelableExtraCompat<Intent>(EXTRA_RESULT_DATA)
          if (resultCode == Int.MIN_VALUE || data == null) {
            OfferOverlayRuntime.reportNativeError(
              OfferOverlayRuntime.currentSourceApp,
              "Permissao de captura ausente ou invalida",
            )
            stopSelf()
            return START_NOT_STICKY
          }
          startProjection(resultCode, data)
        }
      }
    } catch (error: Throwable) {
      OfferOverlayModule.invalidateScreenCapturePermission()
      OfferOverlayRuntime.reportNativeError(
        OfferOverlayRuntime.currentSourceApp,
        "Falha ao iniciar servico OCR: ${error.javaClass.simpleName} ${error.message.orEmpty()}".trim(),
      )
      stopSelf()
      return START_NOT_STICKY
    }

    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(tag, "[KMONE_OCR] OfferCaptureService onDestroy")
    teardown()
    recognizer.close()
  }

  private fun startProjection(resultCode: Int, data: Intent) {
    if (mediaProjection != null) return

    try {
      Log.d(tag, "[KMONE_OCR] startProjection resultCode=$resultCode")
      val manager = ContextCompat.getSystemService(
        this,
        MediaProjectionManager::class.java,
      ) ?: run {
        OfferOverlayRuntime.reportNativeError(
          OfferOverlayRuntime.currentSourceApp,
          "MediaProjectionManager indisponivel",
        )
        stopSelf()
        return
      }
      val projection = manager.getMediaProjection(resultCode, data) ?: run {
        OfferOverlayRuntime.reportNativeError(
          OfferOverlayRuntime.currentSourceApp,
          "Nao foi possivel criar MediaProjection",
        )
        stopSelf()
        return
      }
      val metrics = DisplayMetrics()
      val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
      @Suppress("DEPRECATION")
      wm.defaultDisplay.getRealMetrics(metrics)

      workerThread = HandlerThread("OfferCaptureWorker").also { it.start() }
      workerHandler = Handler(workerThread!!.looper)
      Log.d(tag, "[KMONE_OCR] worker thread started")
      workerHandler?.removeCallbacks(diagnosticRunnable)
      workerHandler?.postDelayed(diagnosticRunnable, 5000)

      val callback = object : MediaProjection.Callback() {
        override fun onStop() {
          OfferOverlayRuntime.reportNativeError(
            OfferOverlayRuntime.currentSourceApp,
            "MediaProjection foi encerrado pelo sistema",
          )
          stopSelf()
        }
      }
      mediaProjectionCallback = callback
      projection.registerCallback(callback, workerHandler)
      mediaProjection = projection
      Log.d(tag, "[KMONE_OCR] MediaProjection callback registered")

      val reader = ImageReader.newInstance(
        metrics.widthPixels,
        metrics.heightPixels,
        PixelFormat.RGBA_8888,
        2,
      )
      imageReader = reader
      Log.d(tag, "[KMONE_OCR] ImageReader created width=${metrics.widthPixels} height=${metrics.heightPixels}")

      reader.setOnImageAvailableListener({ handleImageAvailable() }, workerHandler)

      virtualDisplay = projection.createVirtualDisplay(
        "OfferCaptureDisplay",
        metrics.widthPixels,
        metrics.heightPixels,
        metrics.densityDpi,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
        reader.surface,
        null,
        workerHandler,
      )
      Log.d(tag, "[KMONE_OCR] VirtualDisplay created")
      OfferOverlayRuntime.reportOcrSessionStarted(
        OfferOverlayRuntime.currentSourceApp,
        "sessao=${serviceStartedAt}",
      )
    } catch (error: Throwable) {
      OfferOverlayModule.invalidateScreenCapturePermission()
      OfferOverlayRuntime.reportNativeError(
        OfferOverlayRuntime.currentSourceApp,
        "Falha ao abrir captura da tela: ${error.javaClass.simpleName} ${error.message.orEmpty()}".trim(),
      )
      stopSelf()
    }
  }

  private fun handleImageAvailable() {
    if (!OfferOverlayRuntime.overlayActive) return
    if (processing) return

    val now = System.currentTimeMillis()
    if (now - lastFrameTickAt > 4000) {
      lastFrameTickAt = now
      OfferOverlayRuntime.reportOcrFrameTick(
        OfferOverlayRuntime.currentSourceApp,
        "frame-recebido",
      )
    }
    if (now - lastProcessedAt < 700) return

    val reader = imageReader ?: return
    val image = reader.acquireLatestImage() ?: return
    Log.d(tag, "[KMONE_OCR] handleImageAvailable image=${image.width}x${image.height}")
    processing = true
    lastProcessedAt = now

    try {
      val plane = image.planes.firstOrNull()
      if (plane == null) return

      val width = image.width
      val height = image.height
      val buffer = plane.buffer
      val pixelStride = plane.pixelStride
      val rowStride = plane.rowStride
      val rowPadding = rowStride - pixelStride * width

      val bitmap = Bitmap.createBitmap(
        width + rowPadding / pixelStride,
        height,
        Bitmap.Config.ARGB_8888,
      )
      bitmap.copyPixelsFromBuffer(buffer)

      val fullDebugFrame = bitmap.copy(Bitmap.Config.ARGB_8888, false)
      val scanBitmaps = buildScanRegions(bitmap)
      val debugFrame = scanBitmaps.firstOrNull()?.copy(Bitmap.Config.ARGB_8888, false)
      val debugFrameForSave = debugFrame?.copy(Bitmap.Config.ARGB_8888, false)
      bitmap.recycle()
      storeLatestFrames(fullDebugFrame, debugFrameForSave)

      val texts = mutableListOf<String>()
      processRegionSequentially(scanBitmaps, 0, texts, debugFrame)
    } catch (error: Throwable) {
      OfferOverlayRuntime.reportNativeError(
        OfferOverlayRuntime.currentSourceApp,
        "Falha ao processar frame: ${error.javaClass.simpleName} ${error.message.orEmpty()}".trim(),
      )
      processing = false
    } finally {
      image.close()
    }
  }

  private fun buildScanRegions(source: Bitmap): List<Bitmap> {
    val width = source.width
    val height = source.height
    val lowerTop = (height * 0.45f).toInt().coerceAtLeast(0)
    val lowerHeight = (height * 0.50f).toInt().coerceAtMost(height - lowerTop)
    val cardLeft = (width * 0.02f).toInt().coerceAtLeast(0)
    val cardTop = (height * 0.50f).toInt().coerceAtLeast(0)
    val cardWidth = (width * 0.96f).toInt().coerceAtMost(width - cardLeft)
    val cardHeight = (height * 0.42f).toInt().coerceAtMost(height - cardTop)
    val detailsLeft = (width * 0.06f).toInt().coerceAtLeast(0)
    val detailsTop = (height * 0.63f).toInt().coerceAtLeast(0)
    val detailsWidth = (width * 0.88f).toInt().coerceAtMost(width - detailsLeft)
    val detailsHeight = (height * 0.26f).toInt().coerceAtMost(height - detailsTop)

    val halfLower = Bitmap.createBitmap(
      source,
      0,
      lowerTop,
      width,
      lowerHeight.coerceAtLeast(height / 3),
    )

    val cardBand = Bitmap.createBitmap(
      source,
      cardLeft,
      cardTop,
      cardWidth,
      cardHeight,
    )

    val detailsCore = Bitmap.createBitmap(
      source,
      detailsLeft,
      detailsTop,
      detailsWidth,
      detailsHeight,
    )

    return listOf(
      enhanceForOcr(halfLower).also { halfLower.recycle() },
      enhanceForOcr(cardBand).also { cardBand.recycle() },
      enhanceForOcr(detailsCore).also { detailsCore.recycle() },
    )
  }

  private fun processRegionSequentially(
    regions: List<Bitmap>,
    index: Int,
    collectedTexts: MutableList<String>,
    debugFrame: Bitmap?,
  ) {
    if (index >= regions.size) {
      val combined = collectedTexts
        .asSequence()
        .map { it.trim() }
        .filter { it.isNotBlank() }
        .distinct()
        .joinToString("\n")
      if (combined.isNotBlank()) {
        Log.d(tag, "[KMONE_OCR] OCR text combined length=${combined.length}")
        OfferOverlayRuntime.processAccessibilityText(
          OfferOverlayRuntime.currentSourceApp,
          combined,
          "ocr",
        )
      } else {
        OfferOverlayRuntime.reportOcrEmpty(OfferOverlayRuntime.currentSourceApp)
      }
      debugFrame?.recycle()
      processing = false
      return
    }

    val region = regions[index]
    val inputImage = InputImage.fromBitmap(region, 0)
    recognizer
      .process(inputImage)
      .addOnSuccessListener { result ->
        val text = result.text?.trim().orEmpty()
        if (text.isNotBlank()) {
          Log.d(tag, "[KMONE_OCR] OCR region[$index] textLength=${text.length}")
          collectedTexts.add(text)
        }
      }
      .addOnFailureListener {
        OfferOverlayRuntime.reportNativeError(
          OfferOverlayRuntime.currentSourceApp,
          "Falha no OCR da imagem",
        )
      }
      .addOnCompleteListener {
        region.recycle()
        processRegionSequentially(regions, index + 1, collectedTexts, debugFrame)
      }
  }

  private fun runDiagnosticTick() {
    val now = System.currentTimeMillis()
    if (now - serviceStartedAt < 6000) {
      return
    }
    if (now - lastSavedDebugFrameAt < 10_000) {
      return
    }
    if (lastProcessedAt == 0L) {
      Log.w(tag, "[KMONE_OCR] service active but no frame processed yet")
      OfferOverlayRuntime.reportOcrFrameTick(
        OfferOverlayRuntime.currentSourceApp,
        "servico-ativo-sem-frame",
      )
      return
    }

    val fullFrame = latestFullFrame?.copy(Bitmap.Config.ARGB_8888, false)
    val croppedFrame = latestCroppedFrame?.copy(Bitmap.Config.ARGB_8888, false)
    if (fullFrame == null && croppedFrame == null) {
      Log.w(tag, "[KMONE_OCR] no frame available to save")
      OfferOverlayRuntime.reportOcrFrameTick(
        OfferOverlayRuntime.currentSourceApp,
        "sem-frame-salvavel",
      )
      return
    }

    lastSavedDebugFrameAt = now
    if (fullFrame != null) {
      saveDebugBitmap(fullFrame, "full", now)
      fullFrame.recycle()
    }
    if (croppedFrame != null) {
      saveDebugBitmap(croppedFrame, "crop", now)
      croppedFrame.recycle()
    }
  }

  private fun storeLatestFrames(fullFrame: Bitmap?, croppedFrame: Bitmap?) {
    latestFullFrame?.recycle()
    latestCroppedFrame?.recycle()
    latestFullFrame = fullFrame
    latestCroppedFrame = croppedFrame
  }

  private fun resetDiagnosticState() {
    lastSavedDebugFrameAt = 0L
    lastFrameTickAt = 0L
    lastProcessedAt = 0L
    latestFullFrame?.recycle()
    latestCroppedFrame?.recycle()
    latestFullFrame = null
    latestCroppedFrame = null
    clearDebugDirectory()
  }

  private fun clearDebugDirectory() {
    try {
      val baseDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES) ?: filesDir
      val debugDir = File(baseDir, "KMOneDebug")
      if (!debugDir.exists()) return
      Log.d(tag, "[KMONE_OCR] clearing debug directory ${debugDir.absolutePath}")
      debugDir.listFiles()?.forEach { file ->
        try {
          if (file.isFile) {
            file.delete()
          }
        } catch (_: Throwable) {
        }
      }
    } catch (_: Throwable) {
    }
  }

  private fun saveDebugBitmap(region: Bitmap, label: String, timestamp: Long) {
    try {
      val filename = "kmone_ocr_${label}_${timestamp}.jpg"
      val baseDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        ?: filesDir
      val debugDir = File(baseDir, "KMOneDebug").apply {
        if (!exists()) mkdirs()
      }
      if (!debugDir.exists()) {
        OfferOverlayRuntime.reportOcrFrameSaveError(
          OfferOverlayRuntime.currentSourceApp,
          "Diretorio KMOneDebug nao foi criado",
        )
        return
      }

      val outputFile = File(debugDir, filename)
      FileOutputStream(outputFile).use { output ->
        region.compress(Bitmap.CompressFormat.JPEG, 92, output)
      }
      Log.d(tag, "[KMONE_OCR] debug frame saved ${outputFile.absolutePath}")
      OfferOverlayRuntime.reportOcrFrameSaved(
        OfferOverlayRuntime.currentSourceApp,
        outputFile.absolutePath,
      )
    } catch (error: Throwable) {
      OfferOverlayRuntime.reportOcrFrameSaveError(
        OfferOverlayRuntime.currentSourceApp,
        "${error.javaClass.simpleName} ${error.message.orEmpty()}".trim(),
      )
    }
  }

  private fun enhanceForOcr(source: Bitmap): Bitmap {
    val scale = 1.8f
    val output = Bitmap.createBitmap(
      (source.width * scale).toInt().coerceAtLeast(1),
      (source.height * scale).toInt().coerceAtLeast(1),
      Bitmap.Config.ARGB_8888,
    )
    val canvas = Canvas(output)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val contrast = 1.12f
    val translate = (-0.5f * contrast + 0.5f) * 255f
    val matrix = ColorMatrix(
      floatArrayOf(
        contrast, 0f, 0f, 0f, translate,
        0f, contrast, 0f, 0f, translate,
        0f, 0f, contrast, 0f, translate,
        0f, 0f, 0f, 1f, 0f,
      ),
    )
    paint.colorFilter = ColorMatrixColorFilter(matrix)
    canvas.scale(scale, scale)
    canvas.drawBitmap(source, 0f, 0f, paint)
    return output
  }

  private fun teardown() {
    Log.d(tag, "[KMONE_OCR] teardown")
    try {
      imageReader?.setOnImageAvailableListener(null, null)
    } catch (_: Throwable) {
    }
    try {
      workerHandler?.removeCallbacks(diagnosticRunnable)
    } catch (_: Throwable) {
    }
    try {
      virtualDisplay?.release()
    } catch (_: Throwable) {
    }
    try {
      imageReader?.close()
    } catch (_: Throwable) {
    }
    try {
      mediaProjection?.stop()
    } catch (_: Throwable) {
    }
    try {
      mediaProjectionCallback?.let { callback ->
        mediaProjection?.unregisterCallback(callback)
      }
    } catch (_: Throwable) {
    }
    workerThread?.quitSafely()
    latestFullFrame?.recycle()
    latestCroppedFrame?.recycle()

    virtualDisplay = null
    imageReader = null
    mediaProjection = null
    mediaProjectionCallback = null
    workerHandler = null
    workerThread = null
    latestFullFrame = null
    latestCroppedFrame = null
    processing = false
    serviceStartedAt = 0L
    lastSavedDebugFrameAt = 0L
    lastFrameTickAt = 0L
    lastProcessedAt = 0L
  }

  private fun startForegroundInternal() {
    val channelId = "offer_capture_channel"
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        channelId,
        "Captura de ofertas",
        NotificationManager.IMPORTANCE_LOW,
      )
      manager.createNotificationChannel(channel)
    }

    val notification: Notification = NotificationCompat.Builder(this, channelId)
      .setContentTitle("KM One")
      .setContentText("Capturando ofertas na tela")
      .setSmallIcon(android.R.drawable.ic_menu_view)
      .setOngoing(true)
      .build()
    Log.d(tag, "[KMONE_OCR] startForeground notification")

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        1042,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION,
      )
    } else {
      startForeground(1042, notification)
    }
  }

  private inline fun <reified T> Intent.getParcelableExtraCompat(key: String): T? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      getParcelableExtra(key, T::class.java)
    } else {
      @Suppress("DEPRECATION")
      getParcelableExtra(key)
    }
  }

  companion object {
    private const val ACTION_START = "offer_capture_start"
    private const val ACTION_STOP = "offer_capture_stop"
    private const val EXTRA_RESULT_CODE = "result_code"
    private const val EXTRA_RESULT_DATA = "result_data"

    fun start(context: Context, resultCode: Int?, data: Intent?) {
      if (resultCode == null || data == null) return
      Log.d("KMONE_OCR", "[KMONE_OCR] OfferCaptureService.start called")

      val intent = Intent(context, OfferCaptureService::class.java).apply {
        action = ACTION_START
        putExtra(EXTRA_RESULT_CODE, resultCode)
        putExtra(EXTRA_RESULT_DATA, Intent(data))
      }
      ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context) {
      Log.d("KMONE_OCR", "[KMONE_OCR] OfferCaptureService.stop called")
      context.stopService(Intent(context, OfferCaptureService::class.java))
    }
  }
}
