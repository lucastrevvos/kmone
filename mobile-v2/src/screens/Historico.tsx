import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { listRidesByDate } from "@core/usecases/listRidesByDate";
import { AsyncRideRepo } from "@core/infra/asyncStorageRepos";
import { money } from "@utils/format";
import { Ionicons } from "@expo/vector-icons";

const repo = AsyncRideRepo();
const ACCENT = "#10B981"; // Trevvos
const ACCENT_DARK = "#059669"; // pressionado

function addDays(dateISO: string, delta: number) {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function Historico() {
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const uc = listRidesByDate(repo);
      const list = await uc(dateISO);
      setRides(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO]);

  const total = rides.reduce((s, r) => s + r.receitaBruta, 0);
  const km = rides.reduce((s, r) => s + r.kmRodado, 0);

  const isToday = dateISO === new Date().toISOString().slice(0, 10);

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      contentContainerClassName="p-5"
    >
      <View className="gap-4">
        <Text className="text-2xl font-bold">Histórico</Text>

        {/* Navegação por data */}
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => setDateISO(addDays(dateISO, -1))}
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
                onPress={() =>
                  setDateISO(new Date().toISOString().slice(0, 10))
                }
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
            onPress={() => setDateISO(addDays(dateISO, +1))}
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

        {/* Resumo do dia */}
        <View className="rounded-3xl border border-slate-200 p-4">
          <Text className="text-slate-500 mb-2">Resumo</Text>
          <View className="gap-2">
            <Row label="Bruto" value={money(total)} />
            <Row label="Km" value={`${km.toFixed(2)} km`} />
          </View>
        </View>

        {/* Lista de corridas */}
        <View className="gap-2">
          {rides.map((r) => (
            <View
              key={r.id}
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
                  <Text
                    style={{ color: ACCENT, fontSize: 12, fontWeight: "600" }}
                  >
                    {r.app}
                  </Text>
                </View>
                <Text className="text-slate-500 text-xs">{dateISO}</Text>
              </View>
              <Text className="text-base">
                <Text className="font-semibold">
                  {r.kmRodado.toFixed(2)} km
                </Text>
                <Text> • </Text>
                <Text className="font-semibold">{money(r.receitaBruta)}</Text>
              </Text>
            </View>
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
    </ScrollView>
  );
}

/** Linha de resumo com leve destaque no valor */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-slate-700">{label}</Text>
      <Text className="font-semibold">{value}</Text>
    </View>
  );
}
