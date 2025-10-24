import { useRideStore } from "@state/useRideStore";
import { useSettingsStore } from "@state/useSettingsStore";
import { useTrackingStore } from "@state/useTrackingStore";
import { money } from "@utils/format";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Ride } from "@core/domain/types";

import RideItem from "src/components/RideItem";
import RideEditModal from "src/components/RideEditModal";

const ACCENT = "#10B981"; // verde Trevvos
const ACCENT_DARK = "#059669"; // versão pressionada

export default function Home() {
  // stores
  const { rides, loadToday: loadRides, addRide } = useRideStore();
  const { settings, load: loadSettings } = useSettingsStore();
  const { running, distanceMeters, startWithDraft, stop } = useTrackingStore();

  // UI local
  const [bruto, setBruto] = useState("");
  const [app, setApp] = useState<"Uber" | "99">("Uber");
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [editing, setEditing] = useState<Ride | null>(null); // modal de edição

  useEffect(() => {
    (async () => {
      loadRides();
      loadSettings();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // resumo compacto
  const totalKm = rides.reduce((s, r) => s + r.kmRodado, 0);
  const totalBruto = rides.reduce((s, r) => s + r.receitaBruta, 0);
  const rsPorKm = totalKm > 0 ? totalBruto / totalKm : 0;
  const abaixoMetaRSkm = rsPorKm > 0 && rsPorKm < settings.metaMinRSKm;

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
              draft.receitaBruta
            )}`
          );
          setTimeout(() => setSavedBanner(null), 2500);
        }
      } catch (e) {
        console.error("stop tracking:", e);
      }
    }
  }

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
            <Text className="text-[11px] text-slate-500">R$/km</Text>
            <Text
              className={`text-base font-semibold ${
                abaixoMetaRSkm ? "text-amber-700" : "text-black"
              }`}
            >
              {rsPorKm.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Banner salva */}
        {savedBanner && (
          <View className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2">
            <Text className="text-emerald-800 text-sm">{savedBanner}</Text>
          </View>
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

          {/* App chips mais “vivos” */}
          <View className="flex-row gap-3">
            {(["Uber", "99"] as const).map((opt) => {
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

          {/* Status do GPS com ícone */}
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

          {/* Botão primário com accent */}
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

        {/* Resumo do dia — card enxuto */}
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
          {rides.map((r) => (
            <RideItem
              key={r.id}
              ride={r}
              onEdit={setEditing}
              onChanged={loadRides}
            />
          ))}
          {rides.length === 0 && (
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
    </ScrollView>
  );
}
