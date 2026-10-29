# Chat Tug Arena — Agent Instructions

## Read before editing

Read `DESIGN.md` first on every phase. Then read `docs/HACKATHON_BRIEF.md`,
`docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/GAME_DESIGN.md`,
`docs/JUDGING_STRATEGY.md`, `docs/DESIGN_DECISIONS.md`, and `docs/ROADMAP.md`.
Phase 0 files were absent in the originally empty directory; the Phase 1 baseline is documented,
not retroactively represented as a previously approved Phase 0.

## Preserve the design

Every subsequent phase MUST preserve DESIGN.md and the semantic CSS tokens.
Design changes need a specific user-task rationale, a decision record, synchronized tokens, and real screenshot QA.
Read `docs/DESIGN_REFERENCES.md` before claiming a reference was inspected; distinguish analyses,
screenshots, documented flows, and live interactions. Never invent reference details or hide access limits.
Do not redistribute third-party reference screenshots. Only product screenshots belong in `docs/qa/`.

## Scope and trust

Phase 2 implements Twitch OAuth/EventSub, session SSE, configurable commands and labeled simulation.
Read docs/TWITCH_SETUP.md and docs/QA_PHASE_2.md. Real Twitch verification remains BLOCKED until
an actual authorized channel message reaches a browser; fixtures and simulation never satisfy that gate.
Phase 3 implements the authoritative game, cooldowns/combos, lifecycle, mechanics lab and read-only room overlay synchronization.
Read docs/GAME_DESIGN.md and docs/QA_PHASE_3.md for tested constants, measured scenarios and remaining live-provider limits.
Landing demo controls only mutate local demonstration state.
No Twitch tokens in browser storage, client bundles, URLs, screenshots, or build logs.
Future auth/room work must preserve server authority and isolate read-only overlay access from streamer controls.
Phase 4 implements the original Fieldday crew rig, bounded visual event reactions and the dedicated transparent OBS scene.
Read docs/QA_PHASE_4.md, docs/ASSET_CREDITS.md and docs/DESIGN_REFERENCES.md before changing the art or motion.
Native OBS/CEF and actual Twitch testing remain open; Chromium/simulation recordings are not live-provider evidence.
Phase 5 implements the streamer showdown workflow, server-session settings, exact consequences, commitment and latest-20 history.
Read docs/QA_PHASE_5.md and docs/PHASE_5_PLAN.md. Streamer settings are server-owned; local preview storage is not authority.
Keep commitment separate from real game control/completion. Public overlay gets the current consequence, never history or control rights.
Phase 6 audits and refines the actual UI: shared Fieldday previews, choice-based broadcast result, scalable HUD struts,
task copy, type-role consistency and mobile navigation. Read docs/DESIGN_AUDIT.md for evidence and remaining external gates.
Do not implement Phase 7+ without an explicit instruction to start that phase.
Phase 7 was explicitly authorized: read docs/FINAL_QA_REPORT.md, LIVE_TWITCH_TEST.md, SECURITY_REVIEW.md and RELEASE_CHECKLIST.md.
The connection provider rejects late prior-session responses; shared SSE handles bounded backpressure/drain and rotation.
Preserve both regressions. Local checks do not clear real Twitch/native OBS/public-host gates.
Phase 8 was subsequently authorized for submission preparation. Read docs/FINAL_SUBMISSION_AUDIT.md before release claims.
Drafts/scripts are not recordings, uploads, repo access or Submitted status; no external publishing/submission is authorized.
Phase 9 is explicitly authorized under feature freeze. Read LIVE_RELEASE_RUNBOOK and FINAL_BLOCKER_STATUS; update the existing submission audit.
The actual principal Codex ID was recovered from native metadata. Do not confuse that with recorded Codex footage or live Twitch proof.
Private `.env`/`.local-evidence` stay ignored; no Git commit/push, visibility change, upload or submission without explicit authorization.

## Structure and commands

Node 22+, npm workspaces. `apps/web` Next.js; `apps/realtime` persistent Node HTTP/SSE + Twitch WS process;
`packages/contracts` shared validation and transport contracts.
`npm ci`, `npm run dev`, `npm run check`, `npm run test:e2e`.
See README for ports, environment loading and production commands.
Build contracts before launching either app. Never use a serverless request handler as the game loop.
Keep dependencies focused. Prefer shared original components to importing a large component kit.
Keep the SSE `no-transform` header; compression otherwise delays first updates through Next.
No production fake-auth endpoints or alternate provider URLs. Test gateways must label `test_fixture`.

## Verification and records

Run lint, typecheck, relevant Vitest tests, production build, and browser tests for changed flows.
Inspect screenshots at desktop and small viewports, not just markup or automated assertions.
Document material QA findings and exact results in `docs/QA_PHASE_1.md` / later phase equivalent.
Update CODEX_BUILD_LOG, ROADMAP, ARCHITECTURE and ASSET_CREDITS as applicable.
Do not claim a test passed unless it ran. No unsolicited commits, pushes, or deployment.
