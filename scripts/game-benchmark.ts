import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { DEFAULT_CONFIG } from '../packages/contracts/src/index.js';
import { GameEngine } from '../apps/realtime/src/game/engine.js';
import { simulationInput } from '../apps/realtime/src/game/scenarios.js';

// Pure-engine capacity probe, not an HTTP/Twitch/OBS load test or a latency guarantee.
const engine = new GameEngine({ source: 'simulation', channelId: 'simulation-channel', config: { ...DEFAULT_CONFIG, durationSeconds: 90 }, tuning: { endpointWins: false } });
engine.ready(); engine.start(); engine.advance(3000);
for (let batch = 0; batch < 50; batch++) {
  for (let i = 0; i < 100; i++) { const viewer = `viewer-${batch * 100 + i}`; engine.ingest(simulationInput(batch % 2 ? 'mint' : 'coral', viewer, viewer, engine.simulationClockMs)); }
  engine.advance(1000);
}
const capacity = engine.snapshot();
const started = performance.now();
for (let i = 0; i < 50_000; i++) engine.ingest(simulationInput('coral', 'viewer-0', `spam-${i}`, engine.simulationClockMs));
const burstMs = performance.now() - started;
let maximumStepMs = 0; const tickStarted = performance.now();
for (let i = 0; i < 1000; i++) { const before = performance.now(); engine.advance(20); maximumStepMs = Math.max(maximumStepMs, performance.now() - before); }
const ticksMs = performance.now() - tickStarted;
const snapshot = engine.snapshot();
if (capacity.uniqueViewers !== 5000 || snapshot.diagnostics.trackedUsers > 5000 || snapshot.inputs.length > 40 || snapshot.events.length > 64 || snapshot.state !== 'ACTIVE') throw new Error('Capacity probe failed');
const report = { runtime: process.version, platform: `${process.platform}/${process.arch}`, scope: 'pure engine; local capacity probe; no network/OBS load claim', trackedUsers: snapshot.diagnostics.trackedUsers, trackedIds: snapshot.diagnostics.trackedIds, attemptedBurst: 50_000, rejected: snapshot.diagnostics.rejected, burstMs, ticksMeasured: 1000, totalTickMs: ticksMs, averageStepMs: ticksMs / 1000, maximumStepMs, fixedStepBudgetMs: 20, privateSnapshotBytes: Buffer.byteLength(JSON.stringify(snapshot)), publicGameSnapshotBytes: Buffer.byteLength(JSON.stringify({ ...snapshot, inputs: [] })), retainedDecisions: snapshot.inputs.length, retainedEvents: snapshot.events.length };
const directory = process.env.QA_OUTPUT_DIRECTORY ?? 'docs/qa/phase3';
await mkdir(directory, { recursive: true }); await writeFile(`${directory}/performance.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
