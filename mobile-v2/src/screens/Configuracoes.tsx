import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useSettingsStore } from "@state/useSettingsStore";
import { useOfferRadarStore } from "@state/useOfferRadarStore";
import FieldCard from "src/components/FieldCard";
import MetricCard from "src/components/MetricCard";
import ScreenHero from "src/components/ScreenHero";
import SectionHeader from "src/components/SectionHeader";

const ACCENT = "#10B981";
const ACCENT_DARK = "#065F46";

export default function Configuracoes() {
  const { settings, load, save, loading } = useSettingsStore();
  const {
    supported,
    readiness,
    sync: syncOfferRadar,
    requestOverlayPermission,
    requestAccessibilityPermission,
    requestScreenCapturePermission,
  } = useOfferRadarStore();
  const [metaBruta, setMetaBruta] = useState(String(settings.metaDiariaBruta));
  const [metaRskm, setMetaRskm] = useState(String(settings.metaMinRSKm));
  const [radarValor, setRadarValor] = useState(String(settings.radarMinValor));
  const [radarRskm, setRadarRskm] = useState(String(settings.radarMinRSKm));
  const [radarRshora, setRadarRshora] = useState(
    String(settings.radarMinRSHora),
  );
  const allRadarReady =
    readiness.overlayPermissionGranted &&
    readiness.accessibilityPermissionGranted &&
    readiness.screenCapturePermissionGranted;

  useEffect(() => {
    load();
    syncOfferRadar();
  }, []);

  useEffect(() => {
    setMetaBruta(String(settings.metaDiariaBruta));
    setMetaRskm(String(settings.metaMinRSKm));
    setRadarValor(String(settings.radarMinValor));
    setRadarRskm(String(settings.radarMinRSKm));
    setRadarRshora(String(settings.radarMinRSHora));
  }, [settings]);

  async function onSalvar() {
    const mb = Number(metaBruta.replace(",", "."));
    const mr = Number(metaRskm.replace(",", "."));
    const rv = Number(radarValor.replace(",", "."));
    const rrk = Number(radarRskm.replace(",", "."));
    const rrh = Number(radarRshora.replace(",", "."));

    if (mb < 0 || mr <= 0 || rv <= 0 || rrk <= 0 || rrh <= 0) {
      Alert.alert("Valores invalidos", "Preencha criterios validos para o radar.");
      return;
    }

    await save({
      metaDiariaBruta: mb,
      metaMinRSKm: mr,
      radarMinValor: rv,
      radarMinRSKm: rrk,
      radarMinRSHora: rrh,
    });
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
        <SectionHeader eyebrow="Radar de corrida" title="Criterios de aceitacao" />

        <FieldCard
          label="Valor minimo da corrida (R$)"
          helperText="Abaixo disso o radar tende a marcar como ruim."
        >
          <View className="flex-row items-center rounded-[22px] border border-slate-300 px-4 py-3">
            <Text className="mr-2 text-base text-slate-500">R$</Text>
            <TextInput
              keyboardType="numeric"
              value={radarValor}
              onChangeText={setRadarValor}
              placeholder="10,00"
              className="flex-1 text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>

        <FieldCard
          label="Minimo R$/km"
          helperText="Compara o valor da oferta com a distancia estimada."
        >
          <View className="rounded-[22px] border border-slate-300 px-4 py-3">
            <TextInput
              keyboardType="numeric"
              value={radarRskm}
              onChangeText={setRadarRskm}
              placeholder="2,00"
              className="text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>

        <FieldCard
          label="Minimo R$/hora"
          helperText="Leva em conta valor e tempo estimado da corrida."
        >
          <View className="rounded-[22px] border border-slate-300 px-4 py-3">
            <TextInput
              keyboardType="numeric"
              value={radarRshora}
              onChangeText={setRadarRshora}
              placeholder="25,00"
              className="text-2xl font-bold text-slate-900"
            />
          </View>
        </FieldCard>
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
        <Text className="mt-3 text-sm text-slate-600">
          O radar combina valor minimo, R$/km e R$/hora para marcar a oferta
          como aceitar, talvez ou recusar.
        </Text>
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader eyebrow="Onboarding" title="Checklist do radar" />
        <Text className="mt-3 text-sm text-slate-600">
          Revise este bloco sempre que o radar parar de ler ofertas. A permissao
          de captura de tela e a que mais costuma se perder.
        </Text>

        <View className="mt-4 gap-3">
          <SetupCard
            title="Overlay sobre outros apps"
            description="Permite mostrar o popup por cima do Uber e 99."
            done={readiness.overlayPermissionGranted}
            actionLabel="Ativar overlay"
            onPress={requestOverlayPermission}
          />
          <SetupCard
            title="Acessibilidade"
            description="Ajuda o app a perceber estados da interface."
            done={readiness.accessibilityPermissionGranted}
            actionLabel="Ativar acessibilidade"
            onPress={requestAccessibilityPermission}
          />
          <SetupCard
            title="Captura de tela"
            description="Obrigatoria para o OCR. Se desligar, o radar para de capturar oferta."
            done={readiness.screenCapturePermissionGranted}
            actionLabel="Reativar captura"
            onPress={requestScreenCapturePermission}
            danger={!readiness.screenCapturePermissionGranted}
          />
        </View>
      </View>

      <View
        className="mt-6 rounded-[28px] border border-slate-200 p-5"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <SectionHeader eyebrow="Fase 2 Android" title="Overlay flutuante" />
        <Text className="mt-3 text-sm text-slate-600">
          Esta etapa prepara a leitura automatica sobre Uber e 99 com overlay,
          acessibilidade e captura de tela no Android.
        </Text>

        {!allRadarReady && (
          <View
            className="mt-4 rounded-[22px] border border-red-200 bg-red-50 px-4 py-4"
          >
            <Text className="text-sm font-semibold text-red-700">
              Radar incompleto
            </Text>
            <Text className="mt-1 text-sm text-red-700">
              Enquanto alguma permissao estiver pendente, o popup pode falhar ou parar de atualizar.
            </Text>
          </View>
        )}

        <View className="mt-4 flex-row flex-wrap justify-between">
          <MetricCard
            label="Suporte"
            value={supported ? "Android" : "Indisponivel"}
            note="Bridge preparada"
          />
          <MetricCard
            label="Overlay"
            value={readiness.overlayPermissionGranted ? "OK" : "Pendente"}
            note="Sobre outros apps"
          />
          <MetricCard
            label="Acessibilidade"
            value={readiness.accessibilityPermissionGranted ? "OK" : "Pendente"}
            note="Leitura da UI"
          />
          <MetricCard
            label="Captura"
            value={readiness.screenCapturePermissionGranted ? "OK" : "Pendente"}
            note="OCR/MediaProjection"
          />
        </View>

        <View className="mt-4 gap-3">
          <Pressable
            onPress={requestOverlayPermission}
            className="rounded-2xl border border-slate-300 px-4 py-4"
          >
            <Text className="font-semibold text-slate-700">
              Solicitar permissao de overlay
            </Text>
          </Pressable>
          <Pressable
            onPress={requestAccessibilityPermission}
            className="rounded-2xl border border-slate-300 px-4 py-4"
          >
            <Text className="font-semibold text-slate-700">
              Solicitar permissao de acessibilidade
            </Text>
          </Pressable>
          <Pressable
            onPress={requestScreenCapturePermission}
            className="rounded-2xl border border-slate-300 px-4 py-4"
            style={{
              backgroundColor: readiness.screenCapturePermissionGranted
                ? "#FFFFFF"
                : "#FEF2F2",
              borderColor: readiness.screenCapturePermissionGranted
                ? "#CBD5E1"
                : "#FCA5A5",
            }}
          >
            <Text
              className="font-semibold"
              style={{
                color: readiness.screenCapturePermissionGranted
                  ? "#334155"
                  : "#B91C1C",
              }}
            >
              {readiness.screenCapturePermissionGranted
                ? "Revisar permissao de captura"
                : "Reativar permissao de captura"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function SetupCard({
  title,
  description,
  done,
  actionLabel,
  onPress,
  danger = false,
}: {
  title: string;
  description: string;
  done: boolean;
  actionLabel: string;
  onPress: () => void | Promise<unknown>;
  danger?: boolean;
}) {
  return (
    <View
      className="rounded-[22px] border px-4 py-4"
      style={{
        backgroundColor: done ? "#F0FDF4" : danger ? "#FEF2F2" : "#F8FAFC",
        borderColor: done ? "#BBF7D0" : danger ? "#FECACA" : "#E2E8F0",
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-slate-900">{title}</Text>
          <Text className="mt-1 text-sm text-slate-500">{description}</Text>
        </View>

        <View
          className="rounded-full px-3 py-2"
          style={{ backgroundColor: done ? "#166534" : danger ? "#B91C1C" : "#334155" }}
        >
          <Text className="text-xs font-semibold text-white">
            {done ? "OK" : "PENDENTE"}
          </Text>
        </View>
      </View>

      {!done && (
        <Pressable
          onPress={onPress}
          className="mt-4 items-center justify-center rounded-2xl px-4 py-3"
          style={{ backgroundColor: danger ? "#B91C1C" : "#0F172A" }}
        >
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
