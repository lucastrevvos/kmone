import { useRideStore } from "@state/useRideStore";
import { useSettingsStore } from "@state/useSettingsStore";
import { useOfferRadarStore } from "@state/useOfferRadarStore";
import { useTrackingStore } from "@state/useTrackingStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TrackingStartError } from "@core/infra/expoGps";
import { evaluateOffer } from "@features/offerRadar/evaluateOffer";
import { offerOverlayBridge } from "@features/offerRadar/overlayBridge";
import { money } from "@utils/format";
import { evaluateRideRadar } from "@utils/rideRadar";
import { formatMoneyInputValue, parseSpokenMoney } from "@utils/speechMoney";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

import type { FreeTrackingLabel, Ride } from "@core/domain/types";
import type { OfferDecision } from "@features/offerRadar/types";
import EmptyState from "src/components/EmptyState";
import FieldCard from "src/components/FieldCard";
import MetricCard from "src/components/MetricCard";
import RideItem from "src/components/RideItem";
import RideEditModal from "src/components/RideEditModal";
import SectionHeader from "src/components/SectionHeader";
import UndoBanner from "src/components/UndoBanner";

const ACCENT = "#10B981";
const ACCENT_DARK = "#065F46";
const SURFACE = "#F8FAFC";
const SHOW_HOME_RADAR_DEBUG = false;
type VoiceTarget = "manualBruto";
type RadarSource = "Uber" | "99" | "Outros";
type RadarSnapshot = {
  id: string;
  source: RadarSource;
  valor: number;
  km: number;
  minutos: number;
  status: "aceitar" | "talvez" | "recusar";
};

export default function Home() {
  const navigation = useNavigation<any>();
  const {
    rides,
    loadToday: loadRides,
    addRide,
    removeRide,
    undoLastDelete,
  } = useRideStore();
  const { settings, load: loadSettings } = useSettingsStore();
  const {
    supported: overlaySupported,
    active: overlayActive,
    loading: overlayLoading,
    readiness: overlayReadiness,
    lastValidUberCapture,
    latestUberOfferState,
    recentDebugReads,
    sync: syncOfferOverlay,
    requestOverlayPermission,
    requestAccessibilityPermission,
    requestScreenCapturePermission,
    start: startOfferOverlay,
    setLastDecision,
  } = useOfferRadarStore();
  const {
    running,
    distanceMeters,
    draft,
    startFreeTracking,
    stop,
    restoreTrackingSession,
  } = useTrackingStore();
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [editing, setEditing] = useState<Ride | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoTimer, setUndoTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const [manualVisible, setManualVisible] = useState(false);
  const [manualBruto, setManualBruto] = useState("");
  const [manualKm, setManualKm] = useState("");
  const [manualApp, setManualApp] = useState<"Uber" | "99" | "Outros">("Uber");

  const [radarVisible, setRadarVisible] = useState(false);
  const [radarValor, setRadarValor] = useState("");
  const [radarKm, setRadarKm] = useState("");
  const [radarMinutos, setRadarMinutos] = useState("");
  const [radarSource, setRadarSource] = useState<RadarSource>("Uber");
  const [radarHistory, setRadarHistory] = useState<RadarSnapshot[]>([]);

  const [trackingRecovered, setTrackingRecovered] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [voiceTarget, setVoiceTarget] = useState<VoiceTarget | null>(null);
  const [freeTrackingLabel, setFreeTrackingLabel] =
    useState<FreeTrackingLabel>("Ocioso");
  const [freeTrackingValue, setFreeTrackingValue] = useState("");
  const [savedOfferIds, setSavedOfferIds] = useState<string[]>([]);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const voiceTargetRef = useRef<VoiceTarget | null>(null);

  const allRadarReady =
    overlayReadiness.overlayPermissionGranted &&
    overlayReadiness.accessibilityPermissionGranted &&
    overlayReadiness.screenCapturePermissionGranted;
  const captureWarning = !overlayReadiness.screenCapturePermissionGranted;
  const radarNativeAvailable = offerOverlayBridge.isSupported();

  useEffect(() => {
    loadRides();
    loadSettings();
    syncOfferOverlay();
    restoreTrackingSession?.().then(() => {
      const state = useTrackingStore.getState();
      if (state.running && state.draft) {
        setTrackingRecovered(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      void syncOfferOverlay();
    });

    return () => subscription.remove();
  }, [syncOfferOverlay]);

  useEffect(() => {
    if (!overlaySupported || !overlayActive) return;

    const interval = setInterval(() => {
      void syncOfferOverlay();
    }, 1500);

    return () => clearInterval(interval);
  }, [overlayActive, overlaySupported, syncOfferOverlay]);

  useEffect(() => {
    if (!overlaySupported || overlayLoading || overlayActive || !allRadarReady) {
      return;
    }

    void startOfferOverlay();
  }, [
    allRadarReady,
    overlayActive,
    overlayLoading,
    overlaySupported,
    startOfferOverlay,
  ]);

  useEffect(() => {
    async function loadOnboardingState() {
      const dismissed = await AsyncStorage.getItem("@kmone:onboarding-dismissed");
      if (!allRadarReady && dismissed !== "1") {
        setOnboardingVisible(true);
      }
    }

    void loadOnboardingState();
  }, [allRadarReady]);

  const totalKm = rides.reduce((sum, ride) => sum + ride.kmRodado, 0);
  const totalBruto = rides.reduce((sum, ride) => sum + ride.receitaBruta, 0);
  const rsPorKm = totalKm > 0 ? totalBruto / totalKm : 0;
  const abaixoMetaRSkm = rsPorKm > 0 && rsPorKm < settings.metaMinRSKm;
  const totalRides = rides.length;
  const totalMinutes = rides.reduce(
    (sum, ride) => sum + (ride.durationMinutes ?? 0),
    0,
  );
  const horas = Math.floor(totalMinutes / 60);
  const minutos = totalMinutes % 60;
  const horasFormatadas =
    totalMinutes === 0
      ? "0h"
      : `${horas}h ${minutos.toString().padStart(2, "0")}min`;
  const goalProgress = settings.metaDiariaBruta
    ? Math.min(totalBruto / settings.metaDiariaBruta, 1)
    : 0;
  const goalLeft = Math.max(settings.metaDiariaBruta - totalBruto, 0);
  const ridesSorted = [...rides].reverse();

  const radarValorNum = Number(radarValor.replace(",", "."));
  const radarKmNum = Number(radarKm.replace(",", "."));
  const radarMinutosNum = Number(radarMinutos.replace(",", "."));
  const radarReady =
    radarValorNum > 0 && radarKmNum > 0 && radarMinutosNum > 0;
  const radarResult = radarReady
    ? evaluateRideRadar({
        valor: radarValorNum,
        km: radarKmNum,
        minutos: radarMinutosNum,
        settings,
      })
    : null;
  const lastOfferDecision = evaluateOffer(lastValidUberCapture, settings);
  const decisionCardStyle = getDecisionCardStyle(lastOfferDecision);
  const legacyLastValidUberCapture =
    lastValidUberCapture ?? {
      frameId: "",
      sourceApp: "unknown" as const,
      offeredValue: 0,
      estimatedKm: 0,
      estimatedMinutes: 0,
      capturedAt: "",
      rawText: "",
      category: null,
    };
  const lastCapture = legacyLastValidUberCapture;

  useEffect(() => {
    setLastDecision(radarResult?.status ?? null);
    if (radarResult) {
      void offerOverlayBridge.updatePreview({
        status: radarResult.status.toUpperCase(),
        title:
          radarResult.status === "aceitar"
            ? "Vale a pena aceitar"
            : radarResult.status === "talvez"
              ? "Analise com cuidado"
              : "Nao vale a pena",
        subtitle: `R$ ${radarValorNum.toFixed(2)} • ${radarKmNum.toFixed(
          1,
        )} km • ${radarMinutosNum.toFixed(0)} min • R$ ${radarResult.rsKm.toFixed(
          2,
        )}/km`,
      });
      return;
    }

    void offerOverlayBridge.hide();
  }, [radarResult, setLastDecision]);

  function showToast(msg: string) {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert("Aviso", msg);
    }
  }

  function applyVoiceValue(target: VoiceTarget, value: string) {
    setManualBruto(value);
  }

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    const currentTarget = voiceTargetRef.current;

    if (!transcript || !currentTarget) return;

    const parsedValue = parseSpokenMoney(transcript);
    if (parsedValue === null) return;

    applyVoiceValue(currentTarget, formatMoneyInputValue(parsedValue));
  });

  useSpeechRecognitionEvent("error", (event) => {
    voiceTargetRef.current = null;
    setVoiceTarget(null);

    if (event.error === "not-allowed") {
      showToast("Permita o microfone para usar o valor por voz");
      return;
    }

    if (event.error === "no-speech" || event.error === "speech-timeout") {
      showToast("Nenhum valor foi identificado");
      return;
    }

    showToast("Nao foi possivel capturar o valor por voz");
  });

  useSpeechRecognitionEvent("end", () => {
    voiceTargetRef.current = null;
    setVoiceTarget(null);
  });

  async function handleVoiceCapture(target: VoiceTarget) {
    if (running) return;

    if (voiceTarget === target) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      showToast("Permita o microfone para usar o valor por voz");
      return;
    }

    voiceTargetRef.current = target;
    setVoiceTarget(target);

    ExpoSpeechRecognitionModule.start({
      lang: "pt-BR",
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      contextualStrings: [
        "reais",
        "real",
        "centavos",
        "vinte",
        "trinta",
        "quarenta",
        "cinquenta",
        "sessenta",
        "setenta",
        "oitenta",
        "noventa",
      ],
      androidIntentOptions: {
        EXTRA_PROMPT: "Fale somente o valor da corrida",
      },
      iosTaskHint: "confirmation",
    });
  }

  async function onPrimaryButton() {
    if (!running) {
      const freeTrackingValueNum = Number(freeTrackingValue.replace(",", "."));
      const requiresRevenue = freeTrackingLabel === "Particular";
      if (requiresRevenue && (!freeTrackingValueNum || freeTrackingValueNum <= 0)) {
        showToast("Informe o valor da corrida particular antes de iniciar");
        return;
      }

      try {
        setTrackingError(null);
        await startFreeTracking(
          freeTrackingLabel,
          requiresRevenue ? +freeTrackingValueNum.toFixed(2) : 0,
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error("start tracking:", error);
        if (error instanceof TrackingStartError) {
          setTrackingError(error.message);
          showToast(error.message);
          return;
        }

        setTrackingError("Nao foi possivel iniciar o tracking livre");
        showToast("Nao foi possivel iniciar o tracking livre");
      }
      return;
    }

    try {
      const { distanceMeters: dist, draft, endedAt, durationMinutes } =
        await stop();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const kmNum = +(dist / 1000).toFixed(2);

      if (draft?.kind === "free") {
        const receitaParticular =
          draft.label === "Particular" ? +(draft.receitaBruta ?? 0) : 0;
        await addRide({
          kmRodado: kmNum,
          receitaBruta: receitaParticular,
          app: "Outros",
          mode: "tracking_livre",
          trackingLabel: draft.label,
          startedAt: draft.startedAt,
          endedAt,
          durationMinutes,
        });

        setSavedBanner(
          draft.label === "Particular"
            ? `Particular salvo: ${kmNum.toFixed(2)} km • ${money(receitaParticular)}`
            : `Tracking livre salvo: ${kmNum.toFixed(2)} km - ${draft.label}`,
        );
        if (draft.label === "Particular") {
          setFreeTrackingValue("");
        }
        setTimeout(() => setSavedBanner(null), 2500);
      } else if (draft?.kind === "ride") {
        await addRide({
          kmRodado: kmNum,
          receitaBruta: draft.receitaBruta,
          app: draft.app,
          mode: "app",
          startedAt: draft.startedAt,
          endedAt,
          durationMinutes,
        });
      }
    } catch (error) {
      console.error("stop tracking:", error);
      showToast("Nao foi possivel encerrar o tracking livre");
    }
  }

  async function handleDeleted(ride: Ride) {
    await removeRide(ride);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUndoVisible(true);
    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(() => setUndoVisible(false), 4000);
    setUndoTimer(timer);
  }

  async function handleUndo() {
    setUndoVisible(false);
    if (undoTimer) clearTimeout(undoTimer);
    await undoLastDelete();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleSaveManual() {
    const brutoNum = Number(manualBruto.replace(",", "."));
    const kmNum = Number(manualKm.replace(",", "."));

    if (!brutoNum || brutoNum <= 0 || !kmNum || kmNum <= 0) {
      showToast("Preencha o valor e o KM corretamente");
      return;
    }

    try {
      const now = new Date().toISOString();

      await addRide({
        receitaBruta: brutoNum,
        kmRodado: +kmNum.toFixed(2),
        app: manualApp,
        mode: "app",
        startedAt: now,
        endedAt: now,
        durationMinutes: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setSavedBanner(
        `Corrida manual salva: ${kmNum.toFixed(2)} km • ${money(brutoNum)}`,
      );
      setTimeout(() => setSavedBanner(null), 2500);

      setManualBruto("");
      setManualKm("");
      setManualApp("Uber");
      setManualVisible(false);
    } catch (error) {
      console.error("save manual ride:", error);
      showToast("Nao foi possivel salvar a corrida manual");
    }
  }

  function handleApplyRadarToMain() {
    if (!radarReady) {
      showToast("Preencha a oferta antes de aplicar");
      return;
    }

    setManualBruto(radarValor);
    setManualKm(radarKm);
    setManualApp(radarSource);
    setRadarVisible(false);
    setManualVisible(true);
    showToast("Oferta enviada para o lancamento manual");
  }

  function handleSaveRadarSnapshot() {
    if (!radarReady || !radarResult) {
      showToast("Preencha os dados para analisar");
      return;
    }

    setRadarHistory((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          source: radarSource,
          valor: radarValorNum,
          km: radarKmNum,
          minutos: radarMinutosNum,
          status: radarResult.status,
        },
        ...current,
      ].slice(0, 5),
    );

    showToast("Analise salva no historico rapido");
  }

  function renderVoiceButton(target: VoiceTarget, disabled = false) {
    const active = voiceTarget === target;

    return (
      <Pressable
        onPress={() => handleVoiceCapture(target)}
        disabled={disabled}
        className={`ml-3 h-12 w-12 items-center justify-center rounded-full ${
          disabled ? "opacity-40" : ""
        }`}
        style={{
          backgroundColor: active ? "#DC2626" : "#ECFDF5",
          borderWidth: 1,
          borderColor: active ? "#DC2626" : "#A7F3D0",
        }}
      >
        <Ionicons
          name={active ? "stop" : "mic"}
          size={18}
          color={active ? "#FFFFFF" : "#047857"}
        />
      </Pressable>
    );
  }

  const lastCaptureId = lastValidUberCapture?.capturedAt ?? null;
  const canSaveDetectedOffer =
    !!lastValidUberCapture &&
    !!lastCaptureId &&
    (lastValidUberCapture.offeredValue ?? 0) > 0 &&
    (lastValidUberCapture.estimatedKm ?? 0) > 0 &&
    !savedOfferIds.includes(lastCaptureId);

  function sourceToApp(source: "uber" | "99" | "unknown"): "Uber" | "99" | "Outros" {
    if (source === "uber") return "Uber";
    if (source === "99") return "99";
    return "Outros";
  }

  async function handleSaveDetectedOffer() {
    if (!lastValidUberCapture || !lastCaptureId) {
      showToast("Nenhuma oferta pronta para salvar");
      return;
    }

    const value = lastValidUberCapture.offeredValue ?? 0;
    const km = lastValidUberCapture.estimatedKm ?? 0;
    if (value <= 0 || km <= 0) {
      showToast("A oferta ainda nao tem dados suficientes");
      return;
    }

    try {
      await addRide({
        receitaBruta: +value.toFixed(2),
        kmRodado: +km.toFixed(2),
        app: sourceToApp(lastValidUberCapture.sourceApp),
        mode: "app",
        startedAt: lastValidUberCapture.capturedAt,
        endedAt: lastValidUberCapture.capturedAt,
        durationMinutes: Math.round(lastValidUberCapture.estimatedMinutes ?? 0),
      });
      setSavedOfferIds((current) => [...current, lastCaptureId]);
      setSavedBanner(
        `Corrida de app salva: ${km.toFixed(2)} km • ${money(value)}`,
      );
      setTimeout(() => setSavedBanner(null), 2500);
    } catch (error) {
      console.error("save detected offer:", error);
      showToast("Nao foi possivel salvar a oferta detectada");
    }
  }

  function formatOfferMetric(value: number, suffix: string) {
    return `${value.toFixed(2)}${suffix}`;
  }

  function goToRadarSettings() {
    navigation.navigate("Config");
  }

  function getDecisionCardStyle(decision: OfferDecision) {
    switch (decision.status) {
      case "great":
        return {
          backgroundColor: "#ECFDF5",
          borderColor: "#86EFAC",
          badgeBackground: "#166534",
          badgeText: "#FFFFFF",
          title: "#166534",
          text: "#166534",
          accent: "#065F46",
        };
      case "ok":
        return {
          backgroundColor: "#FFFBEB",
          borderColor: "#FCD34D",
          badgeBackground: "#92400E",
          badgeText: "#FFFFFF",
          title: "#92400E",
          text: "#92400E",
          accent: "#78350F",
        };
      case "bad":
        return {
          backgroundColor: "#FEF2F2",
          borderColor: "#FCA5A5",
          badgeBackground: "#B91C1C",
          badgeText: "#FFFFFF",
          title: "#B91C1C",
          text: "#991B1B",
          accent: "#7F1D1D",
        };
      default:
        return {
          backgroundColor: "#EFF6FF",
          borderColor: "#BFDBFE",
          badgeBackground: "#1D4ED8",
          badgeText: "#FFFFFF",
          title: "#1D4ED8",
          text: "#1E3A8A",
          accent: "#1E40AF",
        };
    }
  }

  async function handleRequestOverlayPermission() {
    const granted = await requestOverlayPermission();
    await syncOfferOverlay();

    if (!radarNativeAvailable) {
      showToast("Build sem modulo nativo do radar. Reinstale a build de dev.");
      return;
    }

    if (!granted) {
      showToast("Ative o overlay nas configuracoes e volte para o app.");
    }
  }

  async function handleRequestAccessibilityPermission() {
    const granted = await requestAccessibilityPermission();
    await syncOfferOverlay();

    if (!radarNativeAvailable) {
      showToast("Build sem modulo nativo do radar. Reinstale a build de dev.");
      return;
    }

    if (!granted) {
      showToast("Ative a acessibilidade nas configuracoes e volte para o app.");
    }
  }

  async function handleRequestScreenCapturePermission() {
    const granted = await requestScreenCapturePermission();
    await syncOfferOverlay();

    if (!radarNativeAvailable) {
      showToast("Build sem modulo nativo do radar. Reinstale a build de dev.");
      return;
    }

    if (!granted) {
      showToast("Permita a captura de tela para o radar ler ofertas.");
    }
  }

  async function handleDismissOnboarding() {
    await AsyncStorage.setItem("@kmone:onboarding-dismissed", "1");
    setOnboardingVisible(false);
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pb-10 pt-5">
        <LinearGradient
          colors={running ? ["#7F1D1D", "#DC2626"] : ["#064E3B", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 20 }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-emerald-100">
                Painel de hoje
              </Text>
              <Text className="mt-2 text-3xl font-bold text-white">
                {running ? "Tracking livre em andamento" : "Operacao do dia"}
              </Text>
              <Text className="mt-2 text-sm text-emerald-50">
                {running
                  ? "Estamos medindo deslocamento livre em tempo real para calcular km ocioso."
                  : "Use o radar para ofertas de app e o tracking livre para particular, posto e deslocamento vazio."}
              </Text>
            </View>

            <View
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
            >
              <Text className="text-xs font-semibold text-white">
                {running ? "AO VIVO" : "OPERACAO"}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row">
            <View
              className="rounded-full px-3 py-2"
              style={{
                backgroundColor: allRadarReady
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(127,29,29,0.42)",
              }}
            >
              <Text className="text-xs font-semibold text-white">
                {allRadarReady ? "RADAR PRONTO" : "RADAR INCOMPLETO"}
              </Text>
            </View>
          </View>

          <View
            className="mt-5 rounded-[24px] p-4"
            style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
          >
            <Text className="text-sm font-medium text-emerald-50">
              Tracking livre
            </Text>

            <Text className="mt-2 text-sm text-emerald-50">
              Use para km ocioso, particular ou deslocamentos sem passageiro.
            </Text>

            <View className="mt-4 flex-row gap-2">
              {(["Ocioso", "Particular", "Deslocamento"] as const).map((option) => {
                const active = freeTrackingLabel === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => !running && setFreeTrackingLabel(option)}
                    className={`flex-1 rounded-2xl px-3 py-3 ${
                      running ? "opacity-50" : ""
                    }`}
                    style={{
                      backgroundColor: active
                        ? "rgba(255,255,255,0.22)"
                        : "rgba(255,255,255,0.12)",
                      borderWidth: 1,
                      borderColor: active
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(255,255,255,0.16)",
                    }}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        active ? "text-white" : "text-emerald-50"
                      }`}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {freeTrackingLabel === "Particular" && (
              <View className="mt-4">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-[1.2px] text-emerald-100">
                  Valor da corrida particular
                </Text>
                <TextInput
                  value={freeTrackingValue}
                  onChangeText={setFreeTrackingValue}
                  editable={!running}
                  keyboardType="decimal-pad"
                  placeholder="Ex: 42,50"
                  placeholderTextColor="rgba(236,253,245,0.75)"
                  className={`rounded-2xl px-4 py-3 text-base font-semibold text-white ${
                    running ? "opacity-60" : ""
                  }`}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.14)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.22)",
                  }}
                />
              </View>
            )}

            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={onPrimaryButton}
                className="flex-1 flex-row items-center justify-center rounded-2xl px-5 py-4"
                style={{ backgroundColor: running ? "#FFFFFF" : "#0F172A" }}
              >
                <Ionicons
                  name={running ? "stop" : "play"}
                  size={20}
                  color={running ? "#DC2626" : "#FFFFFF"}
                />
                <Text
                  className="ml-2 text-base font-bold"
                  style={{ color: running ? "#DC2626" : "#FFFFFF" }}
                >
                  {running ? "Encerrar tracking" : "Iniciar tracking"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => !running && setManualVisible(true)}
                disabled={running}
                className={`rounded-2xl px-4 py-4 ${running ? "opacity-40" : ""}`}
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <Ionicons name="car-outline" size={20} color="#FFFFFF" />
              </Pressable>

              <Pressable
                onPress={() => setRadarVisible(true)}
                className="rounded-2xl px-4 py-4"
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View
              className="mt-4 rounded-2xl px-4 py-3"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name={running ? "radio-outline" : "location-outline"}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text className="ml-2 text-sm font-medium text-white">
                    {running ? "Tracking livre ativo" : "GPS pronto para tracking"}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-white">
                  {(distanceMeters / 1000).toFixed(2)} km
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className="mt-5 gap-3">
          {trackingRecovered && running && (
            <Banner
              icon="refresh"
              title="Tracking livre recuperado"
              description={`Continuamos medindo seu deslocamento. Distancia atual: ${(distanceMeters / 1000).toFixed(2)} km.`}
              tone="warning"
              onClose={() => setTrackingRecovered(false)}
            />
          )}

          {trackingError && !running && (
            <Banner
              icon="alert-circle-outline"
              title="Ajuste necessario"
              description={trackingError}
              tone="danger"
              onClose={() => setTrackingError(null)}
            />
          )}

          {captureWarning && (
            <Banner
              icon="scan-outline"
              title="Captura de tela desativada"
              description='Sem a captura ativa o radar nao consegue ler as ofertas. Reative para continuar usando Uber e 99.'
              tone="danger"
              onClose={() => setOnboardingVisible(true)}
            />
          )}

          {savedBanner && (
            <Banner
              icon="checkmark-circle-outline"
              title="Registro concluido"
              description={savedBanner}
              tone="success"
            />
          )}

          <View
            className="rounded-[24px] border p-4"
            style={decisionCardStyle}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-500">
                  Ultima oferta analisada
                </Text>
                <Text
                  className="mt-2 text-2xl font-bold"
                  style={{ color: decisionCardStyle.title }}
                >
                  {lastOfferDecision.label}
                </Text>
                <Text
                  className="mt-2 text-3xl font-bold"
                  style={{ color: decisionCardStyle.accent }}
                >
                  {lastValidUberCapture
                    ? money(lastOfferDecision.offeredValue)
                    : "Aguardando oferta"}
                </Text>
              </View>

              <View
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: decisionCardStyle.badgeBackground }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: decisionCardStyle.badgeText }}
                >
                  {canSaveDetectedOffer ? "PRONTA" : lastValidUberCapture ? "SALVA" : "OCR"}
                </Text>
              </View>
            </View>

            {lastValidUberCapture ? (
              <>
                <View className="mt-4 flex-row gap-3">
                  <View className="flex-1 rounded-[20px] bg-white/70 px-4 py-3">
                    <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
                      R$/km
                    </Text>
                    <Text className="mt-1 text-xl font-bold text-slate-900">
                      R$ {formatOfferMetric(lastOfferDecision.earningsPerKm, "")}
                    </Text>
                  </View>
                  <View className="flex-1 rounded-[20px] bg-white/70 px-4 py-3">
                    <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
                      R$/hora
                    </Text>
                    <Text className="mt-1 text-xl font-bold text-slate-900">
                      R$ {formatOfferMetric(lastOfferDecision.earningsPerHour, "")}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 gap-2">
                  <Text className="text-sm text-slate-700">
                    Total: {lastOfferDecision.totalKm.toFixed(1)} km •{" "}
                    {Math.round(lastOfferDecision.totalMinutes)} min
                  </Text>
                  <Text className="text-sm text-slate-700">
                    Pickup: {lastOfferDecision.pickupKm.toFixed(1)} km •{" "}
                    {Math.round(lastOfferDecision.pickupMinutes)} min
                  </Text>
                  <Text className="text-sm text-slate-700">
                    Viagem: {lastOfferDecision.tripKm.toFixed(1)} km •{" "}
                    {Math.round(lastOfferDecision.tripMinutes)} min
                  </Text>
                  <Text className="text-sm text-slate-700">
                    Categoria: {lastValidUberCapture.category ?? sourceToApp(lastValidUberCapture.sourceApp)}
                  </Text>
                  <Text className="text-sm text-slate-700">
                    Meta: R$ {formatOfferMetric(lastOfferDecision.targetEarningsPerKm, "")}/km •
                    {" "}R$ {formatOfferMetric(lastOfferDecision.targetEarningsPerHour, "")}/h
                  </Text>
                </View>

                <Text
                  className="mt-4 text-sm leading-6"
                  style={{ color: decisionCardStyle.text }}
                >
                  {lastOfferDecision.reason}
                </Text>

                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    onPress={handleSaveDetectedOffer}
                    disabled={!canSaveDetectedOffer}
                    className={`flex-1 items-center justify-center rounded-2xl px-4 py-4 ${
                      !canSaveDetectedOffer ? "opacity-50" : ""
                    }`}
                    style={{ backgroundColor: "#0F172A" }}
                  >
                    <Text className="font-semibold text-white">
                      Salvar corrida de app
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRadarVisible(true)}
                    className="items-center justify-center rounded-2xl border border-slate-300 px-4 py-4"
                    style={{ backgroundColor: "#FFFFFFAA" }}
                  >
                    <Ionicons name="flash-outline" size={18} color="#0F172A" />
                  </Pressable>
                </View>
              </>
            ) : (
              <Text
                className="mt-4 text-sm leading-6"
                style={{ color: decisionCardStyle.text }}
              >
                Aguardando uma oferta valida do Uber/99 para calcular R$/km, R$/hora e decidir se compensa.
              </Text>
            )}
          </View>

          {false && lastValidUberCapture && (
            <View
              className="rounded-[24px] border border-slate-200 bg-white p-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">
                    Ultima oferta valida do Uber/99
                  </Text>
                  <Text className="mt-2 text-2xl font-bold text-slate-900">
                    {money(legacyLastValidUberCapture.offeredValue ?? 0)}
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    {(lastCapture.estimatedKm ?? 0).toFixed(1)} km •{" "}
                    {Math.round(lastCapture.estimatedMinutes ?? 0)} min •{" "}
                    {sourceToApp(legacyLastValidUberCapture.sourceApp)}
                  </Text>
                </View>

                <View
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: canSaveDetectedOffer ? "#DCFCE7" : "#E2E8F0" }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: canSaveDetectedOffer ? "#166534" : "#475569" }}
                  >
                    {canSaveDetectedOffer ? "PRONTA" : "SALVA"}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row gap-3">
                <Pressable
                  onPress={handleSaveDetectedOffer}
                  disabled={!canSaveDetectedOffer}
                  className={`flex-1 items-center justify-center rounded-2xl px-4 py-4 ${
                    !canSaveDetectedOffer ? "opacity-50" : ""
                  }`}
                  style={{ backgroundColor: "#0F172A" }}
                >
                  <Text className="font-semibold text-white">
                    Salvar corrida de app
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setRadarVisible(true)}
                  className="items-center justify-center rounded-2xl border border-slate-300 px-4 py-4"
                >
                  <Ionicons name="flash-outline" size={18} color="#0F172A" />
                </Pressable>
              </View>
            </View>
          )}

          {SHOW_HOME_RADAR_DEBUG &&
            latestUberOfferState.status !== "idle" &&
            latestUberOfferState.status !== "valid" && (
              <View className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
                <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-amber-700">
                  Estado da ultima oferta Uber/99
                </Text>
                <Text className="mt-2 text-lg font-bold text-amber-950">
                  {latestUberOfferState.status === "detected"
                    ? "Oferta detectada"
                    : latestUberOfferState.status === "processing"
                      ? "Oferta em processamento"
                      : "Oferta sem captura valida"}
                </Text>
                <Text className="mt-2 text-sm text-amber-900">
                  {latestUberOfferState.parserReason ??
                    "O radar viu a oferta, mas ainda nao fechou uma captura estruturada."}
                </Text>
              </View>
            )}

          {SHOW_HOME_RADAR_DEBUG && recentDebugReads.length > 0 && (
            <View className="rounded-[24px] border border-slate-200 bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">
                    Leitura bruta do radar
                  </Text>
                  <Text className="mt-2 text-xl font-bold text-slate-900">
                    Ultimos textos recebidos
                  </Text>
                  <Text className="mt-2 text-sm text-slate-500">
                    Quando a oferta abrir, confira aqui o texto real que o Uber entregou para a acessibilidade.
                  </Text>
                </View>

                <Pressable
                  onPress={() => void syncOfferOverlay()}
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: "#E2E8F0" }}
                >
                  <Text className="text-xs font-semibold text-slate-700">
                    Atualizar
                  </Text>
                </Pressable>
              </View>

              <View className="mt-4 gap-3">
                {recentDebugReads.slice(0, 4).map((item) => (
                  <View
                    key={`${item.capturedAt}-${item.rawText.slice(0, 16)}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
                      {sourceToApp(item.sourceApp)} • {new Date(item.capturedAt).toLocaleTimeString("pt-BR")}
                    </Text>
                    <Text className="mt-2 text-sm leading-5 text-slate-700">
                      {item.rawText}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!allRadarReady && (
            <Pressable
              onPress={goToRadarSettings}
              className="rounded-[24px] border border-slate-200 bg-white p-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">
                    Radar pendente
                  </Text>
                  <Text className="mt-2 text-xl font-bold text-slate-900">
                    Finalize a configuracao do radar
                  </Text>
                  <Text className="mt-2 text-sm text-slate-500">
                    Permissao para alerta sobre outros apps, leitura da tela e captura precisam estar ativas para o radar funcionar bem.
                  </Text>
                </View>

                <Pressable
                  onPress={goToRadarSettings}
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: "#E8FFF5" }}
                >
                  <Text className="text-xs font-semibold text-emerald-800">
                    Resolver agora
                  </Text>
                </Pressable>
              </View>

              <View className="mt-4 flex-row flex-wrap justify-between">
                <MetricCard
                  label="Alerta"
                  value={overlayReadiness.overlayPermissionGranted ? "OK" : "Pendente"}
                  note="Mostrar sobre outros apps"
                  emphasis={overlayReadiness.overlayPermissionGranted ? "success" : "warning"}
                />
                <MetricCard
                  label="Leitura"
                  value={overlayReadiness.accessibilityPermissionGranted ? "OK" : "Pendente"}
                  note="Permissao de leitura da tela"
                  emphasis={overlayReadiness.accessibilityPermissionGranted ? "success" : "warning"}
                />
                <MetricCard
                  label="Captura"
                  value={overlayReadiness.screenCapturePermissionGranted ? "OK" : "Pendente"}
                  note="Permissao de captura necessaria"
                  emphasis={overlayReadiness.screenCapturePermissionGranted ? "success" : "warning"}
                />
              </View>
            </Pressable>
          )}

          {undoVisible && (
            <UndoBanner text="Corrida excluida." onAction={handleUndo} />
          )}
        <View className="mt-6">
          <SectionHeader
            eyebrow="Desempenho do dia"
            title="Visao rapida"
            rightSlot={
              <View
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: abaixoMetaRSkm ? "#FEF3C7" : "#DCFCE7" }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: abaixoMetaRSkm ? "#92400E" : "#166534" }}
                >
                  {abaixoMetaRSkm ? "Abaixo da meta" : "Em linha"}
                </Text>
              </View>
            }
          />

          <View className="mt-4 flex-row flex-wrap justify-between">
            <MetricCard
              label="Bruto hoje"
              value={money(totalBruto)}
              note={`${totalRides} corrida${totalRides === 1 ? "" : "s"}`}
            />
            <MetricCard
              label="Km rodado"
              value={`${totalKm.toFixed(2)} km`}
              note={horasFormatadas}
            />
            <MetricCard
              label="R$/km"
              value={rsPorKm.toFixed(2)}
              note={`Meta ${settings.metaMinRSKm.toFixed(2)}`}
              emphasis={abaixoMetaRSkm ? "warning" : "success"}
            />
            <MetricCard
              label="Falta para a meta"
              value={goalLeft > 0 ? money(goalLeft) : "Meta batida"}
              note={`Meta diaria ${money(settings.metaDiariaBruta)}`}
            />
          </View>
        </View>

        <View
          className="mt-6 rounded-[28px] border border-slate-200 p-5"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">
                Meta diaria
              </Text>
              <Text className="mt-1 text-xl font-bold text-slate-900">
                {goalLeft > 0
                  ? `${money(goalLeft)} para bater a meta`
                  : "Meta diaria atingida"}
              </Text>
              <Text className="mt-2 text-sm text-slate-500">
                {abaixoMetaRSkm
                  ? "Seu retorno por quilometro esta abaixo do alvo. Avalie corridas com valor melhor."
                  : "Seu rendimento por quilometro esta dentro da meta minima definida."}
              </Text>
            </View>

            <View
              className="rounded-2xl px-3 py-2"
              style={{ backgroundColor: SURFACE }}
            >
              <Text className="text-xs font-semibold text-slate-500">
                {Math.round(goalProgress * 100)}%
              </Text>
            </View>
          </View>

          <View
            className="mt-4 h-3 overflow-hidden rounded-full"
            style={{ backgroundColor: "#E2E8F0" }}
          >
            <View
              className="h-3 rounded-full"
              style={{
                width: `${Math.max(goalProgress * 100, goalProgress > 0 ? 8 : 0)}%`,
                backgroundColor: abaixoMetaRSkm ? "#F59E0B" : ACCENT,
              }}
            />
          </View>
        </View>

        <View
          className="mt-6 rounded-[28px] border border-slate-200 p-5"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <SectionHeader
            eyebrow="Radar instantaneo"
            title="Vale a pena?"
            rightSlot={
              <Pressable
                onPress={() => setRadarVisible(true)}
                className="rounded-full px-4 py-3"
                style={{ backgroundColor: "#E8FFF5" }}
              >
                <Text className="font-semibold text-emerald-800">Abrir radar</Text>
              </Pressable>
            }
          />

          <Text className="mt-3 text-sm text-slate-500">
            Simule valor, km e tempo da oferta da Uber ou 99 e veja a decisao
            usando seus criterios configurados.
          </Text>

          <View className="mt-4 flex-row flex-wrap justify-between">
            <MetricCard
              label="Valor minimo"
              value={money(settings.radarMinValor)}
              note="Corte inicial"
            />
            <MetricCard
              label="Min R$/km"
              value={settings.radarMinRSKm.toFixed(2)}
              note="Eficiência"
            />
            <MetricCard
              label="Min R$/hora"
              value={settings.radarMinRSHora.toFixed(2)}
              note="Ritmo"
            />
            <MetricCard
              label="Status"
              value={radarResult ? radarResult.status.toUpperCase() : "PRONTO"}
              note="Abra para simular"
              emphasis={
                radarResult
                  ? radarResult.status === "aceitar"
                    ? "success"
                    : "warning"
                  : "default"
              }
            />
          </View>

          {radarHistory.length > 0 && (
            <View className="mt-4">
              <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">
                Ultimas analises
              </Text>
              <View className="mt-3 gap-2">
                {radarHistory.map((item) => (
                  <View
                    key={item.id}
                    className="flex-row items-center justify-between rounded-2xl border border-slate-200 px-3 py-3"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-semibold text-slate-900">
                        {item.source} • {money(item.valor)}
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">
                        {item.km.toFixed(1)} km • {item.minutos.toFixed(0)} min
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-3 py-2"
                      style={{
                        backgroundColor:
                          item.status === "aceitar"
                            ? "#DCFCE7"
                            : item.status === "talvez"
                              ? "#FEF3C7"
                              : "#FEE2E2",
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color:
                            item.status === "aceitar"
                              ? "#166534"
                              : item.status === "talvez"
                                ? "#92400E"
                                : "#B91C1C",
                        }}
                      >
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View className="mt-6">
          <SectionHeader
            eyebrow="Operacao recente"
            title="Corridas de hoje"
            rightSlot={
              <Pressable
                onPress={() => !running && setManualVisible(true)}
                disabled={running}
                className={`rounded-full px-4 py-3 ${running ? "opacity-40" : ""}`}
                style={{ backgroundColor: "#E8FFF5" }}
              >
                <Text className="font-semibold text-emerald-800">
                  Corrida manual
                </Text>
              </Pressable>
            }
          />

          <View className="mt-4 gap-3">
            {ridesSorted.map((ride) => (
              <RideItem
                key={ride.id}
                ride={ride}
                onEdit={setEditing}
                onChanged={loadRides}
                onDeleted={handleDeleted}
              />
            ))}

            {ridesSorted.length === 0 && (
              <EmptyState
                icon="trail-sign-outline"
                title="Nenhuma corrida registrada hoje"
                description="Salve uma oferta detectada ou lance uma corrida manual."
              />
            )}
          </View>
        </View>
      </View>
    </View>

      <RideEditModal
        visible={!!editing}
        ride={editing}
        onClose={() => {
          setEditing(null);
          loadRides();
        }}
      />

      <Modal
        visible={radarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRadarVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[32px] bg-white px-6 pb-14 pt-6">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-semibold text-slate-900">
                  Radar de corrida
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Simule a oferta da Uber ou 99 e veja se vale a pena aceitar.
                </Text>
              </View>
              <Pressable onPress={() => setRadarVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <FieldCard label="Valor da oferta (R$)">
              <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
                <Text className="mr-2 text-base text-slate-500">R$</Text>
                <TextInput
                  keyboardType="numeric"
                  value={radarValor}
                  onChangeText={setRadarValor}
                  placeholder="12,50"
                  className="flex-1 text-lg font-semibold"
                />
              </View>
            </FieldCard>

            <View className="mt-4 flex-row gap-3">
              {(["Uber", "99", "Outros"] as const).map((option) => {
                const active = radarSource === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setRadarSource(option)}
                    className="flex-1 rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor: active ? ACCENT : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: active ? ACCENT : "#CBD5E1",
                    }}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        active ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <FieldCard label="Km estimado">
              <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
                <TextInput
                  keyboardType="numeric"
                  value={radarKm}
                  onChangeText={setRadarKm}
                  placeholder="5,2"
                  className="flex-1 text-lg font-semibold"
                />
                <Text className="ml-2 text-sm text-slate-500">km</Text>
              </View>
              <View className="mt-3 flex-row gap-2">
                {["3", "5", "8", "12"].map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setRadarKm(preset)}
                    className="rounded-full border border-slate-300 px-3 py-2"
                  >
                    <Text className="text-xs font-semibold text-slate-600">
                      {preset} km
                    </Text>
                  </Pressable>
                ))}
              </View>
            </FieldCard>

            <FieldCard label="Tempo estimado">
              <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
                <TextInput
                  keyboardType="numeric"
                  value={radarMinutos}
                  onChangeText={setRadarMinutos}
                  placeholder="18"
                  className="flex-1 text-lg font-semibold"
                />
                <Text className="ml-2 text-sm text-slate-500">min</Text>
              </View>
              <View className="mt-3 flex-row gap-2">
                {["10", "15", "20", "30"].map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setRadarMinutos(preset)}
                    className="rounded-full border border-slate-300 px-3 py-2"
                  >
                    <Text className="text-xs font-semibold text-slate-600">
                      {preset} min
                    </Text>
                  </Pressable>
                ))}
              </View>
            </FieldCard>

            <View
              className="mt-5 rounded-[26px] border p-5"
              style={{
                backgroundColor: radarResult
                  ? radarResult.status === "aceitar"
                    ? "#ECFDF5"
                    : radarResult.status === "talvez"
                      ? "#FFFBEB"
                      : "#FEF2F2"
                  : "#F8FAFC",
                borderColor: radarResult
                  ? radarResult.status === "aceitar"
                    ? "#A7F3D0"
                    : radarResult.status === "talvez"
                      ? "#FCD34D"
                      : "#FECACA"
                  : "#E2E8F0",
              }}
            >
              <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">
                Resultado
              </Text>
              <Text
                className="mt-2 text-2xl font-bold"
                style={{
                  color: radarResult
                    ? radarResult.status === "aceitar"
                      ? "#166534"
                      : radarResult.status === "talvez"
                        ? "#92400E"
                        : "#B91C1C"
                    : "#0F172A",
                }}
              >
                {radarResult
                  ? radarResult.status === "aceitar"
                    ? "Aceitar"
                    : radarResult.status === "talvez"
                      ? "Talvez"
                      : "Recusar"
                  : "Preencha os dados"}
              </Text>

              {radarResult ? (
                <>
                  <View className="mt-4 flex-row flex-wrap justify-between">
                    <MetricCard
                      label="R$/km"
                      value={radarResult.rsKm.toFixed(2)}
                      note={`Min ${settings.radarMinRSKm.toFixed(2)}`}
                      emphasis={
                        radarResult.rsKm >= settings.radarMinRSKm
                          ? "success"
                          : "warning"
                      }
                    />
                    <MetricCard
                      label="R$/hora"
                      value={radarResult.rsHora.toFixed(2)}
                      note={`Min ${settings.radarMinRSHora.toFixed(2)}`}
                      emphasis={
                        radarResult.rsHora >= settings.radarMinRSHora
                          ? "success"
                          : "warning"
                      }
                    />
                  </View>
                  <View className="mt-1">
                    {radarResult.reasons.map((reason) => (
                      <Text key={reason} className="mt-2 text-sm text-slate-600">
                        • {reason}
                      </Text>
                    ))}
                  </View>
                </>
              ) : (
                <Text className="mt-2 text-sm text-slate-500">
                  Informe valor, distancia e tempo para o radar calcular.
                </Text>
              )}
            </View>

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={handleApplyRadarToMain}
                className="flex-1 items-center justify-center rounded-2xl px-4 py-4"
                style={{ backgroundColor: "#0F172A" }}
              >
                <Text className="font-semibold text-white">
                  Enviar para manual
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveRadarSnapshot}
                className="flex-1 items-center justify-center rounded-2xl border border-slate-300 px-4 py-4"
              >
                <Text className="font-semibold text-slate-700">
                  Salvar analise
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={manualVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[32px] bg-white px-6 pb-14 pt-6">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-semibold text-slate-900">
                  Lancar corrida manual
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Use quando precisar corrigir ou registrar uma corrida fora do rastreio.
                </Text>
              </View>
              <Pressable onPress={() => setManualVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <FieldCard label="Valor bruto (R$)">
              <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
                <Text className="mr-2 text-base text-slate-500">R$</Text>
                <TextInput
                  keyboardType="numeric"
                  value={manualBruto}
                  onChangeText={setManualBruto}
                  placeholder="0,00"
                  className="flex-1 text-lg font-semibold"
                />
                {renderVoiceButton("manualBruto")}
              </View>
            </FieldCard>

            <FieldCard label="Km rodado">
              <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
                <TextInput
                  keyboardType="numeric"
                  value={manualKm}
                  onChangeText={setManualKm}
                  placeholder="0,00"
                  className="flex-1 text-lg font-semibold"
                />
                <Text className="ml-2 text-sm text-slate-500">km</Text>
              </View>
            </FieldCard>

            <View className="mt-4 flex-row gap-3">
              {(["Uber", "99", "Outros"] as const).map((option) => {
                const active = manualApp === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setManualApp(option)}
                    className="flex-1 rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor: active ? ACCENT : "#FFFFFF",
                      borderWidth: 1,
                      borderColor: active ? ACCENT : "#CBD5E1",
                    }}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        active ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={() => setManualVisible(false)}
                className="flex-1 items-center justify-center rounded-2xl border border-slate-300 px-4 py-4"
              >
                <Text className="font-medium text-slate-600">Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveManual}
                className="flex-1 items-center justify-center rounded-2xl px-4 py-4"
                style={{ backgroundColor: ACCENT_DARK }}
              >
                <Text className="font-semibold text-white">Salvar corrida</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={onboardingVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOnboardingVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/45">
          <View className="rounded-t-[32px] bg-white px-6 pb-14 pt-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">
                  Onboarding do radar
                </Text>
                <Text className="mt-2 text-2xl font-bold text-slate-900">
                  Configure o radar automatico
                </Text>
                <Text className="mt-2 text-sm text-slate-500">
                  O radar so funciona bem com overlay, acessibilidade e captura de tela ativos. A captura pode se perder e precisa ser revisada quando isso acontecer.
                </Text>
              </View>
              <Pressable onPress={() => setOnboardingVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View className="mt-5 gap-3">
              <OnboardingRow
                title="Permitir overlay"
                description="Mostra o popup por cima do Uber e 99."
                done={overlayReadiness.overlayPermissionGranted}
                actionLabel={overlayLoading ? "Abrindo..." : "Ativar"}
                onPress={handleRequestOverlayPermission}
                disabled={overlayLoading}
              />
              <OnboardingRow
                title="Permitir acessibilidade"
                description="Ajuda a entender mudancas de estado da tela."
                done={overlayReadiness.accessibilityPermissionGranted}
                actionLabel={overlayLoading ? "Abrindo..." : "Ativar"}
                onPress={handleRequestAccessibilityPermission}
                disabled={overlayLoading}
              />
              <OnboardingRow
                title="Permitir captura de tela"
                description="Essencial para o OCR. Se cair, o radar para de ler ofertas."
                done={overlayReadiness.screenCapturePermissionGranted}
                actionLabel={overlayLoading ? "Abrindo..." : "Reativar"}
                onPress={handleRequestScreenCapturePermission}
                disabled={overlayLoading}
                danger={!overlayReadiness.screenCapturePermissionGranted}
              />
            </View>

            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={handleDismissOnboarding}
                className="flex-1 items-center justify-center rounded-2xl border border-slate-300 px-4 py-4"
              >
                <Text className="font-medium text-slate-700">
                  Entendi
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setOnboardingVisible(false)}
                className="flex-1 items-center justify-center rounded-2xl px-4 py-4"
                style={{ backgroundColor: "#0F172A" }}
              >
                <Text className="font-semibold text-white">
                  Voltar ao app
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Banner({
  icon,
  title,
  description,
  tone,
  onClose,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tone: "success" | "warning" | "danger";
  onClose?: () => void;
}) {
  const tones = {
    success: {
      bg: "#ECFDF5",
      border: "#A7F3D0",
      title: "#166534",
      text: "#166534",
    },
    warning: {
      bg: "#FFFBEB",
      border: "#FCD34D",
      title: "#92400E",
      text: "#92400E",
    },
    danger: {
      bg: "#FEF2F2",
      border: "#FECACA",
      title: "#B91C1C",
      text: "#B91C1C",
    },
  } as const;

  const style = tones[tone];

  return (
    <View
      className="flex-row items-start rounded-2xl border px-4 py-3"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <Ionicons
        name={icon}
        size={18}
        color={style.title}
        style={{ marginTop: 1, marginRight: 10 }}
      />

      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: style.title }}>
          {title}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: style.text }}>
          {description}
        </Text>
      </View>

      {onClose && (
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={16} color={style.title} />
        </Pressable>
      )}
    </View>
  );
}

function OnboardingRow({
  title,
  description,
  done,
  actionLabel,
  onPress,
  disabled = false,
  danger = false,
}: {
  title: string;
  description: string;
  done: boolean;
  actionLabel: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
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
          disabled={disabled}
          className={`mt-4 items-center justify-center rounded-2xl px-4 py-3 ${
            disabled ? "opacity-60" : ""
          }`}
          style={{ backgroundColor: danger ? "#B91C1C" : "#0F172A" }}
        >
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}


