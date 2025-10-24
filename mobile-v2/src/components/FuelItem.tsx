import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { money } from "@utils/format";
import { fuelRepo, type Fuel } from "@core/infra/asyncStorageRepos";

const ACCENT = "#10B981";

type Props = {
  fuel: Fuel;
  onEdit?: (f: Fuel) => void;
  onChanged?: () => void; // recarregar lista
  onDeleted?: (f: Fuel) => void | Promise<void>; // para “Undo” na tela
};

export default function FuelItem({
  fuel,
  onEdit,
  onChanged,
  onDeleted,
}: Props) {
  function confirmDelete() {
    Alert.alert(
      "Excluir abastecimento?",
      `${money(fuel.valor)}${fuel.litros ? ` • ${fuel.litros} L` : ""}${
        fuel.tipo ? ` • ${fuel.tipo}` : ""
      }`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => doDelete() },
      ],
      { cancelable: true }
    );
  }

  async function doDelete() {
    try {
      await fuelRepo.remove(fuel.id, fuel.dataISO);
      onChanged?.();
      await onDeleted?.(fuel);
    } catch (e) {
      console.error("[FuelItem] erro ao remover:", e);
      Alert.alert("Erro", "Não foi possível excluir o abastecimento.");
    }
  }

  return (
    <View className="rounded-2xl border border-slate-200 p-3 bg-white">
      <View className="flex-row items-center justify-between mb-1">
        <View
          className="px-2 py-1 rounded-full border"
          style={{ borderColor: ACCENT, backgroundColor: "#ECFDF5" }}
        >
          <Text style={{ color: ACCENT, fontSize: 12, fontWeight: "600" }}>
            {fuel.tipo ?? "combustível"}
          </Text>
        </View>

        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onEdit?.(fuel)}
            className="px-2 py-1 rounded-lg border border-slate-300"
          >
            <Text>Editar</Text>
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            className="px-2 py-1 rounded-lg border border-red-600"
          >
            <Text className="text-red-600">Excluir</Text>
          </Pressable>
        </View>
      </View>

      <Text className="text-base">
        <Text className="font-semibold">{money(fuel.valor)}</Text>
        {fuel.litros ? <Text>{` • ${fuel.litros} L`}</Text> : null}
      </Text>
    </View>
  );
}
