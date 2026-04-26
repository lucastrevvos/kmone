import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useSettingsStore } from "@state/useSettingsStore";
import { useOfferRadarStore } from "@state/useOfferRadarStore";
import FieldCard from "src/components/FieldCard";
import MetricCard from "src/components/MetricCard";
import ScreenHero from "src/components/ScreenHero";
import SectionHeader from "src/components/SectionHeader";

const ACCENT = "#10B981";
const ACCENT_DARK = "#065F46";

export default function Configuracoes() {
  const { settings, load, save, loading } = useSettingsStore();
  const {
    supported,
    captureStatus,
    readiness,
    lastCapture,
    recentDebugReads,
    debugState,
    sync: syncOfferRadar,
    requestOverlayPermission,
    requestAccessibilityPermission,
    requestScreenCapturePermission,
  } = useOfferRadarStore();
  const [metaBruta, setMetaBruta] = useState(String(settings.metaDiariaBruta));
  const [metaRskm, setMetaRskm] = useState(String(settings.metaMinRSKm));
  const [radarValor, setRadarValor] = useState(String(settings.radarMinValor));
  const [radarRskm, setRadarRskm] = useState(String(settings.radarMinRSKm));
  const [radarRshora, setRadarRshora] = useState(
    String(settings.radarMinRSHora),
  );
  const allRadarReady =
    readiness.overlayPermissionGranted &&
    readiness.accessibilityPermissionGranted &&
    readiness.screenCapturePermissionGranted;

  useEffect(() => {
    console.log("[KMONE_OCR][JS] Configuracoes screen mounted");
    load();
    syncOfferRadar();
  }, []);

  useEffect(() => {
    console.log("[KMONE_OCR][JS] Configuracoes radar state", {
      supported,
      readiness,
      allRadarReady,
    });
  }, [supported, readiness, allRadarReady]);

  useEffect(() => {
    setMetaBruta(String(settings.metaDiariaBruta));
    setMetaRskm(String(settings.metaMinRSKm));
    setRadarValor(String(settings.radarMinValor));
    setRadarRskm(String(settings.radarMinRSKm));
    setRadarRshora(String(settings.radarMinRSHora));
  }, [settings]);

  async function onSalvar() {
    const mb = Number(metaBruta.replace(",", "."));
    const mr = Number(metaRskm.replace(",", "."));
    const rv = Number(radarValor.replace(",", "."));
    const rrk = Number(radarRskm.replace(",", "."));
    const rrh = Number(radarRshora.replace(",", "."));

    if (mb < 0 || mr <= 0 || rv <= 0 || rrk <= 0 || rrh <= 0) {
      Alert.alert("Valores invalidos", "Preencha criterios validos para o radar.");
      return;
    }

    await save({
      metaDiariaBruta: mb,
      metaMinRSKm: mr,
      radarMinValor: rv,
      radarMinRSKm: rrk,
      radarMinRSHora: rrh,
    });
  }

  async function handleCopyDebug() {
    const payload = {
      captureStatus,
      lastCapture,
      debugState,
      recentDebugReads,
      sessionId: debugState?.sessionId,
      latestFrameId: debugState?.latestFrameId,
      latestFrameCapturedAt: debugState?.latestFrameCapturedAt,
      latestFrameProcessedAt: debugState?.latestFrameProcessedAt,
      latestFrameClassifiedAt: debugState?.latestFrameClassifiedAt,
      latestFrameCaptureStatusAtFrame: debugState?.latestFrameCaptureStatusAtFrame,
      frameSourceApp: debugState?.latestFrameSourceApp,
      frameSourceAppBeforeOcr: debugState?.latestFrameSourceAppBeforeOcr,
      latestFrameFinalSourceApp: debugState?.latestFrameFinalSourceApp,
      ocrClassifiedSourceApp: debugState?.latestFrameOcrClassifiedSourceApp,
      latestFrameSourceReason: debugState?.latestFrameSourceReason,
      latestFrameSourceConfidence: debugState?.latestFrameSourceConfidence,
      latestFramePathFull: debugState?.latestFramePathFull,
      latestFramePathCrop: debugState?.latestFramePathCrop,
      totalFramesReceived: debugState?.totalFramesReceived,
      totalFramesProcessed: debugState?.totalFramesProcessed,
      totalFramesWithText: debugState?.totalFramesWithText,
      totalFramesEmpty: debugState?.totalFramesEmpty,
      totalFramesError: debugState?.totalFramesError,
      totalFramesWhileUberDetected: debugState?.totalFramesWhileUberDetected,
      totalFramesWhile99Detected: debugState?.totalFramesWhile99Detected,
      totalFramesClassifiedAsUber: debugState?.totalFramesClassifiedAsUber,
      totalFramesClassifiedAs99: debugState?.totalFramesClassifiedAs99,
      totalFramesClassifiedAsSetup: debugState?.totalFramesClassifiedAsSetup,
      totalFramesClassifiedAsUnknown: debugState?.totalFramesClassifiedAsUnknown,
      totalPollingFrames: debugState?.totalPollingFrames,
      totalCallbackFrames: debugState?.totalCallbackFrames,
      totalFalsePositiveSetupBlocked: debugState?.totalFalsePositiveSetupBlocked,
      ocrIntervalMs: debugState?.ocrIntervalMs,
      pollingIntervalMs: debugState?.pollingIntervalMs,
      ocrIntervalReason: debugState?.ocrIntervalReason,
      totalFramesSkippedByThrottle: debugState?.totalFramesSkippedByThrottle,
      lastSkippedFrameAt: debugState?.lastSkippedFrameAt,
      mediaProjectionActive: debugState?.mediaProjectionActive,
      mediaProjectionStoppedAt: debugState?.mediaProjectionStoppedAt,
      virtualDisplayActive: debugState?.virtualDisplayActive,
      virtualDisplayCreatedAt: debugState?.virtualDisplayCreatedAt,
      imageReaderActive: debugState?.imageReaderActive,
      imageReaderCreatedAt: debugState?.imageReaderCreatedAt,
      imageAvailableCallbackCount: debugState?.imageAvailableCallbackCount,
      lastImageAvailableAt: debugState?.lastImageAvailableAt,
      lastAcquireLatestImageResult: debugState?.lastAcquireLatestImageResult,
      lastAcquireLatestImageNullAt: debugState?.lastAcquireLatestImageNullAt,
      imageReaderSurfaceValid: debugState?.imageReaderSurfaceValid,
      imageReaderWidth: debugState?.imageReaderWidth,
      imageReaderHeight: debugState?.imageReaderHeight,
      imageReaderPixelFormat: debugState?.imageReaderPixelFormat,
      imageReaderMaxImages: debugState?.imageReaderMaxImages,
      openImageCount: debugState?.openImageCount,
      totalImagesClosed: debugState?.totalImagesClosed,
      lastPollImageAt: debugState?.lastPollImageAt,
      handlerThreadAlive: debugState?.handlerThreadAlive,
      handlerThreadName: debugState?.handlerThreadName,
      virtualDisplayWidth: debugState?.virtualDisplayWidth,
      virtualDisplayHeight: debugState?.virtualDisplayHeight,
      virtualDisplayDensityDpi: debugState?.virtualDisplayDensityDpi,
      virtualDisplayFlags: debugState?.virtualDisplayFlags,
      virtualDisplayFlagsName: debugState?.virtualDisplayFlagsName,
      virtualDisplayName: debugState?.virtualDisplayName,
      captureResolutionMode: debugState?.captureResolutionMode,
      captureAcquireMode: debugState?.captureAcquireMode,
      projectionStopReason: debugState?.projectionStopReason,
      lastNativeError: debugState?.lastNativeError,
      lastPipelineRestartReason: debugState?.lastPipelineRestartReason,
      lastPipelineRestartAt: debugState?.lastPipelineRestartAt,
      lastPipelineRestartFailedAt: debugState?.lastPipelineRestartFailedAt,
      pipelineRestartFailureCount: debugState?.pipelineRestartFailureCount,
      isRecreatingPipeline: debugState?.isRecreatingPipeline,
      isProjectionStopping: debugState?.isProjectionStopping,
      isCapturePipelineActive: debugState?.isCapturePipelineActive,
      needsScreenCapturePermissionRefresh:
        debugState?.needsScreenCapturePermissionRefresh,
      lastFrameReceivedAt: debugState?.lastFrameReceivedAt,
      lastFrameProcessedAtCounter: debugState?.lastFrameProcessedAtCounter,
      lastUberDetectedAtFromAccessibility: debugState?.lastUberDetectedAtFromAccessibility,
      last99DetectedAtFromAccessibility: debugState?.last99DetectedAtFromAccessibility,
      lastFrameWhileUberDetectedAt: debugState?.lastFrameWhileUberDetectedAt,
      lastFrameWhile99DetectedAt: debugState?.lastFrameWhile99DetectedAt,
      latestFrameWhileUberDetectedPathFull: debugState?.latestFrameWhileUberDetectedPathFull,
      latestFrameWhileUberDetectedPathCrop: debugState?.latestFrameWhileUberDetectedPathCrop,
      latestFrameWhile99DetectedPathFull: debugState?.latestFrameWhile99DetectedPathFull,
      latestFrameWhile99DetectedPathCrop: debugState?.latestFrameWhile99DetectedPathCrop,
    };

    try {
      await Share.share({
        message: JSON.stringify(payload, null, 2),
      });
    } catch (error) {
      console.error("[KMONE_OCR][JS] share debug error", error);
      Alert.alert("Debug OCR", JSON.stringify(payload, null, 2));
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="px-5 pb-10 pt-5"
      showsVerticalScrollIndicator={false}
    >
      <ScreenHero
        eyebrow="Parametros de operacao"
        title="Configuracoes"
        description="Defina metas realistas para acompanhar se o dia esta rendendo bem."
        badge="METAS"
        backgroundColor="#0F172A"
      />

      <View className="mt-6 flex-row flex-wrap justify-between">
        <MetricCard
          label="Meta diaria"
          value={`R$ ${Number(settings.metaDiariaBruta).toFixed(2)}`}
          note="Objetivo bruto"
        />
        <MetricCard
          label="Meta minima"
          value={`${Number(settings.metaMinRSKm).toFixed(2)} R$/km`}
          note="Filtro de qualidade"
        />
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader
          eyebrow="Ajuste das metas"
          title="Regras do seu dia"
          rightSlot={<Ionicons name="options-outline" size={20} color="#0F172A" />}
        />

        <FieldCard
          label="Meta diaria bruta (R$)"
          helperText="Quanto voce quer faturar no dia antes dos custos."
        >
          <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
            <Text className="mr-2 text-base text-slate-500">R$</Text>
            <TextInput
              keyboardType="numeric"
              value={metaBruta}
              onChangeText={setMetaBruta}
              placeholder="0,00"
              className="flex-1 text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>

        <FieldCard
          label="Meta minima R$/km"
          helperText="Use esse valor para identificar quando a corrida esta pagando pouco."
        >
          <View className="rounded-[22px] border border-slate-300 px-4 py-3">
            <TextInput
              keyboardType="numeric"
              value={metaRskm}
              onChangeText={setMetaRskm}
              placeholder="2,50"
              className="text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>

        <View className="mt-5">
          <Text className="mb-2 text-sm font-medium text-slate-600">
            Sugestoes rapidas
          </Text>
          <View className="flex-row gap-3">
            {["2,00", "2,50", "3,00"].map((preset) => {
              const active = metaRskm === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setMetaRskm(preset)}
                  className="rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: active ? "#E8FFF5" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: active ? ACCENT : "#CBD5E1",
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: active ? "#047857" : "#334155" }}
                  >
                    {preset} R$/km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={onSalvar}
          disabled={loading}
          className="mt-6 flex-row items-center justify-center rounded-2xl px-5 py-4"
          style={{ backgroundColor: loading ? ACCENT : ACCENT_DARK }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text className="ml-2 text-base font-semibold text-white">
            {loading ? "Salvando..." : "Salvar configuracoes"}
          </Text>
        </Pressable>
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader eyebrow="Radar de corrida" title="Criterios de aceitacao" />

        <FieldCard
          label="Valor minimo da corrida (R$)"
          helperText="Abaixo disso o radar tende a marcar como ruim."
        >
          <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
            <Text className="mr-2 text-base text-slate-500">R$</Text>
            <TextInput
              keyboardType="numeric"
              value={radarValor}
              onChangeText={setRadarValor}
              placeholder="10,00"
              className="flex-1 text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>

        <FieldCard
          label="Minimo R$/km"
          helperText="Compara o valor da oferta com a distancia estimada."
        >
          <View className="rounded-[22px] border border-slate-300 px-4 py-3">
            <TextInput
              keyboardType="numeric"
              value={radarRskm}
              onChangeText={setRadarRskm}
              placeholder="2,00"
              className="text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>

        <FieldCard
          label="Minimo R$/hora"
          helperText="Leva em conta valor e tempo estimado da corrida."
        >
          <View className="rounded-[22px] border border-slate-300 px-4 py-3">
            <TextInput
              keyboardType="numeric"
              value={radarRshora}
              onChangeText={setRadarRshora}
              placeholder="25,00"
              className="text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader eyebrow="Como usar" title="Leitura das metas" />
        <Text className="mt-3 text-sm text-slate-600">
          A meta diaria ajuda a medir o tamanho do faturamento. A meta minima
          por quilometro serve para identificar corridas ruins mesmo quando o
          bruto parece bom.
        </Text>
        <Text className="mt-3 text-sm text-slate-600">
          O radar combina valor minimo, R$/km e R$/hora para marcar a oferta
          como aceitar, talvez ou recusar.
        </Text>
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader eyebrow="Onboarding" title="Checklist do radar" />
        <Text className="mt-3 text-sm text-slate-600">
          Revise este bloco sempre que o radar parar de ler ofertas. A permissao
          de captura de tela e a que mais costuma se perder.
        </Text>

        <View className="mt-4 gap-3">
          <SetupCard
            title="Overlay sobre outros apps"
            description="Permite mostrar o popup por cima do Uber e 99."
            done={readiness.overlayPermissionGranted}
            actionLabel="Ativar overlay"
            onPress={requestOverlayPermission}
          />
          <SetupCard
            title="Acessibilidade"
            description="Ajuda o app a perceber estados da interface."
            done={readiness.accessibilityPermissionGranted}
            actionLabel="Ativar acessibilidade"
            onPress={requestAccessibilityPermission}
          />
          <SetupCard
            title="Captura de tela"
            description="Obrigatoria para o OCR. Se desligar, o radar para de capturar oferta."
            done={readiness.screenCapturePermissionGranted}
            actionLabel="Reativar captura"
            onPress={requestScreenCapturePermission}
            danger={!readiness.screenCapturePermissionGranted}
          />
        </View>
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader eyebrow="Fase 2 Android" title="Overlay flutuante" />
        <Text className="mt-3 text-sm text-slate-600">
          Esta etapa prepara a leitura automatica sobre Uber e 99 com overlay,
          acessibilidade e captura de tela no Android.
        </Text>

        {!allRadarReady && (
          <View
            className="mt-4 rounded-[22px] border border-red-200 bg-red-50 px-4 py-4"
          >
            <Text className="text-sm font-semibold text-red-700">
              Radar incompleto
            </Text>
            <Text className="mt-1 text-sm text-red-700">
              Enquanto alguma permissao estiver pendente, o popup pode falhar ou parar de atualizar.
            </Text>
          </View>
        )}

        <View className="mt-4 flex-row flex-wrap justify-between">
          <MetricCard
            label="Suporte"
            value={supported ? "Android" : "Indisponivel"}
            note="Bridge preparada"
          />
          <MetricCard
            label="Overlay"
            value={readiness.overlayPermissionGranted ? "OK" : "Pendente"}
            note="Sobre outros apps"
          />
          <MetricCard
            label="Acessibilidade"
            value={readiness.accessibilityPermissionGranted ? "OK" : "Pendente"}
            note="Leitura da UI"
          />
          <MetricCard
            label="Captura"
            value={readiness.screenCapturePermissionGranted ? "OK" : "Pendente"}
            note="OCR/MediaProjection"
          />
        </View>

        <View className="mt-4 gap-3">
          <Pressable
            onPress={requestOverlayPermission}
            className="rounded-2xl border border-slate-300 px-4 py-4"
          >
            <Text className="font-semibold text-slate-700">
              Solicitar permissao de overlay
            </Text>
          </Pressable>
          <Pressable
            onPress={requestAccessibilityPermission}
            className="rounded-2xl border border-slate-300 px-4 py-4"
          >
            <Text className="font-semibold text-slate-700">
              Solicitar permissao de acessibilidade
            </Text>
          </Pressable>
          <Pressable
            onPress={requestScreenCapturePermission}
            className="rounded-2xl border border-slate-300 px-4 py-4"
            style={{
              backgroundColor: readiness.screenCapturePermissionGranted
                ? "#FFFFFF"
                : "#FEF2F2",
              borderColor: readiness.screenCapturePermissionGranted
                ? "#CBD5E1"
                : "#FCA5A5",
            }}
          >
            <Text
              className="font-semibold"
              style={{
                color: readiness.screenCapturePermissionGranted
                  ? "#334155"
                  : "#B91C1C",
              }}
            >
              {readiness.screenCapturePermissionGranted
                ? "Revisar permissao de captura"
                : "Reativar permissao de captura"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader eyebrow="Debug" title="OCR Runtime" />
        <Text className="mt-3 text-sm text-slate-600">
          Painel temporario para inspecionar OCR, parser e frame salvo sem depender do Logcat.
        </Text>

        <View className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
            Status atual
          </Text>
          <Text className="mt-2 text-sm text-slate-700">captureStatus: {captureStatus}</Text>
          <Text className="mt-1 text-sm text-slate-700">
            sessionId: {debugState?.sessionId ?? "sem sessao"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            sourceApp: {debugState?.currentSourceApp ?? "unknown"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastSourceApp: {debugState?.lastSourceApp ?? "unknown"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            parser: {debugState?.lastParserReason ?? "sem diagnostico"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            frame: {debugState?.lastSavedFramePath ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            erro: {debugState?.lastOcrError ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastNativeError: {debugState?.lastNativeError ?? "nenhum"}
          </Text>
        </View>

        <View className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
            Ultimo frame processado
          </Text>
          <Text className="mt-2 text-sm text-slate-700">
            totalFramesReceived: {debugState?.totalFramesReceived ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            ocrIntervalMs: {debugState?.ocrIntervalMs ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            pollingIntervalMs: {debugState?.pollingIntervalMs ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            ocrIntervalReason: {debugState?.ocrIntervalReason ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalPollingFrames/totalCallbackFrames: {debugState?.totalPollingFrames ?? 0} / {debugState?.totalCallbackFrames ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesProcessed: {debugState?.totalFramesProcessed ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesSkippedByThrottle: {debugState?.totalFramesSkippedByThrottle ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            mediaProjectionActive: {String(debugState?.mediaProjectionActive ?? false)}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            virtualDisplayActive: {String(debugState?.virtualDisplayActive ?? false)}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            imageReaderActive: {String(debugState?.imageReaderActive ?? false)}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            imageReaderSurfaceValid: {String(debugState?.imageReaderSurfaceValid ?? false)}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            handlerThreadAlive: {String(debugState?.handlerThreadAlive ?? false)}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            handlerThreadName: {debugState?.handlerThreadName ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            imageAvailableCallbackCount: {debugState?.imageAvailableCallbackCount ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            openImageCount/totalImagesClosed: {debugState?.openImageCount ?? 0} / {debugState?.totalImagesClosed ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesWithText: {debugState?.totalFramesWithText ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesEmpty: {debugState?.totalFramesEmpty ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesError: {debugState?.totalFramesError ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesWhileUberDetected: {debugState?.totalFramesWhileUberDetected ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesWhile99Detected: {debugState?.totalFramesWhile99Detected ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesClassifiedAsUber: {debugState?.totalFramesClassifiedAsUber ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesClassifiedAs99: {debugState?.totalFramesClassifiedAs99 ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesClassifiedAsSetup: {debugState?.totalFramesClassifiedAsSetup ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFramesClassifiedAsUnknown: {debugState?.totalFramesClassifiedAsUnknown ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            totalFalsePositiveSetupBlocked: {debugState?.totalFalsePositiveSetupBlocked ?? 0}
          </Text>
          <Text className="mt-2 text-sm text-slate-700">
            frameId: {debugState?.latestFrameId ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            capturedAt: {debugState?.latestFrameCapturedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            processedAt: {debugState?.latestFrameProcessedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            classifiedAt: {debugState?.latestFrameClassifiedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastFrameReceivedAt: {debugState?.lastFrameReceivedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastFrameProcessedAtCounter: {debugState?.lastFrameProcessedAtCounter ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastSkippedFrameAt: {debugState?.lastSkippedFrameAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            mediaProjectionStoppedAt: {debugState?.mediaProjectionStoppedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            virtualDisplayCreatedAt: {debugState?.virtualDisplayCreatedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            imageReaderCreatedAt: {debugState?.imageReaderCreatedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            imageReaderWidth/Height: {debugState?.imageReaderWidth ?? 0}x{debugState?.imageReaderHeight ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            imageReaderFormat/MaxImages: {debugState?.imageReaderPixelFormat ?? 0} / {debugState?.imageReaderMaxImages ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            captureResolutionMode/captureAcquireMode: {debugState?.captureResolutionMode ?? "nenhum"} / {debugState?.captureAcquireMode ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            virtualDisplayName: {debugState?.virtualDisplayName ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            virtualDisplayWidth/Height: {debugState?.virtualDisplayWidth ?? 0}x{debugState?.virtualDisplayHeight ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            virtualDisplayDensity/Flags: {debugState?.virtualDisplayDensityDpi ?? 0} / {debugState?.virtualDisplayFlags ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            virtualDisplayFlagsName: {debugState?.virtualDisplayFlagsName ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastImageAvailableAt: {debugState?.lastImageAvailableAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastPollImageAt: {debugState?.lastPollImageAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastAcquireLatestImageResult: {debugState?.lastAcquireLatestImageResult ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastAcquireLatestImageNullAt: {debugState?.lastAcquireLatestImageNullAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            projectionStopReason: {debugState?.projectionStopReason ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastPipelineRestartReason: {debugState?.lastPipelineRestartReason ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastPipelineRestartAt: {debugState?.lastPipelineRestartAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            lastPipelineRestartFailedAt: {debugState?.lastPipelineRestartFailedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            pipelineRestartFailureCount: {debugState?.pipelineRestartFailureCount ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            isRecreatingPipeline: {String(debugState?.isRecreatingPipeline ?? false)}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            isProjectionStopping: {String(debugState?.isProjectionStopping ?? false)}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            isCapturePipelineActive: {String(debugState?.isCapturePipelineActive ?? false)}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            needsScreenCapturePermissionRefresh: {String(debugState?.needsScreenCapturePermissionRefresh ?? false)}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            frameSourceApp: {debugState?.latestFrameSourceApp ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            frameSourceAppBeforeOcr: {debugState?.latestFrameSourceAppBeforeOcr ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            ocrClassifiedSourceApp: {debugState?.latestFrameOcrClassifiedSourceApp ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            latestFrameFinalSourceApp: {debugState?.latestFrameFinalSourceApp ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            latestFrameSourceReason: {debugState?.latestFrameSourceReason ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            latestFrameSourceConfidence: {debugState?.latestFrameSourceConfidence ?? 0}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            captureStatusAtFrame: {debugState?.latestFrameCaptureStatusAtFrame ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            latestFramePathFull: {debugState?.latestFramePathFull ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            latestFramePathCrop: {debugState?.latestFramePathCrop ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            latestFrameParserReason: {debugState?.latestFrameParserReason ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            latestFrameOcrText: {debugState?.latestFrameOcrText ?? "nenhum"}
          </Text>
        </View>

        <View className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-emerald-700">
            Ultimo frame Uber/99
          </Text>
          <Text className="mt-2 text-sm text-emerald-900">
            lastUberDetectedAtFromAccessibility: {debugState?.lastUberDetectedAtFromAccessibility ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            lastFrameWhileUberDetectedAt: {debugState?.lastFrameWhileUberDetectedAt ?? "nenhum"}
          </Text>
          <Text className="mt-2 text-sm text-emerald-900">
            frameId: {debugState?.latestUberFrameId ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            capturedAt: {debugState?.latestUberFrameCapturedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            processedAt: {debugState?.latestUberFrameProcessedAt ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            frameSourceApp: {debugState?.latestUberFrameSourceApp ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            latestFramePathFull: {debugState?.latestUberFramePathFull ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            latestFramePathCrop: {debugState?.latestUberFramePathCrop ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            latestFrameParserReason: {debugState?.latestUberFrameParserReason ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            latestFrameOcrText: {debugState?.latestUberFrameOcrText ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            latestFrameWhileUberDetectedPathFull: {debugState?.latestFrameWhileUberDetectedPathFull ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            latestFrameWhileUberDetectedPathCrop: {debugState?.latestFrameWhileUberDetectedPathCrop ?? "nenhum"}
          </Text>
        </View>

        <View className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
            Ultima leitura geral
          </Text>
          <Text className="mt-2 text-sm text-slate-700">
            parser: {debugState?.lastAnyParserReason ?? "sem diagnostico"}
          </Text>
          <Text className="mt-1 text-sm text-slate-700">
            frame: {debugState?.lastAnySavedFramePath ?? "nenhum"}
          </Text>
          <Text className="mt-2 text-sm text-slate-700">
            {debugState?.lastAnyOcrRawText ?? "sem texto bruto"}
          </Text>
        </View>

        <View className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-emerald-700">
            Ultima leitura Uber/99
          </Text>
          <Text className="mt-2 text-sm text-emerald-900">
            parser: {debugState?.lastUberParserReason ?? "sem diagnostico Uber/99"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            frame: {debugState?.lastUberSavedFramePath ?? "nenhum"}
          </Text>
          <Text className="mt-1 text-sm text-emerald-900">
            capturada em: {debugState?.lastUberCapturedAt ?? "sem horario"}
          </Text>
          <Text className="mt-2 text-sm text-emerald-900">
            {debugState?.lastUberOcrRawText ?? "sem texto bruto Uber/99"}
          </Text>
        </View>

        <View className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
            Ultima captura estruturada geral
          </Text>
          <Text className="mt-2 text-sm text-slate-700">
            {lastCapture ? JSON.stringify(lastCapture, null, 2) : "sem captura estruturada"}
          </Text>
        </View>

        <View className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-emerald-700">
            Ultima captura estruturada Uber/99
          </Text>
          <Text className="mt-2 text-sm text-emerald-900">
            {debugState?.lastUberCapture
              ? JSON.stringify(debugState.lastUberCapture, null, 2)
              : "sem captura estruturada Uber/99"}
          </Text>
        </View>

        <View className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
            Leitura bruta completa
          </Text>
          {recentDebugReads.length === 0 ? (
            <Text className="mt-2 text-sm text-slate-700">sem eventos ainda</Text>
          ) : (
            recentDebugReads.map((item, index) => (
              <Text key={`${item.capturedAt}-${index}`} className="mt-2 text-sm text-slate-700">
                [{item.channel ?? "?"}] {item.rawText}
              </Text>
            ))
          )}
        </View>

        <Pressable
          onPress={handleCopyDebug}
          className="mt-4 items-center justify-center rounded-2xl px-4 py-4"
          style={{ backgroundColor: "#0F172A" }}
        >
          <Text className="font-semibold text-white">Copiar Debug OCR</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SetupCard({
  title,
  description,
  done,
  actionLabel,
  onPress,
  danger = false,
}: {
  title: string;
  description: string;
  done: boolean;
  actionLabel: string;
  onPress: () => void | Promise<unknown>;
  danger?: boolean;
}) {
  return (
    <View
      className="rounded-[22px] border px-4 py-4"
      style={{
        backgroundColor: done ? "#F0FDF4" : danger ? "#FEF2F2" : "#F8FAFC",
        borderColor: done ? "#BBF7D0" : danger ? "#FECACA" : "#E2E8F0",
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-slate-900">{title}</Text>
          <Text className="mt-1 text-sm text-slate-500">{description}</Text>
        </View>

        <View
          className="rounded-full px-3 py-2"
          style={{ backgroundColor: done ? "#166534" : danger ? "#B91C1C" : "#334155" }}
        >
          <Text className="text-xs font-semibold text-white">
            {done ? "OK" : "PENDENTE"}
          </Text>
        </View>
      </View>

      {!done && (
        <Pressable
          onPress={onPress}
          className="mt-4 items-center justify-center rounded-2xl px-4 py-3"
          style={{ backgroundColor: danger ? "#B91C1C" : "#0F172A" }}
        >
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
