const UNIT_VALUES: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
};

const TEEN_VALUES: Record<string, number> = {
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezasseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  dezanove: 19,
};

const TENS_VALUES: Record<string, number> = {
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
};

const HUNDREDS_VALUES: Record<string, number> = {
  cem: 100,
  cento: 100,
  duzentos: 200,
  trezentos: 300,
  quatrocentos: 400,
  quinhentos: 500,
  seiscentos: 600,
  setecentos: 700,
  oitocentos: 800,
  novecentos: 900,
};

const FILLER_WORDS = new Set([
  "e",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "por",
  "aproximadamente",
  "cerca",
]);

function normalizeSpeech(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/r\$/g, " ")
    .replace(/[^\d.,a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumericChunk(chunk: string, centsOnly = false): number | null {
  const sanitized = chunk.replace(/[^\d.,]/g, "");
  if (!sanitized) return null;

  if (centsOnly) {
    const digits = sanitized.replace(/\D/g, "");
    if (!digits) return null;
    return Number(digits.slice(0, 2));
  }

  if (sanitized.includes(",") && sanitized.includes(".")) {
    const parsed = Number(sanitized.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (sanitized.includes(",")) {
    const lastComma = sanitized.lastIndexOf(",");
    const integerPart = sanitized.slice(0, lastComma).replace(/,/g, "");
    const decimalPart = sanitized.slice(lastComma + 1);
    const parsed = Number(`${integerPart || "0"}.${decimalPart}`);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (sanitized.includes(".")) {
    const lastDot = sanitized.lastIndexOf(".");
    const decimalPart = sanitized.slice(lastDot + 1);

    if (decimalPart.length <= 2) {
      const integerPart = sanitized.slice(0, lastDot).replace(/\./g, "");
      const parsed = Number(`${integerPart || "0"}.${decimalPart}`);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(sanitized.replace(/\./g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseWordNumber(chunk: string): number | null {
  const tokens = normalizeSpeech(chunk).split(" ").filter(Boolean);
  if (!tokens.length) return null;

  let total = 0;
  let current = 0;
  let consumed = false;

  for (const token of tokens) {
    if (FILLER_WORDS.has(token)) continue;

    if (UNIT_VALUES[token] !== undefined) {
      current += UNIT_VALUES[token];
      consumed = true;
      continue;
    }

    if (TEEN_VALUES[token] !== undefined) {
      current += TEEN_VALUES[token];
      consumed = true;
      continue;
    }

    if (TENS_VALUES[token] !== undefined) {
      current += TENS_VALUES[token];
      consumed = true;
      continue;
    }

    if (HUNDREDS_VALUES[token] !== undefined) {
      current += HUNDREDS_VALUES[token];
      consumed = true;
      continue;
    }

    if (token === "mil") {
      total += (current || 1) * 1000;
      current = 0;
      consumed = true;
      continue;
    }

    if (/^\d+$/.test(token)) {
      current += Number(token);
      consumed = true;
      continue;
    }
  }

  if (!consumed) return null;
  return total + current;
}

function parseMoneyWithCurrencyLabels(text: string): number | null {
  const normalized = normalizeSpeech(text);
  const reaisMatch = normalized.match(/(.+?)\s+(real|reais)\b/);
  const centsMatch = normalized.match(/(.+?)\s+centavos?\b/);

  const reaisValue = reaisMatch
    ? parseNumericChunk(reaisMatch[1]) ?? parseWordNumber(reaisMatch[1])
    : 0;

  let centsValue = 0;

  if (centsMatch) {
    const centsSource = centsMatch[1].split(/\b(real|reais)\b/).pop() ?? "";
    centsValue =
      parseNumericChunk(centsSource, true) ?? parseWordNumber(centsSource) ?? 0;
  } else if (reaisMatch) {
    const remainder = normalized.slice(reaisMatch[0].length).trim();
    const parsedRemainder = parseWordNumber(remainder);
    if (parsedRemainder !== null && parsedRemainder >= 0 && parsedRemainder < 100) {
      centsValue = parsedRemainder;
    }
  }

  if (!reaisMatch && !centsMatch) return null;
  return Number(((reaisValue || 0) + centsValue / 100).toFixed(2));
}

export function parseSpokenMoney(text: string): number | null {
  const normalized = normalizeSpeech(text);
  if (!normalized) return null;

  const labeledValue = parseMoneyWithCurrencyLabels(normalized);
  if (labeledValue !== null && labeledValue > 0) {
    return labeledValue;
  }

  const numericMatches = normalized.match(/\d[\d.,]*/g) ?? [];
  if (numericMatches.length === 1) {
    const firstMatch = numericMatches[0];
    if (!firstMatch) return null;

    const parsed = parseNumericChunk(firstMatch);
    if (parsed !== null && parsed > 0) return Number(parsed.toFixed(2));
  }

  if (numericMatches.length >= 2) {
    const [wholeChunk, centsChunk] = numericMatches;
    if (!wholeChunk || !centsChunk) return null;

    const whole = parseNumericChunk(wholeChunk);
    const cents = parseNumericChunk(centsChunk, true);
    if (whole !== null && cents !== null && whole > 0) {
      return Number((whole + cents / 100).toFixed(2));
    }
  }

  const wordValue = parseWordNumber(normalized);
  if (wordValue !== null && wordValue > 0) {
    return Number(wordValue.toFixed(2));
  }

  return null;
}

export function formatMoneyInputValue(value: number) {
  return value.toFixed(2).replace(".", ",");
}
