# Roadmap

## Phase 1 — Design and foundation

- [x] Inspect all five mandatory sources as access permits; record actual URLs and limitations.
- [x] Analyze three real Awesome DESIGN.md files and public previews.
- [x] Original DESIGN.md, semantic CSS tokens, original SVG vocabulary and font license records.
- [x] Next UI, persistent Node transport, shared contracts and environment/scripts.
- [x] Landing/setup, Twitch connection, dashboard, round form and OBS overlay shells.
- [x] Honest demo/disconnected states; local save, validation, storage/clipboard error feedback.
- [x] Desktop/mobile screenshot review and visual corrections.
- [x] Lint, type, unit, browser, contrast and production-build verification (exact record in QA_PHASE_1).

Phase 1 is complete. Explicitly authorized Phases 7–8 follow the historical phase records below.

## Phase 2 — Twitch connection and trustworthy sessions

- [x] Inspect current official OAuth, chat/EventSub, validate/refresh and subscription requirements.
- [x] Server Authorization Code flow, subject identification, session/CSRF rotation and server-only tokens.
- [x] Optional encrypted persistent auth vault; mandatory for configured production Twitch.
- [x] EventSub lifecycle, normalizer/deduplication, exact configurable commands and session SSE.
- [x] Eight connection UX states, explicit simulation, input activity and useful recovery actions.
- [x] Automated tests and screenshot QA; exact final results in QA_PHASE_2.
- [ ] **BLOCKED:** register/configure real Twitch credentials, authorize a broadcaster and prove actual chat → typed event → browser acknowledgement. Follow TWITCH_SETUP.
- [ ] **BLOCKED:** actual provider refresh/revocation/network-recovery soak; no live tokens were available.

Implementation is ready for Phase 3 against typed inputs; live eligibility evidence remains blocked.
Read-only overlay capabilities were implemented in Phase 3, separate from the control session.

## Phase 3 — Authoritative game and synchronization

- [x] Pure deterministic 20ms engine, momentum/damping/decay, bounded rope/speed and documented tuning version 1.
- [x] Distinct-user combos, repeat diminishing returns, per-user cooldown, team lock, accepted-ID dedupe and burst limits.
- [x] Six-state lifecycle, authoritative endpoint/time/tie/no-play results, abandon/reset/rematch and stale control rejection.
- [x] Reconnect pause, explicit resume, timestamp barriers, server-stall handling and bounded state/timers.
- [x] Typed minimal visual events, normalized position/pressure, presentation-only interpolation and separate read-only OBS capability.
- [x] Mechanics lab using established design components/tokens, simulation-only manual inputs and seven seeded scenarios.
- [x] Deterministic mechanics, HTTP/SSE authority, browser and screenshot verification. Results: QA_PHASE_3 and `docs/qa/phase3/scenarios.json`.
- [x] GAME_DESIGN, ARCHITECTURE and build-log records of actual formulas, parameters, outcomes and limitations.
- [ ] **BLOCKED external verification:** a complete actual Twitch round with a real broadcaster/viewers and native OBS capture.
  Credentials/live messages remain unavailable, as in Phase 2; simulations and `test_fixture` cannot satisfy this gate.

Phase 3 engineering is implemented. Its live-provider/OBS exit evidence remains explicitly open and is not cleared by Phase 4 simulation.

## Phase 4 — Cohesive game scene and broadcast finishing

- [x] Inspect actual game media, compatible asset archives/licenses, Awwwards/Recent/A1 and existing DESIGN.md.
- [x] Choose one original Fieldday crew vector family, licensed-font continuity and documented asset provenance.
- [x] Connected eight-state crew rig, grounded steps, shared rope grips and bounded participant cast.
- [x] Authoritative interpolation, tension/effort, synchronized combos, lead/swing/comeback, countdown and win/result reactions.
- [x] Transparent dedicated 16:9 source, safe margins, scaling, transport freeze/recovery and reduced motion.
- [x] Production lint/types, 114 unit/integration tests, 16 contrast pairs, build and 36 Chromium browser tests.
- [x] Actual scene PNGs, recorded motion and runtime measurements; exact evidence in QA_PHASE_4.
- [x] Required design/reference/credits/game/log records, implementation decisions and source architecture.
- [ ] **External verification:** native OBS/CEF capture, real broadcaster round, busy-video composition and sustained stream soak.
  OBS and real credentials/channel messages were unavailable; Chromium and simulation cannot satisfy this gate.

Phase 4 implementation is complete. No audio or real-world punishment was added; sound was optional.
Phase 4 art/scene engineering is complete, with its external gates above explicitly open.

## Phase 5 — Streamer dashboard and real consequences

The user's explicit Phase 5 brief replaces the earlier provisional reliability/submission scope with the operational workflow.

- [x] Inspect the actual running dashboard and accessible product references; record Mobbin's access limit.
- [x] Task-focused current showdown/primary controls, secondary choices/OBS, tertiary history/help using existing design primitives.
- [x] Five editable templates, validated choices/keywords, duration, consequence and explicit start checks.
- [x] Server-session draft/settings revision, atomic commands/config save and stale-tab recovery.
- [x] Start/pause/resume/manual Finish/cancel/reset/rematch with authority checks and accessible confirmations.
- [x] Exact weighted participation/combo insights without decorative analytics.
- [x] Frozen winning choice/action, idempotent commitment, latest-20 bounded history and replacement barriers.
- [x] Actual read-only overlay preview, masked/revealable source URL, copy feedback, dimensions and troubleshooting.
- [x] Deterministic/integration/component verification and production build; final browser evidence recorded in QA_PHASE_5.
- [ ] External verification remains open: actual Twitch broadcaster/viewers, native OBS/CEF, streamer usability and prolonged soak.

No game is automatically configured by a commitment. Session data is ephemeral and does not promise durable multi-session history.
Phase 5 scope ended here; the explicitly requested Phase 6 audit follows below.

## Phase 6 — Evidence-based design audit and refinement

- [x] Launch actual production UI and capture paired desktop/mobile, real local game/overlay states and labeled OAuth fixtures.
- [x] Compare selected references with explicit current/historical evidence and Mobbin access limits.
- [x] Prioritize demo-visible defects; fix winner naming, source scaling/status, type roles, task copy and result hierarchy.
- [x] Reuse the original crew renderer in all previews; preserve engine authority, bounded motion and asset licenses.
- [x] Disclosed keyboard-operable small-screen navigation; OBS copy instructions before preview on small screens.
- [x] Design authority, decision record, source architecture, reference ledger and DESIGN_AUDIT updates.
- [x] Final full regression and evidence sign-off: 137 tests, 47 production browser tests, 16 contrast pairs, build and actual paired/motion evidence; see DESIGN_AUDIT.
- [ ] External gates remain: real Twitch/OBS, authenticated Mobbin flows, other browser engines and streamer usability study.

Phase 6 ended here; the user subsequently authorized Phase 7 and then Phase 8 preparation.

## Phase 7 — Live QA, security and release hardening

- [x] Review actual source, official requirements, token/EventSub guidance and current disconnected running app.
- [x] Reproduce/fix stale CSRF action-response race and healthy SSE backpressure disconnect with meaningful regressions.
- [x] Verify private/public authority, all 21 privileged routes vs overlay capability, queued rotation and bounded bodies/actions/streams.
- [x] Final lint/types, 145 tests/13 files, 16 contrast pairs, production build and 49 production Chromium tests.
- [x] Separate source-only install/check/build, 9 production workflow tests and 1 dev-start pipeline test.
- [x] Re-run seven seeded scenarios, pure-engine probe, actual 120s fixture HTTP/SSE load and isolated 8s Chromium renderer profile.
- [x] Inspect actual screenshots/recorded motion/alpha and preserve approved identity; document failures, fixes and measured memory growth.
- [x] FINAL_QA_REPORT, LIVE_TWITCH_TEST, SECURITY_REVIEW, RELEASE_CHECKLIST, README and build-log updates.
- [ ] **BLOCKED:** real Twitch authorization/messages/combos/comeback and credential lifecycle, native OBS, longer live soak, judge environment.

Local Phase 7 audit work is complete. Essential external gates remain BLOCKED; no full readiness claim.

## Phase 8 — Authentic submission preparation

- [x] Reopen official rules/resources/updates and actual recorded design references with access limits.
- [x] English Devpost draft with implemented features, clear limits and empty actual external fields.
- [x] 167s script, eight-shot production ledger, editable timeline and draft captions; no fabricated recording/upload.
- [x] Codex contribution index tied to code/log/tests, honest attribution and actual session-ID gate.
- [x] README screenshots, architecture/env/install/test/OBS/rights/limits and final compliance/judging assessment.
- [ ] **BLOCKED:** real Twitch/OBS/Codex footage, principal session ID, permitted source/remote judge access, measured final video/public YouTube and Submitted confirmation.

Phase 8 preparation ended here; the user then explicitly authorized Phase 9. No public publication, deployment, account message or Devpost submission was authorized/performed.

## Phase 9 — Live verification and submission unblock

- [x] Inspect actual authentication/scope/subscription/backends/URLs and official Twitch/OBS/Codex guidance under feature freeze.
- [x] Prepare private localhost `.env`/encryption key and private evidence folder; launch existing build, inspect actual disconnected and public-source states without simulation.
- [x] Recover real principal Codex ID from matching native runtime/root-thread metadata; update submission field while keeping actual Codex footage blocked.
- [x] Fresh 42 Twitch-related fixture regressions and unchanged candidate hashes; no completed-work rebuild or new runtime dependency.
- [x] Inspect absent Git/remote, read-only GitHub exact-name lookup, eleven ignore probes and actual source candidate with zero private/generated paths.
- [x] LIVE_RELEASE_RUNBOOK, FINAL_BLOCKER_STATUS, existing audit/story/usage/checklist and exact manual launch/OBS/Git/recording instructions.
- [ ] **BLOCKED:** real Twitch credentials/authentication/participating viewers, native OBS, remote committed judge-accessible source, real final demo, public YouTube and Submitted confirmation.

One named blocker (principal session ID) is resolved. Six remain external; no false readiness/submission claim or publishing operation.

## External completion work — not performed

Complete real Twitch/OBS and streamer testing, deployment hardening, long soak, source-license choice and submission preparation.
Prepare an actual Twitch demo and genuine Codex session ID; simulations cannot replace them. Official deadline remains
2026-11-02 14:00 America/Los_Angeles per the current public overview/rules. No eligibility determination is made here.

## Remaining external and release checks

Mobbin authenticated flow access, native OBS/CEF and cross-browser checks, actual streamer usability sessions,
production host/storage scaling, real Twitch verification, game balance and composition against live broadcast footage.

## Phase9v2 current release follow-up

Actual OAuth/EventSub, genuine single-account A/B wins, measured decay, team lock, commitment and rematch verified.147 tests/50 production browser checks and build pass.
The early-cookie rotation race is fixed under feature freeze. Local main and release snapshot prepared; no remote/publication.
Native OBS, multi-account live combo/comeback, final demo/Codex footage, public YouTube and Submitted state remain open; see FINAL_BLOCKER_STATUS.
