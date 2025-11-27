import { sql } from "../src/infra/db.js";
try {
    const result = await sql `SELECT 1 as ok`;
    console.log("✅ Banco local está pronto:", result[0]);
    process.exit(0);
}
catch (err) {
    console.error("❌ Erro ao conectar no banco:", err.message);
    process.exit(1);
}
