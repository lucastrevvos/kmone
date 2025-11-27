import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSettingsStore } from "@state/useSettingsStore";
import { Ionicons } from "@expo/vector-icons";

const ACCENT = "#10B981"; // Trevvos
const ACCENT_LIGHT = "#6EE7B7";

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
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-5">
      <View className="gap-5">
        <Text className="text-2xl font-bold">Configurações</Text>

        {/* Card */}
        <View className="rounded-3xl border border-slate-200 p-5 gap-4">
          {/* Meta diária bruta */}
          <View>
            <Text className="mb-2 text-slate-600">Meta diária bruta (R$)</Text>
            <View className="flex-row items-center rounded-2xl border border-slate-300 px-4 py-3">
              <Text className="text-base text-slate-500 mr-2">R$</Text>
              <TextInput
                keyboardType="numeric"
                value={metaBruta}
                onChangeText={setMetaBruta}
                placeholder="0,00"
                className="flex-1 text-2xl font-semibold"
              />
            </View>
            <Text className="text-xs text-slate-500 mt-1">Ex.: 250,00</Text>
          </View>

          {/* Meta mínima R$/km */}
          <View>
            <Text className="mb-2 text-slate-600">Meta mínima R$/km</Text>
            <TextInput
              keyboardType="numeric"
              value={metaRskm}
              onChangeText={setMetaRskm}
              placeholder="ex.: 2,50"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-2xl font-semibold"
            />
            <Text className="text-xs text-slate-500 mt-1">
              Quanto deseja ganhar por quilômetro.
            </Text>
          </View>

          {/* Presets rápidos (opcional) */}
          <View className="flex-row gap-2">
            {["2,00", "2,50", "3,00"].map((p) => (
              <Pressable
                key={p}
                onPress={() => setMetaRskm(p)}
                className="px-3 py-2 rounded-xl border"
                style={{ borderColor: ACCENT }}
              >
                <Text style={{ color: ACCENT, fontWeight: "600" }}>
                  {p} R$/km
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Botão Salvar */}
          <Pressable
            onPress={onSalvar}
            disabled={loading}
            className="flex-row items-center justify-center rounded-2xl px-5 py-4 active:opacity-90"
            style={{ backgroundColor: loading ? ACCENT_LIGHT : ACCENT }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text className="ml-2 text-white text-lg font-semibold">
              {loading ? "Salvando..." : "Salvar"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
