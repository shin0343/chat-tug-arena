import { readConfig } from './config.js';
import { createArenaServer } from './server.js';
const config = readConfig();
const app = await createArenaServer(config);
app.server.listen(config.port, config.host, () => console.log(`Chat receiver: http://${config.host}:${config.port}/health. Twitch readiness is session-specific.`));
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (stopping) return; stopping = true;
  void app.close().catch(() => { process.exitCode = 1; });
});
