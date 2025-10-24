import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { listRidesByDate } from "@core/usecases/listRidesByDate";
import { rideRepo } from "@core/infra/asyncStorageRepos";
import { money, todayLocalISO } from "@utils/format";
import { Ionicons } from "@expo/vector-icons";
import type { Ride } from "@core/domain/types";
import RideEditModal from "src/components/RideEditModal";
import RideItem from "src/components/RideItem";
import { exportDayCsv } from "src/features/export/exportDayCsv";

const ACCENT = "#10B981";

function fmtLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysLocal(dateISO: string, delta: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const base = new Date(y, m - 1, d, 12, 0, 0, 0);
  base.setDate(base.getDate() + delta);
  return fmtLocalISO(base);
}

export default function Historico() {
  const [dateISO, setDateISO] = useState(todayLocalISO());
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
    load();
  }, [dateISO]);

  const total = rides.reduce((s, r) => s + r.receitaBruta, 0);
  const km = rides.reduce((s, r) => s + r.kmRodado, 0);
  const isToday = dateISO === todayLocalISO();

  async function onExport() {
    if (rides.length === 0) {
      Alert.alert("Nada para exportar", "Não há corridas neste dia.");
      return;
    }
    try {
      await exportDayCsv(dateISO, rides);
    } catch (e) {
      console.error("export csv", e);
      Alert.alert("Erro", "Não foi possível exportar o CSV.");
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      contentContainerClassName="p-5"
    >
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold">Histórico</Text>
          <Pressable
            onPress={onExport}
            className="flex-row items-center gap-1 rounded-full px-3 py-2"
            style={{ backgroundColor: ACCENT }}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text className="text-white font-semibold">Exportar CSV</Text>
          </Pressable>
        </View>

        {/* Navegação por data */}
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
                onPress={() => setDateISO(todayLocalISO())}
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

        {/* Resumo */}
        <View className="rounded-3xl border border-slate-200 p-4">
          <Text className="text-slate-500 mb-2">Resumo</Text>
          <View className="gap-2">
            <Row label="Bruto" value={money(total)} />
            <Row label="Km" value={`${km.toFixed(2)} km`} />
          </View>
        </View>

        {/* Lista */}
        <View className="gap-2">
          {rides.map((r) => (
            <RideItem
              key={r.id}
              ride={r}
              onEdit={setEditing}
              onChanged={load}
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
