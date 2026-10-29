import { mkdir, writeFile } from 'node:fs/promises';
import { GAME_SCENARIOS } from '../packages/contracts/src/index.js';
import { measureScenario } from '../apps/realtime/src/game/scenarios.js';
const reports = GAME_SCENARIOS.map(scenario => {
  const report = measureScenario(scenario, 42);
  const { snapshot, ...metrics } = report;
  return { ...metrics, contributions: snapshot.result?.contributions, rejections: snapshot.diagnostics.reasons };
});
const directory = process.env.QA_OUTPUT_DIRECTORY ?? 'docs/qa/phase3';
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/scenarios.json`, JSON.stringify({ tuningVersion: 1, seed: 42, reports }, null, 2) + '\n');
for (const report of reports) console.log(`${report.scenario}: ${report.winner ?? 'none'} / ${report.reason}; ${report.activeMs}ms; x=${report.position.toFixed(6)}; ${report.accepted} applied, ${report.rejected} rejected, ${report.pipelineDuplicates} upstream duplicates`);
