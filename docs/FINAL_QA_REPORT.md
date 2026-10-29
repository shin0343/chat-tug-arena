# Final QA report — Phase 7

**Current Phase9v2 follow-up:** basic real Twitch gameplay now PASS with one actual account; latest release checks147/147 and50/50,
lint/types/build/16 contrast pairs PASS. See [live report](LIVE_TWITCH_TEST.md), [current blockers](FINAL_BLOCKER_STATUS.md),
[full checks](qa/phase9/release-check.txt) and [browser checks](qa/phase9/browser-release-tests.txt).
The Phase7 record below is historical; native OBS, multi-account footage and actual submission remain BLOCKED.

Finalized 2026-10-28. **Local release hardening completed. Submission/public production readiness: BLOCKED.**
Real Twitch authorization/chat and native OBS were unavailable; no simulated result is counted as live proof.
The user subsequently authorized Phase 8 preparation. That separate work does not clear these gates.

## Environment and method

Node **22.23.1**, npm **10.9.8**, macOS arm64; production Next/Node plus real Chromium, HTTP/SSE and deterministic Vitest tests.
Read AGENTS, DESIGN, architecture/game/product/judging/decisions/roadmap, prior QA and approved asset/reference ledgers.
No visual redesign, new runtime dependency, engine tuning change, database, external deployment or submission.

[Environment record](qa/phase7/environment.json): no root `.env`, process Twitch credentials, OBS installation or project `.git` metadata.
External requirements were compared with the [official rules](https://twitchcon-codex.devpost.com/rules) and
[resources](https://twitchcon-codex.devpost.com/resources); actual access and new-project provenance remain entrant/release gates.

## Actual commands and outcomes

| Command / scope | Actual result | Evidence |
| --- | --- | --- |
| `npm run check` — project | PASS: lint, types, **145/145 tests in 13 files**, **16 contrast pairs**, production build | [log](qa/phase7/logs/check.txt) |
| `PLAYWRIGHT_PRODUCTION=1 npm run test:e2e` | PASS: **49/49 Chromium tests**, 1.7m; zero final failures/skips/retries | [log](qa/phase7/logs/e2e.txt), [captures](qa/phase7/regression/) |
| Source-only copy + fresh-cache `npm ci` | First attempt FAIL: npm registry `ETIMEDOUT`. Retried with `--maxsockets=5`: PASS, 414 installed packages, 0 advisories | [retry log](qa/phase7/logs/clean-install.txt), [scope](qa/phase7/environment.json) |
| `npm run check` — clean copy | PASS: same 145 tests/13 files, lint/types/contrast/build | [log](qa/phase7/logs/clean-check.txt) |
| Clean production `test:e2e -- release.spec.ts showdown.spec.ts` | PASS: **9/9**, 28.5s; actual clean frontend/backend with local configure → rehearsal → result → commit → rematch | [log](qa/phase7/logs/clean-browser.txt) |
| Clean development `test:e2e -- connection.spec.ts -g 'actual Node simulation arrives'` | PASS: **1/1**, 10.1s; actual `npm run dev` frontend/backend startup and local SSE pipeline | [log](qa/phase7/logs/clean-dev.txt); separate from Twitch proof |
| `QA_OUTPUT_DIRECTORY=docs/qa/phase7 npm run test:scenarios` | PASS: seven deterministic seed-42 scenarios | [JSON](qa/phase7/scenarios.json), [log](qa/phase7/logs/scenarios.txt) |
| Same output override, `npm run test:game-performance` | PASS: pure engine 5000-user capacity/bounded receipts/events and 50,000 repeated attempts | [JSON](qa/phase7/performance.json) |
| `npm run qa:release-load` | Initial run FAIL: unexpected dashboard SSE end. After fix PASS: **120.054s**, **2714 attempts**, **10 rounds**, **6 overlays + 1 dashboard**, **0 stream errors** | [before](qa/phase7/load-before.txt), [after](qa/phase7/load.json) |
| Built clean server + `QA_OUTPUT_DIRECTORY=docs/qa/phase7 npm run qa:phase4 -- --performance-only` | PASS isolated renderer sample: ten characters, actual public SSE, video disabled, no browser errors | [JSON](qa/phase7/runtime-performance.json), [log](qa/phase7/logs/renderer.txt) |
| `npm audit --json` | PASS dated check: **0 known vulnerabilities**, production/dev/optional dependency scope included | [JSON](qa/phase7/logs/npm-audit.json) |
| Source-pattern review | 193 text files, four known key formats, no matches; no secret values emitted; no git history available | [scan](qa/phase7/source-secret-scan.json) |

The clean install used `/tmp/cta-phase7-clean-b3KGTD`: source copied without node_modules, builds, QA media, private `.env` or vault.
Final changed source/tests/scripts were synced before its checks; dependencies/builds were created there. Only credential-free `.env.example`
was copied to `.env`. This is a separate source/dependency/build environment on the same OS, using the already installed Chromium cache, not a clean VM.
Expected SIGTERM teardown can print npm workspace exit 143; the browser commands themselves exited successfully and released both ports.

## Working features confirmed locally

- Configuration/templates, duplicate-choice/keyword validation, stale-tab conflict recovery and server-owned settings.
- Explicit countdown/start/pause/resume/finish/cancel/reset/rematch, authoritative frozen winner, exact consequence, commitment and latest-20 history.
- Deterministic 20ms momentum/damping/force decay, position ±1, velocity ≤0.7, late-event rejection, timers and tie/no-participation behavior.
- Distinct-user 3/6/10 combos, cooldown/expiry, repeated participation weights, team lock, envelope/message dedupe and rate/capacity bounds.
- Fixture OAuth, token refresh/revocation/errors, confirmed EventSub subscription, directed handoff/unexpected-loss recovery and explicit game resume.
- Public read-only source, room isolation, separate capability/CSRF, no viewer identifiers/history in overlay, no client result-writing endpoint.
- Keyboard/dialog focus, reduced motion, offline/server-error recovery, clipping constraints, transparent source, grounded poses and bounded celebration.

These are local and fixture results. The [live matrix](LIVE_TWITCH_TEST.md) identifies every missing real-provider step.

## Defects fixed and regression record

**R7-01 / P1:** an old commands response could overwrite a newer bootstrap's CSRF after session rotation. A real-browser/API reproduction
returned 403 on the next action. The connection provider now discards response state/token updates when its captured session token is stale.
[Before](qa/phase7/regression/session-race-before.png) and [after](qa/phase7/regression/session-rotation-recovery.png) are actual captures;
the regression now returns 200. An independent security review found no authority bypass.

**R7-02 / P1:** SSE treated `write(false)` as a dead consumer. The load test exposed a healthy dashboard disconnection.
The shared writer waits for drain, retains only the latest snapshot and removes a blocked consumer after 5s. It preserves reset and
no-transform semantics. Three focused tests and the repeated load verify cleanup/coalescing/recovery without unbounded queues.

QA-tool corrections: the first XSS browser probe used non-contract field names, then a choice over the existing 20-character limit.
Both were corrected; real title/choice HTML remains literal text, with no injected image or SVG handler. Validation was not weakened.
The new load script initially needed a TypeScript control-flow narrowing correction; final typecheck passes. Initial failure logs were not relabeled PASS.

## Measured performance

| Measurement | Actual observation | Interpretation |
| --- | --- | --- |
| Sustained input | 601 attempts in 30.050s, target 20/s | One local room through actual fixture EventSub/parser/engine |
| 1000-frame burst | 19.615ms injection loop; 202 accepted game inputs, 299 fairness/rate rejections; invalid/duplicate/unrecognized traffic counted separately | Synchronous local injection, not Twitch network latency |
| Event processing | 2614 timed valid-frame injections: p50 **0.101ms**, p95 **0.526ms**, max **1.176ms** | Includes local pipeline/engine pump; malformed-frame injections are not in this latency sample |
| Dashboard receipt | 1754 retained-feed samples: p50 **49.30ms**, p95 **101.42ms**, max **106.52ms** | Only inputs observed in the coalesced 40-item feed; not all-message latency |
| Broadcast | 1371 snapshots/client over 120.054s, **11.42/s** average; max client gap ≈111.36ms | Controller targets 10Hz; input/transition publications add updates |
| Traffic | ≈6.35MB/overlay and 24.01MB/dashboard during run | JSON/SSE bytes; no WAN bandwidth/capacity guarantee |
| Quiet decay | Total team force **32.445 → 5.802** after 3s without pulls | Observable mathematical decay, no random comeback aid |
| Fixture recovery | **1015.56ms**, second confirmed subscription, position frozen and explicit resume | Backoff/welcome under local fixture; real Twitch recovery BLOCKED |
| Memory | Post-GC heap **11.35 → 13.41MiB**; RSS **100.09 → 131.64MiB** | Same process includes server, seven clients and measurement arrays; growth observed, not claimed leak-free |
| Event-loop delay | p95 **12.08ms**, max **33.88ms** with 10ms sampling resolution | Local shared QA host; not a zero-overhead or isolated production server benchmark |
| Renderer | **8.014s**, 481 RAF intervals; mean **16.666ms**, p95 **16.7ms**, max **16.8ms**, no ≥50ms long tasks observed | Headless Chromium 1920×1080, 10 characters, actual SSE, video disabled; ≈60 observed RAF Hz only |
| Rig callback | Reported average **0.240ms**, maximum **0.500ms**; 351 DOM nodes | Application callback timing, not full GPU/OBS frame cost |
| Pure engine | 50,000 repeat attempts in **25.267ms**, 49,999 rejected; 1000 step calls average **0.0010ms**, max **0.234ms** | Separate no-network probe; cannot predict live capacity |

The finite 120s soak does not replace an hours-long real broadcast. See raw JSON for sample definitions, retained state and all intermediate memory samples.

## Deterministic scenario outcomes

All use seed 42 and tuning version 1; no balance values changed in Phase 7.

| Scenario | Outcome | Active time | Applied / rejected |
| --- | --- | --- | --- |
| Balanced | Tie, x=0 | 45.00s | 114 / 0 |
| Early blowout | Coral endpoint, x=-1 | 3.42s | 20 / 0 |
| Late comeback | Mint endpoint, x=1 | 41.70s | 50 / 0 |
| Combo rush | Coral endpoint | 4.68s | 20 / 9 |
| Spam attempt | Mint by time, x≈0.767657 | 45.00s | 64 / 1067, plus 1087 pipeline duplicates |
| Quiet | No participation, no winner | 45.00s | 0 / 0 |
| Connection interruption | Tie | 45.00s active | 108 / 12; gap excluded from play |

## Browser / broadcast regression evidence

Reviewed actual [desktop result](qa/phase7/regression/result-desktop.png), [320px maximum-content result](qa/phase7/regression/result-320.png),
[active crew](qa/phase7/regression/active-combo-desktop.png), [1920 result source](qa/phase7/regression/result-overlay-1920.png),
[maximum crowd](qa/phase7/maximum-crowd-1920.png) and [reduced motion](qa/phase7/reduced-motion-1920.png).
They retain the original Fieldday crew, semantic colors/fonts, task hierarchy and readable winner/action. Long values wrap; no new clipping was observed.
Browser checks cover 320/390/768/1024/1440 dashboard layouts, 1920×1080 and 1280×720 sources and reduced embedded scenes.

The top 1920×250 pixels of the result source were alpha-extracted with FFmpeg: min/max/average 0, **480,000 fully transparent pixels**
([log](qa/phase7/logs/alpha.txt)). This verifies that PNG region, not native OBS compositing.
Observed pose changes, pause/reduced-motion freeze, combo, victory/result and reconnect assertions in Chromium;
also inspected the actual [11.16s simulation recording](qa/phase7/regression/motion/consequence-overlay.webm) and
[sampled filmstrip](qa/phase7/regression/motion/contact-sheet.png). Its 25fps encoding is unrelated to the isolated rendering measurement.
Native OBS/CEF transparency/scaling/busy-game-footage/readability/refresh: **BLOCKED**, no OBS installed.

## Remaining blockers and release decision

| Priority | Issue | Resolution |
| --- | --- | --- |
| P0 external | Actual Twitch journey unverified | Configure privately; consenting broadcaster/viewers execute LIVE_TWITCH_TEST and retain real evidence |
| P0 external | Judge repository/access and new-work/Codex-session provenance absent | Supply actual accessible repository and principal thread evidence; verify entrant facts |
| P1 external | Native OBS, real provider failure/lifecycle and long soak unavailable | Test actual environments before claiming broadcast/production readiness |
| P1 deployment | Public ingress/session admission, TLS/proxy/vault/restart behavior not deployed/tested | Resolve hosting policy; cap256/TTL12h alone is not public-ingress protection |
| P2 | Other browsers, real streamer usability/balance and project license decision | Preserve known limitations; do not add unsupported user-impact claims |

All feasible confirmed local P1 code defects found in this audit were fixed. **Do not claim full readiness:** essential Twitch proof is still BLOCKED.
[Security detail](SECURITY_REVIEW.md), [release checklist](RELEASE_CHECKLIST.md) and the separate Phase 8 audit carry the unresolved gates forward.

## Phase9v2 actual follow-up

Actual registered-app consent, token validation and enabled self-channel chat subscription were verified. Genuine Twitch messages produced
accepted Coral/Mint pulls in separate rounds, x=-0.0793/+0.0793, correct Mage/Knight choices/actions, acknowledgments and zeroed rematches.
Real force/speed decay and team locking are recorded in `qa/phase9/live-physics-samples.json`. One participant remained one distinct viewer.
Private34.998333s H.264 browser-region footage exists and six sampled frames were inspected; no native OBS or renderer-FPS claim.
All seven seed42 scenarios reran separately as simulation; comeback and combo fixtures are not real-audience proof.

Initial fresh tests without port permission failed24 HTTP cases; the authorized rerun passed145. Production browser QA then exposed a cookie/CSRF
rotation race (48/49). A deterministic HTTP regression failed200 vs409 before the fix. Three production files were changed; focused22 tests passed,
then complete147 checks/build. The first new browser test asserted before its250ms retry and was corrected to await the observable retry;
the final production run passed50/50 in1.7m. This test-harness failure is not hidden or presented as a product fix.
Current npm audit returned0 known advisories. No engine tuning, dependency, scope or visual redesign was introduced.

## Phase 9 v2 source-only release reproduction

A fresh archive of the staged Git tree, without private env/vault/builds/dependencies, installed414 packages and audited418 with0 known advisories.
`npm run check` passed147 tests in13 files (4.64s), lint, types,16 contrast pairs and production build.
The anonymous production copy on3100/3101 then passed all50 Chromium tests (1.7m); both temporary servers were stopped.
All108 source/test files matched the working release. The real3000/3001 services remained up.
This uses the same macOS host and shared npm/Chromium cache, not a clean VM or another live Twitch test.
An ESLint support deprecation was printed; no dependency change was introduced during feature freeze.
[Actual commands/scope](qa/phase9/clean-install.json), [install](qa/phase9/clean-install.txt), [check](qa/phase9/clean-check.txt), [browser](qa/phase9/clean-browser-tests.txt).
