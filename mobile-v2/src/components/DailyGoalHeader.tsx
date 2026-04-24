import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useFuelStore } from "@state/useFuelStore";
import { useRideStore } from "@state/useRideStore";
import { useSettingsStore } from "@state/useSettingsStore";
import { money } from "@utils/format";

type RouteKey = "Home" | "Histórico" | "Abastecer" | "Config";

const SCREEN_META: Record<
  RouteKey,
  {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    accentSoft: string;
  }
> = {
  Home: {
    title: "Painel",
    subtitle: "Operacao do dia",
    icon: "speedometer-outline",
    accent: "#047857",
    accentSoft: "#E8FFF5",
  },
  "Histórico": {
    title: "Historico",
    subtitle: "Analise de corridas",
    icon: "calendar-outline",
    accent: "#0369A1",
    accentSoft: "#E0F2FE",
  },
  Abastecer: {
    title: "Abastecimento",
    subtitle: "Controle de custo",
    icon: "flame-outline",
    accent: "#B45309",
    accentSoft: "#FEF3C7",
  },
  Config: {
    title: "Configuracoes",
    subtitle: "Metas e parametros",
    icon: "settings-outline",
    accent: "#475569",
    accentSoft: "#E2E8F0",
  },
};

export default function DailyGoalHeader({ routeName }: { routeName: string }) {
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

  const metrics = useMemo(() => {
    const totalKm = rides.reduce((sum, ride) => sum + ride.kmRodado, 0);
    const totalBruto = rides.reduce((sum, ride) => sum + ride.receitaBruta, 0);
    const totalFuel = fuels.reduce((sum, fuel) => sum + fuel.valor, 0);
    const totalLiters = fuels.reduce((sum, fuel) => sum + (fuel.litros ?? 0), 0);
    const totalRides = rides.length;
    const rsKm = totalKm > 0 ? totalBruto / totalKm : 0;
    const liquido = totalBruto - totalFuel;
    const falta = Math.max(0, settings.metaDiariaBruta - totalBruto);
    const pct = Math.min(
      100,
      (totalBruto / Math.max(1, settings.metaDiariaBruta)) * 100,
    );
    const abaixoMeta = rsKm > 0 && rsKm < settings.metaMinRSKm;

    return {
      totalKm,
      totalBruto,
      totalFuel,
      totalLiters,
      totalRides,
      rsKm,
      liquido,
      falta,
      pct,
      abaixoMeta,
    };
  }, [fuels, rides, settings]);

  const key = (SCREEN_META[routeName as RouteKey]
    ? routeName
    : "Home") as RouteKey;
  const meta = SCREEN_META[key];

  const content = getHeaderContent(key, metrics, settings);

  return (
    <View
      className="border-b border-slate-200 bg-slate-50 px-4 pb-3"
      style={{ paddingTop: insets.top + 6 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className="h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: meta.accentSoft }}
          >
            <Ionicons name={meta.icon} size={18} color={meta.accent} />
          </View>

          <View className="ml-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.4px] text-slate-400">
              {meta.subtitle}
            </Text>
            <Text className="text-xl font-bold text-slate-900">{meta.title}</Text>
          </View>
        </View>

        <View
          className="rounded-full px-3 py-2"
          style={{ backgroundColor: meta.accentSoft }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: meta.accent }}
          >
            {content.badge}
          </Text>
        </View>
      </View>

      <View className="mt-3 rounded-[22px] border border-slate-200 bg-white px-3 py-3">
        <View className="flex-row items-center justify-between">
          {content.cards.map((card, index) => (
            <View key={card.label} className="flex-1 items-center">
              <Text className="text-[11px] font-medium text-slate-400">
                {card.label}
              </Text>
              <Text
                className="mt-1 text-sm font-bold"
                style={{ color: card.tone === "warning" ? "#B45309" : "#0F172A" }}
              >
                {card.value}
              </Text>
              {index < content.cards.length - 1 && (
                <View
                  className="absolute right-0 top-1 h-8 w-px bg-slate-200"
                />
              )}
            </View>
          ))}
        </View>
      </View>

      <Text className="mt-2 px-1 text-xs text-slate-500">{content.helper}</Text>
    </View>
  );
}

function getHeaderContent(
  routeName: RouteKey,
  metrics: {
    totalKm: number;
    totalBruto: number;
    totalFuel: number;
    totalLiters: number;
    totalRides: number;
    rsKm: number;
    liquido: number;
    falta: number;
    pct: number;
    abaixoMeta: boolean;
  },
  settings: { metaDiariaBruta: number; metaMinRSKm: number },
) {
  switch (routeName) {
    case "Histórico":
      return {
        badge: `${metrics.totalRides} corridas`,
        cards: [
          { label: "Bruto", value: money(metrics.totalBruto) },
          { label: "Liquido", value: money(metrics.liquido) },
          { label: "Km", value: metrics.totalKm.toFixed(1) },
        ],
        helper: "Use esta area para comparar o resultado e revisar corridas registradas.",
      };

    case "Abastecer":
      return {
        badge: money(metrics.totalFuel),
        cards: [
          { label: "Hoje", value: money(metrics.totalFuel) },
          { label: "Litros", value: `${metrics.totalLiters.toFixed(1)} L` },
          { label: "Liquido", value: money(metrics.liquido) },
        ],
        helper: "O custo de combustivel afeta diretamente o resultado liquido do dia.",
      };

    case "Config":
      return {
        badge: `${settings.metaMinRSKm.toFixed(2)} R$/km`,
        cards: [
          { label: "Meta diaria", value: money(settings.metaDiariaBruta) },
          { label: "Meta km", value: settings.metaMinRSKm.toFixed(2) },
          { label: "Falta hoje", value: money(metrics.falta) },
        ],
        helper: "Ajuste suas metas para que o app consiga sinalizar corridas ruins e progresso do dia.",
      };

    case "Home":
    default:
      return {
        badge: metrics.pct >= 100 ? "Meta batida" : `${Math.round(metrics.pct)}%`,
        cards: [
          { label: "Bruto", value: money(metrics.totalBruto) },
          { label: "Km", value: metrics.totalKm.toFixed(1) },
          {
            label: "R$/km",
            value: metrics.rsKm.toFixed(2),
            tone: metrics.abaixoMeta ? ("warning" as const) : undefined,
          },
        ],
        helper:
          metrics.pct >= 100
            ? "Meta diaria concluida. Continue monitorando a qualidade das corridas."
            : `Faltam ${money(metrics.falta)} para a meta de hoje.`,
      };
  }
}
