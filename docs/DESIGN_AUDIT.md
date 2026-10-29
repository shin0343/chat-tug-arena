# Phase 6 — Design audit and implementation

2026-10-27. Initial findings recorded from the running Phase 5 production build before product edits.
This audit targets the three-minute demonstration and streamer operations. It is not a claim of finalist placement,
measured usability improvement, real Twitch authorization or native OBS testing.

## Direction and pre-implementation critique

Keep the original clubhouse/fieldday language: paper `#fafbf9`, workspace `#f5f7f8`, graphite `#202c35`,
forest actions `#284f45`, coral `#ef9b85`, mint `#a6d5bf`. DM Sans remains operational type; Barlow Condensed remains sports display.
Use the existing 15/14/12px body/control/caption tokens rather than inventing a scale. Preserve the 4px spacing system and 6/8px controls/panels.

Desktop: connection context → current question and control → game → participation; rules/source remain secondary.
Small screens: brand and a disclosed navigation toggle → current task, with navigation available on demand.
Broadcast: choices on the sides, clock/result in the middle, connected crews below, exact next action at the bottom.
No new theme, UI kit, illustrations, particles, or brand imitation. The rope and original crew remain the memorable element.

Critique before building: adding more boxed metrics, a dark command center, or a marketing-style hero to every operational page
would reproduce generic dashboard patterns. Instead remove repeated copy/containers, fix the source's actual scaling bug,
name the winning choice, and reuse the established character renderer in previews.

## Baseline and prioritized comparison

No P0 defect preventing all use was reproduced. The following P1 defects are visible in the demo; P2 refinements are bounded.
Expected UX effects below are design hypotheses; measured browser geometry and verified behavior will be recorded separately.

| ID / priority | Location and observed problem | Relevant reference / principle | Intended change and expected effect |
| --- | --- | --- | --- |
| F01 · P1 | OBS result says **CORAL WIN!** while the actual choice is **Mage**; the choice is only in smaller copy | A1 Linear hierarchy; original game HUD rules | Put the actual winning choice in the result display, with wrapping for long names. Reduce viewer translation between color and decision |
| F02 · P1 | 220px embedded source has a 39.39px scoreboard, distorted relative to the full-size scene | Original OBS scaling rule; Awwwards single focal composition | Remove inherited 15px HTML line struts from the scalable HUD. Preserve the same composition at thumbnail size |
| F03 · P1 | Mobile navigation occupies 223px before the 58px topbar; six links compete with live controls | Awesome Linear/Raycast operational hierarchy | Collapse navigation behind a labeled keyboard-operable toggle on small screens; keep all routes available |
| F04 · P1 | Authorization privacy/help is 10px, connection buttons 12px, OBS instructions 11–12px despite the documented role scale | Awesome Linear/PostHog type/control roles; Linear public form | Apply existing type tokens to operational content and remove small-screen shrinking. Improve legibility without a new font |
| F05 · P1 | Result repeats question → generic heading → result summary → action inside a second tinted box | Linear form/result proximity; Recent named-state evidence | Use a flat result section with one result summary and exact action/commit control. Reduce competing headings and nested containers |
| F06 · P1 | A room with idle origin is labeled **Twitch overlay preview**; compact loading can say “Preparing” alongside a source failure | PostHog contextual proof; project's truthful-state rule | Name standby/loading/failure accurately and keep the recovery action beside it |
| F07 · P1 | Landing still directs streamers to the developer Mechanics lab; setup/overlay page titles are generic slogans | A1 product proof; PostHog direct explanations | Explain the actual choice → play → next action workflow and name operational tasks |
| F08 · P1 | Landing/draft preview still uses the old repeated static figure drawing while actual games use Fieldday rig/head variants | Approved original asset family; Pikuniku silhouette / Heave Ho connected-contact observations | Reuse the original bounded scene renderer; preserve explicit local demo/preview labels and server isolation |
| F09 · P2 | Form repeats lengthy choice/keyword help and shows a check icon beside a save claim before saving | Linear persistent labels and explicit form action | Shorten duplicated help, distinguish draft from confirmed save and give Save its own clear spacing |
| F10 · P2 | Combo is only named “Together”; lead/comeback sentences assume plural choice names | Recent bounded feedback; game visual event contract | Name crew combos explicitly and use short grammar-neutral cue labels; keep existing timing and one cue lane |

Baseline captures and actual simulated motion: `qa/phase6/before/`. The capture script never injects CSS, seeks the game clock,
or chooses a winner. It uses authorized local simulation controls and the real public SSE source. External auth states are
clearly labeled fixtures where credentials prevent actual execution. No reference imagery is redistributed.

## Actual implementation and comparable evidence

All ten findings were addressed in source. Eight are P1; two are P2. No palette, font, spacing token, game constant, authorization rule
or runtime dependency was added. The follow-up screen review corrected CSS specificity/mobile overrides and the initial-loading recovery copy.

Each pair below uses the same viewport, route and representative state. Game snapshots come from actual running simulation;
sub-second poses, clocks and positions can differ slightly because browser captures run against a real clock rather than a frozen forged snapshot.

| Finding | Changes made / files | Before | After / observed result |
| --- | --- | --- | --- |
| F01 | `scene/broadcast-stage.tsx`, `broadcast.css`: render the server result's exact choice; wrap long names | [Result, 1280×720](qa/phase6/before/overlay-result-1280.png) | [Same result](qa/phase6/after/overlay-result-1280.png): **Mage** is the dominant result. [Maximum-width name](qa/phase6/regression/long-winner-1280.png) stays in its block |
| F02 | `broadcast.css`: canvas-relative base type/line height and block clock caption eliminate unscaled inline struts | [Dashboard thumbnail](qa/phase6/before/dashboard-empty-1440.png) | [Same view](qa/phase6/after/dashboard-empty-1440.png): clock/crews no longer become detached vertical layers; browser test compares thumbnail/full-source proportions |
| F03 | `app-shell.tsx`, `globals.css`: labeled menu toggle, Escape/focus return, close after selection, compact breadcrumb | [Paused, 390×844](qa/phase6/before/paused-390.png) | [Same paused view](qa/phase6/after/paused-390.png): the full game drawing now fits in the first viewport; menu and task navigation remain keyboard operable |
| F04 | `globals.css`, `connection.css`, `showdown.css`: existing body/control/caption roles, including responsive rules | [Twitch setup](qa/phase6/before/setup-1440.png) | [Same setup](qa/phase6/after/setup-1440.png): larger consent/help/controls; [mobile OBS instructions](qa/phase6/after/obs-setup-390.png) use 14px text |
| F05 | `showdown-result.tsx`, `showdown.css`: one semantic result heading, flat section, emphasized next action, no extra tinted card | [Dashboard result](qa/phase6/before/result-1440.png) | [Same result](qa/phase6/after/result-1440.png): exact action and Commit remain dominant; [small result](qa/phase6/after/result-390.png) aligns to the question |
| F06 | `broadcast-stage.tsx`, `overlay-setup.tsx`, `connection.tsx`: Standby for idle origin; distinct loading/failure copy and adjacent recovery | [Idle source label](qa/phase6/before/obs-setup-1440.png), [loading](qa/phase6/before/loading-1440.png) | [Same idle source](qa/phase6/after/obs-setup-1440.png), [same loading](qa/phase6/after/loading-1440.png); [source failure](qa/phase6/regression/preview-error.png) replaces Preparing and offers a recovery route |
| F07 | Landing/setup/dashboard page copy and `connection-copy.ts`: name tasks and show the actual decision/rehearsal workflow | [Full landing](qa/phase6/before/landing-full-1440.png) | [Same landing](qa/phase6/after/landing-full-1440.png): choice, next action and actual streamer rehearsal replace developer-lab directions; operational titles match navigation |
| F08 | `arena.tsx`, `scene/preview.ts`: remove legacy drawing, reuse original renderer/atlas for previews with zero viewers/events/results | [Landing art](qa/phase6/before/landing-1440.png) | [Same landing](qa/phase6/after/landing-1440.png): same silhouettes, boots, heads, grips and ground as the actual overlay, without invented participants |
| F09 | `round-form.tsx`, form CSS: concise help, choice-specific keyword explanation, separated Save row, no premature saved check | [Full form](qa/phase6/before/configuration-full-1440.png) | [Same form](qa/phase6/after/configuration-full-1440.png): visible labels retained; confirmed save, invalid-field focus and draft retention still pass |
| F10 | `broadcast-stage.tsx`, `broadcast.css`: explicit Crew combo and grammar-neutral cue names, readable multiplier | [Combo](qa/phase6/before/overlay-combo-1920.png), [comeback](qa/phase6/before/overlay-comeback-1920.png) | [Same combo](qa/phase6/after/overlay-combo-1920.png), [same comeback](qa/phase6/after/overlay-comeback-1920.png): one cue lane and existing bounded reactions remain |

The paired capture script is [phase6-design-qa.ts](../scripts/phase6-design-qa.ts). Both runs completed **52 captures**, with no main/public-page browser errors.
Each run includes 41 actual local app/server captures and 11 visibly labeled OAuth-state fixture captures. The full regression run adds 72 screenshots,
for **176 PNGs** in total. [Before metadata](qa/phase6/before/captures.json), [after metadata](qa/phase6/after/captures.json),
[measurements](qa/phase6/measurements.json) and [verification](qa/phase6/verification.json) distinguish this evidence from provider/OBS validation.

### Measured layout and type differences

| Measurement | Before | After | Practical interpretation |
| --- | --- | --- | --- |
| Mobile navigation header at 390px | 223px | 68px collapsed | 155px returned to the current task; navigation is available on demand |
| Paused game drawing at 390×844 | y=847.83…907.89 | y=687.63…747.69 | Drawing was below the viewport; now the whole drawing is visible without scrolling |
| Form label, desktop | 12px | 14px | Matches the documented control role |
| Authorization privacy, desktop | 10px | 12px | Matches the caption role; the setup page can become taller as text grows |
| OBS instruction paragraph, mobile | 12px | 14px | Reads as an instruction rather than tiny metadata; Copy is in the first viewport at 320/390px |
| Thumbnail clock height / 218.66px canvas | 39.39px | 19.02px | Removes the inherited large inline line box; final total scoreboard is 22.5px |
| Desktop result section | 233.39px | 217.27px | Fewer nested layers with a larger exact-action line; not a claim that every page became shorter |

These are DOM measurements, not evidence of faster task completion or better comprehension. Text growth is an intentional tradeoff;
no usability percentage or frame-rate improvement is inferred. The 1920×1080 result PNG has **480,000/480,000 fully transparent pixels**
in its top 250 rows and an opaque playing-field/HUD region. This verifies Chromium PNG alpha, not native OBS compositing.

## References actually consulted

Only the selected references addressing the issues above were used. External research media stays outside the project.

| Exact source | Access and evidence | Principle used / what was rejected |
| --- | --- | --- |
| [Awesome Linear DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md), [PostHog DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/posthog/DESIGN.md) | Exact files fetched again through GitHub API; roles/spacing/type/actions read. These are third-party marketing analyses | Consistent operational roles and restrained surfaces. No copied theme, code, mascot or proprietary font |
| [Mobbin discovery](https://mobbin.com/discover) | Fresh native retrieval and actual Chromium surface showed Log in / Join; authenticated flows unavailable | Research gap remains explicit. No unseen Mobbin setup, dialog or settings screen is claimed |
| [Linear public form guide](https://linear.app/docs/issue-templates) | Guide reopened; official form screenshot, decoded in the previous phase, visually inspected again | Persistent labels, terse help, explicit action, outcome near task. Documented UI, not executed signed-in Linear |
| [A1 Linear 2026](https://www.a1.gallery/website/linear-2026) | Fresh rendered listing and loaded product image visually inspected | Strong main type and product proof with quiet context. Reject brand/palette imitation and marketing hierarchy inside the game |
| [Awwwards Lusion v3](https://www.awwwards.com/sites/lusion-v3), [Home Page element](https://www.awwwards.com/inspiration/home-page-lusion-v3) | Fresh listing returned 200 but its main media was not loaded at capture; native element retrieval timed out. Previously captured historical composition was re-inspected separately | One focal scene. No new timing/live interaction claim; reject WebGL spectacle, loaders, cursor effects and scroll hijacking |
| [Recent Liquid Button](https://recent.design/i/pd1kyjp-liquid-button-hover-effect), [actual published clip](https://cdn.recent.design/items/pd1kyjp/0/630x360.mp4) | Item reopened; previous six published video samples re-inspected | Feedback returns to rest and labels stay readable. Reject morphs, blobs, glow and nonstop movement |
| [Recent Processing State Cards](https://recent.design/i/24fvo3o-processing-state-cards) | Item reopened; previous static media remains historical evidence | Named status beside its task. No motion timing inferred; reject glass and invented progress |
| [Pikuniku publisher media](https://store.steampowered.com/app/572890/Pikuniku/), [Heave Ho publisher media](https://store.steampowered.com/app/905340/Heave_Ho/1) | Pikuniku page reopened; previously sampled official gameplay sheets for both games viewed again | Silhouette/ground clarity and connected collective action. No copied art or claim of an executable game playtest |

The detailed current/historical access ledger and source hashes are in [DESIGN_REFERENCES](DESIGN_REFERENCES.md).
Agent-reach CLI was unavailable; its documented GitHub/native-browser fallback supplied evidence. No external account was created or modified.

## Anti-template forensic findings

The weak points were execution and inherited copy rather than a bad palette. The audit found the nested tinted result container,
repeated generic headings, pre-save check icon, tiny operational text, competing mobile navigation and legacy preview artwork recorded above.
They were corrected without replacing the original identity.

No gratuitous gradient, neon palette, ornamental icon grid, rounded-pill control system, fake analytics, copied character pack,
camera shake, particles or endless celebration was found in the actual game. The numbered landing steps describe a real sequence;
they are not a decorative feature grid. Team inks, semantic status tints, persistent labels, selected controls and visible focus remain.
Connection/rehearsal/fixture disclosures were kept, including when they make the demo less impressive. No status was faked to improve screenshots.

## Motion and broadcast review

Inspected recorded motion and live browser assertions, not only still images. Rope/crew translation follows authoritative interpolation;
distinct users produce synchronized connected poses; momentum reversals change direction and cue; a decided winner hops once while the loser sits.
Final countdown, pause/resume, transport loss, reduced motion and cold finished reload retain their existing behavior.
No timing, physics constant, win rule, multiplier or event threshold was retuned.

- [Clean game motion, 8.48s](qa/phase6/motion/game-motion.mp4), [filmstrip](qa/phase6/motion/game-motion-filmstrip.jpg), [actual state samples](qa/phase6/motion/game-motion.json): fixed viewport, no screenshot calls or capture-background overrides.
- [Before showdown](qa/phase6/motion/before-showdown.mp4) / [after showdown](qa/phase6/motion/after-showdown.mp4): actual countdown, rush, victory and consequence/commitment.
- [Recorded streamer journey](qa/phase6/motion/streamer-journey.mp4) and [separate public result](qa/phase6/motion/consequence-overlay.mp4).
- [Recording metadata](qa/phase6/motion/metadata.json). H.264 exports are opaque browser recordings; PNGs establish alpha separately.

The clean motion sample starts balanced at x=0 with two level-1 combos, reaches Coral x≈−0.117/v≈−0.463, then records a swing
at x≈−0.154/v≈+0.096 and a Mint lead at x≈+0.129/v=+0.7. Pause/resume are actual server transitions. These are one local playback's
state samples, not a balance, latency or performance benchmark. The paired capture runs include screenshot instrumentation;
their recordings may momentarily reflect capture background changes. The clean clip excludes that artifact.

The renderer still bounds the cast to ten, shares the original atlas, uses one cleanup-safe loop per scene and stops animation work when appropriate.
Browser tests observe more than three distinct connected poses in twelve sampled frames, synchronized combo geometry, pause freeze,
bounded reduced-motion RAF requests, lost-feed freeze and recovery without old-cue replay. **No new FPS claim is made.**

## Task-based streamer validation

This was agent-operated task testing, not a study with novice streamers.

| Task | Actual result |
| --- | --- |
| Connect Twitch | Entry/permission/disabled-credentials state inspected; actual invalid callback returns safely. Eight clearly labeled fixture states reviewed. Genuine consent remains unverified |
| Create a showdown | Template → question/choices/consequence → Save → control room passed against actual local server |
| Configure keywords | Exact commands, invalid/duplicate repair, retained edits, focused error and stale-tab conflict passed |
| Start/manage a match | Explicit rehearsal → server countdown → pause/resume/finish/cancel/reset/rematch; important endings retain keyboard-accessible confirmation |
| Understand participation | Real distinct-user combo, aggregate viewer count and weighted pulls rendered; no decorative charts or invented viewers |
| Find OBS URL | Task navigation → Copy, readonly masked URL, actual clipboard success/failure; Copy visible at 320/390px |
| See winner / next action | Actual choice and exact action shown in both surfaces; commitment unlocks another round; history persists within the session |
| Recover | Lost private/public updates remove current confirmation/clock, disable unavailable actions and recover current authority |

## Tests and results

| Verification | Actual result |
| --- | --- |
| `npm run check` | Lint and types passed; **137/137 tests in 11 files**, including component render and HTTP/provider integration tests; **16/16 contrast pairs**; production build passed |
| `PLAYWRIGHT_PRODUCTION=1 npm run test:e2e` | **47/47 Chromium tests**, zero failures/flakes/skips; four new design regressions plus the existing complete workflow, mechanics, source, authorization and motion checks |
| Paired production capture script | **52 before + 52 after**, same viewports/scenarios, complete metadata; actual source input and SSE rather than client-written results |
| Manual visual review | Desktop, 390px and selected 320/1024/768px regressions; source 1920/1280/960px, maximum-width names and long consequences; motion filmstrips/clean recording inspected |

The initial test run without local-listener permissions could not start the HTTP integration listeners; it was rerun with that environment permission.
Capture tooling needed two corrections: release a held session request before removing its route, and avoid a Node-only tsx named-class helper
inside the browser fixture initializer. Completed runs above use the corrected capture tool. These were not hidden product failures.
Native server shutdown may print a child npm SIGTERM/143 message; runner status and closed listeners determine successful teardown.
Full results, elapsed browser time, artifact counts and cleanup are recorded in [verification.json](qa/phase6/verification.json).
The final full browser rerun after the loading-copy correction passed in **100.22s**. All **61** checked local documentation links resolve;
ports 3000/3001 were closed after automatic teardown. Seven named original recordings were kept; 17 redundant raw recording copies were removed after MP4 validation.

## Remaining weaknesses and judging impact

- Real Twitch consent/messages, native OBS/CEF/compositing, cross-browser engines, prolonged stream soak and a real streamer/viewer usability study remain unverified.
- Mobbin's authenticated flow library remains inaccessible. Historical Awwwards/Recent/game samples do not establish current interaction timing.
- The rig is deliberately a small original vector family with finite poses. The landing demo is a direct local drawing interaction, not a physics match.
  Full 16:9 thumbnails necessarily have tiny metadata; operational text outside them and primary broadcast labels carry the task.
- Maximum-width unbroken names wrap awkwardly but remain visible and bounded. A real-streamer naming study could improve practical guidance.
- Some secondary connection-checklist and developer diagnostic captions retain 10–11px text. Primary consent, form labels and OBS instructions use the corrected roles;
  further tertiary type changes were deferred as P2 rather than restarting the visual system.
- History remains session memory; commitment records intent, not automatic game control or proof that a consequence was performed.

The [official rules, section 6](https://twitchcon-codex.devpost.com/rules) equally weight four second-stage criteria. Design therefore contributes 25%.
The concrete improvements support its ease-of-use/watchability question through task hierarchy, readable results, consistent characters and bounded causal feedback.
For Potential Impact, the decision → exact action → public commitment can be demonstrated with less ambiguity. These are design arguments supported by rendered
and functional evidence, not measured adoption, enjoyment, task-completion speed, judge scores or guaranteed Top 5 placement.

Phase 6 implementation and local verification are complete. No later phase, deployment, repository commit/push or submission was performed.
