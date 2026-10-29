# Release checklist — Phase 7

**Current decision: BLOCKED for submission/public production. Local hardening is verified; essential external evidence is missing.**
PASS means performed; BLOCKED means no required environment/evidence. An unchecked checkbox is not a passed test.
See [final QA](FINAL_QA_REPORT.md), [live protocol](LIVE_TWITCH_TEST.md), [security review](SECURITY_REVIEW.md).
Phase9v2 current status: real Codex ID, actual OAuth/EventSub and single-account A/B gameplay verified;147 tests and50 production browser tests passed.
Real multi-account combo/comeback, native OBS and final submission artifacts remain open.
Use [the existing updated audit](FINAL_SUBMISSION_AUDIT.md) and [runbook](LIVE_RELEASE_RUNBOOK.md); historical completed checks below are not live proof.

## Local release candidate

- [x] Read AGENTS/DESIGN and preserve approved visual identity; no new design tokens/art/dependencies.
- [x] Root source: lint, typecheck, 145 unit/integration tests, 16 contrast pairs and production build.
- [x] Source-only temporary copy: fresh `npm ci`, same complete checks/build; no copied node_modules/build/vault/secrets.
- [x] Fix stale CSRF response across session rotation; preserve server authority.
- [x] Fix SSE backpressure; latest-only pending snapshot and 5s blocked-consumer cleanup.
- [x] Verify cookie/Origin/CSRF, queued-session rotation, all privileged routes vs public capability, body/action/stream limits.
- [x] Deterministic mechanics/scenarios, winner/tie/no-play, pause/resume, rematch and duplicate/spam tests.
- [x] Local HTTP/SSE EventSub-fixture load: 120s, 2714 attempts, 10 rounds, 6 overlays + dashboard, no stream errors after fix.
- [x] Current npm advisory audit and source-pattern inspection; no real secret values emitted.
- [x] Real browser local workflow/animation evidence; final results linked in FINAL_QA_REPORT.
- [x] Environment/setup/limitations and actual commands documented.

## External release gates

- [x] **Basic real Twitch:** actual broadcaster, real messages, both directions/results, decay, team locking, acknowledgment and rematch verified.
- [ ] **Live multi-account gate:** genuine unique-viewer combo/comeback; live cooldown/diminishing and additional provider lifecycle cases remain unverified.
- [ ] **P0 BLOCKED — Judge access:** accessible runnable repository URL and permitted testing access verified from a fresh viewer/judge context.
- [x] **Codex principal ID:** recovered and verified against native runtime/root-thread metadata; actual Codex-use footage remains open.
- [ ] **P0 BLOCKED — Submission provenance:** entrant confirms new work in the submission window; the new local Git snapshot does not retroactively prove earlier creation history.
- [ ] **P1 BLOCKED — Native OBS:** browser source transparency, margins, 1920/1280 scaling, live responsiveness, refresh and result verified in real OBS/CEF.
- [ ] **P1 BLOCKED — Real credential lifecycle:** actual invalid/expired/revoked credentials, EventSub recovery and longer live soak completed without leaking tokens.
- [ ] **P1 BLOCKED — Public hosting, if used:** exact HTTPS origin/callback, private backend/vault, stable key, ingress admission/rate policy, unbuffered proxy, restart/revoke workflow.
- [ ] **P1 BLOCKED — Demo:** actual Twitch and Codex footage, permitted audio/visuals, final duration, public YouTube URL and rendered review.
- [ ] **P2 OPEN — Broader QA:** Firefox/WebKit/OBS CEF versions, real streamer task study, busy-video composition and game-balance sessions.
- [ ] **P2 OPEN — Repository rights:** project-wide license decision, dependency notices, eventual git-history/artifact secret scan and approved final evidence selection.
- [ ] **BLOCKED — Devpost:** all fields and links rechecked; actual Submitted confirmation captured. No external submission has been made here.

## Reproduce the local checks

```bash
npm ci
cp -n .env.example .env
npm run check
PLAYWRIGHT_PRODUCTION=1 npm run test:e2e
QA_OUTPUT_DIRECTORY=docs/qa/phase7 npm run test:scenarios
QA_OUTPUT_DIRECTORY=docs/qa/phase7 npm run test:game-performance
npm run qa:release-load
npm audit --json
```

The load script injects explicitly labelled `test_fixture` EventSub into the real local server; it neither requires real credentials nor counts as live verification.
For the isolated Chromium probe, start the built app, then run
`QA_OUTPUT_DIRECTORY=docs/qa/phase7 npm run qa:phase4 -- --performance-only`; native OBS remains a separate test.
If a browser is absent, run `npx playwright install chromium` before browser tests. Match the configured origin in all browser requests.

## Final operator order

1. Resolve live/OBS/access gates and attach actual evidence without secrets. Re-run checks against the exact release candidate.
2. Confirm one persistent instance, stable vault key and documented ephemeral game/history behavior. A restart requires a new overlay URL.
3. Freeze the source/assets/instructions/demo links used for submission; record real repository revision and video duration.
4. Review the official rules and current updates; keep entrant eligibility and team permissions for the entrant to confirm.
5. Publish/upload/submit only with explicit authorization. Confirm actual Devpost state; stop modifying submitted materials after the deadline.

This checklist does not authorize external publication, deployment, account messages or submission.
