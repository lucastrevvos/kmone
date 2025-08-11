import { Router } from "express";
import { db } from "../storage.js";

const routes = Router();

routes.get("/", (_req, res) => res.send("KM One API rodando 🚀"));
routes.get("/health", (_req, res) => res.json({ ok: true }));

routes.put("/config/preco-litro", async (req, res) => {
  try {
    const precoLitro = await db.setPrecoLitro(req.body?.precoLitro);
    res.json({ precoLitro });
  } catch (error: any) {
    if (error?.message === "precoLitro inválido") {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: "internal_error" });
  }
});

routes.get("/config/preco-litro", async (_req, res) => {
  res.json({ precoLitro: db.getPrecoLitro() });
});

routes.post("/corridas", async (req, res) => {
  try {
    const corrida = await db.addCorrida(req.body ?? {});
    res.status(201).json(corrida);
  } catch (error: any) {
    if (error?.message === "BAD_REQUEST") {
      return res.status(400).json({ errors: error.details ?? ["bad_request"] });
    }
    console.error(error);
    res.status(500).json({ error: "internal_error" });
  }
});

routes.get("/corridas", async (_req, res) => {
  res.json({ total: db.listCorridas().length, items: db.listCorridas() });
});

export default routes;
