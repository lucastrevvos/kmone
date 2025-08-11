import app from "./http/app";
import { initStorage } from "./storage.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

(async () => {
  await initStorage();
  app.listen(PORT, () => console.log(`🚀 Backend na ${PORT}`));
})();
