import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useSettingsStore } from "@state/useSettingsStore";
import FieldCard from "src/components/FieldCard";
import MetricCard from "src/components/MetricCard";
import ScreenHero from "src/components/ScreenHero";
import SectionHeader from "src/components/SectionHeader";

const ACCENT = "#10B981";
const ACCENT_DARK = "#065F46";

export default function Configuracoes() {
  const { settings, load, save, loading } = useSettingsStore();
  const [metaBruta, setMetaBruta] = useState(String(settings.metaDiariaBruta));
  const [metaRskm, setMetaRskm] = useState(String(settings.metaMinRSKm));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setMetaBruta(String(settings.metaDiariaBruta));
    setMetaRskm(String(settings.metaMinRSKm));
  }, [settings]);

  async function onSalvar() {
    const mb = Number(metaBruta.replace(",", "."));
    const mr = Number(metaRskm.replace(",", "."));
    if (mb < 0 || mr <= 0) return;
    await save({ metaDiariaBruta: mb, metaMinRSKm: mr });
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="px-5 pb-10 pt-5"
      showsVerticalScrollIndicator={false}
    >
      <ScreenHero
        eyebrow="Parametros de operacao"
        title="Configuracoes"
        description="Defina metas realistas para acompanhar se o dia esta rendendo bem."
        badge="METAS"
        backgroundColor="#0F172A"
      />

      <View className="mt-6 flex-row flex-wrap justify-between">
        <MetricCard
          label="Meta diaria"
          value={`R$ ${Number(settings.metaDiariaBruta).toFixed(2)}`}
          note="Objetivo bruto"
        />
        <MetricCard
          label="Meta minima"
          value={`${Number(settings.metaMinRSKm).toFixed(2)} R$/km`}
          note="Filtro de qualidade"
        />
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader
          eyebrow="Ajuste das metas"
          title="Regras do seu dia"
          rightSlot={<Ionicons name="options-outline" size={20} color="#0F172A" />}
        />

        <FieldCard
          label="Meta diaria bruta (R$)"
          helperText="Quanto voce quer faturar no dia antes dos custos."
        >
          <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
            <Text className="mr-2 text-base text-slate-500">R$</Text>
            <TextInput
              keyboardType="numeric"
              value={metaBruta}
              onChangeText={setMetaBruta}
              placeholder="0,00"
              className="flex-1 text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>

        <FieldCard
          label="Meta minima R$/km"
          helperText="Use esse valor para identificar quando a corrida esta pagando pouco."
        >
          <View className="rounded-[22px] border border-slate-300 px-4 py-3">
            <TextInput
              keyboardType="numeric"
              value={metaRskm}
              onChangeText={setMetaRskm}
              placeholder="2,50"
              className="text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>

        <View className="mt-5">
          <Text className="mb-2 text-sm font-medium text-slate-600">
            Sugestoes rapidas
          </Text>
          <View className="flex-row gap-3">
            {["2,00", "2,50", "3,00"].map((preset) => {
              const active = metaRskm === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setMetaRskm(preset)}
                  className="rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: active ? "#E8FFF5" : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: active ? ACCENT : "#CBD5E1",
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: active ? "#047857" : "#334155" }}
                  >
                    {preset} R$/km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={onSalvar}
          disabled={loading}
          className="mt-6 flex-row items-center justify-center rounded-2xl px-5 py-4"
          style={{ backgroundColor: loading ? ACCENT : ACCENT_DARK }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text className="ml-2 text-base font-semibold text-white">
            {loading ? "Salvando..." : "Salvar configuracoes"}
          </Text>
        </Pressable>
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader eyebrow="Como usar" title="Leitura das metas" />
        <Text className="mt-3 text-sm text-slate-600">
          A meta diaria ajuda a medir o tamanho do faturamento. A meta minima
          por quilometro serve para identificar corridas ruins mesmo quando o
          bruto parece bom.
        </Text>
      </View>
    </ScrollView>
  );
}
