# Phase 4 — Game art, animation and broadcast QA

2026-10-27. Implementation and local production verification complete; stop after Phase 4.
Real Twitch and native OBS/CEF remain unverified. All captured rounds are visibly labeled **Simulation**.

## 1. Art direction and references

**Fieldday crew v1.0** is an original flat vector sports family: graphite outlines, paper faces, coral/mint jerseys,
three head variants, compact boots and a cut-paper playing field. The original knot becomes the small result cup.
The existing DM Sans / Barlow Condensed typography, semantic tokens and dashboard layout are preserved (DESIGN v1.3).

Actual official Pikuniku screenshots/gameplay trailer informed clear silhouettes, sparse environments and grounded contact.
Heave Ho publisher screenshots/trailer informed collective physical effort and readable contact points. Neither game's characters
or artwork were copied. Awwwards Lusion supplied focal composition only; its motion timing was not measurable from the listing.
Recent's published Liquid Button clip informed action → short reaction → rest while retaining a readable label.
A1 Linear and Awesome DESIGN.md supplied hierarchy/consistency principles, not a marketing layout transplanted into the game.
Mobbin authenticated flows were unavailable. [Full evidence, exact URLs, observed patterns and rejections](DESIGN_REFERENCES.md#phase-4--game-art-and-purposeful-broadcast-motion-2026-10-27).

Selection rationale: the inspected Kenney packs have legitimate animation/parts but no suitable horizontal planted-foot pull
cycle matching the rope grips. A connected original SVG rig supplies exact contact, controlled proportions and crisp 720p scaling
within the available scope. SVG avoids an unnecessary rendering/animation library, texture pipeline or 3D dependency.

## 2. Assets and rights

- Included: original `public/game/fieldday-symbols.svg` (2432 bytes), original rig/field/rope, and the two existing self-hosted OFL fonts.
- Kenney Toon Characters 1.0 and Shape Characters 1.0: exact pages, archives, previews/sheets and `License.txt` inspected.
  Both are CC0, permitting modification and commercial redistribution without mandatory attribution. Neither is shipped.
- OpenGameArt's Kenney page identifies CC0; itch.io's free directory is discovery, not a rights grant. No unverified pack was imported.
- No external character, reference screenshot, copyrighted game character, profile picture or generated bitmap is redistributed.
  Original project artwork does not introduce a new external restriction; the overall project license remains unchosen.

[Complete license ledger, exact ZIP URLs, creators/versions, hashes and reasons for rejection](ASSET_CREDITS.md).
[Original atlas provenance](../apps/web/public/game/README.md).

## 3. Animation and event states

| Character state | Actual behavior |
| --- | --- |
| Idle | Quiet ready stance; no ambient loop or fake clock |
| Preparing | Three-second authoritative countdown drives gradual anticipation |
| Pulling | Connected shoulders/hips, rope grips and planted foot phases |
| Strong pulling | Greater coordinated body stroke and small local effort marks |
| Losing balance | Adverse position/velocity causes a connected weight shift and expression |
| Combo | All crew slots share one pull phase; multiplier/time strip and one short accent |
| Victory | Server winner raises arms and performs one bounded hop, then holds |
| Defeat | Losing team settles into a seated pose; no repeated falling loop |

The renderer maps authoritative `x` to a pennant at `800 + 150x`; stationary finish flags are exactly 650/950.
The same quadratic rope curve supplies the hand anchors. World-planted feet take small reversible steps instead of sliding with
an entire static avatar. Tension straightens the rope; force selects effort; velocity/position select weight shift.

Eight Phase 3 event kinds are consumed without changing their contract. Fresh events are deduplicated by round/sequence;
one comeback > swing > lead cue is shown at a time. There are no particles or per-message labels.
Combo accent: 850ms; lead/swing: 1000ms; comeback: 1600ms; final-five clock pulse: maximum 4.5% scale.
Newly observed finish: one 900ms hop, 450ms seated settle, result reveal at 1400ms. Result comes only from the server payload.
Tie/no-play/abandon are neutral, distinct messages. The only consequence is the losing crew taking a seat; no real-world forfeit.

Two mascot figures per team are always present. At 3/6/10 unique users the cast becomes 3/4/5 per side, capped at ten total.
Deterministic head variants and jersey numbers are slot decoration; aggregate joined counts are exact, with no public viewer identity.

Pause, hidden tab, transport loss and reduced motion stop continuous animation. Reduced motion holds poses and reveals the result
immediately. Cold join/reconnect rebases to current authority and suppresses missed effects, including old victories.

## 4. Actual visual and motion evidence

The capture script uses real server controls, source-normalized simulation and a **separate zero-cookie public source**.
It does not forge game snapshots, accelerate the browser/server clock or stage a fake Twitch connection.
The report contains nearby authoritative values and rendered geometry; HTTP sampling and screenshots need not be the same tick.

| Required scene | Actual capture | Review finding |
| --- | --- | --- |
| Idle | [1920](qa/phase4/idle-1920.png) | Quiet crew, --:-- clock, actual zero joined; room waiting differs from disconnected preview |
| Countdown | [1920](qa/phase4/countdown-1920.png) | Clear shared number; preparing bodies stay connected to grips |
| Balanced | [1920](qa/phase4/balanced-1920.png) | Both three-user combos, pennant at center, readable effort and rope |
| Team A lead | [Coral](qa/phase4/coral-lead-1920.png) | Actual leftward position, bounded lead cue, consistent jersey proportions |
| Team B lead | [Mint](qa/phase4/mint-lead-1920.png) | Actual rightward position; ten figures stay distinct |
| Combo | [1920](qa/phase4/combo-1920.png) | Shared pull rhythm, actual 1.25× multiplier, no burst clutter |
| Momentum reversal | [1920](qa/phase4/momentum-reversal-1920.png) | Momentum can turn before the positional leader changes; one cue stays below clock |
| Comeback | [deficit](qa/phase4/late-deficit-1920.png), [recovery](qa/phase4/comeback-1920.png) | Actual late-comeback scenario crosses center, then Mint wins; no synthetic force boost |
| Final countdown | [1920](qa/phase4/final-countdown-1920.png) | Warm clock accent, small timed pulse; body stays quiet with no participation |
| Victory | [1920](qa/phase4/victory-1920.png) | Server endpoint winner, raised arms and seated opponents, no clipping |
| Result | [Coral](qa/phase4/result-1920.png), [Mint](qa/phase4/mint-result-1920.png), [no play](qa/phase4/no-participation-result-1920.png) | Cup/winner, actual crew name and consequence; no-play stays neutral |
| Connection interruption | [1920](qa/phase4/connection-interruption-1920.png) | Frozen drawing, --:-- clock and written unavailable state |
| Maximum cast / reduced motion | [ten figures](qa/phase4/maximum-crowd-1920.png), [reduced](qa/phase4/reduced-motion-1920.png) | Bounded cast, same proportions/contrast; reduced motion keeps meaning |

Inspected rendered output at [1280×720](qa/phase4/scaled-1280.png), [960×540](qa/phase4/scaled-960.png),
[640×360](qa/phase4/scaled-640.png), [390×844](qa/phase4/scaled-390.png) and 1920×1080.
The 16:9 composition letterboxes in portrait; it does not turn into a dashboard or rearrange teams.
Bounds tests also exercise maximum-length commands/crew names at those sizes. No scrollbars or clipped figures/labels were found.

**Motion evidence**, actual browser recordings at 1280×720, no synthesized intermediate frames:

- [Pull → coordinated combo → momentum reversal → pause/interruption, MP4](qa/phase4/motion/pull-combo-reversal.mp4), 6.64s.
  [Filmstrip](qa/phase4/motion/pull-filmstrip.jpg), lower-field crop sampled at 2fps from 2.5s.
- [Endpoint → one celebration → settled result, MP4](qa/phase4/motion/victory-result.mp4), 8.96s.
  [Filmstrip](qa/phase4/motion/victory-filmstrip.jpg), lower-field crop at 3fps from 6s.
- [Full late comeback and Mint result, MP4](qa/phase4/motion/late-comeback.mp4), 47.52s.
  [Filmstrip](qa/phase4/motion/comeback-filmstrip.jpg), lower-field crop sampled every six seconds.

Recordings were inspected through their sampled frames, with browser assertions checking changing pose paths, identical combo phase,
pause freeze, result settling and reduced-motion loop suppression. This is more than static screenshot validation, but not a human OBS playback test.
Video is an ordinary opaque browser recording; transparent PNGs/pixel sampling establish alpha support separately.

Comparison findings: one head/limb family and shared line weight across every state; visible hand/rope contact; planted feet;
limited effect density; sports type dominates metadata; no copied brand styling, gradients, profile-image collage or random explosions.
The restrained poses have less expressive range than authored frame-by-frame sprites; see remaining weaknesses below.

## 5. Performance and OBS geometry

Production Next build, Node v22.23.1, Playwright Chromium 156.0.8078.4, local macOS headless browser.
An isolated eight-second probe used actual 10Hz SSE, balanced repeated inputs and ten animated figures at 1920×1080.
Other capture contexts were closed and video recording disabled before profiling.

| Measured metric | Result |
| --- | --- |
| Probe duration / frame intervals | 8007.5ms / 480 |
| Mean / 95th percentile / maximum RAF interval | 16.666 / 16.8 / 16.8ms |
| Observed RAF callback frequency | 60.00Hz |
| Long tasks (>50ms) | 0 observed |
| Renderer DOM-update JS average / maximum | 0.148 / 0.700ms |
| CDP task / script / layout duration over probe | 589.937 / 121.061 / 40.489ms |
| DOM elements / characters / particles | 350 / 10 / 0 |
| Symbol atlas source / observed transfer | 2432 bytes / 1723 bytes across three same-path resource entries |

These are local browser measurements, **not a native OBS FPS, encoder/GPU, network-load or hardware-independent guarantee**.
Renderer cost excludes SVG painting/compositing. RAF frequency does not prove every frame reached the display.
The resource entries reflect browser caching/revalidation; no remote game-art request or new runtime package is needed.
Only two snapshots, ten cached figures, one cue and two pulse timestamps are retained by the presentation layer.

At 1920×1080 the field starts near y=514, has x=96 / width=1728 and ends near y=1026: 96px side / 54px bottom margins.
Team names are 57.6px (48px long names), commands 28.8px, clock 76.8px, and the source scales as a whole.
[Transparency sampling](qa/phase4/transparency.json) found alpha **0..0 across all 864,000 upper-canvas pixels** (1920×450).
The opaque field/label surfaces are deliberate so the rope and dark limbs survive busy footage.

[Raw runtime profile](qa/phase4/runtime-performance.json) · [state/geometry/browser report](qa/phase4/visual-report.json).
Native OBS Studio was not installed in the checked application locations. No CEF scene refresh, native screenshot,
stream encoding or real Twitch verification was performed. Use a 1920×1080 or 1280×720 Browser Source; preserve transparent CSS.

## 6. Defects found and fixed

1. Initial broad placards made the HUD too tall: reduced line height/padding and retained primary name/command hierarchy.
2. Rope initially occluded grip circles: split grips into a foreground SVG layer while arms remain behind it.
3. Early pull displacement was too subtle: increased connected shoulder/hip stroke without stretching parts or moving planted feet.
4. Transparent art behind dark limbs lost contrast over dark video: added a restrained paper field, keeping the outer canvas transparent.
5. Existing SSE could remain open after browser offline: explicitly abort/freeze offline and reconnect once online; real regression passes.
6. Missed effects could replay when resuming/reconnecting: rebase the timeline and show already-finished results settled.
7. Fixed idle-room wording so an available room awaiting a round is not mislabeled as an unconnected preview.
8. QA-only probe callbacks initially exposed a transpiler helper/TypeScript assertion in browser code: isolate the metric script as plain JS;
   complete capture/profile reruns passed. These were capture-tool errors, not claimed as game defects.

## 7. Verification and remaining weaknesses

| Command | Actual result |
| --- | --- |
| `npm run check` | Lint, type checks, **114 unit/integration tests in 8 files**, **16 contrast pairs**, production build passed |
| `PLAYWRIGHT_PRODUCTION=1 npm run test:e2e` | **36/36 Chromium tests passed**, including the four new art/transport tests |
| `npm run qa:phase4` with production server | **22 scene PNGs**, three actual recordings, ten-character profile; **0 page errors** |
| Sharp alpha sampling / FFmpeg evidence export | Transparent upper canvas confirmed; three MP4s and motion contact sheets produced |

New deterministic tests cover eight pose states, connected limb lengths, rope grips, planted feet, reduced motion, cast bounds,
two-snapshot interpolation, stale/duplicate/foreign event suppression, cue priority, finish timing, late join and recovery.
Browser tests exercise actual source SSE, custom names/commands, five sizes, combo synchrony, pause/reduced motion, server victory,
settled reload and offline/reconnection. Existing authority, fairness, session, Twitch fixture and product-flow tests also pass.
Regression screenshots are separate under `docs/qa/phase4/regression`; historical phase evidence is preserved.

Remaining weaknesses:

- Native OBS/CEF, real chat, broadcaster testing and sustained encoded-stream performance are still open external gates.
- The original vector rig is deliberately restrained, with three head variants. It does not have the acting range of a bespoke sprite sheet.
- At 640px width names/clock/rope are readable, but small participant/combo metadata is secondary and tiny; 390px portrait is a scaling check,
  not the recommended broadcast source size. Use 1280×720 or 1920×1080 for the Browser Source.
- No sound or customizable real-world consequence; the visual sit-down result is the complete Phase 4 consequence.
- No cross-browser/mobile GPU or multi-hour soak measurement. Local short profiling must not be marketed as universal 60fps.

## 8. Phase 5 readiness

Scene implementation, game-to-visual contract, rights ledger, local production checks and rendered evidence are ready.
Phase 5 should verify native OBS over representative footage, complete a real Twitch round with authorized broadcaster/viewers,
test refresh/revocation/recovery and prolonged performance, then conduct streamer comprehension/setup testing and submission preparation.
The actual rules require genuine Twitch/Codex evidence; simulation videos cannot clear that gate.
No Phase 5 work, public deployment, commit, push or submission was performed.

Reproduce: run `npm run check`; start the built app with `npm start`; run the production browser suite, then `npm run qa:phase4`.
The capture script emits WebM; MP4s are H.264/yuv420p exports with FFmpeg, audio removed and no retiming.
No source capability, control cookie, CSRF or Twitch credential is included in the evidence report or recordings.
Temporary QA servers were stopped afterward; no listeners remained on ports 3000/3001. All 45 checked local documentation links resolve.
