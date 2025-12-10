import { useRideStore } from "@state/useRideStore";
import { useSettingsStore } from "@state/useSettingsStore";
import { useTrackingStore } from "@state/useTrackingStore";
import { money } from "@utils/format";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Modal,
  Platform,
  ToastAndroid,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import type { Ride } from "@core/domain/types";
import RideItem from "src/components/RideItem";
import RideEditModal from "src/components/RideEditModal";
import UndoBanner from "src/components/UndoBanner"; // 👈 banner de desfazer

const ACCENT = "#10B981";

export default function Home() {
  // stores
  const {
    rides,
    loadToday: loadRides,
    addRide,
    removeRide, // 👈 vem do store
    undoLastDelete, // 👈 vem do store
  } = useRideStore();
  const { settings, load: loadSettings } = useSettingsStore();
  const {
    running,
    distanceMeters,
    startWithDraft,
    stop,
    restoreTrackingSession,
  } = useTrackingStore();

  // UI local
  const [bruto, setBruto] = useState("");
  const [app, setApp] = useState<"Uber" | "99" | "Outros">("Uber");
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [editing, setEditing] = useState<Ride | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  // funciona em web e RN
  const [undoTimer, setUndoTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const [manualVisible, setManualVisible] = useState(false);
  const [manualBruto, setManualBruto] = useState("");
  const [manualKm, setManualKm] = useState("");
  const [manualApp, setManualApp] = useState<"Uber" | "99" | "Outros">("Uber");

  const [trackingRecovered, setTrackingRecovered] = useState(false);

  useEffect(() => {
    loadRides();
    loadSettings();
    restoreTrackingSession?.().then(() => {
      const s = useTrackingStore.getState();
      if (s.running && s.draft) {
        setTrackingRecovered(true);
      }
    });
  }, []);

  // resumo compacto
  const totalKm = rides.reduce((s, r) => s + r.kmRodado, 0);
  const totalBruto = rides.reduce((s, r) => s + r.receitaBruta, 0);
  const rsPorKm = totalKm > 0 ? totalBruto / totalKm : 0;
  const abaixoMetaRSkm = rsPorKm > 0 && rsPorKm < settings.metaMinRSKm;

  const totalRides = rides.length;

  function showToast(msg: string) {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert("Aviso", msg);
    }
  }

  async function onPrimaryButton() {
    if (!running) {
      const b = Number(bruto.replace(",", "."));
      if (!b || b <= 0) return;
      try {
        await startWithDraft({ receitaBruta: b, app });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        console.error("start tracking:", e);
      }
    } else {
      try {
        const { distanceMeters: dist, draft } = await stop();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const kmNum = +(dist / 1000).toFixed(2);
        if (draft) {
          await addRide({
            kmRodado: kmNum,
            receitaBruta: draft.receitaBruta,
            app: draft.app,
          });
          setBruto("");
          setSavedBanner(
            `Corrida salva: ${kmNum.toFixed(2)} km • ${money(
              draft.receitaBruta,
            )}`,
          );
          setTimeout(() => setSavedBanner(null), 2500);
        }
      } catch (e) {
        console.error("stop tracking:", e);
      }
    }
  }

  // quando um item for apagado no RideItem
  async function handleDeleted(r: Ride) {
    await removeRide(r);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUndoVisible(true);
    if (undoTimer) clearTimeout(undoTimer);
    const t = setTimeout(() => setUndoVisible(false), 4000);
    setUndoTimer(t);
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
      await addRide({
        receitaBruta: brutoNum,
        kmRodado: +kmNum.toFixed(2),
        app: manualApp,
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
    }
  }

  const ridesSorted = [...rides].reverse();

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6 gap-6">
        {/* Header */}
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-3xl font-bold">KM ONE</Text>
            <Text className="text-xs text-slate-500">
              Trevvos • Com você a cada KM
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[15px] text-slate-500">R$/km</Text>
            <Text
              className={`text-[18px] font-semibold ${
                abaixoMetaRSkm ? "text-amber-700" : "text-black"
              }`}
            >
              {rsPorKm.toFixed(2)}
            </Text>
          </View>
        </View>
        {/* 🔶 Banner corrida recuperada */}
        {trackingRecovered && running && (
          <View className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 flex-row items-start">
            <Ionicons
              name="refresh"
              size={16}
              color="#92400E"
              style={{ marginTop: 2, marginRight: 6 }}
            />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-amber-800">
                Corrida em andamento recuperada
              </Text>
              <Text className="text-[11px] text-amber-800/90 mt-0.5">
                Continuamos rastreando essa corrida. Distância atual:{" "}
                <Text className="font-semibold">
                  {(distanceMeters / 1000).toFixed(2)} km
                </Text>
                . Quando terminar, toque em{" "}
                <Text className="font-semibold">“Encerrar e salvar”.</Text>
              </Text>
            </View>
            <Pressable onPress={() => setTrackingRecovered(false)}>
              <Ionicons name="close" size={14} color="#92400E" />
            </Pressable>
          </View>
        )}

        {/* Banner salva */}
        {savedBanner && (
          <View className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2">
            <Text className="text-emerald-800 text-sm">{savedBanner}</Text>
          </View>
        )}

        {/* Banner desfazer */}
        {undoVisible && (
          <UndoBanner text="Corrida excluída." onAction={handleUndo} />
        )}

        {/* Card principal */}
        <View className="rounded-3xl border border-slate-200 p-5 gap-5">
          {/* Valor da corrida */}
          <View>
            <Text className="mb-2 text-slate-600">Valor da corrida</Text>
            <View className="flex-row items-center rounded-2xl border border-slate-300 px-4 py-3">
              <Text className="text-base text-slate-500 mr-2">R$</Text>
              <TextInput
                keyboardType="numeric"
                value={bruto}
                onChangeText={setBruto}
                placeholder="0,00"
                className="flex-1 text-2xl font-semibold"
                editable={!running}
              />
            </View>
          </View>

          {/* App chips */}
          <View className="flex-row gap-3">
            {(["Uber", "99", "Outros"] as const).map((opt) => {
              const active = app === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => !running && setApp(opt)}
                  className={`px-4 py-3 rounded-2xl border ${
                    active ? "" : "bg-white border-slate-300"
                  } ${running ? "opacity-50" : ""}`}
                  style={{
                    backgroundColor: active ? ACCENT : "white",
                    borderColor: active ? ACCENT : "#CBD5E1",
                    shadowColor: active ? ACCENT : "#000",
                    shadowOpacity: active ? 0.25 : 0.08,
                    shadowRadius: active ? 6 : 4,
                    elevation: active ? 3 : 1,
                  }}
                >
                  <Text
                    className={`font-medium ${
                      active ? "text-white" : "text-black"
                    }`}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Status do GPS */}
          <View className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 flex-row items-center gap-2">
            <Ionicons
              name={running ? "radio-outline" : "location-outline"}
              size={16}
              color={running ? ACCENT : "#475569"}
            />
            {!running ? (
              <Text className="text-slate-600">Pronto para iniciar</Text>
            ) : (
              <Text className="text-slate-700">
                Rastreando…{" "}
                <Text className="font-semibold">
                  {(distanceMeters / 1000).toFixed(2)} km
                </Text>
              </Text>
            )}
          </View>

          {/* Botão primário */}
          <Pressable
            onPress={onPrimaryButton}
            className="flex-row items-center justify-center rounded-2xl px-5 py-4 active:opacity-90"
            style={{ backgroundColor: running ? "#DC2626" : ACCENT }}
          >
            <Ionicons name={running ? "stop" : "play"} size={20} color="#fff" />
            <Text className="ml-2 text-white text-lg font-semibold">
              {running ? "Encerrar e salvar" : "Iniciar corrida"}
            </Text>
          </Pressable>
        </View>

        {/* Resumo do dia */}
        <View className="rounded-3xl border border-slate-200 p-5">
          <Text className="text-slate-500">Resumo do dia</Text>
          <View className="mt-3 gap-2">
            <View className="flex-row justify-between">
              <Text>Bruto</Text>
              <Text className="font-semibold">{money(totalBruto)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text>Km</Text>
              <Text className="font-semibold">{totalKm.toFixed(2)} km</Text>
            </View>
            <View className="flex-row justify-between">
              <Text>Meta R$/km</Text>
              <Text
                className={`font-semibold ${
                  abaixoMetaRSkm ? "text-amber-700" : ""
                }`}
              >
                {settings.metaMinRSKm.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Corridas de hoje */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between mb-1">
            <View>
              <Text className="text-base font-semibold text-slate-800">
                Corridas de hoje
              </Text>
              <Text className="text-xs font-semibold text-emerald-700 mt-0.5">
                {totalRides === 0
                  ? ""
                  : `${totalRides} corrida${totalRides === 1 ? "" : "s"}`}
              </Text>
            </View>

            <Pressable
              onPress={() => !running && setManualVisible(true)}
              className={`flex-row items-center rounded-2xl border px-3 py-2 ${
                running ? "opacity-40" : ""
              }`}
              style={{
                borderColor: "#E2E8F0",
                backgroundColor: "#F8FAFC",
              }}
              disabled={running}
            >
              <Ionicons name="add" size={16} color="#0F766E" />
              <Text className="ml-1 text-sm font-semibold text-emerald-800">
                Corrida manual
              </Text>
            </Pressable>
          </View>
          {ridesSorted.map((r) => (
            <RideItem
              key={r.id}
              ride={r}
              onEdit={setEditing}
              onChanged={loadRides}
              onDeleted={handleDeleted} // 👈 importante
            />
          ))}
          {ridesSorted.length === 0 && (
            <Text className="text-slate-500">Sem corridas hoje.</Text>
          )}
        </View>
      </View>

      {/* Modal de edição */}
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
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6 gap-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold">
                Lançar corrida manual
              </Text>
              <Pressable onPress={() => setManualVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B"></Ionicons>
              </Pressable>
            </View>

            <View>
              <Text className="mb-1 text-slate-600 text-sm">
                Valor bruto (R$)
              </Text>
              <View className="flex-row items-center rounded-2xl border border-slate-300 px-4 py-2.5">
                <Text className="text-base text-slate-500 mr-2">R$</Text>
                <TextInput
                  keyboardType="numeric"
                  value={manualBruto}
                  onChangeText={setManualBruto}
                  placeholder="0,00"
                  className="flex-1 text-lg font-semibold"
                />
              </View>
            </View>

            {/*/ KM */}

            <View>
              <Text className="mb-1 text-slate-600 text-sm">Km Rodado</Text>
              <View className="flex-row item-center rounded-2xl border border-slate-300 px-4 py-2.5">
                <TextInput
                  keyboardType="numeric"
                  value={manualKm}
                  onChangeText={setManualKm}
                  placeholder="0.00"
                  className="flex-1 text-lg -font-semibold"
                />
                <Text className="ml-2 text-slate-500 text-sm">Km</Text>
              </View>
            </View>

            {/* App chips (reaproveitando lógica) */}
            <View className="flex-row gap-3 mt-1">
              {(["Uber", "99", "Outros"] as const).map((opt) => {
                const active = manualApp === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setManualApp(opt)}
                    className={`px-4 py-2.5 rounded-2xl border ${
                      active ? "" : "bg-white border-slate-300"
                    }`}
                    style={{
                      backgroundColor: active ? ACCENT : "white",
                      borderColor: active ? ACCENT : "#CBD5E1",
                    }}
                  >
                    <Text
                      className={`font-medium ${
                        active ? "text-white" : "text-black"
                      }`}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {/* Botões */}
            <View className="flex-row mt-4 gap-3">
              <Pressable
                onPress={() => setManualVisible(false)}
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 items-center justify-center"
              >
                <Text className="text-slate-600 font-medium">Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveManual}
                className="flex-1 rounded-2xl px-4 py-3 items-center justify-center"
                style={{ backgroundColor: ACCENT }}
              >
                <Text className="text-white font-semibold">Salvar corrida</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
