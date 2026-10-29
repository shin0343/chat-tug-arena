# Product Specification — Phase 5

A streamer sets up a short tug-of-war that Twitch viewers control with chat commands.
Two crews compete over one rope. A broadcast overlay gives viewers the state and next action in one glance.

## Phase 1 user paths

1. Landing: understand the game, use labeled local demo pulls, begin setup.
2. Connection: inspect a clearly disconnected Twitch surface; see what connecting will mean.
3. Configure: choose names, round title, duration and per-viewer cooldown; validate and save in this browser.
4. Dashboard: inspect the saved round, disconnected state, setup checklist and empty activity.
5. Overlay setup: copy an explicitly non-live preview URL, inspect the transparent source and dimensions.

Phase 1 paths above remain the historical foundation. Phase 2 replaces its connection shell with actual integration.

## Phase 2 user paths and limits

1. Connect the broadcaster account through genuine Twitch authorization; request only chat read access.
2. Confirm channel identity and a successfully subscribed chat connection; explain every failure/recovery state.
3. Save two distinct server-session commands; case and surrounding whitespace are ignored, substring matches are rejected.
4. See recognized typed team inputs delivered through SSE on connection and dashboard pages.
5. Run deterministic simulation through the same normalizer/parser, clearly separate from Twitch ingestion.

Phase 2 did not apply game rules or synchronize OBS. Those limits describe the historical phase.
Never spoof connected status or present simulation as Twitch activity. The current live-provider verification gate remains BLOCKED.

## Phase 3 user paths

1. Save local round preferences; Prepare in the control room copies validated rules to a server round once Twitch is confirmed connected
   or simulation has explicitly been selected. Start opens the server's three-second countdown.
2. During ACTIVE, recognized chat passes cooldown, team lock, diminishing returns, source/time checks, dedupe and burst limits.
   Distinct viewers build combos and collectively accelerate a rope with persistent, decaying momentum.
3. Pause/resume freezes authoritative time and pressure. Twitch loss pauses automatically; confirmed reconnect requires explicit resume.
4. The server determines an endpoint/time win, participation tie, no-participation result or abandonment. Rematch clears membership and state.
5. Mechanics lab runs seven seeded server scenarios and bounded manual simulation pulls, exposing force, velocity, combos, input decisions
   and typed visual events using the established design. This is a tuning tool, not the final broadcast scene.
6. OBS setup copies a separate read-only room capability. The source receives server config/clock/rope/results without streamer cookies.
   Simulation/fixture sources stay labeled; update loss freezes the drawing and hides the live clock. The original preview remains standby.

Phase 4 adds detailed event reactions and broadcast finishing. No new dependency/database is required.
Phase 3 live Twitch/native OBS verification is still open because actual credentials/messages/OBS were unavailable; fixtures do not clear it.

## Phase 4 user paths

1. A separate read-only `/overlay#room=…` displays the original Fieldday crew on a transparent 16:9 canvas.
   Solid label and field backplates protect contrast over video; the dashboard retains its existing controls/layout.
2. Up to five figures per team share connected pulling poses. Exact aggregate joined counts, commands, effort, combo multiplier/time,
   clock and endpoint flags make the game legible. No random profile images or public viewer identities.
3. Fresh combos synchronize the crew; momentum/lead/comeback produce one bounded cue. A final-five clock pulse builds pressure.
   The server result selects one victory hop/defeated sit and a settled result. Tie/no-play/abandon remain distinct.
4. Pause, hidden tab, offline and reduced motion stop animation work; reconnect rebases to current authority without replaying effects.
5. Actual state screenshots, motion recordings and production Chromium QA are documented in QA_PHASE_4. These are simulation evidence,
   not native OBS, real Twitch or streamer playtesting. This remains the historical Phase 4 verification boundary.

## Phase 5 complete streamer workflow

1. Connect Twitch through the existing scoped authorization/subscription flow. Connection health stays above the current showdown;
   transport loss disables controls. Without credentials, use an explicitly labeled rehearsal from the control room.
2. Showdown setup offers five editable templates: next character, weapon/loadout, strategy, challenge and custom community decision.
   Save a question, two distinct choices, exact keywords, duration, consequence and start condition together to the server session.
   Keep invalid edits/focus the first error; do not let stale tabs overwrite newer saved settings. No browser storage is needed.
3. A confirmed source prepares the saved draft; an explicit Start opens the real countdown. Optionally require a fresh test command
   after preparation. Pause/resume, manual Finish, cancel/reset and rematch reflect confirmed server state. Important endings use a keyboard-accessible dialog.
4. The primary task contains the question, game and controls. Secondary rail contains choices/rules and actual read-only OBS preview.
   Useful participation shows exact distinct viewers, diminishing-return weighted pulls and current combo. History/help stay tertiary.
5. At finish, freeze the winning choice and exact action. Show the same result in the dashboard and OBS. The streamer records a commitment
   before replacing a decided round. This is manual follow-through, not automatic game control or proof of completion.
6. Keep the newest 20 showdown results/commitments for this session. Reset keeps them; restart or expiry clears them. Neutral results
   require no commitment. Rematch clears participants and respects the fresh-command start condition again.
7. OBS setup supplies a masked/revealable viewing URL, actual source preview, copy success/failure fallback, dimensions and troubleshooting.
   The public source has no control cookie, history, CSRF or mutation authority. Standby preview remains separately labeled.

Rehearsal uses real local controls/normalization/SSE and visibly simulated viewers; it cannot satisfy real Twitch or native OBS gates.
No public deployment, submission, automatic game-control integration, account creation or new database is part of Phase 5.

## Future success measures

Observe time to a verified first test round, first-time configuration errors, command comprehension at
broadcast size, and disconnect recovery. Do not display unmeasured target metrics as achieved results.
No monetization, leaderboards, inventory, AI commentary, multi-stream lobbies or payments in the foundation.
