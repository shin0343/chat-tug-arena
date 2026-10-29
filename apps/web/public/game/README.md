# Fieldday crew v1.0

Original Chat Tug Arena vector artwork, 2026-10-27. Atlas: `fieldday-symbols.svg`.
Character/body/limb poses are editable source in `src/lib/scene/rig.ts` and `src/components/scene/game-art.tsx`.
The playing field, flags, rope and ground marks are original SVG in the same component. Semantic colors come from DESIGN.md.

This is project-authored code-native art, not generated bitmap imagery and not a derivative of the researched games/packs.
No third-party character, environment, brand, texture or profile image is included. No external attribution requirement or
third-party restriction on modifying/redistributing these original project assets applies; the overall project license remains unchanged.
The two pre-existing fonts retain their OFL notices in `public/licenses/`.

Kenney Toon Characters 1.0 (2019) and Shape Characters 1.0 (2023) ZIPs and their CC0 licenses were inspected in a temporary
research directory. Neither is shipped. Their stock poses do not provide the horizontal planted-foot pull cycle needed here.
Pikuniku/Heave Ho footage and web-design references were studied, not imported, traced or rebranded.

No artwork is fetched from an external service at runtime. This single same-origin SVG symbol atlas is reused and cached;
the SVG rig changes joint paths, not raster avatars stretched with CSS. Eight semantic poses are documented in docs/GAME_DESIGN.md.
