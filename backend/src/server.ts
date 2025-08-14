import app from "./http/app";
import { sql } from "./infra/db.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL não definido. Configure no .env");
    process.exit(1);
  }

  try {
    await sql`SELECT 1`;
    console.log("✅ Conexão com o banco estabelecida");
  } catch (err) {
    console.error("❌ Erro ao conectar no banco:", err);
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`🚀 Backend na ${PORT}`));
})();
