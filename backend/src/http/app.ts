import express from "express";
import routes from "./routes.js";

const app = express();

// 1) tenta parsear JSON normal + application/*+json
app.use(express.json());

// 2) fallback: se veio string ou Buffer, tenta JSON.parse
app.use((req, _res, next) => {
  const b = req.body as any;

  if (Buffer.isBuffer(b)) {
    try {
      req.body = JSON.parse(b.toString("utf8"));
    } catch {
      /* ignore */
    }
  } else if (typeof b === "string") {
    try {
      req.body = JSON.parse(b);
    } catch {
      /* ignore */
    }
  }
  next();
});

app.use(routes);
export default app;
