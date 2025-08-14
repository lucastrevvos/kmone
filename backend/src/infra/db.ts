import postgres from "postgres";
import dotenv from "dotenv";
import fs from "fs";

// Detecta ambiente
const isProd = process.env.NODE_ENV === "production";
const isStaging = process.env.NODE_ENV === "staging";

// Carrega variáveis locais apenas se NÃO estiver em produção no Lambda
if (!isProd) {
  if (isStaging && fs.existsSync(".env.staging")) {
    dotenv.config({ path: ".env.staging" });
  } else if (fs.existsSync(".env.local")) {
    dotenv.config({ path: ".env.local" });
  } else {
    dotenv.config(); // fallback .env
  }
}

const useSSL = isProd || isStaging;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida");
}

export const sql = postgres(process.env.DATABASE_URL, {
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});
