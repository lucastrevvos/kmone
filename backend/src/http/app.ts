import express from "express";
import routes from "./routes.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

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
