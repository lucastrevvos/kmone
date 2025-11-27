import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useFuelStore } from "@state/useFuelStore";
import type { Fuel } from "@core/infra/asyncStorageRepos";
import { fuelRepo } from "@core/infra/asyncStorageRepos";
import FuelItem from "src/components/FuelItem";
import FuelEditModal from "src/components/FuelEditModal";

const ACCENT = "#10B981"; // Trevvos
const ACCENT_DARK = "#059669";

export default function Abastecer() {
  const { fuels, loadToday, addFuel, loading } = useFuelStore();

  const [valor, setValor] = useState("");
  const [litros, setLitros] = useState("");
  const [tipo, setTipo] = useState<
    "gasolina" | "etanol" | "diesel" | undefined
  >(undefined);

  const [editing, setEditing] = useState<Fuel | null>(null);

  // undo
  const [lastDeleted, setLastDeleted] = useState<Fuel | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadToday();
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
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

  // chamado pelo FuelItem após excluir
  async function handleDeleted(f: Fuel) {
    setLastDeleted(f);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setLastDeleted(null), 3500);
  }

  async function undoDelete() {
    if (!lastDeleted) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    await fuelRepo.create(lastDeleted);
    setLastDeleted(null);
    await loadToday();
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6 gap-6">
        {/* Header */}
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-2xl font-bold">Abastecimento</Text>
            <Text className="text-xs text-slate-500">
              Registre custos do dia
            </Text>
          </View>
        </View>

        {/* Card do formulário */}
        <View className="rounded-3xl border border-slate-200 p-5 gap-5">
          {/* Valor */}
          <View>
            <Text className="mb-2 text-slate-600">Valor</Text>
            <View className="flex-row items-center rounded-2xl border border-slate-300 px-4 py-3">
              <Text className="text-base text-slate-500 mr-2">R$</Text>
              <TextInput
                keyboardType="numeric"
                value={valor}
                onChangeText={setValor}
                placeholder="0,00"
                className="flex-1 text-2xl font-semibold"
                editable={!loading}
              />
            </View>
          </View>

          {/* Litros (opcional) */}
          <View>
            <Text className="mb-2 text-slate-600">Litros (opcional)</Text>
            <View className="flex-row items-center rounded-2xl border border-slate-300 px-4 py-3">
              <TextInput
                keyboardType="numeric"
                value={litros}
                onChangeText={setLitros}
                placeholder="0,0"
                className="flex-1 text-xl"
                editable={!loading}
              />
              <Text className="text-base text-slate-500 ml-2">L</Text>
            </View>
          </View>

          {/* Chips de tipo */}
          <View className="flex-row gap-3">
            {(["gasolina", "etanol", "diesel"] as const).map((opt) => {
              const active = tipo === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setTipo(opt)}
                  className={`px-4 py-3 rounded-2xl border ${
                    active ? "" : "bg-white border-slate-300"
                  }`}
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
                    {opt}
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
            style={{ backgroundColor: loading ? ACCENT_DARK : ACCENT }}
          >
            <Text className="text-white text-lg font-semibold">
              {loading ? "Salvando..." : "Salvar"}
            </Text>
          </Pressable>
        </View>

        {/* Lista do dia */}
        <View className="gap-2">
          {fuels.map((f) => (
            <FuelItem
              key={f.id}
              fuel={f}
              onEdit={setEditing}
              onChanged={loadToday}
              onDeleted={handleDeleted}
            />
          ))}
          {fuels.length === 0 && (
            <Text className="text-slate-500">Sem abastecimentos hoje.</Text>
          )}
        </View>

        {/* Snackbar de undo */}
        {lastDeleted && (
          <View className="mt-2 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Text>Abastecimento removido.</Text>
            <Pressable
              onPress={undoDelete}
              className="px-3 py-1 rounded-lg border"
              style={{ borderColor: ACCENT }}
            >
              <Text style={{ color: ACCENT, fontWeight: "600" }}>Desfazer</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Modal */}
      <FuelEditModal
        visible={!!editing}
        fuel={editing}
        onClose={() => {
          setEditing(null);
          loadToday();
        }}
      />
    </ScrollView>
  );
}
