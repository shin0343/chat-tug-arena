# Asset Credits and License Ledger

Verified 2026-10-27. Phase 4 ships original vectors; researched third-party character packs are not dependencies.
Phase 5 retains those assets/fonts and adds no third-party UI kit, illustration or runtime dependency.
Its product screenshots/rehearsal recordings are first-party evidence; Linear/Recent research images remain outside the project.
Phase 6 reuses the same Fieldday renderer/atlas in the landing, draft and empty lab previews, removing the separate legacy drawing.
No new asset, font, third-party kit, runtime dependency or license was added. Phase 6 screenshots/recordings also show the actual product;
OAuth fixture files are explicitly labeled UI coverage and do not prove real provider access.

## Included

Phases 7–8 add no third-party art/font/music or runtime library. New screenshots and QA recordings remain first-party, visibly
labeled local simulation/fixture where applicable. The Phase 8 script/captions are original production drafts, not recorded Twitch footage.
Any later real chat/game/Codex footage needs a privacy/rights review before publication. Project-wide license remains unchosen.

| Asset | Source / author | License / use |
| --- | --- | --- |
| DM Sans 400/500/600/700 Latin | [DM Sans project](https://github.com/googlefonts/dm-fonts), DM Sans Project Authors; [Fontsource](https://fontsource.org/fonts/dm-sans), npm 5.3.0 | SIL OFL 1.1. Unmodified, self-hosted WOFF2 through Next. Full copyright/license at `apps/web/public/licenses/dm-sans-OFL.txt` |
| Barlow Condensed 600/700 Latin | [Barlow project](https://github.com/jpt/barlow), Barlow Project Authors; [Fontsource](https://fontsource.org/fonts/barlow-condensed), npm 5.3.0 | SIL OFL 1.1. Unmodified, self-hosted. Full copyright/license at `apps/web/public/licenses/barlow-condensed-OFL.txt` |
| Knot mark, favicon, icons, rope, flags, crew figures, playing field | Original Chat Tug Arena code-native SVG/CSS created during this Codex session | Project-authored artwork; no external image or sprite pack. License for the project itself has not been chosen; no third-party brand rights are asserted |
| Fieldday crew v1.0: three heads, boots, knot cup, connected body rig, cut-paper field | Original project SVG/TypeScript authored with Codex for Phase 4. Atlas: `apps/web/public/game/fieldday-symbols.svg`; provenance: `game/README.md`; rig: `apps/web/src/lib/scene/rig.ts`; scene: `components/scene/game-art.tsx` | Extends this project's original vocabulary. No copied character shape, third-party sprite, bitmap generation or external artwork. No new external attribution/redistribution restriction. Project license remains unchosen; **not** asserted CC0 |
| `docs/qa/**/*.png`, Phase 4 motion recordings/contact sheets | Screenshots and browser recordings of this project's actual running UI | Project evidence. No third-party reference screenshots or videos are included |

Font imports retain each package's license. Public license copies accompany the fonts for future deployment.
Do not remove OFL notices or rename a modified font without checking reserved-name requirements.

## Researched candidates — not included

| Exact source | License actually observed | Visual fit / status |
| --- | --- | --- |
| [Kenney Shape Characters](https://kenney.nl/assets/shape-characters), Kenney, v1.0 (2023) | Page and actual archive `License.txt` both CC0 1.0; copying, modification and commercial redistribution permitted; attribution optional | Preview and full archive inspected in Phase 4. Shapes, separate hands and expressions, no planted leg/pull cycle; gradient shapes conflict with existing flat ink family. Not shipped |
| [Kenney Toon Characters](https://kenney.nl/assets/toon-characters), Kenney, v1.0 (2019) | Page and actual archive `License.txt` both CC0 1.0; commercial/personal/educational use and modification/redistribution permitted; attribution optional | Actual character sheets, vectors and frame names inspected. 45 poses per character, walk/cheer/climb/drag/rope poses; no matching ground-planted horizontal pull cycle for our grip geometry. Not shipped; do not claim this pack has no animation |
| [Kenney UI Pack](https://kenney.nl/assets/ui-pack) | CC0, 430 files listed | Possible overlay controls; our operational HTML controls remain project-native. Avoid a second decorative UI style |
| [Kenney Platformer Art Complete Pack on OpenGameArt](https://opengameart.org/content/platformer-art-complete-pack-often-updated) | Exact source page: CC0; author Kenney; attribution encouraged, not mandatory | Page inspected again for Phase 4. Platform tiles are unnecessary for our shallow sports field; not downloaded or shipped |
| [Pixel Frog Tiny Swords](https://pixelfrog-assets.itch.io/tiny-swords) | Current page permits project use/modification but forbids redistribution/repackaging, even modified. A **separate old CC0 archive** is also listed | Attractive coherent factions and animations, but current pack is unsuitable for blindly committing into a runnable source repository. Not included. Exact archive license must be independently checked if revisited |
| [itch.io free asset directory](https://itch.io/game-assets/free) | Directory is not a license grant | Browsed as discovery only. “Free” does not establish redistribution rights |

Archive audit (temporary research storage only, none of these files committed):

| Exact archive | SHA-256 |
| --- | --- |
| [Toon Characters ZIP](https://kenney.nl/media/pages/assets/toon-characters/4e8a6e4e53-1774770819/kenney_toon-characters.zip) | `d4c0eb31f9d9af074315af251a53e8c74925dec84fbd53703c91c9ed4a4cace9` |
| [Shape Characters ZIP](https://kenney.nl/media/pages/assets/shape-characters/c016420b08-1698339465/kenney_shape-characters.zip) | `6d56877922af39e0ac9153c057c9cff1654973567514a32ae86454e37a2dfb93` |

The [CC0 1.0 deed](https://creativecommons.org/publicdomain/zero/1.0/) was also read directly.
It allows copying, modification, distribution and commercial use without permission, but does not grant trademarks or endorsement.
The original rig was selected for coherent horizontal pulling/ground contact and the existing identity, not because CC0 prohibited these uses.
No third-party environment, UI pack or character archive is stored under `public/game/`.

## Reference rights

[Awesome DESIGN.md](https://github.com/VoltAgent/awesome-design-md) has an MIT repository license (copyright 2026 VoltAgent).
We used independent written synthesis, not a copied/rebranded DESIGN.md or substantial code extract.
Underlying brand marks, images and proprietary fonts remain with their owners; the repository's license does not grant those rights.
Mobbin, A1, Awwwards and Recent references are linked and summarized for research only.
No downloaded reference screenshot, video, logo or original product asset is redistributed here.
Pikuniku and Heave Ho official publisher media were inspected as art/motion references only; their characters, screenshots,
audio and trailers remain with their respective owners. Our SVG family does not reproduce those characters.

Twitch and OBS names describe compatibility intent. Their logos and proprietary artwork are not used,
and no sponsorship or endorsement is claimed by the UI.
