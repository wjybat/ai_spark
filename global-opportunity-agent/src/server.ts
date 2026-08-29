import { buildApp } from "./http/app.js";
import { config } from "./config.js";

const app = await buildApp();

try {
  const address = await app.listen({ host: config.host, port: config.port });
  console.log(`Global Opportunity Agent running at ${address}`);
  console.log(`Frontend: ${address}/`);
  console.log(`Health: ${address}/api/health`);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
