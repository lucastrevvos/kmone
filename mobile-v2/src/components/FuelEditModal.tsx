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
import { fuelRepo } from "@core/infra/asyncStorageRepos";
import type { FuelToUp as Fuel } from "@core/domain/types";

const ACCENT = "#10B981";

type Props = {
  visible: boolean;
  fuel: Fuel | null;
  onClose: () => void;
};

function toNumber(v: string) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function FuelEditModal({ visible, fuel, onClose }: Props) {
  const [valor, setValor] = useState("");
  const [litros, setLitros] = useState("");
  const [tipo, setTipo] = useState<
    "gasolina" | "etanol" | "diesel" | undefined
  >(undefined);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Preenche campos quando abrir com um fuel válido
  useEffect(() => {
    if (!fuel) return;
    setValor(String(fuel.valor));
    setLitros(fuel.litros != null ? String(fuel.litros) : "");
    setTipo(fuel.tipo);
  }, [fuel]);

  // Se não está visível, não renderiza nada
  if (!visible) return null;

  // Se está visível mas não veio fuel (edge), mostra modal neutro
  if (!fuel) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className="flex-1 items-center justify-center bg-white">
          <Text>Nenhum abastecimento selecionado.</Text>
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

  async function salvar() {
    if (!fuel) return; // TS guarda-chuva
    const v = toNumber(valor);
    const l = litros ? toNumber(litros) : undefined;
    if (!v || v <= 0) return;

    setSaving(true);
    try {
      const updated: Fuel = {
        id: fuel.id,
        dataISO: fuel.dataISO,
        valor: +v.toFixed(2),
        litros: typeof l === "number" ? +l.toFixed(2) : undefined,
        tipo,
      };

      await fuelRepo.update(updated);
      onClose(); // tela que chamou pode recarregar na sequência
    } finally {
      setSaving(false);
    }
  }

  async function excluir() {
    if (!fuel) return;
    setRemoving(true);
    try {
      await fuelRepo.remove(fuel.id, fuel.dataISO);
      onClose();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-white p-5">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-semibold">Editar abastecimento</Text>
          <Pressable onPress={onClose} className="px-3 py-2">
            <Ionicons name="close" size={22} color="#0f172a" />
          </Pressable>
        </View>

        <View className="rounded-2xl border border-slate-200 p-4 gap-3">
          <View>
            <Text className="mb-1 text-slate-700">Valor (R$)</Text>
            <TextInput
              keyboardType="numeric"
              value={valor}
              onChangeText={setValor}
              placeholder="ex.: 120.00"
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View>
            <Text className="mb-1 text-slate-700">Litros (opcional)</Text>
            <TextInput
              keyboardType="numeric"
              value={litros}
              onChangeText={setLitros}
              placeholder="ex.: 20.5"
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View className="flex-row gap-2">
            {(["gasolina", "etanol", "diesel"] as const).map((opt) => {
              const active = tipo === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setTipo(opt)}
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
            <Text className="font-medium">{fuel.dataISO}</Text>
          </View>

          <View className="mt-2 flex-row justify-between">
            <Text className="text-slate-500">Atual</Text>
            <Text className="font-medium">
              {money(fuel.valor)}
              {fuel.litros ? ` • ${fuel.litros} L` : ""}{" "}
              {fuel.tipo ? `• ${fuel.tipo}` : ""}
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
