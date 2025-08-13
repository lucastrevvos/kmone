import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

type CorridaInput = {
  valorRecebido: number;
  kmRodado: number;
  litrosAbastecidos?: number;
};

type Corrida = {
  id: string;
  valorRecebido: number;
  kmRodado: number;
  litrosAbastecidos?: number;
  rsPorKm: number;
  lucroLiquido: number;
  createdAt: string;
};

type StorageData = {
  precoLitro: number | null;
  consumoKmPorLitro: number | null;
  corridas: Corrida[];
  //abastecimentos: Abastecimento[];
};

const __filename = fileURLToPath(import.meta.url);
const __direname = path.dirname(__filename);
const DATA_DIR = path.resolve(__direname, "../var");
const DATA_FILE = path.join(DATA_DIR, "storage.json");

function toNumber(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? v : NaN;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

let state: StorageData = {
  precoLitro: null,
  consumoKmPorLitro: null,
  corridas: [],
};

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initial: StorageData = {
      precoLitro: null,
      consumoKmPorLitro: null,
      corridas: [],
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

export async function initStorage(): Promise<StorageData> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw) as StorageData;
}

async function save() {
  await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}

export const db = {
  getPrecoLitro() {
    return state.precoLitro;
  },

  async setPrecoLitro(v: unknown) {
    const valor = toNumber(v);

    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("precoLitro inválido");
    }

    state.precoLitro = round2(valor);
    await save();
    return state.precoLitro;
  },

  getConsumoKmPorLitro() {
    return state.consumoKmPorLitro;
  },

  async setConsumoKmPorLitro(v: unknown) {
    const valor = Number(v);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("consumoKmPorLitro inválido");
    }
    state.consumoKmPorLitro = Math.round(valor * 100) / 100;

    await save();
    return state.consumoKmPorLitro;
  },

  getConfig() {
    return {
      preco: state.precoLitro,
      consumoKmPorLitro: state.consumoKmPorLitro,
    };
  },

  listCorridas() {
    return state.corridas;
  },

  async addCorrida(input: CorridaInput) {
    const errors: string[] = [];

    const valorRecebido = toNumber(input.valorRecebido);
    const kmRodado = toNumber(input.kmRodado);

    if (!Number.isFinite(valorRecebido) || valorRecebido < 0)
      errors.push("valorRecebido invalido");
    if (!Number.isFinite(kmRodado) || kmRodado <= 0)
      errors.push("kmRodado inválido");

    if (!state.precoLitro || !state.consumoKmPorLitro) {
      const e: any = new Error("CONFIG_REQUIRED");
      e.details = [
        "Configure precoLitro e consumoKmPorLitro antes de criar corridas",
      ];
      throw e;
    }

    if (errors.length) {
      const e: any = new Error("BAD_REQUEST");
      e.details = errors;
      throw e;
    }

    const litrosUsados = kmRodado / state.consumoKmPorLitro;
    const custoCombustivel = round2(litrosUsados * state.precoLitro);
    const rsPorKm = round2(valorRecebido / kmRodado);
    const lucroLiquido = round2(valorRecebido - custoCombustivel);

    const corrida: Corrida = {
      id: crypto.randomUUID(),
      valorRecebido,
      kmRodado,
      rsPorKm,
      lucroLiquido,
      createdAt: new Date().toISOString(),
    };

    state.corridas.unshift(corrida);
    await save();
    return corrida;
  },

  listCorridasPorDia(dateISO: string) {
    const items = state.corridas.filter(
      (c) => c.createdAt.slice(0, 10) === dateISO
    );

    const totals = items.reduce(
      (acc, c) => {
        acc.corridas += 1;
        acc.km += c.kmRodado;
        acc.valorRecebido += c.valorRecebido;
        acc.lucroLiquido += c.lucroLiquido;
        return acc;
      },
      { corridas: 0, km: 0, valorRecebido: 0, lucroLiquido: 0 }
    );

    const rsPorKm =
      totals.km > 0
        ? Math.round((totals.valorRecebido / totals.km) * 100) / 100
        : 0;

    return {
      date: dateISO,
      totals: {
        corridas: totals.corridas,
        km: Math.round(totals.km * 100) / 100,
        valorRecebido: Math.round(totals.valorRecebido * 100) / 100,
        lucroLiquido: Math.round(totals.lucroLiquido * 100) / 100,
        rsPorKm,
      },
      items,
    };
  },
};
