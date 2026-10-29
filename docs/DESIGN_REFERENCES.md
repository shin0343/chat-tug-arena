# Design References — Inspected Evidence

Research date: 2026-10-27. This board separates observed material from proposed adaptation.
The original directory was empty; there was no inherited reference board or approved design system.

## Method and access ledger

- **Awesome DESIGN.md:** repository index, actual Linear/PostHog/Raycast DESIGN.md files (548/690/669 lines at retrieval), LICENSE and public getdesign previews read. GitHub CLI API used after sandbox DNS failure; repository license is MIT, copyright 2026 VoltAgent. These are independent analyses of marketing sites, not the brands' official systems or authenticated app audits.
- **Mobbin:** homepage and `/discover` opened using web retrieval and Chromium. Anonymous discovery exposed marketing/login/join surfaces rather than the requested authenticated flow library. No account was created and no paywall bypass attempted. Complete Slack/Twitch flows inside Mobbin were **not inspected**. Public Slack installation documentation and Twitch OAuth documentation were used as explicitly labeled supplements.
- **Awwwards:** homepage, Lusion v3 award page, its Home Page element and reactive-cursor element investigated. Historical screenshots are distinct from the changing current lusion.co site. Award scores did not inform our own quality claims.
- **A1:** landing category and the identifiable Linear 2026 listing inspected. Its initially blurred, not-yet-decoded image was not accepted as evidence; the decoded product screenshot was subsequently viewed in Chromium.
- **Recent:** actual Interface and Motion filters, identifiable item pages, images and video frames inspected. Descriptions alone were not treated as motion evidence. Video samples are recorded below, not interaction with the original apps.
- **Tool limits:** agent-reach CLI was absent; its Jina fallback returned an anonymous-query authentication error. Native web retrieval and Chromium supplied the usable evidence. gstack's runtime was not installed, so existing Playwright/Chromium provided browser inspection. No global tool setup, login, plugin publication or deployment was performed.

Reference screenshots and raw research were kept only under `/tmp/cta-research/`; **none are redistributed in this repository**. `docs/qa/` contains only our own running application. Temporary paths are session evidence, not durable deliverables; original URLs below are the durable record.

## Focused reference matrix

### A. Streamer Dashboard

| Source / product / original URL | Actual observed UI or pattern | Target and proposed adaptation | Why / rejected pattern | Inspected / limitations |
| --- | --- | --- | --- | --- |
| Awesome DESIGN.md · [Linear analysis](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md) · [preview](https://getdesign.md/design-md/linear.app/preview) | Controlled surface steps, thin dividers, compact actions; preview displays a legible type hierarchy and distinct primary/secondary buttons | Dashboard: flat panels, small action group, title before preview | Operational clarity; reject its near-black marketing canvas, lavender identity, proprietary type and generic pricing grids | File + rendered preview inspected. This is a third-party marketing analysis, not authenticated Linear |
| Awesome DESIGN.md · [Raycast analysis](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/raycast/DESIGN.md) · [preview](https://getdesign.md/design-md/raycast/preview) | Button variants, selected filter fill, compact bordered controls, command-row anatomy described in the analysis | Stable sidebar selection and action placement, visibly selected duration options | Faster recognition; reject gradient stripes, decorative shortcut keycaps and extremely dim disabled text | File + rendered components section inspected. Launcher interaction and logged-in screens not inspected |
| Recent · [Spacing Tips, Michael Filipiuk](https://recent.design/i/qbsvs1j-spacing-visualization-dashboard) | Wireframe dashboard highlights spacing regions; padding/gap changes alter the perceived grouping | Shared 4px spacing vocabulary; distinct section gaps and label gaps | Group by task instead of extra card wrappers; don't ship the tutorial's debugging highlights | Item page and visible media inspected; a design study, not a production user flow |

### B. Setup / Onboarding

| Source / product / original URL | Actual observed UI or flow | Target and proposed adaptation | Why / rejected pattern | Inspected / limitations |
| --- | --- | --- | --- | --- |
| [Mobbin discovery](https://mobbin.com/discover) and [homepage](https://mobbin.com/) | Anonymous login/join and public promotional content; full requested flow screens unavailable | Research gap recorded; do not attribute our connection flow to an unseen Mobbin example | Prevent fabricated UX evidence | Public surface inspected. Onboarding/OAuth/settings/live/error flows inside the library **not accessible** |
| Awesome DESIGN.md · [PostHog analysis](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/posthog/DESIGN.md) · [preview](https://getdesign.md/design-md/posthog/preview) | Friendly explanations, small-radius controls, narrow documentation sidebar and contextual feedback colors | Plain setup copy, compact form controls, nearby explanations for unavailable actions | Low cognitive load without losing product personality; reject hedgehogs, yellow CTA identity, emoji annotations and cream textbook imitation | File + rendered preview inspected. Authenticated analytics dashboard and form errors absent from the source evidence |
| Public product guide, supplement · [Slack: Add apps to your workspace](https://slack.com/help/articles/202035138-Add-apps-to-your-Slack-workspace) | Documented full installation sequence: sidebar tools → app search → Add → Marketplace → authorization prompts; separate already-installed account-connect and approval branches; changed scopes require reauthorization | Channel connection should explain intent before leaving, return to a named status, and distinguish approval/denial/disconnection | Preserve context and provide a recoverable path; reject marketplace/search complexity for our one-provider flow | Entire public guide read. Documented flow, **not** executed authenticated Slack OAuth and **not** Mobbin evidence |
| Twitch official, supplement · [OAuth token flows](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/) | Authorization code exchange and redirect/error handling documented for server applications | Phase 2: server-side callback, state validation, clear denied/error return | Matches a persistent backend; reject token collection in a browser form | Documentation inspected; no OAuth request executed. Scope selection remains Phase 2 work |

### C. Landing Page

| Source / product / original URL | Actual observed composition | Target and proposed adaptation | Why / rejected pattern | Inspected / limitations |
| --- | --- | --- | --- | --- |
| A1 Gallery · [Linear 2026](https://www.a1.gallery/website/linear-2026) | Restrained navigation, large left-aligned headline, quiet supporting text and an actual app screen directly below; generous space before detailed product content | Our headline is adjacent to the real playable arena; setup CTA stays visible | Explain the experience through the product itself; reject black monochrome imitation, proprietary type, isometric filler and copied AI positioning | Listing metadata + decoded desktop screenshot visually inspected. Source website's authenticated product not inspected |
| Awwwards · [Lusion v3](https://www.awwwards.com/sites/lusion-v3) · [Home Page element](https://www.awwwards.com/inspiration/home-page-lusion-v3) | Single dominant immersive scene with small navigational controls; historical screenshot includes a dense 3D tunnel and a contrasting typographic composition in the image set | One memorable game composition and restrained surrounding navigation | Focus, not visual volume; reject its WebGL tunnel, spectacle, loader, moving background and scroll-dependent narrative | Award page and historical Home Page screenshot inspected. Not a claim that current lusion.co matches the historical version |

### D. OBS Game Overlay

| Source / product / original URL | Actual observed / documented pattern | Target and proposed adaptation | Why / rejected pattern | Inspected / limitations |
| --- | --- | --- | --- | --- |
| OBS official · [Browser Source](https://obsproject.com/kb/browser-source) | URL, width/height, transparent CSS defaults and scene-refresh controls documented | Dedicated transparent 1920×1080 source, clear OBS dimension instructions, no dashboard chrome | Integration instructions reflect the actual hosting surface; reject copying browser controls into the overlay | Public documentation read; actual OBS Studio capture not performed in Phase 1 |
| Kenney · [Shape Characters](https://kenney.nl/assets/shape-characters) and [Toon Characters](https://kenney.nl/assets/toon-characters) | Cohesive 2D character families, explicit CC0 and pose/character categorization | Phase 4 shortlist; maintain one silhouette family and consistent line treatment | Readable crews at stream scale; don't mix pixel packs, vectors and 3D | Listing/license inspected; sheet animation completeness and tug-specific frames not yet validated. Nothing imported |
| Awwwards · [Lusion reactive cursor interaction](https://www.awwwards.com/inspiration/reactive-cursor-interaction) | An identifiable motion element associated with Lusion v3; visual scene reacts around a cursor | Only the general principle of visible cause and effect is considered for rope motion | A pull should visibly move the rope; reject custom cursor systems, GPU-heavy decoration and motion that interrupts operation | Element page/media investigated; exact interaction timing is not a measurement or copied specification |

### E. Motion / Microinteractions

| Source / product / original URL | Actual observed detail | Proposed adaptation and rationale | Rejection notes | Inspected / limitations |
| --- | --- | --- | --- | --- |
| Recent · [Liquid Button, Val Guerra](https://recent.design/i/pd1kyjp-liquid-button-hover-effect) | Video frames show “Book a call” retaining its readable label while its pill outline deforms and gains a colored glow | Preserve readable labels and make response contingent on an action; our buttons use fill change and 1px press only | Reject the blob, pink/purple glow, changing geometry and hover-only affordance | Item page + video frames around 0.5s and 4s viewed. This is a recorded demonstration, not our interaction with the original button |
| Recent · [Processing State Cards, dynamics](https://recent.design/i/24fvo3o-processing-state-cards) | Static image shows “Processing”, a nearby count and distinct step indicators | Name status close to the affected task; our saves use an adjacent written result | Reject glass, blur, luminous indicators, stacked decoration, fake progress and loaders without work | Named item page + image inspected. Motion timing cannot be inferred from the static image |
| Recent · [AI Deck Generation, Benji Taylor](https://recent.design/i/shqu5nd-ai-brand-bot-deck-generation) | Recorded prompt is followed by an inline result in the same chat context; sampled frames at 0.5/2/4s | Keep outcomes beside the initiating action: Save produces a nearby confirmation without navigating away | Reject deck-fanning spectacle, bot branding, copied imagery and simulated generation | Item + sampled video frames inspected. Product functionality and generation claims not independently tested |

## Awesome DESIGN.md: comparative analysis

The three files were read from the actual repository. Previews are illustrations of those analyses,
not authoritative brand specifications. “Responsive” below means what the analysis states unless separately noted.

| Dimension | Linear | PostHog | Raycast |
| --- | --- | --- | --- |
| 1. Atmosphere | Quiet, product-led dark marketing | Approachable engineering sketchbook | Compact dark launcher presentation |
| 2. Color roles | Lavender action over charcoal surface steps | One yellow CTA; restrained feedback tints | White action; category color inside product examples |
| 3. Type | Custom sans, 80/56/40 display, 16 body | IBM Plex, 36 display, 16 body | Inter, 64/56 display, 16 body |
| 4. Space/layout | 4px base, 24px panels, wide screenshots | Compact controls, 24px panels, docs sidebar | Tight 16–24px interiors, aligned command rows |
| 5. Components | Clear action variants, framed product panels | Small-radius forms and contextual callouts | Compact buttons, selected rows and keycaps |
| 6. Surfaces | Hairlines and surface steps over shadows | Flat light panels with thin edges | Subtle dark surface steps |
| 7. States | File specifies button hover/pressed; preview shows variants | Pressed/focus described; hover is a known gap | Active/pressed described; hover is a known gap |
| 8. Responsive | Analysis says grids collapse and nav reduces | Analysis synthesizes sidebar collapse; no mobile screenshots | Analysis synthesizes mobile stacking; no mobile screenshots |
| 9. Suitable | Hierarchy, limited action emphasis, product proof | Human language, compact boundaries, friendly utility | Consistent action position, obvious selected state |
| 10. Do not adopt | Brand palette, proprietary fonts, marketing grids | Mascot, yellow identity, emoji callouts | Red stripe gradient, dim text, imitated launcher |

## Flow synthesis and unresolved research

Evaluate setup as **entry → intent/permission explanation → external authorization → return state → configuration → source preview**.
The supplemental Slack guide covers installation/account-connect/reapproval branches; Twitch documentation covers protocol return/error paths.
Our Phase 1 deliberately stops external authorization with a disabled control and a preview continuation.
Configuration, validation, local save, empty state, missing connection, denied storage and clipboard failure are actually implemented and browser-tested.
Connecting/loading visuals are specified for future real work; no staged delay pretends authorization occurred.

No complete authenticated Mobbin flow, native OBS capture, real streamer usability session or historical Lusion interaction was reconstructed.
Revisit Mobbin with authorized access if detailed flow comparison becomes useful; it is not necessary to fabricate evidence to finish this foundation.
The original Chat Tug Arena system combines these principles with its own rope motif, crew silhouettes, sports typography and coral/mint roles.

## Phase 2 — connection flow evidence (2026-10-27)

The Phase 1 matrices above remain the visual authority. Linear hierarchy, PostHog contextual explanations,
Raycast compact controls and the original paper/forest/coral/mint tokens were reused; no new palette or UI kit.
No new authenticated Mobbin access was available. The discovery page was reopened and still exposed login/join,
not the requested connection/onboarding screens. It is explicitly **not evidence of a completed Mobbin flow review**.

| Reference / original URL | Inspected evidence | Pattern adapted and target | Rejected / access limits |
| --- | --- | --- | --- |
| [Mobbin discovery](https://mobbin.com/discover) | Public retrieval, login/join navigation | Record the access limit; do not invent OAuth screens | Authenticated flows unavailable; no login/paywall bypass |
| [Slack app installation guide](https://slack.com/help/articles/202035138-Add-apps-to-your-Slack-workspace) | Entire public documented flow reopened: intent → external marketplace/install prompt → existing-account connection branch; changed scopes require reauthorization | Connection page explains one permission before leaving; returns to a named account/status; authorize-again action remains separate from transport retry | Reject marketplace search, admin approvals and unrelated app catalog. Documentation, not executed Slack auth or Mobbin screenshots |
| [Discord Connections guide](https://support.discord.com/hc/en-us/articles/8063233404823-Connections-Linked-Roles-Community-Members) · [published UI image](https://support.discord.com/hc/article_attachments/10898955133079) | Public guide and embedded Connections settings screenshot actually inspected. Selected sidebar, named linked account row, provider subtitle, removal control and nearby refresh/details are visible | Keep identity beside connection status; provide explicit resume/disconnect actions on that same surface; avoid making a display name imply a healthy transport | Reject dark Discord palette, multibrand provider grid, profile toggles and follower statistics. Historical support screenshot; no signed-in Discord execution. Image temporary only, not redistributed |
| [Twitch auth code flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/) | Current server exchange, state and callback errors documented | Real browser departure/return with clean redirect and actionable denial/expired-link state | Reject browser token collection and implicit-token URLs. No actual consent executed without credentials |
| [Twitch chat authentication](https://dev.twitch.tv/docs/chat/authenticating/) · [chat subscription](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage) | User-token vs app-token requirements and `channel.chat.message` v1 inspected | Single read scope for broadcaster-self user-token mode; named account then confirmed subscription | Reject broad write/bot scopes for the unrelated cloud-bot architecture |
| [Twitch WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/) | Welcome/subscription deadline, heartbeat, transfer reconnect vs unexpected loss, no replay, revocation | Connected only after subscription confirmation; visible reconnect gap; bounded retry and explicit authorize recovery | Reject green status from process health and promises to replay missed chat |

Observed flows synthesize **intent → scoped consent → named identity → subscription confirmation → first recognized input**.
Simulation is a separate, prominently labeled path through the same input pipeline, never a success substitute.
The support reference screenshot was inspected from a temporary file; only first-party application screenshots are in `docs/qa/phase2`.
Actual state screens are checked against DESIGN.md with both native local SSE and explicit fixture screenshots.

## Phase 4 — game art and purposeful broadcast motion (2026-10-27)

First ran and inspected the actual Phase 3 Mechanics lab, including balanced pressure, combo, authoritative clock and moving rope.
Read all eight event contracts before choosing art. Existing typography/tokens and dashboard layout remain the authority.
The official [overview](https://twitchcon-codex.devpost.com/), [rules](https://twitchcon-codex.devpost.com/rules)
and [resources](https://twitchcon-codex.devpost.com/resources) were reopened; local visual QA does not replace the real Twitch demo gate.
The agent-reach skill was read; its CLI was unavailable and Jina retrieval failed. Native web, GitHub API and Chromium supplied the evidence below.

### Game references and actual asset inspection

| Exact source | Evidence actually inspected | Adaptation | Rejected / limitations |
| --- | --- | --- | --- |
| [Pikuniku official](https://pikuniku.net/), [press kit](https://pikuniku.net/presskit/sheet.php?p=pikuniku), [publisher store/media](https://store.steampowered.com/app/572890/Pikuniku/) | Official screenshots and trailer media; gameplay trailer sampled at 7–10.5s in 0.5s steps. Flat color, clear silhouette, simple ground contact and spacious shared action | Limited original silhouette family, readable feet/grips, shallow uncluttered field | No copied character, palette, level, music or frame. Launch trailer 12–16.5s was a stop-motion promo; it is **not** treated as gameplay animation evidence. No executable game playtest |
| [Heave Ho publisher store/media](https://store.steampowered.com/app/905340/Heave_Ho/1) | Official screenshots and launch trailer sampled at 3–6.5s and 12–16.5s. Shared hand contact makes collective effort visible; some trailer shots show couch players rather than the game | Hands remain on one rope curve; team combo shares one pulling rhythm | Reject hanging-limb chaos, rainbow costume clutter, camera movement and copied characters. Official trailer observation, not an executed game session; heavehogame.com did not provide useful page content |
| [Kenney Toon Characters](https://kenney.nl/assets/toon-characters) | Exact ZIP/license, full preview, a complete character sheet and named pose/vector files opened. Real walking/cheering/climbing poses verified | One character family, shared proportions, reusable parts | The pack's rope/climb/drag poses do not fit this horizontal planted tug geometry. Do not rotate/stretch static avatars to imitate a pull. Nothing imported |
| [Kenney Shape Characters](https://kenney.nl/assets/shape-characters) | Exact ZIP/license, preview and complete file list inspected: geometric bodies, expressions and detached hands | Small deterministic variation within one family | No suitable grounded pull cycle; gradient shapes and missing legs conflict with this scene. Nothing imported |
| [OpenGameArt Kenney platform pack](https://opengameart.org/content/platformer-art-complete-pack-often-updated), [itch.io free directory](https://itch.io/game-assets/free) | Exact OGA source names Kenney/CC0; itch discovery page opened | Verify rights on the actual asset page/archive | Platform tiles add no value to a shallow sports field. Directory “free” is not a license. No downloads shipped |

**Decision:** original **Fieldday crew v1.0**, extending the existing sports vectors. Connected two-bone limbs, planted foot phases,
three reusable head symbols and one flat environment give exact rope contact without an animation/framework dependency.
This is code-native original vector animation, not generated bitmap art. Rights/archive versions and hashes are in ASSET_CREDITS.

### Motion, composition and typography references

| Exact source | Observed evidence | Intended adaptation | Rejected / limits |
| --- | --- | --- | --- |
| [Awwwards Lusion v3](https://www.awwwards.com/sites/lusion-v3) | Actual listing rendered in Chromium and screenshot inspected: one focal visual, restrained surrounding chrome. Native web retrieval timed out; listing videos exposed blank.mp4 placeholders | One rope action owns the scene; HUD supports it | No measured Lusion timing claimed. Reject 3D/WebGL spectacle, camera shake, cursor systems and scrolling transitions. Marketing composition reference, not game UI |
| [Recent Liquid Button](https://recent.design/i/pd1kyjp-liquid-button-hover-effect), [actual recorded clip](https://cdn.recent.design/items/pd1kyjp/0/630x360.mp4) | Six frames at 1-second intervals inspected from the published clip. Label persists through a brief action-driven deformation and return | Bounded response followed by rest; readable labels during combo/result motion | Reject blob geometry, glow, gradients and perpetual effects. This sampling is not an exact measurement of a button's response latency |
| [Recent AI Deck](https://recent.design/i/shqu5nd-ai-brand-bot-deck-generation) | Item page reopened; prior Phase 1 recorded-frame evidence remains historical | Result stays close to its trigger | No new full motion study claimed; reject spectacle and simulated generation |
| [A1 Linear 2026](https://www.a1.gallery/website/linear-2026) | Actual listing image decoded and visually inspected again: strong headline hierarchy, small supporting type, product as proof | Barlow Condensed crew names/clock first, commands next, aggregate meta last | Reject black branding, proprietary fonts and marketing-page layout inside the game |
| [Awesome Linear DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md) | Exact current file read through GitHub API; surface/text/action roles and type hierarchy | Keep existing semantic token roles and consistent HUD spacing | No copied palette, CSS or proprietary type. This analysis is a UI consistency source, not a game-art reference |
| [Mobbin discover](https://mobbin.com/discover) | Public discovery/login/join only | Record the access limit | No authenticated library/flow inspected; no claim of a Mobbin game reference |

Only original product screenshots/recordings are retained under `docs/qa/phase4`. External reference frames were temporary research files.
The complete rendered-state and motion comparison, including weaknesses and OBS limits, is in QA_PHASE_4.

## Phase 5 — Operational workflow and actionable outcomes (2026-10-27)

Ran and screenshot-inspected the actual Phase 4 dashboard before editing. It separated browser settings, a sidebar Prepare control
and a static OBS preview; there was no winning-choice commitment or history. The Phase 5 plan adapts existing components/tokens.
Used agent-reach routing: CLI absent, Jina DNS unavailable; GitHub CLI, native web and Chromium supplied the accessible evidence.
The [official overview](https://twitchcon-codex.devpost.com/) and [rules](https://twitchcon-codex.devpost.com/rules) were reopened,
including the four equally weighted judging criteria. A simulation workflow still cannot satisfy genuine Twitch submission evidence.

| Exact reference | Observed evidence in this phase | Adaptation | Limits / rejected patterns |
| --- | --- | --- | --- |
| [Mobbin discover](https://mobbin.com/discover) | Public discovery again exposed Log in / Join, not the requested authenticated setup/settings/confirmation library | Record the gap and supplement with accessible primary product documentation | No authenticated flow, account creation, paywall bypass or unseen Mobbin screen is claimed |
| [Linear issue templates](https://linear.app/docs/issue-templates) | Actual public guide and its [form screenshot](https://webassets.linear.app/images/ornj730p/production/5e1cb2f12b568848b2fabf98420b2a0639854858-1310x1092.png?auto=format&dpr=2&q=95&w=1440) inspected. Template context precedes persistent field labels; an explicit creation action follows the form | Editable presets, question/choices before rules, one Save action; keep draft values on validation failure | Screenshot is official documented UI, not an executed authenticated Linear session. Reject dark branding, lavender, background gradients and issue-tracker complexity |
| [Linear delete/archive guide](https://linear.app/docs/delete-archive-issues) | Public documented distinction between current work, completed archives and recovery; no deletion dialog executed | Keep history tertiary and avoid erasing a committed result on reset | Do not claim Linear's exact confirmation or interaction timing was inspected; no copied archive controls |
| [PostHog send-events guide](https://posthog.com/docs/getting-started/send-events) | Actual public setup sequence and contextual explanations read; authenticated product not opened | Place connection proof and next step close together; count actual events rather than decorative analytics | No analytics SDK, autocapture, tracking, yellow identity or mascot imported |
| [Awesome Linear DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md), [PostHog DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/posthog/DESIGN.md) | Exact files fetched with GitHub API; colors/type plus spacing, button, input and status sections read | Existing primary/secondary/quiet actions, persistent labels, flat surfaces and 4px spacing | Third-party marketing analyses, not official authenticated operational audits. Reject their palettes/fonts/brand art |
| [A1 Linear 2026](https://www.a1.gallery/website/linear-2026) | Listing reopened; reuse the actual decoded image evidence from Phase 4 | Keep the product/current decision as proof; existing condensed sports type stays in the arena | No new signed-in product/flow evidence; reject transplanting marketing composition into controls |
| [Awwwards Lusion v3](https://www.awwwards.com/sites/lusion-v3) | New native retrieval timed out; reuse the explicitly recorded Phase 4 composition inspection | One focal task, quiet surrounding chrome | No new motion measurement. Reject WebGL, custom cursors, loaders and scene-wide spectacle |
| [Recent Processing State Cards](https://recent.design/i/24fvo3o-processing-state-cards), [published image](https://cdn.recent.design/items/24fvo3o/0/image/3bbfd37007ccd78ab945/1036.webp) | Actual image viewed: named processing state, adjacent count, completion steps | Short confirmed feedback beside the action, with semantic success/warning/error tokens | Static-image evidence only; no timing inferred. Reject glass, glow, stacked decorations and fake progress |

Actual product captures and a recorded rehearsal are under `docs/qa/phase5`. External screenshots remain temporary research files;
no reference imagery, brand code, fonts or telemetry were added to the project. Final comparison/findings are in QA_PHASE_5.

## Phase 6 — Audit comparison, not a new theme (2026-10-27)

Reopened the official [overview](https://twitchcon-codex.devpost.com/), [rules](https://twitchcon-codex.devpost.com/rules)
and [resources](https://twitchcon-codex.devpost.com/resources). Rules section 6 names four equally weighted second-stage criteria;
the design question concerns ease of use and watchability. This audit supplies local implementation evidence, not a judge score or real Twitch gate clearance.
Agent-reach CLI remains absent; GitHub API, native web retrieval and actual Chromium inspection supplied usable references.

| Selected exact reference | Evidence inspected in this audit | Concrete adaptation / rejected effects |
| --- | --- | --- |
| [Awesome Linear](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md) and [PostHog](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/posthog/DESIGN.md) | Files fetched again with GitHub API; blob SHAs `88bcd11faa4f050982c7e84ca70bdf43d660ed6a` / `4aac00897402ce1a79bfd209b79c9a0de078e485`; type, spacing, surfaces and actions compared with our renders | Restore existing type roles, task hierarchy and compact controls. These remain third-party marketing analyses; reject palette, mascot and brand imitation |
| [Mobbin discovery](https://mobbin.com/discover) | Fresh native retrieval and rendered Chromium page: Log in / Join; no authenticated flow screens exposed | Record the gap. No authenticated Mobbin comparison is claimed, and no access bypass/account creation performed |
| [Linear public issue-template form](https://linear.app/docs/issue-templates) | Public guide reopened and its previously decoded official form screenshot viewed again | Visible labels, terse help, explicit save action and a single task/result hierarchy. This is documented UI, not executed authenticated Linear |
| [A1 Linear 2026](https://www.a1.gallery/website/linear-2026) | Fresh actual page screenshot and decoded product image inspected; both image load and readable content confirmed | Strong main type, quieter context and product as evidence. Reject branding, proprietary type, dark theme and generic product slogans |
| [Awwwards Lusion v3](https://www.awwwards.com/sites/lusion-v3) / [Home Page](https://www.awwwards.com/inspiration/home-page-lusion-v3) | Native retrieval timed out for the element. Fresh Chromium listing returned 200, but its main media had not loaded at capture. The previously inspected historical Lusion screenshot was viewed again separately | Keep one field/cue as focus and peripheral controls quiet. No new timing or live Lusion interaction claimed; reject loaders, WebGL spectacle and cursor effects |
| [Recent Liquid Button](https://recent.design/i/pd1kyjp-liquid-button-hover-effect) / [published clip](https://cdn.recent.design/items/pd1kyjp/0/630x360.mp4) | Item reopened; previously captured six published video samples re-inspected | A response should return to rest with its label readable. Preserve bounded combo/victory feedback; reject glow, blobs, decorative morphs and nonstop motion |
| [Recent Processing State Cards](https://recent.design/i/24fvo3o-processing-state-cards) / [published image](https://cdn.recent.design/items/24fvo3o/0/image/3bbfd37007ccd78ab945/1036.webp) | Exact item reopened; previously inspected static media retained as historical evidence | Put status/recovery beside the affected source and avoid false loading. Static evidence does not establish motion timing; reject glass and fake progress |
| [Pikuniku official media](https://store.steampowered.com/app/572890/Pikuniku/), [Heave Ho publisher media](https://store.steampowered.com/app/905340/Heave_Ho/1) | Pikuniku publisher page reopened; previously sampled official gameplay contact sheets for both games re-inspected | Compare silhouettes, connected hand contact and readable ground. Reuse our own Fieldday family across scenes. No copied character/media or claim of an executable game playtest |

Research files remain temporary and outside the project. Only actual first-party captures are in `qa/phase6/`.
The prioritized comparison, measured before/after differences, tested motion and explicit remaining weaknesses are in [DESIGN_AUDIT](DESIGN_AUDIT.md).

## Phase 7–8 — Preservation and submission preparation (2026-10-28)

Phase 7 made transport/session fixes only. Compared actual new desktop, 320px, source-result, maximum-crowd and reduced-motion captures
with DESIGN and Phase 6's approved renders; inspected actual sampled rehearsal motion. No tokens, type, art family or physics tuning changed.
Phase 8 uses that same identity for its original script/caption/timeline drafts; no third-party artwork or video is copied.

Fresh textual retrieval reopened the exact Awesome Linear/PostHog analyses, A1 Linear 2026 and Recent Liquid Button item listed above.
Only the prior ledger establishes their media inspections; this phase does not claim another external animation playtest or measured timing.
Mobbin discovery still showed Log in/Join without authenticated flows. Awwwards Lusion v3 retrieval timed out; historical inspection is explicitly retained.
Adapted principles are unchanged: product evidence before promotion, strong/quieter type hierarchy, one readable feedback cue returning to rest.
Reject reference branding, glow/morphing buttons, marketing spectacle, stock or AI promotional footage and simulated live activity.

Official overview/rules/resources/updates were reopened. Current updates listed a Twitch developer-tools guide; no project-specific approval was inferred.
Final capture/access limits and the qualitative judging review are in FINAL_SUBMISSION_AUDIT. No demo export/upload or actual Twitch footage exists yet.
