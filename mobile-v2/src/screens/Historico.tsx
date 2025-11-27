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
import { rideRepo, fuelRepo } from "@core/infra/asyncStorageRepos";
import { money, todayLocalISO } from "@utils/format";
import { Ionicons } from "@expo/vector-icons";
import type { Ride } from "@core/domain/types";
import RideEditModal from "src/components/RideEditModal";
import RideItem from "src/components/RideItem";
import { exportDayCsv } from "src/features/export/exportDayCsv";

// para export por intervalo (sem criar arquivo novo)
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ridesToCSV } from "@utils/csv";

const ACCENT = "#10B981";

/** Helpers locais de data (ISO local YYYY-MM-DD) */
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
function weekRangeMonday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, (m || 1) - 1, d || 1, 12);
  // getDay(): 0=Dom … 6=Sáb ; vamos usar segunda como início
  const wd = (base.getDay() + 6) % 7; // 0 = segunda
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
  let cur = startISO;
  while (cur <= endISO) {
    yield cur;
    cur = addDaysLocal(cur, 1);
  }
}

/** Export CSV por intervalo (inline) */
async function exportRangeCsv(label: string, rides: Ride[]) {
  const csv = ridesToCSV(rides);
  const safe = label.replace(/[^\w-]+/g, "_");
  const filename = `kmone-rides-${safe}.csv`;
  const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
  const uri = `${dir}${filename}`;

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

/** Busca corridas num intervalo sem mudar a infra existente */
async function listRidesRange(
  startISO: string,
  endISO: string,
): Promise<Ride[]> {
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

  // novo: combustível do dia
  const [fuelDay, setFuelDay] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const uc = listRidesByDate(rideRepo);
      const list = await uc(dateISO);
      setRides(list);

      const fuels = await fuelRepo.listByDate(dateISO);
      setFuelDay(fuels.reduce((s, f) => s + f.valor, 0));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [dateISO]);

  const total = rides.reduce((s, r) => s + r.receitaBruta, 0);
  const km = rides.reduce((s, r) => s + r.kmRodado, 0);
  const liquido = total - fuelDay;
  const isToday = dateISO === todayLocalISO();
  const totalRides = rides.length;

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

  async function onExportWeek() {
    const { start, end } = weekRangeMonday(dateISO);
    const data = await listRidesRange(start, end);
    if (!data.length) {
      Alert.alert("Nada para exportar", "Não há corridas nesta semana.");
      return;
    }
    await exportRangeCsv(`semana-${start}_a_${end}`, data);
  }

  async function onExportMonth() {
    const { start, end } = monthRange(dateISO);
    const data = await listRidesRange(start, end);
    if (!data.length) {
      Alert.alert("Nada para exportar", "Não há corridas neste mês.");
      return;
    }
    await exportRangeCsv(`mes-${start.slice(0, 7)}`, data); // YYYY-MM
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

          <View className="flex-row gap-2">
            <Pressable
              onPress={onExportWeek}
              className="flex-row items-center gap-1 rounded-full px-3 py-2"
              style={{ backgroundColor: "#0EA5E9" }}
            >
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text className="text-white font-semibold">Semana</Text>
            </Pressable>

            <Pressable
              onPress={onExportMonth}
              className="flex-row items-center gap-1 rounded-full px-3 py-2"
              style={{ backgroundColor: "#10B981" }}
            >
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text className="text-white font-semibold">Mês</Text>
            </Pressable>

            <Pressable
              onPress={onExport}
              className="flex-row items-center gap-1 rounded-full px-3 py-2"
              style={{ backgroundColor: ACCENT }}
            >
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text className="text-white font-semibold">Dia</Text>
            </Pressable>
          </View>
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
            <Row label="Combustível" value={money(fuelDay)} />
            <Row label="Líquido" value={money(liquido)} />
            <Row label="Total de Corridas" value={String(totalRides)} />
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
