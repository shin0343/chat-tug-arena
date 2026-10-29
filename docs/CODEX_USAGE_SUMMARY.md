# Codex usage summary

Prepared 2026-10-28 from [CODEX_BUILD_LOG](CODEX_BUILD_LOG.md), project source and recorded QA artifacts.
This is a contribution index, **not a replacement for the required real session ID or footage of Codex use**.

## Principal session — recovered in Phase 9

**PASS — principal identity verified privately.** The actual session identifier and native proof are retained in the
maintainer's ignored private submission handoff. Supply that real identifier in the required Devpost field;
it is deliberately absent from this public repository.
The current runtime's `CODEX_THREAD_ID` and `CODEX_SESSION_ID` agree with the ID inside its native `session_meta` record.
That record is a `codex-tui`/CLI root thread, has no subagent parent, began on 2026-10-27 and contains this project's Phase 3–9 user requests.
Only that matching thread was inspected; no unrelated conversation text was exported. See [identity evidence](qa/phase9/codex-thread-evidence.json).

This is native runtime/metadata verification, **not a claim that `/status` was opened or recorded**.
After this agent turn, open the same principal conversation and enter `/status` in Codex's composer (not a shell).
Compare its session/thread identifier if the host displays it. The [official command guide](https://learn.chatgpt.com/docs/developer-commands#inspect-the-session-with-status)
documents `/status` as a configuration/usage summary; not every host exposes the same ID row. Exact resume/check steps are in LIVE_RELEASE_RUNBOOK.
Do not substitute an EventSub socket ID, application cookie, helper ID or newly created thread. Actual principal-thread footage remains **BLOCKED**.

## Material contributions and inspectable evidence

| Area | Codex-assisted work recorded in this project | Code / evidence to show |
| --- | --- | --- |
| Architecture | Separate web, persistent realtime service and shared validation; session/public trust boundary | [ARCHITECTURE](ARCHITECTURE.md), `packages/contracts`, `apps/realtime/src/server.ts` |
| Twitch integration | Server OAuth, validation/refresh, confirmed EventSub, normalization, dedupe and reconnect state | Source/tests plus actual single-broadcaster A/B gameplay; multi-user/lifecycle limits in LIVE_TWITCH_TEST |
| Game implementation | Pure 20ms physics, bounded velocity/position, force half-life/damping, server clock, lifecycle/results | `game/engine.ts`, `controller.ts`, [GAME_DESIGN](GAME_DESIGN.md) |
| Physics tuning | Versioned constants, seeded scenarios, repeat weights, unique-user combos and transparent comeback behavior | `game/tuning.ts`, `scenarios.ts`, [seed-42 results](qa/phase7/scenarios.json) |
| Design system | Documented reference/access review, semantic tokens, approved dashboard/playing-field identity and rendered audit | [DESIGN](../DESIGN.md), [references](DESIGN_REFERENCES.md), [DESIGN_AUDIT](DESIGN_AUDIT.md) |
| Game art/motion | Original Fieldday atlas/connected rig, bounded crew poses, interpolation, reduced motion and consequence reveal | `apps/web/public/game/`, `src/lib/scene/`, `src/components/scene/`, asset ledger |
| Streamer workflow | Templates/forms, exact actions, confirmations, server-owned drafts, commitment/history and public source setup | `round-form.tsx`, `showdown-result.tsx`, `game/showdowns.ts`, [Phase 5 QA](QA_PHASE_5.md) |
| Testing/debugging | Determinism/authority/security/browser tests, visual captures and representative local load | [FINAL_QA_REPORT](FINAL_QA_REPORT.md), `tests/unit`, `tests/e2e` |
| Release fixes | Browser reproduction of stale CSRF; measured SSE failure, bounded drain fix and regressions | `connection-store.tsx`, `sse.ts`, `release.spec.ts`, `sse.test.ts`, [security review](SECURITY_REVIEW.md) |

Paths in the table's realtime rows are under `apps/realtime/src`; scene/workflow UI paths are under `apps/web/src`.
The build log documents phase-by-phase commands and outcomes, including failures and external limits. It is a project-authored record,
not an independently timestamped transcript proving every historical creative choice.

## Accurate attribution

The builder supplied product intent, extensive phase requirements, design-source constraints, acceptance criteria and scope decisions.
Codex helped research, implement, inspect rendered output, measure and debug. Original project art is code-native vector work authored with Codex;
third-party references and fonts retain their own authors/licenses. Do not claim that every design decision originated with Codex.

Codex is used as a development tool. The running game does not call an LLM or require an OpenAI API key.
Do not add an OpenAI runtime integration claim, fabricated session transcript or fake live-provider test to the submission.

## Suggested 22-second evidence cut

Show the genuine thread discussing architecture/physics, then the actual stream-failure reproduction and changed drain handling,
then the successful147-test/50-browser output or measured local load with its fixture label. Two or three legible views are enough.
Use footage from the principal project context; crop unrelated private content. Show that Codex materially contributed, rather than presenting a generic chat window.
Exclude credential-sharing turns. Phase9v2 also reproduced and fixed an early-cookie bootstrap race; that code/test discussion is useful genuine development evidence.
