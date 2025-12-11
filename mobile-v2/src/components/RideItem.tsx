import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Ride } from "@core/domain/types";
import { money } from "@utils/format";

const ACCENT = "#10B981";

type Props = {
  ride: Ride;
  onEdit?: (r: Ride) => void;
  onChanged?: () => void; // ainda útil pra "após editar"
  onDeleted?: (r: Ride) => void | Promise<void>;
};

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RideItem({
  ride,
  onEdit,
  onChanged,
  onDeleted,
}: Props) {
  function confirmDelete() {
    Alert.alert(
      "Excluir corrida?",
      `Isso removerá: ${ride.kmRodado.toFixed(2)} km • ${money(
        ride.receitaBruta,
      )}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            void doDelete();
          },
        },
      ],
      { cancelable: true },
    );
  }

  async function doDelete() {
    try {
      if (onDeleted) {
        await onDeleted(ride);
      } else {
        console.warn("[RideItem] onDeleted não informado, nada foi removido.");
      }
    } catch (e) {
      console.error("[RideItem] erro ao remover via onDeleted:", e);
      Alert.alert("Erro", "Não foi possível excluir a corrida.");
    }
  }

  const hasTime = !!(ride.startedAt && ride.endedAt);
  const dur = ride.durationMinutes ?? 0;

  return (
    <View
      className="rounded-2xl border border-slate-200 p-3 mb-2"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      {/* Linha app + botões */}
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
            className="px-2 py-1 rounded-lg border border-red-600 flex-row items-center gap-1"
          >
            <Ionicons name="trash-outline" size={14} color="#DC2626" />
            <Text className="text-red-600 text-sm">Excluir</Text>
          </Pressable>
        </View>
      </View>

      {/* Linha de horário / duração */}
      {hasTime && (
        <Text className="text-[11px] text-slate-500 mb-1">
          {formatTime(ride.startedAt!)} – {formatTime(ride.endedAt!)}
          {dur > 0 && ` • ${dur} min`}
        </Text>
      )}

      {/* Linha principal: km + valor */}
      <Text className="text-base">
        <Text className="font-semibold">{ride.kmRodado.toFixed(2)} km</Text>
        <Text> • </Text>
        <Text className="font-semibold">{money(ride.receitaBruta)}</Text>
      </Text>
    </View>
  );
}
