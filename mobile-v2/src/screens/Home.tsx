import { useRideStore } from "@state/useRideStore";
import { useSettingsStore } from "@state/useSettingsStore";
import { useTrackingStore } from "@state/useTrackingStore";
import { TrackingStartError } from "@core/infra/expoGps";
import { money } from "@utils/format";
import { formatMoneyInputValue, parseSpokenMoney } from "@utils/speechMoney";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
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

import type { Ride } from "@core/domain/types";
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

type VoiceTarget = "bruto" | "manualBruto";

export default function Home() {
  const {
    rides,
    loadToday: loadRides,
    addRide,
    removeRide,
    undoLastDelete,
  } = useRideStore();
  const { settings, load: loadSettings } = useSettingsStore();
  const {
    running,
    distanceMeters,
    startWithDraft,
    stop,
    restoreTrackingSession,
  } = useTrackingStore();

  const [bruto, setBruto] = useState("");
  const [app, setApp] = useState<"Uber" | "99" | "Outros">("Uber");
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

  const [trackingRecovered, setTrackingRecovered] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [voiceTarget, setVoiceTarget] = useState<VoiceTarget | null>(null);
  const voiceTargetRef = useRef<VoiceTarget | null>(null);

  useEffect(() => {
    loadRides();
    loadSettings();
    restoreTrackingSession?.().then(() => {
      const s = useTrackingStore.getState();
      if (s.running && s.draft) {
        setTrackingRecovered(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function showToast(msg: string) {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert("Aviso", msg);
    }
  }

  function applyVoiceValue(target: VoiceTarget, value: string) {
    if (target === "bruto") {
      setBruto(value);
      return;
    }

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
      const brutoNum = Number(bruto.replace(",", "."));
      if (!brutoNum || brutoNum <= 0) {
        showToast("Informe o valor da corrida");
        return;
      }

      try {
        setTrackingError(null);
        await startWithDraft({ receitaBruta: brutoNum, app });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error("start tracking:", error);
        if (error instanceof TrackingStartError) {
          setTrackingError(error.message);
          showToast(error.message);
          return;
        }

        setTrackingError("Nao foi possivel iniciar a corrida");
        showToast("Nao foi possivel iniciar a corrida");
      }
      return;
    }

    try {
      const { distanceMeters: dist, draft, endedAt, durationMinutes } =
        await stop();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const kmNum = +(dist / 1000).toFixed(2);

      if (draft) {
        await addRide({
          kmRodado: kmNum,
          receitaBruta: draft.receitaBruta,
          app: draft.app,
          startedAt: draft.startedAt,
          endedAt,
          durationMinutes,
        });

        setBruto("");
        setSavedBanner(
          `Corrida salva: ${kmNum.toFixed(2)} km • ${money(draft.receitaBruta)}`,
        );
        setTimeout(() => setSavedBanner(null), 2500);
      }
    } catch (error) {
      console.error("stop tracking:", error);
      showToast("Nao foi possivel encerrar a corrida");
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
                {running ? "Corrida em andamento" : "Pronto para rodar"}
              </Text>
              <Text className="mt-2 text-sm text-emerald-50">
                {running
                  ? "Acompanhe a quilometragem em tempo real e encerre quando finalizar."
                  : "Defina o valor, escolha o app e inicie a corrida em poucos toques."}
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

          <View
            className="mt-5 rounded-[24px] p-4"
            style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
          >
            <Text className="text-sm font-medium text-emerald-50">
              Valor da corrida
            </Text>

            <View className="mt-3 flex-row items-center">
              <View
                className="flex-1 flex-row items-center rounded-[22px] px-4 py-3"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <Text className="mr-2 text-lg font-semibold text-slate-400">
                  R$
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={bruto}
                  onChangeText={setBruto}
                  placeholder="0,00"
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-3xl font-bold text-slate-900"
                  editable={!running}
                />
              </View>
              {renderVoiceButton("bruto", running)}
            </View>

            <View className="mt-4 flex-row gap-2">
              {(["Uber", "99", "Outros"] as const).map((option) => {
                const active = app === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => !running && setApp(option)}
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
                  {running ? "Encerrar e salvar" : "Iniciar corrida"}
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
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
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
                    {running ? "Rastreamento ativo" : "GPS pronto para iniciar"}
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
              title="Corrida recuperada"
              description={`Continuamos rastreando a corrida. Distancia atual: ${(distanceMeters / 1000).toFixed(2)} km.`}
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

          {savedBanner && (
            <Banner
              icon="checkmark-circle-outline"
              title="Registro concluido"
              description={savedBanner}
              tone="success"
            />
          )}

          {undoVisible && (
            <UndoBanner text="Corrida excluida." onAction={handleUndo} />
          )}
        </View>

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
                description="Inicie uma corrida pelo painel acima ou lance uma corrida manual."
              />
            )}
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
