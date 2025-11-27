import { View, Text } from "react-native";
import { useEffect, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRideStore } from "@state/useRideStore";
import { useFuelStore } from "@state/useFuelStore";
import { useSettingsStore } from "@state/useSettingsStore";
import { money, todayLocalISO } from "@utils/format";

const ACCENT = "#10B981"; // Trevvos
const ACCENT_OK = "#059669"; // quando bate meta

export default function DailyGoalHeader() {
  const insets = useSafeAreaInsets();

  const { rides, loadToday: loadRides } = useRideStore();
  const { fuels, loadToday: loadFuels } = useFuelStore();
  const { settings, load: loadSettings } = useSettingsStore();

  useEffect(() => {
    loadRides();
    loadFuels();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { totalKm, totalBruto, totalFuel, rsKm, abaixoMeta, pct, falta } =
    useMemo(() => {
      const totalKm = rides.reduce((s, r) => s + r.kmRodado, 0);
      const totalBruto = rides.reduce((s, r) => s + r.receitaBruta, 0);
      const totalFuel = fuels.reduce((s, f) => s + f.valor, 0);
      const rsKm = totalKm > 0 ? totalBruto / totalKm : 0;
      const abaixoMeta = rsKm > 0 && rsKm < settings.metaMinRSKm;
      const pct = Math.min(
        100,
        (totalBruto / Math.max(1, settings.metaDiariaBruta)) * 100,
      );
      const falta = Math.max(0, settings.metaDiariaBruta - totalBruto);
      return { totalKm, totalBruto, totalFuel, rsKm, abaixoMeta, pct, falta };
    }, [rides, fuels, settings]);

  const hit = pct >= 100;

  return (
    <View
      className="bg-neutral-200 border-b border-slate-200"
      style={{
        paddingTop: insets.top + 10,
        paddingBottom: 12,
        paddingHorizontal: 18,
      }}
    >
      {/* Linha 1: branding + resumo */}
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-slate-500">kmone.trevvos.com.br</Text>
        <Text className="text-2xl text-slate-600">
          Bruto <Text className="font-semibold">{money(totalBruto)}</Text> • Km{" "}
          <Text className="font-semibold">{totalKm.toFixed(1)}</Text>
        </Text>
      </View>

      {/* Alerta R$/km */}
      {abaixoMeta && (
        <View className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
          <Text className="text-amber-800 text-[12px]">
            R$/km {rsKm.toFixed(2)} abaixo da meta{" "}
            {settings.metaMinRSKm.toFixed(2)}
          </Text>
        </View>
      )}

      {/* Meta diária */}
      <View className="mt-3">
        <View className="flex-row justify-between mb-1">
          <Text className="text-xl text-slate-700">Meta diária</Text>
          <Text className="text-xl font-semibold text-slate-800">
            {hit ? "Meta batida 🎯" : `Faltam ${money(falta)}`}
          </Text>
        </View>

        <View className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
          <View
            className="h-4 rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: hit ? ACCENT_OK : ACCENT,
            }}
          />
        </View>

        <View className="mt-1.5 flex-row justify-between">
          <Text className="text-[18px] text-slate-500">
            Combustível: {money(totalFuel)}
          </Text>
          <Text
            className={`text-[18px] ${
              abaixoMeta ? "text-amber-700" : "text-slate-600"
            }`}
          >
            R$/km: {rsKm.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}
