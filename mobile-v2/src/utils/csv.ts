import type { Ride } from "@core/domain/types";

function toCSVValue(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // se tiver vírgula, aspas ou quebra de linha, cerca com aspas e escapa aspas internas
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function ridesToCSV(rides: Ride[]) {
  const header = ["data", "id", "app", "km_rodado", "receita_bruta", "obs"];
  const lines = [header.join(",")];

  for (const r of rides) {
    lines.push(
      [
        r.dataISO,
        r.id,
        r.app,
        r.kmRodado.toFixed(2),
        r.receitaBruta.toFixed(2),
        r.obs ?? "",
      ]
        .map(toCSVValue)
        .join(",")
    );
  }

  return lines.join("\n");
}
