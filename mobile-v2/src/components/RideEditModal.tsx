import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { money } from "@utils/format";
import type { Ride } from "@core/domain/types";
import { rideRepo } from "@core/infra/asyncStorageRepos";

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

// ✅ type guard para satisfazer o TS
function assertRide(x: Ride | null): asserts x is Ride {
  if (!x) throw new Error("Ride is null");
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

  // Se não estiver visível, não renderiza nada
  if (!visible) return null;

  // Se visível mas sem ride: modal neutro
  if (!ride) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className="flex-1 items-center justify-center bg-white">
          <Text>Sem corrida selecionada.</Text>
          <Pressable
            onPress={onClose}
            className="mt-3 rounded-xl border px-4 py-2"
          >
            <Text>Fechar</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  // ✅ Daqui pra baixo, forçamos o TS a saber que não é null
  assertRide(ride);
  const r: Ride = ride;

  async function salvar() {
    const kmNum = toNumber(km);
    const brNum = toNumber(bruto);
    if (kmNum < 0 || brNum < 0) return;

    setSaving(true);
    try {
      const updated: Ride = {
        id: r.id,
        dataISO: r.dataISO,
        kmRodado: +kmNum.toFixed(2),
        receitaBruta: +brNum.toFixed(2),
        app,
        obs: r.obs,
      };

      if (typeof rideRepo.update === "function") {
        await rideRepo.update(updated);
      } else {
        if (typeof rideRepo.remove === "function") {
          await rideRepo.remove(r.id, r.dataISO);
        }
        if (typeof rideRepo.create === "function") {
          await rideRepo.create(updated);
        }
      }
      onClose(); // o pai recarrega a lista
    } finally {
      setSaving(false);
    }
  }

  async function excluir() {
    setRemoving(true);
    try {
      await rideRepo.remove(r.id, r.dataISO);
      onClose(); // o pai recarrega a lista
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-white p-5">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-semibold">Editar corrida</Text>
          <Pressable onPress={onClose} className="px-3 py-2">
            <Ionicons name="close" size={22} color="#0f172a" />
          </Pressable>
        </View>

        <View className="rounded-2xl border border-slate-200 p-4 gap-3">
          <View>
            <Text className="mb-1 text-slate-700">Km rodado</Text>
            <TextInput
              keyboardType="numeric"
              value={km}
              onChangeText={setKm}
              placeholder="ex.: 12.4"
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View>
            <Text className="mb-1 text-slate-700">Receita bruta (R$)</Text>
            <TextInput
              keyboardType="numeric"
              value={bruto}
              onChangeText={setBruto}
              placeholder="ex.: 28.00"
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View className="flex-row gap-2">
            {(["Uber", "99", "Outros"] as const).map((opt) => {
              const active = app === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setApp(opt)}
                  className={`px-4 py-2 rounded-xl border ${
                    active ? "" : "bg-white border-slate-300"
                  }`}
                  style={{
                    backgroundColor: active ? ACCENT : "white",
                    borderColor: active ? ACCENT : "#CBD5E1",
                  }}
                >
                  <Text className={active ? "text-white" : "text-black"}>
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-2 flex-row justify-between">
            <Text className="text-slate-500">Dia</Text>
            <Text className="font-medium">{r.dataISO}</Text>
          </View>

          <View className="mt-2 flex-row justify-between">
            <Text className="text-slate-500">Atual</Text>
            <Text className="font-medium">
              {r.kmRodado.toFixed(2)} km • {money(r.receitaBruta)}
            </Text>
          </View>

          <View className="flex-row gap-2 mt-4">
            <Pressable
              onPress={excluir}
              disabled={removing || saving}
              className="flex-1 rounded-xl border border-red-600 px-4 py-3 active:opacity-80"
            >
              <Text className="text-center text-red-600 font-medium">
                {removing ? "Excluindo..." : "Excluir"}
              </Text>
            </Pressable>

            <Pressable
              onPress={salvar}
              disabled={saving || removing}
              className="flex-1 rounded-xl px-4 py-3 active:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              <Text className="text-center text-white font-medium">
                {saving ? "Salvando..." : "Salvar"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
