import type { Settings } from "@core/domain/types";

export type RideRadarResult = {
  status: "aceitar" | "talvez" | "recusar";
  rsKm: number;
  rsHora: number;
  score: number;
  reasons: string[];
};

export function evaluateRideRadar(input: {
  valor: number;
  km: number;
  minutos: number;
  settings: Settings;
}): RideRadarResult {
  const { valor, km, minutos, settings } = input;
  const safeKm = km > 0 ? km : 0.01;
  const safeMinutes = minutos > 0 ? minutos : 1;

  const rsKm = valor / safeKm;
  const rsHora = valor / (safeMinutes / 60);
  const reasons: string[] = [];
  const minValor = settings.radarMinValor;
  const minRsKm = settings.radarMinRSKm;
  const minRsHora = settings.radarMinRSHora;

  const passesValor = valor >= minValor;
  const passesRsKm = rsKm >= minRsKm;
  const passesRsHora = rsHora >= minRsHora;

  const nearValor = valor >= minValor * 0.7;
  const nearRsKm = rsKm >= minRsKm * 0.9;
  const nearRsHora = rsHora >= minRsHora * 0.85;

  const hardReject =
    rsKm < minRsKm * 0.85 ||
    (valor < minValor * 0.6 && rsHora < minRsHora * 0.8);

  const strongAccept =
    passesRsKm && rsHora >= minRsHora * 0.9 && valor >= minValor * 0.7;

  let status: RideRadarResult["status"];

  if (hardReject) {
    status = "recusar";
  } else if (strongAccept) {
    status = "aceitar";
  } else if (nearRsKm && (nearRsHora || nearValor)) {
    status = "talvez";
  } else {
    status = "recusar";
  }

  if (!passesValor) reasons.push(`Valor abaixo de ${minValor.toFixed(2)}`);
  if (!passesRsKm) reasons.push(`R$/km abaixo de ${minRsKm.toFixed(2)}`);
  if (!passesRsHora) reasons.push(`R$/hora abaixo de ${minRsHora.toFixed(2)}`);

  if (status === "aceitar") {
    reasons.push("Bom retorno por km e por tempo para aceitar");
  } else if (status === "talvez") {
    reasons.push("Oferta proxima dos criterios, analise demanda e regiao");
  } else if (hardReject) {
    reasons.push("Retorno fraco para a distancia ou tempo estimado");
  }

  const score =
    status === "aceitar" ? 3 : status === "talvez" ? 2 : 1;

  return { status, rsKm, rsHora, score, reasons };
}
