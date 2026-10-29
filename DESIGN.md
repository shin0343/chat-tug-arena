# Chat Tug Arena — Design System

Version 1.5 · Phase 6 · 2026-10-27. Design authority for every future phase.
Read with `docs/DESIGN_REFERENCES.md` and `docs/DESIGN_DECISIONS.md` before changing UI.

## 1. Product Design Philosophy

Make the next streamer action obvious; make the game understandable in one glance.
The central image is a real tug-of-war: two crews, one rope, one center marker.
The interface earns trust by clearly distinguishing a local demonstration from a Twitch connection.
No invented audience numbers, game results, testimonials, or live activity.

## 2. Brand Personality

Good sportsmanship, collective effort, friendly rivalry. A community field day rather than an esports betting site.
Write direct instructions: “Configure round”, “Copy preview URL”, “Pull for Coral”.
Use “crew” for a team, “round” for a game, “arena” for the shared play space.
Never call a disconnected state “live”, a demo a “broadcast”, or local storage “synced”.

## 3. Visual Art Direction

**The clubhouse and the playing field.** A cool paper workspace, blue graphite structural chrome,
restrained forest actions, and coral/mint team colors. A condensed sports headline sits beside plain humanist UI text.
The memorable element is the illustrated rope and its flag; no unrelated decorative imagery.

Dashboard: precise light workspace, 216px dark sidebar, flat rule-separated sections, compact controls.
Phase 5 groups the workspace around a current showdown: question, authoritative controls, winning choice and commitment.
Choices/rules and OBS are secondary; recent history and diagnostics are tertiary. Keep one primary action for the current state.
Overlay: broad horizontal stage, emphatic team names, central clock, fewer words, generous breathing room.
Marketing: asymmetric copy + playable preview, followed by a real three-step setup sequence.
Original mark: two linked rope loops. Never borrow Twitch, Linear, Raycast, or PostHog marks or characters.

## 4. Color Palette and Semantic Tokens

Canonical implementation: `apps/web/src/app/tokens.css`. Tailwind maps the same variables through `@theme inline`.
Values are intentionally independent of the reference brands.

| CSS token | Value | Role |
| --- | --- | --- |
| `--background` | `#f5f7f8` | Dashboard background |
| `--paper` | `#fafbf9` | Landing / playing-field sky |
| `--text-primary` | `#202c35` | Headings and body emphasis |
| `--text-secondary` | `#586670` | Explanations and metadata |
| `--surface` | `#ffffff` | Primary workspace panel |
| `--surface-muted` | `#edf1f2` | Selected utility / quiet inset |
| `--border` | `#dbe1e4` | Structural separators, not input boundaries |
| `--border-control` | `#84929b` | Input boundaries |
| `--primary-action` | `#284f45` | Primary action, white label |
| `--primary-hover` | `#1d3e35` | Primary hover |
| `--primary-pressed` | `#163129` | Primary pressed |
| `--sidebar` | `#202c35` | Persistent nav |
| `--sidebar-muted` | `#b5c1c7` | Sidebar secondary text |
| `--success` / `--success-soft` | `#236044` / `#e5f2e9` | Saved / verified success |
| `--warning` / `--warning-soft` | `#795410` / `#fff3d9` | Missing prerequisite |
| `--error` / `--error-soft` | `#a63131` / `#fff0ee` | Error / invalid form |
| `--team-a` / `--team-a-soft` | `#ef9b85` / `#fce9e3` | Coral fill / background |
| `--team-a-ink` | `#803b2b` | Accessible Coral labels on light surfaces |
| `--team-b` / `--team-b-soft` | `#a6d5bf` / `#e7f3ed` | Mint fill / background |
| `--team-b-ink` | `#285e49` | Accessible Mint labels on light surfaces |
| `--rope` / `--rope-shadow` | `#dbbc79` / `#977a40` | Original rope graphic |
| `--focus` | `#326bb5` | Keyboard focus only |

Do not use pale team fills as text on white. Put graphite text on team fills.
Team A always sits left (default `!coral`); Team B right (default `!mint`). Text and position reinforce color.
Phase 2 allows distinct, validated team commands; command labels follow the session’s actual configuration.
The capability-free OBS shell shows defaults; a room-linked source follows authoritative server configuration and commands.
Team colors never indicate connection health, validation, or destructive actions.

## 5. Typography and Hierarchy

Self-host **DM Sans** (400, 500, 600, 700) and **Barlow Condensed** (600, 700) from Fontsource.
Both use the SIL Open Font License 1.1; source and licenses are listed in ASSET_CREDITS.
No runtime request to Google Fonts. System sans fallback for missing glyphs.

| Role | Family / weight | Size / line height | Tracking |
| --- | --- | --- | --- |
| Landing headline | Barlow Condensed / 700 | clamp(64px, 7vw, 104px) / .94 | -.02em |
| Broadcast team / clock | Barlow Condensed / 700 | 48–76px / 1 | -.01em |
| Page title | DM Sans / 700 | 30px / 1.2 | -.04em |
| Section title | DM Sans / 600 | 18px / 1.4 | -.02em |
| Lead paragraph | DM Sans / 400 | 18px / 1.6 | -.01em |
| Body | DM Sans / 400 | 15px / 1.55 | 0 |
| Control / navigation | DM Sans / 500–600 | 14px / 1.4 | 0 |
| Caption / status | DM Sans / 500 | 12px / 1.5 | 0 |

Uppercase belongs only to sports display type and jersey marks. Form labels and status use sentence case.
Tabular numerals on the clock and duration controls. Monospace only for chat commands and URLs.
Body text measures at most 68ch. Inputs use 16px on mobile to avoid unwanted zoom.

## 6. Layout Grid and Spacing

4px base. `--space-{1,2,3,4,5,6,8,10,12,16,20,24}` = `4,8,12,16,20,24,32,40,48,64,80,96px`.
Landing maximum width 1320px; dashboard main 1360px. Outer desktop gutter 40–64px, workspace 32px.
Sidebar 216px. Dashboard primary column `minmax(0,1fr)` + 264–288px setup rail, gap 24px.
Panel header 20–24px padding, form groups 24px apart, label-to-control 8px, help text 6px below.
Rows 48px minimum; buttons / inputs 42px desktop and 44px touch.
Group by task with space and dividers. Do not put a card inside a card to express a list row.

## 7. Surface and Elevation Rules

Structural panels: white, 1px border, 8px radius, **no shadow**.
Utility inset: muted surface, 4px radius. Stage: 12px radius for previews and the framed broadcast field;
the transparent broadcast canvas itself has no corner treatment.
Control radius 6px, small chip 4px, circle reserved for crew avatar / status dot.
`--shadow-float: 0 8px 24px #202c3514`; `--shadow-dialog: 0 20px 60px #202c3526`.
Floating menus or dialogs only. No glass blur, ambient glow, or gradient background.

## 8. Component Anatomy

`Brand`: original knot mark + two-line condensed wordmark. Single-color alternative on dark surfaces.
`Icon`: original 20px SVG, 1.6px stroke, round joins; only on navigation, actions needing a symbol, or status.
`Button` / `ButtonLink`: shared geometry and variants; real button for actions, anchor for navigation.
`StatusBadge`: short written status plus dot; never color alone.
`Field`: persistent visible label, control, help or inline error, connected by `aria-describedby`.
`Panel`: title and optional action in one header, content follows without redundant inner boxes.
`Arena`: shared scene vocabulary, density changes by surface; original SVG art, HTML labels for accessibility.
`SetupSteps`: the actual ordered flow, current/incomplete/preview-ready states. Connection never marked complete in Phase 1.

## 9. Buttons and Interactive States

Primary: forest fill, white text; one dominant action per task area. Secondary: white + control border.
Quiet: transparent, graphite text. Coral/Mint: team fill + graphite label, only demo pulls.
Hover changes fill or border; pressed shifts by 1px. No hover scaling or bouncing.
Focus-visible: 3px focus outline with 3px offset. Disabled: actual `disabled` attribute, muted fill and text,
adjacent explanation for unavailable controls. Loading only during a real asynchronous operation.
Navigation active state uses a filled track and `aria-current="page"`.

## 10. Forms and Validation

Physics defaults: 45-second round and 2-second viewer cooldown. Legacy previews retain Coral crew / Mint crew.
The Phase 5 server-session draft starts with “Which character should I use next?” and Mage / Knight.
Round title 1–60 characters; crew names 1–20, distinct ignoring case/whitespace.
Four duration radios: 30 / 45 / 60 / 90 seconds. Cooldown 1–5 seconds.
`!coral` and `!mint` remain default session commands. Phase 5 also edits both keywords beside their choices in Showdown setup.
Five optional templates prefill question, choices and matching keywords; selecting a template never saves or starts a round.
Show the current commands beside team controls. Require exact command matches and distinct commands.
Validate on Save, retain all input, focus the first invalid field and show inline repair instructions.
No required asterisk without an explanation. Showdown save confirmation says “saved for this session”, only after the server confirms.
Save question, choices, keywords, duration, consequence and start condition together. A settings revision prevents stale-tab overwrites;
offer “Load saved settings” without silently discarding edits. Ongoing rounds and unacknowledged results lock edits.
Legacy browser-local previews are separate from server settings and never imply synchronization.

## 11. Status and Feedback

Disconnected: quiet written state + setup action. Warning: actual missing prerequisite, no flashing dot.
Empty activity: “No chat activity yet” with reason, no fabricated feed.
Demo: permanent “Demo” / “Preview” label, manual local interaction, no real-time audience counters.
Success: inline `role=status`; errors `role=alert`. Reserve live announcements for meaningful changes.
Phase 2 uses these existing semantic tokens for real connection work. Eight named states are required:
Not connected (neutral), Connecting (neutral, actual work), Authorization required (warning), Connected (success),
Reconnecting (warning + gap/retry explanation), Authorization expired (error + authorize action),
Connection failed (error + cause/recovery), Simulation mode (team-B-soft + explicit simulation label).
Connected requires confirmed EventSub subscription. Losing the browser update feed removes the green confirmation.
Server/API loading never implies Twitch readiness. No artificial delays or animation during authorization.
Test-provider screens must carry a visible fixture banner and cannot be used as real connection evidence.

## 12. Overlay/Game Visual Rules

The broadcast route has no navigation, control cards, settings, copy buttons, or marketing.
Default transparent 1920×1080 canvas. Lower field occupies roughly the bottom 48%; top area stays clear.
Preview mode adds a dark checkered work surface outside the broadcast source for inspecting transparency.
Stage: central clock block, crew color flags at opposing ends, clearly visible center line, a warm rope with
a center pennant, and a single instruction strip. Solid opaque label backplates survive busy footage.
Team labels ≥48px and command labels ≥28px at 1920px. Keep 5% broadcast-safe horizontal margin.
Disconnected shell says “Waiting for Twitch”; its clock is “--:--”. Never animate or advance an idle round.
Phase 4 uses **Fieldday crew v1.0**, one original flat vector family extending the existing crew figures.
Graphite outlines, paper faces, coral/mint jerseys, three reusable head variants and identical body proportions form the family.
An opaque cut-paper field protects rope/leg contrast over busy video; the surrounding source remains truly transparent.
Grounded two-bone limbs connect shoulders/hips to rope grips and planted feet. No bitmap character art or third-party pack is shipped.
Two base crew mascots represent each side; the scene grows to three/four/five figures at 3/6/10 unique contributors.
The actual aggregate participant labels communicate audience size; mascots never imply nonexistent viewers.
Never mix these vectors with arbitrary pixel art, emoji, photography, or pseudo-3D characters.

Phase 3 adds a developer-only Mechanics lab using the same Panel, Button, StatusBadge, type, spacing and color tokens.
Show force/velocity/ticks/input decisions there; keep those tuning details out of the broadcast source.
Use coral/mint pressure fills with written crew labels. A persistent Simulation round label accompanies generated inputs/results.
The room-linked broadcast uses the same SVG vocabulary, large clock and crew names, with server state/result and a written source label.
Its read-only source link is separate from the standalone preview. The same bounded SVG rig is used in the lab and broadcast;
the lab keeps its existing controls and composition. Freeze the drawing and hide the advancing clock when updates fail.
The overlay has a 1600×270 art coordinate system inside a letterboxed 16:9 source. Rope travel is ±150 units;
the fixed finish flags correspond exactly to the server endpoints. Five figures per side fit at both endpoints.
At 1920×1080 use 96px side margins and 54px bottom margin. Team names are 57.6px (48px for long names),
commands 28.8px and clock 76.8px. Scale the entire source, independent of dashboard breakpoints.
One cue lane prioritizes comeback, momentum swing, then lead; it never stacks labels over characters.
The losing crew sits after a decided round. This is a visual consequence, not a configured real-world punishment.
Phase 5 adds the prepared question above the field and the exact winning action below it. A committed result says “Streamer committed”.
The application records a promise; the streamer makes the change in their game. No automatic game control or completion claim.
Keep action text readable at 720p; it has its own display-type rule, not the small source-metadata style.
The central result names the actual winning choice, not only its Coral/Mint identity. Long choices wrap inside the clock block.
Name active coordination “Crew combo”; cues use short “Lead:”, “Momentum:” and “Comeback:” labels that work with singular choices.

## 13. Motion and Animation Principles

`--duration-fast: 120ms`, `--duration-base: 180ms`, `--duration-game: 280ms`;
`--ease-out: cubic-bezier(.2,.7,.2,1)`.
Motion confirms a cause: local pull → rope/crews translate; selection → state fill; copy/save → written feedback.
Translate the rope and crew together while recalculating connected limbs; hands follow the same curve as the rope.
Feet hold world contact for 75% of a reversible 24-unit stride, then take a small step. No independent ambient bobbing.
No automatic scene entrance, parallax, shader, cursor replacement, scroll hijack, or victory effects in Phase 1.
`prefers-reduced-motion: reduce` removes transitions and smooth scroll. Meaning never depends on motion.

Phase 4 adds idle, preparing, pulling, strong pulling, losing balance, synchronized combo, victory and defeat poses.
Preparing follows the real three-second countdown. Activity drives effort; authoritative velocity and position drive weight shift.
Tension straightens the rope. A fresh combo causes one 850ms team accent, not a per-message effect.
Lead/swing cues last 1000ms; a comeback lasts 1600ms. Final five seconds use a restrained 4.5% clock pulse.
One 900ms winner hop and a 450ms defeated sit resolve into a result at 1400ms; no endless celebration or particles.
Late joining/reconnecting to a finished round shows its settled result immediately. Old events never replay after a gap.
Reduced motion holds poses, snaps presentation to server state, removes pulses/hops and reveals results immediately.
One animation loop stops when hidden, idle, paused, disconnected, reduced-motion or settled. No client animation determines a winner.

## 14. Responsive Behavior

≥1200px: full sidebar, two-column control room, side-by-side hero.
768–1199px: compact sidebar; rail may move below stage. Configuration stacks when needed.
<768px: sidebar becomes a 68px brand row with a labeled navigation toggle; content uses 16px gutters and one column.
Navigation opens on demand, closes on route selection, and Escape returns focus to its toggle. It is ordinary navigation, not an ARIA menu.
The primary action remains reachable, forms retain visible labels, statuses may wrap, no whole-page horizontal scroll.
Landing scene preserves composition and scales; descriptive text stays outside the SVG.
Overlay scales its 16:9 broadcast composition, independently of the dashboard breakpoints.
On small screens, OBS instructions and Copy come before the source preview.
Test 1440×1000, 1024×768, 768×1024, 390×844 and 320px width; broadcast 1920×1080.

## 15. Accessibility and Contrast

Target WCAG 2.2 AA: normal text ≥4.5:1, large text ≥3:1, control boundaries/focus ≥3:1.
Graphite on coral/mint; dark semantic inks on their pale backplates. Structural borders are decorative;
inputs get stronger `--border-control`. Do not derive disabled-state contrast by applying whole-element opacity.
Skip link, landmark navigation, logical headings, keyboard operability, native radios/selects,
visible focus, status announcements, descriptive link names, 44px touch targets, reduced motion.
Illustration SVG is decorative where adjacent HTML already communicates teams/state.
No flashing content, audio autoplay, or color-only meaning. Automated checks complement visual inspection.

## 16. Anti-AI-Slop Rules

Show the actual tug interaction in the first viewport. Each section serves understanding or setup.
No gradient hero, fake quote, customer-logo wall, meaningless metrics, uniform feature-card grid,
giant pill buttons, decoration-only icons, or repetitive eyebrows.
No technology details in streamer-facing flows unless needed for a decision.
The product is the image. The rope is the motif. Keep the surrounding workspace quiet.

## 17. Approved Reference Patterns

Linear analysis: restrained surface hierarchy and precise spacing; A1 Linear 2026 preview: real product proof near the headline.
PostHog analysis: approachable language and compact controls with clear color roles.
Raycast analysis: consistent action placement and visibly selected compact rows.
Slack's public installation guide: explain permissions before departure and give a clear return state.
Lusion v3 Awwwards evidence: a single memorable visual composition, restrained surrounding chrome.
Recent Processing State Cards: status names close to the thing changing; reject its glass material.
These are principles, not authorization to copy any brand's CSS, fonts, assets, or screen.
Source limitations and inferred behavior are explicit in `docs/DESIGN_REFERENCES.md`.

## 18. Explicit Design Anti-Patterns

Do not turn the overlay into a dashboard or the dashboard into a game lobby.
Do not remove demo/disconnected labels to make a screenshot look impressive.
Do not show “Connected”, “Live”, countdowns, audiences, or results without their authoritative source.
Do not silently migrate the palette, add a font, round every element, add an animation dependency,
or import third-party artwork. A justified revision requires updating DESIGN.md, DESIGN_DECISIONS,
tokens, credits if applicable, and screenshot QA in the same change.

## 19. Streamer workflow and commitment

Showdown setup edits the question, Coral/Mint choices, exact keywords, round length, consequence and start condition.
Templates: next character, weapon/loadout, strategy, challenge and custom community decision. All presets remain editable.
Custom consequences provide one single-line action per choice (1–120 characters). The action is visible before starting.

The control room prioritizes connection health, current question and server-confirmed start/pause/resume/finish.
Pause is the primary action during play; Finish is secondary and Cancel is quiet. Finish, cancel and reset use a native
named dialog with an explanatory description, initial focus on the safe choice, explicit Tab/Shift+Tab wrap, Escape and focus restoration.
Controls carry the expected round ID/state; no optimistic “started” label. Confirmed feedback belongs to that exact round/state.

When a winner exists, show its exact choice/action and “Commit to this choice” before Rematch. The server records the commitment;
it does not verify completion inside another game. Tie, no-play and cancellation produce no forced commitment.
Reset retains saved settings/history. Keep the latest 20 showdowns for this server session; disclose restart/expiry limits.

Useful insights are time, each crew's participants/effective pulls/combo and connection health. Do not add decorative charts,
audience estimates or fabricated analytics. Effective pulls sum accepted diminishing-return weights; combo scales pressure separately.
History and recognized-command details remain below the live task. Fairness settings and troubleshooting use native details.

At small widths, collapse the redundant page introduction and healthy-connection explanation during/after play so long questions
do not push live controls out of the first viewport. Keep the actual connection label and interruption recovery visible.
OBS setup previews the actual read-only room, not a standby illustration. Mount its iframe only once the room link is ready,
and remount when the link rotates; a hash-only navigation does not initialize a previously mounted standby source.
Source URL is masked until explicitly revealed, with clipboard success/failure feedback and a keyboard-copy fallback.
Action confirmations may fade over `--duration-base`; reduced motion removes that fade. Never animate unrelated dashboard decoration.

## 20. Phase 6 audit refinements

Apply the existing body/control/caption tokens consistently: operational body 15px, controls/labels/help instructions 14px,
metadata 12px. Required help and consent copy must not shrink to 9–11px at mobile breakpoints. Keep 16px mobile text inputs.
Use task names on operational pages; reserve sports personality for the landing and field. Avoid directions to developer tools in the streamer setup path.

Present the result as a flat section inside the current task, with one result heading, exact next action, source disclosure and commitment.
Do not add an ornamental left stripe, another generic heading or a second card surface. Team ink may emphasize the actual result.
The source's base font/line height must scale with its canvas; an inherited 15px inline strut must not distort a 220px thumbnail.
An idle-origin source is Standby, not Twitch. Loading text appears only during actual preparation; source errors replace it with recovery guidance.

All previews reuse Fieldday crew, original atlas, rope, ground and grip geometry. Two base mascots per side in an empty preview represent no viewers.
The manual landing demo changes only its local drawing, with explicit Demo labels and a fixed sample clock. It does not run an authoritative round.
The actual game retains its fixed-step physics, one bounded renderer, existing motion timing, reduced-motion behavior and server-only result.
See [DESIGN_AUDIT](docs/DESIGN_AUDIT.md) for observed defects, comparison evidence and verified limits.
