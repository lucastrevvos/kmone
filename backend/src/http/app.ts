import express from "express";
import routes from "./routes.js";

const app = express();

// Garantir parsing JSON apenas quando houver body
app.use(
  express.json({
    type: ["application/json", "application/*+json"],
    limit: "1mb",
  })
);

// Fallback: só tenta parsear se houver conteúdo bruto
app.use((req, _res, next) => {
  if (!req.body) return next();

  const b = req.body;
  try {
    if (Buffer.isBuffer(b)) {
      req.body = JSON.parse(b.toString("utf8"));
    } else if (typeof b === "string") {
      req.body = JSON.parse(b);
    }
  } catch {
    // ignora erro de JSON inválido
  }

  next();
});

app.use(routes);

export default app;
