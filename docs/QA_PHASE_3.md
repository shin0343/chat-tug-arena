# Phase 3 verification — game engine, physics and visual contracts

Date: 2026-10-27. Local macOS arm64, Node v22.23.1, npm workspaces, Playwright Chromium.
Scope stops after Phase 3. Detailed animations, art selection, effects and audio remain Phase 4.

## Evidence boundary

**Phase 3 engineering is implemented; actual Twitch round/native OBS verification remains BLOCKED.**
No root `.env`, app credentials, actual broadcaster message or native OBS session was available. No real-provider result is claimed.
The tests use genuine local HTTP/SSE and clearly labeled simulation/injected Twitch fixtures. Neither can clear the live gate.
Follow TWITCH_SETUP for the remaining actual-provider round, source capture, refresh/revocation and recovery checks.

## Executed checks

| Check | Actual result |
| --- | --- |
| `npm run check` | PASS: lint, strict types, all unit/integration tests, contrast and production build |
| `npm test` | PASS: **93 tests / 7 files**, including 37 game tests and 9 game HTTP/clock/Twitch interruption tests |
| `npm run contrast` | PASS: all **16** established semantic pairs; tokens/fonts unchanged |
| `npm run test:scenarios` | Completed seven seed-42 scenarios; exact full-precision report: `docs/qa/phase3/scenarios.json` |
| `npm run test:game-performance` | PASS: bounded 5,000-viewer pure-engine capacity probe; `docs/qa/phase3/performance.json` |
| `npm run test:e2e` (dev) | **32 tests passed**; first run required explicit cleanup of orphaned dev servers at teardown, see below |
| `PLAYWRIGHT_PRODUCTION=1 npm run test:e2e` | PASS: **32 tests**, including actual game/SSE/synchronized overlay flows; normal automatic server shutdown |

Final verification after the accessibility announcement adjustment passed: `npm run check` and all **32 production browser tests in 43.4s**.
Both test-server ports (3000/3001) were confirmed closed after automatic teardown. Playwright color warnings
and npm exit 143 during intentional SIGTERM shutdown are runner/supervisor output, not browser or game failures.
The all-routes and mechanics smoke checks observed no browser page errors.

## Mechanics and authority coverage

- Fixed 20ms steps: identical snapshots for the same input offsets at update chunks of 1/7/16/20/33/50/100/500ms; partial-step accumulation.
- Observable acceleration, momentum, force decay/rest; velocity/activity/position limits and inward recovery from a boundary.
- Three/six/ten distinct-viewer combo thresholds, unique enforcement, rolling-window pruning, fixed expiry, upgrade without renewal,
  maximum multiplier, cooldown and fresh-user reactivation policy.
- Duplicate accepted IDs even with changed user/team; upstream envelope/message dedupe remains covered by the existing tests.
- Cooldown exact boundary; useful repeat weights 1/.7/.5/.35/.25 and repeat cap; per-round team lock/reset; wrong source/channel,
  stale/future/gap events; per-tick/room limits; one spammer does not consume room allowance with rejected attempts.
- Bounded participant/ID/decision/event state without fairness-bypassing eviction; repeated clean rounds.
- READY/start/countdown transitions, paused countdown, pause/resume with frozen physics/clock/combo, pause abandonment, endpoint hold,
  positional deadline win, participation tie, no participation, one final result, five final seconds and explicit abandon/reset/rematch.
- Runtime contracts and snapshot-copy isolation, including nested result objects; presentation interpolation cannot extrapolate,
  cross rounds, use a finished state or change an authoritative result.
- HTTP cookie/Origin/CSRF controls, stale/double action rejection, invalid settings/seeds/identities/counts, absent physics/result writes,
  session isolation, no live-channel injection through simulation controls and command locking during play/pause.
- Real local public SSE: bearer capability required, GET only, no control cookie/CSRF/auth token/viewer IDs in projection,
  input receipts removed, no-transform, independent room state and capability rotation.
- Persistent clock publishes at 10Hz without browser frames; a >1s stall pauses rather than skipping the match; 60s pause expiry.
- Injected Twitch EventSub input actually moves the game, loss freezes it, reconnect does not auto-resume, duplicate IDs and team
  locking survive and fixtures retain `test_fixture` evidence origin.

## Seeded outcome measurements

All use 45-second rounds, 2-second user cooldown and tuning version 1. Total clock includes startup countdown and recorded pauses.
See GAME_DESIGN for exact formulas/constants and the repeatable command. These are controlled simulations.

| Scenario | Result | Active / total time | Final position | Applied / rejected / upstream duplicates |
| --- | --- | --- | --- | --- |
| Balanced | Tie | 45 / 48s | 0 | 114 / 0 / 0 |
| Early blowout | Coral endpoint win | 3.42 / 6.42s | -1 | 20 / 0 / 0 |
| Late comeback | Mint endpoint win | 41.70 / 44.70s | +1 | 50 / 0 / 0 |
| Team combo rush | Coral endpoint win | 4.68 / 7.68s | -1 | 20 / 9 / 0 |
| Spam attempt | Mint deadline win | 45 / 48s | +0.767657 | 64 / 1067 / 1087 |
| Quiet | No participation | 45 / 48s | 0 | 0 / 0 / 0 |
| Connection interruption | Tie | 45 / 50s | 0 | 108 / 12 / 0 |

The late comeback recovers from **-0.631972** with one comeback event; no random or trailing-team force adjustment exists.
The spammer gets 22 applied pulls, no Coral combo; three Mint viewers get 42 applied pulls and win.
The connection scenario preserves 45 active seconds and rejects the gap's commands. The combo rush intentionally contains nine
rejected same-identity cooldown attempts alongside successful distinct newcomers.

## Capacity/performance probe

`npm run test:game-performance` prepares a trusted local 90s engine with endpoint finish disabled for this probe, fills all 5,000
participant slots, then attempts a 50,000-message single-viewer burst and measures 1,000 subsequent 20ms ticks.
It records 5,000 tracked users, 5,001 accepted IDs, **49,999 rejected attempts**, 40 retained decisions and 64 retained events.
The captured run processed the burst in **31.14ms**; the 1,000 ticks took **1.40ms total**, **0.00140ms average**,
**0.443ms maximum**, against a 20ms simulation interval. A private game snapshot was **12,399 bytes**, public game state **7,840 bytes**.
These local pure-engine measurements omit JSON transport, React, Twitch and native OBS and are not a latency guarantee/load-soak claim.
Timing varies by run; capacity bounds are asserted. There is no per-tick snapshot allocation, unbounded input queue, new database,
new runtime package, per-message timer or browser-driven simulation.

## Browser/screenshot evidence

`docs/qa/phase3/` contains first-party screenshots; regression screenshots are under its `regression/` directory.
There are **39 first-party PNGs**. Pixel inspection with the installed Sharp decoder confirms alpha **0..0** across the upper 450px
of both the 1920×1080 synchronized source and the 1440×1000 unavailable source; the upper canvas is actually transparent.
No third-party reference screenshot is redistributed. DESIGN.md, semantic tokens, DM Sans/Barlow Condensed and the original SVG
remain the visual authority. Reference documents were reread; official hackathon overview/rules were reopened. The agent-reach
Jina path failed DNS in the sandbox, so native web retrieval was used. No new authenticated Mobbin flow is claimed.

| Actual surface | Screenshot evidence |
| --- | --- |
| Active-state-derived paused mechanics with forces/combos/input decisions | `mechanics-paused-desktop.png` |
| Finished endpoint result | `mechanics-finished-desktop.png` |
| Responsive lab | `mechanics-1440.png`, `mechanics-1024.png`, `mechanics-768.png`, `mechanics-390.png`, `mechanics-320.png` |
| Synchronized cookie-free simulation source | `overlay-simulation-transparent.png` (1920×1080) |
| Failed source transport | `overlay-updates-unavailable.png` |
| Existing product/connection states and max-length commands | `regression/*.png`, explicit `Test provider` banners on fixture states |

Inspected screenshots at desktop/small widths and broadcast size: no page overflow, clipped lab controls, mixed visual assets or new
palette. The small lab intentionally stacks controls and data; the broadcast source has no dashboard chrome/buttons. Pressure meters
were changed from browser-default bright green/gradient to the established team fills. Screen readers announce lifecycle/result text
separately from rapidly changing participant counts. Keyboard/native controls and reduced motion are exercised in Chromium.
An independent browser context with **zero cookies** receives the same round/state/result through the capability; the fragment never
appears in captured network request URLs. Feed loss freezes the drawing and shows an unavailable state with `--:--`.

## Investigation and corrections

Applied the gstack:investigate method for a reproduced teardown hang; its optional local runtime/freeze helpers were unavailable.
No unrelated setup, telemetry, commit, global configuration or plugin update was performed.

**Symptom:** all 32 browser cases passed, but the runner did not return. **Root cause:** installed Playwright's default web-server
teardown sends SIGKILL; the supervisor cannot forward it to the two detached app process groups. Both npm children were observed
orphaned with PPID 1 and ports still listening, retaining the runner's output pipes. Stopping just those two confirmed test groups
immediately released the runner. **Fix:** `playwright.config.ts` requests SIGTERM with a 5s grace period, letting the existing
supervisor forward shutdown. The subsequent full production suite returned normally. The full suite's completion/port checks are
the regression workflow; no engine behavior was changed to hide the hang.

The initial sandbox-only HTTP attempt also failed with `listen EPERM`; rerunning the same actual local tests through permitted
execution produced the recorded passing results. A Phase 2 health assertion was updated to Phase 3's truthful `game-engine` /
`acceptingRounds: true`; disconnected round preparation remains disabled. No test was skipped or converted to a fixture to pass.

## Remaining verification

Actual authorized Twitch viewers, complete real round, provider reconnect/refresh/revocation soak, native OBS/CEF, Safari/Firefox,
production TLS/proxy deployment, multi-process/durable rooms and first-time streamer balance/usability remain unverified.
Current game rooms are deliberately in-memory and single-process. Restart returns to IDLE and requires a fresh source link/round.
The game is deterministically tested, not declared production-scaled or live-hackathon-verified. No Phase 4 work was undertaken.
