import { Ionicons } from "@expo/vector-icons";
import type { Ride } from "@core/domain/types";
import { rideRepo } from "@core/infra/asyncStorageRepos";
import { money } from "@utils/format";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

const ACCENT = "#10B981";

type Props = {
  visible: boolean;
  ride: Ride | null;
  onClose: () => void;
};

function toNumber(v: string) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toDateLabel(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export default function RideEditModal({ visible, ride, onClose }: Props) {
  const [km, setKm] = useState("");
  const [bruto, setBruto] = useState("");
  const [app, setApp] = useState<"Uber" | "99" | "Outros">("Uber");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!ride) return;
    setKm(String(ride.kmRodado));
    setBruto(String(ride.receitaBruta));
    setApp(ride.app);
  }, [ride]);

  if (!visible) return null;

  async function salvar() {
    if (!ride) return;
    const kmNum = toNumber(km);
    const brNum = toNumber(bruto);
    if (kmNum <= 0 || brNum < 0) return;

    setSaving(true);
    try {
      const updated: Ride = {
        id: ride.id,
        dataISO: ride.dataISO,
        kmRodado: +kmNum.toFixed(2),
        receitaBruta: +brNum.toFixed(2),
        app,
        mode: ride.mode,
        trackingLabel: ride.trackingLabel,
        obs: ride.obs,
      };

      if (typeof rideRepo.update === "function") {
        await rideRepo.update(updated);
      } else {
        if (typeof rideRepo.remove === "function") {
          await rideRepo.remove(ride.id, ride.dataISO);
        }
        if (typeof rideRepo.create === "function") {
          await rideRepo.create(updated);
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function excluir() {
    if (!ride) return;
    setRemoving(true);
    try {
      await rideRepo.remove(ride.id, ride.dataISO);
      onClose();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="max-h-[92%] rounded-t-[30px] bg-slate-50 px-5 pb-6 pt-5">
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-semibold uppercase tracking-[1.3px] text-slate-500">
                Edicao de corrida
              </Text>
              <Text className="mt-1 text-2xl font-bold text-slate-900">
                Ajustar registro
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                Revise valor, distancia e origem para manter seus dados corretos.
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
              style={{ borderWidth: 1, borderColor: "#E2E8F0" }}
            >
              <Ionicons name="close" size={20} color="#0F172A" />
            </Pressable>
          </View>

          {!ride ? (
            <View className="rounded-[24px] border border-slate-200 bg-white p-4">
              <Text className="text-sm text-slate-600">
                Nenhuma corrida selecionada.
              </Text>
            </View>
          ) : (
            <ScrollView
              className="flex-grow"
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="rounded-[24px] border border-slate-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
                      Registro atual
                    </Text>
                    <Text className="mt-1 text-xl font-bold text-slate-900">
                      {money(ride.receitaBruta)}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-500">
                      {ride.kmRodado.toFixed(2)} km
                    </Text>
                  </View>
                  <View className="rounded-full bg-emerald-50 px-3 py-2">
                    <Text className="text-xs font-semibold text-emerald-800">
                      {ride.app}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row justify-between">
                  <Text className="text-sm text-slate-500">Dia</Text>
                  <Text className="text-sm font-semibold text-slate-900">
                    {toDateLabel(ride.dataISO)}
                  </Text>
                </View>

                {ride.mode === "tracking_livre" && ride.trackingLabel ? (
                  <View className="mt-3 flex-row justify-between">
                    <Text className="text-sm text-slate-500">Tipo tracking</Text>
                    <Text className="text-sm font-semibold text-slate-900">
                      {ride.trackingLabel}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
                  Dados editaveis
                </Text>

                <View className="mt-3">
                  <Text className="mb-2 text-sm font-medium text-slate-700">
                    Km rodado
                  </Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={km}
                    onChangeText={setKm}
                    placeholder="Ex.: 12,40"
                    placeholderTextColor="#94A3B8"
                    className="rounded-2xl bg-slate-50 px-4 py-3 text-base text-slate-900"
                    style={{ borderWidth: 1, borderColor: "#CBD5E1" }}
                  />
                </View>

                <View className="mt-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">
                    Receita bruta (R$)
                  </Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={bruto}
                    onChangeText={setBruto}
                    placeholder="Ex.: 28,00"
                    placeholderTextColor="#94A3B8"
                    className="rounded-2xl bg-slate-50 px-4 py-3 text-base text-slate-900"
                    style={{ borderWidth: 1, borderColor: "#CBD5E1" }}
                  />
                </View>

                <View className="mt-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">
                    Aplicativo
                  </Text>
                  <View className="flex-row gap-2">
                    {(["Uber", "99", "Outros"] as const).map((opt) => {
                      const active = app === opt;
                      return (
                        <Pressable
                          key={opt}
                          onPress={() => setApp(opt)}
                          className="flex-1 rounded-2xl px-3 py-3"
                          style={{
                            backgroundColor: active ? "#ECFDF5" : "#F8FAFC",
                            borderWidth: 1,
                            borderColor: active ? "#6EE7B7" : "#CBD5E1",
                          }}
                        >
                          <Text
                            className="text-center font-semibold"
                            style={{ color: active ? "#047857" : "#334155" }}
                          >
                            {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-slate-400">
                  Previa apos salvar
                </Text>
                <Text className="mt-2 text-lg font-bold text-slate-900">
                  {money(toNumber(bruto || "0"))}
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {toNumber(km || "0").toFixed(2)} km
                </Text>
              </View>

              <View className="mt-5 flex-row gap-3">
                <Pressable
                  onPress={excluir}
                  disabled={removing || saving}
                  className={`flex-1 items-center justify-center rounded-2xl px-4 py-4 ${
                    removing || saving ? "opacity-60" : ""
                  }`}
                  style={{ borderWidth: 1, borderColor: "#EF4444", backgroundColor: "#FFF5F5" }}
                >
                  <Text className="font-semibold text-red-600">
                    {removing ? "Excluindo..." : "Excluir"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={salvar}
                  disabled={saving || removing}
                  className={`flex-1 items-center justify-center rounded-2xl px-4 py-4 ${
                    saving || removing ? "opacity-60" : ""
                  }`}
                  style={{ backgroundColor: ACCENT }}
                >
                  <Text className="font-semibold text-white">
                    {saving ? "Salvando..." : "Salvar"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
