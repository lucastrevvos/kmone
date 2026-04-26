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
  private var forceProcessUntilEpochMs: Long = 0L
  private var lastProjectionStartResultCode: Int? = null
  private var projectionDataIntent: Intent? = null
  private var projectionStopRequestedByApp = false
  private var isRecreatingPipeline = false
  private var lastImageAvailableEpochMs = 0L
  private var captureWidth = 0
  private var captureHeight = 0
  private var captureDensityDpi = 0
  private val pollRunnable = object : Runnable {
    override fun run() {
      pollForImage()
      workerHandler?.postDelayed(this, OfferOverlayRuntime.getCurrentOcrIntervalMs())
    }
  }
  private val diagnosticRunnable = object : Runnable {
    override fun run() {
      runDiagnosticTick()
      workerHandler?.postDelayed(this, 5000)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    latestInstance = this
    try {
      Log.d(tag, "[KMONE_OCR] OfferCaptureService onStartCommand action=${intent?.action}")
      when (intent?.action) {
        ACTION_STOP -> {
          Log.d(tag, "[KMONE_OCR] OfferCaptureService stop requested")
          projectionStopRequestedByApp = true
          OfferOverlayRuntime.setPipelineLifecycleFlags(projectionStopping = true)
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
          lastProjectionStartResultCode = resultCode
          projectionDataIntent = Intent(data)
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
    latestInstance = null
    teardown()
    recognizer.close()
  }

  private fun startProjection(resultCode: Int, data: Intent) {
    try {
      Log.d(tag, "[KMONE_OCR] startProjection resultCode=$resultCode")
      projectionStopRequestedByApp = false
      OfferOverlayRuntime.setPipelineLifecycleFlags(
        recreating = false,
        projectionStopping = false,
      )
      val projection = mediaProjection ?: run {
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
        manager.getMediaProjection(resultCode, data) ?: run {
          OfferOverlayRuntime.reportNativeError(
            OfferOverlayRuntime.currentSourceApp,
            "Nao foi possivel criar MediaProjection",
          )
          stopSelf()
          return
        }
      }
      val metrics = DisplayMetrics()
      val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
      @Suppress("DEPRECATION")
      wm.defaultDisplay.getRealMetrics(metrics)
  
      if (workerThread == null || workerHandler == null) {
        workerThread = HandlerThread("OfferCaptureWorker").also { it.start() }
        workerHandler = Handler(workerThread!!.looper)
        Log.d(tag, "[KMONE_OCR] worker thread started")
      }
      OfferOverlayRuntime.updateHandlerThreadState(
        workerThread?.isAlive == true,
        workerThread?.name,
      )
      workerHandler?.removeCallbacks(diagnosticRunnable)
      workerHandler?.postDelayed(diagnosticRunnable, 5000)
      workerHandler?.removeCallbacks(pollRunnable)
      workerHandler?.postDelayed(pollRunnable, 1000)
  
      if (mediaProjection == null) {
        val callback = object : MediaProjection.Callback() {
          override fun onStop() {
            if (projectionStopRequestedByApp) {
              Log.i(tag, "[KMONE_OCR] MediaProjection onStop after app-requested stop")
              OfferOverlayRuntime.updateProjectionState(
                false,
                "MediaProjection onStop after app-requested stop",
              )
              return
            }
            Log.e(tag, "[KMONE_OCR] MediaProjection onStop from system")
            OfferOverlayRuntime.updateProjectionState(false, "MediaProjection callback onStop")
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
        OfferOverlayRuntime.updateProjectionState(true)
        Log.d(tag, "[KMONE_OCR] MediaProjection callback registered")
      }

      ensureCapturePipeline(projection, metrics)
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
    tryAcquireAndProcessImage("callback")
  }

  private fun pollForImage() {
    tryAcquireAndProcessImage("polling")
  }

  private fun tryAcquireAndProcessImage(acquireSource: String) {
    if (!OfferOverlayRuntime.overlayActive) return
    if (processing) return

    val now = System.currentTimeMillis()
    if (acquireSource == "callback") {
      OfferOverlayRuntime.reportImageAvailableCallback()
      lastImageAvailableEpochMs = now
    } else {
      OfferOverlayRuntime.reportPollImageResult("tick")
    }
    if (now - lastFrameTickAt > 4000) {
      lastFrameTickAt = now
      OfferOverlayRuntime.reportOcrFrameTick(
        OfferOverlayRuntime.currentSourceApp,
        "frame-recebido | source=$acquireSource | thread=${Thread.currentThread().name}",
      )
    }
    val intervalMs = OfferOverlayRuntime.getCurrentOcrIntervalMs()
    val forceProcess = now <= forceProcessUntilEpochMs
    if (!forceProcess && now - lastProcessedAt < intervalMs) {
      OfferOverlayRuntime.reportFrameSkippedByThrottle(OfferOverlayRuntime.currentSourceApp)
      return
    }

    val reader = imageReader ?: return
    var image = reader.acquireLatestImage()
    if (image == null) {
      OfferOverlayRuntime.reportAcquireLatestImage("latest-null:$acquireSource")
      image = reader.acquireNextImage()
    }
    if (image == null) {
      OfferOverlayRuntime.reportAcquireLatestImage("next-null:$acquireSource")
      if (acquireSource == "polling") {
        OfferOverlayRuntime.reportPollImageResult("null")
      }
      return
    }
    OfferOverlayRuntime.reportAcquireLatestImage("image-ok:$acquireSource")
    OfferOverlayRuntime.reportImageAcquired(acquireSource, image.width, image.height)
    if (acquireSource == "polling") {
      OfferOverlayRuntime.reportPollImageResult("ok")
    }
    lastImageAvailableEpochMs = now
    Log.d(tag, "[KMONE_OCR] handleImageAvailable source=$acquireSource image=${image.width}x${image.height}")
    processing = true
    lastProcessedAt = now

    try {
      val plane = image.planes.firstOrNull()
      if (plane == null) return

      val width = image.width
      val height = image.height
      val frameCapturedAt = System.currentTimeMillis()
      val frameId = "frame-$frameCapturedAt"
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
      OfferOverlayRuntime.reportFrameAttempt(
        OfferOverlayRuntime.currentSourceApp,
        frameId,
        frameCapturedAt,
        width,
        height,
        acquireSource,
      )
      storeLatestFrames(fullDebugFrame, debugFrameForSave)

      val texts = mutableListOf<String>()
      processRegionSequentially(scanBitmaps, 0, texts, debugFrame, frameId)
    } catch (error: Throwable) {
      OfferOverlayRuntime.reportNativeError(
        OfferOverlayRuntime.currentSourceApp,
        "Falha ao processar frame: ${error.javaClass.simpleName} ${error.message.orEmpty()}".trim(),
      )
      processing = false
    } finally {
      try {
        image.close()
        OfferOverlayRuntime.reportImageClosed(acquireSource)
      } catch (error: Throwable) {
        OfferOverlayRuntime.reportImageCloseFailed(
          acquireSource,
          "${error.javaClass.simpleName} ${error.message.orEmpty()}".trim(),
        )
      }
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
    frameId: String,
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
          frameId,
        )
      } else {
        OfferOverlayRuntime.reportOcrEmpty(OfferOverlayRuntime.currentSourceApp)
      }
      debugFrame?.recycle()
      processing = false
      return
    }

    val region = regions[index]
    Log.d(tag, "[KMONE_OCR] sending region[$index] to ML Kit ${region.width}x${region.height}")
    val inputImage = InputImage.fromBitmap(region, 0)
    recognizer
      .process(inputImage)
      .addOnSuccessListener { result ->
        val text = result.text?.trim().orEmpty()
        Log.d(tag, "[KMONE_OCR] ML Kit success region[$index] textLength=${text.length}")
        if (text.isNotBlank()) {
          Log.d(tag, "[KMONE_OCR] OCR region[$index] textLength=${text.length}")
          collectedTexts.add(text)
        }
      }
      .addOnFailureListener { error ->
        Log.e(tag, "[KMONE_OCR] ML Kit failure region[$index] ${error.message.orEmpty()}")
        OfferOverlayRuntime.reportNativeError(
          OfferOverlayRuntime.currentSourceApp,
          "Falha no OCR da imagem: ${error.message.orEmpty()}".trim(),
        )
      }
      .addOnCompleteListener {
        region.recycle()
        processRegionSequentially(regions, index + 1, collectedTexts, debugFrame, frameId)
      }
  }

  private fun runDiagnosticTick() {
    val now = System.currentTimeMillis()
    val secondsSinceLastFrame =
      if (lastProcessedAt == 0L) Double.POSITIVE_INFINITY
      else (now - lastProcessedAt).toDouble() / 1000.0
    val secondsSinceLastImageAvailable =
      if (lastImageAvailableEpochMs == 0L) Double.POSITIVE_INFINITY
      else (now - lastImageAvailableEpochMs).toDouble() / 1000.0
    OfferOverlayRuntime.updateHandlerThreadState(
      workerThread?.isAlive == true,
      workerThread?.name,
    )
    OfferOverlayRuntime.reportServiceAliveTick(
      if (secondsSinceLastFrame.isFinite()) secondsSinceLastFrame else 9999.0,
    )
    OfferOverlayRuntime.reportImageReaderHealth(
      if (secondsSinceLastImageAvailable.isFinite()) secondsSinceLastImageAvailable else 9999.0,
    )
    OfferOverlayRuntime.reportVirtualDisplayHealth(
      imageReader?.surface?.isValid == true,
    )
    if (now - serviceStartedAt < 6000) {
      return
    }
    if (now - lastSavedDebugFrameAt < 10_000) {
      maybeRestartPipelineIfStalled(secondsSinceLastFrame)
      return
    }
    if (lastProcessedAt == 0L) {
      Log.w(tag, "[KMONE_OCR] service active but no frame processed yet")
      OfferOverlayRuntime.reportOcrFrameTick(
        OfferOverlayRuntime.currentSourceApp,
        "servico-ativo-sem-frame",
      )
      if (OfferOverlayRuntime.currentSourceApp == "uber") {
        OfferOverlayRuntime.reportNoFramesWhileUberForeground()
      }
      maybeRestartPipelineIfStalled(secondsSinceLastFrame)
      return
    }

    val debugState = OfferOverlayRuntime.getDebugState()
    val activeFrameId = debugState.latestFrameId
    if (activeFrameId != null && activeFrameId == debugState.latestUberFrameId && debugState.latestUberFramePathCrop != null) {
      return
    }
    if (activeFrameId != null && activeFrameId == debugState.latestFrameId && activeFrameId == lastSavedFrameId()) {
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
    val frameId = latestFrameId()
    if (fullFrame != null) {
      saveDebugBitmap(fullFrame, "full", now, frameId)
      fullFrame.recycle()
    }
      if (croppedFrame != null) {
        saveDebugBitmap(croppedFrame, "crop", now, frameId)
        croppedFrame.recycle()
      }
      maybeRestartPipelineIfStalled(secondsSinceLastFrame)
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
    lastImageAvailableEpochMs = 0L
    captureWidth = 0
    captureHeight = 0
    captureDensityDpi = 0
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

  private fun saveDebugBitmap(region: Bitmap, label: String, timestamp: Long, frameId: String) {
    try {
      val filename = "kmone_ocr_${label}_${frameId}_${timestamp}.jpg"
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
        frameId,
        label,
        outputFile.absolutePath,
        region.width,
        region.height,
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
    Log.d(tag, "[KMONE_OCR] CAPTURE_PIPELINE_RELEASE_CALLED")
    Log.d(tag, "[KMONE_OCR] teardown")
    projectionStopRequestedByApp = true
    OfferOverlayRuntime.setPipelineLifecycleFlags(
      recreating = false,
      projectionStopping = true,
    )
    try {
      imageReader?.setOnImageAvailableListener(null, null)
    } catch (_: Throwable) {
    }
    try {
      workerHandler?.removeCallbacks(diagnosticRunnable)
      workerHandler?.removeCallbacks(pollRunnable)
    } catch (_: Throwable) {
    }
    try {
      virtualDisplay?.release()
      Log.d(tag, "[KMONE_OCR] VIRTUAL_DISPLAY_RELEASED")
    } catch (_: Throwable) {
    }
    OfferOverlayRuntime.updateVirtualDisplayState(false)
    try {
      imageReader?.close()
      Log.d(tag, "[KMONE_OCR] IMAGE_READER_CLOSED")
    } catch (_: Throwable) {
    }
    OfferOverlayRuntime.updateImageReaderState(false)
    try {
      mediaProjectionCallback?.let { callback ->
        mediaProjection?.unregisterCallback(callback)
      }
      try {
        mediaProjection?.stop()
      } catch (_: Throwable) {
      }
    } catch (_: Throwable) {
    }
    OfferOverlayRuntime.updateProjectionState(false, "teardown")
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
    forceProcessUntilEpochMs = 0L
    lastProjectionStartResultCode = null
    projectionDataIntent = null
    projectionStopRequestedByApp = false
    isRecreatingPipeline = false
    OfferOverlayRuntime.setPipelineLifecycleFlags(
      recreating = false,
      projectionStopping = false,
    )
  }

  private fun requestImmediateProcessing(windowMs: Long = 2500L) {
    forceProcessUntilEpochMs = System.currentTimeMillis() + windowMs
    lastProcessedAt = 0L
  }

  private fun ensureCapturePipeline(
    projection: MediaProjection,
    metrics: DisplayMetrics,
  ) {
    val targetWidth = 720
    val resolutionMode = "scaled"
    val targetHeight = ((metrics.heightPixels.toFloat() / metrics.widthPixels.toFloat()) * targetWidth)
      .toInt()
      .coerceAtLeast(1)
    captureWidth = targetWidth
    captureHeight = targetHeight
    captureDensityDpi = metrics.densityDpi
    val pixelFormat = PixelFormat.RGBA_8888
    val maxImages = 5
    val virtualDisplayName = "OfferCaptureDisplay"
    val virtualDisplayFlags = DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR
    val virtualDisplayFlagsName = "auto_mirror"
    OfferOverlayRuntime.updateCaptureModes(
      resolutionMode = resolutionMode,
      acquireMode = "polling",
    )
    if (imageReader == null) {
      val reader = ImageReader.newInstance(
        captureWidth,
        captureHeight,
        pixelFormat,
        maxImages,
      )
      imageReader = reader
      OfferOverlayRuntime.updateImageReaderState(true)
      OfferOverlayRuntime.updateImageReaderConfig(
        width = captureWidth,
        height = captureHeight,
        pixelFormat = pixelFormat,
        maxImages = maxImages,
        surfaceValid = reader.surface?.isValid == true,
      )
      Log.d(
        tag,
        "[KMONE_OCR] IMAGE_READER_CREATED width=$captureWidth height=$captureHeight format=$pixelFormat maxImages=$maxImages surfaceValid=${reader.surface?.isValid == true}",
      )
      reader.setOnImageAvailableListener({ handleImageAvailable() }, workerHandler)
    }

    if (virtualDisplay == null) {
      virtualDisplay = projection.createVirtualDisplay(
        virtualDisplayName,
        captureWidth,
        captureHeight,
        captureDensityDpi,
        virtualDisplayFlags,
        imageReader!!.surface,
        null,
        workerHandler,
      )
      OfferOverlayRuntime.updateVirtualDisplayState(true)
      OfferOverlayRuntime.updateVirtualDisplayConfig(
        width = captureWidth,
        height = captureHeight,
        densityDpi = captureDensityDpi,
        flags = virtualDisplayFlags,
        flagsName = virtualDisplayFlagsName,
        name = virtualDisplayName,
      )
      Log.d(
        tag,
        "[KMONE_OCR] VIRTUAL_DISPLAY_CREATED name=$virtualDisplayName width=$captureWidth height=$captureHeight densityDpi=$captureDensityDpi flags=$virtualDisplayFlags",
      )
    }
  }

  private fun maybeRestartPipelineIfStalled(secondsSinceLastFrame: Double) {
    if (OfferOverlayRuntime.currentSourceApp != "uber" && OfferOverlayRuntime.currentSourceApp != "99") return
    if (secondsSinceLastFrame <= 2.0) return
    if (isRecreatingPipeline) return
    if (projectionStopRequestedByApp) return
    if (mediaProjection == null || workerHandler == null) return
    if (virtualDisplayActive() && imageReaderActive()) {
      OfferOverlayRuntime.reportNoFramesButPipelineActive(secondsSinceLastFrame)
      OfferOverlayRuntime.reportPipelineRestarted(
        "PIPELINE_RESTART_SKIPPED_ALREADY_ACTIVE | source=${OfferOverlayRuntime.currentSourceApp} | callbackCount=${OfferOverlayRuntime.getDebugState().imageAvailableCallbackCount} | secondsSinceLastFrame=${"%.1f".format(secondsSinceLastFrame)}",
      )
      return
    }
    OfferOverlayRuntime.reportNoFramesButPipelineActive(secondsSinceLastFrame)
  }

  private fun virtualDisplayActive(): Boolean = virtualDisplay != null

  private fun imageReaderActive(): Boolean = imageReader != null

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

  private fun latestFrameId(): String {
    return OfferOverlayRuntime.getDebugState().latestFrameId ?: "frame-${System.currentTimeMillis()}"
  }

  private fun lastSavedFrameId(): String? {
    val path = OfferOverlayRuntime.getDebugState().latestFramePathCrop
      ?: OfferOverlayRuntime.getDebugState().latestFramePathFull
      ?: return null
    val match = Regex("""kmone_ocr_(?:full|crop)_(frame-\d+)_\d+\.jpg$""").find(path)
    return match?.groupValues?.getOrNull(1)
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

    @Volatile
    private var latestInstance: OfferCaptureService? = null

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

    fun boostForRideAppDetection() {
      latestInstance?.requestImmediateProcessing()
    }
  }
}
