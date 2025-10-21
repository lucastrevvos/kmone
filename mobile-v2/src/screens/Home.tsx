import { useRideStore } from "@state/useRideStore";
import { useFuelStore } from "@state/useFuelStore";
import { useSettingsStore } from "@state/useSettingsStore";
import { money, todayLocalISO } from "@utils/format";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";

export default function Home() {
  // stores
  const {
    rides,
    loading: loadingRides,
    loadToday: loadRides,
    addRide,
  } = useRideStore();
  const {
    fuels,
    loading: loadingFuels,
    loadToday: loadFuels,
    addFuel,
  } = useFuelStore();
  const {
    settings,
    loading: loadingSettings,
    load: loadSettings,
    save: saveSettings,
  } = useSettingsStore();

  // UI local
  const [km, setKm] = useState("");
  const [bruto, setBruto] = useState("");
  const [app, setApp] = useState<"Uber" | "99">("Uber");

  const [fuelModal, setFuelModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);

  // fields Abastecimento
  const [valorFuel, setValorFuel] = useState("");
  const [litros, setLitros] = useState("");
  const [tipo, setTipo] = useState<
    "gasolina" | "etanol" | "diesel" | undefined
  >(undefined);

  // fields Settings
  const [metaBruta, setMetaBruta] = useState(String(settings.metaDiariaBruta));
  const [metaRskm, setMetaRskm] = useState(String(settings.metaMinRSKm));

  useEffect(() => {
    // carrega tudo
    loadRides();
    loadFuels();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mantém inputs dos modais em sincronia quando abrir
  useEffect(() => {
    setMetaBruta(String(settings.metaDiariaBruta));
    setMetaRskm(String(settings.metaMinRSKm));
  }, [settings]);

  // Resumo
  const totalKm = rides.reduce((s, r) => s + r.kmRodado, 0);
  const totalBruto = rides.reduce((s, r) => s + r.receitaBruta, 0);
  const totalFuel = fuels.reduce((s, f) => s + f.valor, 0);
  const rsPorKm = totalKm > 0 ? totalBruto / totalKm : 0;
  const lucroLiquido = totalBruto - totalFuel;

  const abaixoMetaRSkm = rsPorKm > 0 && rsPorKm < settings.metaMinRSKm;
  const faltaPraMetaBruta = Math.max(0, settings.metaDiariaBruta - totalBruto);

  async function salvarRide() {
    const k = Number(km.replace(",", "."));
    const b = Number(bruto.replace(",", "."));
    if (!k || k <= 0 || b < 0) return;
    await addRide({ kmRodado: k, receitaBruta: b, app });
    setKm("");
    setBruto("");
  }

  async function salvarFuel() {
    const v = Number(valorFuel.replace(",", "."));
    const l = litros ? Number(litros.replace(",", ".")) : undefined;
    if (!v || v <= 0) return;
    await addFuel({ valor: v, litros: l, tipo });
    setValorFuel("");
    setLitros("");
    setTipo(undefined);
    setFuelModal(false);
  }

  async function salvarSettings() {
    const mb = Number(metaBruta.replace(",", "."));
    const mr = Number(metaRskm.replace(",", "."));
    if (mb < 0 || mr <= 0) return;
    await saveSettings({ metaDiariaBruta: mb, metaMinRSKm: mr });
    setSettingsModal(false);
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-5 gap-5">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-2xl font-semibold">KM One</Text>
          <Text className="text-xs text-slate-500">
            {Platform.OS} • hoje: {todayLocalISO()}
          </Text>
        </View>

        {/* ALERTA R$/km */}
        {abaixoMetaRSkm && (
          <View className="rounded-xl border border-amber-300 bg-amber-50 p-3">
            <Text className="text-amber-800">
              Atenção: R$/km ({rsPorKm.toFixed(2)}) abaixo da meta (
              {settings.metaMinRSKm.toFixed(2)}).
            </Text>
          </View>
        )}

        {/* Resumo do dia */}
        <View className="rounded-2xl border border-slate-200 p-4">
          <Text className="text-slate-500">Resumo do dia</Text>

          <View className="mt-2 flex-row justify-between">
            <Text>Bruto:</Text>
            <Text className="font-semibold">{money(totalBruto)}</Text>
          </View>

          <View className="mt-1 flex-row justify-between">
            <Text>Combustível:</Text>
            <Text className="font-semibold">{money(totalFuel)}</Text>
          </View>

          <View className="mt-1 flex-row justify-between">
            <Text>Km:</Text>
            <Text className="font-semibold">{totalKm.toFixed(2)} km</Text>
          </View>

          <View className="mt-1 flex-row justify-between">
            <Text>R$/km:</Text>
            <Text className="font-semibold">{rsPorKm.toFixed(2)}</Text>
          </View>

          <View className="mt-3 flex-row justify-between">
            <Text className="font-medium">Líquido do dia:</Text>
            <Text className="font-bold">{money(lucroLiquido)}</Text>
          </View>

          {/* Barra simples de meta bruta */}
          <View className="mt-3">
            <Text className="text-slate-600">
              Meta diária: {money(settings.metaDiariaBruta)}
            </Text>
            <View className="h-2 w-full bg-slate-200 rounded-full mt-2">
              <View
                className="h-2 bg-black rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    (totalBruto / Math.max(1, settings.metaDiariaBruta)) * 100
                  )}%`,
                }}
              />
            </View>
            {faltaPraMetaBruta > 0 && (
              <Text className="text-xs text-slate-500 mt-1">
                Faltam {money(faltaPraMetaBruta)} para bater a meta.
              </Text>
            )}
          </View>
        </View>

        {/* Formulário corrida */}
        <View className="rounded-2xl border border-slate-200 p-4 gap-3">
          <Text className="font-medium">Nova corrida</Text>

          <View>
            <Text className="mb-1">Km rodado</Text>
            <TextInput
              keyboardType="numeric"
              value={km}
              onChangeText={setKm}
              placeholder="ex.: 12.4"
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View>
            <Text className="mb-1 text-slate-700">Receita bruta (R$)</Text>
            <TextInput
              keyboardType="numeric"
              value={bruto}
              onChangeText={setBruto}
              placeholder="ex.: 28.00"
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View className="flex-row gap-2">
            {(["Uber", "99"] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setApp(opt)}
                className={`px-3 py-2 rounded-xl border ${
                  app === opt
                    ? "bg-black border-black"
                    : "bg-white border-slate-300"
                }`}
              >
                <Text className={app === opt ? "text-white" : "text-black"}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setFuelModal(true)}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
            >
              <Text className="text-center">+ Abastecimento</Text>
            </Pressable>
            <Pressable
              onPress={() => setSettingsModal(true)}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
            >
              <Text className="text-center">Configurações</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={salvarRide}
            disabled={loadingRides}
            className="mt-2 rounded-2xl bg-black px-4 py-3 active:opacity-80"
          >
            <Text className="text-center text-white font-medium">
              {loadingRides ? "Salvando..." : "Salvar corrida"}
            </Text>
          </Pressable>
        </View>

        {/* Lista de corridas */}
        <View className="gap-2">
          {rides.map((r) => (
            <View key={r.id} className="rounded-xl border border-slate-200 p-3">
              <Text className="font-medium">{r.app}</Text>
              <Text>
                {r.kmRodado.toFixed(2)} km • {money(r.receitaBruta)}
              </Text>
            </View>
          ))}
          {rides.length === 0 && (
            <Text className="text-slate-500">Sem corridas hoje.</Text>
          )}
        </View>

        {/* Lista de abastecimentos */}
        <View className="gap-2">
          {fuels.map((f) => (
            <View key={f.id} className="rounded-xl border border-slate-200 p-3">
              <Text className="font-medium">Abastecimento</Text>
              <Text>
                {money(f.valor)} {f.litros ? `• ${f.litros} L` : ""}{" "}
                {f.tipo ? `• ${f.tipo}` : ""}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Modal Abastecimento */}
      <Modal
        visible={fuelModal}
        animationType="slide"
        onRequestClose={() => setFuelModal(false)}
      >
        <ScrollView className="flex-1 bg-white p-5 gap-4">
          <Text className="text-xl font-semibold">Registrar abastecimento</Text>

          <View>
            <Text className="mb-1">Valor (R$)</Text>
            <TextInput
              keyboardType="numeric"
              value={valorFuel}
              onChangeText={setValorFuel}
              placeholder="ex.: 100.00"
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View>
            <Text className="mb-1">Litros (opcional)</Text>
            <TextInput
              keyboardType="numeric"
              value={litros}
              onChangeText={setLitros}
              placeholder="ex.: 20.5"
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View className="flex-row gap-2">
            {(["gasolina", "etanol", "diesel"] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setTipo(opt)}
                className={`px-3 py-2 rounded-xl border ${
                  tipo === opt
                    ? "bg-black border-black"
                    : "bg-white border-slate-300"
                }`}
              >
                <Text className={tipo === opt ? "text-white" : "text-black"}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row gap-2 mt-4">
            <Pressable
              onPress={() => setFuelModal(false)}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
            >
              <Text className="text-center">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={salvarFuel}
              className="flex-1 rounded-xl bg-black px-4 py-3"
            >
              <Text className="text-center text-white font-medium">Salvar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Modal>

      {/* Modal Configurações */}
      <Modal
        visible={settingsModal}
        animationType="slide"
        onRequestClose={() => setSettingsModal(false)}
      >
        <ScrollView className="flex-1 bg-white p-5 gap-4">
          <Text className="text-xl font-semibold">Configurações</Text>

          <View>
            <Text className="mb-1">Meta diária bruta (R$)</Text>
            <TextInput
              keyboardType="numeric"
              value={metaBruta}
              onChangeText={setMetaBruta}
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View>
            <Text className="mb-1">Meta mínima R$/km</Text>
            <TextInput
              keyboardType="numeric"
              value={metaRskm}
              onChangeText={setMetaRskm}
              className="border border-slate-300 rounded-xl px-3 py-2"
            />
          </View>

          <View className="flex-row gap-2 mt-4">
            <Pressable
              onPress={() => setSettingsModal(false)}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
            >
              <Text className="text-center">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={salvarSettings}
              className="flex-1 rounded-xl bg-black px-4 py-3"
            >
              <Text className="text-center text-white font-medium">Salvar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}
