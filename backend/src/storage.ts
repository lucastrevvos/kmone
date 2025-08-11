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
  corridas: Corrida[];
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

let state: StorageData = { precoLitro: null, corridas: [] };

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initial: StorageData = { precoLitro: null, corridas: [] };
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

  listCorridas() {
    return state.corridas;
  },

  async addCorrida(input: CorridaInput) {
    const errors: string[] = [];

    const valorRecebido = toNumber(input.valorRecebido);
    const kmRodado = toNumber(input.kmRodado);
    const litrosAbastecidos =
      input.litrosAbastecidos !== undefined
        ? toNumber(input.litrosAbastecidos)
        : undefined;

    if (!Number.isFinite(valorRecebido) || valorRecebido < 0)
      errors.push("valorRecebido invalido");
    if (!Number.isFinite(kmRodado) || kmRodado <= 0)
      errors.push("kmRodado inválido");
    if (
      litrosAbastecidos !== undefined &&
      (!Number.isFinite(litrosAbastecidos) || litrosAbastecidos < 0)
    ) {
      errors.push("litrosAbastecidos inválido");
    }

    if (errors.length) {
      const e: any = new Error("BAD_REQUEST");
      e.details = errors;
      throw e;
    }

    const rsPorKm = round2(valorRecebido / kmRodado);

    let lucroLiquido = valorRecebido;
    if (litrosAbastecidos !== undefined && state.precoLitro !== null) {
      lucroLiquido = round2(
        valorRecebido - litrosAbastecidos * state.precoLitro
      );
    }

    const corrida: Corrida = {
      id: crypto.randomUUID(),
      valorRecebido,
      kmRodado,
      litrosAbastecidos,
      rsPorKm,
      lucroLiquido,
      createdAt: new Date().toISOString(),
    };

    state.corridas.unshift(corrida);
    await save();
    return corrida;
  },
};
