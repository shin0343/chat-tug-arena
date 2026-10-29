# Phase 5 implementation plan

The user authorized the streamer workflow and real consequences, not deployment/submission.
Preserve DESIGN v1.3: paper #fafbf9, workspace #f5f7f8, graphite #202c35, forest #284f45,
Coral #ef9b85 and Mint #a6d5bf. DM Sans for controls; Barlow Condensed for the arena only.

Layout: left-aligned operational copy, existing 216px sidebar and shared Panel/Button/StatusBadge components.
One current-showdown panel owns the question, game and primary controls; a quiet rail holds settings/OBS.
History sits below the current task; diagnostics stay in Mechanics lab.

```text
connection health + recovery
current question / server state        saved choices and rules
arena                                 actual OBS setup link
start / pause / finish                 rehearsal (explicit simulation)
result + exact action + commitment
useful crew participation summary
recent showdown history
```

Five templates prefill editable questions/choices. Save a validated server-session draft with both commands atomically;
an expected settings revision prevents stale tabs overwriting newer saves. Preparation freezes config for a round.
Start conditions: confirmed connection, optionally a fresh recognized test command after preparation. Never auto-start on connect.

The server freezes winning choice and action; only the broadcaster can acknowledge a commitment. Require that acknowledgment
before replacing a decided showdown. Retain the latest 20 results for this session; no new database or automatic game-control claim.
Finish resolves current authoritative position, with existing tie/no-play rules. Cancel/reset require an accessible native dialog.
Public OBS receives current consequence/commitment only, no control session, private history or input identities.

The prior dashboard was reviewed against the brief: the sidebar prepare control and setup checklist competed with the scene,
browser-only settings were separate from authority, and OBS preview showed a disconnected shell. Move controls beside the current
question, persist session settings, and preview the actual read-only source. Keep the existing art/palette instead of a new dashboard theme.

Verification: deterministic result/history/validation/authority tests, static-render component tests, full production browser journey,
keyboard/dialog/reduced-motion/error tests and screenshots at desktop/tablet/mobile. Real Twitch/native OBS remain separate gates.

Implemented as DESIGN v1.4. Final implementation/verification and evidence are recorded in QA_PHASE_5;
no deployment, submission or subsequent phase is part of this plan.
