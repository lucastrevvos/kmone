import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useRideStore } from "@state/useRideStore";
import { listRidesByDate } from "@core/usecases/listRidesByDate";
import { rideRepo } from "@core/infra/asyncStorageRepos";
import { money, todayLocalISO } from "@utils/format";
import type { Ride } from "@core/domain/types";

import RideItem from "src/components/RideItem";
import RideEditModal from "src/components/RideEditModal";

const ACCENT = "#10B981"; // Trevvos

function fmtLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// soma dias no horário local (meio-dia evita buraco/overlap de DST)
function addDaysLocal(dateISO: string, delta: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const base = new Date(y, m - 1, d, 12, 0, 0, 0);
  base.setDate(base.getDate() + delta);
  return fmtLocalISO(base);
}

export default function Historico() {
  // usa o mesmo "hoje" da store (fonte da verdade)
  const { dateISO: storeToday } = useRideStore();
  const initial = useMemo(() => storeToday || todayLocalISO(), [storeToday]);

  const [dateISO, setDateISO] = useState(initial);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Ride | null>(null);

  async function load() {
    setLoading(true);
    try {
      const uc = listRidesByDate(rideRepo);
      const list = await uc(dateISO);
      setRides(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setDateISO(initial); // se o storeToday mudar
  }, [initial]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO]);

  const total = rides.reduce((s, r) => s + r.receitaBruta, 0);
  const km = rides.reduce((s, r) => s + r.kmRodado, 0);
  const isToday = dateISO === initial;

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      contentContainerClassName="p-5"
    >
      <View className="gap-4">
        <Text className="text-2xl font-bold">Histórico</Text>

        {/* Navegação por data (mesmo visual que antes) */}
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => setDateISO(addDaysLocal(dateISO, -1))}
            className="rounded-full"
            style={{
              backgroundColor: ACCENT,
              paddingHorizontal: 14,
              paddingVertical: 10,
              elevation: 2,
            }}
          >
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </Pressable>

          <View className="items-center">
            <Text className="font-semibold">{dateISO}</Text>
            {!isToday && (
              <Pressable
                onPress={() => setDateISO(initial)}
                className="mt-1 rounded-full border px-3 py-1"
                style={{ borderColor: ACCENT }}
              >
                <Text
                  style={{ color: ACCENT, fontSize: 12, fontWeight: "600" }}
                >
                  Hoje
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setDateISO(addDaysLocal(dateISO, +1))}
            className="rounded-full"
            style={{
              backgroundColor: ACCENT,
              paddingHorizontal: 14,
              paddingVertical: 10,
              elevation: 2,
            }}
          >
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Resumo do dia (cards e fontes como antes) */}
        <View className="rounded-3xl border border-slate-200 p-4">
          <Text className="text-slate-500 mb-2">Resumo</Text>
          <View className="gap-2">
            <Row label="Bruto" value={money(total)} />
            <Row label="Km" value={`${km.toFixed(2)} km`} />
          </View>
        </View>

        {/* Lista de corridas com RideItem + ações */}
        {/* Lista de corridas (com ações) */}
        <View className="gap-2">
          {rides.map((r) => (
            <RideItem
              key={r.id}
              ride={r}
              onEdit={setEditing}
              onChanged={load} // 👈 recarrega ao excluir
            />
          ))}

          {!loading && rides.length === 0 && (
            <View className="items-center py-10">
              <Ionicons name="trail-sign-outline" size={28} color="#94A3B8" />
              <Text className="text-slate-500 mt-2">
                Sem corridas neste dia.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal de edição (salva/exclui e recarrega) */}
      <RideEditModal
        visible={!!editing}
        ride={editing}
        onClose={() => {
          setEditing(null);
          load();
        }}
      />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-slate-700">{label}</Text>
      <Text className="font-semibold">{value}</Text>
    </View>
  );
}
