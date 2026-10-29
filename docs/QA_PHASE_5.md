# Phase 5 — Streamer workflow and real consequences

2026-10-27. Phase 5 implementation and local production verification are complete.
Real Twitch broadcaster testing, native OBS/CEF and release/submission remain external gates. Stop after Phase 5.

## Concrete changes

The control room now centers on the current question, authoritative game state, primary action and result.
Choices/rules and the **actual room-linked OBS preview** are secondary. Latest results and recognized-command detail are tertiary.
The paper/graphite/forest/coral/mint tokens, DM Sans, Barlow Condensed, original game art and shared components are preserved.
DESIGN v1.4 and decisions D19–D21 document the specific workflow revision; no new UI kit or runtime dependency.

Showdown setup provides five editable templates: next character, weapon/loadout, strategy, challenge and custom community decision.
Save a question, distinct choices, both exact keywords, duration, consequence and start condition together to the server session.
Custom actions allow 1–120 characters per choice. Validation keeps edits and focuses the first invalid field.
Settings revisions prevent stale tabs overwriting newer saves; “Load saved settings” is explicit.
Browser storage is no longer authoritative. Saved settings survive reload/navigation in this session even when browser storage is blocked.

Start is always manual and server-confirmed. Optional readiness requires a fresh matching-source command after preparation.
Start/pause/resume/manual Finish/cancel/reset/rematch are available beside the question. Finish uses the existing server position/tie
rule, and accepts no client winner. Destructive actions have a named native dialog with safe initial focus, Tab/Shift+Tab wrapping,
Escape and focus restoration. Old action feedback does not linger into another game state.

The server freezes the winning choice, summary and exact action. Example: **Chat chose Mage for the next match. Play as Mage in the next match.**
The same result appears in the dashboard, embedded preview and separate cookie-free overlay. “Commit to this choice” records one
server timestamp and unlocks another round. It records intention, not an automatic game change or proof that the action happened.
Every result-replacement path, including legacy reset/simulation, rejects a pending commitment. Ties/no-play/cancel have no forced action.
The newest 20 showdowns retain source/fixture provenance. Reset keeps history; restart/session expiry clears it.

Useful insights are actual time, crew participants, effective pulls, combo and connection health. Effective pulls sum accepted
diminishing-return weights; combo scales pressure separately. No decorative analytics, estimated audience or invented metrics.

## Accessible reference evidence

[Full Phase 5 matrix with URLs and access limits](DESIGN_REFERENCES.md#phase-5--operational-workflow-and-actionable-outcomes-2026-10-27).
Mobbin public discovery was prioritized, but authenticated setup/settings/dialog flows remained unavailable. No unseen flow is claimed.
Linear's actual public template form screenshot supplied persistent labels, preset context and one creation action; its public archive
guide supplied the current/completed-work distinction. PostHog's documented setup sequence supplied contextual next steps.
Actual Awesome Linear/PostHog files informed surface/button/input roles. Existing A1/Lusion evidence was reused with limits;
the new Awwwards fetch timed out. Recent's actual processing-state image supplied nearby written feedback, not measured motion timing.
No complete screen, reference art, palette or proprietary font was copied. External images remain temporary research only.

## Verified flows

| Flow | Actual verification |
| --- | --- |
| Disconnected/empty | Honest connection state, clear Create action, empty history; no false live counter or enabled Start |
| Configure/save | Template choices, duplicate names/keywords, custom-action errors, retained edits/focus, real server save, reload and blocked browser storage |
| Concurrency | Another tab saves; local draft stays intact, Save disables and explicit reload adopts the newer revision |
| Prepare/start | Source readiness and optional fresh command required; rehearsal remains READY until Start; no participants credited for the check |
| Active/combo | Actual server normalized simulation/SSE, weighted pulls and distinct-user combo; game and both preview/source receive current state |
| Pause/resume | Position/time freeze; server-confirmed resume; controls stay reachable with maximum-length content at mobile sizes |
| Finish/cancel/reset | Native dialog keyboard cycle/Escape/focus return; manual server result; cancellation neutral; reset retains committed history |
| Result/commit/rematch | Exact Mage action agrees across three surfaces; repeat commit is idempotent; pending result blocks replacement; fresh round ID/participants |
| History | Committed result and cancelled rematch remain distinct; source labels and retention limits are explicit |
| Failure/recovery | Failed save preserves edits; offline closes private SSE, disables controls and hides the clock; online restores current authority |
| Viewing/control boundary | Zero-cookie public context, bearer view only; no public history/CSRF/viewer IDs; view capability cannot Finish/Commit; forged CSRF/origin rejected |
| Provider path | Injected **test_fixture** EventSub traverses recognized command → fresh check → ACTIVE participation → exact action/history, retaining fixture provenance |

The local full journey uses real application endpoints and server simulation, not forged game snapshots.
The provider fixture is not an actual Twitch channel/consent test. Existing OAuth/session/EventSub/fairness tests also continue to pass.

## Actual visual evidence

| State | Evidence |
| --- | --- |
| Before the workflow revision | [Phase 4 dashboard inspected before editing](qa/phase5/before-dashboard.png) |
| Empty/disconnected | [Control room](qa/phase5/empty-desktop.png), [connection page](qa/phase5/regression/connection-desktop.png) |
| Configuration | [Full form](qa/phase5/configuration-full-desktop.png), [validation](qa/phase5/validation-desktop.png) |
| Ready/countdown | [Ready](qa/phase5/ready-desktop.png), [countdown](qa/phase5/countdown-desktop.png) |
| Active/combo | [Actual combo](qa/phase5/active-combo-desktop.png) |
| Pause/confirmation | [Paused](qa/phase5/paused-desktop.png), [viewport dialog with keyboard focus](qa/phase5/finish-confirmation-desktop.png) |
| Winner/action | [Result](qa/phase5/result-desktop.png), [full page](qa/phase5/result-full-desktop.png), [same OBS result](qa/phase5/result-overlay-1920.png) |
| Commitment/history | [Committed](qa/phase5/committed-desktop.png), [OBS commitment](qa/phase5/committed-overlay-1920.png), [history](qa/phase5/history-desktop.png) |
| Failure states | [Save error](qa/phase5/save-error-desktop.png), [stale settings](qa/phase5/settings-conflict-desktop.png), [connection loss](qa/phase5/connection-interruption-desktop.png) |
| Reduced motion/start check | [Fresh command required](qa/phase5/start-check-reduced-motion.png) |
| Small layouts | [1024](qa/phase5/paused-1024.png), [768](qa/phase5/paused-768.png), [390](qa/phase5/paused-390.png), [320](qa/phase5/paused-320.png), [long result at 320](qa/phase5/result-320.png) |
| Long OBS action | [1920](qa/phase5/long-consequence-overlay-1920.png), [1280](qa/phase5/long-consequence-overlay-1280.png), [960](qa/phase5/long-consequence-overlay-960.png) |

Compared the actual renders with DESIGN.md and the recorded references: primary action remains near the current question;
shared panel/field/button geometry and spacing remain coherent; result action has its own emphasis; secondary preview/rules are quieter;
history does not compete with live controls. Team labels reinforce color, source disclosure remains visible, and no decorative chart was added.
Checks include maximum 60-character question, 20-character choices, 21-character commands and long custom consequence text.
No horizontal document overflow or clipped source composition was found in the tested sizes. At 320px the long result requires normal
vertical reading; operational buttons during play remain in the first viewport. Tiny embedded preview metadata is intentionally secondary.

Actual recorded rehearsal (no real Twitch claim):

- [Streamer journey, MP4](qa/phase5/motion/streamer-journey.mp4) and [sampled filmstrip](qa/phase5/motion/streamer-journey-filmstrip.jpg).
- [Separate public consequence/commitment overlay, MP4](qa/phase5/motion/consequence-overlay.mp4) and [filmstrip](qa/phase5/motion/consequence-overlay-filmstrip.jpg).

Recordings use the real viewport. Full-page screenshot resizing was excluded from the recorded journey to avoid screencast artifacts;
the confirmation capture uses the actual viewport because a native modal backdrop covers the viewport, not an artificial stitched page.
MP4s are ordinary H.264 browser-recording exports, not alpha videos. Transparent source PNGs establish transparency separately.

## Tests actually run

| Command | Result |
| --- | --- |
| `npm run check` | Lint, type checks, **137 tests in 11 files**, all **16 contrast pairs**, production build passed |
| `PLAYWRIGHT_PRODUCTION=1 npm run test:e2e` | **43/43 Chromium tests passed**, including seven new showdown journeys |
| Focused production recording/dialog recapture | Both cases passed after improving capture geometry; no product behavior replaced by fixtures |

The final full production run after the last readiness fix passed all 43 cases in 92.19 seconds, with no failures, flakes or skips.
[Machine-readable verification](qa/phase5/verification.json) records the check results, 68 screenshots, recording metadata and explicit limits.
All 46 local documentation links checked before adding this verification link resolved. Neither test-server port remained listening after teardown.

The 23 added unit/integration/component cases cover 13 contract/mechanics/history cases, six HTTP/provider workflow cases and four
static-render component cases (including escaping and non-automatic commitment language). Browser cases cover interactive semantics,
focus/keyboard, actual private/public streams, failure paths, five dashboard sizes and three consequence-source sizes.
The full suite retains Phase 4's art/reduced-motion/reconnect checks and prior Twitch fixture/authorization/product checks.
SIGTERM during automatic server teardown may print npm exit 143 for a child; the test runner completed successfully and listeners closed.

## Issues found and corrected

1. Browser-only settings disagreed with live authority: save the complete draft/commands to the session, with revision/rollback checks.
2. An embedded standby iframe ignored its later room fragment: mount only when the capability is ready and remount on rotation.
3. Start feedback persisted after finish; combo looked active after finish: bind feedback to round/state and label ended combos.
4. Native backward Tab could leave dialog controls: explicitly wrap both directions, retain Escape and restore the trigger.
5. Long mobile questions pushed Resume below the fold: collapse redundant introductory/healthy-connection copy during play.
6. An inherited source-metadata rule shrank the next action: use a scoped display-type rule and assert its actual computed size.
7. Existing private EventSource could survive offline mode: explicitly close/abort offline, disable controls and bootstrap online.
8. A delayed recognized message could appear fresh by receipt order alone: compare occurrence time/source with preparation as well.
9. QA-only issues: Next dev HMR briefly served an old navigation label; a fresh document had no mismatch and production tests are clean.
   A broad alert locator also matched Next's hidden route announcer; scope assertions to main. Neither was fixed by hiding product failures.

## Remaining gates and limits

- Real Twitch app registration/consent, actual broadcaster/viewer rounds, refresh/revocation recovery and live evidence remain unverified.
- No native OBS/CEF, encoder/compositing soak, non-Chromium browser or real streamer usability session was performed.
- A commitment is a promise. No external game integration or verification of follow-through exists.
- Draft/history are session-memory data; restart/expiry clears them. No durable or cross-session history is promised.
- No new FPS claim: Phase 4 performance measurements remain historical. This phase verifies behavior, bounds, readable output and cleanup.
- No deployment, Git commit/push or submission. This folder has no Git repository metadata. No subsequent phase was started.

The implementation is ready for real broadcaster/OBS validation. The [official rules](https://twitchcon-codex.devpost.com/rules)
still require genuine Twitch/Codex project evidence; these local/fixture recordings cannot substitute for that gate.
