import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useFuelStore } from "@state/useFuelStore";
import { fuelRepo } from "@core/infra/asyncStorageRepos";
import type { Fuel } from "@core/infra/asyncStorageRepos";
import { money } from "@utils/format";
import EmptyState from "src/components/EmptyState";
import FieldCard from "src/components/FieldCard";
import FuelEditModal from "src/components/FuelEditModal";
import FuelItem from "src/components/FuelItem";
import MetricCard from "src/components/MetricCard";
import ScreenHero from "src/components/ScreenHero";
import SectionHeader from "src/components/SectionHeader";

const ACCENT = "#10B981";
const ACCENT_DARK = "#065F46";

export default function Abastecer() {
  const { fuels, loadToday, addFuel, loading } = useFuelStore();

  const [valor, setValor] = useState("");
  const [litros, setLitros] = useState("");
  const [tipo, setTipo] = useState<
    "gasolina" | "etanol" | "diesel" | undefined
  >(undefined);
  const [editing, setEditing] = useState<Fuel | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Fuel | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadToday();
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const totalFuel = fuels.reduce((sum, fuel) => sum + fuel.valor, 0);
  const totalLiters = fuels.reduce((sum, fuel) => sum + (fuel.litros ?? 0), 0);

  async function salvar() {
    const v = Number(valor.replace(",", "."));
    const l = litros ? Number(litros.replace(",", ".")) : undefined;
    if (!v || v <= 0) return;

    await addFuel({ valor: v, litros: l, tipo });
    setValor("");
    setLitros("");
    setTipo(undefined);
  }

  async function handleDeleted(fuel: Fuel) {
    setLastDeleted(fuel);
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
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pb-10 pt-5">
        <ScreenHero
          eyebrow="Controle de custo"
          title="Abastecimento"
          description="Registre abastecimentos para medir o custo real do seu dia."
          badge={`${fuels.length} lanc.`}
          backgroundColor={ACCENT_DARK}
          eyebrowColor="#BBF7D0"
          descriptionColor="#D1FAE5"
        />
        <View
          className="mt-4 rounded-[24px] px-5 py-5"
          style={{ backgroundColor: ACCENT_DARK }}
        >
          <View className="mt-5 flex-row flex-wrap justify-between">
            <MetricCard
              label="Total abastecido"
              value={money(totalFuel)}
              note="Hoje"
              variant="dark"
            />
            <MetricCard
              label="Litros"
              value={`${totalLiters.toFixed(1)} L`}
              note="Acumulado"
              variant="dark"
            />
          </View>
        </View>

        <View
          className="mt-6 rounded-[28px] border border-slate-200 p-5"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <SectionHeader
            eyebrow="Novo registro"
            title="Lancar abastecimento"
            rightSlot={<Ionicons name="water-outline" size={20} color="#0F172A" />}
          />

          <FieldCard label="Valor">
            <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
              <Text className="mr-2 text-base text-slate-500">R$</Text>
              <TextInput
                keyboardType="numeric"
                value={valor}
                onChangeText={setValor}
                placeholder="0,00"
                className="flex-1 text-2xl font-bold text-slate-900"
                editable={!loading}
              />
            </View>
          </FieldCard>

          <FieldCard label="Litros (opcional)">
            <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
              <TextInput
                keyboardType="numeric"
                value={litros}
                onChangeText={setLitros}
                placeholder="0,0"
                className="flex-1 text-lg font-semibold text-slate-900"
                editable={!loading}
              />
              <Text className="ml-2 text-base text-slate-500">L</Text>
            </View>
          </FieldCard>

          <View className="mt-4 flex-row gap-3">
            {(["gasolina", "etanol", "diesel"] as const).map((option) => {
              const active = tipo === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setTipo(option)}
                  className="flex-1 rounded-2xl px-3 py-3"
                  style={{
                    backgroundColor: active ? ACCENT : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: active ? ACCENT : "#CBD5E1",
                  }}
                >
                  <Text
                    className={`text-center font-semibold ${
                      active ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={salvar}
            disabled={loading}
            className="mt-5 flex-row items-center justify-center rounded-2xl px-5 py-4"
            style={{ backgroundColor: loading ? ACCENT : ACCENT_DARK }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text className="ml-2 text-base font-semibold text-white">
              {loading ? "Salvando..." : "Salvar abastecimento"}
            </Text>
          </Pressable>
        </View>

        <View className="mt-6">
          <SectionHeader eyebrow="Registros do dia" title="Abastecimentos" />

          <View className="mt-4 gap-3">
            {fuels.map((fuel) => (
              <FuelItem
                key={fuel.id}
                fuel={fuel}
                onEdit={setEditing}
                onChanged={loadToday}
                onDeleted={handleDeleted}
              />
            ))}

            {fuels.length === 0 && (
              <EmptyState
                icon="car-outline"
                title="Nenhum abastecimento hoje"
                description="Registre seus custos para acompanhar melhor o resultado liquido do dia."
              />
            )}
          </View>
        </View>

        {lastDeleted && (
          <View
            className="mt-5 flex-row items-center justify-between rounded-2xl border px-4 py-3"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
          >
            <Text className="text-slate-700">Abastecimento removido.</Text>
            <Pressable
              onPress={undoDelete}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: "#E8FFF5" }}
            >
              <Text className="font-semibold text-emerald-800">Desfazer</Text>
            </Pressable>
          </View>
        )}
      </View>

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
