import express from "express";
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

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initial: StorageData = { precoLitro: null, corridas: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function loadData(): Promise<StorageData> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw) as StorageData;
}

async function saveData(data: StorageData) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

const app = express();
app.use(express.json());

let precoLitro: number | null = null;
let corridas: Corrida[] = [];

function toNumber(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? v : NaN;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

app.get("/", (_req, res) => res.send("KM One API rodando"));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.put("/config/preco-litro", async (req, res) => {
  const valor = toNumber(req.body?.precoLitro);
  if (!Number.isFinite(valor) || valor <= 0) {
    return res.status(400).json({ error: "precoLitro inválido" });
  }
  precoLitro = round2(valor);

  const data = await loadData();
  data.precoLitro = precoLitro;
  await saveData(data);

  return res.json({ precoLitro });
});

app.get("/config/preco-litro", async (_req, res) => {
  const data = await loadData();
  precoLitro = data.precoLitro;
  return res.json({ precoLitro });
});

app.post("/corridas", async (req, res) => {
  const body: CorridaInput = req.body ?? {};

  const valorRecebido = toNumber(body.valorRecebido);
  const kmRodado = toNumber(body.kmRodado);
  const litrosAbastecidos =
    body.litrosAbastecidos !== undefined
      ? toNumber(body.litrosAbastecidos)
      : undefined;

  const errors: string[] = [];
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
    return res.status(400).json({ errors });
  }

  const data = await loadData();
  precoLitro = data.precoLitro;
  corridas = data.corridas;

  const rsPorKm = round2(valorRecebido / kmRodado);

  let lucroLiquido = valorRecebido;

  if (litrosAbastecidos !== undefined && precoLitro !== null) {
    lucroLiquido = round2(valorRecebido - litrosAbastecidos * precoLitro);
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

  corridas.unshift(corrida);
  data.corridas = corridas;
  await saveData(data);

  return res.status(201).json(corrida);
});

app.get("/corridas", async (_req, res) => {
  const data = await loadData();
  res.json({ total: data.corridas.length, items: data.corridas });
});

(async () => {
  const data = await loadData();
  precoLitro = data.precoLitro;
  corridas = data.corridas;

  app.listen(3333, () => console.log("Localhost on 3333"));
})();
