# Design Decisions

## D01 — Explicit foundation baseline (2026-10-27)

The requested folder was empty. No AGENTS or Phase 0 documents existed in this repository or its ancestors.
We established the user-preferred stack and a small provisional game/configuration contract, rather than inventing prior approval.
PRODUCT_SPEC, GAME_DESIGN and ARCHITECTURE identify the boundary. Balance, auth and persistence remain future work.

## D02 — The clubhouse and playing field

Use cool paper, graphite chrome, forest actions, coral/mint teams, DM Sans controls and Barlow Condensed sports display.
The original rope/knot is the motif. The calm control room and broad broadcast stage share identity, not density.
Initial design review rejected an all-dark lavender creator-tool template and a cream mascot marketing page:
both would mirror reference branding instead of the shared tug-of-war task.

## D03 — Real product proof

The first desktop viewport pairs the headline with a manually playable arena. No invented results or audience metrics.
The three numbered blocks represent actual setup steps, not arbitrary marketing decoration.
Only meaningful product copy and a brief preview limitation follow; no testimonial or filler sections.

## D04 — Honest connection boundary

Twitch controls are visibly disabled with a nearby reason. Preview setup remains usable.
No OAuth URL, secret input, token, fake connected account or simulated chat feed exists in Phase 1.
WebSocket process health is not Twitch readiness. The transport always reports disconnected and rejects mutations.

## D05 — Local configuration and separate source

Shared validation rejects blank/overlong/duplicate crew names and invalid rules. Store only non-sensitive preview settings.
Use a stable external-store snapshot to survive route changes and avoid browser/server hydration mismatch.
Keep draft edits independent of persisted values so Save does not remount the form or lose confirmation.
The copied source is explicitly a fixed disconnected shell; browser-local configuration is not OBS synchronization.
Future room state must come from the authoritative server.

## D06 — Evidence and rights

Read actual Linear/PostHog/Raycast analysis files and previews; document their marketing/auth/mobile limitations.
Mobbin anonymous access did not expose the desired flows; supplement with public primary documentation and label it.
Do not redistribute reference screenshots. Preserve font OFL notices. No proprietary font, brand mark or imagery copied.
Tiny Swords' latest license restricts redistribution; it is a research candidate only, not an asset dependency.

## D07 — Motion follows action

120/180/280ms transitions; translating crews and rope as one assembly is the only expressive demo motion.
No idle ticking clock or ambient animation in an unconnected arena. Reduced motion removes transitions.
Recent Liquid Button supplied a useful rejection: readable reaction is useful, unstable controls and gradient glow are not.

## D08 — Screenshot iteration

The first OBS capture letterboxed the scene into a small central group because the SVG viewBox and fixed-height viewport
had different aspect ratios. A broadcast-specific crop and intrinsic SVG height restored the full-width field.
The dashboard uses a tighter SVG crop to remove empty sky and reduce scrolling to activity.
Small layouts use wrapping navigation, stacked controls and explicit 44px targets, verified at 320–1024px.
The first mobile OBS setup diagram had an aspect-ratio/min-height width transfer that overflowed inside
an overflow-hidden panel, clipping the Mint team without creating page-level horizontal scroll.
It was replaced with the actual standalone source in a bounded 16:9 iframe; tests now check the source
and Mint label bounds, not only the document width. This also prevents a separate preview drawing from drifting.
See QA_PHASE_1 for final evidence and limitations.

## D09 — Minimal dependency and tooling choices

Npm workspaces, Next 16.4.3 / React 19.3.1, Tailwind 4.3.3, TypeScript, native Node HTTP + ws,
Vitest and Playwright. No UI kit, global state library, game framework or animation dependency.
Npm 10 crashed while expanding optional Vitest peers; `legacy-peer-deps=true` is recorded in `.npmrc` for reproducible installs.
The installed direct dependency tree was inspected; production compilation and actual tests validate the selected package set.
Next wrote an app-level AGENTS block during dev; it is retained and supplemented with the root design requirement.
Type checks run `next typegen` first, following the installed CLI documentation, so a fresh checkout does not depend on old generated route files.

## D10 — Verified connection state, shared design (Phase 2, 2026-10-27)

The original tokens, fonts, icons and surfaces remain. The connection panel now explains a single permission,
shows the authorized account separately from subscription health and names all eight required states.
Error/warning/success use the existing semantic palette; simulation keeps the existing demo treatment.
Slack’s public install/reauthorize branches and Discord’s named-account Connections rows informed context and recovery,
not a copied screen. Mobbin authenticated flows remain inaccessible and are not claimed as inspected.
No decoration or animation was added during authorization.

## D11 — Commands become session configuration

The Phase 2 user instruction explicitly requires two configurable keywords. This revises DESIGN v1.0’s fixed-command
clause to v1.1 without changing colors or team identity. Default commands remain !coral/!mint; a strict exact-match parser
avoids substring votes. Commands are server-session data, distinct from local crew-name/round preview preferences.
Dashboard and round previews show actual session commands; the standalone OBS shell still shows defaults until Phase 3.

## D12 — Server authority and truthful evidence

Server Authorization Code + broadcaster-self user token requests only user:read:chat. Native HTTP, ws and crypto
support the integration without new dependencies. Same-origin cookie/CSRF controls and read-only SSE replace the
Phase 1 public stub. Optional encrypted auth persistence becomes mandatory for configured production Twitch.
Fixtures are injected only in tests and explicitly tagged test_fixture. Local simulation never produces live evidence.
Evidence requires a real-origin parsed command and client acknowledgement; without an actual live test, the report stays BLOCKED.

## D13 — Browser verification revealed transport and feedback defects

Direct Node SSE delivered immediately, but Next’s gzip buffered the small frames. `no-transform` on SSE fixed the cause,
verified through the real proxy in Chromium. Do not remove that header when deploying another proxy.
A command-derived React key remounted the form on save and erased its confirmation; the form now retains its own draft/result.
Browser regressions exercise both issues. Feed loss removes the green confirmation even if the last snapshot said Connected.
The systematic investigation followed the gstack:investigate skill; its optional runtime was unavailable, so existing HTTP/Playwright tools supplied evidence.
The final 320px boundary check exposed maximum-length command clipping. Command labels and the small command-note row now wrap;
the browser regression measures actual text bounds, since an overflow-hidden preview can conceal clipping from document-width checks.

## D14 — Authoritative gameplay, same visual language (Phase 3, 2026-10-27)

DESIGN v1.2 records room-linked source behavior and the developer Mechanics lab. The user explicitly requested a tuning interface
and game-to-visual contracts. Existing fonts, palette, SVG crew/rope, panels and control geometry remain unchanged; no new art or dependencies.
Telemetry belongs in the lab; the overlay keeps the broad composition, readable clock, source disclosure and no control chrome.
Native meter defaults were explicitly replaced by the existing team fills after screenshot review revealed a browser-default green gradient.
Only basic authoritative position interpolation is introduced. No Phase 4 detailed animation, asset selection or effects.

## D15 — Fair force and honest results

Server-fixed 20ms steps, repeated participation with diminishing returns, distinct-user combo thresholds and per-round team locking
make coordinated chat stronger than spam. No trailing-team force boost or random comeback. Endpoint/time/tie/no-play/abandon rules,
pause/reconnect barriers and exact constants are documented with measured outcomes in GAME_DESIGN.
Read-only OBS capabilities remain distinct from control sessions and never authorize Twitch input/results. Simulation stays labeled.
Developer/browser fixtures and completed local rounds do not replace the blocked real-provider exit evidence.

## D16 — Original Fieldday crew instead of an incompatible pack (Phase 4, 2026-10-27)

The user authorized Phase 4 and explicitly permits original coherent vectors when compatible animated sprites are unavailable.
Exact Kenney Toon/Shape archives and their CC0 licenses were inspected, including poses and sheets. Toon has real walk/cheer/climb
frames, but neither family supplies a matching horizontal ground-planted pull cycle for the current hand/rope geometry.
Extend the established original crew into one connected vector rig with planted feet, coherent body weight and shared grips.
Three heads/boots/cup share one 2432-byte symbol atlas. Paper/graphite/coral/mint, DM Sans and Barlow Condensed remain unchanged;
no AI bitmap, new font, external art dependency or new project license.
Pikuniku supplies silhouette/readability principles; Heave Ho supplies visible physical contact/collective effort, not copied characters.
DESIGN v1.3 records the revised art/motion rules. Actual source screenshots and motion evidence are in QA_PHASE_4.

## D17 — A broadcast playing field with bounded reactions

Use a shallow opaque cut-paper field so dark legs and warm rope remain readable over arbitrary footage, inside a genuinely
transparent 16:9 source. Finish flags match server endpoint coordinates. Limit the cast to five per side; aggregate joined counts
remain exact and the two base mascots never pretend to be viewers. Small effort pips and one multiplier strip replace dense telemetry.
Only one prioritized comeback/swing/lead cue is shown. A single winner hop resolves to a cup/result, while defeated crews sit.
No camera shake, particles, WebGL, endless confetti, sound autoplay or dashboard redesign. Native OBS testing remains a separate open gate.

## D18 — Transport loss is also an animation boundary

Browser QA reproduced an offline transition that left an existing fetch SSE connection open; relying only on fetch rejection
could display stale active animation. Explicit offline handling now aborts that stream, freezes poses and hides the clock; online
reconnects with a single connection guard. Recovery rebases the timeline rather than replaying old combo/lead/victory events.
Tests exercise actual offline/reconnect, pause freeze, cold finished join and reduced motion. Renderer loops stop when they have no work.

## D19 — Current task before setup checklists (Phase 5, 2026-10-27)

The explicit Phase 5 request authorizes dashboard workflow changes. DESIGN v1.4 retains all palette/font/component tokens and the
216px sidebar, but moves the question, current state, primary control and result into one main task. Rules/OBS form a quiet rail;
history and recognized-command detail sit below. Five templates reduce setup work without hiding the exact action being promised.
Linear's public issue-template form supplies a concrete template/field/action hierarchy; public archives documentation supports
moving completed work away from the current task. Awesome Linear/PostHog analyses inform roles, not copied screens/branding.
Mobbin authenticated flows remain unavailable. An initial sketch and critique are in PHASE_5_PLAN.

## D20 — A server result becomes an exact commitment

Question, choices, commands, consequence and start condition save together to a bounded server-session draft. Compare settings
revisions so a stale tab cannot silently overwrite newer configuration. Local preview storage no longer owns streamer settings.
Preparation freezes the round config. Optional chat readiness requires a source-matching command occurring after preparation,
not an old queued message or a connected badge. A confirmed connection never starts play automatically.

Manual Finish evaluates authoritative position with the existing tie/no-play rules; clients never select a winner.
At finish, freeze the winning choice, summary and exact action. Only the control session can record an idempotent commitment;
all replacement/reset/legacy simulation paths reject pending commitments. Neutral outcomes have no invented action.
The latest 20 results remain in this session, with source/fixture provenance. No database or automatic game integration is introduced.
Public OBS receives only the current consequence, never private history or control authority.

## D21 — Browser inspection corrected real workflow defects

An iframe initially mounted as a standby shell stayed idle after a hash-only room URL update. Wait for the URL and key the iframe
by that URL; actual embedded-question/result assertions now cover this path. An inherited source-caption selector made the exact
action too small; a scoped display-type rule and measured size assertion preserve 720p readability.
Confirmed start feedback initially survived into finished play, and frozen combo levels looked active after finish. Tie feedback
to its authoritative round/state and label ended combos correctly. Explicit dashboard offline handling closes SSE and disables controls.
Native dialog backward Tab could leave its two controls; explicit wrapping and keyboard regression fix that. Long mobile questions
pushed Resume below the first viewport; collapse redundant introductory/healthy-status copy during play while preserving the live label.

## D22 — Correct execution before adding a new visual language (Phase 6)

Actual production captures exposed a custom choice named Mage winning under a CORAL WIN banner, a thumbnail distorted by an unscaled
15px HTML line box, 10px authorization copy and mobile navigation occupying 223px. Retain the original identity and fix these causes:
choice-based result type, canvas-scaled HUD struts, existing 15/14/12px roles and a disclosed 68px mobile navigation row.
The old preview figures are replaced by the existing Fieldday renderer/atlas, so marketing, draft and server scenes share one family.
The drawing-only preview is idle, bounded and source-free; it never fabricates participants or changes the actual engine.

The current task retains its question/result/actions but removes the extra tinted result card and generic second heading.
OBS Copy precedes preview at small widths. Name actual tasks and crew combos; idle sources say Standby. Keep current authority,
read-only capabilities, result/commitment rules, exact motion timing and reduced-motion behavior.

Screen review also caught component rules losing to later global selectors, including the connection stripe and mobile help type.
Use explicit component scope and synchronize responsive type roles; do not add new palette/spacing/type tokens to mask cascade errors.
Reference/access evidence and the before/after report are in DESIGN_AUDIT. No new image, animation library, runtime dependency or project license.
