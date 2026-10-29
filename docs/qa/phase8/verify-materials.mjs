import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Run from the project root. This validates local draft artifacts, never external readiness.
const root = process.cwd(), directory = process.env.QA_OUTPUT_DIRECTORY ?? 'docs/qa/phase8';
const required = ['README.md', 'docs/FINAL_QA_REPORT.md', 'docs/LIVE_TWITCH_TEST.md', 'docs/SECURITY_REVIEW.md', 'docs/RELEASE_CHECKLIST.md', 'docs/DEVPOST_SUBMISSION.md', 'docs/DEMO_SCRIPT.md', 'docs/DEMO_SHOT_LIST.md', 'docs/CODEX_USAGE_SUMMARY.md', 'docs/FINAL_SUBMISSION_AUDIT.md', 'docs/demo/edit-plan.json', 'docs/demo/captions-draft.srt'];
for (const file of required) assert(existsSync(file), `Missing ${file}`);
const documents = ['README.md', 'AGENTS.md', 'DESIGN.md'];
function markdown(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === 'qa') continue;
    const file = join(path, entry.name);
    if (entry.isDirectory()) markdown(file); else if (file.endsWith('.md')) documents.push(file);
  }
}
markdown('docs');
const missing = []; let links = 0;
for (const file of documents) {
  for (const match of readFileSync(file, 'utf8').matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    let href = match[1].trim(); if (/^(?:https?:|mailto:|#)/.test(href)) continue;
    href = href.replace(/^<|>$/g, '').split('#')[0]; if (!href) continue;
    links++; const target = resolve(dirname(file), decodeURI(href));
    if (!existsSync(target)) missing.push({ file, href });
  }
}
assert.deepEqual(missing, [], 'Broken local documentation links');
const plan = JSON.parse(readFileSync('docs/demo/edit-plan.json', 'utf8'));
assert.equal(plan.segments.length, 8); assert.equal(plan.targetDurationSeconds, 167);
let end = 0;
for (const segment of plan.segments) {
  assert.equal(segment.startSeconds, end); assert(segment.endSeconds > segment.startSeconds);
  assert.equal(segment.sourceFootage, null); end = segment.endSeconds;
}
assert.equal(end, 167); assert(end < 180);
for (const value of Object.values(plan.publicationGate)) assert.equal(value, false);
for (const value of [plan.verifiedRepositoryUrl, plan.verifiedPublicYouTubeUrl, plan.output.actualExportPath, plan.output.measuredDurationSeconds]) assert.equal(value, null);
if (plan.principalCodexSessionId !== null) {
  const proof = JSON.parse(readFileSync('docs/qa/phase9/codex-thread-evidence.json', 'utf8'));
  assert.equal(plan.principalCodexSessionId, proof.metadata.id);
  assert(proof.matchesRuntime && proof.runtimeIdsMatch && !proof.metadata.hasParentThread && proof.userProjectMentions > 0);
}
assert.equal(plan.output.approvedForExport, false);
const cues = readFileSync('docs/demo/captions-draft.srt', 'utf8').trim().split(/\n\s*\n/);
const seconds = value => { const [h, m, s] = value.split(':'); return Number(h) * 3600 + Number(m) * 60 + Number(s.replace(',', '.')); };
assert.equal(cues.length, 8);
for (let i = 0; i < cues.length; i++) {
  const lines = cues[i].split('\n'), [start, finish] = lines[1].split(' --> ');
  assert.equal(Number(lines[0]), i + 1); assert.equal(seconds(start), plan.segments[i].startSeconds); assert.equal(seconds(finish), plan.segments[i].endSeconds);
}
const script = readFileSync('docs/DEMO_SCRIPT.md', 'utf8');
const narration = [...script.matchAll(/\*\*Narration:\*\*\s+“([^”]+)”/gs)].map(match => match[1]);
assert.equal(narration.length, 8);
const submission = readFileSync('docs/DEVPOST_SUBMISSION.md', 'utf8');
for (const heading of ['Project name','Tagline','Inspiration','What it does','How it works','How it was built','How Codex was used','Technical challenges','Accomplishments','What we learned','Future improvements']) assert(submission.includes(`## ${heading}`));
const sourceFiles = [];
function source(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const file = join(path, entry.name), relative = file.slice(root.length + 1);
    if (['node_modules','.git','.next','dist','.data','.local-evidence','test-results','playwright-report'].includes(entry.name) || relative.startsWith('docs/qa/') || entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
    if (entry.isDirectory()) source(file);
    else if (/\.(?:[cm]?[jt]sx?|md|json|ya?ml|txt|example|srt)$/.test(file) && statSync(file).size < 1_000_000) sourceFiles.push(file);
  }
}
source(root);
const formats = [['OpenAI key', /sk-(?:proj-)?[A-Za-z0-9_-]{24,}/g], ['AWS key ID', /AKIA[0-9A-Z]{16}/g], ['Google API key', /AIza[0-9A-Za-z_-]{35}/g], ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g]];
const findings = [];
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  for (const [format, pattern] of formats) { pattern.lastIndex = 0; if (pattern.test(text)) findings.push({ file: file.slice(root.length + 1), format }); }
}
assert.deepEqual(findings, [], 'Potential key-format match; values are intentionally not emitted');
const candidate = ['apps/web/src/lib/connection-store.tsx', 'apps/realtime/src/sse.ts', 'apps/realtime/src/server.ts', 'apps/realtime/src/room.ts', 'apps/realtime/src/runtime.ts', 'apps/realtime/src/game/engine.ts', 'apps/realtime/src/game/tuning.ts', 'packages/contracts/src/index.ts', 'package-lock.json', 'DESIGN.md'];
const report = {
  capturedAt: new Date().toISOString(), localArtifactValidation: 'PASS', submissionReadiness: 'BLOCKED',
  requiredArtifacts: required.length, markdownFilesChecked: documents.length, localLinksChecked: links, missing,
  timeline: { segments: 8, plannedDurationSeconds: end, actualExportMeasured: false, captionCues: cues.length, narrationSegments: narration.length, narrationWords: narration.join(' ').split(/\s+/).length, spokenTimingMeasured: false },
  finalSourcePatternScan: { files: sourceFiles.length, formats: formats.map(([format]) => format), findings, limitations: 'No git history/private env/vault/media; no guarantee for all credential formats; no secret values emitted.' },
  runtimeSourceHashes: Object.fromEntries(candidate.map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')])),
  actualRepositoryUrl: null, principalCodexSessionId: plan.principalCodexSessionId, actualFinalVideoPath: null, publicYouTubeUrl: null, observedDevpostSubmitted: false,
  limitations: ['Local file/timing consistency only. This check does not verify Twitch authorization, footage, judge access, rights or submission state. Principal identity is checked against separately recorded native evidence.', 'Runtime hashes identify local files, not a git revision or proof of submission-period creation.']
};
mkdirSync(directory, { recursive: true }); writeFileSync(`${directory}/materials-check.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ localArtifactValidation: report.localArtifactValidation, submissionReadiness: report.submissionReadiness, links, timeline: report.timeline, sourceFiles: sourceFiles.length }, null, 2));
