import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFuelStore } from "@state/useFuelStore";
import { money } from "@utils/format";
import { Ionicons } from "@expo/vector-icons";

const ACCENT = "#10B981"; // Trevvos
const ACCENT_DARK = "#059669"; // ativo/pressed

export default function Abastecer() {
  const { fuels, loadToday, addFuel, loading } = useFuelStore();
  const [valor, setValor] = useState("");
  const [litros, setLitros] = useState("");
  const [tipo, setTipo] = useState<
    "gasolina" | "etanol" | "diesel" | undefined
  >(undefined);

  useEffect(() => {
    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar() {
    const v = Number(valor.replace(",", "."));
    const l = litros ? Number(litros.replace(",", ".")) : undefined;
    if (!v || v <= 0) return;
    await addFuel({ valor: v, litros: l, tipo });
    setValor("");
    setLitros("");
    setTipo(undefined);
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="p-5"
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadToday} />
      }
    >
      <View className="gap-5">
        <Text className="text-2xl font-bold">Abastecimento</Text>

        {/* Card do formulário */}
        <View className="rounded-3xl border border-slate-200 p-5 gap-4">
          {/* Valor */}
          <View>
            <Text className="mb-2 text-slate-600">Valor (R$)</Text>
            <View className="flex-row items-center rounded-2xl border border-slate-300 px-4 py-3">
              <Text className="text-base text-slate-500 mr-2">R$</Text>
              <TextInput
                keyboardType="numeric"
                value={valor}
                onChangeText={setValor}
                placeholder="0,00"
                className="flex-1 text-2xl font-semibold"
              />
            </View>
          </View>

          {/* Litros */}
          <View>
            <Text className="mb-2 text-slate-600">Litros (opcional)</Text>
            <TextInput
              keyboardType="numeric"
              value={litros}
              onChangeText={setLitros}
              placeholder="0,0"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-lg"
            />
          </View>

          {/* Tipo (chips) */}
          <View className="flex-row gap-3">
            {(["gasolina", "etanol", "diesel"] as const).map((opt) => {
              const active = tipo === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setTipo(opt)}
                  className="px-4 py-3 rounded-2xl border"
                  style={{
                    backgroundColor: active ? ACCENT : "white",
                    borderColor: active ? ACCENT : "#CBD5E1",
                    shadowColor: active ? ACCENT : "#000",
                    shadowOpacity: active ? 0.25 : 0.08,
                    shadowRadius: active ? 6 : 4,
                    elevation: active ? 3 : 1,
                  }}
                >
                  <Text
                    className={`font-medium ${
                      active ? "text-white" : "text-black"
                    }`}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Botão salvar */}
          <Pressable
            onPress={salvar}
            disabled={loading}
            className="flex-row items-center justify-center rounded-2xl px-5 py-4 active:opacity-90"
            style={{ backgroundColor: loading ? "#6EE7B7" : ACCENT }}
          >
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text className="ml-2 text-white text-lg font-semibold">
              {loading ? "Salvando..." : "Salvar"}
            </Text>
          </Pressable>
        </View>

        {/* Lista do dia */}
        <View className="gap-2 mt-1">
          {fuels.map((f) => (
            <View
              key={f.id}
              className="rounded-2xl border border-slate-200 p-4"
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
                    {f.tipo ? f.tipo : "Combustível"}
                  </Text>
                </View>
                {f.litros ? (
                  <Text className="text-slate-500 text-xs">{f.litros} L</Text>
                ) : (
                  <Text className="text-slate-500 text-xs">—</Text>
                )}
              </View>
              <Text className="text-base font-semibold">{money(f.valor)}</Text>
            </View>
          ))}

          {fuels.length === 0 && (
            <View className="items-center py-10">
              <Ionicons name="apps-outline" size={28} color="#94A3B8" />
              <Text className="text-slate-500 mt-2">
                Sem abastecimentos hoje.
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
