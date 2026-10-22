import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

async function start() {
  await connectDatabase(env.mongoUri);

  app.listen(env.port, "0.0.0.0", () => {
    console.log(`SACCO API listening on port ${env.port}.`);
  });
}

start().catch((error) => {
  console.error("Could not start the SACCO API:", error.message);
  process.exit(1);
});
