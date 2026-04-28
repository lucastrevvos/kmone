export type NormalizedDistanceKm = {
  raw: unknown;
  rawType: string;
  source?: string;
  normalizedKm: number | null;
  reason?:
    | "missing"
    | "empty"
    | "parse_failed"
    | "not_finite"
    | "negative"
    | "zero";
};

function parseLooseNumber(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const withoutUnit = trimmed.replace(/km\b/g, "").trim();
  if (!withoutUnit) return null;

  const numericText = withoutUnit.replace(/[^\d,.-]/g, "");
  if (!numericText) return null;

  let normalizedText = numericText;
  const lastComma = normalizedText.lastIndexOf(",");
  const lastDot = normalizedText.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalizedText = normalizedText.replace(/\./g, "").replace(",", ".");
    } else {
      normalizedText = normalizedText.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    normalizedText = normalizedText.replace(",", ".");
  }

  const parsed = Number(normalizedText);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDistanceKm(
  value: unknown,
  source?: string,
): NormalizedDistanceKm {
  const rawType = value === null ? "null" : typeof value;

  if (value === null || value === undefined) {
    return { raw: value, rawType, source, normalizedKm: null, reason: "missing" };
  }

  let parsed: number | null = null;

  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string") {
    if (!value.trim()) {
      return { raw: value, rawType, source, normalizedKm: null, reason: "empty" };
    }
    parsed = parseLooseNumber(value);
    if (parsed === null) {
      return {
        raw: value,
        rawType,
        source,
        normalizedKm: null,
        reason: "parse_failed",
      };
    }
  } else {
    return {
      raw: value,
      rawType,
      source,
      normalizedKm: null,
      reason: "parse_failed",
    };
  }

  if (!Number.isFinite(parsed)) {
    return {
      raw: value,
      rawType,
      source,
      normalizedKm: null,
      reason: "not_finite",
    };
  }

  if (parsed < 0) {
    return {
      raw: value,
      rawType,
      source,
      normalizedKm: null,
      reason: "negative",
    };
  }

  if (parsed === 0) {
    return {
      raw: value,
      rawType,
      source,
      normalizedKm: 0,
      reason: "zero",
    };
  }

  return {
    raw: value,
    rawType,
    source,
    normalizedKm: parsed,
  };
}

export function getDistanceValidationMessage(result: NormalizedDistanceKm) {
  if (result.reason === "zero") {
    return "Nao foi possivel calcular a distancia percorrida.";
  }

  return "Nao conseguimos calcular a distancia. Verifique se o GPS estava ativo ou informe o km manualmente.";
}
