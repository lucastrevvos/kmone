import { Router } from "express";
import {
  addCorrida,
  getConfig,
  listCorridas,
  listCorridasPorDia,
  setConsumo,
  setPrecoLitro,
} from "../infra/repositories.js";

const routes = Router();

// Função utilitária para parse seguro de números
function parseNumber(value: any): number {
  if (typeof value === "string") value = value.replace(",", ".").trim();
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

routes.get("/", (_req, res) => res.send("KM One API rodando 🚀"));

routes.get("/health", (_req, res) => res.json({ ok: true }));

routes.get("/config", async (_req, res) => res.json(await getConfig()));

routes.put("/config/preco-litro", async (req, res) => {
  const v = parseNumber(req.body?.precoLitro);

  if (!Number.isFinite(v) || v <= 0) {
    return res.status(400).json({ error: "precoLitro inválido" });
  }

  res.json({ precoLitro: await setPrecoLitro(+v.toFixed(2)) });
});

routes.put("/config/consumo-km-por-litro", async (req, res) => {
  const v = parseNumber(req.body?.consumoKmPorLitro);

  if (!Number.isFinite(v) || v <= 0) {
    return res.status(400).json({ error: "consumoKmPorLitro inválido" });
  }

  res.json({ consumoKmPorLitro: await setConsumo(+v.toFixed(2)) });
});

routes.post("/corridas", async (req, res) => {
  try {
    const valorRecebido = parseNumber(req.body?.valorRecebido);
    const kmRodado = parseNumber(req.body?.kmRodado);

    if (
      !Number.isFinite(valorRecebido) ||
      valorRecebido < 0 ||
      !Number.isFinite(kmRodado) ||
      kmRodado <= 0
    ) {
      return res
        .status(400)
        .json({ errors: ["valorRecebido/kmRodado inválidos"] });
    }

    const corrida = await addCorrida({ valorRecebido, kmRodado });
    res.status(201).json(corrida);
  } catch (error: any) {
    if (error?.message === "CONFIG_REQUIRED") {
      return res.status(400).json({ errors: error.details });
    }
    console.error(error);
    res.status(500).json({ error: "internal_error" });
  }
});

routes.get("/corridas", async (_req, res) => {
  const items = await listCorridas();
  res.json({ total: items.length, items });
});

routes.get("/corridas/dia", async (req, res) => {
  let dateStr = String(req.query.date ?? "").trim();
  if (!dateStr) {
    dateStr = new Date().toISOString().slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({ error: "date deve ser YYYY-MM-DD" });
  }

  return res.json(await listCorridasPorDia(dateStr));
});

export default routes;
