import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Ride } from "@core/domain/types";
import { money } from "@utils/format";
import { rideRepo } from "@core/infra/asyncStorageRepos";

const ACCENT = "#10B981";

type Props = {
  ride: Ride;
  onEdit?: (r: Ride) => void;
  onChanged?: () => void; // chamado após excluir/editar
};

export default function RideItem({ ride, onEdit, onChanged }: Props) {
  function confirmDelete() {
    // Botão de alerta que REALMENTE chama o repo.remove no onPress
    Alert.alert(
      "Excluir corrida?",
      `Isso removerá: ${ride.kmRodado.toFixed(2)} km • ${money(
        ride.receitaBruta
      )}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => doDelete(), // garante a invocação
        },
      ],
      { cancelable: true }
    );
  }

  async function doDelete() {
    try {
      // IMPORTANTE: usar a data da corrida
      await rideRepo.remove(ride.id, ride.dataISO);
      console.log("[RideItem] removido:", ride.id, "dia:", ride.dataISO);
      onChanged?.(); // recarrega lista
    } catch (e) {
      console.error("[RideItem] erro ao remover:", e);
      Alert.alert("Erro", "Não foi possível excluir a corrida.");
    }
  }

  return (
    <View
      className="rounded-2xl border border-slate-200 p-3"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <View className="flex-row items-center justify-between mb-1">
        <View
          className="px-2 py-1 rounded-full"
          style={{
            backgroundColor: "#ECFDF5",
            borderColor: ACCENT,
            borderWidth: 1,
          }}
        >
          <Text style={{ color: ACCENT, fontSize: 12, fontWeight: "600" }}>
            {ride.app}
          </Text>
        </View>

        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onEdit?.(ride)}
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
        <Text className="font-semibold">{ride.kmRodado.toFixed(2)} km</Text>
        <Text> • </Text>
        <Text className="font-semibold">{money(ride.receitaBruta)}</Text>
      </Text>
    </View>
  );
}
