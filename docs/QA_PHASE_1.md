# Phase 1 QA and Completion Evidence

Date: 2026-10-27. Browser: installed Chromium through Playwright 1.64.1 on macOS.
Evidence comes from a real running application, including a production `next start` run and the persistent Node process.

## Checks

| Command / check | Result |
| --- | --- |
| `npm ci --offline --cache=/tmp/chat-tug-npm-cache --no-audit --no-fund` | Passed; lockfile reinstall completed |
| `npm run lint` | Passed, zero warnings (`--max-warnings=0`) |
| `npm run typecheck` | Passed; Next route type generation + contracts/backend/frontend/test tooling |
| `npm test` | 8 tests passed in 2 files |
| `npm run contrast` | All 16 specified semantic color pairs passed |
| `npm run build` | Contracts, Node backend and optimized Next application compiled successfully |
| `npm start` | Both production processes started on loopback ports 3000 and 3001 |
| `npm run test:e2e` | 13 tests passed against the production run; viewport/copy/storage/source checks included |
| Browser runtime | Seven product routes returned 200 with no page/console errors; designed unknown-route response is 404 |
| Font license delivery | Both OFL text URLs returned 200 |
| Transparent PNG pixels | 1920×1080 image: alpha 0 at (960,200), alpha 255 at (960,800) |

## What the tests establish

Validation accepts supported rules and rejects malformed/blank/duplicate/overlong or non-finite inputs.
HTTP health remains separate from Twitch readiness. WS rejects foreign origins/paths and all mutation messages.
Browser tests exercise local pulls/reset, setup continuation, visible disconnection/disabled live start, validation focus,
save/reload/dashboard propagation, corrupt and blocked storage, real clipboard success/failure, keyboard skip link and reduced motion.
Overlay tests check a transparent document/body, idle clock, absence of controls and navigation, and actual preview composition.
Widths 320, 390, 768 and 1024px are traversed across six product surfaces.
Checks cover internal iframe/Mint bounds as well as whole-document width.

## Screenshot inspection and fixes

All images below are first-party screenshots of this project. Final images were opened and inspected visually.

| Evidence | Inspected result |
| --- | --- |
| [Landing desktop](qa/landing-desktop.png) | Sports headline and actual playable arena establish the product without gradient/template imagery; demo limits remain visible |
| [Dashboard desktop](qa/dashboard-desktop.png) | Calm chrome, clear next action, compact arena, honest empty activity and setup prerequisites |
| [Round desktop](qa/round-desktop.png) | Names/rules in one form, distinct selection, adjacent preview, legible inputs and save action |
| [Connection desktop](qa/connection-desktop.png) | Named disconnected state, unavailable authorization explained, useful return path |
| [OBS setup desktop](qa/overlay-setup-desktop.png) | Actual source embedded in a contained 16:9 frame; copy action and dimensions near instructions |
| [Overlay preview](qa/overlay-preview.png) | Full-width crews/rope, distinct broadcast hierarchy and clear upper scene area; no dashboard controls |
| [Transparent source](qa/overlay-transparent.png) | Transparent upper region and opaque label/field backplates; --:-- and Waiting for Twitch |
| [Landing 390px](qa/landing-390.png) | Stacked preview, reachable setup/demo actions, consistent margins |
| [Dashboard 390px](qa/dashboard-390.png) | Wrapping top navigation; stacked task areas and complete crew labels |
| [Round 390px](qa/round-390.png) | One-column names, four duration choices, full-width cooldown and visible Save |
| [Connection 390px](qa/connection-390.png) | Wrapping heading and readable explanation; no clipped action |
| [OBS setup 390px](qa/overlay-setup-390.png) | Contained actual source, both crew names visible, readable copy/instruction flow |
| [Setup 390px](qa/setup-390.png) | Clear limitation and continuation into a usable preview configuration |
| [Dashboard 1024px](qa/dashboard-1024.png) | Sidebar retained; setup rail relocates beneath the primary stage without overflow |

Observed defects corrected before completion:

1. The first broadcast SVG was letterboxed in a mismatched fixed-height box, making crews too small. A dedicated crop and intrinsic height restored the horizontal composition.
2. Excess blank sky dominated the dashboard. A compact crop brings activity closer to the primary controls.
3. Mobile OBS setup's `aspect-ratio` and minimum height transferred into an excessive width hidden by its panel. The reimplemented diagram was replaced by the actual source iframe. Bounds checks now detect this class of hidden clipping.
4. Secondary dashboard/form metadata was increased where the early screenshots looked too fine at normal desktop scale.

## Contrast evidence

Primary text on white 14.26:1; secondary text 5.92:1; white on action 9.15:1;
graphite on Coral 6.58:1 and Mint 8.75:1; semantic feedback text 6.10–6.44:1;
control border on white 3.20:1. All 16 checked pairs exceed their specified AA text/non-text threshold.
This verifies the named token pairs, not a blanket accessibility certification of every rendered state.

## Reference/design comparison

The product adapts restrained hierarchy and compact actions from the inspected analysis previews,
product-as-proof from A1's Linear capture, and action-local feedback from the Recent studies.
It uses its own type pairing, palette, rope motif and artwork. It does not copy a brand screen.
The dashboard has denser controls; the broadcast source has large crew names and only game/state information.
No fake audience metrics, quotes, animated loading, live countdown or chat feed appears.

## Remaining risks and Phase 2 readiness

- Real Twitch OAuth, permissions, sessions, token lifecycle, EventSub/chat and game authority are not implemented.
- The source is a fixed disconnected shell; local saved settings are not synchronized to OBS.
- Native OBS/CEF, Safari/Firefox, screen readers, long-session/high-volume traffic and real streamer usability were not tested.
- Mobbin authenticated flows and the full hackathon rules remained inaccessible; official rules returned 403.
- Final scene animation/asset archive completeness and exact redistribution checks remain Phase 4 work.
- The npm install emits an upstream ESLint 9 support/deprecation notice; lint itself passes without warnings. A tooling major migration can be evaluated separately.

Phase 2 is ready to begin from a documented UI, typed transport and tested configuration boundary.
It needs actual Twitch app credentials/callback registration and explicit session/storage decisions.
No future phase was started and no deployment or external publication occurred.

## Files created

The initially empty project now contains 77 source/configuration/license/documentation/evidence files,
excluding installed dependencies, build output and generated Next route declarations.

- Root: DESIGN.md, AGENTS.md, README.md, npm workspace/lockfile, environment example, ignore rules, ESLint, TypeScript, Vitest and Playwright configuration.
- `apps/web`: route shells, original components, configuration store, tokens/styles, icon, framework configuration, app AGENTS and two OFL notices.
- `apps/realtime`: HTTP/WS foundation and process entry point.
- `packages/contracts`: configuration validation/types and versioned status contract.
- `tests`: 2 unit files and 1 browser-flow file; `scripts`: process supervisor and contrast check.
- `docs`: HACKATHON_BRIEF, PRODUCT_SPEC, ARCHITECTURE, GAME_DESIGN, JUDGING_STRATEGY, DESIGN_REFERENCES, DESIGN_DECISIONS, ASSET_CREDITS, ROADMAP, CODEX_BUILD_LOG and this QA report.
- `docs/qa`: 14 inspected first-party PNGs linked above.

Final production E2E run: **13 passed (4.5s)** after the mobile source-preview fix.
Validation servers were stopped after inspection; run `npm run dev` to open the project again.
