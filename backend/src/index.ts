import express from "express";

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

const app = express();
app.use(express.json());

const corridas: Corrida[] = [];

function toNumber(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? v : NaN;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

app.get("/", (_req, res) => res.send("KM One API rodando"));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/corridas", (req, res) => {
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

  const rsPorKm = round2(valorRecebido / kmRodado);

  const lucroLiquido = round2(valorRecebido);

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

  return res.status(201).json(corrida);
});

app.get("/corridas", (_req, res) => {
  res.json({ total: corridas.length, items: corridas });
});

app.listen(3333, () => console.log("Localhost on 3333"));
