import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { listRidesByDate } from "@core/usecases/listRidesByDate";
import { fuelRepo, rideRepo } from "@core/infra/asyncStorageRepos";
import type { Ride } from "@core/domain/types";
import { ridesToCSV } from "@utils/csv";
import { money, todayLocalISO } from "@utils/format";
import EmptyState from "src/components/EmptyState";
import { exportDayCsv } from "src/features/export/exportDayCsv";
import MetricCard from "src/components/MetricCard";
import RideEditModal from "src/components/RideEditModal";
import RideItem from "src/components/RideItem";
import ScreenHero from "src/components/ScreenHero";
import SectionHeader from "src/components/SectionHeader";

const ACCENT = "#10B981";

function fmtLocalISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysLocal(dateISO: string, delta: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const base = new Date(y, m - 1, d, 12, 0, 0, 0);
  base.setDate(base.getDate() + delta);
  return fmtLocalISO(base);
}

function weekRangeMonday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, (m || 1) - 1, d || 1, 12);
  const wd = (base.getDay() + 6) % 7;
  const start = addDaysLocal(fmtLocalISO(base), -wd);
  const end = addDaysLocal(start, 6);
  return { start, end };
}

function monthRange(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const first = new Date(y, (m || 1) - 1, 1, 12);
  const last = new Date(y, m || 1, 0, 12);
  return { start: fmtLocalISO(first), end: fmtLocalISO(last) };
}

function* eachDay(startISO: string, endISO: string) {
  let current = startISO;
  while (current <= endISO) {
    yield current;
    current = addDaysLocal(current, 1);
  }
}

async function exportRangeCsv(label: string, rides: Ride[]) {
  const csv = ridesToCSV(rides);
  const safe = label.replace(/[^\w-]+/g, "_");
  const fileName = `kmone-rides-${safe}.csv`;
  const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
  const uri = `${dir}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      dialogTitle: `Exportar corridas • ${label}`,
      UTI: "public.comma-separated-values-text",
      mimeType: "text/csv",
    });
  } else {
    console.log("CSV salvo em:", uri);
  }

  return uri;
}

async function listRidesRange(startISO: string, endISO: string): Promise<Ride[]> {
  const all: Ride[] = [];
  for (const day of eachDay(startISO, endISO)) {
    const list = await rideRepo.listByDate(day);
    if (list?.length) all.push(...list);
  }
  return all;
}

export default function Historico() {
  const [dateISO, setDateISO] = useState(todayLocalISO());
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Ride | null>(null);
  const [fuelDay, setFuelDay] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const uc = listRidesByDate(rideRepo);
      const list = await uc(dateISO);
      setRides(list);

      const fuels = await fuelRepo.listByDate(dateISO);
      setFuelDay(fuels.reduce((sum, fuel) => sum + fuel.valor, 0));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [dateISO]);

  const total = rides.reduce((sum, ride) => sum + ride.receitaBruta, 0);
  const km = rides.reduce((sum, ride) => sum + ride.kmRodado, 0);
  const liquido = total - fuelDay;
  const rsPorKm = km > 0 ? total / km : 0;
  const totalRides = rides.length;
  const isToday = dateISO === todayLocalISO();

  async function onExportDay() {
    if (rides.length === 0) {
      Alert.alert("Nada para exportar", "Nao ha corridas neste dia.");
      return;
    }

    try {
      await exportDayCsv(dateISO, rides);
    } catch (error) {
      console.error("export csv", error);
      Alert.alert("Erro", "Nao foi possivel exportar o CSV.");
    }
  }

  async function onExportWeek() {
    const { start, end } = weekRangeMonday(dateISO);
    const data = await listRidesRange(start, end);
    if (!data.length) {
      Alert.alert("Nada para exportar", "Nao ha corridas nesta semana.");
      return;
    }

    await exportRangeCsv(`semana-${start}_a_${end}`, data);
  }

  async function onExportMonth() {
    const { start, end } = monthRange(dateISO);
    const data = await listRidesRange(start, end);
    if (!data.length) {
      Alert.alert("Nada para exportar", "Nao ha corridas neste mes.");
      return;
    }

    await exportRangeCsv(`mes-${start.slice(0, 7)}`, data);
  }

  async function handleDeleted(ride: Ride) {
    try {
      await rideRepo.remove(ride.id, ride.dataISO);
      await load();
    } catch (error) {
      console.error("[Historico] erro ao remover:", error);
      Alert.alert("Erro", "Nao foi possivel excluir a corrida.");
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pb-10 pt-5">
        <ScreenHero
          eyebrow="Analise operacional"
          title="Historico"
          description="Revise desempenho, compare datas e exporte o periodo que precisa."
          badge={`${totalRides} corridas`}
          backgroundColor="#0F172A"
        />
        <View
          className="mt-4 rounded-[24px] px-5 py-5"
          style={{ backgroundColor: "#0F172A" }}
        >
          <View className="mt-5 rounded-[24px] bg-white/5 p-4">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setDateISO(addDaysLocal(dateISO, -1))}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
              >
                <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
              </Pressable>

              <View className="items-center">
                <Text className="text-lg font-bold text-white">{dateISO}</Text>
                <Text className="mt-1 text-xs text-slate-300">
                  {isToday ? "Hoje" : "Periodo selecionado"}
                </Text>
              </View>

              <Pressable
                onPress={() => setDateISO(addDaysLocal(dateISO, 1))}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
              >
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {!isToday && (
              <Pressable
                onPress={() => setDateISO(todayLocalISO())}
                className="mt-4 self-center rounded-full px-4 py-2"
                style={{ backgroundColor: "#E8FFF5" }}
              >
                <Text className="font-semibold text-emerald-800">Voltar para hoje</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View className="mt-6">
          <SectionHeader eyebrow="Resumo do periodo" title="Indicadores" />

          <View className="mt-4 flex-row flex-wrap justify-between">
            <MetricCard label="Bruto" value={money(total)} note={`${totalRides} corridas`} />
            <MetricCard label="Km" value={`${km.toFixed(2)} km`} note={`${rsPorKm.toFixed(2)} R$/km`} />
            <MetricCard label="Combustivel" value={money(fuelDay)} note="Custo do dia" />
            <MetricCard
              label="Liquido"
              value={money(liquido)}
              note={liquido >= 0 ? "Saldo positivo" : "Saldo negativo"}
              emphasis={liquido >= 0 ? "success" : "warning"}
            />
          </View>
        </View>

        <View
          className="mt-6 rounded-[28px] border border-slate-200 p-5"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <SectionHeader
            eyebrow="Exportacao"
            title="Compartilhe os registros"
            rightSlot={
              <Ionicons name="share-social-outline" size={20} color="#0F172A" />
            }
          />

          <View className="mt-4 flex-row gap-3">
            <ExportButton label="Dia" color="#0F766E" onPress={onExportDay} />
            <ExportButton label="Semana" color="#0284C7" onPress={onExportWeek} />
            <ExportButton label="Mes" color="#16A34A" onPress={onExportMonth} />
          </View>
        </View>

        <View className="mt-6">
          <SectionHeader eyebrow="Lista detalhada" title="Corridas registradas" />

          <View className="mt-4 gap-3">
            {rides.map((ride) => (
              <RideItem
                key={ride.id}
                ride={ride}
                onEdit={setEditing}
                onChanged={load}
                onDeleted={handleDeleted}
              />
            ))}

            {!loading && rides.length === 0 && (
              <EmptyState
                icon="calendar-clear-outline"
                title="Nenhuma corrida neste dia"
                description="Troque a data ou registre novas corridas para comparar desempenho."
              />
            )}
          </View>
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

function ExportButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center rounded-2xl px-3 py-4"
      style={{ backgroundColor: color }}
    >
      <Ionicons name="share-outline" size={16} color="#FFFFFF" />
      <Text className="ml-2 font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
